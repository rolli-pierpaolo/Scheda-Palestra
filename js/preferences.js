// ---------------- PREFERENZE DI ACCESSIBILITÀ ----------------
// Preferenze solo di interfaccia: non entrano nella scheda o nel backup,
// quindi ogni persona può usare testo/contrasto/movimento adatti a sé senza
// cambiare gli allenamenti condivisi con coach o altri dispositivi.
const ACCESSIBILITY_PREFS_KEY = 'scheda_wo18_accessibility_v1';
let accessibilityPrefs = { largeText:false, highContrast:false, reduceMotion:false, vibration:true };
// Il tema è una preferenza del singolo dispositivo, come accessibilità: non
// entra mai nella scheda né nel backup e quindi non cambia l'aspetto scelto
// da un coach o da un altro telefono.
const THEME_PREF_KEY = 'scheda_wo18_theme_v1';
let themePreference = 'dark';

function loadAccessibilityPrefs(){
  try{
    const saved = JSON.parse(localStorage.getItem(ACCESSIBILITY_PREFS_KEY) || '{}');
    accessibilityPrefs = Object.assign(accessibilityPrefs, saved || {});
  }catch(e){}
  applyAccessibilityPrefs();
  loadThemePreference();
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

function loadThemePreference(){
  try{
    const saved = localStorage.getItem(THEME_PREF_KEY);
    themePreference = saved === 'light' ? 'light' : 'dark';
  }catch(e){ themePreference = 'dark'; }
  applyThemePreference();
}
function applyThemePreference(){
  const isLight = themePreference === 'light';
  document.body.classList.toggle('theme-light', isLight);
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if(scheme) scheme.setAttribute('content', isLight ? 'light dark' : 'dark');
  // Prima che Navigation sia disponibile all'avvio aggiorniamo comunque il
  // colore del browser; dopo l'avvio updateThemeColor lo rifinirà in base
  // alla schermata aperta.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta && typeof updateThemeColor !== 'function') themeMeta.setAttribute('content', isLight ? '#F4F6F1' : '#0D0D0D');
  if(typeof updateThemeColor === 'function') updateThemeColor();
}
function setThemePreference(value){
  themePreference = value === 'light' ? 'light' : 'dark';
  try{ localStorage.setItem(THEME_PREF_KEY, themePreference); }catch(e){}
  applyThemePreference();
  renderAppearanceSettings();
}
function renderAppearanceSettings(){
  const el = document.getElementById('appearanceSettings');
  if(!el) return;
  const isLight = themePreference === 'light';
  el.innerHTML = `
    <label class="theme-setting-row">
      <span><b>Tema chiaro</b><small>Superfici luminose e contrasto calibrato per allenarti anche all'aperto.</small></span>
      <input type="checkbox" ${isLight ? 'checked' : ''} onchange="setThemePreference(this.checked ? 'light' : 'dark')" aria-label="Tema chiaro">
    </label>`;
}
function prefersReducedMotion(){
  return !!accessibilityPrefs.reduceMotion || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
