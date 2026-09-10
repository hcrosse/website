import { afterEach, expect, setSystemTime, test } from "bun:test"

import { unified } from "@astrojs/markdown-remark"

import remarkGlow from "./remark-glow"

afterEach(() => {
  setSystemTime()
})

test("renders page headings as glow paragraphs and substitutes the current year", async () => {
  setSystemTime(new Date("2026-06-01T12:00:00Z"))

  const processor = await unified({ remarkPlugins: [remarkGlow] }).createRenderer({
    syntaxHighlight: false,
  })

  const result = await processor.render("# Title\n\nCopyright {year}", {
    fileURL: new URL("../content/pages/example.md", import.meta.url),
  })

  expect(result.code).toBe('<p class="glow-heading"># Title</p>\n<p>Copyright 2026</p>')
})

test("preserves semantic headings for blog posts", async () => {
  const processor = await unified({ remarkPlugins: [remarkGlow] }).createRenderer({
    syntaxHighlight: false,
  })

  const result = await processor.render("# Title", {
    fileURL: new URL("../content/blog/example.md", import.meta.url),
  })

  expect(result.code).toBe('<h1 id="title">Title</h1>')
})
