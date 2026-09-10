import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    pedantic: "error",
    perf: "error",
    restriction: "error",
    suspicious: "error",
  },
  env: { builtin: true },
  ignorePatterns: [
    ".astro/**",
    ".resume/**",
    ".superpowers/**",
    ".worktrees/**",
    "dist/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
    typeAware: true,
    typeCheck: true,
  },
  plugins: ["eslint", "typescript", "unicorn", "oxc"],
  overrides: [
    {
      files: ["src/plugins/remark-glow.ts"],
      rules: {
        "typescript/prefer-readonly-parameter-types": [
          "error",
          {
            allow: [
              {
                from: "package",
                package: "@types/mdast",
                name: ["Root", "Text", "Heading", "Parent"],
              },
            ],
          },
        ],
      },
    },
  ],
  rules: {
    "oxc/no-async-await": "off",
    "oxc/no-accumulating-spread": "error",
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "eslint/complexity": ["error", { max: 8, variant: "classic" }],
    "eslint/max-depth": ["error", { max: 3 }],
    "eslint/max-lines": ["error", { max: 250, skipBlankLines: false, skipComments: false }],
    "eslint/max-lines-per-function": [
      "error",
      { IIFEs: true, max: 40, skipBlankLines: false, skipComments: false },
    ],
    "eslint/max-params": ["error", { countThis: "except-void", max: 3 }],
  },
});
