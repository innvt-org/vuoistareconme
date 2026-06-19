#!/usr/bin/env node
// Genera og-create.png e og-discover.png dai file SVG con font Pacifico.
// Esegui: npm install && npm run og

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function fetchPacificoTTF() {
  // Richiede TTF con User-Agent vecchio (Google Fonts risponde con TTF per IE)
  const css = await fetch('https://fonts.googleapis.com/css?family=Pacifico&subset=latin', {
    headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)' }
  }).then(r => r.text());

  const m = css.match(/src:\s*url\(([^)]+)\)/);
  if (!m) throw new Error('URL font non trovato nel CSS:\n' + css);

  console.log('Scarico Pacifico da', m[1]);
  const buf = await fetch(m[1]).then(r => r.arrayBuffer());
  return Buffer.from(buf);
}

async function svgToPng(svgFile, pngFile, fontBuf) {
  const svg = readFileSync(svgFile, 'utf8');
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: [fontBuf],
      loadSystemFonts: true,
      defaultFontFamily: 'Georgia',
    },
    fitTo: { mode: 'width', value: 1200 },
  });
  const data = resvg.render();
  writeFileSync(pngFile, data.asPng());
  console.log('✓', pngFile);
}

const fontBuf = await fetchPacificoTTF();
await svgToPng(join(ROOT, 'og-create.svg'),   join(ROOT, 'og-create.png'),   fontBuf);
await svgToPng(join(ROOT, 'og-discover.svg'), join(ROOT, 'og-discover.png'), fontBuf);
console.log('Done. Ricordati di committare i .png e aggiornare i meta og:image.');
