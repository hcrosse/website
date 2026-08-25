import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  createHarnessEnvironment,
  generateResumePdfs,
  verifyPdf,
  type ResumeOutput,
} from "./generate-resume-pdfs";

test("removes inherited resume overrides from the harness environment", () => {
  expect(
    createHarnessEnvironment({
      PATH: "/bin",
      RESUME_CONTENT_PATH: "/tmp/private.json",
    }),
  ).toEqual({ ASTRO_DEV_BACKGROUND: "0", PATH: "/bin" });
});

describe("generateResumePdfs", () => {
  test("installs stable canonical PDFs and removes temporary files", async () => {
    const workspace = await createTestWorkspace();

    try {
      await generateResumePdfs({
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        renderPdfs: writeLetterPdfs,
      });

      expect((await readdir(workspace.publicDirectory)).toSorted()).toEqual([
        "harrison-crosse-resume-dark.pdf",
        "harrison-crosse-resume-light.pdf",
      ]);
      expect(await readdir(workspace.temporaryDirectory)).toEqual([]);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test("cleans temporary PDFs when rendering fails", async () => {
    const workspace = await createTestWorkspace();

    try {
      await expect(
        generateResumePdfs({
          outputDirectory: workspace.temporaryDirectory,
          publicDirectory: workspace.publicDirectory,
          renderPdfs: async (outputs) => {
            await writeFile(outputs[0].temporaryPath, "partial PDF");
            throw new Error("render failed");
          },
        }),
      ).rejects.toThrow("render failed");
      expect(await readdir(workspace.temporaryDirectory)).toEqual([]);
      expect(await readdir(workspace.publicDirectory)).toEqual([]);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });
});

describe("verifyPdf", () => {
  test("accepts a one-page US Letter PDF", async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, "one-page.pdf");

    try {
      await writePdf(path, [[612, 792]]);
      await expect(verifyPdf(path)).resolves.toBeUndefined();
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test("rejects a zero-byte PDF", async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, "empty.pdf");

    try {
      await writeFile(path, "");
      await expect(verifyPdf(path)).rejects.toThrow("Invalid PDF");
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test("warns and accepts a multi-page US Letter PDF", async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, "multi-page.pdf");
    const warnings: string[] = [];

    try {
      await writePdf(path, [
        [612, 792],
        [612, 792],
      ]);
      await verifyPdf(path, (warning) => warnings.push(warning));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("2 pages");
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test("rejects malformed and non-Letter PDFs", async () => {
    const workspace = await createTestWorkspace();
    const malformedPath = resolve(workspace.temporaryDirectory, "malformed.pdf");
    const a4Path = resolve(workspace.temporaryDirectory, "a4.pdf");

    try {
      await writeFile(malformedPath, "not a PDF");
      await writePdf(a4Path, [[595.28, 841.89]]);
      await expect(verifyPdf(malformedPath)).rejects.toThrow("Invalid PDF");
      await expect(verifyPdf(a4Path)).rejects.toThrow("US Letter");
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });
});

async function createTestWorkspace(): Promise<{
  root: string;
  publicDirectory: string;
  temporaryDirectory: string;
}> {
  await mkdir(".resume", { recursive: true });
  const root = await mkdtemp(resolve(".resume/generator-test-"));
  const publicDirectory = resolve(root, "public");
  const temporaryDirectory = resolve(root, "temporary");
  await Promise.all([
    mkdir(publicDirectory, { recursive: true }),
    mkdir(temporaryDirectory, { recursive: true }),
  ]);
  return { root, publicDirectory, temporaryDirectory };
}

async function writeLetterPdfs(outputs: ResumeOutput[]): Promise<void> {
  await Promise.all(outputs.map(({ temporaryPath }) => writePdf(temporaryPath, [[612, 792]])));
}

async function writePdf(path: string, sizes: Array<[number, number]>): Promise<void> {
  const document = await PDFDocument.create();
  for (const size of sizes) document.addPage(size);
  await writeFile(path, await document.save());
}
