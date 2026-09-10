import { expect, test } from "bun:test"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

import {
  createHarnessEnvironment,
  generateResumePdfs,
  verifyPdf,
  type ResumeOutput,
} from "./generate-resume-pdfs"

async function createTestWorkspace(): Promise<{
  root: string
  publicDirectory: string
  temporaryDirectory: string
}> {
  await mkdir(".resume", { recursive: true })
  const root = await mkdtemp(path.resolve(".resume/generator-test-"))
  const publicDirectory = path.resolve(root, "public")
  const temporaryDirectory = path.resolve(root, "temporary")
  await Promise.all([
    mkdir(publicDirectory, { recursive: true }),
    mkdir(temporaryDirectory, { recursive: true }),
  ])

  return { root, publicDirectory, temporaryDirectory }
}

async function writePdf(
  filename: string,
  sizes: readonly (readonly [number, number])[],
): Promise<void> {
  const document = await PDFDocument.create()

  for (const [width, height] of sizes) document.addPage([width, height])
  await writeFile(filename, await document.save())
}

async function writeLetterPdfs(outputs: readonly ResumeOutput[]): Promise<void> {
  await Promise.all(
    outputs.map(async ({ temporaryPath }: ResumeOutput) => {
      await writePdf(temporaryPath, [[612, 792]])
    }),
  )
}

async function writeInvalidDarkPdf(outputs: readonly ResumeOutput[]): Promise<void> {
  await writeLetterPdfs(outputs)
  await Promise.all(
    outputs.map(async ({ theme, temporaryPath }: ResumeOutput) => {
      if (theme === "dark") await writeFile(temporaryPath, "invalid PDF")
    }),
  )
}

test("removes inherited resume overrides from the harness environment", () => {
  expect(
    createHarnessEnvironment({ PATH: "/bin", RESUME_CONTENT_PATH: "/tmp/private.json" }),
  ).toEqual({ ASTRO_DEV_BACKGROUND: "0", PATH: "/bin" })
})

test("installs stable canonical PDFs and removes temporary files", async () => {
  const workspace = await createTestWorkspace()

  try {
    await generateResumePdfs({
      outputDirectory: workspace.temporaryDirectory,
      publicDirectory: workspace.publicDirectory,
      renderPdfs: writeLetterPdfs,
    })
    expect((await readdir(workspace.publicDirectory)).toSorted()).toEqual([
      "harrison-crosse-resume-dark.pdf",
      "harrison-crosse-resume-light.pdf",
    ])
    expect(await readdir(workspace.temporaryDirectory)).toEqual([])
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("cleans temporary PDFs when rendering fails", async () => {
  const workspace = await createTestWorkspace()

  try {
    await assert.rejects(
      generateResumePdfs({
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        renderPdfs: async (outputs) => {
          await Promise.all(
            outputs.map(async ({ temporaryPath }: ResumeOutput) => {
              await writeFile(temporaryPath, "partial PDF")
            }),
          )
          throw new Error("render failed")
        },
      }),
      /render failed/u,
    )
    expect(await readdir(workspace.temporaryDirectory)).toEqual([])
    expect(await readdir(workspace.publicDirectory)).toEqual([])
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("accepts a one-page US Letter PDF", async () => {
  const workspace = await createTestWorkspace()
  const filename = path.resolve(workspace.temporaryDirectory, "one-page.pdf")

  try {
    await writePdf(filename, [[612, 792]])
    await assert.doesNotReject(verifyPdf(filename))
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("rejects a zero-byte PDF", async () => {
  const workspace = await createTestWorkspace()
  const filename = path.resolve(workspace.temporaryDirectory, "empty.pdf")

  try {
    await writeFile(filename, "")
    await assert.rejects(verifyPdf(filename), /Invalid PDF/u)
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("warns and accepts a multi-page US Letter PDF", async () => {
  const workspace = await createTestWorkspace()
  const filename = path.resolve(workspace.temporaryDirectory, "multi-page.pdf")
  const warnings: string[] = []

  try {
    await writePdf(filename, [
      [612, 792],
      [612, 792],
    ])
    await verifyPdf(filename, (warning) => {
      warnings.push(warning)
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("2 pages")
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("rejects malformed and non-Letter PDFs", async () => {
  const workspace = await createTestWorkspace()
  const malformedPath = path.resolve(workspace.temporaryDirectory, "malformed.pdf")
  const a4Path = path.resolve(workspace.temporaryDirectory, "a4.pdf")

  try {
    await writeFile(malformedPath, "not a PDF")
    await writePdf(a4Path, [[595.28, 841.89]])
    await assert.rejects(verifyPdf(malformedPath), /Invalid PDF/u)
    await assert.rejects(verifyPdf(a4Path), /US Letter/u)
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("preserves the published PDF when either rendered PDF is invalid", async () => {
  const workspace = await createTestWorkspace()
  const published = path.resolve(workspace.publicDirectory, "harrison-crosse-resume-light.pdf")

  try {
    await writeFile(published, "previous published content")
    await assert.rejects(
      generateResumePdfs({
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        renderPdfs: writeInvalidDarkPdf,
      }),
      /Invalid PDF/u,
    )
    expect(await readFile(published, "utf8")).toBe("previous published content")
    expect(await readdir(workspace.temporaryDirectory)).toEqual([])
    expect(await readdir(workspace.publicDirectory)).toEqual(["harrison-crosse-resume-light.pdf"])
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})

test("settles PDF installs before cleaning up after a rename failure", async () => {
  const workspace = await createTestWorkspace()
  const blocked = path.resolve(workspace.publicDirectory, "harrison-crosse-resume-light.pdf")
  const installed = path.resolve(workspace.publicDirectory, "harrison-crosse-resume-dark.pdf")

  try {
    await mkdir(blocked)
    await assert.rejects(
      generateResumePdfs({
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        renderPdfs: writeLetterPdfs,
      }),
      /Could not install validated resume PDFs/u,
    )
    await assert.doesNotReject(verifyPdf(installed))
    expect(await readdir(workspace.temporaryDirectory)).toEqual([])
    expect(await readdir(blocked)).toEqual([])
  } finally {
    await rm(workspace.root, { recursive: true, force: true })
  }
})
