const CACHE_NAME = "sprinter-ball-v16";
const FILES = [
  "./",
  "./index.html",
  "./src/styles.css?v=16",
  "./src/game.js?v=16",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./README.md"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
