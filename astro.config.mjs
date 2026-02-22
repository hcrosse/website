// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import remarkBreaks from 'remark-breaks';
import remarkGlow from './src/plugins/remark-glow.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://crosse.dev',
  output: 'static',
  markdown: {
    remarkPlugins: [remarkBreaks, remarkGlow],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
