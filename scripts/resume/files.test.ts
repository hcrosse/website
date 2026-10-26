import { afterEach, beforeEach, expect, test } from "bun:test"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

import { cardPdf, installPdf, prepareOutput, resumePdf, verifyPdf } from "./files"

const letter = [612, 792] as const

const card = [270, 162] as const

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

  await assert.doesNotReject(verifyPdf(onePage, resumePdf))
})

test("accepts a multi-page US Letter PDF with a warning", async () => {
  const twoPages = path.join(root, "two-pages.pdf")

  const script = `import { resumePdf, verifyPdf } from ${JSON.stringify(path.join(import.meta.dir, "files.ts"))}
await verifyPdf(${JSON.stringify(twoPages)}, resumePdf)`

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

  await assert.rejects(verifyPdf(empty, resumePdf), /Invalid PDF/u)
  await assert.rejects(verifyPdf(malformed, resumePdf), /Invalid PDF/u)
  await assert.rejects(verifyPdf(pageless, resumePdf), /no pages/u)
  await assert.rejects(verifyPdf(a4, resumePdf), /US Letter/u)
})

test("accepts a two-page card PDF with bleed", async () => {
  const twoPages = path.join(root, "card.pdf")
  await writePdf(twoPages, [card, card])

  await assert.doesNotReject(verifyPdf(twoPages, cardPdf))
})

test("rejects card PDFs with another page count or size", async () => {
  const onePage = path.join(root, "one-page.pdf")
  const threePages = path.join(root, "three-pages.pdf")
  const trimOnly = path.join(root, "trim-only.pdf")
  await writePdf(onePage, [card])
  await writePdf(threePages, [card, card, card])
  await writePdf(trimOnly, [card, [252, 144]])

  await assert.rejects(verifyPdf(onePage, cardPdf), /must have 2 pages, not 1/u)
  await assert.rejects(verifyPdf(threePages, cardPdf), /must have 2 pages, not 3/u)
  await assert.rejects(verifyPdf(trimOnly, cardPdf), /270x162 points/u)
})

test("publishes the rendered PDF when it is valid", async () => {
  const publicDirectory = path.join(root, "public")
  await mkdir(publicDirectory)
  const output = await prepareOutput(resumePdf, path.join(root, "render"), publicDirectory)
  await writePdf(output.renderedPath, [letter])

  await installPdf(output)

  expect(await readdir(publicDirectory)).toEqual(["harrison-crosse-resume.pdf"])
})

test("marks the trim inside the bleed on each published card page", async () => {
  const output = await prepareOutput(cardPdf, path.join(root, "render"), path.join(root, "print"))
  await writePdf(output.renderedPath, [card, card])

  await installPdf(output)

  const pages = (await PDFDocument.load(await readFile(output.publishedPath))).getPages()

  expect(pages).toHaveLength(2)

  for (const page of pages) {
    expect(page.node.TrimBox()).toBeDefined()
    expect(page.node.BleedBox()).toBeDefined()
    expect(page.getTrimBox()).toEqual({ x: 9, y: 9, width: 252, height: 144 })
    expect(page.getBleedBox()).toEqual({ x: 0, y: 0, width: 270, height: 162 })
  }
})

test("leaves the published PDF untouched when the rendered PDF is invalid", async () => {
  const publicDirectory = path.join(root, "public")
  await mkdir(publicDirectory)
  const published = path.join(publicDirectory, "harrison-crosse-resume.pdf")
  await writeFile(published, "previous published content")
  const output = await prepareOutput(resumePdf, path.join(root, "render"), publicDirectory)
  await writeFile(output.renderedPath, "invalid PDF")

  await assert.rejects(installPdf(output), /Invalid PDF/u)

  expect(await readFile(published, "utf8")).toBe("previous published content")
  expect(await readdir(publicDirectory)).toEqual(["harrison-crosse-resume.pdf"])
})
