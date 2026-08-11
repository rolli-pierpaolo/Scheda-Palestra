// ---------------- HOME ----------------
// pagina che si apre quando non c'e' un allenamento in corso (vedi app-init.js
// e workoutInProgress in state.js): elenco giorni, progresso settimanale e
// giorno suggerito, tutto calcolato dal calendario che gia' esiste
function showHome(){
  // azzera "in corso" SOLO se il giorno attivo risulta gia' tutto chiuso
  // (fatto/saltato) ma mai confermato con "Giorno terminato": quello sì che
  // e' un allenamento abbandonato a meta' del tutto, che altrimenti
  // resterebbe "in corso" per sempre. BUG risolto qui: prima si azzerava
  // SEMPRE al primo tocco sulla Home, anche con l'allenamento vero a meta'
  // (solo alcuni esercizi fatti) - bastava dare un'occhiata alla Home per
  // "perdere" la sessione, e riaprendo l'app (o tornando su Allenamento) si
  // veniva rimandati al giorno suggerito invece che a quello dove si era
  // rimasti davvero
  if(workoutInProgress){
    const day = state.days[activeDayIdx];
    if(day && allExercisesClosed(day)){
      workoutInProgress = false;
      saveWorkoutInProgress();
    }
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
// generica apposta (non piu' per gruppo muscolare): quelle specifiche per
// distretto ora si vedono gia' sui singoli esercizi (vedi computeProgressionHint
// in js/utils.js), qui in Home ripeterle sarebbe ridondante - stabile per
// tutto il giorno (non cambia a ogni render, non usa Math.random), ruota in
// sequenza cosi' non si ripete mai la stessa frase due giorni di fila (torna
// a capo solo dopo aver fatto vedere tutte le altre del pool)
function pickMotivationalPhrase(){
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DEFAULT_MOTIVATION[dayIndex % DEFAULT_MOTIVATION.length];
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
  const iconMap = { '🔥':ICON_FLAME_COLOR, '💥':ICON_LIGHTNING_COLOR, '💪':ICON_PLATE_COLOR, '🦵':ICON_PLATE_COLOR };
  return { text: phrase.slice(0, m.index).trim(), icon: iconMap[m[1]] || '' };
}
// gruppi muscolari con almeno un esercizio segnato COMPLETATO nella
// settimana corrente (in qualsiasi giorno): solo "completata" conta come
// muscolo davvero allenato, "saltata" no - stessa logica di ogni altro punto
// dell'app che tratta weekDone come la fonte di verita' del lavoro fatto
function computeWeeklyMuscleActivation(){
  const w = state.currentWeek || 0;
  const trained = new Set();
  (state.days||[]).forEach(day => {
    (day.esercizi||[]).forEach(ex => {
      if(ex.weekDone && ex.weekDone[w]){
        const g = getExerciseGroup(ex.nome);
        if(g) trained.add(g);
      }
    });
  });
  return trained;
}
// due sagome (davanti/dietro - servono entrambe, dal solo davanti non si
// vedono schiena/femorali/glutei e viceversa) fatte di due livelli: un corpo
// "base" sempre dello stesso colore (solo per dare la forma di una persona
// intera - testa, tronco, braccia, gambe, mani, piedi) e sopra delle regioni
// muscolari che si accendono singolarmente, invece delle forme fluttuanti
// scollegate della prima versione
const BODY_BASE_SHAPES =
  '<ellipse cx="50" cy="15" rx="9" ry="10.5"/>' +
  '<path d="M44,24 L56,24 L57,31 L43,31 Z"/>' +
  '<path d="M44,30 C36,30 27,33 26,40 C25,48 27,56 30,64 C31,70 34,76 38,80 L36,88 C36,91 39,93 42,93 L58,93 C61,93 64,91 64,88 L62,80 C66,76 69,70 70,64 C73,56 75,48 74,40 C73,33 64,30 56,30 Z"/>' +
  '<path d="M27,33 C19,34 13,40 12,49 L10,84 C9,94 9,101 11,107 C12,111 16,113 19,113 C22,113 25,111 26,107 C27,101 26,94 26,87 L28,49 C29,41 29,35 27,33 Z"/>' +
  '<path d="M73,33 C81,34 87,40 88,49 L90,84 C91,94 91,101 89,107 C88,111 84,113 81,113 C78,113 75,111 74,107 C73,101 74,94 74,87 L72,49 C71,41 71,35 73,33 Z"/>' +
  // dita (sinistra): un piccolo ventaglio di 4 dita + pollice ruotati attorno
  // al polso, invece della mano-blob tonda - e' il dettaglio che si nota di
  // piu' in un riferimento anatomico e mancava del tutto prima
  '<rect x="10" y="110" width="2.4" height="9" rx="1.2" transform="rotate(-18 11.2 110)"/>' +
  '<rect x="13.5" y="112.5" width="2.4" height="9.5" rx="1.2" transform="rotate(-6 14.7 112.5)"/>' +
  '<rect x="17.5" y="113" width="2.4" height="10" rx="1.2" transform="rotate(4 18.7 113)"/>' +
  '<rect x="21.5" y="111" width="2.4" height="9" rx="1.2" transform="rotate(14 22.7 111)"/>' +
  '<rect x="8.5" y="102" width="2.2" height="7.5" rx="1.1" transform="rotate(-40 9.6 102)"/>' +
  '<path d="M38,88 C35,88 33,92 33,98 L33,124 C33,130 35,133 39,133 L47,133 C50,133 51,130 51,124 L51,98 C51,92 48,88 45,88 Z"/>' +
  '<path d="M35,133 C34,133 33,137 33,142 L33,168 C33,174 35,178 39,178 L45,178 C48,178 49,174 49,168 L49,142 C49,137 47,133 45,133 Z"/>' +
  '<ellipse cx="41" cy="184" rx="9" ry="5.5"/>' +
  '<path d="M62,88 C65,88 67,92 67,98 L67,124 C67,130 65,133 61,133 L53,133 C50,133 49,130 49,124 L49,98 C49,92 52,88 55,88 Z"/>' +
  '<path d="M65,133 C66,133 67,137 67,142 L67,168 C67,174 65,178 61,178 L55,178 C52,178 51,174 51,168 L51,142 C51,137 53,133 55,133 Z"/>' +
  '<ellipse cx="59" cy="184" rx="9" ry="5.5"/>' +
  // mano destra: stesse dita specchiate (x'=100-x-width, rotazione di segno opposto)
  '<rect x="87.6" y="110" width="2.4" height="9" rx="1.2" transform="rotate(18 88.8 110)"/>' +
  '<rect x="84.1" y="112.5" width="2.4" height="9.5" rx="1.2" transform="rotate(6 85.3 112.5)"/>' +
  '<rect x="80.1" y="113" width="2.4" height="10" rx="1.2" transform="rotate(-4 81.3 113)"/>' +
  '<rect x="76.1" y="111" width="2.4" height="9" rx="1.2" transform="rotate(-14 77.3 111)"/>' +
  '<rect x="89.3" y="102" width="2.2" height="7.5" rx="1.1" transform="rotate(40 90.4 102)"/>';
// linee sottili di definizione muscolare (sempre le stesse, non legate al
// completato/non completato - decorazione fissa, come le venature del
// riferimento anatomico) sovrapposte sopra le regioni colorate
const BODY_DETAIL_FRONT =
  '<path d="M33,36 Q50,32 67,36"/><path d="M50,38 L50,86"/>' +
  '<path d="M17,44 Q13,58 17,72"/><path d="M83,44 Q87,58 83,72"/>' +
  '<path d="M42,92 L42,130"/><path d="M58,92 L58,130"/>';
const BODY_DETAIL_BACK =
  '<path d="M50,30 L50,86"/><path d="M40,30 L50,40"/><path d="M60,30 L50,40"/>' +
  '<path d="M36,46 Q41,60 39,80"/><path d="M64,46 Q59,60 61,80"/>' +
  '<path d="M42,92 Q50,96 58,92"/><path d="M42,100 L42,130"/><path d="M58,100 L58,130"/>';
// dimensioni riviste per riempire davvero la parte del corpo che occupano
// (spalla/petto/addome/braccio/coscia), non piu' forme piccole che
// galleggiavano dentro una sagoma molto piu' grande di loro
const MUSCLE_MAP_REGIONS_FRONT = [
  { group:'Spalle', shape:'<ellipse cx="25" cy="42" rx="8" ry="7"/><ellipse cx="75" cy="42" rx="8" ry="7"/>' },
  { group:'Petto', shape:'<ellipse cx="39" cy="46" rx="10" ry="11"/><ellipse cx="61" cy="46" rx="10" ry="11"/>' },
  { group:'Addominali', shape:'<rect x="41" y="60" width="8" height="8" rx="2.2"/><rect x="51" y="60" width="8" height="8" rx="2.2"/>' +
    '<rect x="41" y="69" width="8" height="8" rx="2.2"/><rect x="51" y="69" width="8" height="8" rx="2.2"/>' +
    '<rect x="41" y="78" width="8" height="8" rx="2.2"/><rect x="51" y="78" width="8" height="8" rx="2.2"/>' },
  { group:'Bicipiti', shape:'<ellipse cx="19" cy="51" rx="7" ry="13"/><ellipse cx="81" cy="51" rx="7" ry="13"/>' },
  { group:'Quadricipiti', shape:'<ellipse cx="42" cy="108" rx="8.5" ry="21"/><ellipse cx="58" cy="108" rx="8.5" ry="21"/>' }
];
const MUSCLE_MAP_REGIONS_BACK = [
  { group:'Schiena', shape:'<path d="M30,33 C29,37 32,43 36,47 L34,63 C33,74 37,82 42,88 L58,88 C63,82 67,74 66,63 L64,47 C68,43 71,37 70,33 C64,30 57,28 50,28 C43,28 36,30 30,33 Z"/>' },
  { group:'Tricipiti', shape:'<ellipse cx="19" cy="51" rx="7" ry="13"/><ellipse cx="81" cy="51" rx="7" ry="13"/>' },
  { group:'Glutei', shape:'<ellipse cx="42" cy="97" rx="9" ry="11"/><ellipse cx="58" cy="97" rx="9" ry="11"/>' },
  { group:'Femorali', shape:'<ellipse cx="42" cy="120" rx="8.5" ry="16"/><ellipse cx="58" cy="120" rx="8.5" ry="16"/>' },
  { group:'Polpacci', shape:'<ellipse cx="42" cy="153" rx="7.5" ry="21"/><ellipse cx="58" cy="153" rx="7.5" ry="21"/>' }
];
function renderBodyFigure(regions, trained, detailLines){
  const regionsHtml = regions.map(r =>
    `<g class="body-region${trained.has(r.group)?' trained':''}">${r.shape}</g>`
  ).join('');
  return `<svg viewBox="0 0 100 195" class="body-figure"><g class="body-base">${BODY_BASE_SHAPES}</g>${regionsHtml}<g class="body-detail">${detailLines}</g></svg>`;
}
function renderMuscleMap(accent){
  const trained = computeWeeklyMuscleActivation();
  const extras = ['Cardio','Altro'].filter(g=>trained.has(g));
  return `<div class="home-muscle-map" style="--accent:${accent}">
    <div class="home-muscle-map-label">Muscoli</div>
    <div class="home-muscle-figures">
      <div class="home-muscle-figure-wrap">${renderBodyFigure(MUSCLE_MAP_REGIONS_FRONT, trained, BODY_DETAIL_FRONT)}<span class="home-muscle-figure-caption">Davanti</span></div>
      <div class="home-muscle-figure-wrap">${renderBodyFigure(MUSCLE_MAP_REGIONS_BACK, trained, BODY_DETAIL_BACK)}<span class="home-muscle-figure-caption">Dietro</span></div>
    </div>
    ${extras.length ? `<div class="home-muscle-extras">+ ${extras.join(', ')}</div>` : ''}
  </div>`;
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
  // piccolo assaggio della dashboard Andamenti direttamente in Home (invece
  // di doverci entrare apposta da Storico > Strumenti): confronta le ultime
  // due settimane gia' concluse, vedi computeHomeVolumeTrend in js/trends.js
  const volumeTrend = computeHomeVolumeTrend();
  const volumeTrendHtml = volumeTrend ? `<div class="home-volume-trend">${ICON_CHART} Volume settimana scorsa: <b>${volumeTrend.pct>=0?'+':''}${volumeTrend.pct}%</b> rispetto a quella prima</div>` : '';
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
    <div class="home-middle-row">
      <div class="home-days-col">
        <div class="home-days-label">I tuoi giorni</div>
        <div class="home-days-grid">${dayButtons}</div>
      </div>
      <div class="home-muscle-slot">${renderMuscleMap(progressAccent)}</div>
    </div>
    <div class="home-total-stat">${ICON_FLAME} ${monthlyCount} allenamenti completati questo mese</div>
    ${volumeTrendHtml}
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
  gsap.set(".home-day-card.active-training", { scale: 1.1 });
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

