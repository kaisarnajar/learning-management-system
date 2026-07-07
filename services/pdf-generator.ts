import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getChromiumExecutablePath } from "@/utils/chromium";
import fs from "fs/promises";
import path from "path";
import { ASSET_LOCAL_PATHS } from "@/config/assets";
import { PROCESS_IMAGE_SCRIPT } from "@/utils/html-scripts";

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
 * Automatically uses the lightweight chromium-min build on Vercel and the
 * locally installed Puppeteer binary in development.
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
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 3 });

    await page.setContent(html, { waitUntil: "load" });

    // Wait for the Tailwind CDN script + any Google Fonts to fetch and apply
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});

    // Wait for the image processing script to finish
    await page.waitForFunction('window.__imagesProcessed === true', { timeout: 2000 }).catch(() => {});

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
// Centralized Asset & HTML Framework
// ---------------------------------------------------------------------------

/**
 * Loads the standard logo, signature, stamp, and custom font as base64 strings.
 * Centralizes the boilerplate used across all 5 PDF generators.
 */
export async function loadStandardPdfAssets() {
  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";
  let base64Font = "";
  
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", "indopak-nastaleeq.woff2");
    
    const [logoBytes, sigBytes, stampBytes, fontBytes] = await Promise.all([
      fs.readFile(ASSET_LOCAL_PATHS.logo).catch(() => null),
      fs.readFile(ASSET_LOCAL_PATHS.signature).catch(() => null),
      fs.readFile(ASSET_LOCAL_PATHS.stamp).catch(() => null),
      fs.readFile(fontPath).catch(() => null),
    ]);
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString('base64')}`;
    if (fontBytes) base64Font = `data:font/woff2;charset=utf-8;base64,${fontBytes.toString('base64')}`;
  } catch (e) {
    console.error("[pdf-generator] Could not load local standard assets:", e);
  }

  return { base64Logo, base64Signature, base64Stamp, base64Font };
}

/**
 * Normalizes a user profile image URL to a base64 string, handling Google upscaling
 * and local file reading automatically.
 */
export async function loadProfilePictureAsBase64(imageUrl: string | null | undefined): Promise<string> {
  if (!imageUrl) return "";

  try {
    if (imageUrl.startsWith("http")) {
      let upgradedUrl = imageUrl;
      if (upgradedUrl.includes("googleusercontent.com")) {
        upgradedUrl = upgradedUrl.replace(/=s\d+-c/g, "=s1000-c");
      }
      
      const res = await fetch(upgradedUrl, { cache: "no-store" });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
      }
    } else if (imageUrl.startsWith("/")) {
      const imgPath = path.join(process.cwd(), "public", imageUrl);
      const bytes = await fs.readFile(imgPath);
      const ext = path.extname(imgPath).substring(1) || "jpeg";
      return `data:image/${ext};base64,${bytes.toString('base64')}`;
    }
  } catch (e) {
    console.error("[pdf-generator] Could not load profile picture:", e);
  }
  return "";
}

/**
 * Standardized HTML wrapper that injects Tailwind, fonts, and base styling.
 */
export function wrapHtmlForPdf(
  bodyContent: string, 
  options?: { base64Font?: string; landscape?: boolean }
) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              primary: '#0f3d2e',
              'primary-light': '#1a4d2e',
              gold: '#d4af37',
            },
            surface: {
              cream: '#fdfaf3',
            },
            gold: {
              DEFAULT: '#d4a017',
              light: '#f0c14a',
              dark: '#b8860b'
            },
            teal: {
              DEFAULT: '#0d4a4a',
              dark: '#083333'
            }
          },
          spacing: {
            'pdf-id-width': '1011px',
            'pdf-id-height': '638px',
            'pdf-cert-width': '1123px',
            'pdf-cert-height': '794px',
            'pdf-label-w': '180px',
            'pdf-photo-w': '230px',
            'pdf-photo-h': '270px',
          },
          borderWidth: {
            'pdf-hairline': '1.5px',
            'pdf-xs': '3px',
            'pdf-sm': '4px',
            'pdf-md': '6px',
            'pdf-lg': '8px',
            'pdf-xl': '12px',
            'pdf-thick': '10px',
          },
          borderRadius: {
            'pdf-lg': '36px',
          },
          fontSize: {
            'pdf-7': '7px',
            'pdf-9': '9px',
            'pdf-10': '10px',
            'pdf-11': '11px',
            'pdf-16': '16px',
            'pdf-17': '17px',
            'pdf-20': '20px',
            'pdf-22': '22px',
            'pdf-26': '26px',
            'pdf-28': '28px',
            'pdf-34': '34px',
            'pdf-38': '38px',
            'pdf-44': '44px',
            'pdf-46': '46px',
            'pdf-56': '56px',
            'pdf-72': '72px',
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
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
    ${options?.landscape ? "@page { size: A4 landscape; margin: 0; }" : ""}
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
  <script>
    ${PROCESS_IMAGE_SCRIPT}
  </script>
</body>
</html>
  `;
}
