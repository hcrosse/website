import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

/** A generated PDF: the harness route that renders it, its filename, and the page size, in points, and page count. */
export type PdfFormat = {
  readonly route: string
  readonly filename: string
  readonly sizeName: string
  readonly width: number
  readonly height: number
  /** Required page count, or null to retain extra pages with a warning. */
  readonly pages: number | null
  /** Bleed on every side, marked in each page's TrimBox and BleedBox, or null for none. */
  readonly bleed: number | null
}

export const resumePdf: PdfFormat = {
  route: "/",
  filename: "harrison-crosse-resume.pdf",
  sizeName: "US Letter",
  width: 612,
  height: 792,
  pages: null,
  bleed: null,
}

/** Front and back, each the 3.5 x 2 in trim with 0.125 in bleed on every side. */
export const cardPdf: PdfFormat = {
  route: "/card",
  filename: "harrison-crosse-card.pdf",
  sizeName: "a business card with bleed",
  width: 270,
  height: 162,
  pages: 2,
  bleed: 9,
}

export type PdfOutput = {
  readonly format: PdfFormat
  readonly renderedPath: string
  readonly publishedPath: string
}

export async function prepareOutput(
  format: PdfFormat,
  renderDirectory: string,
  publishDirectory: string,
): Promise<PdfOutput> {
  await mkdir(renderDirectory, { recursive: true })
  await mkdir(publishDirectory, { recursive: true })

  return {
    format,
    renderedPath: path.join(renderDirectory, format.filename),
    publishedPath: path.join(publishDirectory, format.filename),
  }
}

async function readPdf(filename: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(await readFile(filename), { updateMetadata: false })
  } catch (cause) {
    throw new Error(`Invalid PDF: ${path.relative(process.cwd(), filename)}`, { cause })
  }
}

function checkPageCount(count: number, format: PdfFormat, relativePath: string): void {
  if (format.pages === null) {
    if (count > 1) {
      process.stderr.write(
        `Warning: generated PDF has ${count} pages and will be retained: ${relativePath}\n`,
      )
    }
  } else if (count !== format.pages) {
    throw new Error(`Generated PDF must have ${format.pages} pages, not ${count}: ${relativePath}`)
  }
}

export async function verifyPdf(filename: string, format: PdfFormat): Promise<void> {
  const pages = (await readPdf(filename)).getPages()
  const relativePath = path.relative(process.cwd(), filename)

  if (pages.length === 0) throw new Error(`Invalid PDF contains no pages: ${relativePath}`)

  for (const page of pages) {
    const { width, height } = page.getSize()

    if (Math.abs(width - format.width) > 0.01 || Math.abs(height - format.height) > 0.01) {
      throw new Error(
        `Generated PDF is not ${format.sizeName} (${format.width}x${format.height} points): ${relativePath}`,
      )
    }
  }

  checkPageCount(pages.length, format, relativePath)
}

/** Marks the trim `bleed` points inside each page's edges, and the whole page as bleed. */
async function markBleed(filename: string, bleed: number): Promise<void> {
  const document = await readPdf(filename)

  for (const page of document.getPages()) {
    const { x, y, width, height } = page.getMediaBox()

    page.setTrimBox(x + bleed, y + bleed, width - 2 * bleed, height - 2 * bleed)
    page.setBleedBox(x, y, width, height)
  }

  await writeFile(filename, await document.save({ addDefaultPage: false, useObjectStreams: false }))
}

export async function installPdf({
  format,
  renderedPath,
  publishedPath,
}: PdfOutput): Promise<void> {
  if (format.bleed !== null) await markBleed(renderedPath, format.bleed)
  await verifyPdf(renderedPath, format)
  await rename(renderedPath, publishedPath)
}
