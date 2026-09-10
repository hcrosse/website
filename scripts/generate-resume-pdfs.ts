import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PDFDocument } from "pdf-lib";
import { chromium, type Browser } from "playwright";

const themes = ["light", "dark"] as const;
type Theme = (typeof themes)[number];
const outputDirectory = resolve(".resume");
const publicDirectory = resolve("public");
const readinessTimeoutMs = 30_000;
const letterWidth = 612;
const letterHeight = 792;

export type ResumeOutput = {
  theme: Theme;
  finalPath: string;
  temporaryPath: string;
};

type GenerateResumePdfsOptions = {
  outputDirectory?: string;
  publicDirectory?: string;
  renderPdfs?: (outputs: ResumeOutput[]) => Promise<void>;
};

export function createHarnessEnvironment(
  inheritedEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment = { ...inheritedEnvironment };
  environment.ASTRO_DEV_BACKGROUND = "0";
  delete environment.RESUME_CONTENT_PATH;
  return environment;
}

function canonicalPath(directory: string, theme: Theme): string {
  return resolve(directory, `harrison-crosse-resume-${theme}.pdf`);
}

function createOutputs(directory: string, stableDirectory: string): ResumeOutput[] {
  return themes.map((theme) => ({
    theme,
    finalPath: canonicalPath(stableDirectory, theme),
    temporaryPath: resolve(directory, `.harrison-crosse-resume-${theme}-${randomUUID()}.tmp.pdf`),
  }));
}

export async function verifyPdf(
  path: string,
  warn: (message: string) => void = console.warn,
): Promise<void> {
  let document: PDFDocument;
  try {
    const bytes = await readFile(path);
    if (bytes.length === 0) throw new Error("empty file");
    document = await PDFDocument.load(Uint8Array.from(bytes));
  } catch (error) {
    throw new Error(`Invalid PDF: ${relative(process.cwd(), path)}`, {
      cause: error,
    });
  }

  const pages = document.getPages();
  if (pages.length === 0) {
    throw new Error(`Invalid PDF contains no pages: ${relative(process.cwd(), path)}`);
  }
  for (const page of pages) {
    const { width, height } = page.getSize();
    if (Math.abs(width - letterWidth) > 0.01 || Math.abs(height - letterHeight) > 0.01) {
      throw new Error(
        `Generated PDF is not US Letter (${letterWidth}x${letterHeight} points): ${relative(process.cwd(), path)}`,
      );
    }
  }
  if (pages.length > 1) {
    warn(
      `Warning: generated PDF has ${pages.length} pages and will be retained: ${relative(process.cwd(), path)}`,
    );
  }
}

async function reservePort(): Promise<number> {
  const server = createServer();

  return await new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to reserve a loopback port"));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
}

async function fetchBeforeDeadline(url: string, deadline: number): Promise<Response> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new Error("Resume harness readiness deadline expired");
  }
  return await fetch(url, { signal: AbortSignal.timeout(remainingMs) });
}

async function waitForHarness(harness: ChildProcess, baseUrl: string): Promise<void> {
  const deadline = Date.now() + readinessTimeoutMs;
  let spawnError: unknown;
  harness.once("error", (error) => {
    spawnError = error;
  });

  while (Date.now() < deadline) {
    if (spawnError !== undefined) throw spawnError;
    if (harness.exitCode !== null || harness.signalCode !== null) {
      throw new Error(
        `Resume harness exited with ${
          harness.exitCode !== null ? `code ${harness.exitCode}` : `signal ${harness.signalCode}`
        }`,
      );
    }

    try {
      const response = await fetchBeforeDeadline(`${baseUrl}/light`, deadline);
      if (response.status === 200) return;
    } catch {
      // Astro may not have bound the reserved port yet.
    }
    await delay(Math.min(200, Math.max(0, deadline - Date.now())));
  }

  throw new Error(`Resume harness did not become ready within ${readinessTimeoutMs}ms`);
}

async function stopHarness(harness: ChildProcess): Promise<void> {
  if (harness.pid === undefined || harness.exitCode !== null || harness.signalCode !== null) {
    return;
  }

  harness.kill("SIGTERM");
  const exited = new Promise<void>((resolveExit) => {
    harness.once("exit", () => resolveExit());
  });
  if ((await Promise.race([exited.then(() => true), delay(5_000).then(() => false)])) === false) {
    harness.kill("SIGKILL");
    await exited;
  }
}

async function renderPdfsWithHarness(outputs: ResumeOutput[]): Promise<void> {
  let browser: Browser | undefined;
  let harness: ChildProcess | undefined;
  let primaryError: unknown;

  try {
    const port = await reservePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    harness = spawn(
      "bunx",
      [
        "--bun",
        "astro",
        "dev",
        "--ignore-lock",
        "--config",
        "scripts/resume/astro.config.mjs",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: createHarnessEnvironment(),
        stdio: "inherit",
      },
    );

    await waitForHarness(harness, baseUrl);
    browser = await chromium.launch();
    const page = await browser.newPage();

    for (const { theme, temporaryPath } of outputs) {
      const response = await page.goto(`${baseUrl}/${theme}`, {
        waitUntil: "networkidle",
      });
      if (!response?.ok()) throw new Error(`Failed to load ${theme} resume route`);
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: temporaryPath,
        format: "Letter",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
    }
  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors: unknown[] = [];
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (harness) {
    try {
      await stopHarness(harness);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (primaryError !== undefined) {
    for (const error of cleanupErrors) console.error(error);
    throw primaryError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Resume harness cleanup failed");
  }
}

export async function generateResumePdfs(options: GenerateResumePdfsOptions = {}): Promise<void> {
  const directory = options.outputDirectory ?? outputDirectory;
  const stableDirectory = options.publicDirectory ?? publicDirectory;
  const renderPdfs = options.renderPdfs ?? renderPdfsWithHarness;
  await Promise.all([
    mkdir(directory, { recursive: true }),
    mkdir(stableDirectory, { recursive: true }),
  ]);

  const outputs = createOutputs(directory, stableDirectory);

  let primaryError: unknown;
  try {
    await renderPdfs(outputs);
    await Promise.all(outputs.map(({ temporaryPath }) => verifyPdf(temporaryPath)));
    for (const output of outputs) {
      await rename(output.temporaryPath, output.finalPath);
    }
  } catch (error) {
    primaryError = error;
  }

  const cleanupResults = await Promise.allSettled(
    outputs.map(({ temporaryPath }) => rm(temporaryPath, { force: true })),
  );
  const cleanupErrors = cleanupResults.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  if (primaryError !== undefined) {
    for (const error of cleanupErrors) console.error(error);
    throw primaryError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Temporary PDF cleanup failed");
  }

  for (const output of outputs) {
    console.log(`Generated ${relative(process.cwd(), output.finalPath)}`);
  }
}

if ((import.meta as ImportMeta & { main: boolean }).main) {
  await generateResumePdfs();
}
