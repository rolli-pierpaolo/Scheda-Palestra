// ---------------- PREFERENZE DI ACCESSIBILITÀ ----------------
// Preferenze solo di interfaccia: non entrano nella scheda o nel backup,
// quindi ogni persona può usare testo/contrasto/movimento adatti a sé senza
// cambiare gli allenamenti condivisi con coach o altri dispositivi.
const ACCESSIBILITY_PREFS_KEY = 'scheda_wo18_accessibility_v1';
let accessibilityPrefs = { largeText:false, highContrast:false, reduceMotion:false, vibration:true };

function loadAccessibilityPrefs(){
  try{
    const saved = JSON.parse(localStorage.getItem(ACCESSIBILITY_PREFS_KEY) || '{}');
    accessibilityPrefs = Object.assign(accessibilityPrefs, saved || {});
  }catch(e){}
  applyAccessibilityPrefs();
}
function applyAccessibilityPrefs(){
  const body = document.body;
  if(!body) return;
  body.classList.toggle('a11y-large-text', !!accessibilityPrefs.largeText);
  body.classList.toggle('a11y-high-contrast', !!accessibilityPrefs.highContrast);
  body.classList.toggle('a11y-reduce-motion', !!accessibilityPrefs.reduceMotion);
}
function setAccessibilityPref(key, value){
  if(!(key in accessibilityPrefs)) return;
  accessibilityPrefs[key] = !!value;
  try{ localStorage.setItem(ACCESSIBILITY_PREFS_KEY, JSON.stringify(accessibilityPrefs)); }catch(e){}
  applyAccessibilityPrefs();
  renderAccessibilitySettings();
}
function renderAccessibilitySettings(){
  const el = document.getElementById('accessibilitySettings');
  if(!el) return;
  const rows = [
    ['largeText', 'Testo più grande', 'Rende più leggibili pulsanti, campi e informazioni principali.'],
    ['highContrast', 'Contrasto alto', 'Aumenta la differenza tra testi, sfondi e bordi.'],
    ['reduceMotion', 'Riduci animazioni', 'Evita movimenti e celebrazioni non necessari.'],
    ['vibration', 'Vibrazione', 'Feedback tattile quando completi azioni importanti.']
  ];
  el.innerHTML = rows.map(([key, title, detail]) => `
    <label class="a11y-setting-row">
      <span><b>${title}</b><small>${detail}</small></span>
      <input type="checkbox" ${accessibilityPrefs[key] ? 'checked' : ''} onchange="setAccessibilityPref('${key}', this.checked)" aria-label="${title}">
    </label>`).join('');
}
function prefersReducedMotion(){
  return !!accessibilityPrefs.reduceMotion || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
