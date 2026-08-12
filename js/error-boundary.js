// ---------------- ERROR BOUNDARY + AUTO-RIPARAZIONE CACHE ----------------
// Causa storica numero uno di "l'app sembra rotta / i dati sembrano spariti"
// in questa app: HTML e JS scaricati in momenti diversi (sw.js usa stale-
// while-revalidate) finiscono disallineati - il JS nuovo si aspetta un pezzo
// di HTML che la pagina vecchia in cache non ha ancora, e l'inizializzazione
// si ferma a meta' con un errore silenzioso (schermo bianco o dati che
// sembrano spariti, mentre in realta' sono ancora li' in localStorage,
// semplicemente mai disegnati). Questo file va caricato PER PRIMO in
// index.html, prima di ogni altro script, cosi' puo' intercettare errori
// anche durante il caricamento/esecuzione degli script successivi.

const SELF_HEAL_KEY = 'scheda_wo18_self_heal_attempted_v1';

function showReloadBanner(msg){
  if(document.getElementById('errBoundaryBanner')) return; // gia' mostrato, non impilarne un altro
  const el = document.createElement('div');
  el.id = 'errBoundaryBanner';
  el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));background:#B23D30;color:#fff;padding:12px 16px;border-radius:10px;font:700 13px -apple-system,BlinkMacSystemFont,sans-serif;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.5);text-align:center;cursor:pointer;';
  // stile inline (non da css/style.css): se il problema e' proprio un
  // caricamento incompleto/disallineato, il foglio di stile potrebbe essere
  // nella stessa situazione - questo banner deve funzionare comunque
  el.textContent = (msg || "Qualcosa e' andato storto") + ' — tocca per ricaricare';
  el.onclick = () => window.location.reload();
  if(document.body) document.body.appendChild(el);
}

window.addEventListener('error', function(){
  showReloadBanner("Qualcosa e' andato storto");
});
window.addEventListener('unhandledrejection', function(){
  showReloadBanner("Qualcosa e' andato storto");
});

// usata SOLO per un errore durante l'inizializzazione vera e propria (vedi
// fondo di app-init.js): se scatta, prova UNA volta sola a pulire le cache
// del service worker e ricaricare da zero (il sospetto principale essendo
// proprio un disallineamento di cache), prima di arrendersi e mostrare il
// banner manuale - la guardia su sessionStorage evita un loop di ricarichi
// infiniti se il problema non e' davvero un disallineamento di cache ma un
// bug vero, che dopo il reload capiterebbe di nuovo identico
async function attemptSelfHealOrShowBanner(){
  let alreadyTried = false;
  try{ alreadyTried = sessionStorage.getItem(SELF_HEAL_KEY) === '1'; }catch(e){}
  if(alreadyTried){
    showReloadBanner('Non riesco ad avviarmi correttamente');
    return;
  }
  try{ sessionStorage.setItem(SELF_HEAL_KEY, '1'); }catch(e){}
  try{
    if('caches' in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  }catch(e){}
  window.location.reload();
}
