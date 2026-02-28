import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';
import { pagesMeta, blogPostOgPrompt, type PageMeta } from '../../data/pages';

const fontsDir = path.join(process.cwd(), 'public/fonts');
const fonts = {
  regular: fs.readFileSync(path.join(fontsDir, 'BerkeleyMono-Regular.otf'))
    .buffer as ArrayBuffer,
  bold: fs.readFileSync(path.join(fontsDir, 'BerkeleyMono-Bold.otf'))
    .buffer as ArrayBuffer,
};

export async function getStaticPaths() {
  const posts = await getCollection('blog');

  const staticPaths = Object.entries(pagesMeta).map(([slug, meta]) => ({
    params: { slug },
    props: meta,
  }));

  const blogPaths = posts.map((post) => ({
    params: { slug: `blog/${post.id}` },
    props: {
      title: post.data.title,
      description: post.data.description,
      ogPrompt: blogPostOgPrompt(post.id),
    },
  }));

  return [...staticPaths, ...blogPaths];
}

export async function GET({ props }: { props: PageMeta }) {
  const { title, description, ogPrompt } = props;
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          background: '#1e1e2e',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          fontFamily: 'BerkeleyMono',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { color: '#a6e3a1', fontSize: 26 },
              children: ogPrompt,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 20 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#cdd6f4',
                      fontSize: 80,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { color: '#6c7086', fontSize: 30 },
                    children: description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { color: '#45475a', fontSize: 24 },
              children: 'crosse.dev',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'BerkeleyMono',
          data: fonts.regular,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'BerkeleyMono',
          data: fonts.bold,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
