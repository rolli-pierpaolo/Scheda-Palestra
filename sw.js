// Prova la rete e usa la cache se il dispositivo e offline.

const CACHE_NAME = 'logbook-cache-v123';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './viridis-logo-transparent.png',
  './fonts/oswald.woff2',
  './fonts/ibm-plex-sans.woff2',
  './fonts/orbitron.woff2',
  './css/style.css',
  './js/bootstrap.js',
  './js/error-boundary.js',
  './js/dialogs.js',
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
  './js/load-reminders.js',
  './js/workout-tools.js',
  './js/history.js',
  './js/exercise-history.js',
  './js/search.js',
  './js/calendar.js',
  './js/plate-calc.js',
  './js/exercise-library.js',
  './js/home.js',
  './js/achievements.js',
  './js/onboarding.js',
  './js/gsap.min.js',
  './js/liquid-metal.js',
  './js/animations.js',
  './js/accessibility.js',
  './js/install-prompt.js',
  './js/supabase.min.js',
  './js/sync.js',
  './js/auth.js',
  './js/sharing.js',
  './js/push.js',
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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        // Attende la scrittura in cache prima di consentire la sospensione del worker.

        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}));
      }
      return response;
    // Offline usa la risorsa in cache senza il parametro di revisione.

    }).catch(() => caches.match(event.request, {ignoreSearch:true}))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Viridis', body: 'Non ti alleni da un po\' - torna a farti sotto!' };
  if(event.data){
    try{ data = Object.assign(data, event.data.json()); }catch(e){}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'logbook-reminder'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.registration.scope));
      if(existing) return existing.focus();
      return self.clients.openWindow('./');
    })
  );
});
