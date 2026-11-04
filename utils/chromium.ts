import chromium from "@sparticuz/chromium-min";

/**
 * The Chromium "pack" that @sparticuz/chromium-min downloads on first use
 * must match the installed package major (149 today), otherwise the binary
 * and the package's launch arguments disagree. CHROMIUM_PACK_URL lets the
 * academy host the pack in its own R2 bucket (recommended: GitHub release
 * assets are rate limited and can disappear); it defaults to the matching
 * release asset.
 */
export const DEFAULT_CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

function getChromiumPackUrl(): string {
  const configured = process.env.CHROMIUM_PACK_URL?.trim();
  return configured || DEFAULT_CHROMIUM_PACK_URL;
}

let cachedPath: string | null = null;
let downloadPromise: Promise<string> | null = null;

export async function getChromiumExecutablePath(): Promise<string> {
  if (cachedPath) return cachedPath;

  if (!downloadPromise) {
    downloadPromise = chromium
      .executablePath(getChromiumPackUrl())
      .then((path) => {
        cachedPath = path;
        return path;
      })
      .catch((error) => {
        downloadPromise = null;
        throw error;
      });
  }

  return downloadPromise;
}
