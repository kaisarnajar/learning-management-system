import { BRAND_CONFIG } from "@/config/brand";

// Rendered once at build time, so the service worker's names come from the brand config.
export const dynamic = "force-static";

// Keeps the cache name the static file used ("dqa-pwa-cache-v1"), so installed PWAs keep their cache.
const CACHE_NAME = `${BRAND_CONFIG.shortName.toLowerCase()}-pwa-cache-v1`;

const SERVICE_WORKER = `// Service Worker for ${BRAND_CONFIG.name} PWA
const CACHE_NAME = ${JSON.stringify(CACHE_NAME)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", "/manifest.webmanifest"]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Pass-through fetch to support chrome PWA installability requirements
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
`;

export function GET() {
  return new Response(SERVICE_WORKER, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Browsers re-check the worker script on every navigation; never let a CDN pin an old copy.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
