#!/usr/bin/env node
// Genera og-create.png e og-discover.png dai file SVG con font Pacifico + Noto Sans.
// Esegui: npm install && npm run og  (oppure ./scripts/gen-og.sh via Docker)

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FONTS = {
  'Pacifico':  'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf',
  'Noto Sans': 'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf',
};

async function fetchTTF(name) {
  const url = FONTS[name];
  console.log(`Scarico ${name}...`);
  const buf = await fetch(url).then(r => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.arrayBuffer();
  });
  return Buffer.from(buf);
}

async function svgToPng(svgFile, pngFile, fontBuffers) {
  const svg = readFileSync(svgFile, 'utf8');
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers,
      loadSystemFonts: false,
      defaultFontFamily: 'Noto Sans',
    },
    fitTo: { mode: 'width', value: 1200 },
  });
  writeFileSync(pngFile, resvg.render().asPng());
  console.log('✓', pngFile);
}

const [pacificoBuf, notoSansBuf] = await Promise.all([
  fetchTTF('Pacifico'),
  fetchTTF('Noto Sans'),
]);

const fonts = [pacificoBuf, notoSansBuf];
await svgToPng(join(ROOT, 'og-create.svg'),   join(ROOT, 'og-create.png'),   fonts);
await svgToPng(join(ROOT, 'og-discover.svg'), join(ROOT, 'og-discover.png'), fonts);
console.log('Done. Commetti i .png e verifica che og:image punti a .png negli HTML.');
