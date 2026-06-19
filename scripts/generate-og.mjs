#!/usr/bin/env node
// Genera og-create.png e og-discover.png dai file SVG con font Pacifico + Lato.
// Esegui: npm install && npm run og  (oppure ./scripts/gen-og.sh via Docker)

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FONTS = [
  { name: 'Pacifico', url: 'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf' },
  { name: 'Lato',     url: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf' },
];

async function fetchTTF({ name, url }) {
  console.log(`Scarico ${name}...`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status} — ${url}`);
  return { name, buf: Buffer.from(await r.arrayBuffer()) };
}

// Embeds @font-face rules as base64 data URIs directly in the SVG string.
// This is more reliable than resvg fontBuffers option.
function embedFonts(svg, fonts) {
  const css = fonts
    .map(({ name, buf }) =>
      `@font-face{font-family:'${name}';src:url('data:font/truetype;base64,${buf.toString('base64')}');font-weight:400 700;}`
    )
    .join('');
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${css}</style>`);
}

async function svgToPng(svgFile, pngFile, fonts) {
  const svg = embedFonts(readFileSync(svgFile, 'utf8'), fonts);
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false },
    fitTo: { mode: 'width', value: 1200 },
  });
  writeFileSync(pngFile, resvg.render().asPng());
  console.log('✓', pngFile);
}

const fonts = await Promise.all(FONTS.map(fetchTTF));
await svgToPng(join(ROOT, 'og-create.svg'),   join(ROOT, 'og-create.png'),   fonts);
await svgToPng(join(ROOT, 'og-discover.svg'), join(ROOT, 'og-discover.png'), fonts);
console.log('Done. Commetti i .png e verifica che og:image punti a .png negli HTML.');
