#!/usr/bin/env node
// Genera og-create.png e og-discover.png dai file SVG con font Pacifico + Noto Sans.
// Esegui: npm install && npm run og  (oppure ./scripts/gen-og.sh via Docker)

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FONT_URLS = {
  'Pacifico': [
    'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf',
  ],
  'Lato': [
    'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf',
  ],
};

async function fetchTTF(name) {
  const urls = FONT_URLS[name];
  for (const url of urls) {
    console.log(`Scarico ${name} da ${url}`);
    const r = await fetch(url);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    console.warn(`  → ${r.status}, provo prossimo URL`);
  }
  throw new Error(`Impossibile scaricare ${name}`);
}

async function svgToPng(svgFile, pngFile, fontBuffers) {
  const svg = readFileSync(svgFile, 'utf8');
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers,
      loadSystemFonts: false,
      defaultFontFamily: 'Lato',
    },
    fitTo: { mode: 'width', value: 1200 },
  });
  writeFileSync(pngFile, resvg.render().asPng());
  console.log('✓', pngFile);
}

const [pacificoBuf, latoBuf] = await Promise.all([
  fetchTTF('Pacifico'),
  fetchTTF('Lato'),
]);

const fonts = [pacificoBuf, latoBuf];
await svgToPng(join(ROOT, 'og-create.svg'),   join(ROOT, 'og-create.png'),   fonts);
await svgToPng(join(ROOT, 'og-discover.svg'), join(ROOT, 'og-discover.png'), fonts);
console.log('Done. Commetti i .png e verifica che og:image punti a .png negli HTML.');
