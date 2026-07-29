let activeDayIdx = 0;
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
  if(v!=='active') discardReorderIfPending();
  document.getElementById('viewActive').style.display = v==='active' ? '' : 'none';
  document.getElementById('dayTabsActive').style.display = v==='active' ? '' : 'none';
  document.getElementById('viewHist').style.display = v==='hist' ? '' : 'none';
  document.getElementById('viewHome').style.display = v==='home' ? '' : 'none';
  document.getElementById('tabActiveBtn').classList.toggle('active', v==='active');
  document.getElementById('tabHistBtn').classList.toggle('active', v==='hist');
  // in Home il titolo si vede piu' grande (e' la schermata dove ha senso che
  // si legga bene il nome dell'app), nelle altre viste resta piccolo e discreto
  document.body.classList.toggle('on-home', v==='home');
  if(v==='active'){
    requestWakeLock();
    // renderActive() (che chiama autoGrowAllExNames) puo' essere girato mentre
    // la vista era ancora display:none (es. al primo avvio, o arrivando dalla
    // Home): scrollHeight di un elemento nascosto e' 0, quindi l'altezza delle
    // textarea nome esercizio veniva calcolata sbagliata e restavano strette
    // finche' non si ridisegnava la pagina un'altra volta da visibile. Ricalcola
    // qui, ora che la vista e' sicuramente visibile
    autoGrowAllExNames();
  } else {
    releaseWakeLock();
  }
}

// ---------------- SCHERMO SEMPRE ACCESO IN ALLENAMENTO ----------------
// mentre sei sulla tab Allenamento (mani impegnate/sudate) il telefono non deve
// bloccarsi da solo. Se il browser non supporta la Wake Lock API (o nega il
// permesso) non succede nulla di grave, semplicemente il telefono si blocchera'
// come sempre - percio' il try/catch silenzioso
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
// il wake lock si "libera" da solo quando la tab va in background (schermata Home,
// cambio app...): quando si torna a guardare la pagina e siamo ancora su
// Allenamento va richiesto di nuovo
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible' && document.getElementById('viewActive').style.display !== 'none'){
    requestWakeLock();
  }
});

function renderDayTabs(){
  const el = document.getElementById('dayTabsActive');
  el.innerHTML = state.days.map((d,i)=>{
    const a = dayAccent(d, i);
    return `<button class="day-btn ${i===activeDayIdx?'active':''}" style="--accent:${a.c}" onclick="selectDay(${i})">${escapeHtml(d.name)}</button>`;
  }).join('');
}
function selectDay(i){ discardReorderIfPending(); activeDayIdx=i; activeExerciseIdx=null; saveActivePos(); renderDayTabs(); renderActive(); }

// ---------------- FINE GIORNO DI ALLENAMENTO ----------------
// registra nel calendario che oggi e' stato fatto questo giorno (Push/Pull/Legs...)
// e passa in automatico al giorno successivo nell'ordine delle tab, tornando al
// primo dopo l'ultimo
function logWorkoutDay(dayIdx){
  const day = state.days[dayIdx];
  if(!day) return;
  const a = dayAccent(day, dayIdx);
  const key = todayKey();
  if(!calendarLog[key]) calendarLog[key] = [];
  calendarLog[key].push({name: day.name, color: a.c});
  saveCalendarLog();
  // primissimo "Giorno terminato" mai premuto (utente nuovo, o dati vecchi che
  // non avevano ancora questo campo): il blocco attivo parte ufficialmente da
  // oggi, il giorno vero del primo allenamento, non da una stima
  if(!state.programStartDate){
    state.programStartDate = key;
    saveState();
  }
}
function finishDay(){
  const day = state.days[activeDayIdx];
  if(!confirm(`Segnare "${day.name}" come terminato oggi?`)) return;
  discardReorderIfPending();
  logWorkoutDay(activeDayIdx);
  activeDayIdx = (activeDayIdx+1) % state.days.length;
  activeExerciseIdx = null;
  saveActivePos();
  // la sessione e' conclusa: si torna subito alla Home (non ha senso restare
  // sulla scheda esercizi, ne' passare dritti al giorno dopo, "tanto e' finito")
  workoutInProgress = false;
  saveWorkoutInProgress();
  renderDayTabs();
  renderActive();
  showHome();
}

