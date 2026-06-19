#!/bin/sh
# Genera og-create.png e og-discover.png usando Docker (non serve Node locale).
# Uso: ./scripts/gen-og.sh
set -e
cd "$(dirname "$0")/.."
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c \
  "apk add --no-cache font-noto-emoji font-noto >/dev/null 2>&1 && npm install --silent && npm run og"
