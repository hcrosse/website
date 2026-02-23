#!/bin/sh
set -e
mkdir -p public/fonts
for f in BerkeleyMono-Regular BerkeleyMono-Bold BerkeleyMono-Oblique BerkeleyMono-Bold-Oblique; do
  npx wrangler r2 object get "fonts/berkeley_mono_web/${f}.woff2" --file "public/fonts/${f}.woff2"
done
