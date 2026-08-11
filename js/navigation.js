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
// "titolo grande" che si restringe scorrendo, come le app native iOS
// (Impostazioni, Mail...): solo un cambio di classe qui, il resto lo fa la
// transizione CSS gia' pronta su .topbar/.topbar h1. --topbar-h (l'altezza
// usata per posizionare l'header sticky di ogni esercizio subito sotto,
// vedi updateTopbarHeightVar in js/app-init.js) va ricalcolata quando la
// topbar cambia altezza, altrimenti l'header sticky resterebbe posizionato
// in base all'altezza vecchia - solo quando lo stato CAMBIA davvero (non a
// ogni scroll), sia subito che a transizione finita (300ms dopo)
let topbarScrolled = false;
window.addEventListener('scroll', function(){
  const scrolled = window.scrollY > 20;
  if(scrolled === topbarScrolled) return;
  topbarScrolled = scrolled;
  const topbarEl = document.querySelector('.topbar');
  if(topbarEl) topbarEl.classList.toggle('topbar-scrolled', scrolled);
  updateTopbarHeightVar();
  setTimeout(updateTopbarHeightVar, 300);
}, {passive:true});
// pensato per il telefono (il pollice puo' far scrollare per sbaglio mentre si
// tiene in mano): su PC, dove lo scroll e' sempre volontario (mouse/tastiera),
// un salto automatico della pagina e' solo fastidioso, quindi li' resta disattivo
function isDesktopDevice(){
  return window.matchMedia && window.matchMedia('(pointer: coarse)').matches === false;
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

  const applyViewSwitch = () => {
    if(v!=='active'){
      discardReorderIfPending();
      const floatBtn = document.getElementById('floatingFinishBtn');
      if(floatBtn) floatBtn.style.display = 'none';
    } else if(!reorderMode){
      updateFloatingFinishBtn();
    }

    document.getElementById('viewActive').style.display = v==='active' ? '' : 'none';
    document.getElementById('dayTabsActive').style.display = v==='active' ? '' : 'none';
    document.getElementById('viewHist').style.display = v==='hist' ? '' : 'none';
    document.getElementById('viewHome').style.display = v==='home' ? '' : 'none';

    document.getElementById('tabActiveBtn').classList.toggle('active', v==='active');
    document.getElementById('tabHistBtn').classList.toggle('active', v==='hist');
    document.getElementById('tabHomeBtn').classList.toggle('active', v==='home');

    document.body.classList.toggle('on-home', v==='home');
    if(v === 'home'){
      animateSuggestedWorkout();
    }
    updateThemeColor();
    // fade + leggero rialzo sulla vista che diventa visibile: il cambio vero e
    // proprio resta il display toggle sincrono qui sopra (nessun timing da cui
    // dipende il resto della funzione cambia), e' solo un'entrata piu' morbida
    // al posto dello scatto secco
    if(typeof gsap !== "undefined"){
      const shownEl = v==='active' ? document.getElementById('viewActive')
        : v==='hist' ? document.getElementById('viewHist')
        : document.getElementById('viewHome');
      if(shownEl){
        shownEl.style.opacity = '';
        gsap.killTweensOf(shownEl);
        gsap.from(shownEl, {opacity:0, y:10, duration:.28, ease:"power2.out"});
      }
    }
    if(v==='active'){
      activeFirstAnimation = true;

      requestWakeLock();

      autoGrowAllExNames();
      autoGrowAllExSchema();

    } else {
      releaseWakeLock();
    }
  };

  // dissolvenza incrociata: se una vista e' gia' visibile la sfumo via PRIMA
  // di scambiarla con la nuova, cosi' il cambio non e' piu' un taglio secco
  // (nascondi-e-basta) ma un vero cross-fade tra le due schermate
  const outgoingEl = ['viewActive','viewHist','viewHome']
    .map(id => document.getElementById(id))
    .find(el => el && el.style.display !== 'none');

  if(typeof gsap !== "undefined" && outgoingEl){
    gsap.killTweensOf(outgoingEl);
    gsap.to(outgoingEl, {opacity:0, duration:.12, ease:"power1.in"});
    // lo scambio vero e proprio parte da un timer, non da onComplete del tween:
    // se il tab e' in background (o comunque il rAF di gsap non gira) il
    // callback dell'animazione puo' non scattare mai, lasciando l'app bloccata
    // sulla schermata vecchia per sempre. Il timer invece scatta sempre
    setTimeout(applyViewSwitch, 120);
  } else {
    applyViewSwitch();
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


// ---------------- COLORE BARRA DI STATO (theme-color) ----------------
// segue l'accent del giorno mentre si e' in Allenamento (variante scura,
// per restare coerente con il tema scuro dell'app invece di un colore
// acceso), torna neutro su Home/Storico. Ha effetto solo quando l'app gira
// dentro Safari/Chrome (tab normale o barra degli indirizzi tintata): da
// app installata a schermo intero su iOS la barra di stato segue invece
// apple-mobile-web-app-status-bar-style, che supporta solo pochi stili
// fissi e non un colore qualsiasi
function updateThemeColor(){
  const meta = document.querySelector('meta[name="theme-color"]');
  if(!meta) return;
  const onActive = document.getElementById('viewActive').style.display !== 'none';
  if(onActive && state && state.days && state.days[activeDayIdx]){
    meta.setAttribute('content', dayAccent(state.days[activeDayIdx], activeDayIdx).d);
  } else {
    meta.setAttribute('content', '#0D0D0D');
  }
}


// ---------------- BADGE SULL'ICONA (Home Screen) ----------------
// mostra a colpo d'occhio, senza aprire l'app, quanti esercizi restano nel
// giorno che l'app sta suggerendo (state.currentTrainingDayIdx, lo stesso
// usato dalla Home). Richiamata da saveState() cosi' resta sempre allineata
// senza doverla richiamare a mano a ogni punto che cambia lo stato
function updateAppBadge(){
  if(!('setAppBadge' in navigator)) return;
  const dayIdx = state.currentTrainingDayIdx;
  const day = (dayIdx !== null && dayIdx !== undefined) ? state.days[dayIdx] : null;
  if(!day){ navigator.clearAppBadge().catch(()=>{}); return; }
  const progress = computeDayProgress(day);
  const remaining = progress.total - progress.done;
  if(remaining > 0){
    navigator.setAppBadge(remaining).catch(()=>{});
  } else {
    navigator.clearAppBadge().catch(()=>{});
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




// ---------------- SWIPE TRA ESERCIZI (carosello Allenamento) ----------------
// stesso pattern gia' collaudato in questa app per lo swipe tra schede (misura
// dx/dy/dt su touchstart/touchend, richiede un gesto abbastanza orizzontale e
// abbastanza veloce prima di considerarlo uno swipe vero, non un semplice
// scroll verticale) - qui pero' cambia esercizio DENTRO Allenamento invece di
// cambiare scheda. Lo swipe Allenamento<->Storico che c'era prima e' stato
// tolto apposta: sulla stessa vista i due gesti confliggerebbero
function anyModalOpen(){
  return Array.prototype.some.call(document.querySelectorAll('.modal-overlay'), el => el.style.display === 'flex');
}
let exSwipeStartX = null, exSwipeStartY = null, exSwipeStartTime = 0;
function onExerciseSwipeStart(e){
  if(isDesktopDevice()){ exSwipeStartX = null; return; }
  if(document.getElementById('viewActive').style.display === 'none' || anyModalOpen()){ exSwipeStartX = null; return; }
  // niente swipe se il tocco parte da una zona che gestisce gia' un gesto suo
  // (indice a pallini scorrevole, stepper +/-, un campo di testo dove
  // trascinare serve a spostare il cursore): altrimenti confliggerebbero
  if(e.target.closest('.ex-jump-index, .ex-carousel-nav, .stepper-pair, input, textarea')){ exSwipeStartX = null; return; }
  const t = e.touches[0];
  exSwipeStartX = t.clientX; exSwipeStartY = t.clientY; exSwipeStartTime = Date.now();
}
function onExerciseSwipeEnd(e){
  if(exSwipeStartX === null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - exSwipeStartX;
  const dy = t.clientY - exSwipeStartY;
  const dt = Date.now() - exSwipeStartTime;
  exSwipeStartX = null;
  if(dt > 600) return; // troppo lento, non e' uno swipe deciso
  if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.8) return; // poco orizzontale o troppo verticale
  const day = state.days[activeDayIdx];
  if(!day) return;
  const progress = computeDayProgress(day);
  if(!progress.items.length) return;
  const activeItem = progress.items.find(it => it.exi===activeExerciseIdx) || progress.items[0];
  const activePos = activeItem.pos;
  if(dx < 0 && activePos < progress.total){
    goToExerciseSlide(progress.items[activePos].exi); // swipe a sinistra = avanti
  } else if(dx > 0 && activePos > 1){
    goToExerciseSlide(progress.items[activePos-2].exi); // swipe a destra = indietro
  }
}
document.addEventListener('touchstart', onExerciseSwipeStart, {passive:true});
document.addEventListener('touchend', onExerciseSwipeEnd, {passive:true});

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
  updateThemeColor();
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

    // settimana completata: si avanza (azzera anche completedTrainingDays)
    // e si fa ripartire subito la coda per la settimana nuova, altrimenti
    // trainingQueue restava vuota e currentTrainingDayIdx restava null per
    // sempre - nessuna card risultava piu' "quella corrente" da far lampeggiare
    // in Home, anche dopo aver ricominciato davvero a allenarsi
    advanceProgramWeek();
    state.trainingQueue = state.days.map((_,i)=>i);
    state.currentTrainingDayIdx = state.trainingQueue.length ? state.trainingQueue[0] : null;

  }


  saveState();

}

// elenco dei giorni gia' completati questa settimana: usata da
// openTrainingOrderModal (js/animations.js) per sapere quali giorni sono
// gia' "bloccati" nella lista di pianificazione
function getWeeklyCompletedDays(){
  return state.completedTrainingDays || [];
}

// nota: advanceProgramWeek() vive in js/animations.js (versione piu' completa,
// tiene traccia anche di completedWeeks) - non ridefinirla anche qui: due
// funzioni con lo stesso nome in file diversi si sovrascrivono silenziosamente
// (vince l'ultimo script caricato), facile perdere di vista quale sia quella
// vera

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


// richiude la settimana appena conclusa (solo per gli esercizi di QUESTO
// giorno, non tutti gli altri giorni) e apre di default quella successiva -
// "w" e' la vera settimana del programma (state.currentWeek, catturata da
// confirmFinishWorkout PRIMA che possa gia' essere avanzata), non piu'
// indovinata riscansionando weekDone/weekSkipped esercizio per esercizio:
// quella scansione poteva individuare una settimana diversa da quella vera
// del programma se un esercizio non era ancora stato toccato questa
// settimana (stesso tipo di bug gia' risolto altrove in allExercisesClosed)
function forceNextWeekForDay(dayIdx, w){

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


    if(w<nWeeks-1){

      collapsedMap[dayIdx+"_"+exi+"_"+w]=true;

      collapsedMap[dayIdx+"_"+exi+"_"+(w+1)]=false;

    }

  });


  saveCollapsed();

}


// usata dal bottone flottante "Giorno terminato" (vedi updateFloatingFinishBtn
// in js/exercise-card.js): controlla la VERA settimana corrente del programma
// (state.currentWeek), la stessa che usa exerciseCard() per decidere cosa
// mostrare aperto. Prima si inferiva una "settimana corrente" per esercizio
// cercando l'ultimo indice segnato fatto/saltato: a inizio settimana nuova,
// prima di toccare qualsiasi esercizio, quell'indice restava fermo
// sull'ultima settimana GIA' completata (es. la 1), che risultava "chiusa"
// per definizione - il bottone compariva subito, anche senza aver ancora
// fatto nulla della settimana vera
function allExercisesClosed(day){
  const w = state.currentWeek || 0;
  return day.esercizi.every(ex=>{
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    if(!ex.weekDone) ex.weekDone = new Array(nWeeks).fill(false);
    if(!ex.weekSkipped) ex.weekSkipped = new Array(nWeeks).fill(false);
    if(w >= nWeeks) return true; // esercizio con meno settimane del blocco corrente: gia' "esaurito"
    return ex.weekDone[w] || ex.weekSkipped[w];
  });
}

// il primo esercizio del giorno (nell'ordine in cui sono elencati, cioe'
// l'ordine di esecuzione) che non risulta ancora completato/saltato per la
// settimana corrente - quello che si "sta svolgendo" ora. Se sono gia' tutti
// fatti resta sull'ultimo, cosi' c'e' sempre una slide di default valida per
// il carosello (vedi resolveActiveExerciseIdx in js/exercise-card.js) invece
// di una sganciata dall'esercizio davvero in corso
function computeCurrentDoingExerciseIdx(dayIdx){
  const day = state.days[dayIdx];
  if(!day || !day.esercizi.length) return null;
  const w = state.currentWeek || 0;
  for(let i=0;i<day.esercizi.length;i++){
    const ex = day.esercizi[i];
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    if(w >= nWeeks) continue; // esaurito: non e' questo il punto dove sono rimasto
    const done = (ex.weekDone && ex.weekDone[w]) || (ex.weekSkipped && ex.weekSkipped[w]);
    if(!done) return i;
  }
  return day.esercizi.length - 1;
}


function finishDay(){

  const day = state.days[activeDayIdx];

  openFinishWorkoutModal(activeDayIdx);

}


