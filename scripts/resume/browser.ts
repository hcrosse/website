import { dev } from "astro"
import { chromium } from "playwright"

import type { ResumeOutput } from "./files"

export async function renderPdfs(outputs: readonly ResumeOutput[]): Promise<void> {
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

  /* oxlint-disable eslint/no-await-in-loop -- Both themes navigate and print through the same browser page. */
  for (const { theme, renderedPath } of outputs) {
    const response = await page.goto(`http://127.0.0.1:${server.address.port}/${theme}`, {
      waitUntil: "networkidle",
    })

    if (response === null || !response.ok()) throw new Error(`Failed to load ${theme} resume route`)
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.pdf({ path: renderedPath, printBackground: true, preferCSSPageSize: true })
  }
  /* oxlint-enable eslint/no-await-in-loop */
}
