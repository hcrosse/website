import path from "node:path"

import { dev } from "astro"
import { chromium, type Page } from "playwright"

import { TEXT_LEFT, textLines } from "../../src/card/mountains"
import { textLayout } from "../../src/resume/mountains"
import { installPdf, type PdfFormat, prepareOutput } from "./files"

type Box = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The footer mountains are fitted to textLayout; fail rather than print text over them. */
export async function checkTextLayout(page: Readonly<Pick<Page, "locator">>): Promise<void> {
  const box = async (selector: string): Promise<Box> => {
    const found = await page.locator(selector).boundingBox()

    if (found === null) throw new Error(`Missing ${selector} on the resume page`)

    return found
  }

  const [resume, lastJob, tools, utility] = await Promise.all([
    box(".resume"),
    box(".employment-entry:last-of-type"),
    box(".utility > :last-child"),
    box(".utility"),
  ])

  const measured: Record<keyof typeof textLayout, number> = {
    employmentBottom: lastJob.y + lastJob.height - resume.y,
    toolsBottom: tools.y + tools.height - resume.y,
    ruleBottom: utility.y + utility.height - resume.y,
    ruleX: utility.x - resume.x,
  }

  const moved = (["employmentBottom", "toolsBottom", "ruleBottom", "ruleX"] as const).filter(
    (key) => Math.abs(measured[key] - textLayout[key]) > 0.5,
  )

  if (moved.length > 0) {
    throw new Error(
      `Resume text moved (${moved.join(", ")}), so the footer mountains no longer fit. ` +
        `Set textLayout in src/resume/mountains.ts to ${JSON.stringify(measured)} and check the PDF.`,
    )
  }
}

/** A card text line's origin and visible left edge, and how far its ink reaches right of the origin, in page px. */
type LineInk = {
  readonly line: string | undefined
  readonly x: number
  readonly left: number
  readonly reach: number
}

/** Runs in the card page, measuring each text line's ink with its computed font. */
function measureCardText(): LineInk[] {
  const context = document.createElement("canvas").getContext("2d")
  const found: LineInk[] = []

  if (context === null) throw new Error("Canvas 2D is unavailable")

  for (const text of document.querySelectorAll<SVGTextElement>(".card text[data-line]")) {
    const style = getComputedStyle(text)
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    // The canvas ignores "normal" and would keep the previous line's spacing.
    context.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing
    const ink = context.measureText(text.textContent ?? "")
    const x = Number(text.getAttribute("x"))

    found.push({
      line: text.dataset["line"],
      x,
      left: x - ink.actualBoundingBoxLeft,
      reach: ink.actualBoundingBoxRight,
    })
  }

  return found
}

/** The front mountains are tested against textLines; fail rather than print text off its edge or past its width. */
export async function checkCardText(page: Readonly<Pick<Page, "locator">>): Promise<void> {
  const measured = await page.locator(".card").evaluate(measureCardText)

  const lines = (["name", "email", "phone"] as const).map((line) => {
    const ink = measured.find((found) => found.line === line)

    if (!ink) throw new Error(`Missing the ${line} line on the card page`)

    const { size, width } = textLines[line]
    const reach = ink.reach / ((size * 4) / 3)

    return {
      line,
      moved: Math.abs(ink.left - TEXT_LEFT) > 0.05 || reach > width,
      fit: {
        inkLeft: Math.round(ink.left * 1000) / 1000,
        x: Math.round((ink.x + TEXT_LEFT - ink.left) * 100) / 100,
        width: Math.ceil(reach * 100) / 100,
      },
    } as const
  })

  const moved = lines.flatMap((entry) => (entry.moved ? [entry.line] : []))

  if (moved.length > 0) {
    const fit = Object.fromEntries(lines.map((entry) => [entry.line, entry.fit]))

    throw new Error(
      `Card text moved (${moved.join(", ")}): its ink must start at x = ${TEXT_LEFT} within the widths the front ` +
        `mountains are tested against. Measured ${JSON.stringify(fit)}; set x and width in textLines in ` +
        `src/card/mountains.ts to match and check the PDF.`,
    )
  }
}

type PageCheck = (page: Readonly<Pick<Page, "locator">>) => Promise<void>

/** Prints a route of the harness site to `renderedPath`, once `check` passes on the loaded page. */
async function renderPdf(route: string, renderedPath: string, check: PageCheck): Promise<void> {
  await using resources = new AsyncDisposableStack()

  const server = await dev({
    configFile: "scripts/resume/astro.config.mjs",
    logLevel: "warn",
    server: { host: "127.0.0.1", port: 0 },
  })

  resources.defer(async () => {
    await server.stop()
  })
  const browser = await chromium.launch()

  resources.defer(async () => {
    await browser.close()
  })
  const page = await browser.newPage()

  await page.emulateMedia({ media: "print" })

  const response = await page.goto(`http://127.0.0.1:${server.address.port}${route}`, {
    waitUntil: "networkidle",
  })

  if (response === null || !response.ok()) throw new Error(`Failed to load route ${route}`)
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  await check(page)
  await page.pdf({ path: renderedPath, printBackground: true, preferCSSPageSize: true })
}

/** Renders the format's route, checks the page, and installs the validated PDF in `publishDirectory`. */
export async function generatePdf(
  format: PdfFormat,
  publishDirectory: string,
  check: PageCheck,
): Promise<void> {
  const output = await prepareOutput(
    format,
    path.resolve(".resume"),
    path.resolve(publishDirectory),
  )

  await renderPdf(format.route, output.renderedPath, check)

  await installPdf(output)

  process.stdout.write(`Generated ${path.relative(process.cwd(), output.publishedPath)}\n`)
}
