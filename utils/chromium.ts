import chromium from "@sparticuz/chromium-min";

let cachedPath: string | null = null;
let downloadPromise: Promise<string> | null = null;

export async function getChromiumExecutablePath(): Promise<string> {
  if (cachedPath) return cachedPath;

  if (!downloadPromise) {
    downloadPromise = chromium
      .executablePath("https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar")
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
