function initAnimations(){

  if(typeof gsap === "undefined") return;

  gsap.to(".topbar h1", {
    "--shine": "200%",
    duration: 8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

}


function animateSuggestedWorkout(){

  if(typeof gsap === "undefined") return;

  const btn=document.querySelector(".home-suggested-btn");

  if(!btn) return;

  btn.classList.add("glow");

  gsap.from(btn,{
    opacity:0,
    y:20,
    scale:.95,
    duration:.7,
    ease:"back.out(1.7)"
  });

}


function animateSuggestedGlow(){

  if(typeof gsap === "undefined") return;

  gsap.to(".home-suggested-btn::before", {
    opacity:0.5,
    duration:2,
    repeat:-1,
    yoyo:true,
    ease:"sine.inOut"
  });

}


function animateWorkoutComplete(){

  const el = document.getElementById("workoutCompleteFx");

  if(!el) return;

  el.innerHTML = `
    <div class="workout-pop">
       +1 WORKOUT COMPLETATO! 🔥
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



// ---------------- POPUP FINE ALLENAMENTO ----------------


function openFinishWorkoutModal(dayIdx){

  const day = state.days[dayIdx];

  if(!day) return;

const incomplete = false;

  const accent = dayAccent(day, dayIdx).c;


  const nextIdx = (dayIdx + 1) % state.days.length;
  const nextDay = state.days[nextIdx];

  const nextAccent = dayAccent(nextDay, nextIdx).c;


  const body = document.getElementById("finishWorkoutBody");


  body.innerHTML = `

    <div class="finish-title">
  ${
    incomplete
    ? "⚠️ ATTENZIONE"
    : "🏆 GRANDE!"
  }
</div>


<div class="finish-subtitle">
  ${
    incomplete
    ? "Alcuni esercizi non risultano completati.<br>Vuoi comunque terminare?"
    : "Allenamento completato"
  }
</div>


    <div class="finish-day-name" style="color:${accent}">
      ${escapeHtml(day.name)}
    </div>


    <div class="finish-next-day">
      PROSSIMO GIORNO
    </div>


    <div class="finish-day-name" style="color:${nextAccent}">
      ${escapeHtml(nextDay.name)}
    </div>


    <div class="finish-buttons">

      <button class="add-ex small2"
      onclick="closeFinishWorkoutModal()">
        Annulla
      </button>


      <button class="add-ex small2"
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
    ".finish-modal",
    {
      y:80,
      opacity:0,
      scale:.9
    },
    {
      y:0,
      opacity:1,
      scale:1,
      duration:.45,
      ease:"back.out(1.5)"
    }
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
        🔄 Pianifica i prossimi allenamenti
      </div>


      <div class="finish-subtitle">

  Hai completato 
  <b>${completedDays.length}/${state.days.length}</b> allenamenti questa settimana.<br><br>

  I giorni già completati sono bloccati ✅<br>
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

              ✅

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
    ? '☝️ Seleziona l’ordine'
    :
  selectedTrainingOrder.length !== remainingDays.length
    ? `☝️ Ancora ${remainingDays.length - selectedTrainingOrder.length} da scegliere`
    :
    '✅ Conferma ordine'
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
      y:80,
      opacity:0,
      scale:.9
    },
    {
      y:0,
      opacity:1,
      scale:1,
      duration:.45,
      ease:"back.out(1.5)"
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
      y:40,
    opacity:0,
    scale:.95,
    duration:.2,
    onComplete(){

      modal.style.display="none";

    }
  });

}

function closeFinishWorkoutModal(){

  const modal = document.getElementById("finishWorkoutModal");


  gsap.to("#finishWorkoutModal .finish-modal",{

    y:40,
    opacity:0,
    scale:.95,
    duration:.2,

    onComplete(){

      modal.style.display="none";

    }

  });

}



// ---------------- CONFERMA FINE ALLENAMENTO ----------------

function confirmFinishWorkout(dayIdx){

  closeFinishWorkoutModal();

  setTimeout(()=>{

    logWorkoutDay(dayIdx);

const weekFinished =
state.completedTrainingDays.length === state.days.length;


forceNextWeekForDay(dayIdx);


if(weekFinished){
  advanceProgramWeek();
}

    activeDayIdx = computeSuggestedDayIdx();

    activeExerciseIdx = null;

    saveActivePos();

    workoutInProgress = false;
    saveWorkoutInProgress();

    renderDayTabs();
    renderActive();
    showHome();

    animateWorkoutComplete();

  },250);

}

function advanceProgramWeek(){

  const maxWeek = (state.weeksPerBlock || 4) - 1;


  // salvo la settimana appena conclusa
  if(!state.completedWeeks){
    state.completedWeeks = [];
  }


  if(!state.completedWeeks.includes(state.currentWeek)){
    state.completedWeeks.push(state.currentWeek);
  }


  // reset giorni completati
  state.completedTrainingDays = [];


  // passo alla settimana successiva
  if(state.currentWeek < maxWeek){

    state.currentWeek++;

  }


  saveState();

}
