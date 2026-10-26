import { afterEach, beforeEach, expect, test } from "bun:test"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

import { installPdf, prepareOutput, verifyPdf } from "./files"

const letter = [612, 792] as const

let root = ""

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "resume-files-test-"))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function writePdf(
  filename: string,
  sizes: readonly (readonly [number, number])[],
): Promise<void> {
  const document = await PDFDocument.create()

  for (const size of sizes) document.addPage([...size])
  await writeFile(filename, await document.save({ addDefaultPage: false }))
}

test("accepts a one-page US Letter PDF", async () => {
  const onePage = path.join(root, "one-page.pdf")
  await writePdf(onePage, [letter])

  await assert.doesNotReject(verifyPdf(onePage))
})

test("accepts a multi-page US Letter PDF with a warning", async () => {
  const twoPages = path.join(root, "two-pages.pdf")

  const script = `import { verifyPdf } from ${JSON.stringify(path.join(import.meta.dir, "files.ts"))}
await verifyPdf(${JSON.stringify(twoPages)})`

  await writePdf(twoPages, [letter, letter])

  const child = Bun.spawn([process.execPath, "-e", script], { stderr: "pipe" })

  expect(await child.exited).toBe(0)
  const stderr = await new Response(child.stderr).text()

  expect(stderr).toContain("2 pages")
  expect(stderr).toContain("two-pages.pdf")
})

test("rejects empty, malformed, pageless, and non-Letter PDFs", async () => {
  const empty = path.join(root, "empty.pdf")
  const malformed = path.join(root, "malformed.pdf")
  const pageless = path.join(root, "pageless.pdf")
  const a4 = path.join(root, "a4.pdf")
  await writeFile(empty, "")
  await writeFile(malformed, "not a PDF")
  await writePdf(pageless, [])
  await writePdf(a4, [[595.28, 841.89]])

  await assert.rejects(verifyPdf(empty), /Invalid PDF/u)
  await assert.rejects(verifyPdf(malformed), /Invalid PDF/u)
  await assert.rejects(verifyPdf(pageless), /no pages/u)
  await assert.rejects(verifyPdf(a4), /US Letter/u)
})

test("publishes the rendered PDF when it is valid", async () => {
  const publicDirectory = path.join(root, "public")
  await mkdir(publicDirectory)
  const output = await prepareOutput(path.join(root, "render"), publicDirectory)
  await writePdf(output.renderedPath, [letter])

  await installPdf(output)

  expect(await readdir(publicDirectory)).toEqual(["harrison-crosse-resume.pdf"])
})

test("leaves the published PDF untouched when the rendered PDF is invalid", async () => {
  const publicDirectory = path.join(root, "public")
  await mkdir(publicDirectory)
  const published = path.join(publicDirectory, "harrison-crosse-resume.pdf")
  await writeFile(published, "previous published content")
  const output = await prepareOutput(path.join(root, "render"), publicDirectory)
  await writeFile(output.renderedPath, "invalid PDF")

  await assert.rejects(installPdf(output), /Invalid PDF/u)

  expect(await readFile(published, "utf8")).toBe("previous published content")
  expect(await readdir(publicDirectory)).toEqual(["harrison-crosse-resume.pdf"])
})
