const INSTALL_BANNER_DISMISS_KEY = 'scheda_wo18_install_banner_dismissed_v1';
const INSTALL_BANNER_RESHOW_DAYS = 14;

function isIosSafariNotInstalled(){
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true;
  return isIOS && !isStandalone;
}
function shouldShowInstallBanner(){
  if(!isIosSafariNotInstalled()) return false;
  let dismissedAt = 0;
  try{ dismissedAt = parseInt(localStorage.getItem(INSTALL_BANNER_DISMISS_KEY), 10) || 0; }catch(e){}
  if(!dismissedAt) return true;
  return (Date.now() - dismissedAt) > INSTALL_BANNER_RESHOW_DAYS*24*60*60*1000;
}
function dismissInstallBanner(){
  const el = document.getElementById('installBanner');
  if(el) el.remove();
  try{ localStorage.setItem(INSTALL_BANNER_DISMISS_KEY, String(Date.now())); }catch(e){}
}
function maybeShowInstallBanner(){
  if(!shouldShowInstallBanner()) return;
  const el = document.createElement('div');
  el.id = 'installBanner';
  el.className = 'install-banner';
  el.innerHTML = `
    <button class="install-banner-close" onclick="dismissInstallBanner()" aria-label="Chiudi">✕</button>
    <div class="install-banner-text">${ICON_SHARE} Installa Viridis: tocca <b>Condividi</b> qui sotto, poi <b>"Aggiungi alla schermata Home"</b></div>
  `;
  document.body.appendChild(el);
}
