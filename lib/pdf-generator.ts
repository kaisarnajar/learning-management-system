import puppeteer from "puppeteer";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { getChromiumExecutablePath } from "@/lib/chromium";

export type PdfOptions = {
  format?: "A4" | "A3" | "Letter";
  landscape?: boolean;
};

/**
 * Generates a PDF from an HTML string using Puppeteer.
 * Returns the raw PDF as a Buffer that can be streamed or attached to an email.
 *
 * Automatically uses the lightweight chromium-min build on Vercel and the
 * locally installed Puppeteer binary in development.
 */
export async function generatePdfFromHtml(
  html: string,
  { format = "A4", landscape = false }: PdfOptions = {},
): Promise<Buffer> {
  let browser;

  if (process.env.VERCEL) {
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await getChromiumExecutablePath(),
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

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
