function animateSuggestedWorkout(){

  if(typeof gsap === "undefined" || prefersReducedMotion()) return;

  const btn=document.querySelector(".home-suggested-btn");

  if(!btn) return;

  gsap.killTweensOf(btn);

  gsap.set(btn, {clearProps:"transform,opacity,boxShadow"});
  gsap.fromTo(btn,
    { opacity:0, y:20, scale:.95 },
    {
      opacity:1,
      y:0,
      scale:1,
      duration:.38,
      ease:"power3.out"
    }
  );

}


function animateWorkoutComplete(){

  const el = document.getElementById("workoutCompleteFx");

  if(!el) return;

  el.innerHTML = `
    <div class="workout-pop">
       +1 WORKOUT COMPLETATO! ${ICON_FLAME}
    </div>
  `;


  gsap.fromTo(
    ".workout-pop",
    {
      opacity:0,
      y:40,
      scale:.5
    },
    {
      opacity:1,
      y:-80,
      scale:1.15,
      duration:.7,
      ease:"back.out(1.8)",
      onComplete(){

        gsap.to(".workout-pop",{
          opacity:0,
          y:-130,
          duration:.5,
          onComplete(){
            el.innerHTML="";
          }
        });

      }
    }
  );

}




function openFinishWorkoutModal(dayIdx){

  const day = state.days[dayIdx];

  if(!day) return;

const incomplete = day.esercizi.length > 0 && !allExercisesClosed(day);

  const accent = dayAccent(day, dayIdx).c;


  const nextIdx = (dayIdx + 1) % state.days.length;
  const nextDay = state.days[nextIdx];

  const nextAccent = dayAccent(nextDay, nextIdx).c;


  const body = document.getElementById("finishWorkoutBody");

  const stats = computeDaySessionStats(day);
  const recapHtml = stats.setsCount>0 ? `
    <div class="finish-recap">
      <div class="finish-recap-stat"><span class="finish-recap-num">${stats.setsCount}</span><span class="finish-recap-label">serie</span></div>
      <div class="finish-recap-stat"><span class="finish-recap-num">${stats.volume.toLocaleString('it-IT')}</span><span class="finish-recap-label">kg volume</span></div>
      <div class="finish-recap-stat"><span class="finish-recap-num">${stats.durationMins}'</span><span class="finish-recap-label">durata</span></div>
      ${sessionPRs.length ? `<div class="finish-recap-stat"><span class="finish-recap-num">${sessionPRs.length}</span><span class="finish-recap-label">record</span></div>` : ''}
    </div>
    ${sessionPRs.length ? `<div class="finish-recap-prs">${ICON_PLATE} ${sessionPRs.map(p=>escapeHtml(p.name)+(p.weight!=null?' '+String(p.weight).replace('.',',')+'kg':'')).join(' · ')}</div>` : ''}
  ` : '';

  body.innerHTML = `

    <div class="finish-title-row">
      ${incomplete ? ICON_WARNING : ICON_TROPHY}
      <span class="finish-title-text">${incomplete ? "Attenzione" : "Grande!"}</span>
    </div>

<div class="finish-subtitle">
  ${
    incomplete
    ? "Alcuni esercizi non risultano completati.<br>Vuoi comunque terminare?"
    : "Allenamento completato"
  }
</div>

    ${recapHtml}

    <div class="finish-day-transition">
      <span class="finish-day-pill" style="--accent:${accent}">${escapeHtml(day.name)}</span>
      <span class="finish-arrow">→</span>
      <span class="finish-day-pill" style="--accent:${nextAccent}">${escapeHtml(nextDay.name)}</span>
    </div>

    <div class="finish-buttons">

      <button class="add-ex small2"
      onclick="closeFinishWorkoutModal()">
        Annulla
      </button>


      <button class="finish-confirm-btn" style="--accent:${nextAccent}"
      onclick="confirmFinishWorkout(${dayIdx})">
  ${
    incomplete
    ? "Passa comunque →"
    : "Continua →"
  }
</button>

    </div>

  `;


  const modal = document.getElementById("finishWorkoutModal");


  modal.style.display="flex";


  gsap.fromTo(
    "#finishWorkoutModal .finish-modal",
    { y:20, opacity:0, scale:.96 },
    { y:0, opacity:1, scale:1, duration:.32, ease:"power3.out" }
  );

}

function openTrainingOrderModal(){

  const body = document.getElementById("trainingOrderBody");



  const completedDays = getWeeklyCompletedDays();
  if(completedDays.length >= state.days.length){

  closeTrainingOrderModal();
  return;

}


  const remainingDays = state.days
  .map((_,i)=>i)
  .filter(i => !completedDays.includes(i));


  function render(){

    let number = completedDays.length + 1;


    body.innerHTML = `

      <div class="finish-title">
        ${ICON_CYCLE} Pianifica i prossimi allenamenti
      </div>


      <div class="finish-subtitle">

  Hai completato
  <b>${completedDays.length}/${state.days.length}</b> allenamenti questa settimana.<br><br>

  I giorni già completati sono bloccati ${ICON_CHECK}<br>
  Tocca i prossimi allenamenti per scegliere l'ordine.

</div>


      <div class="training-order-list">


      ${
        state.days.map((day,i)=>{


          const completed = completedDays.includes(i);


          const selected = selectedTrainingOrder.indexOf(i);


          if(completed){

            return `

            <div class="training-order-item selected">

              <span class="order-number">
                ${completedDays.indexOf(i)+1}
              </span>

              <span>
                ${escapeHtml(day.name)}
              </span>

              ${ICON_CHECK}

            </div>

            `;

          }


          if(!remainingDays.includes(i)){
            return '';
          }


          return `

          <button
          class="training-order-item ${selected!==-1?'selected':''}"
          onclick="selectTrainingOrder(${i})">


            <span class="order-number">

            ${
              selected!==-1
              ? completedDays.length + selected + 1
              : ''
            }

            </span>


            <span>
              ${escapeHtml(day.name)}
            </span>


          </button>

          `;


        }).join('')

      }


      </div>


      <div class="finish-buttons">


        <button class="add-ex small2"
        onclick="closeTrainingOrderModal()">
          Annulla
        </button>


        <button class="add-ex small2"
onclick="confirmTrainingOrder()"
${
  selectedTrainingOrder.length !== remainingDays.length
  ? 'disabled'
  : ''
}>

${
  selectedTrainingOrder.length === 0
    ? ICON_POINT+' Seleziona l’ordine'
    :
  selectedTrainingOrder.length !== remainingDays.length
    ? `${ICON_POINT} Ancora ${remainingDays.length - selectedTrainingOrder.length} da scegliere`
    :
    ICON_CHECK+' Conferma ordine'
}

</button>


      </div>

    `;

  }


  render();


  const modal=document.getElementById("trainingOrderModal");

  modal.style.display="flex";


  gsap.fromTo(
    ".finish-modal",
    {
      y:"100%",
      opacity:0
    },
    {
      y:0,
      opacity:1,
      duration:.4,
      ease:"power3.out"
    }
  );

}
function selectTrainingOrder(idx){

  const pos = selectedTrainingOrder.indexOf(idx);


  if(pos !== -1){

    selectedTrainingOrder.splice(pos,1);

  }
  else{

    selectedTrainingOrder.push(idx);

  }


  openTrainingOrderModal();

}
function confirmTrainingOrder(){

  if(selectedTrainingOrder.length !== state.trainingQueue.length){
    return;
  }


  state.trainingQueue = [...selectedTrainingOrder];


  saveState();


  closeTrainingOrderModal();


  renderActive();
  showHome();

}

function applyTrainingOrder(reverse){

  if(!state.trainingQueue || state.trainingQueue.length < 2){
    closeTrainingOrderModal();
    return;
  }


  if(reverse){

    const first = state.trainingQueue.shift();
    state.trainingQueue.push(first);

  }


  saveState();

  closeTrainingOrderModal();

  renderActive();
  showHome();

}

function closeTrainingOrderModal(){

  const modal = document.getElementById("trainingOrderModal");

gsap.to("#trainingOrderModal .finish-modal",{
      y:"100%",
    opacity:0,
    duration:.25,
    ease:"power2.in",
    onComplete(){

      modal.style.display="none";

    }
  });

}

function closeFinishWorkoutModal(){

  const modal = document.getElementById("finishWorkoutModal");


  gsap.to("#finishWorkoutModal .finish-modal",{

    y:20,
    opacity:0,
    scale:.96,
    duration:.25,
    ease:"power2.in",

    onComplete(){

      modal.style.display="none";

    }

  });

}




function confirmFinishWorkout(dayIdx){

  closeFinishWorkoutModal();

  setTimeout(()=>{

    const finishedWeek = state.currentWeek;

    logWorkoutDay(dayIdx);

const weekFinished =
state.completedTrainingDays.length === state.days.length;

forceNextWeekForDay(dayIdx, finishedWeek);


if(weekFinished){
  advanceProgramWeek();
}

    activeDayIdx = computeSuggestedDayIdx();

    activeExerciseIdx = null;

    saveActivePos();

    clearWorkoutSession();
    sessionPRs = [];

    renderDayTabs();
    renderActive();
    showHome();

    maybePromptBlockCompletion();

    animateWorkoutComplete();
    vibrate([50,60,50,60,150]);

  },250);

}

function cascadeScheduleToWeek(newWeek){
  state.days.forEach(day => {
    (day.esercizi||[]).forEach(ex => {
      if(typeof carryMaxLayoutForward === 'function') carryMaxLayoutForward(ex,newWeek-1,newWeek);
      if(!ex.schema || ex.schema[newWeek]===undefined) return;
      if(String(ex.schema[newWeek]||'').trim() !== '') return;
      for(let i=newWeek-1; i>=0; i--){
        const prev = ex.schema[i];
        if(prev && String(prev).trim() !== ''){
          ex.schema[newWeek] = prev;
          break;
        }
      }
    });
  });
}
function advanceProgramWeek(){

  if((state.completedTrainingDays||[]).length < state.days.length) return;

  const maxWeek = (state.weeksPerBlock || 4) - 1;


  if(!state.completedWeeks){
    state.completedWeeks = [];
  }


  if(!state.completedWeeks.includes(state.currentWeek)){
    state.completedWeeks.push(state.currentWeek);
  }


  state.completedTrainingDays = [];


  if(state.currentWeek < maxWeek){

    state.currentWeek++;
    cascadeScheduleToWeek(state.currentWeek);

  }


  saveState();

}
