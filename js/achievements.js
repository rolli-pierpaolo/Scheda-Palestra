// ---------------- OBIETTIVI (traguardi nascosti, stile "a sorpresa") ----------------
// una lista fissa di traguardi, dai più semplici ai più complessi: finché non
// vengono raggiunti restano oscurati nella modale, si vede solo un lucchetto
// e tre punti interrogativi, così la sorpresa di scoprirli resta intatta.
// checkAchievements() viene richiamata dopo ogni azione rilevante, fine
// allenamento, nuovo record, nuovo blocco, superset creato, esercizio
// aggiunto alla libreria, e valuta tutte le condizioni: quelle vere per la
// prima volta si sbloccano e vengono mostrate subito, un festeggiamento
// sempre in app, una notifica di sistema solo se attivata, vedi
// toggleAchievNotifications
const ACHIEVEMENTS_KEY = "scheda_wo18_achievements_v1";
const ACHIEV_NOTIF_KEY = "scheda_wo18_achiev_notifications_v1";
const ACHIEV_COUNTERS_KEY = "scheda_wo18_achiev_counters_v1";
let unlockedAchievements = {}; // {id: data chiave dello sblocco}
let achievNotificationsEnabled = false;
let achievCounters = { prCount:0, linkCount:0 };

// carica dagli obiettivi sbloccati, le preferenze di notifica e i contatori
// salvati su localStorage
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
// incrementa di uno un contatore usato dalle condizioni degli obiettivi,
// per esempio quante volte hai battuto un record
function bumpAchievCounter(name){
  achievCounters[name] = (achievCounters[name]||0) + 1;
  saveAchievCounters();
}

// conta quanti allenamenti risultano registrati in totale nel calendario
function totalWorkoutsLogged(){
  let n = 0;
  Object.keys(calendarLog).forEach(k=>{ n += (calendarLog[k]||[]).length; });
  return n;
}
// trova il peso più alto mai sollevato in assoluto, in qualunque esercizio,
// sia nel blocco attivo che nello storico
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
// scarto in giorni tra gli ultimi due allenamenti registrati, zero se non
// c'è abbastanza storico: usato per rilevare un ritorno dopo una pausa lunga
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
// dice se nel blocco attivo esiste almeno una settimana segnata come saltata
function anyWeekSkippedInActiveState(){
  return (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekSkipped||[]).some(Boolean)));
}

// l'elenco vero e proprio degli obiettivi: ognuno ha un'icona, un titolo,
// una descrizione, e una funzione check() che dice se è stato raggiunto
const ACHIEVEMENTS = [
  { id:'primo_allenamento', icon:ICON_FLAG, title:'Si comincia!', desc:'Hai registrato il tuo primo allenamento.', check: () => totalWorkoutsLogged() >= 1 },
  { id:'prima_settimana', icon:ICON_CHECK, title:'Prima tacca', desc:'Hai segnato la tua prima settimana come completata.', check: () => (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekDone||[]).some(Boolean))) },
  { id:'dieci_allenamenti', icon:ICON_STAR, title:'In doppia cifra', desc:'10 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 10 },
  { id:'cinquanta_allenamenti', icon:ICON_TROPHY, title:'Costanza di ferro', desc:'50 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 50 },
  { id:'cento_allenamenti', icon:ICON_TROPHY, title:'Veterano', desc:'100 allenamenti registrati in totale.', check: () => totalWorkoutsLogged() >= 100 },
  { id:'primo_record', icon:ICON_TROPHY, title:'Primo record', desc:'Hai battuto il tuo primo record personale.', check: () => achievCounters.prCount >= 1 },
  { id:'dieci_record', icon:ICON_TROPHY, title:'Cacciatore di record', desc:'Hai battuto 10 record personali in totale.', check: () => achievCounters.prCount >= 10 },
  { id:'tre_cifre', icon:ICON_PLATE, title:'Tre cifre', desc:'Hai sollevato almeno 100kg in un esercizio.', check: () => maxWeightEverLifted() >= 100 },
  { id:'settimana_completa', icon:ICON_CALENDAR, title:'Settimana completa', desc:'Hai fatto tutti i giorni della tua scheda in una sola settimana.', check: () => { const p = computeWeeklyProgress(); return p.total>1 && p.done>=p.total; } },
  { id:'super_set', icon:ICON_LINK, title:'Combo esercizi', desc:'Hai collegato due esercizi in un super set o jump set.', check: () => achievCounters.linkCount >= 1 },
  { id:'collezionista', icon:ICON_BOOK, title:'Collezionista', desc:'Hai aggiunto un esercizio nuovo alla libreria.', check: () => (extraLists.esercizi||[]).length >= 1 },
  { id:'blocco_completato', icon:ICON_ARCHIVE, title:'Blocco completato', desc:'Hai archiviato un blocco di allenamento e ne hai iniziato uno nuovo.', check: () => Object.keys(getStorico()).length >= 1 },
  { id:'zero_saltate', icon:ICON_TARGET, title:'Nessuna scusa', desc:'Hai completato un blocco senza saltare nessuna settimana.', check: () => { const has = (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>(ex.weekDone||[]).some(Boolean))); return has && !anyWeekSkippedInActiveState(); } },
  { id:'bentornato', icon:ICON_CYCLE, title:'Bentornato', desc:"Sei tornato ad allenarti dopo una pausa di almeno 10 giorni.", check: () => daysSinceLastGap() >= 10 },
];

// controlla tutti gli obiettivi non ancora sbloccati e sblocca quelli
// raggiunti. Idempotente: si può chiamare quante volte si vuole, sblocca solo
// ciò che non era già sbloccato e mostra solo l'ultimo traguardo nuovo trovato
// in questa chiamata, nel raro caso in cui più condizioni diventino vere insieme
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
// mostra il festeggiamento per un obiettivo appena sbloccato, e se attivate
// manda anche una notifica di sistema
function revealAchievement(a){
  showCelebration({
    icon: a.icon,
    label: 'Obiettivo sbloccato',
    title: a.title,
    subtitle: a.desc || '',
    accent: 'amber',
    vibrate: [30,40,30,40,90],
    duration: 3200
  });
  if(achievNotificationsEnabled && typeof Notification!=='undefined' && Notification.permission==='granted' && 'serviceWorker' in navigator){
    navigator.serviceWorker.ready.then(reg=>{
      reg.showNotification('🎯 Obiettivo sbloccato: '+a.title, { body:a.desc, icon:'icon-192.png', tag:'achiev-'+a.id });
    }).catch(()=>{});
  }
}
// richiede il permesso per le notifiche di sistema solo quando l'utente attiva
// l'interruttore: senza permesso concesso, il traguardo si sblocca comunque e
// si vede nel festeggiamento e nella modale, semplicemente non arriva la
// notifica di sistema
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
// aggiorna il testo del bottone per attivare o disattivare le notifiche
function renderAchievNotifToggle(){
  const btn = document.getElementById('achievNotifToggleBtn');
  if(btn) btn.innerHTML = achievNotificationsEnabled ? (ICON_BELL+' Notifiche obiettivi: ON') : (ICON_BELL_OFF+' Notifiche obiettivi: OFF');
}
// apre il modale con l'elenco completo degli obiettivi, sbloccati e non
function openAchievements(){
  const body = document.getElementById('achievBody');
  body.innerHTML = ACHIEVEMENTS.map(a=>{
    const unlocked = unlockedAchievements[a.id];
    if(unlocked){
      return `<div class="achiev-row unlocked"><div class="achiev-icon">${a.icon}</div><div class="achiev-info"><div class="achiev-title">${escapeHtml(a.title)}</div><div class="achiev-desc">${escapeHtml(a.desc)}</div></div></div>`;
    }
    return `<div class="achiev-row locked"><div class="achiev-icon">${ICON_LOCK}</div><div class="achiev-info"><div class="achiev-title">???</div><div class="achiev-desc">Obiettivo ancora da scoprire</div></div></div>`;
  }).join('');
  const count = Object.keys(unlockedAchievements).length;
  document.getElementById('achievCount').textContent = `${count}/${ACHIEVEMENTS.length} sbloccati`;
  renderAchievNotifToggle();
  document.getElementById('achievModal').style.display = 'flex';
}
function closeAchievements(){
  document.getElementById('achievModal').style.display = 'none';
}
