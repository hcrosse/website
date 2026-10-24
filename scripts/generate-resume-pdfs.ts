import path from "node:path"

import { renderPdfs } from "./resume/browser"
import { installPdfs, prepareOutputs } from "./resume/files"

const outputs = await prepareOutputs(path.resolve(".resume"), path.resolve("public"))

await renderPdfs(outputs)

await installPdfs(outputs)

for (const { publishedPath } of outputs)
  process.stdout.write(`Generated ${path.relative(process.cwd(), publishedPath)}\n`)
