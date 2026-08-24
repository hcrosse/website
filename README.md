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
- Secret for production and preview: `CLOUDFLARE_API_TOKEN` with R2 read access
- Variable for production and preview: `CLOUDFLARE_ACCOUNT_ID`

The token and account ID must be build environment variables, not runtime
bindings or Secrets Store entries. They are required only while downloading the
private font files from R2.
