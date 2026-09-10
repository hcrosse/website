// @ts-check
import { execSync } from "node:child_process";

import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import remarkBreaks from "remark-breaks";

import remarkGlow from "./src/plugins/remark-glow.ts";

const buildCommit = process.env["CF_PAGES_COMMIT_SHA"] ?? "";

const commitSha =
  buildCommit === "" ? execSync("git rev-parse HEAD").toString().trim() : buildCommit;

// https://astro.build/config
export default defineConfig({
  site: "https://crosse.dev",
  output: "static",
  prefetch: {
    defaultStrategy: "hover",
  },
  integrations: [sitemap()],

  markdown: {
    processor: unified({ remarkPlugins: [remarkBreaks, remarkGlow] }),
  },

  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.COMMIT_SHA": JSON.stringify(commitSha),
    },
    ssr: {
      external: ["satori", "@resvg/resvg-js", "node:fs", "node:path"],
    },
  },
});
