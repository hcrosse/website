import fs from "node:fs"
import path from "node:path"

import { Resvg } from "@resvg/resvg-js"
import type { GetStaticPaths } from "astro"
import { getCollection } from "astro:content"
import satori from "satori"

import type { BlogSummary } from "../../data/blog"
import { ogCard } from "../../data/og"
import { pagesMeta, blogPostOgPrompt, type PageMeta } from "../../data/pages"

const fontsDir = path.join(process.cwd(), "public/fonts")

const fonts = {
  regular: fs.readFileSync(path.join(fontsDir, "BerkeleyMono-Regular.otf")),
  bold: fs.readFileSync(path.join(fontsDir, "BerkeleyMono-Bold.otf")),
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection("blog")

  const staticPaths = Object.entries(pagesMeta).map(
    ([slug, meta]: readonly [string, PageMeta]) => ({
      params: { slug },
      props: meta,
    }),
  )

  const blogPaths = posts.map((post: BlogSummary) => ({
    params: { slug: `blog/${post.id}` },
    props: {
      title: post.data.title,
      description: post.data.description,
      ogPrompt: blogPostOgPrompt(post.id),
    },
  }))

  return [...staticPaths, ...blogPaths]
}

export async function GET({ props }: { readonly props: PageMeta }): Promise<Response> {
  const svg = await satori(ogCard(props), {
    width: 1200,
    height: 630,
    fonts: [
      { name: "BerkeleyMono", data: fonts.regular, weight: 400, style: "normal" },
      { name: "BerkeleyMono", data: fonts.bold, weight: 700, style: "normal" },
    ],
  })

  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng()

  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } })
}
