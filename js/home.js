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
    "Spingi quel petto, cazzo, le vene devono scoppiare! 🔥",
    "Dai, ancora una spinta! Il petto deve esplodere, non fermarti! 💥",
    "Senti il petto bruciare? Bene, cazzo, vuol dire che sta crescendo! 💪",
    "Non mollare quella panca, cazzo, il petto se lo merita! 🔥",
    "Spingi come se non ci fosse un domani, dai! 💥",
    "Vene a vista, petto in fiamme: ancora una, cazzo! 💪",
    "Un'altra rep! Il petto non si costruisce a meta', muoviti! 🔥",
    "Spingi, brucia, ripeti: oggi il petto non ha scuse, cazzo! 💥",
    "Senti quella pompata? Non fermarti adesso! 💪",
    "Ultima serie, dacci tutto, il petto se lo merita, cazzo! 🔥",
    "Muoviti! Le vene sul petto devono uscire fuori oggi! 💥",
    "Spingi finche' non ti trema tutto, cazzo, questo e' allenarsi! 💪",
  ],
  'Schiena': [
    "Tira, cazzo, le vene sulla schiena devono venire fuori! 🔥",
    "Ancora una trazione! Non ti fermare adesso! 💥",
    "Senti quella schiena bruciare? Dai, spremila fino in fondo! 💪",
    "Tira come se dovessi strappare il ferro dal muro, cazzo! 🔥",
    "Non mollare la presa, la schiena cresce solo se soffri! 💥",
    "Ancora, ancora! Le vene sulle braccia lo dicono: stai crescendo! 💪",
    "Tira duro, cazzo, oggi la V te la guadagni! 🔥",
    "Ultima trazione, senti tutto il dorso in fiamme! 💥",
    "Non fermarti, la schiena non si costruisce a meta'! 💪",
    "Dai, spremi ogni fibra, oggi la schiena esplode! 🔥",
    "Tira finche' non ti brucia il collo, cazzo, forza! 💥",
    "Muoviti! Ampiezza e spessore si guadagnano cosi', non a caso! 💪",
  ],
  'Spalle': [
    "Alza quelle spalle, cazzo, le vene devono uscire! 🔥",
    "Dai, ancora una spinta sopra la testa! Non ti fermare! 💥",
    "Senti i deltoidi bruciare? Bene, cazzo, continua cosi'! 💪",
    "Non mollare, le spalle si costruiscono nell'ultima rep! 🔥",
    "Spingi oltre il limite, cazzo, oggi tocca a te! 💥",
    "Ancora! Le vene sulle spalle sono la prova che funziona! 💪",
    "Muoviti, dai! Ogni rep gonfia i deltoidi un po' di piu'! 🔥",
    "Spalle larghe non nascono a meta' serie, cazzo, finisci! 💥",
    "Ultima alzata, senti tutto bruciare, non mollare! 💪",
    "Dai, oggi scolpisci i tondi come non mai! 🔥",
    "Alza, senti il sangue salire, ripeti, cazzo! 💥",
    "Non fermarti! Spalle d'acciaio si guadagnano soffrendo! 💪",
  ],
  'Bicipiti': [
    "Spingi quei bicipiti, le vene devono scoppiare, cazzo! 🔥",
    "Dai, un altro curl! Il braccio deve bruciare! 💥",
    "Senti il picco che esplode? Ancora una, cazzo! 💪",
    "Non mollare, le vene sul braccio non escono per caso! 🔥",
    "Contrai in alto, cazzo, spremi tutto quello che hai! 💥",
    "Ancora! Le braccia si gonfiano solo se non molli! 💪",
    "Muoviti, dai! Ogni curl e' sangue in piu' nel bicipite! 🔥",
    "Vene a vista, braccio duro: non fermarti adesso, cazzo! 💥",
    "Spremi quel braccio fino in fondo, dai! 💪",
    "Ultimo curl, senti tutto pulsare, non mollare! 🔥",
    "Manica stretta o niente, cazzo, dacci tutto! 💥",
    "Curl pulito, zero slanci, e cazzo se cresce! 💪",
  ],
  'Tricipiti': [
    "Spingi quei tricipiti, cazzo, il braccio deve esplodere! 🔥",
    "Dai, ancora un'estensione! Non fermarti! 💥",
    "Senti il ferro di cavallo bruciare? Bene, continua, cazzo! 💪",
    "Non mollare, la pelle dietro al braccio deve tirare! 🔥",
    "Spingi lontano, cazzo, spremi tutto! 💥",
    "Ancora una! Le vene sul tricipite non escono a caso! 💪",
    "Muoviti, dai! Ogni serie riempie di sangue quel braccio! 🔥",
    "Tricipiti duri o niente, cazzo, non fermarti! 💥",
    "Ultima serie, massimo sforzo, zero rimpianti! 💪",
    "Dai, il braccio finisce di crescere da dietro, spingi! 🔥",
    "Non mollare adesso, cazzo, ci sei quasi! 💥",
    "Tricipiti d'acciaio si costruiscono soffrendo, forza! 💪",
  ],
  'Quadricipiti': [
    "Scendi e risali, cazzo, le gambe devono bruciare! 🔥",
    "Dai, un altro squat! Non ti fermare adesso! 💥",
    "Senti le vene sulle cosce? Bene, continua cosi', cazzo! 🦵",
    "Non mollare sotto il parallelo, e' li' che si cresce! 💪",
    "Scendi controllato, risali esplosivo, dai! 🔥",
    "Ancora uno squat, cazzo, le gambe se lo meritano! 💥",
    "Muoviti! I pantaloni devono stringere oggi! 🦵",
    "Gambe di ferro non nascono a meta' serie, cazzo! 🔥",
    "Ultimo squat, senti tutto tremare, non mollare! 💥",
    "Dai, il pump nelle gambe e' il piu' cattivo, spingi! 🦵",
    "Non fermarti, cazzo, oggi le gambe fanno paura! 🔥",
    "Squat dopo squat, muoviti, il muscolo non aspetta! 💥",
  ],
  'Femorali': [
    "Stacca da terra, cazzo, i femorali devono bruciare! 🔥",
    "Dai, un altro stacco! Non fermarti adesso! 💥",
    "Senti la coscia posteriore in fiamme? Continua cosi'! 💪",
    "Non mollare la presa, cazzo, spremi tutta la catena! 🔥",
    "Ancora uno stacco, dai, la parte posteriore se lo merita! 💥",
    "Muoviti! Pump nei femorali o non hai dato abbastanza! 💪",
    "Stacca, senti il sangue riempire la coscia, cazzo! 🔥",
    "Ultimo curl femorale, non fermarti, dacci tutto! 💥",
    "Gambe complete non nascono a meta', cazzo, forza! 💪",
    "Dai, oggi anche da dietro devi fare paura! 🔥",
    "Non mollare, il pump si sente fino al polpaccio! 💥",
    "Stacchi puliti, zero scuse, cazzo, muoviti! 💪",
  ],
  'Polpacci': [
    "Alza quei talloni, cazzo, i polpacci devono bruciare! 🔥",
    "Dai, un'altra alzata! Non fermarti, sono cocciuti! 💥",
    "Senti la vena pulsare? Bene, continua cosi', cazzo! 💪",
    "Non mollare, full range o non conta niente! 🔥",
    "Ancora! Chi salta i polpacci se ne pente, tu no, cazzo! 💥",
    "Muoviti, dai! Contrai in alto, senti tutto tirare! 💪",
    "Polpacci duri come roccia, non fermarti adesso! 🔥",
    "Ultima alzata, spremi ogni centimetro, cazzo! 💥",
    "Dai, il dettaglio fa la differenza, non mollare! 💪",
    "Non fermarti, il pump ai polpacci e' raro, sfruttalo! 🔥",
    "Costanza, cazzo, oggi i polpacci non si nascondono! 💥",
    "Muoviti! Un'alzata alla volta, senza scuse! 💪",
  ],
  'Glutei': [
    "Spingi quelle anche, cazzo, i glutei devono bruciare! 🔥",
    "Dai, un'altra spinta! Non fermarti adesso! 💥",
    "Senti il gluteo che pompa? Bene, continua cosi', cazzo! 💪",
    "Non mollare in alto, contrai finche' non brucia! 🔥",
    "Ancora! Spingi come se dovessi spostare il pavimento! 💥",
    "Muoviti, dai, cazzo, oggi si costruisce da dietro! 💪",
    "Ultimo ponte, senti tutto il fuoco, non fermarti! 🔥",
    "Glutei d'acciaio non nascono a meta' serie, cazzo! 💥",
    "Dai, la forma conta piu' del peso, sentila lavorare! 💪",
    "Non mollare, il pump cambia anche come cammini! 🔥",
    "Spingi, contrai, cazzo, ripeti finche' non trema! 💥",
    "Muoviti! Oggi da dietro devi fare paura! 💪",
  ],
  'Addominali': [
    "Contrai quel core, cazzo, deve bruciare fino in fondo! 🔥",
    "Dai, un altro crunch! Non fermarti adesso! 💥",
    "Senti le vene sull'addome? Bene, continua cosi'! 💪",
    "Non mollare, l'addome deve tremare, cazzo! 🔥",
    "Ancora un plank, dai, la volonta' si costruisce cosi'! 💥",
    "Muoviti! Il six-pack non arriva a meta' serie, cazzo! 💪",
    "Ultimo giro, senti le fibre bruciare, non fermarti! 🔥",
    "Contrai, respira, ripeti, cazzo, senza scuse! 💥",
    "Dai, il centro del corpo lavora sul serio oggi! 💪",
    "Non mollare, core stabile o niente, cazzo! 🔥",
    "Ancora una rep, l'addome non molla prima del tempo! 💥",
    "Muoviti! Ogni serie scolpisce un pezzo in piu', forza! 💪",
  ],
  'Cardio': [
    "Corri, cazzo, il cuore deve pompare a manetta! 🔥",
    "Dai, non fermarti adesso, il fiato e' quasi finito ma tu no! 💥",
    "Senti il cuore esplodere? Bene, continua cosi', cazzo! 💪",
    "Non mollare, il cuore e' un muscolo, fallo esplodere! 🔥",
    "Ancora un minuto, dai, suda finche' non brucia! 💥",
    "Muoviti! Ogni battito in piu' e' definizione che arriva! 💪",
    "Fiato corto, cazzo, ma tu non ti fermi! 🔥",
    "Ultimo sprint, senti tutto il corpo rispondere! 💥",
    "Dai, la resistenza si costruisce quando fa male, cazzo! 💪",
    "Non mollare, il corpo si trasforma proprio ora! 🔥",
    "Muoviti, cazzo! Oggi bruci quello che domani si vede! 💥",
    "Ancora, ancora! Resistenza vera, zero scuse! 💪",
  ],
  'Altro': [
    "Muoviti, cazzo, oggi il corpo intero deve rispondere! 🔥",
    "Dai, non importa il gruppo, spingi come se fosse l'ultimo! 💥",
    "Senti il sangue che pompa? Bene, continua cosi'! 💪",
    "Non mollare, la costanza vale piu' della perfezione, cazzo! 🔥",
    "Ancora una serie, dai, sei piu' vicino di quanto pensi! 💥",
    "Muoviti! Oggi ti alleni per te, e cazzo se si vedra'! 💪",
    "Ultima rep, dacci tutto, non fermarti adesso! 🔥",
    "Dai, basta esserci, il pump arriva da solo, cazzo! 💥",
    "Non mollare, piccoli progressi cambiano tutto! 💪",
    "Muoviti, cazzo! Oggi suda, domani ringrazi! 🔥",
    "Nessuna scusa oggi, il corpo aspetta solo te! 💥",
    "Dai, presente e concentrato, pronto a esplodere, forza! 💪",
  ],
};
const DEFAULT_MOTIVATION = [
  "Muoviti, cazzo, oggi e' il giorno giusto per spingere forte! 🔥",
  "Dai, un altro pump da conquistare, non fermarti! 💪",
  "Non mollare, ogni allenamento e' un pezzo di corpo che cambia! 💥",
  "Basta il primo pump, cazzo, poi non ti fermi piu'! 🔥",
  "Muoviti! Presentati e fai lavorare il sangue, forza! 💪",
  "Dai, piccoli passi, grande trasformazione, senza scuse! 💥",
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
// tutte le frasi finiscono con una di queste 4 emoji: invece di riscrivere a
// mano le 150 e passa righe qui sopra, si stacca l'emoji finale a runtime e si
// sostituisce con l'icona SVG corrispondente - il testo resta quello scritto,
// solo la punteggiatura finale cambia forma
function splitMotivation(phrase){
  // flag "u" obbligatorio: senza, la classe di caratteri [...] con emoji fuori
  // dal BMP (rappresentate da coppie di surrogati in UTF-16) si spezza in
  // singole meta' di coppia invece di riconoscere l'emoji intera - il replace
  // silenziosamente non trovava mai un match
  const m = /\s*([🔥💥💪🦵])\s*$/u.exec(phrase);
  if(!m) return { text: phrase, icon: '' };
  const iconMap = { '🔥':ICON_FLAME, '💥':ICON_LIGHTNING, '💪':ICON_PLATE, '🦵':ICON_PLATE };
  return { text: phrase.slice(0, m.index).trim(), icon: iconMap[m[1]] || '' };
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
  // ordine di esecuzione: il giorno CORRENTE sempre per primo (esplicito, non
  // si puo' dare per scontato che sia trainingQueue[0] - dopo "cambia
  // allenamento di oggi", vedi confirmSwitchTrainingDay in navigation.js,
  // currentTrainingDayIdx viene impostato a parte e trainingQueue ricostruita
  // escludendolo del tutto, quindi affidarsi al solo ordine di trainingQueue
  // poteva lasciare il giorno da fare ORA in fondo alla lista), poi il resto
  // della coda, poi i giorni gia' completati questa settimana, poi eventuali
  // giorni non coperti da nessuno dei precedenti (es. appena aggiunti)
  const completedList = state.completedTrainingDays || [];
  const hasCurrent = state.currentTrainingDayIdx !== null && state.currentTrainingDayIdx !== undefined && !completedList.includes(state.currentTrainingDayIdx);
  const currentFirst = hasCurrent ? [state.currentTrainingDayIdx] : [];
  const queueRest = (state.trainingQueue || []).filter(i => !currentFirst.includes(i));
  const coveredIdx = new Set([...currentFirst, ...queueRest, ...completedList]);
  const missingIdx = state.days.map((_,i)=>i).filter(i=>!coveredIdx.has(i));
  const orderedDayIdx = [...currentFirst, ...queueRest, ...completedList, ...missingIdx];
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
    const isEmpty = (d.esercizi||[]).length === 0;
    const cls = ['home-day-card', isCompleted?'completed':'', isCurrent?'active-training':'', isEmpty?'empty':''].filter(Boolean).join(' ');
    return `<div class="${cls}" style="--accent:${a.c}"><span class="home-day-order">${pos+1}</span>${escapeHtml(d.name)}${isEmpty?'<span class="home-day-empty-tag">vuoto</span>':''}</div>`;
  }).join('');
  const motivationSplit = suggestedDay ? splitMotivation(pickMotivationalPhrase(suggestedIdx)) : null;
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
    ${motivationSplit ? `<div class="home-motivation" style="--accent:${dayAccent(suggestedDay,suggestedIdx).c}"><span class="accent-shine">${escapeHtml(motivationSplit.text)}</span> ${motivationSplit.icon}</div>` : ''}` : '';
  el.innerHTML = `
    <div class="home-hero">
      <div class="home-progress-module">
        <div class="home-block-week">SETTIMANA ${blockWeek} DI ${state.weeksPerBlock||4}</div>
        <div class="home-progress-label">GIORNO</div>
        <div class="home-progress-num" style="--accent:${progressAccent}">
          <span id="homeProgressCount" class="accent-shine">0</span>
          <span class="home-progress-of">/${total}</span>
        </div>
        <div class="home-progress-bar-wrap" style="--accent:${progressAccent}"><div class="home-progress-bar-fill" id="homeProgressBar" style="width:0%"></div></div>
      </div>
    ${suggestedHtml}
    <div class="home-days-label">I tuoi giorni</div>
    <div class="home-days-grid">${dayButtons}</div>
    <div class="home-total-stat">${ICON_FLAME} ${monthlyCount} allenamenti completati questo mese</div>
  `;
  if(typeof gsap !== "undefined"){
  gsap.to("#homeProgressCount", {
    innerText: done,
    duration: 0.8,
    snap: { innerText: 1 },
    ease: "power2.out"
  });
  // stessa progressione del numero, ma visiva: la barra sotto rende il rapporto
  // fatti/totale leggibile a colpo d'occhio, non serve piu' calcolarlo a mente
  gsap.to("#homeProgressBar", {
    width: total>0 ? (done/total*100)+'%' : '0%',
    duration: 0.8,
    ease: "power2.out"
  });
  // la card del giorno corrente resta leggermente piu' grande delle altre gia'
  // da ferma (scale 1.04 fisso), ma non "respira" piu' - quel movimento e'
  // passato al bottone grande cliccabile qui sopra (vedi animateSuggestedWorkout
  // in js/animations.js), che e' quello su cui si tocca davvero per iniziare.
  // killTweensOf prima di ripartire: renderHome() puo' girare piu' volte (ogni
  // volta che si torna alla Home), senza si accumulerebbero tween vecchi sugli
  // elementi ricreati ogni volta da zero con innerHTML
  gsap.killTweensOf(".home-day-card.active-training");
  gsap.set(".home-day-card.active-training", { scale: 1.04 });
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

