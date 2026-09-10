import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { newestFirst, type BlogSummary } from "../data/blog";
import { pagesMeta } from "../data/pages";

export const GET: APIRoute = async ({
  site,
}: {
  readonly site: { readonly href: string } | undefined;
}) => {
  if (!site) throw new Error("RSS requires a configured site URL");
  const posts = await getCollection("blog");

  return rss({
    title: "Harrison Crosse",
    description: pagesMeta.blog.description,
    site: site.href,
    items: posts.toSorted(newestFirst).map((post: BlogSummary) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
    })),
  });
};
