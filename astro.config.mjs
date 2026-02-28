// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkBreaks from 'remark-breaks';
import remarkGlow from './src/plugins/remark-glow.mjs';

import cloudflare from '@astrojs/cloudflare';

const commitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  execSync('git rev-parse HEAD').toString().trim();

// https://astro.build/config
export default defineConfig({
  site: 'https://crosse.dev',
  output: 'static',
  prefetch: {
    defaultStrategy: 'hover',
  },
  integrations: [sitemap()],

  markdown: {
    remarkPlugins: [remarkBreaks, remarkGlow],
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.COMMIT_SHA': JSON.stringify(commitSha),
    },
    ssr: {
      external: ['satori', '@resvg/resvg-js', 'node:fs', 'node:path'],
    },
  },

  adapter: cloudflare(),
});
