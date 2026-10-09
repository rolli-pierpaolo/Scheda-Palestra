let activeDayIdx = 0;
let activeFirstAnimation = true;
let selectedTrainingOrder = [];
const ACTIVE_POS_KEY = "scheda_wo18_active_pos_v1";
let activeExerciseIdx = null;
function setWorkoutTopbarMode(isWorkout){
  const topbar = document.querySelector('.topbar');
  if(!topbar) return;
  topbar.classList.toggle('is-workout-header', !!isWorkout);
  if(!isWorkout) topbar.style.removeProperty('--workout-accent');
}
function saveActivePos(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
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
let topbarScrolled = false;
window.addEventListener('scroll', function(){
  const scrolled = topbarScrolled ? (window.scrollY > 8) : (window.scrollY > 20);
  if(scrolled === topbarScrolled) return;
  topbarScrolled = scrolled;
  const topbarEl = document.querySelector('.topbar');
  if(topbarEl) topbarEl.classList.toggle('topbar-scrolled', scrolled);
  updateTopbarHeightVar();
  setTimeout(updateTopbarHeightVar, 300);
}, {passive:true});
function isDesktopDevice(){
  return window.matchMedia && window.matchMedia('(pointer: coarse)').matches === false;
}
const viewScrollPositions={home:0,active:0,hist:0};
let viewSwitchSequence=0;
function showView(v){
  if(!(v in viewScrollPositions))return;
  const sequence=++viewSwitchSequence;
  const viewIds={active:'viewActive',hist:'viewHist',home:'viewHome'};
  const outgoing=Object.keys(viewIds).find(key=>document.getElementById(viewIds[key]).style.display!=='none');
  if(outgoing===v){
    const visible=document.getElementById(viewIds[v]);
    if(typeof gsap!=='undefined')gsap.killTweensOf(visible);
    visible.style.opacity='';
    return;
  }
  if(outgoing)viewScrollPositions[outgoing]=outgoing==='active'&&typeof quickKeyboardOriginScrollY!=='undefined'&&quickKeyboardOriginScrollY!==null?quickKeyboardOriginScrollY:window.scrollY;

  const applyViewSwitch = () => {
    if(sequence!==viewSwitchSequence)return;
    if(v!=='active' && typeof resetQuickKeyboardUI==='function') resetQuickKeyboardUI();
    if(v!=='active'){
      discardReorderIfPending();
    } else if(!reorderMode){
      updateBlockFinishTab();
    }

    document.getElementById('viewActive').style.display = v==='active' ? '' : 'none';
    document.getElementById('dayTabsActive').style.display = v==='active' ? '' : 'none';
    document.getElementById('viewHist').style.display = v==='hist' ? '' : 'none';
    document.getElementById('viewHome').style.display = v==='home' ? '' : 'none';

    document.getElementById('tabActiveBtn').classList.toggle('active', v==='active');
    document.getElementById('tabHistBtn').classList.toggle('active', v==='hist');
    document.getElementById('tabHomeBtn').classList.toggle('active', v==='home');
    document.getElementById('tabActiveBtn').setAttribute('aria-current', v==='active' ? 'page' : 'false');
    document.getElementById('tabHistBtn').setAttribute('aria-current', v==='hist' ? 'page' : 'false');
    document.getElementById('tabHomeBtn').setAttribute('aria-current', v==='home' ? 'page' : 'false');

    document.body.classList.toggle('on-home', v==='home');
    document.body.classList.toggle('on-progress', v==='hist');
    document.body.classList.toggle('on-workout', v==='active');
    setWorkoutTopbarMode(v==='active');
    const topbarTitle = document.getElementById('topbarTitle');
    const topbarSubtitle = document.getElementById('topbarSubtitle');
    const workoutEdit = document.getElementById('workoutTitleEditBtn');
    const workoutDayPicker = document.getElementById('workoutDayPickerBtn');
    if(v==='active'){
      if(typeof updateWorkoutTopbarTitle==='function') updateWorkoutTopbarTitle();
    } else {
      if(topbarTitle) topbarTitle.innerHTML = '<span class="brand-letter-v">V</span>iridis';
      if(topbarSubtitle) topbarSubtitle.hidden = true;
      if(workoutEdit) workoutEdit.hidden = true;
    }
    if(workoutDayPicker) workoutDayPicker.hidden = v!=='active';
    if(v === 'home'){
      animateSuggestedWorkout();
    }
    if(v === 'hist' && typeof renderProgressOverview === 'function'){
      renderProgressOverview();
    }
    updateThemeColor();
    const accountBtn = document.getElementById('accountBtn');
    if(accountBtn) accountBtn.style.display = v==='active' ? 'none' : '';
    const settingsBtn = document.getElementById('settingsBtn');
    if(settingsBtn) settingsBtn.style.display = v==='active' ? 'none' : '';
    const searchBtn = document.getElementById('searchBtn');
    if(searchBtn) searchBtn.style.display = v==='active' ? 'none' : '';
    if(typeof gsap !== "undefined" && !prefersReducedMotion()){
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
    // Ripristina la posizione della vista dopo il rendering.

    window.scrollTo({top:workoutViewScrollTop(v),behavior:'instant'});
  };

  const outgoingEl = ['viewActive','viewHist','viewHome']
    .map(id => document.getElementById(id))
    .find(el => el && el.style.display !== 'none');

  if(typeof gsap !== "undefined" && outgoingEl && !prefersReducedMotion()){
    gsap.killTweensOf(outgoingEl);
    gsap.to(outgoingEl, {opacity:0, duration:.12, ease:"power1.in"});
    setTimeout(applyViewSwitch, 120);
  } else {
    applyViewSwitch();
  }
}



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


function updateThemeColor(){
  const meta = document.querySelector('meta[name="theme-color"]');
  if(!meta) return;
  const isLight = document.body.classList.contains('theme-light');
  const onActive = document.getElementById('viewActive').style.display !== 'none';
  if(onActive && state && state.days && state.days[activeDayIdx]){
    meta.setAttribute('content', isLight ? '#F4F6F1' : dayAccent(state.days[activeDayIdx], activeDayIdx).d);
  } else {
    meta.setAttribute('content', isLight ? '#F4F6F1' : '#0D0D0D');
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




function anyModalOpen(){
  return Array.prototype.some.call(document.querySelectorAll('.modal-overlay'), el => el.style.display === 'flex');
}
let exSwipeStartX = null, exSwipeStartY = null, exSwipeStartTime = 0;
function onExerciseSwipeStart(e){
  if(isDesktopDevice()){ exSwipeStartX = null; return; }
  if(document.getElementById('viewActive').style.display === 'none' || anyModalOpen()){ exSwipeStartX = null; return; }
  if(e.target.closest('.day-ex-strip, .ex-jump-index, .ex-carousel-nav, .stepper-pair, input, textarea')){ exSwipeStartX = null; return; }
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
  if(dt > 600) return;
  if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.8) return;
  const day = state.days[activeDayIdx];
  if(!day) return;
  const progress = computeDayProgress(day);
  if(!progress.items.length) return;
  const activeItem = progress.items.find(it => it.exi===activeExerciseIdx) || progress.items[0];
  const activePos = activeItem.pos;
  if(dx < 0 && activePos < progress.total){
    goToExerciseSlide(progress.items[activePos].exi);
  } else if(dx > 0 && activePos > 1){
    goToExerciseSlide(progress.items[activePos-2].exi);
  }
}

function renderDayTabs(){

  const el = document.getElementById('dayTabsActive');

  const dayButtonsHtml = state.days.map((d,i)=>{

    const a = dayAccent(d,i);

    return `
    <button
      class="day-btn ${i===activeDayIdx?'active':''}"
      style="--accent:${a.c}"
      onclick="selectDay(${i})">
      ${escapeHtml(d.name)}
    </button>`;

  }).join('');

  el.innerHTML = dayButtonsHtml + `
    <button class="block-finish-btn" onclick="document.getElementById('dayTabsActive').classList.remove('workout-day-tabs-open');openDayManagementMenu()">Opzioni giornata</button>
    <button id="blockFinishTab" class="block-finish-btn" onclick="openBlockCompletionFlow()" title="Gestisci, archivia o prolunga la scheda" aria-label="Gestisci, archivia o prolunga la scheda">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M4.5 8.5 V18.5 A1 1 0 0 0 5.5 19.5 H18.5 A1 1 0 0 0 19.5 18.5 V8.5"/><path d="M10 12.5 H14"/></svg>
      <span class="block-finish-label">Gestisci scheda</span>
    </button>`;

  updateBlockFinishTab();
}

function toggleWorkoutDayPicker(){
  const tabs = document.getElementById('dayTabsActive');
  if(tabs) tabs.classList.toggle('workout-day-tabs-open');
}


function selectDay(i){
  discardReorderIfPending();
  const tabs = document.getElementById('dayTabsActive');
  if(tabs) tabs.classList.remove('workout-day-tabs-open');
  activeDayIdx=i;
  activeExerciseIdx=null;
  saveActivePos();
  renderDayTabs();
  renderActive();
  updateThemeColor();
}
function goToActiveTab(){
  const activeDay = state.days[activeDayIdx];
  const hasRealSession = workoutInProgress && dayHasRealProgressThisWeek(activeDay);
  if(!hasRealSession){
    if(workoutInProgress) clearWorkoutSession();
    const suggested = computeSuggestedDayIdx();
    if(state.days[suggested] && suggested !== activeDayIdx){
      selectDay(suggested);
    }
  }
  showView('active');
}

async function askSwitchTrainingDay(newIdx, oldIdx){

  const newDay = state.days[newIdx];
  const oldDay = state.days[oldIdx];


  if(!await ViridisOptionPicker({title:"Cambia giornata", message:`Vuoi fare "${newDay.name}" al posto di "${oldDay.name}"?`, cancelLabel:"Solo questo allenamento", cancelValue:false, choices:[{label:`Sposta ${oldDay.name} dopo ${newDay.name}`, value:true}, {label:"Fai solo questo allenamento", value:false}]})){
    
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

async function confirmSwitchTrainingDay(newIdx, oldIdx){

  const newDay = state.days[newIdx];
  const oldDay = state.days[oldIdx];


  const choice = await ViridisOptionPicker({title:"Allenamento di oggi", message:`Oggi era previsto "${oldDay.name}". Vuoi fare "${newDay.name}" oggi?`, cancelLabel:"Continua con quello previsto", cancelValue:false, choices:[{label:`Allenati: ${newDay.name}`, value:true}, {label:`Continua: ${oldDay.name}`, value:false}]});


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



function logWorkoutDay(dayIdx){
  captureWorkoutSession(dayIdx);

  const day = state.days[dayIdx];

  if(!day) return;


  const a = dayAccent(day, dayIdx);
  const key = todayKey();


  if(!calendarLog[key]){
    calendarLog[key] = [];
  }


  calendarLog[key].push({
    name: day.name,
    color: a.c
  });


  saveCalendarLog();



  if(!state.programStartDate){

    state.programStartDate = key;

  }



  if(!state.completedTrainingDays){

    state.completedTrainingDays = [];

  }


  if(!state.completedTrainingDays.includes(dayIdx)){

    state.completedTrainingDays.push(dayIdx);

  }



  updateTrainingQueueAfterComplete(dayIdx);



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

    advanceProgramWeek();
    state.trainingQueue = state.days.map((_,i)=>i);
    state.currentTrainingDayIdx = state.trainingQueue.length ? state.trainingQueue[0] : null;

  }


  saveState();

}

function getWeeklyCompletedDays(){
  return state.completedTrainingDays || [];
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


function allExercisesClosed(day){
  const w = state.currentWeek || 0;
  return day.esercizi.every(ex=>{
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    if(!ex.weekDone) ex.weekDone = new Array(nWeeks).fill(false);
    if(!ex.weekSkipped) ex.weekSkipped = new Array(nWeeks).fill(false);
    if(w >= nWeeks) return true;
    return ex.weekDone[w] || ex.weekSkipped[w];
  });
}

function computeCurrentDoingExerciseIdx(dayIdx){
  const day = state.days[dayIdx];
  if(!day || !day.esercizi.length) return null;
  const w = state.currentWeek || 0;
  for(let i=0;i<day.esercizi.length;i++){
    const ex = day.esercizi[i];
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    if(w >= nWeeks) continue;
    const done = (ex.weekDone && ex.weekDone[w]) || (ex.weekSkipped && ex.weekSkipped[w]);
    if(!done) return i;
  }
  return day.esercizi.length - 1;
}
