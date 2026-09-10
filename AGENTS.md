# Website

Static Astro website deployed to Cloudflare Pages, with local résumé PDF generation.

<!-- harness-upgrade:v1:repository-map:begin -->

## Commands

Run from the repository root:

- `mise install && bun ci` installs the locked toolchain and dependencies.
- `bun run check:build` runs hooks, formatting, type checks, tests, and the site build.
- `bun run lint` checks code and GitHub workflows.
- `bun run format` formats project files.
- `bun run audit` checks dependency advisories. It requires registry access.
- `bun run preview` serves the built site.
- `bun run resume:pdf` regenerates both tracked résumé PDFs. Install Chromium first with `bunx --bun playwright install chromium`.

Bun runs project commands via `bunfig.toml`. Preserve the seven-day release-age policies and exact dependency pins.

## Source map

- `src/pages/`, `src/layouts/`, `src/components/`: routes and templates.
- `src/content/` and `src/content.config.ts`: Markdown collections and schemas.
- `src/data/`: page metadata and OG image layout.
- `src/plugins/remark-glow.ts`: Markdown transformations.
- `src/resume/`: résumé content and print layout.
- `scripts/resume/`: local browser rendering, PDF validation, and temporary files.
- `tools/oxlint/anti-slop/`: vendored lint rules. Preserve the upstream code and license.
- `public/fonts/`: private fonts. Build setup is documented in [README.md](README.md).

Build output in `dist/`, `.astro/`, and `.resume/` is generated. Regenerate tracked résumé PDFs only when requested or when résumé output intentionally changes.

## Code and prose

Keep the configured lint rules and limits. Discuss removals, relaxed options, and suppressions before changing them.

Use readonly inputs for read-only operations. The Markdown plugin's configured AST allowance permits intentional tree mutation. Keep sequential-await exceptions local to the operations that require ordering.

Use specific types and remove unnecessary assertions. Explain a remaining assertion's checked invariant with `SAFETY:`. Verify behavior through public interfaces instead of mocking module internals.

Keep prose concise. Describe the shipped behavior, commands, and constraints. Omit task narration, review history, obvious comments, and unnecessary headings. Keep dependency-update history in commits and PRs rather than the README.
<!-- harness-upgrade:v1:repository-map:end -->
