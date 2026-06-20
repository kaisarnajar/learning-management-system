import sharp from "sharp";
import { readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const inputPath = path.join(root, "public", "assets", "logo.png");
const tmpPath = path.join(root, "public", "assets", "logo.png.tmp");

const source = await readFile(inputPath);
const meta = await sharp(source).metadata();
if (!meta.width || !meta.height) {
  throw new Error("Could not read logo dimensions");
}

const makeIcon = (size) => sharp(source).resize({ width: size, height: size, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });

await makeIcon(512).png({ compressionLevel: 9 }).toFile(path.join(root, "public", "icon-512.png"));
await makeIcon(180).png().toFile(path.join(root, "app", "apple-icon.png"));
await makeIcon(32).png().toFile(path.join(root, "app", "icon.png"));

const optimizedPng = await sharp(source)
  .resize({ width: 480, withoutEnlargement: true })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();

const optimizedWebp = await sharp(optimizedPng).webp({ quality: 82, effort: 6 }).toBuffer();

await writeFile(tmpPath, optimizedPng);
await unlink(inputPath);
await rename(tmpPath, inputPath);
await writeFile(path.join(root, "public", "assets", "logo.webp"), optimizedWebp);

const outMeta = await sharp(optimizedPng).metadata();
console.log(
  `logo.png ${outMeta.width}x${outMeta.height} (${optimizedPng.length} bytes), logo.webp (${optimizedWebp.length} bytes), favicons in app/`,
);
