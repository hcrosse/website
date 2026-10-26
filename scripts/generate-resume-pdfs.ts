import { checkTextLayout, generatePdf } from "./resume/browser"
import { resumePdf } from "./resume/files"

await generatePdf(resumePdf, "public", checkTextLayout)
