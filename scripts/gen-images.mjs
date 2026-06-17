// One-off asset generator: rasterizes the brand SVGs into the PNGs that
// browsers and social platforms need. Run with: node scripts/gen-images.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const favicon = readFileSync(resolve(root, 'public/favicon.svg'));
const ogSrc = readFileSync(resolve(root, 'scripts/og-source.svg'));

const jobs = [
  { svg: ogSrc, w: 1200, h: 630, out: 'public/og-image.png' },
  { svg: favicon, w: 180, h: 180, out: 'public/apple-touch-icon.png' },
  { svg: favicon, w: 512, h: 512, out: 'public/icon-512.png' },
  { svg: favicon, w: 32, h: 32, out: 'public/favicon-32.png' },
];

for (const j of jobs) {
  await sharp(j.svg, { density: 384 })
    .resize(j.w, j.h, { fit: 'fill' })
    .png()
    .toFile(resolve(root, j.out));
  console.log('wrote', j.out);
}
