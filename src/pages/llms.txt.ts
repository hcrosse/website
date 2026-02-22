import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  const blog = await getCollection('blog');

  const sortedBlog = blog.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const pageOrder = ['about', 'work', 'colophon'];
  const sortedPages = pages.sort(
    (a, b) => pageOrder.indexOf(a.id) - pageOrder.indexOf(b.id),
  );

  const pageLines = sortedPages.map(
    (p) =>
      `- [${p.data.title}](https://crosse.dev/${p.id}): ${p.data.description}`,
  );
  pageLines.splice(
    2,
    0,
    '- [Blog](https://crosse.dev/blog): Technical writing',
    '- [Contact](https://crosse.dev/contact): Contact information',
  );

  const blogLines = sortedBlog.map(
    (p) =>
      `- [${p.data.title}](https://crosse.dev/blog/${p.id}): ${p.data.description}`,
  );

  const body = [
    '# Harrison Crosse',
    '',
    '> Software engineer. Personal website and blog.',
    '',
    '## Pages',
    '',
    ...pageLines,
    '',
    '## Blog Posts',
    '',
    ...blogLines,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
