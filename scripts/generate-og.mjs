#!/usr/bin/env node
// Genera og-create.png e og-discover.png dai file SVG con font Pacifico + Noto Sans.
// Esegui: npm install && npm run og  (oppure ./scripts/gen-og.sh via Docker)

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Scarica un font TTF da Google Fonts usando UA vecchio per ottenere TTF
async function fetchGoogleFontTTF(family) {
  const css = await fetch(
    `https://fonts.googleapis.com/css?family=${encodeURIComponent(family)}&subset=latin`,
    { headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1)' } }
  ).then(r => r.text());

  const m = css.match(/src:\s*url\(([^)]+)\)/);
  if (!m) throw new Error(`URL non trovato per ${family}:\n${css}`);
  console.log(`Scarico ${family} da`, m[1]);
  return Buffer.from(await fetch(m[1]).then(r => r.arrayBuffer()));
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

console.log('Scarico font...');
const [pacificoBuf, notoSansBuf] = await Promise.all([
  fetchGoogleFontTTF('Pacifico'),
  fetchGoogleFontTTF('Noto Sans'),
]);

const fonts = [pacificoBuf, notoSansBuf];
await svgToPng(join(ROOT, 'og-create.svg'),   join(ROOT, 'og-create.png'),   fonts);
await svgToPng(join(ROOT, 'og-discover.svg'), join(ROOT, 'og-discover.png'), fonts);
console.log('Done. Commetti i .png e verifica che og:image punti a .png negli HTML.');
