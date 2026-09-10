import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import type { ReadonlyDeep } from "type-fest";

import { newestFirst, type BlogSummary } from "../data/blog";

async function pageLinks(): Promise<string[]> {
  const pages = await getCollection("pages");
  const pageOrder = ["about", "work", "colophon"];

  const sorted = pages.toSorted(
    (a: ReadonlyDeep<CollectionEntry<"pages">>, b: ReadonlyDeep<CollectionEntry<"pages">>) =>
      pageOrder.indexOf(a.id) - pageOrder.indexOf(b.id),
  );

  const links = sorted.map(
    (page: ReadonlyDeep<CollectionEntry<"pages">>) =>
      `- [${page.data.title}](https://crosse.dev/${page.id}): ${page.data.description}`,
  );

  links.splice(
    2,
    0,
    "- [Blog](https://crosse.dev/blog): Technical writing",
    "- [Contact](https://crosse.dev/contact): Contact information",
  );

  return links;
}

async function blogLinks(): Promise<string[]> {
  const posts = await getCollection("blog");

  return posts
    .toSorted(newestFirst)
    .map(
      (post: BlogSummary) =>
        `- [${post.data.title}](https://crosse.dev/blog/${post.id}): ${post.data.description}`,
    );
}

export const GET: APIRoute = async () => {
  const [pages, posts] = await Promise.all([pageLinks(), blogLinks()]);

  const body = [
    "# Harrison Crosse",
    "",
    "> Software engineer. Personal website and blog.",
    "",
    "## Pages",
    "",
    ...pages,
    "",
    "## Blog Posts",
    "",
    ...posts,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
