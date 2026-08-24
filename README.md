# website

[My personal website](https://crosse.dev), built with [Astro](https://astro.build).

## Development

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
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

## Resume PDFs

Install the local browser once:

```sh
bunx playwright install chromium
```

Generate the canonical light and dark resumes from the committed general
content:

```sh
bun run resume:pdf
```

This replaces the stable tracked files only after both generated PDFs pass
validation:

- `public/harrison-crosse-resume-light.pdf`
- `public/harrison-crosse-resume-dark.pdf`

They are published at
`https://crosse.dev/harrison-crosse-resume-light.pdf` and
`https://crosse.dev/harrison-crosse-resume-dark.pdf`. The website has no resume
HTML route or navigation item.

Generate private tailored PDFs with content stored under the ignored `.resume/`
directory:

```sh
bun run resume:pdf --content .resume/data-platform.json
```

Private output names use the local generation date, for example
`.resume/harrison_crosse_resume_light_2026_08_24.pdf` and
`.resume/harrison_crosse_resume_dark_2026_08_24.pdf`. If either dated file
already exists, both new files share a full timestamp suffix such as
`2026_08_24_09_08_07`. A colliding full-timestamp name is not overwritten.

Both modes require parseable, non-empty US Letter PDFs. A resume that spans more
than one Letter page is retained and reported with a warning so content can be
adjusted manually.
