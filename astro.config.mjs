// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import remarkGlow from './src/plugins/remark-glow.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://crosse.dev',
  output: 'static',
  markdown: {
    remarkPlugins: [remarkGlow],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
