import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getChromiumExecutablePath } from "@/lib/chromium";

export type PdfOptions = {
  format?: "A4" | "A3" | "Letter";
  landscape?: boolean;
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
    } catch (err: any) {
      const isRetryable = err?.code === "ETXTBSY" || err?.message?.includes("ETXTBSY");
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
  { format = "A4", landscape = false, startDelayMs = 0 }: PdfOptions = {},
): Promise<Buffer> {
  if (startDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, startDelayMs));
  }

  const browser = await launchBrowserWithRetry();

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "load" });

    // Wait for the Tailwind CDN script + any Google Fonts to fetch and apply
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});

    const pdfBuffer = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
