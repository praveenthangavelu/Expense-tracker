/* eslint-disable no-restricted-globals */
const VERSION = "expenseflow-sw-v1";

const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = `${VERSION}-api`;

const OFFLINE_URL = "/offline.html";

// Injected by vite-plugin-pwa (injectManifest). Do not remove.
self.__WB_MANIFEST;

const APP_SHELL = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const isApiUrl = (url) =>
  url.pathname.startsWith("/api/transactions") || url.pathname.startsWith("/api/summary");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(APP_SHELL);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      );
      self.clients.claim();
    })(),
  );
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && (res.status === 200 || res.status === 0)) {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response(JSON.stringify({ offline: true }), { status: 200 });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: stale-while-revalidate for key endpoints
  if (isApiUrl(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Navigation: offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(req);
          return cached || (await cache.match(OFFLINE_URL));
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first, then network
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })(),
  );
});

