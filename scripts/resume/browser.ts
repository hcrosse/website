import { dev } from "astro"
import { chromium } from "playwright"

import { textLayout } from "../../src/resume/mountains"
import type { ResumeOutput } from "./files"

type Box = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

type TextBoxes = {
  readonly page: Box
  readonly lastJob: Box
  readonly tools: Box
  readonly utility: Box
}

async function textBoxes(box: (selector: string) => Promise<Box>): Promise<TextBoxes> {
  const [page, lastJob, tools, utility] = await Promise.all([
    box(".resume"),
    box(".employment-entry:last-of-type"),
    box(".utility > :last-child"),
    box(".utility"),
  ])

  return { page, lastJob, tools, utility }
}

/** The footer mountains are fitted to textLayout; fail rather than print text over them. */
function checkTextLayout({ page, lastJob, tools, utility }: TextBoxes): void {
  const measured: Record<keyof typeof textLayout, number> = {
    employmentBottom: lastJob.y + lastJob.height - page.y,
    toolsBottom: tools.y + tools.height - page.y,
    ruleBottom: utility.y + utility.height - page.y,
    ruleX: utility.x - page.x,
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

export async function renderPdf({ renderedPath }: ResumeOutput): Promise<void> {
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

  const response = await page.goto(`http://127.0.0.1:${server.address.port}/`, {
    waitUntil: "networkidle",
  })

  if (response === null || !response.ok()) throw new Error("Failed to load resume route")
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  checkTextLayout(
    await textBoxes(async (selector) => {
      const found = await page.locator(selector).boundingBox()

      if (found === null) throw new Error(`Missing ${selector} on the resume page`)

      return found
    }),
  )
  await page.pdf({ path: renderedPath, printBackground: true, preferCSSPageSize: true })
}
