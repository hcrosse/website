# website

[My personal website](https://crosse.dev), built with [Astro](https://astro.build).

## Development

```sh
mise install
mise run setup
bun run dev
```

`mise run format` applies automatic fixes, and `mise run lint`, `mise run test`,
and `mise run audit` run the checks CI runs.

## Build

```sh
mise run build
bun run preview
```

## Cloudflare Pages

Configure the Git integration with:

- Build command: `bun ci && sh scripts/fetch-fonts.sh && bun run build`
- Build output directory: `dist`
- Secret for production and preview: `CLOUDFLARE_API_TOKEN`, created under
  Cloudflare API Tokens with Account > Workers R2 Storage > Read permission
- Variable for production and preview: `CLOUDFLARE_ACCOUNT_ID`

The token and account ID must be build environment variables, not runtime
bindings or Secrets Store entries. They are required only while downloading the
private font files from R2. An R2 S3 API token created from the R2 dashboard is
not compatible with Wrangler's `CLOUDFLARE_API_TOKEN` authentication.

## Resume PDF

Install the local browser once:

```sh
bunx --bun playwright install chromium
```

Generate the resume from `src/resume/content.ts`:

```sh
bun run resume:pdf
```

This replaces the tracked `public/harrison-crosse-resume.pdf` only after the
generated PDF passes validation. It is published at
`https://crosse.dev/harrison-crosse-resume.pdf`. The website has no resume HTML
route or navigation item.

Generated files must be parseable, non-empty US Letter PDFs. A resume that spans
more than one Letter page is retained and reported with a warning so content can
be adjusted manually.

## Business card PDF

Generate the print file for Jukebox Print from `src/card/` with the same browser:

```sh
bun run card:pdf
```

This replaces the tracked `print/harrison-crosse-card.pdf` only after it passes
validation: two pages, front then back, each 3.75 × 2.25 in, which is the
3.5 × 2 in card with 0.125 in bleed on every side, marked by each page's TrimBox
and BleedBox. The PDF is RGB with embedded fonts and vector dots, and has no
background or crop marks because it prints on cream stock. Jukebox's prepress
converts it to CMYK. `print/` is not published.

If edited contact details no longer start at the text edge or outgrow the widths
the mountains are tested against, generation fails with the values to set in
`textLines` in `src/card/mountains.ts`.
