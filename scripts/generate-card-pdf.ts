import { checkCardText, generatePdf } from "./resume/browser"
import { cardPdf } from "./resume/files"

await generatePdf(cardPdf, "print", checkCardText)
