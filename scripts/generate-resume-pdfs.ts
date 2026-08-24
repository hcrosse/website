import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, realpath, rename, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { PDFDocument } from "pdf-lib";
import { chromium, type Browser } from "playwright";
import { parseResumeContent } from "../src/resume/content";

type Arguments = {
  contentPath: string | undefined;
};

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
  startedAt?: Date;
  renderPdfs?: (outputs: ResumeOutput[], contentPath: string | undefined) => Promise<void>;
};

export function createHarnessEnvironment(
  contentPath: string | undefined,
  inheritedEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const environment = { ...inheritedEnvironment };
  environment.ASTRO_DEV_BACKGROUND = "0";
  delete environment.RESUME_CONTENT_PATH;
  if (contentPath) environment.RESUME_CONTENT_PATH = contentPath;
  return environment;
}

export function parseArguments(arguments_: string[]): Arguments {
  if (arguments_.length === 0) return { contentPath: undefined };

  if (arguments_[0] !== "--content") {
    throw new Error(`Unknown argument: ${arguments_[0]}`);
  }
  if (arguments_.length !== 2 || !arguments_[1]) {
    throw new Error("--content requires exactly one path");
  }

  return { contentPath: arguments_[1] };
}

export function resolvePrivateContentPath(contentPath: string): string {
  const resolvedPath = resolve(contentPath);
  assertPathInside(outputDirectory, resolvedPath);
  return resolvedPath;
}

async function preflightContent(contentPath: string): Promise<string> {
  const resolvedPath = resolvePrivateContentPath(contentPath);
  const [privateDirectoryPath, realContentPath] = await Promise.all([
    realpath(outputDirectory),
    realpath(resolvedPath),
  ]);
  assertPathInside(privateDirectoryPath, realContentPath);
  parseResumeContent(JSON.parse(await readFile(realContentPath, "utf8")));
  return realContentPath;
}

function assertPathInside(directory: string, path: string): void {
  const relativePath = relative(directory, path);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Resume content path must be inside .resume");
  }
}

function formatDate(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("_");
}

function formatTime(date: Date): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("_");
}

function privatePath(directory: string, theme: Theme, suffix: string): string {
  return resolve(directory, `harrison_crosse_resume_${theme}_${suffix}.pdf`);
}

function canonicalPath(directory: string, theme: Theme): string {
  return resolve(directory, `harrison-crosse-resume-${theme}.pdf`);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function createOutputs(
  privateMode: boolean,
  directory: string,
  stableDirectory: string,
  startedAt: Date,
): Promise<ResumeOutput[]> {
  let finalPaths: string[];

  if (privateMode) {
    const dateSuffix = formatDate(startedAt);
    const dailyPaths = themes.map((theme) => privatePath(directory, theme, dateSuffix));
    const useTimestamp = (await Promise.all(dailyPaths.map((path) => pathExists(path)))).some(
      Boolean,
    );
    const suffix = useTimestamp ? `${dateSuffix}_${formatTime(startedAt)}` : dateSuffix;
    finalPaths = themes.map((theme) => privatePath(directory, theme, suffix));

    if (useTimestamp) {
      for (const path of finalPaths) {
        if (await pathExists(path)) {
          throw new Error(
            `Resume PDF already exists; refusing to overwrite: ${relative(process.cwd(), path)}`,
          );
        }
      }
    }
  } else {
    finalPaths = themes.map((theme) => canonicalPath(stableDirectory, theme));
  }

  return themes.map((theme, index) => ({
    theme,
    finalPath: finalPaths[index],
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

async function renderPdfsWithHarness(
  outputs: ResumeOutput[],
  contentPath: string | undefined,
): Promise<void> {
  let browser: Browser | undefined;
  let harness: ChildProcess | undefined;
  let primaryError: unknown;

  try {
    const port = await reservePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    harness = spawn(
      "bunx",
      [
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
        env: createHarnessEnvironment(contentPath),
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

export async function generateResumePdfs(
  contentPath: string | undefined,
  options: GenerateResumePdfsOptions = {},
): Promise<void> {
  const directory = options.outputDirectory ?? outputDirectory;
  const stableDirectory = options.publicDirectory ?? publicDirectory;
  const startedAt = options.startedAt ?? new Date();
  const renderPdfs = options.renderPdfs ?? renderPdfsWithHarness;
  await Promise.all([
    mkdir(directory, { recursive: true }),
    mkdir(stableDirectory, { recursive: true }),
  ]);

  const validatedContentPath = contentPath ? await preflightContent(contentPath) : undefined;
  const outputs = await createOutputs(
    validatedContentPath !== undefined,
    directory,
    stableDirectory,
    startedAt,
  );

  let primaryError: unknown;
  try {
    await renderPdfs(outputs, validatedContentPath);
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
  const startedAt = new Date();
  const { contentPath } = parseArguments(process.argv.slice(2));
  await generateResumePdfs(contentPath, { startedAt });
}
