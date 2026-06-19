#!/bin/sh
# Genera og-create/og-discover/og-notify .svg/.png (PNG raster del SVG).
# Uso: ./scripts/gen-og.sh
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1 && command -v convert >/dev/null 2>&1; then
  node scripts/generate-og.mjs
else
  docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c \
    "apk add --no-cache imagemagick font-noto-emoji font-noto >/dev/null 2>&1 && node scripts/generate-og.mjs"
fi
