#!/usr/bin/env node
// Generates the installed-app (PWA) icons from the 512px academy logo.
//
// Why: Android picks the home-screen icon from the web manifest. With only a
// favicon ("sizes: any") and one 512px PNG, Chrome could take the low-res
// favicon or scale an icon that was not meant for its round mask, and the
// installed icon came out blurry. This writes every size the platforms ask
// for, downscaled once here with a high-quality filter:
//
//   icon-192 / icon-512            purpose "any": the whole logo
//   icon-maskable-192 / -512       purpose "maskable": the logo at 80% on white,
//                                  inside the safe zone Android's circle/squircle
//                                  mask keeps, so the seal's edge is not cut off
//   apple-touch-icon (180)         iOS home screen
//
// Production and staging each get a set (the staging source may carry a
// marker). Output: public/icons/app/. Run after changing the logo:
//   node scripts/generate-app-icons.mjs
import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public/icons/app");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
/** Share of the canvas the logo fills in a maskable icon (the safe zone is a centred circle of 80%). */
const MASKABLE_SCALE = 0.8;

const SOURCES = [
  { suffix: "", file: "public/icon-512.png" },
  { suffix: "-staging", file: "public/icon-512-staging.png" },
];

function png(image) {
  return image.png({ compressionLevel: 9, adaptiveFiltering: true });
}

async function plain(src, size, out) {
  await png(sharp(src).flatten({ background: WHITE }).resize(size, size, { kernel: "lanczos3" })).toFile(out);
}

async function maskable(src, size, out) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const logo = await sharp(src).flatten({ background: WHITE }).resize(inner, inner, { kernel: "lanczos3" }).toBuffer();
  await png(
    sharp({ create: { width: size, height: size, channels: 3, background: WHITE } }).composite([{ input: logo, gravity: "center" }]),
  ).toFile(out);
}

await mkdir(outDir, { recursive: true });
for (const { suffix, file } of SOURCES) {
  const src = path.join(root, file);
  const { width, height } = await sharp(src).metadata();
  if (width !== height || width < 512) throw new Error(`${file} must be square and at least 512px (is ${width}x${height})`);

  await plain(src, 192, path.join(outDir, `icon-192${suffix}.png`));
  await plain(src, 512, path.join(outDir, `icon-512${suffix}.png`));
  await maskable(src, 192, path.join(outDir, `icon-maskable-192${suffix}.png`));
  await maskable(src, 512, path.join(outDir, `icon-maskable-512${suffix}.png`));
  await plain(src, 180, path.join(outDir, `apple-touch-icon${suffix}.png`));
}
console.log(`App icons written to ${path.relative(root, outDir)}/`);
