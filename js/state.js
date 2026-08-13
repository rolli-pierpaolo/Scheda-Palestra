
// ---------------- STATO: CARICAMENTO, SALVATAGGIO, COLORI DEI GIORNI ----------------
// colore per i quattro giorni storici, i nomi di default. Se un giorno viene
// rinominato o è uno in più, accentFor ripiega sulla stessa lista di colori
// scelta in base alla posizione, così c'è sempre un colore assegnato
const ACCENTS = {};
// stessi colori di --green, --amber, --red, --steel in css/style.css, lì sono
// per l'accento di default dell'app, qui per i quattro giorni storici -
// tenerli coordinati non è un caso: è la stessa palette ricalibrata, meno
// satura di prima, così i colori dei vari giorni sembrano un set scelto
// apposta invece di quattro tinte a caso una diversa dall'altra
function accentFor(name, idx){
  return ACCENTS[name] || [{c:"#7EA83C",d:"#33470F"},{c:"#C98A3A",d:"#4F350F"},{c:"#B23D30",d:"#421A15"},{c:"#417C8E",d:"#152C33"}][idx%4];
}
// scurisce un colore esadecimale di un fattore da zero a uno: serve per
// ricavare da un solo colore scelto dall'utente anche la variante scura
// usata sull'intestazione del blocco settimana, senza dover far scegliere
// due colori separati
function darkenColor(hex, factor){
  const h = String(hex||'').replace('#','');
  if(h.length!==6) return '#33470F';
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  const toHex = v => Math.max(0,Math.min(255,Math.round(v*factor))).toString(16).padStart(2,'0');
  return '#'+toHex(r)+toHex(g)+toHex(b);
}
// colore effettivo di un giorno: se l'utente ne ha scelto uno a mano, da
// "Modifica categorie giorni", usa quello, altrimenti ripiega su accentFor,
// nome noto o posizione, come succedeva finora
function dayAccent(day, idx){
  if(day && day.color){
    return { c: day.color, d: darkenColor(day.color, 0.38) };
  }
  return accentFor(day ? day.name : null, idx);
}

const STORAGE_KEY = "scheda_wo18_state_v1";
const COLLAPSE_KEY = "scheda_wo18_collapsed_v1";
const STORICO_KEY = "scheda_wo18_storico_extra_v1";
const LISTS_KEY = "scheda_wo18_extra_lists_v1";
const DELETED_STORICO_KEY = "scheda_wo18_deleted_storico_v1";
const STORICO_DATES_KEY = "scheda_wo18_storico_dates_v1";
const CALENDAR_LOG_KEY = "scheda_wo18_calendar_log_v1";
const EXERCISE_GROUPS_KEY = "scheda_wo18_exercise_groups_v1";
const DELETED_ESERCIZI_KEY = "scheda_wo18_deleted_esercizi_v1";
const MUSCLE_GROUPS = ["Petto","Schiena","Spalle","Bicipiti","Tricipiti","Quadricipiti","Femorali","Polpacci","Glutei","Addominali","Cardio","Altro"];
let state = null;
let collapsedMap = {};
let storicoExtra = {};
let extraLists = {esercizi:[], recuperi:[], schemi:[], giorni:[]};
let deletedStorico = [];
// data "YYYY-MM-DD" in cui ogni blocco è stato archiviato, chiave uguale allo
// stesso titolo usato in storicoExtra: serve solo a mostrare quando in
// Storico, se manca, blocchi archiviati prima che questo campo esistesse,
// semplicemente non si mostra nessuna data per quella voce, niente di rotto
let storicoDates = {};
function saveStoricoDates(){
  localStorage.setItem(STORICO_DATES_KEY, JSON.stringify(storicoDates));
}
// gruppo muscolare per esercizio, chiave uguale al nome in minuscolo per non
// dipendere da maiuscole e minuscole: DATA.gruppiEsercizi sono i valori di
// base spediti con l'app, exerciseGroups sono le correzioni e le aggiunte
// fatte dall'utente, che vincono
let exerciseGroups = {};
// esercizi di base, incorporati nel file, che l'utente ha tolto dalla
// Libreria esercizi: non si può modificare quei dati per davvero, quindi si
// tiene un elenco di quelli da nascondere, stesso trucco usato per lo storico eliminato
let deletedEsercizi = [];
// legge il gruppo muscolare di un esercizio, prima dalle correzioni
// dell'utente, poi dai valori di base
function getExerciseGroup(name){
  const key = String(name||'').trim().toLowerCase();
  if(!key) return '';
  if(key in exerciseGroups) return exerciseGroups[key];
  const baseMatch = Object.keys(DATA.gruppiEsercizi||{}).find(k=>k.toLowerCase()===key);
  return baseMatch ? DATA.gruppiEsercizi[baseMatch] : '';
}
// assegna un gruppo muscolare a un esercizio
function setExerciseGroup(name, group){
  const key = String(name||'').trim().toLowerCase();
  if(!key) return;
  exerciseGroups[key] = group;
  saveExerciseGroups();
}
function saveExerciseGroups(){
  localStorage.setItem(EXERCISE_GROUPS_KEY, JSON.stringify(exerciseGroups));
}
function saveDeletedEsercizi(){
  localStorage.setItem(DELETED_ESERCIZI_KEY, JSON.stringify(deletedEsercizi));
}
// aggiunge un esercizio alla Libreria, stessa lista usata dall'autocomplete,
// con il gruppo muscolare già assegnato se indicato
function addLibraryExercise(name, group){
  name = String(name||'').trim();
  if(!name) return;
  const already = getList('esercizi').some(v=>String(v).toLowerCase()===name.toLowerCase());
  if(!already){
    if(!extraLists.esercizi) extraLists.esercizi=[];
    extraLists.esercizi.push(name);
    saveExtraLists();
    checkAchievements();
  }
  if(group) setExerciseGroup(name, group);
}
// se è un esercizio aggiunto a mano lo toglie del tutto; se è uno di base
// spedito con l'app non si può davvero rimuoverlo dai dati incorporati,
// quindi si aggiunge a deletedEsercizi così getList() lo nasconde
function removeLibraryExercise(name){
  const key = String(name||'').trim().toLowerCase();
  if(!key) return;
  const idx = (extraLists.esercizi||[]).findIndex(v=>String(v).toLowerCase()===key);
  if(idx!==-1){
    extraLists.esercizi.splice(idx,1);
    saveExtraLists();
  } else if(!deletedEsercizi.some(v=>String(v).toLowerCase()===key)){
    deletedEsercizi.push(name);
    saveDeletedEsercizi();
  }
  delete exerciseGroups[key];
  saveExerciseGroups();
}
// giorni di allenamento segnati come terminati, vedi finishDay in
// navigation.js: chiave "YYYY-MM-DD" con una lista di {name, color}, così il
// calendario può mostrare un pallino colorato per ogni giorno di allenamento
// fatto, anche più di uno stesso giorno
let calendarLog = {};
// true da quando si scrive davvero un peso, non solo aprendo la scheda o
// guardando gli esercizi, fino a "Giorno terminato": serve a decidere se,
// riaprendo l'app da chiusa, si deve tornare dritti dove si era rimasti
// oppure mostrare la Home, vedi js/app-init.js
const WORKOUT_IN_PROGRESS_KEY = "scheda_wo18_workout_in_progress_v1";
let workoutInProgress = false;
function saveWorkoutInProgress(){
  localStorage.setItem(WORKOUT_IN_PROGRESS_KEY, workoutInProgress ? '1' : '0');
}
// segna l'allenamento come davvero iniziato: chiamata solo da chi scrive
// un peso, updateSet, stepSet, updateMax in js/exercise-card.js, mai dalle
// ripetizioni, nemmeno quelle dei tentativi massimali - toccare "inizia"
// dalla Home o scorrere gli esercizi senza scrivere nulla non conta più,
// così chiudendo l'app forzatamente prima di aver scritto un peso vero si
// torna alla Home, non al giorno di allenamento
function markWorkoutStartedByWeight(){
  if(!workoutInProgress){
    workoutInProgress = true;
    saveWorkoutInProgress();
  }
}
// workoutInProgress è unico per tutto il blocco, non per singolo giorno: una
// volta scritto un peso vero da qualche parte, resta acceso finché quel
// giorno non viene chiuso con "Giorno terminato", anche settimane dopo,
// anche per giorni completamente diversi. Bug preso segnalando l'app a un
// utente vero: alla riapertura dell'app questo faceva tornare dritti al
// giorno attivo anche quando quel giorno specifico, per la settimana
// corrente, non aveva ancora una sola cifra scritta - "in corso" era vero
// per via di settimane passate già concluse altrove nel blocco, non perché
// ci fosse davvero qualcosa di appeso lì. Questa funzione guarda solo il
// giorno e la settimana che si aprirebbero per davvero
function dayHasRealProgressThisWeek(day){
  if(!day) return false;
  const w = state.currentWeek || 0;
  return (day.esercizi||[]).some(ex=>{
    const sets = (ex.sets && ex.sets[w]) || [];
    return sets.some(s => s && String(s.peso||'').trim()!=='');
  });
}
// trasforma una data in una chiave "YYYY-MM-DD", oggi se non specificata
function todayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
// trova la chiave del lunedì della settimana corrente
function mostRecentMondayKey(){
  const now = new Date();
  const dow = (now.getDay()+6)%7; // lunedì diventa il giorno zero
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-dow);
  return todayKey(monday);
}
function saveCalendarLog(){
  localStorage.setItem(CALENDAR_LOG_KEY, JSON.stringify(calendarLog));
}
// tutto lo stato vive in localStorage sotto queste chiavi; se una chiave manca
// o è corrotta si ripiega sui valori di default, scheda vuota o allenamento
// base spedito con l'app
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ state = JSON.parse(raw); }
  }catch(e){}
  // per capire, alla fine, se una delle riparazioni qui sotto ha davvero
  // cambiato qualcosa, vedi il confronto finale prima di saveState()
  const rawStateJson = state ? JSON.stringify(state) : null;
  if(!state) state = JSON.parse(JSON.stringify(DATA.attivo));
  if(!state.title) state.title = DATA.attivo.title || "Allenamento";
  if(!state.days) state.days = [];

  // settimana corrente
  if(state.currentWeek === undefined) state.currentWeek = 0;
  // giorni completati nella settimana corrente
  if(!state.completedTrainingDays) state.completedTrainingDays = [];
  // storico settimane completate, compatibilità con vecchi salvataggi
  if(!state.completedWeeks){
    state.completedWeeks = [];
    if(state.currentWeek > 0){
      for(let i = 0; i < state.currentWeek; i++) state.completedWeeks.push(i);
    }
  }
  // coda allenamenti: un array vuoto è un valore legittimo in JavaScript,
  // quindi "verosimile", il solo controllo !state.trainingQueue da solo non
  // lo intercetta, ma qui non è mai vuoto se ci sono giorni definiti -
  // succedeva con un bug ormai risolto in updateTrainingQueueAfterComplete,
  // finire l'ultimo giorno della settimana svuotava la coda senza mai
  // ripopolarla, ma chi ha già i dati salvati rotti da prima del fix
  // resterebbe con nessun giorno corrente per sempre se non si ripara anche
  // qui, al caricamento
  if(!state.trainingQueue || (state.trainingQueue.length===0 && state.days.length>0)){
    state.trainingQueue = state.days.map((_,i)=>i);
    state.currentTrainingDayIdx = state.trainingQueue.length ? state.trainingQueue[0] : null;
  } else if(state.currentTrainingDayIdx===undefined || state.currentTrainingDayIdx===null || !state.days[state.currentTrainingDayIdx]){
    // giorno allenamento corrente mancante o non più valido, per esempio un
    // giorno è stato eliminato: si ripiega sul primo della coda
    state.currentTrainingDayIdx = state.trainingQueue.length ? state.trainingQueue[0] : null;
  }

  try{
    const rawc = localStorage.getItem(COLLAPSE_KEY);
    if(rawc) collapsedMap = JSON.parse(rawc);
  }catch(e){ collapsedMap = {}; }
  try{
    const raws = localStorage.getItem(STORICO_KEY);
    if(raws) storicoExtra = JSON.parse(raws);
  }catch(e){ storicoExtra = {}; }
  try{
    const rawl = localStorage.getItem(LISTS_KEY);
    if(rawl) extraLists = Object.assign({esercizi:[],recuperi:[],schemi:[],giorni:[]}, JSON.parse(rawl));
  }catch(e){}
  try{
    const rawd = localStorage.getItem(DELETED_STORICO_KEY);
    if(rawd) deletedStorico = JSON.parse(rawd);
  }catch(e){ deletedStorico = []; }
  try{
    const rawsd = localStorage.getItem(STORICO_DATES_KEY);
    if(rawsd) storicoDates = JSON.parse(rawsd);
  }catch(e){ storicoDates = {}; }
  try{
    const rawcal = localStorage.getItem(CALENDAR_LOG_KEY);
    if(rawcal) calendarLog = JSON.parse(rawcal);
  }catch(e){ calendarLog = {}; }
  // data di inizio del blocco di allenamento attivo: serve per contare gli
  // allenamenti di questo blocco invece che del mese solare, che non
  // coincide necessariamente. Se manca ed è un utente nuovo, calendario
  // vuoto, resta senza valore: la assegnerà logWorkoutDay al primo "Giorno
  // terminato" premuto davvero, così parte dal giorno vero e non da una
  // stima. Se invece il calendario ha già delle voci, dati vecchi salvati
  // prima che questo campo esistesse, si stima il lunedì di questa settimana
  if(!state.programStartDate && Object.keys(calendarLog).length){
    state.programStartDate = mostRecentMondayKey();
  }
  // numero di settimane del blocco attivo, prima era sempre fisso a quattro
  // in tutta l'app. Se manca: se il programma ha già esercizi veri, dati
  // salvati prima che questo campo esistesse, si assume quattro senza
  // chiedere nulla, per non alterare dati già in uso; se invece è un
  // programma davvero vuoto, utente nuovo, nessun esercizio da nessuna
  // parte, resta senza valore, sarà ensureWeeksPerBlock() a chiederlo al
  // primo esercizio aggiunto
  if(!state.weeksPerBlock){
    const hasExistingData = (state.days||[]).some(d=>(d.esercizi||[]).some(ex=>ex.recupero && ex.recupero.length));
    if(hasExistingData) state.weeksPerBlock = 4;
  }
  try{
    const rawg = localStorage.getItem(EXERCISE_GROUPS_KEY);
    if(rawg) exerciseGroups = JSON.parse(rawg);
  }catch(e){ exerciseGroups = {}; }
  try{
    const rawde = localStorage.getItem(DELETED_ESERCIZI_KEY);
    if(rawde) deletedEsercizi = JSON.parse(rawde);
  }catch(e){ deletedEsercizi = []; }
  try{
    workoutInProgress = localStorage.getItem(WORKOUT_IN_PROGRESS_KEY) === '1';
  }catch(e){ workoutInProgress = false; }
  // autocorrezione: se il flag è rimasto vero, per esempio salvato da una
  // versione precedente che lo attivava anche solo toccando un campo, ma
  // nessuna settimana risulta davvero completata in nessun giorno, non è un
  // allenamento in corso per davvero - si corregge qui così non serve
  // aspettare un "Giorno terminato" per tornare a vedere la Home.
  // Bug risolto qui: controllava solo weekDone, non anche weekSkipped -
  // toggleWeekSkipped attiva "in corso" esattamente come toggleWeekDone,
  // saltare una settimana di proposito conta come allenarsi, ma questo
  // controllo lo ignorava: una sessione fatta solo di esercizi saltati,
  // nessuno segnato fatto, veniva giudicata "non in corso per davvero" e
  // azzerata, mandando alla Home invece che dritti al giorno vero, e da lì
  // un tocco su "Allenamento" faceva ripartire dal primo giorno invece di
  // quello su cui si era davvero
  if(workoutInProgress && !state.days.some(d => (d.esercizi||[]).some(ex => (ex.weekDone||[]).some(Boolean) || (ex.weekSkipped||[]).some(Boolean)))){
    workoutInProgress = false;
    saveWorkoutInProgress();
  }

  // salva solo se il caricamento ha davvero corretto o riempito qualcosa:
  // prima si chiamava saveState() incondizionatamente a ogni avvio, anche
  // quando non c'era nulla da riparare - risultato: ogni apertura
  // dell'app mandava comunque un invio al cloud, una volta collegato
  // l'account, aggiornando "updated_at" sulla riga anche senza nessuna
  // modifica vera. Con più di un dispositivo, questo faceva comparire il
  // banner "dati aggiornati da un altro dispositivo" anche quando davvero
  // non era cambiato nulla, solo perché un altro dispositivo era stato
  // aperto nel frattempo
  if(JSON.stringify(state) !== rawStateJson) saveState();
}
// dice se una settimana è già completata, è quella attiva, o non è ancora arrivata
function getWeekStatus(weekIndex){
  const current = state.currentWeek || 0;
  if(weekIndex < current) return "completed";
  if(weekIndex === current) return "active";
  return "locked";
}
// ---------------- SETTIMANE PER BLOCCO (configurabile, non più fisso a quattro) ----------------
// crea un array di n stringhe vuote
function emptyStrArr(n){ return new Array(n).fill(''); }
// niente Array(n).fill([]): condividerebbe lo stesso array tra tutte le
// settimane, fill non clona, una modifica su una settimana finirebbe per
// comparire anche nelle altre. Array.from crea un array nuovo per ogni indice
function emptySetsArr(n){ return Array.from({length:n}, () => []); }
// riporta un array esistente alla nuova lunghezza n, mantenendo i valori già
// presenti indice per indice e riempiendo il resto col valore di riserva:
// usato quando si archivia e si sceglie un numero di settimane diverso dal
// blocco precedente
function resizeArr(arr, n, fill){
  const out = [];
  for(let i=0;i<n;i++) out.push(arr && arr[i]!==undefined ? arr[i] : fill);
  return out;
}
// chiesto la primissima volta che si aggiunge un esercizio a un programma
// nuovo, weeksPerBlock ancora senza valore - da lì in poi resta quello per
// tutto il blocco corrente, finché non si archivia e se ne sceglie uno nuovo
function ensureWeeksPerBlock(){
  if(state.weeksPerBlock) return state.weeksPerBlock;
  let val = prompt('Quante settimane dura un blocco di allenamento?', '4');
  let n = parseInt(String(val||'').replace(',','.'), 10);
  if(isNaN(n) || n<1) n = 4;
  if(n>12) n = 12;
  state.weeksPerBlock = n;
  saveState();
  return n;
}
// estende, mai riduce, il numero di settimane del blocco attualmente in
// corso, senza dover archiviare e ricominciare un blocco nuovo - utile se
// all'inizio se ne sceglie uno troppo corto e a metà ci si accorge di
// volerlo allungare. Riusa resizeArr, già usata da archiveAndReset per lo
// stesso tipo di ridimensionamento, lì però passando da un blocco chiuso a
// uno nuovo: le settimane nuove ereditano l'ultimo schema e recupero già
// scritti, stessa convenzione a cascata di updateMeta, il resto, fatta,
// saltata, serie, nota, parte vuoto come qualsiasi settimana mai toccata
function extendWeeksPerBlock(newTotal){
  const current = state.weeksPerBlock || 4;
  if(newTotal <= current) return false;
  state.days.forEach(day=>{
    day.esercizi.forEach(ex=>{
      const lastSchema = ex.schema && ex.schema.length ? ex.schema[ex.schema.length-1] : '';
      const lastRecupero = ex.recupero && ex.recupero.length ? ex.recupero[ex.recupero.length-1] : '';
      ex.schema = resizeArr(ex.schema, newTotal, lastSchema);
      ex.recupero = resizeArr(ex.recupero, newTotal, lastRecupero);
      ex.weekNote = resizeArr(ex.weekNote, newTotal, '');
      ex.weekDone = resizeArr(ex.weekDone, newTotal, false);
      ex.weekSkipped = resizeArr(ex.weekSkipped, newTotal, false);
      ex.maxShown = resizeArr(ex.maxShown, newTotal, false);
      // niente resizeArr(arr, n, []) per sets e maxExtra: condividerebbe lo
      // stesso array vuoto tra tutte le settimane nuove, stesso motivo già
      // documentato su emptySetsArr qui sopra - ognuna ne vuole uno tutto suo
      const newSets = [];
      for(let i=0;i<newTotal;i++) newSets.push((ex.sets && ex.sets[i]) || []);
      ex.sets = newSets;
      const newMaxExtra = [];
      for(let i=0;i<newTotal;i++) newMaxExtra.push((ex.maxExtra && ex.maxExtra[i]) || []);
      ex.maxExtra = newMaxExtra;
    });
  });
  state.weeksPerBlock = newTotal;
  saveState();
  return true;
}
function saveDeletedStorico(){
  localStorage.setItem(DELETED_STORICO_KEY, JSON.stringify(deletedStorico));
}
function saveExtraLists(){
  localStorage.setItem(LISTS_KEY, JSON.stringify(extraLists));
}
// lista suggerimenti per l'autocomplete: quella di base, kind è esercizi,
// recuperi, schemi o giorni, più le voci aggiunte a mano dall'utente, senza
// duplicati e senza distinguere maiuscole e minuscole
function getList(kind){
  const base = DATA[kind] || [];
  const extra = extraLists[kind] || [];
  const seen = new Set(base.map(v=>String(v).toLowerCase()));
  let merged = base.slice();
  extra.forEach(v=>{ const k=String(v).toLowerCase(); if(!seen.has(k)){ merged.push(v); seen.add(k); } });
  if(kind==='esercizi' && deletedEsercizi.length){
    const del = new Set(deletedEsercizi.map(v=>String(v).toLowerCase()));
    merged = merged.filter(v=>!del.has(String(v).toLowerCase()));
  }
  return merged;
}
