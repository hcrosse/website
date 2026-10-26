# Website

Static Astro website deployed to Cloudflare Pages, with local résumé and business card PDF generation.

<!-- harness-upgrade:v1:repository-map:begin -->

## Commands

Run from the repository root:

- `mise install && mise run deps` installs the locked toolchain and dependencies. `mise run setup` also installs the prek Git hook.
- `mise run lint` runs every check without modifying files: file hygiene, formatting, Oxlint, Astro type checks, shell scripts, and GitHub workflows.
- `mise run format` applies every automatic fix.
- `mise run test` runs the Bun tests.
- `mise run build` builds the site. It requires the private fonts, so CI skips it.
- `mise run audit` checks dependency advisories. It requires registry access.
- `bun run preview` serves the built site.
- `bun run resume:pdf` regenerates the tracked résumé PDF. Install Chromium first with `bunx --bun playwright install chromium`.
- `bun run card:pdf` regenerates the tracked business card PDF in `print/`.

Bun runs project commands via `bunfig.toml`. Preserve the seven-day release-age policies and exact dependency pins.

## Source map

- `src/pages/`, `src/layouts/`, `src/components/`: routes and templates.
- `src/content/` and `src/content.config.ts`: Markdown collections and schemas.
- `src/data/`: page metadata and OG image layout.
- `src/plugins/remark-glow.ts`: Markdown transformations.
- `src/resume/`: résumé content and print layout.
- `src/card/`: business card layout and mountains, built from the résumé's contact details and terrain crops.
- `scripts/resume/`: local rendering harness, PDF validation, and publishing into `public/` (résumé) and `print/` (card).
- `print/`: tracked print files. The site does not serve them.
- `tools/oxlint/anti-slop/`: vendored lint rules. Preserve the upstream code and license.
- `public/fonts/`: private fonts. Build setup is documented in [README.md](README.md).

Build output in `dist/`, `.astro/`, and `.resume/` is generated. Regenerate the tracked résumé or card PDF only when requested or when its output intentionally changes.

## Code and prose

Keep the configured lint rules and limits. Discuss removals, relaxed options, and suppressions before changing them.

Use readonly inputs for read-only operations. The Markdown plugin's configured AST allowance permits intentional tree mutation. Keep sequential-await exceptions local to the operations that require ordering.

Use specific types and remove unnecessary assertions. Explain a remaining assertion's checked invariant with `SAFETY:`. Verify behavior through public interfaces instead of mocking module internals.

Keep prose concise. Describe the shipped behavior, commands, and constraints. Omit task narration, review history, obvious comments, and unnecessary headings. Keep dependency-update history in commits and PRs rather than the README.
<!-- harness-upgrade:v1:repository-map:end -->
