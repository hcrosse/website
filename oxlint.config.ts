import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  ignorePatterns: [".astro/**", ".superpowers/**", ".worktrees/**", "dist/**"],
  plugins: ["typescript", "unicorn", "oxc"],
});
