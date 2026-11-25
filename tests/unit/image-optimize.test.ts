import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_IMAGE_EDGE, optimizeImage } from "@/services/image-optimize";
import { UploadError } from "@/services/storage";

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#228844" } });

describe("optimizeImage", () => {
  it("shrinks a large PNG to WebP within the long-edge limit, keeping the aspect ratio", async () => {
    const png = await solid(1672, 941).png().toBuffer();

    const result = await optimizeImage(png, "image/png");

    expect(result.mime).toBe("image/webp");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(MAX_IMAGE_EDGE);
    expect(meta.height).toBe(Math.round((941 * MAX_IMAGE_EDGE) / 1672));
  });

  it("never enlarges a small image", async () => {
    const jpeg = await solid(300, 200).jpeg().toBuffer();

    const meta = await sharp((await optimizeImage(jpeg, "image/jpeg")).buffer).metadata();

    expect([meta.width, meta.height]).toEqual([300, 200]);
  });

  it("applies the EXIF orientation, then drops all metadata", async () => {
    // Stored 400×200 with orientation 6 (rotate 90°): shown 200×400.
    const jpeg = await solid(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const meta = await sharp((await optimizeImage(jpeg, "image/jpeg")).buffer).metadata();

    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });

  it("keeps GIFs as they are (they may be animated)", async () => {
    const gif = await solid(2000, 2000).gif().toBuffer();

    const result = await optimizeImage(gif, "image/gif");

    expect(result).toEqual({ buffer: gif, mime: "image/gif" });
  });

  it("refuses bytes that only look like an image", async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(24)]);

    await expect(optimizeImage(fake, "image/png")).rejects.toBeInstanceOf(UploadError);
  });
});
