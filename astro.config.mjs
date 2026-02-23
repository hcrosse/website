// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkBreaks from 'remark-breaks';
import remarkGlow from './src/plugins/remark-glow.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://crosse.dev',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkBreaks, remarkGlow],
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.CF_PAGES_COMMIT_SHA': JSON.stringify(
        process.env.CF_PAGES_COMMIT_SHA || '',
      ),
    },
  },
});
