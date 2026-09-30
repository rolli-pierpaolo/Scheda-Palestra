
const ACCENTS = {};
function accentFor(name, idx){
  return ACCENTS[name] || [{c:"#7EA83C",d:"#33470F"},{c:"#C98A3A",d:"#4F350F"},{c:"#B23D30",d:"#421A15"},{c:"#417C8E",d:"#152C33"}][idx%4];
}
function darkenColor(hex, factor){
  const h = String(hex||'').replace('#','');
  if(h.length!==6) return '#33470F';
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  const toHex = v => Math.max(0,Math.min(255,Math.round(v*factor))).toString(16).padStart(2,'0');
  return '#'+toHex(r)+toHex(g)+toHex(b);
}
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
let storicoDates = {};
function saveStoricoDates(){
  localStorage.setItem(STORICO_DATES_KEY, JSON.stringify(storicoDates));
}
let exerciseGroups = {};
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
let calendarLog = {};
const WORKOUT_IN_PROGRESS_KEY = "scheda_wo18_workout_in_progress_v1";
const WORKOUT_STARTED_AT_KEY = "scheda_wo18_workout_started_at_v1";
let workoutInProgress = false;
let workoutStartedAt = 0;
function saveWorkoutInProgress(){
  localStorage.setItem(WORKOUT_IN_PROGRESS_KEY, workoutInProgress ? '1' : '0');
}
function saveWorkoutStartedAt(){
  if(workoutStartedAt) localStorage.setItem(WORKOUT_STARTED_AT_KEY, String(workoutStartedAt));
  else localStorage.removeItem(WORKOUT_STARTED_AT_KEY);
}
function clearWorkoutSession(){
  workoutInProgress = false;
  workoutStartedAt = 0;
  saveWorkoutInProgress();
  saveWorkoutStartedAt();
}
// Una ripetizione inserita avvia la sessione; il peso puo essere gia precompilato.

function markWorkoutStartedByRep(){
  if(!workoutInProgress){
    workoutInProgress = true;
    workoutStartedAt = Date.now();
    saveWorkoutInProgress();
    saveWorkoutStartedAt();
  }
}
function markWorkoutStartedByWeight(){}
function dayHasRealProgressThisWeek(day){
  if(!day) return false;
  const w = state.currentWeek || 0;
  return (day.esercizi||[]).some(ex=>{
    const sets = (ex.sets && ex.sets[w]) || [];
    const maxEntries = (ex.maxEntries && ex.maxEntries[w]) || (ex.maxExtra && ex.maxExtra[w]) || [];
    return sets.some(s => s && String(s.rip||'').trim()!=='') ||
      maxEntries.some(entry => entry && String(entry.rip||'').trim()!=='');
  });
}
function todayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function mostRecentMondayKey(){
  const now = new Date();
  const dow = (now.getDay()+6)%7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-dow);
  return todayKey(monday);
}
function saveCalendarLog(){
  localStorage.setItem(CALENDAR_LOG_KEY, JSON.stringify(calendarLog));
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ state = JSON.parse(raw); }
  }catch(e){}
  const rawStateJson = state ? JSON.stringify(state) : null;
  if(!state) state = JSON.parse(JSON.stringify(DATA.attivo));
  if(!state.title) state.title = DATA.attivo.title || "Allenamento";
  if(!state.days) state.days = [];

  if(state.currentWeek === undefined) state.currentWeek = 0;
  if(!state.completedTrainingDays) state.completedTrainingDays = [];
  if(!state.completedWeeks){
    state.completedWeeks = [];
    if(state.currentWeek > 0){
      for(let i = 0; i < state.currentWeek; i++) state.completedWeeks.push(i);
    }
  }
  if(!state.trainingQueue || (state.trainingQueue.length===0 && state.days.length>0)){
    state.trainingQueue = state.days.map((_,i)=>i);
    state.currentTrainingDayIdx = state.trainingQueue.length ? state.trainingQueue[0] : null;
  } else if(state.currentTrainingDayIdx===undefined || state.currentTrainingDayIdx===null || !state.days[state.currentTrainingDayIdx]){
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
  if(!state.programStartDate && Object.keys(calendarLog).length){
    state.programStartDate = mostRecentMondayKey();
  }
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

  if(JSON.stringify(state) !== rawStateJson) saveState();
}
function getWeekStatus(weekIndex){
  const current = state.currentWeek || 0;
  if(weekIndex < current) return "completed";
  if(weekIndex === current) return "active";
  return "locked";
}
function emptyStrArr(n){ return new Array(n).fill(''); }
function emptySetsArr(n){ return Array.from({length:n}, () => []); }
function resizeArr(arr, n, fill){
  const out = [];
  for(let i=0;i<n;i++) out.push(arr && arr[i]!==undefined ? arr[i] : fill);
  return out;
}
async function ensureWeeksPerBlock(){
  if(state.weeksPerBlock) return state.weeksPerBlock;
  let val = await ViridisWeeksPicker('Quante settimane dura un blocco di allenamento?', '4');
  let n = parseInt(String(val||'').replace(',','.'), 10);
  if(isNaN(n) || n<1) n = 4;
  if(n>12) n = 12;
  state.weeksPerBlock = n;
  saveState();
  return n;
}
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
      const newSets = [];
      for(let i=0;i<newTotal;i++) newSets.push((ex.sets && ex.sets[i]) || []);
      ex.sets = newSets;
      const newMaxExtra = [];
      for(let i=0;i<newTotal;i++) newMaxExtra.push((ex.maxExtra && ex.maxExtra[i]) || []);
      ex.maxExtra = newMaxExtra;
      if(ex.maxEntries){
        const lastEntries = [...ex.maxEntries].reverse().find(entries => entries && entries.length) || [];
        const newMaxEntries = [];
        for(let i=0;i<newTotal;i++){
          const source = ex.maxEntries[i] || lastEntries;
          newMaxEntries.push(source.map(entry=>({
            afterSet:entry.afterSet,
            peso:entry.peso || '',
            rip:entry.rip || ''
          })));
        }
        ex.maxEntries = newMaxEntries;
      }
    });
  });
  state.weeksPerBlock = newTotal;
  state.blockCompletionPromptDismissed = false;
  saveState();
  return true;
}
function saveDeletedStorico(){
  localStorage.setItem(DELETED_STORICO_KEY, JSON.stringify(deletedStorico));
}
function saveExtraLists(){
  localStorage.setItem(LISTS_KEY, JSON.stringify(extraLists));
}
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
