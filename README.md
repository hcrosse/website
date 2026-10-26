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
`https://crosse.dev/harrison-crosse-resume.pdf`, and `public/_redirects`
permanently redirects the retired `-light` and `-dark` PDF URLs to it. The
website has no resume HTML route or navigation item.

Generated files must be parseable, non-empty US Letter PDFs. A resume that spans
more than one Letter page is retained and reported with a warning so content can
be adjusted manually.
