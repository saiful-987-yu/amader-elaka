/*
Service Worker — app-shell caching only.
Google Drive photos and Apps Script (backend) requests are deliberately never intercepted: caching them broke image loading in the past.
Bump CACHE_VERSION whenever any APP_SHELL file changes, otherwise visitors keep seeing the old files.
*/
const CACHE_VERSION = "v6";
const SHELL_CACHE = `amader-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/themes.css",
  "./css/style.css",
  "./css/responsive.css",
  "./css/pwa.css",
  "./config/config.js",
  "./js/utils.js",
  "./js/icons.js",
  "./js/language.js",
  "./js/theme.js",
  "./js/api.js",
  "./js/auth.js",
  "./js/search.js",
  "./js/app.js",
  "./js/pwa-install.js",
  "./js/clock.js",
  "./js/drivers.js",
  "./js/registration.js",
  "./js/profile.js",
  "./js/admin.js",
  "./assets/banner-images/banner-videos.js",
  "./assets/home-content/home-content.js",
  "./assets/brand/logo-low.png",
  "./assets/brand/favicon-32.png",
  "./assets/brand/favicon-16.png",
  "./assets/brand/apple-touch-icon.png",
  "./assets/brand/pwa-icon-192.png",
  "./assets/brand/pwa-icon-512.png",
  "./assets/icons/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(APP_SHELL.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.indexOf("amader-shell-") === 0 && key !== SHELL_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const INDEX_URL = new URL("./index.html", self.location).href;

function offlinePage() {
  const html = '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Amader Elaka</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F7F5;color:#1c2b24;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 16px;color:#4a5a52}button{background:#1F6E4A;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:16px}</style></head><body><div><h1>ইন্টারনেট সংযোগ নেই</h1><p>No internet connection. Please connect once and open the app again.</p><button onclick="location.reload()">আবার চেষ্টা করুন / Retry</button></div></body></html>';
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function isBackendRequest(url) {
  return url.hostname.includes("script.google.com") || url.hostname.includes("script.googleusercontent.com");
}

function isDrivePhotoRequest(url) {
  return url.hostname.includes("drive.google.com") || url.hostname.includes("lh3.googleusercontent.com");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (isBackendRequest(url) || isDrivePhotoRequest(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic" && !res.redirected) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(INDEX_URL, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.open(SHELL_CACHE)
          .then((cache) => cache.match(INDEX_URL, { ignoreSearch: true }))
          .then((cached) => cached || caches.match(INDEX_URL, { ignoreSearch: true }))
          .then((cached) => cached || offlinePage())
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
      })
    )
  );
});
