import { spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"

import { z } from "astro/zod"
import { chromium, type Browser, type Page } from "playwright"

import type { ResumeOutput } from "./files"

type Harness = Readonly<Pick<ChildProcess, "pid" | "exitCode" | "signalCode" | "once" | "kill">>

type PdfBrowser = Readonly<Pick<Browser, "close" | "newPage">>

type PdfPage = Readonly<Pick<Page, "goto" | "evaluate" | "pdf">>

type HarnessState = { error: Error | null }

const readinessTimeoutMs = 30_000

const tcpAddress = z.object({ port: z.number().int().min(1).max(65535) })

export function createHarnessEnvironment(
  inherited: Readonly<NodeJS.ProcessEnv> = process.env,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = Object.assign({}, inherited, {
    ASTRO_DEV_BACKGROUND: "0",
  })

  delete environment["RESUME_CONTENT_PATH"]

  return environment
}

async function reservePort(): Promise<number> {
  const server = createServer()

  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = tcpAddress.safeParse(server.address())
      server.close((error: Readonly<Error> | undefined) => {
        if (error) reject(error)
        else if (address.success) resolve(address.data.port)
        else reject(new Error("Failed to reserve a loopback port", { cause: address.error }))
      })
    })
  })

  return port
}

async function fetchBeforeDeadline(url: string, deadline: number): Promise<Response> {
  const remainingMs = deadline - Date.now()

  if (remainingMs <= 0) throw new Error("Resume harness readiness deadline expired")
  const response = await fetch(url, { signal: AbortSignal.timeout(remainingMs) })

  return response
}

async function waitForHarness(harness: Harness, baseUrl: string): Promise<void> {
  const deadline = Date.now() + readinessTimeoutMs
  const state: HarnessState = { error: null }
  harness.once("error", (error: Readonly<Error>) => {
    state.error = new Error(`Resume harness could not start: ${error.message}`, { cause: error })
  })

  /* oxlint-disable eslint/no-await-in-loop -- Each readiness probe must finish before waiting and retrying. */
  while (Date.now() < deadline) {
    if (state.error !== null) throw state.error

    if (harness.exitCode !== null || harness.signalCode !== null) {
      const reason =
        harness.exitCode === null ? `signal ${harness.signalCode}` : `code ${harness.exitCode}`

      throw new Error(`Resume harness exited with ${reason}`)
    }

    try {
      const response = await fetchBeforeDeadline(`${baseUrl}/light`, deadline)

      if (response.status === 200) return
    } catch {
      // Astro may not have bound the reserved port yet.
    }

    await delay(Math.min(200, Math.max(0, deadline - Date.now())))
  }

  /* oxlint-enable eslint/no-await-in-loop */
  throw new Error(`Resume harness did not become ready within ${readinessTimeoutMs}ms`)
}

async function stopHarness(harness: Harness): Promise<void> {
  const { pid = null } = harness

  if (pid === null || harness.exitCode !== null || harness.signalCode !== null) return
  harness.kill("SIGTERM")

  const exited = new Promise<void>((resolve) => {
    harness.once("exit", () => {
      resolve()
    })
  })

  if (!(await Promise.race([exited.then(() => true), delay(5_000).then(() => false)]))) {
    harness.kill("SIGKILL")
    await exited
  }
}

function startHarness(port: number): ChildProcess {
  return spawn(
    "bunx",
    [
      "--bun",
      "astro",
      "dev",
      "--ignore-lock",
      "--config",
      "scripts/resume/astro.config.mjs",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env: createHarnessEnvironment(), stdio: "inherit" },
  )
}

async function renderPdf(page: PdfPage, baseUrl: string, output: ResumeOutput): Promise<void> {
  const response = await page.goto(`${baseUrl}/${output.theme}`, { waitUntil: "networkidle" })

  if (response === null || !response.ok())
    throw new Error(`Failed to load ${output.theme} resume route`)
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.pdf({
    path: output.temporaryPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  })
}

async function closeResources(
  browser: PdfBrowser | null,
  harness: Harness | null,
): Promise<Error[]> {
  const errors: Error[] = []

  if (browser !== null) {
    try {
      await browser.close()
    } catch (cause) {
      errors.push(cause instanceof Error ? cause : new Error("Browser cleanup failed", { cause }))
    }
  }

  if (harness !== null) {
    try {
      await stopHarness(harness)
    } catch (cause) {
      errors.push(cause instanceof Error ? cause : new Error("Harness cleanup failed", { cause }))
    }
  }

  return errors
}

export async function renderPdfsWithHarness(outputs: readonly ResumeOutput[]): Promise<void> {
  let browser: Browser | null = null
  let harness: ChildProcess | null = null
  let primaryError: Error | null = null

  try {
    const port = await reservePort()
    const baseUrl = `http://127.0.0.1:${port}`
    harness = startHarness(port)
    await waitForHarness(harness, baseUrl)
    browser = await chromium.launch()
    const page = await browser.newPage()

    /* oxlint-disable eslint/no-await-in-loop -- Both themes navigate and print through the same browser page. */
    for (const output of outputs) await renderPdf(page, baseUrl, output)
    /* oxlint-enable eslint/no-await-in-loop */
  } catch (cause) {
    primaryError = cause instanceof Error ? cause : new Error("Resume rendering failed", { cause })
  }

  const cleanupErrors = await closeResources(browser, harness)

  if (primaryError !== null) {
    for (const error of cleanupErrors) process.stderr.write(`${error.stack ?? error.message}\n`)
    throw primaryError
  }

  if (cleanupErrors.length > 0)
    throw new AggregateError(cleanupErrors, "Resume harness cleanup failed")
}
