#!/bin/sh
set -e
mkdir -p public/fonts
for f in BerkeleyMono-Regular BerkeleyMono-Bold BerkeleyMono-Oblique BerkeleyMono-Bold-Oblique; do
  bunx wrangler r2 object get "fonts/berkeley_mono_web/${f}.woff2" --file "public/fonts/${f}.woff2" --remote
  [ -s "public/fonts/${f}.woff2" ] || { echo "ERROR: failed to download ${f}.woff2"; exit 1; }
  bunx wrangler r2 object get "fonts/berkeley_mono/${f}.otf" --file "public/fonts/${f}.otf" --remote
  [ -s "public/fonts/${f}.otf" ] || { echo "ERROR: failed to download ${f}.otf"; exit 1; }
done
