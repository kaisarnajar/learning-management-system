/**
 * Puppeteer's install step downloads Chrome for local PDF rendering. Vercel
 * renders with @sparticuz/chromium-min through puppeteer-core instead, so the
 * download is skipped there (Vercel installs devDependencies for the build).
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  skipDownload: Boolean(process.env.VERCEL),
};
