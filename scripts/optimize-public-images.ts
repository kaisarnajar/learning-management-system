/**
 * Re-encodes the public images already in R2 the way new uploads are
 * (services/image-optimize.ts: upright, at most 1200 px on the long side,
 * WebP, no metadata, a one-year immutable Cache-Control) and points the
 * database at the new copies on R2_PUBLIC_URL. Uploads made before this
 * existed are full-size originals (PNG exports of 2–3 MB) on the r2.dev URL.
 *
 * Usage:
 *   npx tsx scripts/optimize-public-images.ts            # dry run: re-encodes in memory, prints sizes, writes nothing
 *   npx tsx scripts/optimize-public-images.ts --apply    # stores the new objects and updates the rows (snapshot first)
 *
 * Run it with the deployment's R2_* settings and DATABASE_URL. When moving
 * to a custom domain, set R2_PUBLIC_URL to the new address and list the old
 * one in R2_LEGACY_PUBLIC_URLS (as on the deployment), so URLs on either
 * base are recognised; every rewritten URL uses R2_PUBLIC_URL.
 *
 * New objects get new keys (<old key without extension>.webp, or -o.webp
 * when the original was already WebP), so the originals stay where they are
 * and any URL an app still has cached keeps working. Delete them later by
 * hand from the snapshot if wanted. Idempotent: an object already stored
 * with the immutable Cache-Control is not re-encoded again, and only its
 * base URL is rewritten when needed. GIFs (possibly animated) are left as
 * they are. URLs that are not ours (Google photos, default avatars) are
 * never touched.
 */
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { publicStorageBaseUrls, stripPublicStorageBase } from "../config/storage-urls";
import { optimizeImage, PUBLIC_OBJECT_CACHE_CONTROL } from "../services/image-optimize";
import { sniffMime } from "../services/storage";
import { createPrismaClient } from "../utils/prisma-client";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../utils/s3";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = createPrismaClient();

type Row = { id: string; value: string };
type Column = { name: string; list: () => Promise<Row[]>; update: (id: string, value: string) => Promise<unknown> };

const COLUMNS: Column[] = [
  {
    name: "User.image",
    list: async () => (await prisma.user.findMany({ where: { image: { not: null } }, select: { id: true, image: true } })).map((r) => ({ id: r.id, value: r.image! })),
    update: (id, value) => prisma.user.update({ where: { id }, data: { image: value } }),
  },
  {
    name: "Teacher.imageUrl",
    list: async () => (await prisma.teacher.findMany({ where: { imageUrl: { not: null } }, select: { id: true, imageUrl: true } })).map((r) => ({ id: r.id, value: r.imageUrl! })),
    update: (id, value) => prisma.teacher.update({ where: { id }, data: { imageUrl: value } }),
  },
  {
    name: "SiteAnnouncementImage.imagePath",
    list: async () => (await prisma.siteAnnouncementImage.findMany({ select: { id: true, imagePath: true } })).map((r) => ({ id: r.id, value: r.imagePath })),
    update: (id, value) => prisma.siteAnnouncementImage.update({ where: { id }, data: { imagePath: value } }),
  },
  {
    name: "BlogImage.imagePath",
    list: async () => (await prisma.blogImage.findMany({ select: { id: true, imagePath: true } })).map((r) => ({ id: r.id, value: r.imagePath })),
    update: (id, value) => prisma.blogImage.update({ where: { id }, data: { imagePath: value } }),
  },
  {
    name: "LibraryItem.imagePath",
    list: async () => (await prisma.libraryItem.findMany({ where: { imagePath: { not: null } }, select: { id: true, imagePath: true } })).map((r) => ({ id: r.id, value: r.imagePath! })),
    update: (id, value) => prisma.libraryItem.update({ where: { id }, data: { imagePath: value } }),
  },
  {
    name: "Book.imagePath",
    list: async () => (await prisma.book.findMany({ where: { imagePath: { not: null } }, select: { id: true, imagePath: true } })).map((r) => ({ id: r.id, value: r.imagePath! })),
    update: (id, value) => prisma.book.update({ where: { id }, data: { imagePath: value } }),
  },
];

/** The uploads/ key of a stored URL on one of our bases (or a bare path), or null. */
function publicKeyOf(value: string): string | null {
  const ours = value.startsWith("uploads/") || value.startsWith("/uploads/") || publicStorageBaseUrls().some((base) => value.startsWith(`${base}/`));
  if (!ours || value.includes("..")) return null;
  const key = stripPublicStorageBase(value);
  return key.startsWith("uploads/") ? key : null;
}

function webpKeyFor(key: string): string {
  const stem = key.replace(/\.[A-Za-z0-9]+$/, "");
  return key.toLowerCase().endsWith(".webp") ? `${stem}-o.webp` : `${stem}.webp`;
}

type Outcome = { key: string; newKey: string; before: number; after: number; note: string };

async function processObject(key: string, apply: boolean): Promise<Outcome | null> {
  const client = getR2Client();
  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch {
    console.warn(`  missing in the bucket, left alone: ${key}`);
    return null;
  }
  const size = head.ContentLength ?? 0;
  if (head.ContentType === "image/webp" && head.CacheControl === PUBLIC_OBJECT_CACHE_CONTROL) {
    return { key, newKey: key, before: size, after: size, note: "already optimised" };
  }

  const object = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  const buffer = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : Buffer.alloc(0);
  const mime = sniffMime(buffer);
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
    return { key, newKey: key, before: size, after: size, note: `kept as is (${mime ?? "unknown type"})` };
  }

  let optimized;
  try {
    optimized = await optimizeImage(buffer, mime);
  } catch {
    console.warn(`  cannot be decoded, left alone: ${key}`);
    return null;
  }
  const newKey = webpKeyFor(key);
  if (apply) {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: newKey,
        Body: optimized.buffer,
        ContentType: optimized.mime,
        CacheControl: PUBLIC_OBJECT_CACHE_CONTROL,
      }),
    );
  }
  return { key, newKey, before: buffer.length, after: optimized.buffer.length, note: "re-encoded" };
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

async function main() {
  const apply = isApplyMode();
  printMode("optimize-public-images", apply);
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.error("Set R2_BUCKET_NAME and R2_PUBLIC_URL (and the other R2_* settings) first.");
    process.exitCode = 1;
    return;
  }
  console.log(`New URLs use ${R2_PUBLIC_URL}; recognised bases: ${publicStorageBaseUrls().join(", ")}`);

  const rows: Array<{ column: Column; row: Row; key: string }> = [];
  for (const column of COLUMNS) {
    const found = await column.list();
    let ours = 0;
    for (const row of found) {
      const key = publicKeyOf(row.value);
      if (!key) continue;
      rows.push({ column, row, key });
      ours += 1;
    }
    console.log(`${column.name}: ${found.length} set, ${ours} stored by us`);
  }

  const outcomes = new Map<string, Outcome | null>();
  for (const key of new Set(rows.map((entry) => entry.key))) {
    const outcome = await processObject(key, apply);
    outcomes.set(key, outcome);
    if (outcome) console.log(`  ${outcome.note}: ${key} ${kb(outcome.before)} -> ${outcome.newKey === key ? "same key" : outcome.newKey} ${kb(outcome.after)}`);
  }

  const changes = rows
    .map(({ column, row, key }) => {
      const outcome = outcomes.get(key);
      if (!outcome) return null;
      const to = `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${outcome.newKey}`;
      return to === row.value ? null : { column: column.name, id: row.id, from: row.value, to, update: () => column.update(row.id, to) };
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);

  const done = [...outcomes.values()].filter((outcome): outcome is Outcome => outcome !== null);
  const before = done.reduce((sum, outcome) => sum + outcome.before, 0);
  const after = done.reduce((sum, outcome) => sum + outcome.after, 0);
  console.log(`Objects: ${done.length}, ${kb(before)} -> ${kb(after)}`);
  console.log(`Rows to update: ${changes.length}`);

  if (!apply || changes.length === 0) {
    if (changes.length === 0) console.log("No rows to update.");
    return;
  }

  const snapshot = writeSnapshot("optimize-public-images", changes.map(({ column, id, from, to }) => ({ column, id, from, to })));
  console.log(`Snapshot written to ${snapshot}`);
  for (const change of changes) await change.update();
  console.log(`Updated ${changes.length} rows. The original objects are still in the bucket (see the snapshot).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
