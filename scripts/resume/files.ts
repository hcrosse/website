import { mkdir, readFile, rename } from "node:fs/promises"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

export type ResumeOutput = {
  readonly renderedPath: string
  readonly publishedPath: string
}

export async function prepareOutput(
  renderDirectory: string,
  publicDirectory: string,
): Promise<ResumeOutput> {
  await mkdir(renderDirectory, { recursive: true })
  const filename = "harrison-crosse-resume.pdf"

  return {
    renderedPath: path.join(renderDirectory, filename),
    publishedPath: path.join(publicDirectory, filename),
  }
}

async function readPdf(filename: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(await readFile(filename))
  } catch (cause) {
    throw new Error(`Invalid PDF: ${path.relative(process.cwd(), filename)}`, { cause })
  }
}

export async function verifyPdf(filename: string): Promise<void> {
  const pages = (await readPdf(filename)).getPages()
  const relativePath = path.relative(process.cwd(), filename)

  if (pages.length === 0) throw new Error(`Invalid PDF contains no pages: ${relativePath}`)

  for (const page of pages) {
    const { width, height } = page.getSize()

    if (Math.abs(width - 612) > 0.01 || Math.abs(height - 792) > 0.01) {
      throw new Error(`Generated PDF is not US Letter (612x792 points): ${relativePath}`)
    }
  }

  if (pages.length > 1) {
    process.stderr.write(
      `Warning: generated PDF has ${pages.length} pages and will be retained: ${relativePath}\n`,
    )
  }
}

export async function installPdf({ renderedPath, publishedPath }: ResumeOutput): Promise<void> {
  await verifyPdf(renderedPath)
  await rename(renderedPath, publishedPath)
}
