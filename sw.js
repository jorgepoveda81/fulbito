// Service worker de FULBITO: cachea el "cascaron" de la app (HTML/CSS/JS/icono
// propios) para que abra sin conexion despues de la primera visita. No toca
// Firebase (auth/firestore/CDN): esos pedidos van directo a la red, si no hay
// conexion simplemente el juego sigue en modo local como ya hace sin Firebase.
const CACHE_NAME = 'fulbito-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/app-ui.css',
  './js/rules-core.js',
  './js/game.js',
  './js/app.js',
  './js/firebase-init.js',
  './js/auth.js',
  './js/auth-ui.js',
  './js/player-repo.js',
  './js/store-data.js',
  './js/player-creator.js',
  './js/menu-ui.js',
  './js/team-ui.js',
  './js/store-ui.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // deja pasar Firebase/CDN tal cual

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached); // sin conexion: lo que haya en cache (o nada, si nunca se guardo)
      return cached || network;
    })
  );
});
