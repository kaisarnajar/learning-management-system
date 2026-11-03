import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import sharp from "sharp";
import { getChromiumExecutablePath } from "@/utils/chromium";
import fs from "fs/promises";
import path from "path";
import { ASSET_LOCAL_PATHS } from "@/config/assets";
import { getPdfFontFaceCss } from "@/services/pdf-fonts";

export type PdfOptions = {
  format?: "A4" | "A3" | "Letter";
  landscape?: boolean;
  width?: string | number;
  height?: string | number;
  /**
   * Delay in milliseconds before launching the browser.
   * Use this in fire-and-forget email senders to avoid racing with a
   * concurrent download request that also needs Chromium on Vercel.
   */
  startDelayMs?: number;
};

// ---------------------------------------------------------------------------
// Browser launch with retry (handles Vercel ETXTBSY race condition)
// ---------------------------------------------------------------------------

/**
 * ETXTBSY ("Text file busy") is thrown on Vercel/Lambda when two concurrent
 * invocations try to execute the same @sparticuz/chromium-min binary while
 * it is still being extracted to /tmp. Retrying with exponential backoff
 * resolves the issue once the first process finishes the extraction.
 */
async function launchBrowserWithRetry(maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (process.env.VERCEL) {
        return await puppeteerCore.launch({
          args: chromium.args,
          executablePath: await getChromiumExecutablePath(),
          headless: true,
        });
      } else {
        return await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }
    } catch (err) {
      const errorVal = err as { code?: string; message?: string };
      const isRetryable = errorVal?.code === "ETXTBSY" || errorVal?.message?.includes("ETXTBSY");
      if (isRetryable && attempt < maxRetries) {
        const delayMs = attempt * 1500; // 1.5s, 3s, 4.5s
        console.warn(
          `[pdf-generator] ETXTBSY on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  // unreachable, satisfies TypeScript
  throw new Error("[pdf-generator] Failed to launch browser after all retries.");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a PDF from an HTML string using Puppeteer.
 * Returns the raw PDF as a Buffer that can be streamed or attached to an email.
 *
 * The document is fully self-contained (stylesheet, fonts and images are
 * inlined by wrapHtmlForPdf), so the page runs with JavaScript disabled and
 * may not load anything over the network at all.
 */
export async function generatePdfFromHtml(
  html: string,
  { format = "A4", landscape = false, width, height, startDelayMs = 0 }: PdfOptions = {},
): Promise<Buffer> {
  if (startDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, startDelayMs));
  }

  const browser = await launchBrowserWithRetry();

  try {
    const page = await browser.newPage();
    const viewportWidth = width ? parseInt(width.toString().replace('px', '')) : 1200;
    const viewportHeight = height ? parseInt(height.toString().replace('px', '')) : 800;
    await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 3 });

    // The rendered HTML contains user-supplied text. It is escaped, and the
    // document needs no scripts, so JavaScript is off and every request that
    // is not an inline data: URL is refused: an injected <img>/<iframe> can
    // reach neither internal services nor the internet from the PDF worker.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (isAllowedPdfResource(request.url())) {
        void request.continue();
      } else {
        console.warn("[pdf-generator] Blocked request to non-allow-listed URL:", request.url().slice(0, 120));
        void request.abort("blockedbyclient");
      }
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready").catch(() => {});

    const pdfOptions: {
      landscape: boolean;
      printBackground: boolean;
      margin: { top: string; right: string; bottom: string; left: string };
      width?: string | number;
      height?: string | number;
      format?: PdfOptions["format"];
    } = {
      landscape,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    };

    if (width && height) {
      pdfOptions.width = width;
      pdfOptions.height = height;
    } else {
      pdfOptions.format = format;
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Resource allow-list: inline data only
// ---------------------------------------------------------------------------

function isAllowedPdfResource(url: string): boolean {
  return url.startsWith("data:") || url === "about:blank";
}

function getR2PublicHost(): string | null {
  const raw = process.env.R2_PUBLIC_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Remote hosts a stored profile image may be fetched from (server side, before rendering). */
function isAllowedProfileImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".googleusercontent.com")) return true;
    const r2Host = getR2PublicHost();
    return r2Host !== null && host === r2Host;
  } catch {
    return false;
  }
}

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_FETCH_TIMEOUT_MS = 5_000;

/** Detects the image type from magic bytes; returns null for anything that is not a raster image. */
function sniffImageMime(buffer: Buffer): "image/png" | "image/jpeg" | "image/gif" | "image/webp" | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a") return "image/gif";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// ---------------------------------------------------------------------------
// Centralized Asset & HTML Framework
// ---------------------------------------------------------------------------

/**
 * Makes near-white pixels of a logo/stamp/signature transparent so the image
 * sits on coloured backgrounds. This used to be done by a script inside the
 * headless page; it now happens once per process, server side.
 */
async function whiteToTransparentPng(bytes: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels as 4 } })
    .png()
    .toBuffer();
}

type StandardAssets = { base64Logo: string; base64Signature: string; base64Stamp: string; base64Font: string };

let standardAssetsPromise: Promise<StandardAssets> | null = null;

async function readStandardAssets(): Promise<StandardAssets> {
  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";
  let base64Font = "";

  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", "indopak-nastaleeq.woff2");

    const toTransparent = async (file: string) => {
      const bytes = await fs.readFile(file).catch(() => null);
      if (!bytes) return "";
      const png = await whiteToTransparentPng(bytes).catch(() => bytes);
      return `data:image/png;base64,${png.toString("base64")}`;
    };

    const [logo, signature, stamp, fontBytes] = await Promise.all([
      toTransparent(ASSET_LOCAL_PATHS.logo),
      toTransparent(ASSET_LOCAL_PATHS.signature),
      toTransparent(ASSET_LOCAL_PATHS.stamp),
      fs.readFile(fontPath).catch(() => null),
    ]);

    base64Logo = logo;
    base64Signature = signature;
    base64Stamp = stamp;
    if (fontBytes) base64Font = `data:font/woff2;charset=utf-8;base64,${fontBytes.toString('base64')}`;
  } catch (e) {
    console.error("[pdf-generator] Could not load local standard assets:", e);
  }

  return { base64Logo, base64Signature, base64Stamp, base64Font };
}

/**
 * Loads the standard logo, signature, stamp (white backgrounds made
 * transparent) and the IndoPak font as base64 strings, once per process.
 */
export function loadStandardPdfAssets(): Promise<StandardAssets> {
  if (!standardAssetsPromise) {
    standardAssetsPromise = readStandardAssets().catch((error) => {
      standardAssetsPromise = null;
      throw error;
    });
  }
  return standardAssetsPromise;
}

/**
 * Normalizes a user profile image URL to a base64 string, handling Google upscaling
 * and local file reading automatically.
 */
export async function loadProfilePictureAsBase64(
  imageUrl: string | null | undefined,
  gender?: string | null,
): Promise<string> {
  const effectiveUrl =
    imageUrl ||
    (gender === "FEMALE" ? "/assets/female_icon.png" : "/assets/male_icon.png");

  if (!effectiveUrl) return "";

  try {
    if (effectiveUrl.startsWith("http")) {
      // Only fetch from hosts we store images on; user.image is user-controlled.
      if (!isAllowedProfileImageUrl(effectiveUrl)) {
        throw new Error("Profile image host is not allow-listed");
      }

      let upgradedUrl = effectiveUrl;
      if (upgradedUrl.includes("googleusercontent.com")) {
        upgradedUrl = upgradedUrl.replace(/=s\d+-c/g, "=s1000-c");
      }

      const res = await fetch(upgradedUrl, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(PROFILE_IMAGE_FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const declaredLength = Number(res.headers.get("content-length") || 0);
        if (declaredLength > MAX_PROFILE_IMAGE_BYTES) throw new Error("Profile image too large");
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > MAX_PROFILE_IMAGE_BYTES) throw new Error("Profile image too large");
        const mimeType = sniffImageMime(buffer);
        if (!mimeType) throw new Error("Profile image is not a supported raster image");
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    } else if (effectiveUrl.startsWith("/")) {
      // Only the two bundled avatar icons may be read from disk; never resolve
      // arbitrary paths (user.image could contain "../").
      let imgPath: string | null = null;
      if (effectiveUrl === "/assets/male_icon.png") {
        imgPath = ASSET_LOCAL_PATHS.maleIcon;
      } else if (effectiveUrl === "/assets/female_icon.png") {
        imgPath = ASSET_LOCAL_PATHS.femaleIcon;
      }
      if (!imgPath) {
        throw new Error("Local profile image path is not allow-listed");
      }
      const bytes = await fs.readFile(/* turbopackIgnore: true */ imgPath);
      const mimeType = sniffImageMime(bytes) ?? "image/png";
      return `data:${mimeType};base64,${bytes.toString('base64')}`;
    }
  } catch (e) {
    console.error("[pdf-generator] Could not load profile picture:", e);
    if (effectiveUrl !== "/assets/male_icon.png" && effectiveUrl !== "/assets/female_icon.png") {
      return loadProfilePictureAsBase64(
        gender === "FEMALE" ? "/assets/female_icon.png" : "/assets/male_icon.png"
      );
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Stylesheet (compiled at build time by scripts/build-pdf-css.sh)
// ---------------------------------------------------------------------------

const PDF_CSS_PATH = path.join(process.cwd(), "generated", "pdf.css");
let pdfCssPromise: Promise<string> | null = null;

function getPdfStylesheet(): Promise<string> {
  if (!pdfCssPromise) {
    pdfCssPromise = fs.readFile(PDF_CSS_PATH, "utf8").catch((error) => {
      pdfCssPromise = null;
      throw new Error(
        `[pdf-generator] generated/pdf.css is missing (${(error as Error).message}). Run "npm run build:pdf-css"; the build scripts do this automatically.`,
      );
    });
  }
  return pdfCssPromise;
}

/**
 * Standardized HTML wrapper: inlines the compiled Tailwind stylesheet, the
 * self-hosted fonts and the base styling, so the document renders with no
 * network access and no scripts.
 */
export async function wrapHtmlForPdf(
  bodyContent: string,
  options?: { base64Font?: string; landscape?: boolean }
) {
  const [stylesheet, fontFaces] = await Promise.all([getPdfStylesheet(), getPdfFontFaceCss()]);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${stylesheet}</style>
  <style>
    ${fontFaces}
    ${options?.base64Font ? `
    @font-face {
      font-family: 'IndoPak';
      src: url('${options.base64Font}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    ` : ""}
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
    }
    @page { margin: 0; ${options?.landscape ? "size: A4 landscape;" : ""} }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      ${options?.landscape ? "background: white !important; display: flex; justify-content: center; align-items: center; min-height: 100vh;" : ""}
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>
  `;
}
