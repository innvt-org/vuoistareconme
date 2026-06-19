#!/usr/bin/env node
// Genera og-*.svg e og-*.png da un unico template (PNG = raster del SVG).
// Esegui: ./scripts/gen-og.sh  oppure  node scripts/generate-og.mjs

import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = join(ROOT, 'scripts', '.fonts');

const PACIFICO = {
  family: 'Pacifico',
  url: 'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf',
  file: 'Pacifico-Regular.ttf',
};

const TWEMOJI = {
  '❓': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2753.svg',
  '💌': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f48c.svg',
  '💬': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4ac.svg',
};

const CARDS = [
  {
    svg: 'og-create.svg',
    png: 'og-create.png',
    emoji: '❓',
    emojiSize: 56,
    message: 'Crea il tuo messaggio segreto',
    cta: 'Inizia ora — è gratis',
    ctaWidth: 440,
  },
  {
    svg: 'og-discover.svg',
    png: 'og-discover.png',
    emoji: '💌',
    emojiSize: 72,
    message: 'Hai ricevuto un messaggio segreto',
    cta: 'Clicca per scoprire',
    ctaWidth: 460,
  },
  {
    svg: 'og-notify.svg',
    png: 'og-notify.png',
    emoji: '💬',
    emojiSize: 64,
    message: 'Hai ricevuto una risposta',
    cta: 'Clicca per scoprirla',
    ctaWidth: 460,
  },
];

async function fetchFile(name, url) {
  console.log(`Scarico ${name}...`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function ensureFont({ file, url }) {
  const path = join(FONTS_DIR, file);
  try {
    return readFileSync(path);
  } catch {
    const buf = await fetchFile(file, url);
    writeFileSync(path, buf);
    return buf;
  }
}

async function ensureTwemoji(emoji) {
  const file = `twemoji-${emoji.codePointAt(0).toString(16)}.svg`;
  const path = join(FONTS_DIR, file);
  try {
    return readFileSync(path, 'utf8');
  } catch {
    const svg = await fetchFile(file, TWEMOJI[emoji]).then((b) => b.toString('utf8'));
    writeFileSync(path, svg);
    return svg;
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineEmojiSvg(svgMarkup, x, y, size) {
  const innerContent = svgMarkup
    .replace(/<\?xml[^?]*\?>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  const scale = (size / 36).toFixed(6);
  return `<g transform="translate(${x} ${y}) scale(${scale})">${innerContent}</g>`;
}

function buildSvg(card, pacificoBase64, emojiSvg) {
  const { emojiSize, message, cta, ctaWidth } = card;
  const ctaX = Math.round((1200 - ctaWidth) / 2);
  const ctaH = 58;

  // Logo in cima alla card bianca, poi emoji, messaggio, CTA
  const CARD_Y = 164;
  const brandY = CARD_Y + 36 + 20;
  const emojiY = brandY + 16 + 18;
  const messageY = emojiY + emojiSize + 20 + 28;
  const ctaY = messageY + 44;
  const ctaTextY = ctaY + Math.round(ctaH / 2) + 9;
  const emojiX = Math.round(600 - emojiSize / 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="630">
      <stop offset="0%" stop-color="#6c63d8"/>
      <stop offset="100%" stop-color="#3a3199"/>
    </linearGradient>
    <style>
      @font-face {
        font-family: '${PACIFICO.family}';
        src: url('data:font/truetype;base64,${pacificoBase64}') format('truetype');
        font-weight: 400;
        font-style: normal;
      }
    </style>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <circle cx="60"   cy="60"   r="180" fill="#ffffff" opacity="0.06"/>
  <circle cx="1140" cy="570"  r="220" fill="#ffffff" opacity="0.06"/>
  <circle cx="1080" cy="80"   r="90"  fill="#ffffff" opacity="0.08"/>
  <circle cx="120"  cy="580"  r="110" fill="#ffffff" opacity="0.05"/>

  <rect x="116" y="186" width="1000" height="320" rx="32" fill="#2a2480" opacity="0.35"/>
  <rect x="100" y="164" width="1000" height="320" rx="32" fill="#ffffff"/>

  <text x="600" y="${brandY}" text-anchor="middle"
        font-family="'${PACIFICO.family}', cursive" font-size="28" fill="#534ab7">vuoistarecon.me</text>

  ${inlineEmojiSvg(emojiSvg, emojiX, emojiY, emojiSize)}

  <text x="600" y="${messageY}" text-anchor="middle"
        font-family="'${PACIFICO.family}', cursive" font-size="40" fill="#534ab7">${escapeXml(message)}</text>

  <rect x="${ctaX}" y="${ctaY}" width="${ctaWidth}" height="${ctaH}" rx="29" fill="#534ab7"/>
  <text x="600" y="${ctaTextY}" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        font-size="26" font-weight="700" fill="#ffffff">${escapeXml(cta)}</text>
</svg>`;
}

function writeFontConfig() {
  const confPath = join(FONTS_DIR, 'fonts.conf');
  writeFileSync(confPath, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONTS_DIR}</dir>
</fontconfig>
`);
  return confPath;
}

function svgToPng(svgContent, pngPath, fontConfigPath) {
  const tmpSvg = join(FONTS_DIR, '.render.svg');
  const tmpBg = join(FONTS_DIR, '.render-bg.png');
  const env = { ...process.env, FONTCONFIG_FILE: fontConfigPath };

  // ImageMagick non renderizza i linearGradient SVG → sfondo nero. Compositing su gradiente IM.
  const fgSvg = svgContent.replace(
    '<rect width="1200" height="630" fill="url(#bg)"/>',
    '',
  );
  writeFileSync(tmpSvg, fgSvg);
  try { unlinkSync(pngPath); } catch { /* ok if missing */ }

  execFileSync('convert', [
    '-size', '1200x630',
    'gradient:#6c63d8-#3a3199',
    tmpBg,
  ], { stdio: 'inherit', env });

  execFileSync('convert', [
    tmpBg,
    '(', '-background', 'none', tmpSvg, '-resize', '1200x630!', ')',
    '-composite',
    pngPath,
  ], { stdio: 'inherit', env });
}

mkdirSync(FONTS_DIR, { recursive: true });

const pacificoBuf = await ensureFont(PACIFICO);
const pacificoBase64 = pacificoBuf.toString('base64');
const fontConfigPath = writeFontConfig();

for (const card of CARDS) {
  const emojiSvg = await ensureTwemoji(card.emoji);
  const svgPath = join(ROOT, card.svg);
  const pngPath = join(ROOT, card.png);
  const svg = buildSvg(card, pacificoBase64, emojiSvg);

  writeFileSync(svgPath, svg);
  console.log('✓', card.svg);

  svgToPng(svg, pngPath, fontConfigPath);
  console.log('✓', card.png);
}

console.log('Done.');
