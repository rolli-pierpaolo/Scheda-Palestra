// ---------------- HOME ----------------
// pagina che si apre quando non c'e' un allenamento in corso (vedi app-init.js
// e workoutInProgress in state.js): elenco giorni, progresso settimanale e
// giorno suggerito, tutto calcolato dal calendario che gia' esiste
function showHome(){
  renderHome();
  showView('home');
}
function startDayFromHome(dayIdx){
  workoutInProgress = true;
  saveWorkoutInProgress();
  selectDay(dayIdx);
  showView('active');
}
function currentWeekRange(){
  const now = new Date();
  const dow = (now.getDay()+6)%7; // lunedi=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate()-dow);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+6);
  return {monday, sunday};
}
// quanti dei giorni definiti dall'utente sono stati fatti almeno una volta questa
// settimana di calendario (lun-dom), non quante volte in totale sono stati loggati
function computeWeeklyProgress(){
  const {monday, sunday} = currentWeekRange();
  const doneNames = new Set();
  Object.keys(calendarLog).forEach(key=>{
    const d = new Date(key+'T00:00:00');
    if(d>=monday && d<=sunday){
      calendarLog[key].forEach(e=>doneNames.add(e.name));
    }
  });
  return { done: doneNames.size, total: state.days.length };
}
// stessa logica di avanzamento gia' usata da "Giorno terminato": guarda l'ultimo
// giorno registrato nel calendario (qualsiasi data) e suggerisce quello dopo,
// tornando al primo se non ci si e' mai allenati o se non lo trova piu' tra i giorni
function computeSuggestedDayIdx(){
  const dates = Object.keys(calendarLog).filter(k=>calendarLog[k] && calendarLog[k].length).sort();
  if(!dates.length) return 0;
  const lastEntries = calendarLog[dates[dates.length-1]];
  const lastName = lastEntries[lastEntries.length-1].name;
  const lastIdx = state.days.findIndex(d=>d.name===lastName);
  if(lastIdx===-1) return 0;
  return (lastIdx+1) % state.days.length;
}
// allenamenti fatti da quando e' iniziato il blocco attivo (le 4 settimane
// della scheda, vedi state.programStartDate), NON il mese solare: i due non
// coincidono quasi mai, e contare per mese solare finiva per includere anche
// allenamenti del blocco precedente
function computeMonthlyWorkoutsCount(){
  const startKey = state.programStartDate || mostRecentMondayKey();
  let total = 0;
  Object.keys(calendarLog).forEach(key=>{
    if(key >= startKey){
      total += (calendarLog[key]||[]).length;
    }
  });
  return total;
}
// in che settimana del blocco attivo (4 settimane) si e', contando da
// programStartDate: bloccata tra 1 e 4 perche' oltre la 4 tocca "Archivia e
// inizia un nuovo mese" (il blocco successivo riparte da 1)
function computeCurrentBlockWeek(){
  const startKey = state.programStartDate || mostRecentMondayKey();
  const start = new Date(startKey+'T00:00:00');
  const diffDays = Math.floor((new Date() - start) / 86400000);
  const week = Math.floor(diffDays/7) + 1;
  return Math.min(Math.max(week,1),4);
}
// gruppi muscolari allenati nel giorno suggerito (in ordine di comparsa negli
// esercizi), usata per scegliere una frase motivazionale in tema
function computeSuggestedDayMuscleGroups(dayIdx){
  const day = state.days[dayIdx];
  if(!day) return [];
  const groups = [];
  (day.esercizi||[]).forEach(ex=>{
    const g = getExerciseGroup(ex.nome);
    if(g && !groups.includes(g)) groups.push(g);
  });
  return groups;
}
const MUSCLE_MOTIVATION = {
  'Petto': ["Oggi si spinge: il petto non si costruisce da solo 💥","Panca e cuore, oggi il petto trema 🔥"],
  'Schiena': ["Larga e spessa: oggi la schiena ringrazia 💪","Tira duro, la schiena cresce tirando 🔥"],
  'Spalle': ["Spalle d'acciaio oggi: alza la posta 💪","Rotonde e forti: oggi tocca alle spalle 🔥"],
  'Bicipiti': ["Curl dopo curl, il braccio cresce 💪","Oggi le braccia esplodono 🔥"],
  'Tricipiti': ["Tricipiti: il vero segreto delle braccia grosse 💪","Spingi, estendi, ripeti 🔥"],
  'Quadricipiti': ["Gambe di ferro oggi: squatta duro 🦵","Quadricipiti in fiamme, si va giu' 🔥"],
  'Femorali': ["Stacchi e curl: oggi i femorali lavorano 💪","Catena posteriore al centro oggi 🔥"],
  'Polpacci': ["Polpacci: pochi ci credono, tu si' 💪","Oggi tocca ai polpacci, niente scuse 🔥"],
  'Glutei': ["Spingi le anche, oggi i glutei lavorano 💪","Oggi si costruisce da dietro 🔥"],
  'Addominali': ["Core d'acciaio oggi 💪","Ogni rep conta per quel six-pack 🔥"],
  'Cardio': ["Fiato corto, cuore forte: oggi si suda 🔥","Oggi bruci, domani ringrazi 💪"],
  'Altro': ["Oggi si lavora, punto 💪","Ogni allenamento conta 🔥"],
};
const DEFAULT_MOTIVATION = ["Oggi e' il giorno giusto per allenarsi 💪","Un altro passo avanti oggi 🔥"];
// stabile per tutto il giorno (non cambia a ogni render): l'indice nel pool
// di frasi e' derivato dalla data, non da Math.random()
function pickMotivationalPhrase(dayIdx){
  const groups = computeSuggestedDayMuscleGroups(dayIdx);
  const pool = (groups.length && MUSCLE_MOTIVATION[groups[0]]) ? MUSCLE_MOTIVATION[groups[0]] : DEFAULT_MOTIVATION;
  const key = todayKey();
  let sum = 0;
  for(let i=0;i<key.length;i++) sum += key.charCodeAt(i);
  return pool[sum % pool.length];
}
function renderHome(){
  const el = document.getElementById('viewHome');
  if(!el) return;
  const {done, total} = computeWeeklyProgress();
  const suggestedIdx = computeSuggestedDayIdx();
  const suggestedDay = state.days[suggestedIdx];
  const monthlyCount = computeMonthlyWorkoutsCount();
  const blockWeek = computeCurrentBlockWeek();
  const dayButtons = state.days.map((d,i)=>{
    const a = dayAccent(d,i);
    return `<button class="home-day-btn" style="--accent:${a.c}" onclick="startDayFromHome(${i})">${escapeHtml(d.name)}</button>`;
  }).join('');
  const motivation = suggestedDay ? pickMotivationalPhrase(suggestedIdx) : '';
  const suggestedHtml = suggestedDay ? `${motivation ? `<div class="home-motivation">${escapeHtml(motivation)}</div>` : ''}
    <button class="home-suggested-btn" style="--accent:${dayAccent(suggestedDay,suggestedIdx).c}" onclick="startDayFromHome(${suggestedIdx})">
      <span class="home-suggested-label">💥 OGGI TOCCA A</span>
      <span class="home-suggested-name">${escapeHtml(suggestedDay.name)}</span>
    </button>` : '';
  el.innerHTML = `
    <div class="home-hero">
      <div class="home-block-week">SETTIMANA ${blockWeek} DI 4</div>
      <div class="home-progress-label">GIORNO</div>
      <div class="home-progress-num">${done}<span class="home-progress-of">/${total}</span></div>
      <div class="home-progress-sub">allenamenti in the bag 💪</div>
    </div>
    ${suggestedHtml}
    <div class="home-days-label">I tuoi giorni</div>
    <div class="home-days-grid">${dayButtons}</div>
    <div class="home-total-stat">🔥 ${monthlyCount} allenamenti completati questo mese</div>
  `;
}
