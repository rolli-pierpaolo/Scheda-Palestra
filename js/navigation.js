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
// pointerdown da solo scattava anche quando il dito toccava per sbaglio una
// card diversa proprio nell'istante in cui iniziava uno scroll: quella card
// diventava "attiva" senza che l'utente volesse davvero interagirci, e poi lo
// scroll magnetico ce lo riportava sopra. Ora si aspetta il pointerup e si
// controlla che il dito non si sia spostato (un vero tocco fermo, tipo su uno
// stepper o la spunta, non l'inizio di un trascinamento/scroll)
let _pdX = null, _pdY = null, _pdTarget = null;
document.getElementById('viewActive').addEventListener('pointerdown', (e)=>{
  _pdX = e.clientX; _pdY = e.clientY; _pdTarget = e.target;
}, {passive:true});
document.getElementById('viewActive').addEventListener('pointerup', (e)=>{
  if(_pdX === null) return;
  const dx = Math.abs(e.clientX - _pdX), dy = Math.abs(e.clientY - _pdY);
  const target = _pdTarget;
  _pdX = null; _pdY = null; _pdTarget = null;
  if(dx > 10 || dy > 10) return;
  trackActiveExercise({target});
}, {passive:true});

// ---------------- SCROLL "MAGNETICO" SULL'ESERCIZIO ATTIVO ----------------
// se sto lavorando su un esercizio e scrollo per sbaglio di poco, quando smetto
// di scrollare la pagina si ri-centra su quell'esercizio. Se invece lo scroll e'
// grande (mi sono spostato apposta a guardare altro) non tocca nulla.
let scrollSnapTimer = null;
window.addEventListener('scroll', function(){
  clearTimeout(scrollSnapTimer);
  scrollSnapTimer = setTimeout(trySnapToActiveExercise, 550);
}, {passive:true});
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
  // il bersaglio e' l'ultimo esercizio TOCCATO davvero (activeExerciseIdx) -
  // NON il primo ancora da fare in ordine (era stato provato con
  // computeCurrentDoingExerciseIdx, ma cosi' chi lavora fuori ordine - es.
  // salta all'esercizio 4 senza aver ancora chiuso l'1 - si ritrovava lo
  // scroll magnetico che lo tirava indietro sull'1 a ogni pausa, un
  // "combattimento" avanti/indietro con l'utente). Il caso "ho appena finito
  // l'esercizio 1 e scrollo verso il 2" resta gia' coperto SENZA bisogno di
  // questo: toggleWeekDone/toggleWeekSkipped aggiornano gia' da soli
  // activeExerciseIdx al prossimo esercizio appena segni completata/saltata
  const targetExi = activeExerciseIdx;
  // data-exi2 e' il partner in una coppia collegata (super set/jump set): un
  // riferimento salvato prima di collegare due esercizi potrebbe puntare a
  // quello che ora e' "il secondo" della coppia, che non ha un suo data-exi
  const card = document.querySelector('#viewActive .card[data-exi="'+targetExi+'"], #viewActive .card[data-exi2="'+targetExi+'"]');
  if(!card) return;
  // il nome esercizio resta sempre visibile grazie all'header sticky (vedi
  // .ex-sticky-header), quindi non serve piu' allineare in cima alla card:
  // ci si allinea direttamente alla settimana CORRENTE, quella su cui si sta
  // davvero lavorando. Fallback sulla card intera se per qualche motivo la
  // settimana corrente non si trova (es. tutte le settimane gia' finite)
  const wrap = card.closest('.ex-card-wrap') || card;
  const currentWeekBtn = card.querySelector('.week-toggle.current-week');
  const title = (currentWeekBtn && currentWeekBtn.closest('.week-block')) || card;
  const rect = title.getBoundingClientRect();
  const topbar = document.querySelector('.topbar');
  const stickyHeader = wrap.querySelector('.ex-sticky-header');
  const offset = (topbar ? topbar.getBoundingClientRect().height : 0) + (stickyHeader ? stickyHeader.getBoundingClientRect().height : 0) + 14;
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


// ---------------- SWIPE TRA ALLENAMENTO E STORICO ----------------
// pensato per il telefono, come lo scroll magnetico qui sopra: su desktop non
// c'e' un vero "swipe" col mouse, e li' il drag serve per altro (selezionare
// testo), quindi resta disattivo
function anyModalOpen(){
  return Array.prototype.some.call(document.querySelectorAll('.modal-overlay'), el => el.style.display === 'flex');
}
let swipeStartX = null, swipeStartY = null, swipeStartTime = 0;
function onTabSwipeStart(e){
  if(isDesktopDevice()){ swipeStartX = null; return; }
  const onActive = document.getElementById('viewActive').style.display !== 'none';
  const onHist = document.getElementById('viewHist').style.display !== 'none';
  if((!onActive && !onHist) || anyModalOpen()){ swipeStartX = null; return; }
  // niente swipe se il tocco parte da una zona che scrolla gia' in orizzontale
  // per conto suo (tab dei giorni), da uno stepper +/-, o da un campo di testo
  // (dove trascinare serve a selezionare/spostare il cursore): altrimenti i due
  // gesti confliggerebbero
  if(e.target.closest('.day-tabs, .stepper-pair, input, textarea')){ swipeStartX = null; return; }
  const t = e.touches[0];
  swipeStartX = t.clientX; swipeStartY = t.clientY; swipeStartTime = Date.now();
}
function onTabSwipeEnd(e){
  if(swipeStartX === null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStartX;
  const dy = t.clientY - swipeStartY;
  const dt = Date.now() - swipeStartTime;
  swipeStartX = null;
  if(dt > 600) return; // troppo lento, non e' uno swipe deciso
  if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.8) return; // poco orizzontale o troppo verticale
  const onActive = document.getElementById('viewActive').style.display !== 'none';
  const target = dx < 0 ? 'hist' : 'active'; // swipe a sinistra = avanti (Storico), a destra = indietro (Allenamento)
  const current = onActive ? 'active' : 'hist';
  if(target !== current) showView(target);
}
document.addEventListener('touchstart', onTabSwipeStart, {passive:true});
document.addEventListener('touchend', onTabSwipeEnd, {passive:true});

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
// fatti resta sull'ultimo, cosi' c'e' sempre un bersaglio valido per lo
// scroll magnetico (vedi trySnapToActiveExercise) invece di uno sganciato
// dall'esercizio davvero in corso
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


