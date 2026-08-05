// ---------------- SERVICE WORKER (funzionamento offline) ----------------
// strategia "stale-while-revalidate": risponde SEMPRE dalla copia locale se
// c'e' (istantaneo, funziona anche senza rete), e in parallelo scarica la
// versione fresca da internet (se disponibile) per aggiornare la copia in
// vista della prossima apertura. Cosi' non serve tenere a mano un numero di
// versione della cache sincronizzato col resto dell'app: si autoaggiorna da
// sola ogni volta che si apre con connessione, senza mai bloccare l'apertura
// offline con una copia vecchia
const CACHE_NAME = 'logbook-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './css/style.css',
  './js/bootstrap.js',
  './js/error-boundary.js',
  './js/data.js',
  './js/state.js',
  './js/combobox.js',
  './js/records.js',
  './js/chart.js',
  './js/trends.js',
  './js/backup.js',
  './js/utils.js',
  './js/navigation.js',
  './js/days-modal.js',
  './js/exercise-card.js',
  './js/history.js',
  './js/calendar.js',
  './js/plate-calc.js',
  './js/exercise-library.js',
  './js/home.js',
  './js/achievements.js',
  './js/onboarding.js',
  './js/gsap.min.js',
  './js/animations.js',
  './js/app-init.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
