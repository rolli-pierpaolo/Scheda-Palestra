
const SELF_HEAL_KEY = 'scheda_wo18_self_heal_attempted_v1';

function showReloadBanner(msg){
  if(document.getElementById('errBoundaryBanner')) return;
  const el = document.createElement('div');
  el.id = 'errBoundaryBanner';
  el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));background:#B23D30;color:#fff;padding:12px 16px;border-radius:10px;font:700 13px -apple-system,BlinkMacSystemFont,sans-serif;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.5);text-align:center;cursor:pointer;';
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
