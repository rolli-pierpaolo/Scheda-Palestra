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
// in che settimana del blocco attivo si e' (durata configurabile, vedi
// state.weeksPerBlock), contando da programStartDate: bloccata tra 1 e la
// durata del blocco perche' oltre tocca "Archivia e inizia un nuovo mese"
// (il blocco successivo riparte da 1, eventualmente con una durata diversa)
function computeCurrentBlockWeek(){
  const total = state.weeksPerBlock || 4;
  const startKey = state.programStartDate || mostRecentMondayKey();
  const start = new Date(startKey+'T00:00:00');
  const diffDays = Math.floor((new Date() - start) / 86400000);
  const week = Math.floor(diffDays/7) + 1;
  return Math.min(Math.max(week,1),total);
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
    "Oggi si spinge: il petto non si costruisce da solo 💥",
    "Panca e cuore, oggi il petto trema 🔥",
    "Ogni spinta e' un mattone in piu' sul petto 💪",
    "Il petto cresce quando smetti di avere paura del carico 🔥",
    "Oggi il petto lavora, domani si vede 💥",
    "Spingi finche' non senti il bruciore giusto 💪",
    "Petto largo non nasce da un allenamento comodo 🔥",
    "Ultima ripetizione, quella che conta davvero 💥",
    "Oggi costruisci la corazza 💪",
    "Il petto non mente: o spingi o resti fermo 🔥",
    "Ogni serie di oggi e' un passo verso la panca dei tuoi sogni 💥",
    "Petto in fiamme, mente concentrata 🔥",
  ],
  'Schiena': [
    "Larga e spessa: oggi la schiena ringrazia 💪",
    "Tira duro, la schiena cresce tirando 🔥",
    "Ogni trazione scolpisce la V che vuoi 💪",
    "Oggi costruisci la larghezza, non solo lo spessore 🔥",
    "La schiena si allena con la testa, non solo con le braccia 💪",
    "Tira come se dovessi spostare una parete 🔥",
    "Oggi ogni fibra della schiena lavora per te 💪",
    "Niente slanci: solo tirate pulite e vere 🔥",
    "La schiena forte sostiene tutto il resto 💪",
    "Oggi si scava lo spazio tra le scapole 🔥",
    "Ampiezza oggi, postura per sempre 💪",
    "Tira, senti, ripeti 🔥",
  ],
  'Spalle': [
    "Spalle d'acciaio oggi: alza la posta 💪",
    "Rotonde e forti: oggi tocca alle spalle 🔥",
    "Ogni alzata costruisce la corazza sulle spalle 💪",
    "Oggi le spalle diventano il tuo biglietto da visita 🔥",
    "Spingi sopra la testa, spingi oltre il limite 💪",
    "Deltoidi in fiamme, forma perfetta 🔥",
    "Oggi si scolpisce la linea delle spalle 💪",
    "Nessuna scorciatoia: solo alzate pulite 🔥",
    "Le spalle larghe si guadagnano rep dopo rep 💪",
    "Oggi il carico sale, e tu con lui 🔥",
    "Spalle tonde oggi, silhouette diversa domani 💪",
    "Controllo e potenza, oggi tocca alle spalle 🔥",
  ],
  'Bicipiti': [
    "Curl dopo curl, il braccio cresce 💪",
    "Oggi le braccia esplodono 🔥",
    "Ogni curl e' un centimetro in piu' 💪",
    "Bicipiti al lavoro, niente slanci oggi 🔥",
    "Oggi senti il pump, domani vedi il risultato 💪",
    "Contrai in alto, non solo solleva 🔥",
    "Le braccia si costruiscono con la costanza, non con la fretta 💪",
    "Oggi il braccio brucia nel modo giusto 🔥",
    "Curl pulito, risultato vero 💪",
    "Ogni ripetizione conta per quel picco 🔥",
    "Oggi le maniche diventano piu' strette 💪",
    "Braccia d'acciaio, un curl alla volta 🔥",
  ],
  'Tricipiti': [
    "Tricipiti: il vero segreto delle braccia grosse 💪",
    "Spingi, estendi, ripeti 🔥",
    "Oggi il tricipite fa i due terzi del lavoro 💪",
    "Estendi fino in fondo, ogni volta 🔥",
    "Il braccio grosso si costruisce da dietro 💪",
    "Oggi il tricipite brucia per davvero 🔥",
    "Spingi il peso lontano da te, con controllo 💪",
    "Ogni estensione scolpisce il ferro di cavallo 🔥",
    "Niente scorciatoie sui tricipiti oggi 💪",
    "Oggi il braccio finisce di crescere da dietro 🔥",
    "Tricipiti d'acciaio, oggi si spinge forte 💪",
    "Ultima serie: quella che fa la differenza 🔥",
  ],
  'Quadricipiti': [
    "Gambe di ferro oggi: squatta duro 🦵",
    "Quadricipiti in fiamme, si va giu' 🔥",
    "Oggi non si salta gamba 🦵",
    "Ogni squat costruisce le gambe che vuoi 🔥",
    "Scendi controllato, sali con potenza 🦵",
    "Oggi i quadricipiti bruciano nel modo giusto 🔥",
    "Le gambe forti portano tutto il resto 🦵",
    "Niente scuse: oggi si scende sotto il parallelo 🔥",
    "Quadricipiti d'acciaio, un rep alla volta 🦵",
    "Oggi costruisci le colonne che ti reggono 🔥",
    "Squat dopo squat, la forza cresce 🦵",
    "Le gambe di oggi sono la base di domani 🔥",
  ],
  'Femorali': [
    "Stacchi e curl: oggi i femorali lavorano 💪",
    "Catena posteriore al centro oggi 🔥",
    "Oggi la schiena delle gambe prende forma 💪",
    "Stacca da terra con potenza controllata 🔥",
    "I femorali forti prevengono gli infortuni, oggi si investe 💪",
    "Ogni stacco costruisce equilibrio nelle gambe 🔥",
    "Oggi si bilancia il lavoro davanti/dietro 💪",
    "Femorali in fiamme, forma sempre corretta 🔥",
    "La parte posteriore non si trascura oggi 💪",
    "Oggi ogni curl femorale conta 🔥",
    "Gambe complete si costruiscono anche da dietro 💪",
    "Stacchi puliti, risultati veri 🔥",
  ],
  'Polpacci': [
    "Polpacci: pochi ci credono, tu si' 💪",
    "Oggi tocca ai polpacci, niente scuse 🔥",
    "Ogni alzata sui polpacci conta, anche se non si vede subito 💪",
    "Oggi il volume si costruisce ripetizione dopo ripetizione 🔥",
    "Polpacci ostinati si battono con la costanza 💪",
    "Full range oggi, niente mezze alzate 🔥",
    "Chi salta i polpacci se ne pente in canottiera 💪",
    "Oggi anche i dettagli fanno la differenza 🔥",
    "Polpacci d'acciaio, un'alzata alla volta 💪",
    "Contrai in alto, senti lo stiramento in basso 🔥",
    "Oggi non si trascura nessun muscolo 💪",
    "Polpacci in fiamme, oggi si insiste 🔥",
  ],
  'Glutei': [
    "Spingi le anche, oggi i glutei lavorano 💪",
    "Oggi si costruisce da dietro 🔥",
    "Ogni spinta d'anca conta 💪",
    "Glutei forti, prestazioni migliori ovunque 🔥",
    "Oggi la parte posteriore prende forma 💪",
    "Contrai in alto, ogni singola volta 🔥",
    "I glutei si allenano con la testa, non con lo slancio 💪",
    "Oggi il lavoro si sente dove deve sentirsi 🔥",
    "Glutei d'acciaio, un rep alla volta 💪",
    "Spingi come se dovessi spostare il pavimento 🔥",
    "Oggi la forma conta piu' del peso 💪",
    "Ogni ponte, ogni spinta, un passo avanti 🔥",
  ],
  'Addominali': [
    "Core d'acciaio oggi 💪",
    "Ogni rep conta per quel six-pack 🔥",
    "Oggi il centro del corpo si rinforza 💪",
    "Un core forte sostiene tutti gli altri allenamenti 🔥",
    "Contrai, respira, ripeti 💪",
    "Oggi ogni crunch e' un mattone in piu' 🔥",
    "Gli addominali si vedono in cucina, si costruiscono qui 💪",
    "Core stabile, sollevamenti piu' sicuri 🔥",
    "Oggi il centro del corpo lavora sul serio 💪",
    "Ogni plank e' un test di volonta' 🔥",
    "Addome d'acciaio, un rep alla volta 💪",
    "Oggi non si molla prima del tempo 🔥",
  ],
  'Cardio': [
    "Fiato corto, cuore forte: oggi si suda 🔥",
    "Oggi bruci, domani ringrazi 💪",
    "Ogni minuto di cardio e' salute in banca 🔥",
    "Il cuore e' un muscolo: oggi lo alleni anche lui 💪",
    "Oggi la resistenza cresce insieme alla forza 🔥",
    "Suda oggi, respira meglio domani 💪",
    "Ogni battito in piu' e' un passo verso la forma 🔥",
    "Oggi il fiato si allena quanto i muscoli 💪",
    "Cardio non e' punizione, e' investimento 🔥",
    "Oggi il cuore lavora, e tu con lui 💪",
    "Resistenza oggi, energia per tutto il resto 🔥",
    "Un passo alla volta, oggi si costruisce fiato 💪",
  ],
  'Altro': [
    "Oggi si lavora, punto 💪",
    "Ogni allenamento conta 🔥",
    "Non serve un muscolo specifico per dare il massimo oggi 💪",
    "Oggi la costanza vale piu' della perfezione 🔥",
    "Un allenamento in piu' e' sempre un allenamento in piu' 💪",
    "Oggi ti alleni per te, non per nessun altro 🔥",
    "Ogni sessione e' un mattone sulla versione migliore di te 💪",
    "Oggi conta esserci, non essere perfetti 🔥",
    "Piccoli progressi, sommati, fanno grandi risultati 💪",
    "Oggi si suda, domani si raccoglie 🔥",
    "Nessuna scusa oggi 💪",
    "Presente, concentrato, pronto: si comincia 🔥",
  ],
};
const DEFAULT_MOTIVATION = [
  "Oggi e' il giorno giusto per allenarsi 💪",
  "Un altro passo avanti oggi 🔥",
  "Ogni allenamento e' un investimento su te stesso 💪",
  "Non serve motivazione perfetta, basta iniziare 🔥",
  "Oggi conta presentarsi 💪",
  "Piccoli passi, grandi risultati nel tempo 🔥",
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
  const suggestedHtml = suggestedDay ? `
    <button class="home-suggested-btn" style="--accent:${dayAccent(suggestedDay,suggestedIdx).c}" onclick="startDayFromHome(${suggestedIdx})">
      <span class="home-suggested-label">💥 OGGI TOCCA A</span>
      <span class="home-suggested-name">${escapeHtml(suggestedDay.name)}</span>
    </button>
    ${motivation ? `<div class="home-motivation">${escapeHtml(motivation)}</div>` : ''}` : '';
  el.innerHTML = `
    <div class="home-hero">
      <div class="home-block-week">SETTIMANA ${blockWeek} DI ${state.weeksPerBlock||4}</div>
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
