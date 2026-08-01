
// colore/accent per i 4 giorni "storici" (i nomi di default). Se un giorno viene
// rinominato o e' uno in piu', accentFor ripiega sulla stessa lista di colori
// scelta in base alla posizione (idx%4), cosi' c'e' sempre un colore assegnato
const ACCENTS = {};
function accentFor(name, idx){
  return ACCENTS[name] || [{c:"#9ACD32",d:"#3F5C0A"},{c:"#E8971C",d:"#5C3D0B"},{c:"#C0392B",d:"#4A1A14"},{c:"#4A90A4",d:"#17313A"}][idx%4];
}
// scurisce un colore esadecimale di un fattore (0-1): serve per ricavare da un
// solo colore scelto dall'utente anche la variante scura usata sull'intestazione
// del blocco settimana, senza dover far scegliere due colori separati
function darkenColor(hex, factor){
  const h = String(hex||'').replace('#','');
  if(h.length!==6) return '#3F5C0A';
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  const toHex = v => Math.max(0,Math.min(255,Math.round(v*factor))).toString(16).padStart(2,'0');
  return '#'+toHex(r)+toHex(g)+toHex(b);
}
// colore effettivo di un giorno: se l'utente ne ha scelto uno a mano (day.color,
// da "Modifica categorie giorni") usa quello, altrimenti ripiega su accentFor
// (nome noto o posizione) come succedeva finora
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
const CALENDAR_LOG_KEY = "scheda_wo18_calendar_log_v1";
const EXERCISE_GROUPS_KEY = "scheda_wo18_exercise_groups_v1";
const DELETED_ESERCIZI_KEY = "scheda_wo18_deleted_esercizi_v1";
const MUSCLE_GROUPS = ["Petto","Schiena","Spalle","Bicipiti","Tricipiti","Quadricipiti","Femorali","Polpacci","Glutei","Addominali","Cardio","Altro"];
let state = null;
let collapsedMap = {};
let storicoExtra = {};
let extraLists = {esercizi:[], recuperi:[], schemi:[], giorni:[]};
let deletedStorico = [];
// gruppo muscolare per esercizio (chiave = nome in minuscolo, per non dipendere
// da maiuscole/minuscole): DATA.gruppiEsercizi sono i valori di base spediti con
// l'app, exerciseGroups sono le correzioni/aggiunte fatte dall'utente, che vincono
let exerciseGroups = {};
// esercizi "di base" (DATA.esercizi, incorporato nel file) che l'utente ha tolto
// dalla Libreria esercizi: non si puo' modificare DATA per davvero, quindi si
// tiene un elenco di quelli da nascondere, stesso trucco usato per lo storico eliminato
let deletedEsercizi = [];
function getExerciseGroup(name){
  const key = String(name||'').trim().toLowerCase();
  if(!key) return '';
  if(key in exerciseGroups) return exerciseGroups[key];
  const baseMatch = Object.keys(DATA.gruppiEsercizi||{}).find(k=>k.toLowerCase()===key);
  return baseMatch ? DATA.gruppiEsercizi[baseMatch] : '';
}
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
// aggiunge un esercizio alla Libreria (stessa lista usata dall'autocomplete),
// col gruppo muscolare gia' assegnato se indicato
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
// se e' un esercizio aggiunto a mano (extraLists) lo toglie del tutto; se e'
// uno "di base" spedito con l'app non si puo' davvero rimuoverlo da DATA, quindi
// si aggiunge a deletedEsercizi cosi' getList() lo nasconde
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
// giorni di allenamento segnati come "terminati" (vedi finishDay in navigation.js):
// chiave "YYYY-MM-DD" -> lista di {name, color}, cosi' il calendario puo' mostrare
// un pallino colorato per ogni giorno di allenamento fatto, anche piu' di uno stesso giorno
let calendarLog = {};
// true da quando si tocca un esercizio (o si parte da un giorno dalla Home) fino
// a "Giorno terminato": serve a decidere se, riaprendo l'app da chiusa, si deve
// tornare dritti dove si era rimasti oppure mostrare la Home (vedi app-init.js)
const WORKOUT_IN_PROGRESS_KEY = "scheda_wo18_workout_in_progress_v1";
let workoutInProgress = false;
function saveWorkoutInProgress(){
  localStorage.setItem(WORKOUT_IN_PROGRESS_KEY, workoutInProgress ? '1' : '0');
}
function todayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function mostRecentMondayKey(){
  const now = new Date();
  const dow = (now.getDay()+6)%7; // lunedi=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-dow);
  return todayKey(monday);
}
function saveCalendarLog(){
  localStorage.setItem(CALENDAR_LOG_KEY, JSON.stringify(calendarLog));
}
// tutto lo stato vive in localStorage sotto queste chiavi; se una chiave manca o
// e' corrotta si ripiega sui default (scheda vuota/allenamento base di DATA.attivo)
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ state = JSON.parse(raw); }
  }catch(e){}
  if(!state) state = JSON.parse(JSON.stringify(DATA.attivo));
  if(!state.title) state.title = DATA.attivo.title || "Allenamento";
  if(!state.days) state.days = [];

  // settimana corrente
  if(state.currentWeek === undefined) state.currentWeek = 0;
  // giorni completati nella settimana corrente
  if(!state.completedTrainingDays) state.completedTrainingDays = [];
  // storico settimane completate (compatibilita' con vecchi salvataggi)
  if(!state.completedWeeks){
    state.completedWeeks = [];
    if(state.currentWeek > 0){
      for(let i = 0; i < state.currentWeek; i++) state.completedWeeks.push(i);
    }
  }
  // giorno allenamento corrente
  if(state.currentTrainingDayIdx === undefined) state.currentTrainingDayIdx = null;
  // coda allenamenti
  if(!state.trainingQueue) state.trainingQueue = (state.days || []).map((_,i)=>i);

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
    const rawcal = localStorage.getItem(CALENDAR_LOG_KEY);
    if(rawcal) calendarLog = JSON.parse(rawcal);
  }catch(e){ calendarLog = {}; }
  // data di inizio del blocco di allenamento attivo: serve per contare gli
  // allenamenti "di questo blocco" invece che del mese solare, che non
  // coincide necessariamente. Se manca ed e' un utente NUOVO (calendario
  // vuoto) resta senza valore: la assegnera' logWorkoutDay al primo "Giorno
  // terminato" premuto davvero, cosi' parte dal giorno vero e non da una
  // stima. Se invece il calendario ha gia' delle voci (dati vecchi salvati
  // prima che questo campo esistesse) si stima il lunedi' di questa settimana
  if(!state.programStartDate && Object.keys(calendarLog).length){
    state.programStartDate = mostRecentMondayKey();
  }
  // numero di settimane del blocco attivo (prima era sempre fisso a 4 in tutta
  // l'app). Se manca: se il programma ha gia' esercizi veri (dati salvati
  // prima che questo campo esistesse) si assume 4 senza chiedere nulla, per
  // non alterare dati gia' in uso; se invece e' un programma davvero vuoto
  // (utente nuovo, nessun esercizio da nessuna parte) resta senza valore,
  // sara' ensureWeeksPerBlock() a chiederlo al primo esercizio aggiunto
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
  // autocorrezione: se il flag e' rimasto vero (es. salvato da una versione
  // precedente che lo attivava anche solo toccando un campo) ma nessuna
  // settimana risulta davvero completata in nessun giorno, non e' un
  // allenamento "in corso" per davvero - si corregge qui cosi' non serve
  // aspettare un "Giorno terminato" per tornare a vedere la Home
  if(workoutInProgress && !state.days.some(d => (d.esercizi||[]).some(ex => (ex.weekDone||[]).some(Boolean)))){
    workoutInProgress = false;
    saveWorkoutInProgress();
  }

  saveState();
}
function getWeekStatus(weekIndex){
  const current = state.currentWeek || 0;
  if(weekIndex < current) return "completed";
  if(weekIndex === current) return "active";
  return "locked";
}
// ---------------- SETTIMANE PER BLOCCO (configurabile, non piu' fisso a 4) ----------------
function emptyStrArr(n){ return new Array(n).fill(''); }
// niente Array(n).fill([]): condividerebbe lo STESSO array tra tutte le
// settimane (fill non clona), una modifica su una settimana finirebbe per
// comparire anche nelle altre. Array.from crea un array nuovo per ogni indice
function emptySetsArr(n){ return Array.from({length:n}, () => []); }
// riporta un array esistente alla nuova lunghezza n, mantenendo i valori gia'
// presenti indice per indice e riempiendo il resto col default: usato quando
// si archivia e si sceglie un numero di settimane diverso dal blocco precedente
function resizeArr(arr, n, fill){
  const out = [];
  for(let i=0;i<n;i++) out.push(arr && arr[i]!==undefined ? arr[i] : fill);
  return out;
}
// chiesto la primissima volta che si aggiunge un esercizio a un programma
// nuovo (weeksPerBlock ancora senza valore) - da li' in poi resta quello per
// tutto il blocco corrente, finche' non si archivia e se ne sceglie uno nuovo
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
function saveDeletedStorico(){
  localStorage.setItem(DELETED_STORICO_KEY, JSON.stringify(deletedStorico));
}
function saveExtraLists(){
  localStorage.setItem(LISTS_KEY, JSON.stringify(extraLists));
}
// lista suggerimenti per l'autocomplete: quella base di DATA (kind = esercizi/
// recuperi/schemi/giorni) piu' le voci aggiunte a mano dall'utente (extraLists),
// senza duplicati (case-insensitive)
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
