import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm } from "node:fs/promises"
import path from "node:path"

import { PDFDocument } from "pdf-lib"

export type ResumeOutput = {
  readonly theme: "light" | "dark"
  readonly finalPath: string
  readonly temporaryPath: string
}

function warn(message: string): void {
  process.stderr.write(`${message}\n`)
}

async function readPdf(filename: string): Promise<PDFDocument> {
  try {
    const bytes = await readFile(filename)

    if (bytes.length === 0) throw new Error("empty file")

    return await PDFDocument.load(Uint8Array.from(bytes))
  } catch (cause) {
    throw new Error(`Invalid PDF: ${path.relative(process.cwd(), filename)}`, { cause })
  }
}

export async function verifyPdf(
  filename: string,
  report: (message: string) => void = warn,
): Promise<void> {
  const document = await readPdf(filename)
  const pages = document.getPages()
  const relativePath = path.relative(process.cwd(), filename)

  if (pages.length === 0) throw new Error(`Invalid PDF contains no pages: ${relativePath}`)

  for (const page of pages) {
    const { width, height } = page.getSize()

    if (Math.abs(width - 612) > 0.01 || Math.abs(height - 792) > 0.01) {
      throw new Error(`Generated PDF is not US Letter (612x792 points): ${relativePath}`)
    }
  }

  if (pages.length > 1) {
    report(`Warning: generated PDF has ${pages.length} pages and will be retained: ${relativePath}`)
  }
}

export async function prepareOutputs(
  directory: string,
  publicDirectory: string,
): Promise<ResumeOutput[]> {
  await Promise.all([
    mkdir(directory, { recursive: true }),
    mkdir(publicDirectory, { recursive: true }),
  ])
  const themes = ["light", "dark"] as const

  return themes.map((theme) => ({
    theme,
    finalPath: path.resolve(publicDirectory, `harrison-crosse-resume-${theme}.pdf`),
    temporaryPath: path.resolve(
      directory,
      `.harrison-crosse-resume-${theme}-${randomUUID()}.tmp.pdf`,
    ),
  }))
}

export async function installPdfs(outputs: readonly ResumeOutput[]): Promise<void> {
  await Promise.all(
    outputs.map(async ({ temporaryPath }: ResumeOutput) => {
      await verifyPdf(temporaryPath)
    }),
  )

  const installs = await Promise.allSettled(
    outputs.map(async ({ temporaryPath, finalPath }: ResumeOutput) => {
      await rename(temporaryPath, finalPath)
    }),
  )

  for (const result of installs) {
    if (result.status === "rejected") {
      throw new Error("Could not install validated resume PDFs", { cause: result.reason })
    }
  }
}

export async function removeTemporaryPdfs(outputs: readonly ResumeOutput[]): Promise<Error[]> {
  const errors: Error[] = []
  await Promise.all(
    outputs.map(async ({ temporaryPath }: ResumeOutput) => {
      try {
        await rm(temporaryPath, { force: true })
      } catch (cause) {
        errors.push(
          cause instanceof Error ? cause : new Error("Temporary PDF cleanup failed", { cause }),
        )
      }
    }),
  )

  return errors
}
