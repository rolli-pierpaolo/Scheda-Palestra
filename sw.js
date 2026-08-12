// ---------------- SERVICE WORKER (funzionamento offline) ----------------
// strategia "network-first": prova SEMPRE a scaricare la versione fresca da
// internet, e usa la copia in cache solo come riserva se non c'e' rete. Con
// l'app corretta spesso in queste settimane, la vecchia strategia
// "stale-while-revalidate" (rispondeva SEMPRE dalla cache, aggiornandola solo
// in background per la VOLTA DOPO) faceva vedere una versione dell'app
// vecchia di un giro intero ad ogni apertura - un fix appena pubblicato non
// si vedeva mai al primo riavvio, serviva riaprire una seconda volta perche'
// la cache si fosse aggiornata nel frattempo. BUG piu' subdolo di quanto
// sembri: con l'app che si ricarica da sola spesso (iOS in background),
// sembrava "il fix non funziona" quando in realta' il telefono stava ancora
// eseguendo il codice di prima. Offline resta comunque supportato: quando la
// rete manca, si ripiega sulla cache esattamente come prima
const CACHE_NAME = 'logbook-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './fonts/oswald.woff2',
  './fonts/ibm-plex-sans.woff2',
  './fonts/orbitron.woff2',
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
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// ---------------- NOTIFICHE PUSH ----------------
// il contenuto arriva dalla funzione schedulata lato Supabase (vedi
// supabase/push-reminder-function.ts): qui si mostra solo la notifica,
// nessuna logica su CHI/QUANDO avvisare vive nel service worker
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

// un tocco sulla notifica mette a fuoco una scheda dell'app gia' aperta se
// c'e', altrimenti ne apre una nuova, invece di aprirne sempre una in piu'
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
