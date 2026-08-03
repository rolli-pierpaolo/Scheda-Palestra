// ---------------- OBIETTIVI (traguardi nascosti, stile "a sorpresa") ----------------
// una lista fissa di traguardi, dai piu' semplici ai piu' complessi: finche' non
// vengono raggiunti restano "oscurati" nella modale (si vede solo un lucchetto
// e "???"), cosi' la sorpresa di scoprirli resta intatta. checkAchievements()
// viene richiamata dopo ogni azione rilevante (fine allenamento, nuovo record,
// nuovo blocco, superset creato, esercizio aggiunto alla libreria...) e valuta
// tutte le condizioni: quelle vere per la prima volta si sbloccano e vengono
// mostrate subito (toast in-app, sempre; notifica di sistema solo se attivata,
// vedi toggleAchievNotifications)
const ACHIEVEMENTS_KEY = "scheda_wo18_achievements_v1";
const ACHIEV_NOTIF_KEY = "scheda_wo18_achiev_notifications_v1";
const ACHIEV_COUNTERS_KEY = "scheda_wo18_achiev_counters_v1";
let unlockedAchievements = {}; // {id: dataKey sblocco}
let achievNotificationsEnabled = false;
let achievCounters = { prCount:0, linkCount:0 };

function loadAchievements(){
  try{
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if(raw) unlockedAchievements = JSON.parse(raw);
  }catch(e){ unlockedAchievements = {}; }
  try{
    achievNotificationsEnabled = localStorage.getItem(ACHIEV_NOTIF_KEY) === '1';
  }catch(e){ achievNotificationsEnabled = false; }
  try{
    const rawc = localStorage.getItem(ACHIEV_COUNTERS_KEY);
    if(rawc) achievCounters = Object.assign({prCount:0,linkCount:0}, JSON.parse(rawc));
  }catch(e){ achievCounters = {prCount:0,linkCount:0}; }
}
function saveAchievements(){ localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedAchievements)); }
function saveAchievNotifications(){ localStorage.setItem(ACHIEV_NOTIF_KEY, achievNotificationsEnabled ? '1' : '0'); }
function saveAchievCounters(){ localStorage.setItem(ACHIEV_COUNTERS_KEY, JSON.stringify(achievCounters)); }
function bumpAchievCounter(name){
  achievCounters[name] = (achievCounters[name]||0) + 1;
  saveAchievCounters();
}

function totalWorkoutsLogged(){
  let n = 0;
  Object.keys(calendarLog).forEach(k=>{ n += (calendarLog[k]||[]).length; });
  return n;
}
function maxWeightEverLifted(){
  let max = 0;
  const scan = day => (day.esercizi||[]).forEach(ex=>{
    (ex.sets||[]).forEach(ws=>(ws||[]).forEach(s=>{
      const p = parseFloat(String(s.peso).replace(',','.'));
      if(!isNaN(p) && p>max) max = p;
    }));
  });
  (state.days||[]).forEach(scan);
  const storico = getStorico();
  Object.keys(storico).forEach(t=>(storico[t]||[]).forEach(scan));
  return max;
}
// scarto in giorni tra gli ultimi due allenamenti registrati (0 se non c'e'
// abbastanza storico): usato per rilevare un "ritorno" dopo una pausa lunga
function daysSinceLastGap(){
const startKey = state.programStartDate || mostRecentMondayKey();

const dates = Object.keys(calendarLog)
  .filter(k =>
    k >= startKey &&
    calendarLog[k] &&
    calendarLog[k].length
  )
  .sort();
  if(dates.length<2) return 0;
  const last = new Date(dates[dates.length-1]+'T00:00:00');
  const prev = new Date(dates[dates.length-2]+'T00:00:00');
  return Math.round((last-prev)/86400000);
}
function anyWeekSkippedInActiveState(){
  return (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekSkipped||[]).some(Boolean)));
}

const ACHIEVEMENTS = [
  { id:'primo_allenamento', icon:'🎬', title:'Si comincia!', desc:'Hai registrato il tuo primo allenamento.', check: () => totalWorkoutsLogged() >= 1 },
  { id:'prima_settimana', icon:'✅', title:'Prima tacca', desc:'Hai segnato la tua prima settimana come completata.', check: () => (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekDone||[]).some(Boolean))) },
  { id:'dieci_allenamenti', icon:'🔟', title:'In doppia cifra', desc:'10 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 10 },
  { id:'cinquanta_allenamenti', icon:'🥉', title:'Costanza di ferro', desc:'50 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 50 },
  { id:'cento_allenamenti', icon:'🥇', title:'Veterano', desc:'100 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 100 },
  { id:'primo_record', icon:'🏆', title:'Primo record', desc:'Hai battuto il tuo primo record personale.', check: () => achievCounters.prCount >= 1 },
  { id:'dieci_record', icon:'🏆', title:'Cacciatore di record', desc:'Hai battuto 10 record personali in totale.', check: () => achievCounters.prCount >= 10 },
  { id:'tre_cifre', icon:'💪', title:'Tre cifre', desc:'Hai sollevato almeno 100kg in un esercizio.', check: () => maxWeightEverLifted() >= 100 },
  { id:'settimana_completa', icon:'🗓️', title:'Settimana completa', desc:'Hai fatto tutti i giorni della tua scheda in una sola settimana.', check: () => { const p = computeWeeklyProgress(); return p.total>1 && p.done>=p.total; } },
  { id:'super_set', icon:'🔗', title:'Combo esercizi', desc:'Hai collegato due esercizi in un super set o jump set.', check: () => achievCounters.linkCount >= 1 },
  { id:'collezionista', icon:'📚', title:'Collezionista', desc:'Hai aggiunto un esercizio nuovo alla libreria.', check: () => (extraLists.esercizi||[]).length >= 1 },
  { id:'blocco_completato', icon:'📦', title:'Blocco completato', desc:'Hai archiviato un blocco di allenamento e ne hai iniziato uno nuovo.', check: () => Object.keys(getStorico()).length >= 1 },
  { id:'zero_saltate', icon:'💯', title:'Nessuna scusa', desc:'Hai completato un blocco senza saltare nessuna settimana.', check: () => { const has = (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekDone||[]).some(Boolean))); return has && !anyWeekSkippedInActiveState(); } },
  { id:'bentornato', icon:'🔄', title:'Bentornato', desc:"Sei tornato ad allenarti dopo una pausa di almeno 10 giorni.", check: () => daysSinceLastGap() >= 10 },
];

// idempotente: si puo' chiamare quante volte si vuole, sblocca solo cio' che
// non era gia' sbloccato e mostra solo l'ultimo traguardo nuovo trovato in
// questa chiamata (nel raro caso in cui piu' condizioni diventino vere insieme)
function checkAchievements(){
  let newlyUnlocked = null;
  ACHIEVEMENTS.forEach(a=>{
    if(unlockedAchievements[a.id]) return;
    let ok = false;
    try{ ok = !!a.check(); }catch(e){ ok = false; }
    if(ok){
      unlockedAchievements[a.id] = todayKey();
      newlyUnlocked = a;
    }
  });
  if(newlyUnlocked){
    saveAchievements();
    revealAchievement(newlyUnlocked);
  }
}
function revealAchievement(a){
  let el = document.getElementById('achievToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'achievToast';
    el.className = 'achiev-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="achiev-toast-icon">${a.icon}</div><div class="achiev-toast-text"><div class="achiev-toast-label">Obiettivo sbloccato!</div><div class="achiev-toast-name">${escapeHtml(a.title)}</div></div>`;
  el.classList.add('show');
  vibrate([30,40,30,40,90]);
  clearTimeout(window._achievToastTimer);
  window._achievToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 3200);
  if(achievNotificationsEnabled && typeof Notification!=='undefined' && Notification.permission==='granted' && 'serviceWorker' in navigator){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification('🎯 Obiettivo sbloccato: '+a.title, { body:a.desc, icon:'logo.png', tag:'achiev-'+a.id });
    }).catch(()=>{});
  }
}
// richiede il permesso per le notifiche di sistema SOLO quando l'utente attiva
// l'interruttore: senza permesso concesso, il traguardo si sblocca comunque e
// si vede nel toast/nella modale, semplicemente non arriva la notifica di sistema
async function toggleAchievNotifications(){
  if(achievNotificationsEnabled){
    achievNotificationsEnabled = false;
    saveAchievNotifications();
    renderAchievNotifToggle();
    return;
  }
  if(typeof Notification==='undefined'){
    alert('Il tuo browser non supporta le notifiche.');
    return;
  }
  const perm = await Notification.requestPermission();
  if(perm !== 'granted'){
    alert('Permesso negato: per attivarle serve consentire le notifiche per questa app dalle impostazioni del browser/telefono.');
    return;
  }
  achievNotificationsEnabled = true;
  saveAchievNotifications();
  renderAchievNotifToggle();
}
function renderAchievNotifToggle(){
  const btn = document.getElementById('achievNotifToggleBtn');
  if(btn) btn.innerHTML = achievNotificationsEnabled ? (ICON_BELL+' Notifiche obiettivi: ON') : (ICON_BELL_OFF+' Notifiche obiettivi: OFF');
}
function openAchievements(){
  const body = document.getElementById('achievBody');
  body.innerHTML = ACHIEVEMENTS.map(a=>{
    const unlocked = unlockedAchievements[a.id];
    if(unlocked){
      return `<div class="achiev-row unlocked"><div class="achiev-icon">${a.icon}</div><div class="achiev-info"><div class="achiev-title">${escapeHtml(a.title)}</div><div class="achiev-desc">${escapeHtml(a.desc)}</div></div></div>`;
    }
    return `<div class="achiev-row locked"><div class="achiev-icon">🔒</div><div class="achiev-info"><div class="achiev-title">???</div><div class="achiev-desc">Obiettivo ancora da scoprire</div></div></div>`;
  }).join('');
  const count = Object.keys(unlockedAchievements).length;
  document.getElementById('achievCount').textContent = `${count}/${ACHIEVEMENTS.length} sbloccati`;
  renderAchievNotifToggle();
  document.getElementById('achievModal').style.display = 'flex';
}
function closeAchievements(){
  document.getElementById('achievModal').style.display = 'none';
}
