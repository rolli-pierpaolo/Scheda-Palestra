let activeDayIdx = 0;
let activeFirstAnimation = true;
let selectedTrainingOrder = [];
// ---------------- POSIZIONE ATTIVA (giorno + esercizio) ----------------
// ricorda in che giorno/esercizio ero rimasto, per riaprire il file esattamente li'
const ACTIVE_POS_KEY = "scheda_wo18_active_pos_v1";
let activeExerciseIdx = null;
function saveActivePos(){
  try{ localStorage.setItem(ACTIVE_POS_KEY, JSON.stringify({dayIdx:activeDayIdx, exi:activeExerciseIdx})); }catch(e){}
}
function loadActivePos(){
  let pos = null;
  try{ const raw = localStorage.getItem(ACTIVE_POS_KEY); if(raw) pos = JSON.parse(raw); }catch(e){}
  if(pos && state.days[pos.dayIdx]){
    activeDayIdx = pos.dayIdx;
    if(typeof pos.exi === 'number' && state.days[activeDayIdx].esercizi[pos.exi]) activeExerciseIdx = pos.exi;
  }
}
// nota: NON tocca workoutInProgress. Toccare/guardare un campo non vuol dire
// aver davvero iniziato l'allenamento (es. uno sguardo distratto a un altro
// giorno) - quel segnale arriva solo da toggleWeekDone, quando si preme
// davvero "completata" su almeno una settimana (vedi js/exercise-card.js)
function trackActiveExercise(e){
  const card = e.target.closest && e.target.closest('.card[data-exi]');
  if(!card) return;
  const exi = parseInt(card.dataset.exi,10);
  if(!isNaN(exi) && exi !== activeExerciseIdx){
    activeExerciseIdx = exi;
    saveActivePos();
  }
}
document.getElementById('viewActive').addEventListener('focusin', trackActiveExercise);
document.getElementById('viewActive').addEventListener('pointerdown', trackActiveExercise);

// ---------------- SCROLL "MAGNETICO" SULL'ESERCIZIO ATTIVO ----------------
// se sto lavorando su un esercizio e scrollo per sbaglio di poco, quando smetto
// di scrollare la pagina si ri-centra su quell'esercizio. Se invece lo scroll e'
// grande (mi sono spostato apposta a guardare altro) non tocca nulla.
let scrollSnapTimer = null;
window.addEventListener('scroll', function(){
  clearTimeout(scrollSnapTimer);
  scrollSnapTimer = setTimeout(trySnapToActiveExercise, 550);
}, {passive:true});
// pensato per il telefono (il pollice puo' far scrollare per sbaglio mentre si
// tiene in mano): su PC, dove lo scroll e' sempre volontario (mouse/tastiera),
// un salto automatico della pagina e' solo fastidioso, quindi li' resta disattivo
function isDesktopDevice(){
  return window.matchMedia && window.matchMedia('(pointer: coarse)').matches === false;
}
// allinea al TITOLO dell'esercizio (.name-row), non al centro dell'intera card:
// la card include anche il blocco settimana aperto sotto, quindi centrare la
// card intera finiva per centrare quel blocco invece del nome esercizio
function trySnapToActiveExercise(force){
  if(isDesktopDevice()) return;
  if(activeExerciseIdx === null) return;
  if(document.getElementById('viewActive').style.display === 'none') return;
  if(document.getElementById('chartModal').style.display === 'flex') return;
  if(document.getElementById('daysModal').style.display === 'flex') return;
  if(document.getElementById('calendarModal').style.display === 'flex') return;
  if(document.getElementById('linkModal').style.display === 'flex') return;
  if(document.getElementById('plateModal').style.display === 'flex') return;
  // se c'e' un campo di testo attivo la tastiera e' aperta: l'utente potrebbe aver
  // scrollato apposta per scrivere comodo, quindi qui non tocchiamo lo scroll
  // (a meno che non sia uno scroll forzato, es. avanzamento automatico al prossimo esercizio)
  const activeTag = document.activeElement && document.activeElement.tagName;
  if(!force && (activeTag === 'INPUT' || activeTag === 'TEXTAREA')) return;
  // data-exi2 e' il partner in una coppia collegata (super set/jump set): un
  // riferimento salvato prima di collegare due esercizi potrebbe puntare a
  // quello che ora e' "il secondo" della coppia, che non ha un suo data-exi
  const card = document.querySelector('#viewActive .card[data-exi="'+activeExerciseIdx+'"], #viewActive .card[data-exi2="'+activeExerciseIdx+'"]');
  if(!card) return;
  const title = card.querySelector('.name-row') || card;
  const rect = title.getBoundingClientRect();
  const topbar = document.querySelector('.topbar');
  const offset = (topbar ? topbar.getBoundingClientRect().height : 0) + 14;
  const target = window.scrollY + rect.top - offset;
  if(force){
    window.scrollTo({top: Math.max(0,target), behavior:'smooth'});
    return;
  }
  const delta = Math.abs(rect.top - offset);
  if(delta > 10 && delta < window.innerHeight*0.6){
    window.scrollTo({top: Math.max(0,target), behavior:'smooth'});
  }
}
function showView(v){
  // Se sono già in Allenamento e premo di nuovo il pulsante,
  // torno in cima alla pagina.
  if(
    v === 'active' &&
    document.getElementById('viewActive').style.display !== 'none'
  ){
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    return;
  }

  if(v!=='active') discardReorderIfPending();

  document.getElementById('viewActive').style.display = v==='active' ? '' : 'none';
  document.getElementById('dayTabsActive').style.display = v==='active' ? '' : 'none';
  document.getElementById('viewHist').style.display = v==='hist' ? '' : 'none';
  document.getElementById('viewHome').style.display = v==='home' ? '' : 'none';

  document.getElementById('tabActiveBtn').classList.toggle('active', v==='active');
  document.getElementById('tabHistBtn').classList.toggle('active', v==='hist');

  document.body.classList.toggle('on-home', v==='home');
if(v === 'home'){
  animateSuggestedWorkout();
}
  if(v==='active'){
    activeFirstAnimation = true;

    requestWakeLock();

    autoGrowAllExNames();

  } else {
    releaseWakeLock();
  }
}


// ---------------- SCHERMO SEMPRE ACCESO IN ALLENAMENTO ----------------

let wakeLock = null;

async function requestWakeLock(){
  try{
    if('wakeLock' in navigator){
      wakeLock = await navigator.wakeLock.request('screen');
    }
  }catch(e){}
}


function releaseWakeLock(){
  if(wakeLock){
    wakeLock.release().catch(()=>{});
    wakeLock = null;
  }
}


document.addEventListener('visibilitychange', () => {
  if(
    document.visibilityState === 'visible' &&
    document.getElementById('viewActive').style.display !== 'none'
  ){
    requestWakeLock();
  }
});


// ---------------- RIALINEAMENTO DOPO CHIUSURA TASTIERA ----------------

let lastViewportHeight = window.innerHeight;

window.addEventListener('resize', () => {

  const currentHeight = window.innerHeight;

  if(currentHeight > lastViewportHeight + 100){
    setTimeout(() => {
      trySnapToActiveExercise(true);
    },250);
  }

  lastViewportHeight = currentHeight;
});


function renderDayTabs(){

  const el = document.getElementById('dayTabsActive');

  el.innerHTML = state.days.map((d,i)=>{

    const a = dayAccent(d,i);

    return `
    <button 
      class="day-btn ${i===activeDayIdx?'active':''}" 
      style="--accent:${a.c}" 
      onclick="selectDay(${i})">
      ${escapeHtml(d.name)}
    </button>`;

  }).join('');
}


function selectDay(i){
  discardReorderIfPending();
  activeDayIdx=i;
  activeExerciseIdx=null;
  saveActivePos();
  renderDayTabs();
  renderActive();
}

function askSwitchTrainingDay(newIdx, oldIdx){

  const newDay = state.days[newIdx];
  const oldDay = state.days[oldIdx];


  if(!confirm(
`Vuoi fare "${newDay.name}" al posto di "${oldDay.name}"?

OK = sposta ${oldDay.name} dopo ${newDay.name}
Annulla = fai solo questo allenamento`
  )){
    
    state.currentTrainingDayIdx = newIdx;
    saveState();
    renderHome();
    return;

  }


  const order = [...state.days];

  const moved = order.splice(oldIdx,1)[0];

  const insertPosition = order.findIndex(d=>d.name===newDay.name);

  order.splice(insertPosition+1,0,moved);


  state.weekOrder = order.map(d=>state.days.indexOf(d));

  state.currentTrainingDayIdx = newIdx;


  saveState();

  renderDayTabs();
  renderHome();

}

function confirmSwitchTrainingDay(newIdx, oldIdx){

  const newDay = state.days[newIdx];
  const oldDay = state.days[oldIdx];


  const choice = confirm(
`Oggi era previsto "${oldDay.name}".

Vuoi fare "${newDay.name}" oggi?

OK = cambia allenamento di oggi
Annulla = continua con quello previsto`
  );


  if(!choice){
    renderActive();
    return;
  }


  state.currentTrainingDayIdx = newIdx;

  selectedTrainingOrder = [newIdx];


  state.trainingQueue =
    state.days
    .map((_,i)=>i)
    .filter(i=>i!==newIdx);


  saveState();


  openTrainingOrderModal();

}

// ---------------- FINE GIORNO DI ALLENAMENTO ----------------


function logWorkoutDay(dayIdx){

  console.log("LOG WORKOUT CHIAMATA", dayIdx, state.days[dayIdx].name);

  const day = state.days[dayIdx];

  if(!day) return;


  const a = dayAccent(day, dayIdx);
  const key = todayKey();


  // storico allenamenti
  if(!calendarLog[key]){
    calendarLog[key] = [];
  }


  calendarLog[key].push({
    name: day.name,
    color: a.c
  });


  saveCalendarLog();



  // data inizio programma
  if(!state.programStartDate){

    state.programStartDate = key;

  }



  // giorni completati nella settimana corrente
  if(!state.completedTrainingDays){

    state.completedTrainingDays = [];

  }


  if(!state.completedTrainingDays.includes(dayIdx)){

    state.completedTrainingDays.push(dayIdx);

  }



  // aggiorna la coda allenamenti
  updateTrainingQueueAfterComplete(dayIdx);



  // controllo fine settimana
  const weekCompleted =
    state.completedTrainingDays.length === state.days.length;

console.log("CHECK SETTIMANA", {
  completati: state.completedTrainingDays,
  totali: state.days.length,
  weekCompleted: weekCompleted,
  currentWeek: state.currentWeek
});


  if(weekCompleted){

    advanceProgramWeek();

  }



  checkAchievements();


  saveState();

}


function updateTrainingQueueAfterComplete(dayIdx){

  const totalDays = state.days.length;

  if(!state.trainingQueue || state.trainingQueue.length === 0){

    state.trainingQueue = [];

    for(let i = 0; i < totalDays; i++){
      if(i !== dayIdx){
        state.trainingQueue.push(i);
      }
    }

  } else {

    state.trainingQueue =
      state.trainingQueue.filter(i => i !== dayIdx);

  }


  if(state.trainingQueue.length > 0){

    state.currentTrainingDayIdx = state.trainingQueue[0];

  }
  else{

    state.currentTrainingDayIdx = null;


    // settimana completata
    advanceProgramWeek();

  }


  saveState();

}

function advanceProgramWeek(){

  const maxWeek = (state.weeksPerBlock || 4) - 1;


  if(state.currentWeek < maxWeek){

    state.currentWeek++;

  }

}


function openNextWeekForDay(dayIdx){

  const day = state.days[dayIdx];

  if(!day) return;

  day.esercizi.forEach((ex,exi)=>{

    const nWeeks =
      (ex.recupero && ex.recupero.length) ||
      state.weeksPerBlock ||
      4;


    if(!ex.weekDone)
      ex.weekDone = new Array(nWeeks).fill(false);


    const nextWeek = ex.weekDone.findIndex((done,i)=>{
      return done && i<nWeeks-1 && !ex.weekDone[i+1];
    });


    if(nextWeek!==-1){

      collapsedMap[dayIdx+"_"+exi+"_"+nextWeek]=true;

      collapsedMap[dayIdx+"_"+exi+"_"+(nextWeek+1)]=false;

    }

  });


  saveCollapsed();

}


function forceNextWeekForDay(dayIdx){

  const day = state.days[dayIdx];

  if(!day) return;


  day.esercizi.forEach((ex,exi)=>{


    const nWeeks =
      (ex.recupero && ex.recupero.length) ||
      state.weeksPerBlock ||
      4;


    if(!ex.weekDone)
      ex.weekDone = new Array(nWeeks).fill(false);


    if(!ex.weekSkipped)
      ex.weekSkipped = new Array(nWeeks).fill(false);



    let currentWeek=0;


    for(let i=0;i<nWeeks;i++){

      if(ex.weekDone[i] || ex.weekSkipped[i]){
        currentWeek=i;
      }

    }


    if(currentWeek<nWeeks-1){

      collapsedMap[dayIdx+"_"+exi+"_"+currentWeek]=true;

      collapsedMap[dayIdx+"_"+exi+"_"+(currentWeek+1)]=false;

    }

  });


  saveCollapsed();

}


function allExercisesClosed(day){

  return day.esercizi.every(ex=>{


    const nWeeks =
      (ex.recupero && ex.recupero.length) ||
      state.weeksPerBlock ||
      4;


    if(!ex.weekDone)
      ex.weekDone = new Array(nWeeks).fill(false);


    if(!ex.weekSkipped)
      ex.weekSkipped = new Array(nWeeks).fill(false);


    let currentWeek=0;


    for(let i=0;i<nWeeks;i++){

      if(ex.weekDone[i] || ex.weekSkipped[i]){
        currentWeek=i;
      }

    }


    return ex.weekDone[currentWeek] || ex.weekSkipped[currentWeek];

  });

}


function finishDay(){

  const day = state.days[activeDayIdx];

  openFinishWorkoutModal(activeDayIdx);

}


