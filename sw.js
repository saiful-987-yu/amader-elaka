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
  "./js/drivers.js",
  "./js/registration.js",
  "./js/profile.js",
  "./js/admin.js",
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
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

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
      fetch(req).catch(() => caches.match("./index.html"))
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
