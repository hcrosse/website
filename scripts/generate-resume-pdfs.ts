import path from "node:path"

import { renderPdf } from "./resume/browser"
import { installPdf, prepareOutput } from "./resume/files"

const output = await prepareOutput(path.resolve(".resume"), path.resolve("public"))

await renderPdf(output)

await installPdf(output)

process.stdout.write(`Generated ${path.relative(process.cwd(), output.publishedPath)}\n`)
