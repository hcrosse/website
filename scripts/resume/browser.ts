import { dev } from "astro"
import { chromium, type Page } from "playwright"

import { textLayout } from "../../src/resume/mountains"
import type { ResumeOutput } from "./files"

type Box = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The footer mountains are fitted to textLayout; fail rather than print text over them. */
async function checkTextLayout(page: Readonly<Pick<Page, "locator">>): Promise<void> {
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

  await page.emulateMedia({ media: "print" })

  const response = await page.goto(`http://127.0.0.1:${server.address.port}/`, {
    waitUntil: "networkidle",
  })

  if (response === null || !response.ok()) throw new Error("Failed to load resume route")
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  await checkTextLayout(page)
  await page.pdf({ path: renderedPath, printBackground: true, preferCSSPageSize: true })
}
