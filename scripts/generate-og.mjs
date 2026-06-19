#!/usr/bin/env node
// Genera og-create.png e og-discover.png con @napi-rs/canvas.
// Esegui: ./scripts/gen-og.sh  (richiede Docker)

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function fetchTTF(name, url) {
  console.log(`Scarico ${name}...`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// Rounded rectangle helper
function rr(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y,     x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x,     y + h, radius);
  ctx.arcTo(x,     y + h, x,     y,     radius);
  ctx.arcTo(x,     y,     x + w, y,     radius);
  ctx.closePath();
}

function draw(ctx, { emoji, subtitle, cta }) {
  const W = 1200, H = 630;

  // Sfondo gradiente viola
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#6c63d8');
  grad.addColorStop(1, '#3a3199');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Cerchi decorativi
  for (const [cx, cy, r, op] of [
    [60,   60,  180, 0.06],
    [1140, 570, 220, 0.06],
    [1080, 80,  90,  0.08],
    [120,  580, 110, 0.05],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${op})`;
    ctx.fill();
  }

  // Ombra card
  ctx.fillStyle = 'rgba(42,36,128,0.28)';
  rr(ctx, 116, 186, 1000, 318, 32);
  ctx.fill();

  // Card bianca
  ctx.fillStyle = '#ffffff';
  rr(ctx, 100, 164, 1000, 318, 32);
  ctx.fill();

  // Emoji
  ctx.font = '86px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, W / 2, 295);

  // Brand — Pacifico
  ctx.font = '400 46px Pacifico';
  ctx.fillStyle = '#534ab7';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('vuoistarecon.me', W / 2, 376);

  // Sottotitolo — Lato
  ctx.font = '500 23px Lato';
  ctx.fillStyle = '#5a5680';
  ctx.fillText(subtitle, W / 2, 424);

  // Pill CTA
  ctx.fillStyle = '#534ab7';
  rr(ctx, W / 2 - 190, 455, 380, 50, 25);
  ctx.fill();
  ctx.font = '700 20px Lato';
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, 480);
}

async function generate(outFile, opts) {
  const canvas = createCanvas(1200, 630);
  draw(canvas.getContext('2d'), opts);
  writeFileSync(outFile, await canvas.encode('png'));
  console.log('✓', outFile);
}

// Font
const [pacBuf, latoBuf] = await Promise.all([
  fetchTTF('Pacifico', 'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf'),
  fetchTTF('Lato',     'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf'),
]);
GlobalFonts.register(pacBuf,  'Pacifico');
GlobalFonts.register(latoBuf, 'Lato');

await generate(join(ROOT, 'og-create.png'), {
  emoji: '❓',
  subtitle: 'Crea il tuo messaggio segreto',
  cta: 'Inizia ora — è gratis',
});
await generate(join(ROOT, 'og-discover.png'), {
  emoji: '💌',
  subtitle: 'Hai ricevuto un messaggio segreto',
  cta: 'Clicca per scoprire',
});
console.log('Done.');
