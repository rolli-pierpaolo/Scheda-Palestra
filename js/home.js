// ---------------- HOME ----------------
// pagina che si apre quando non c'e' un allenamento in corso (vedi app-init.js
// e workoutInProgress in state.js): elenco giorni, progresso settimanale e
// giorno suggerito, tutto calcolato dal calendario che gia' esiste
function showHome(){
  // tornare alla Home (di proposito, toccando la casetta) vuol dire "per ora ho
  // finito qui": se non si azzera anche qui, un allenamento segnato come
  // completato ma mai chiuso con "Giorno terminato" resterebbe "in corso" per
  // sempre, e alla riapertura dell'app (anche giorni dopo) si tornerebbe
  // dritti li' invece che alla Home, anche se nel frattempo non si e' toccato
  // piu' nulla. Nessun problema a farlo sempre: quando showHome() viene
  // chiamata da finishDay() o all'avvio il flag e' gia' false, questo e' un
  // no-op in quei casi
  if(workoutInProgress){
    workoutInProgress = false;
    saveWorkoutInProgress();
  }
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

  const done =

  state.completedTrainingDays
  ? state.completedTrainingDays.length
  : 0;


  return{

    done:Math.min(
      done,
      state.days.length
    ),

    total:state.days.length

  };

}


// stessa logica di avanzamento gia' usata da "Giorno terminato": guarda l'ultimo
// giorno registrato nel calendario (qualsiasi data) e suggerisce quello dopo,
// tornando al primo se non ci si e' mai allenati o se non lo trova piu' tra i giorni
function computeSuggestedDayIdx(){

  if(state.currentTrainingDayIdx !== null &&
     state.currentTrainingDayIdx !== undefined){
    return state.currentTrainingDayIdx;
  }


  if(state.trainingQueue && state.trainingQueue.length > 0){
    return state.trainingQueue[0];
  }



  const startKey = state.programStartDate || mostRecentMondayKey();

  const dates = Object.keys(calendarLog)
    .filter(k =>
      k >= startKey &&
      calendarLog[k] &&
      calendarLog[k].length
    )
    .sort();


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
// in che settimana del blocco attivo si e' (durata configurabile, vedi
// state.weeksPerBlock), contando da programStartDate: bloccata tra 1 e la
// durata del blocco perche' oltre tocca "Archivia e inizia un nuovo mese"
// (il blocco successivo riparte da 1, eventualmente con una durata diversa)
function computeCurrentBlockWeek(){

  const total = state.weeksPerBlock || 4;

  const current = (state.currentWeek ?? 0) + 1;

  return Math.min(current, total);

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
  'Petto': [
    "Oggi il petto si gonfia e le vene si accendono sotto la pelle 🔥",
    "Ogni spinta pompa sangue nel petto: guardalo esplodere 💥",
    "La pelle si tende, le fibre bruciano: oggi il petto cresce sul serio 💪",
    "Senti il sangue invadere il petto a ogni ripetizione 🔥",
    "Oggi il pump e' cosi' forte che la maglietta ti sta stretta 💥",
    "Vene in rilievo, petto gonfio: questo e' il prezzo della crescita 💪",
    "Ogni serie spinge piu' sangue dentro quei pettorali 🔥",
    "Il petto si scolpisce quando smetti di risparmiarti 💥",
    "Oggi la pompa parte e non si ferma piu' 💪",
    "Petto duro, vene a vista: oggi ti guardi allo specchio diverso 🔥",
    "Spingi finche' il petto non chiede pieta' 💥",
    "Sangue, sudore, pump: oggi il petto si merita tutto 💪",
  ],
  'Schiena': [
    "Tira finche' ogni vena della schiena non viene a galla 🔥",
    "Oggi la schiena si allarga e il sangue la riempie tutta 💪",
    "Ogni trazione scolpisce quella V che fa girare la testa 💥",
    "Senti i dorsali gonfiarsi a ogni tirata 🔥",
    "Schiena pompata, pelle tesa: oggi cresci sul serio 💪",
    "Tira come se dovessi strappare il ferro dal muro 🔥",
    "Ogni fibra si riempie di sangue, ogni tirata conta 💥",
    "Oggi la schiena si gonfia e non si sgonfia piu' 💪",
    "Vene sulle braccia mentre tiri: il segno che stai crescendo 🔥",
    "Ampiezza e spessore, oggi la schiena esplode 💥",
    "Tira duro, senti il pump salire fino al collo 💪",
    "Oggi costruisci la schiena che si vede da lontano 🔥",
  ],
  'Spalle': [
    "Deltoidi gonfi, vene a vista: oggi le spalle esplodono 🔥",
    "Ogni alzata pompa sangue nelle spalle, sentilo bruciare 💥",
    "Spalle tonde e piene: oggi il pump non ti lascia 💪",
    "Spingi sopra la testa finche' la pelle non tira 🔥",
    "Oggi le spalle si riempiono e la maglietta lo sa 💥",
    "Vene sulle spalle, sguardo fisso: oggi si cresce 💪",
    "Ogni rep gonfia i deltoidi un po' di piu' 🔥",
    "Spalle larghe, sangue che pompa: oggi sei inarrestabile 💥",
    "Il pump alle spalle e' la prova che stai lavorando bene 💪",
    "Oggi scolpisci i tondi come non mai 🔥",
    "Alza, senti il sangue salire, ripeti 💥",
    "Spalle d'acciaio, vene in vista: oggi e' il tuo giorno 💪",
  ],
  'Bicipiti': [
    "Curl dopo curl, le vene sul braccio iniziano a pompare 🔥",
    "Oggi il bicipite si gonfia finche' la manica non stringe 💥",
    "Senti il sangue riempire il braccio a ogni contrazione 💪",
    "Pump vero: quello che fa vedere le vene anche da fermo 🔥",
    "Contrai in alto finche' il picco non esplode 💥",
    "Oggi le braccia si gonfiano e non tornano piu' uguali 💪",
    "Ogni curl e' sangue in piu' dentro quel bicipite 🔥",
    "Vene a vista, braccio duro: oggi il pump e' servito 💥",
    "Il braccio cresce quando lo spremi fino in fondo 💪",
    "Oggi senti il bicipite pulsare tra una serie e l'altra 🔥",
    "Manica stretta, vene gonfie: il segno che hai dato tutto 💥",
    "Curl pulito, pump vero, braccio che cresce 💪",
  ],
  'Tricipiti': [
    "Tricipiti gonfi, vene sul braccio: oggi cresci da dietro 🔥",
    "Ogni estensione pompa sangue nel ferro di cavallo 💥",
    "Il braccio esplode quando il tricipite fa il suo lavoro 💪",
    "Spingi finche' la pelle dietro al braccio non tira 🔥",
    "Oggi il pump arriva anche dove non te lo aspetti 💥",
    "Vene sul tricipite: il dettaglio che fa la differenza 💪",
    "Ogni serie riempie di sangue quel braccio 🔥",
    "Tricipiti duri, braccio pieno: oggi si vede la crescita 💥",
    "Spingi lontano, senti il muscolo bruciare e gonfiarsi 💪",
    "Oggi il braccio finisce di riempirsi da dietro 🔥",
    "Ultima serie, massimo pump, zero rimpianti 💥",
    "Tricipiti d'acciaio, vene a vista: oggi spingi tutto 💪",
  ],
  'Quadricipiti': [
    "Gambe che pompano sangue a ogni squat: oggi si cresce 🔥",
    "Quadricipiti gonfi, vene sulle cosce: il pump delle gambe e' il piu' cattivo 💥",
    "Scendi, senti il muscolo tendersi, risali esplosivo 🦵",
    "Oggi le gambe si riempiono finche' i pantaloni non stringono 💪",
    "Ogni squat e' sangue e fibre che crescono 🔥",
    "Quadricipiti in fiamme, pump che non molla 💥",
    "Vene sulle gambe: pochi arrivano a vederle, oggi tu ci provi 🦵",
    "Scendi sotto il parallelo, senti il pump salire 🔥",
    "Oggi le gambe diventano il tuo punto di forza 💥",
    "Squat dopo squat, il muscolo si gonfia e resta 💪",
    "Gambe dure come pietra: oggi il pump e' totale 🦵",
    "Le gambe di oggi si vedranno anche da lontano 🔥",
  ],
  'Femorali': [
    "Stacchi che pompano sangue nella catena posteriore 🔥",
    "Femorali gonfi, vene sulla coscia posteriore: oggi cresci da dietro 💥",
    "Ogni stacco costruisce le gambe che si vedono da dietro 💪",
    "Senti il femorale tendersi a ogni discesa 🔥",
    "Oggi la parte posteriore si gonfia quanto quella davanti 💥",
    "Pump nei femorali: il segno di gambe complete 💪",
    "Stacca, senti il sangue riempire la coscia 🔥",
    "Femorali duri, vene a vista: oggi lavori dove pochi guardano 💥",
    "Ogni curl femorale e' un mattone su gambe vere 💪",
    "Gambe complete, oggi anche da dietro fanno paura 🔥",
    "Il pump ai femorali si sente fino al polpaccio 💥",
    "Stacchi puliti, sangue che pompa, gambe che crescono 💪",
  ],
  'Polpacci': [
    "Polpacci che bruciano e si gonfiano a ogni alzata 🔥",
    "Vene sui polpacci: il dettaglio che pochi hanno il coraggio di costruire 💥",
    "Oggi anche il muscolo piu' cocciuto cede al pump 💪",
    "Full range, senti il sangue riempire il polpaccio 🔥",
    "Polpacci duri come roccia: oggi non si molla 💥",
    "Ogni alzata e' un passo verso polpacci veri 💪",
    "Contrai in alto, senti la vena pulsare 🔥",
    "Chi salta i polpacci lo rimpiange in canottiera, tu oggi ci sei 💥",
    "Il pump ai polpacci e' raro ma quando arriva si sente tutto 💪",
    "Oggi il dettaglio fa la differenza, anche il piu' piccolo 🔥",
    "Polpacci gonfi, passo dopo passo si nota 💥",
    "Costanza sui polpacci: oggi il pump ti sorprende 💪",
  ],
  'Glutei': [
    "Spingi le anche, senti il gluteo pompare sangue 🔥",
    "Glutei duri, gambe che spingono: oggi si costruisce da dietro 💥",
    "Ogni spinta e' un muscolo che si gonfia e si sveglia 💪",
    "Contrai in alto finche' non senti bruciare 🔥",
    "Oggi la parte posteriore prende forma e potenza 💥",
    "Glutei d'acciaio, pump che non molla mai 💪",
    "Spingi come se dovessi spostare il pavimento sotto di te 🔥",
    "Il pump ai glutei cambia anche come cammini 💥",
    "Ogni ponte, ogni spinta: oggi il muscolo risponde 💪",
    "Glutei attivi, corpo piu' forte ovunque 🔥",
    "Oggi la forma conta piu' del peso, sentilo lavorare 💥",
    "Spingi, contrai, senti il fuoco: oggi cresci da dietro 💪",
  ],
  'Addominali': [
    "Core che brucia, vene sull'addome quando ti contrai 🔥",
    "Ogni crunch pompa sangue nel six-pack che stai costruendo 💥",
    "Contrai, senti il muscolo indurirsi sotto la pelle 💪",
    "Oggi l'addome lavora finche' non trema 🔥",
    "Core d'acciaio: la base di ogni altro muscolo che cresce 💥",
    "Ogni plank e' sangue e volonta' che si accumulano 💪",
    "Addominali che pompano: oggi il centro del corpo esplode 🔥",
    "Contrai, respira, senti le fibre bruciare 💥",
    "Il six-pack si guadagna rep dopo rep, oggi tocca a te 💪",
    "Core stabile, corpo che fa paura sotto ogni carico 🔥",
    "Oggi l'addome non molla prima del tempo 💥",
    "Ogni serie scolpisce un pezzo in piu' 💪",
  ],
  'Cardio': [
    "Cuore che pompa forte, sangue che scorre: oggi bruci sul serio 🔥",
    "Fiato corto, vene a vista, corpo che si trasforma 💥",
    "Ogni battito in piu' e' un passo verso la versione migliore di te 💪",
    "Il cuore e' un muscolo: oggi lo fai esplodere di lavoro 🔥",
    "Suda finche' la pelle non brucia, oggi vale doppio 💥",
    "Resistenza che cresce, corpo che si scolpisce da dentro 💪",
    "Oggi il sangue pompa ovunque, non solo nei muscoli 🔥",
    "Fiato che manca, determinazione che resta 💥",
    "Ogni minuto di cardio e' definizione che arriva 💪",
    "Il cuore accelera, il corpo si trasforma 🔥",
    "Oggi bruci quello che domani si vede 💥",
    "Resistenza vera, corpo che risponde 💪",
  ],
  'Altro': [
    "Oggi il sangue pompa comunque, in ogni muscolo che tocchi 🔥",
    "Non serve un nome per il gruppo: oggi il corpo intero risponde 💥",
    "Ogni allenamento e' pump, crescita, un passo avanti 💪",
    "Oggi la costanza vale piu' della perfezione, sentila lavorare 🔥",
    "Un allenamento in piu' e' un corpo un po' piu' vicino a quello che vuoi 💥",
    "Oggi ti alleni per te, e si vedra' 💪",
    "Ogni sessione scolpisce la versione migliore di te 🔥",
    "Oggi conta esserci, il pump arriva da solo 💥",
    "Piccoli progressi, sommati, cambiano tutto 💪",
    "Oggi si suda, domani ti guardi allo specchio diverso 🔥",
    "Nessuna scusa oggi, il corpo aspetta solo te 💥",
    "Presente, concentrato, pronto a esplodere 💪",
  ],
};
const DEFAULT_MOTIVATION = [
  "Oggi e' il giorno giusto per far pompare il sangue nei muscoli 🔥",
  "Un altro passo avanti, un altro pump da conquistare 💪",
  "Ogni allenamento e' un investimento sul corpo che vuoi 💥",
  "Non serve motivazione perfetta, basta il primo pump 🔥",
  "Oggi conta presentarti e far lavorare il sangue 💪",
  "Piccoli passi, grande trasformazione nel tempo 💥",
];
// stabile per tutto il giorno (non cambia a ogni render, non usa Math.random)
// e ruota in sequenza sul pool del gruppo scelto invece di un hash: cosi' non
// si ripete mai la stessa frase due giorni di fila (torna a capo solo dopo
// aver fatto vedere tutte le altre del pool)
function pickMotivationalPhrase(dayIdx){
  const groups = computeSuggestedDayMuscleGroups(dayIdx);
  const pool = (groups.length && MUSCLE_MOTIVATION[groups[0]]) ? MUSCLE_MOTIVATION[groups[0]] : DEFAULT_MOTIVATION;
  const dayIndex = Math.floor(Date.now() / 86400000);
  return pool[dayIndex % pool.length];
}
function renderHome(){

  const el = document.getElementById('viewHome');
  if(!el) return;

  const suggestedIdx = computeSuggestedDayIdx();

  const weekly = computeWeeklyProgress();

  const done = Math.min(weekly.done + 1, weekly.total);
const total = weekly.total;

  const suggestedDay = state.days[suggestedIdx];

  const progressAccent = suggestedDay 
    ? dayAccent(suggestedDay, suggestedIdx).c 
    : 'var(--green)';

  const monthlyCount = computeMonthlyWorkoutsCount();
  const blockWeek = computeCurrentBlockWeek();
  // ordine di esecuzione: prima i giorni gia' fatti questa settimana (nell'ordine
  // in cui sono stati fatti), poi quelli ancora da fare secondo trainingQueue;
  // eventuali giorni non coperti da nessuno dei due (es. appena aggiunti) in coda
  const coveredIdx = new Set([...(state.completedTrainingDays||[]), ...(state.trainingQueue||[])]);
  const missingIdx = state.days.map((_,i)=>i).filter(i=>!coveredIdx.has(i));
  const orderedDayIdx = [...(state.completedTrainingDays||[]), ...(state.trainingQueue||[]), ...missingIdx];
  // non piu' cliccabili: servono solo a mostrare a colpo d'occhio l'ordine
  // reale di esecuzione (che puo' cambiare tramite "Pianifica i prossimi
  // allenamenti", vedi openTrainingOrderModal in animations.js) - per iniziare
  // un allenamento si passa dal bottone "giorno suggerito" o dal tab Allenamento
  const dayButtons = orderedDayIdx.map((i,pos)=>{
    const d = state.days[i];
    if(!d) return '';
    const a = dayAccent(d,i);
    const isCompleted = (state.completedTrainingDays||[]).includes(i);
    const isCurrent = !isCompleted && state.currentTrainingDayIdx === i;
    const cls = ['home-day-card', isCompleted?'completed':'', isCurrent?'active-training':''].filter(Boolean).join(' ');
    return `<div class="${cls}" style="--accent:${a.c}"><span class="home-day-order">${pos+1}</span>${escapeHtml(d.name)}</div>`;
  }).join('');
  const motivation = suggestedDay ? pickMotivationalPhrase(suggestedIdx) : '';
  const suggestedHtml = suggestedDay ? `
 <button 
  class="home-suggested-btn"
  style="--accent:${dayAccent(suggestedDay,suggestedIdx).c}"
  onmousedown="this.classList.add('pressed')"
  onmouseup="this.classList.remove('pressed')"
  onmouseleave="this.classList.remove('pressed')"
  ontouchstart="this.classList.add('pressed')"
  ontouchend="this.classList.remove('pressed')"
  onclick="startDayFromHome(${suggestedIdx})">
<span class="home-suggested-name accent-shine">${escapeHtml(suggestedDay.name)}</span></button>
    ${motivation ? `<div class="home-motivation accent-shine" style="--accent:${dayAccent(suggestedDay,suggestedIdx).c}">${escapeHtml(motivation)}</div>` : ''}` : '';
  el.innerHTML = `
    <div class="home-hero">
      <div class="home-block-week">SETTIMANA ${blockWeek} DI ${state.weeksPerBlock||4}</div>
      <div class="home-progress-label">GIORNO</div>
<div class="home-progress-num" style="--accent:${progressAccent}">
  <span id="homeProgressCount" class="accent-shine">0</span>
  <span class="home-progress-of">/${total}</span>
</div>
    ${suggestedHtml}
    <div class="home-days-label">I tuoi giorni</div>
    <div class="home-days-grid">${dayButtons}</div>
    <div class="home-total-stat">🔥 ${monthlyCount} allenamenti completati questo mese</div>
  `;
  if(typeof gsap !== "undefined"){
  gsap.to("#homeProgressCount", {
    innerText: done,
    duration: 0.8,
    snap: { innerText: 1 },
    ease: "power2.out"
  });
  // effetto "respiro" sulla card del giorno corrente: scala su, torna giu',
  // glow morbido, in loop finche' resta il giorno corrente
  gsap.to(".home-day-card.active-training", {
    scale: 1.06,
    boxShadow: "0 0 16px 3px var(--accent, var(--green))",
    duration: 1.1,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
  // entrata della frase motivazionale: pop leggero invece di comparire di scatto
  gsap.from(".home-motivation", {
    opacity: 0,
    y: 12,
    scale: .96,
    duration: .6,
    ease: "back.out(1.6)"
  });
}
}

