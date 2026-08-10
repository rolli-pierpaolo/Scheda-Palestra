// Rete di test minima (node test/run.js, oppure "npm test") per la logica
// che si e' gia' rotta in silenzio in passato e che abbiamo trovato solo
// testando a mano dal vivo sul telefono/browser - ogni test qui sotto
// riproduce ESATTAMENTE uno di quegli scenari, cosi' se un cambiamento futuro
// reintroduce lo stesso bug il test fallisce subito invece di scoprirlo su
// un allenamento vero. Nessun framework: solo assert nativo di Node + un
// runner fatto in casa di poche righe.
//
// Le variabili globali dell'app (state, collapsedMap...) si leggono/scrivono
// SEMPRE tramite window.__bridge (vedi app-loader.js), mai con "window.state
// = ..." diretto: essendo dichiarate con let/const nell'app non diventano
// proprieta' di window, quindi assegnarle direttamente non avrebbe alcun
// effetto sul binding vero che le funzioni leggono davvero. Le FUNZIONI
// invece si chiamano dirette su window (window.forceNextWeekForDay(...)):
// quelle, dichiarate con "function", sono gia' proprieta' di window di suo.
const assert = require('assert');
const { loadApp } = require('./app-loader');

const tests = [];
function test(name, fn){ tests.push({ name, fn }); }

test('forceNextWeekForDay collassa la vera settimana corrente, non quella indovinata dai dati esercizio', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4,
    currentWeek: 1, // settimana 2 (indice 1) - quella vera del programma
    days: [{
      name: 'Giorno A',
      esercizi: [{
        nome: 'Ex A', recupero: ['60s','60s','60s','60s'],
        // weekDone[0]=true ma NON weekDone[1]: una scansione ingenua
        // dell'array (il vecchio comportamento) troverebbe "0" come "ultima
        // segnata fatta" e chiuderebbe quella invece della vera settimana 1
        weekDone: [true, false, false, false], weekSkipped: [false,false,false,false]
      }]
    }]
  };
  window.__bridge.collapsedMap = {};
  window.forceNextWeekForDay(0, window.__bridge.state.currentWeek);
  const cm = window.__bridge.collapsedMap;
  assert.strictEqual(cm['0_0_1'], true, 'la settimana 2 (quella vera, appena conclusa) deve risultare chiusa');
  assert.strictEqual(cm['0_0_2'], false, 'la settimana 3 deve restare aperta di default');
  assert.notStrictEqual(cm['0_0_0'], true, 'BUG: non deve chiudere la settimana 1 solo perche\' e\' l\'ultima segnata "fatta" nell\'array');
});

test('forceNextWeekForDay tocca solo il giorno passato, non gli altri giorni', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [
      { name:'Giorno A', esercizi:[{ nome:'Ex A', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] }] },
      { name:'Giorno B', esercizi:[{ nome:'Ex B', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] }] }
    ]
  };
  window.__bridge.collapsedMap = {};
  window.forceNextWeekForDay(0, 0);
  const cm = window.__bridge.collapsedMap;
  assert.strictEqual(cm['0_0_0'], true);
  assert.strictEqual(cm['1_0_0'], undefined, 'il giorno B non finito non deve essere toccato');
});

test('closeWeekDoneConfirm spunta anche il partner di un esercizio collegato (superset/jumpset)', () => {
  const window = loadApp();
  window.__bridge.activeDayIdx = 0;
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [{
      name: 'Giorno A',
      esercizi: [
        { nome:'Ex A', linkGroupId:'g1', linkType:'superset', recupero:['60s','60s','60s','60s'], schema:['','','',''], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false], sets:[[],[],[],[]] },
        { nome:'Ex B', linkGroupId:'g1', linkType:'superset', recupero:['60s','60s','60s','60s'], schema:['','','',''], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false], sets:[[],[],[],[]] }
      ]
    }]
  };
  // come farebbe askWeekDoneConfirm quando si scrive nel primo dei due
  window.__bridge.weekDoneConfirmTarget = { exi: 0, w: 0 };
  window.closeWeekDoneConfirm(true);
  const days = window.__bridge.state.days;
  assert.strictEqual(days[0].esercizi[0].weekDone[0], true, 'il primo esercizio deve risultare spuntato');
  assert.strictEqual(days[0].esercizi[1].weekDone[0], true, 'BUG: anche il partner collegato deve risultare spuntato, non solo quello scritto');
});

test('computeCurrentDoingExerciseIdx punta al primo esercizio non ancora fatto, in ordine di esecuzione', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [{
      name: 'Giorno A',
      esercizi: [
        { nome:'Ex A', recupero:['60s','60s','60s','60s'], weekDone:[true,false,false,false], weekSkipped:[false,false,false,false] },
        { nome:'Ex B', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] },
        { nome:'Ex C', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] }
      ]
    }]
  };
  const days = window.__bridge.state.days;
  assert.strictEqual(window.computeCurrentDoingExerciseIdx(0), 1, 'Ex A fatto -> deve puntare a Ex B (indice 1)');
  days[0].esercizi[1].weekDone[0] = true;
  assert.strictEqual(window.computeCurrentDoingExerciseIdx(0), 2, 'A e B fatti -> deve puntare a Ex C (indice 2)');
  days[0].esercizi[2].weekDone[0] = true;
  assert.strictEqual(window.computeCurrentDoingExerciseIdx(0), 2, 'tutti fatti -> resta sull\'ultimo, non torna indietro');
});

test('allExercisesClosed usa la vera settimana del programma (state.currentWeek), non un indice indovinato', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 1,
    days: [{ name:'Giorno A', esercizi: [
      { nome:'Ex A', recupero:['60s','60s','60s','60s'], weekDone:[true,false,false,false], weekSkipped:[false,false,false,false] }
    ]}]
  };
  const day = window.__bridge.state.days[0];
  // l'esercizio ha finito la settimana 1 (indice 0), ma la settimana VERA del
  // programma e' la 2 (indice 1, non ancora toccata): il giorno non deve
  // risultare chiuso solo perche' un indice precedente e' spuntato
  assert.strictEqual(window.allExercisesClosed(day), false);
  day.esercizi[0].weekDone[1] = true;
  assert.strictEqual(window.allExercisesClosed(day), true);
});

test('getStorico unisce DATA.storico e storicoExtra; deleteHistEntry nasconde per sempre anche le voci baked-in', () => {
  const window = loadApp();
  window.__bridge.DATA.storico = { 'Demo-0': [{ name:'Demo', esercizi:[] }] };
  window.__bridge.storicoExtra = { 'WO 1': [{ name:'Reale', esercizi:[] }] };
  window.__bridge.deletedStorico = [];

  const before = window.getStorico();
  assert.ok(before['Demo-0'], 'deve includere le voci baked-in di DATA.storico');
  assert.ok(before['WO 1'], 'deve includere le voci reali di storicoExtra');

  window.deleteHistEntry('Demo-0'); // confirm() e' stubbato a true nel loader

  const after = window.getStorico();
  assert.ok(!after['Demo-0'], 'una volta eliminata non deve piu\' comparire (DATA.storico non si puo\' modificare davvero, va nascosta)');
  assert.ok(after['WO 1'], 'le altre voci non toccate devono restare');
  assert.ok(window.__bridge.deletedStorico.includes('Demo-0'), 'deve restare segnata come eliminata per sempre');
});

test('validateBackup accetta un backup vero e rifiuta quelli corrotti con un motivo specifico', () => {
  const window = loadApp();
  window.__bridge.state = { weeksPerBlock:4, currentWeek:0, days: [] };
  window.__bridge.storicoExtra = {};
  window.__bridge.collapsedMap = {};
  window.__bridge.deletedStorico = [];
  window.__bridge.calendarLog = {};
  window.__bridge.extraLists = {esercizi:[],recuperi:[],schemi:[],giorni:[]};
  window.__bridge.exerciseGroups = {};
  window.__bridge.deletedEsercizi = [];

  const good = window.buildBackupPayload();
  assert.strictEqual(window.validateBackup(good).valid, true);
  assert.strictEqual(good.schemaVersion, 1);

  assert.strictEqual(window.validateBackup({}).valid, false);
  assert.strictEqual(window.validateBackup({state:{days:'non-array'}}).valid, false);
  assert.strictEqual(window.validateBackup({state:{days:[{name:'A'}]}}).valid, false, 'un giorno senza array esercizi deve essere rifiutato');
  assert.strictEqual(window.validateBackup({state:{days:[]}, storicoExtra:[1,2]}).valid, false, 'un campo del tipo sbagliato deve essere rifiutato');
});

test('computeProgressionHint pesca dal pool motivazionale del GRUPPO MUSCOLARE dell\'esercizio, mai il numero di ripetizioni fatte prima', () => {
  const window = loadApp();
  window.__bridge.exerciseGroups = { 'panca piana': 'Petto' };
  const exMoltoRipetute = { nome:'Panca piana', sets: [[{peso:60, rip:12}], [], [], []] };
  const hintPeso = window.computeProgressionHint(exMoltoRipetute, 1);
  assert.ok(hintPeso, 'con tante ripetizioni la scorsa settimana deve suggerire qualcosa');
  assert.ok(hintPeso.icon, 'deve avere un\'icona colorata, come le frasi motivazionali di Home');
  assert.ok(!/\d/.test(hintPeso.text), 'BUG: il testo non deve contenere numeri (rivelerebbe indirettamente la performance precedente)');
  // la base della frase deve venire dal pool "Petto" (l'esercizio e' stato
  // assegnato a quel gruppo sopra), non da un pool generico qualsiasi
  const poolPettoTexts = window.__bridge.MUSCLE_MOTIVATION['Petto'].map(p => window.splitMotivation(p).text);
  assert.ok(poolPettoTexts.some(t => hintPeso.text.startsWith(t)), 'la frase deve iniziare con una base presa dal pool "Petto", non generica');
  assert.ok(window.__bridge.PROGRESSION_SUFFIX_PESO.some(s => hintPeso.text.endsWith(s)), 'con reps alte il suffisso deve venire dal pool "piu\' peso", non una frase fissa sempre uguale');

  const exSenzaGruppo = { nome:'Esercizio mai assegnato', sets: [[{peso:60, rip:6}], [], [], []] };
  const hintGenerico = window.computeProgressionHint(exSenzaGruppo, 1);
  const poolDefaultTexts = window.__bridge.DEFAULT_MOTIVATION.map(p => window.splitMotivation(p).text);
  assert.ok(poolDefaultTexts.some(t => hintGenerico.text.startsWith(t)), 'senza un gruppo assegnato deve ripiegare sul pool generico, non rompersi');

  // la frase motivazionale c'e' SEMPRE nella settimana corrente, a prescindere
  // dai dati delle settimane vecchie - anche alla primissima settimana in
  // assoluto (nessuna settimana precedente) o quando quella precedente non ha
  // dati validi, deve comunque comparire una frase (solo senza il suggerimento
  // extra di direzione, che li' non avrebbe nulla su cui basarsi)
  const hintPrimaSettimana = window.computeProgressionHint({nome:'Esercizio nuovo', sets:[[]]}, 0);
  assert.ok(hintPrimaSettimana, 'BUG: alla primissima settimana deve comunque esserci una frase motivazionale');
  const baseNuovoTexts = window.__bridge.DEFAULT_MOTIVATION.map(p => window.splitMotivation(p).text);
  assert.ok(baseNuovoTexts.includes(hintPrimaSettimana.text), 'senza settimana precedente il testo deve essere ESATTAMENTE la base, senza nessun suffisso di direzione');

  const hintSenzaDatiScorsi = window.computeProgressionHint({nome:'Esercizio B', sets:[[],[]]}, 1);
  assert.ok(hintSenzaDatiScorsi, 'BUG: anche senza dati validi la settimana scorsa deve comunque esserci una frase motivazionale');
  assert.ok(baseNuovoTexts.includes(hintSenzaDatiScorsi.text), 'senza dati validi la settimana scorsa il testo deve essere ESATTAMENTE la base, senza suffisso');

  assert.strictEqual(window.computeProgressionHint({sets:[[]]}, -1), null, 'una settimana negativa non ha senso');
});

test('computeExerciseTrend aggrega volume e 1RM stimato su mesi archiviati + settimane del blocco attivo', () => {
  const window = loadApp();
  window.__bridge.state = {
    title: 'Attuale', weeksPerBlock: 4, currentWeek: 1,
    days: [{ name:'Push', esercizi: [{
      nome: 'Panca piana', sets: [[{peso:60,rip:8}], [], [], []]
    }]}]
  };
  window.__bridge.storicoExtra = {
    'WO 1': [{ name:'Push', esercizi: [{ nome:'Panca piana', sets: [[{peso:55,rip:8}],[{peso:57,rip:8}],[],[]] }] }]
  };
  window.__bridge.storicoDates = { 'WO 1': '2026-07-01' };
  window.__bridge.deletedStorico = [];

  const { volumePoints, oneRMPoints } = window.computeExerciseTrend('Panca piana');
  assert.strictEqual(volumePoints.length, 2, 'un punto per il mese archiviato (aggregato) + uno per la settimana gia\' fatta nel blocco attivo');
  assert.strictEqual(volumePoints[0].label, 'WO 1', 'il mese archiviato deve venire prima (piu\' vecchio) ed etichettato col suo nome');
  assert.strictEqual(volumePoints[0].value, 55*8 + 57*8, 'il volume del mese archiviato somma TUTTE le sue settimane');
  assert.strictEqual(volumePoints[1].label, 'Sett. 1', 'il blocco attivo mostra un punto per settimana, non uno aggregato');
  assert.ok(oneRMPoints.length === 2 && oneRMPoints[1].value > 0);
});

test('computeHomeVolumeTrend confronta due settimane gia\' concluse, non "questo mese contro il precedente" mentre e\' ancora a meta\'', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 2,
    days: [{ name:'Push', esercizi: [{
      nome: 'Panca', sets: [[{peso:60,rip:8}], [{peso:66,rip:8}], [], []]
    }]}]
  };
  const trend = window.computeHomeVolumeTrend();
  assert.ok(trend, 'con 2 settimane concluse (indici 0 e 1) deve dare un risultato');
  assert.strictEqual(trend.pct, 10, '(66*8 - 60*8) / (60*8) = +10%');

  window.__bridge.state.currentWeek = 1;
  assert.strictEqual(window.computeHomeVolumeTrend(), null, 'con una sola settimana conclusa non c\'e\' ancora un confronto onesto da fare');
});

test('computeDayProgress conta le coppie collegate come UN solo esercizio e usa la vera settimana corrente', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [{ name:'Push', esercizi: [
      { nome:'Ex1', recupero:['60s','60s','60s','60s'], weekDone:[true,false,false,false], weekSkipped:[false,false,false,false] },
      { nome:'Ex2A', linkGroupId:'g1', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] },
      { nome:'Ex2B', linkGroupId:'g1', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false] },
      { nome:'Ex3', recupero:['60s','60s','60s','60s'], weekDone:[false,false,false,false], weekSkipped:[true,false,false,false] }
    ]}]
  };
  const day = window.__bridge.state.days[0];
  const progress = window.computeDayProgress(day);
  assert.strictEqual(progress.total, 3, 'la coppia collegata (Ex2A+Ex2B) deve contare come UN solo esercizio, non due');
  assert.strictEqual(progress.done, 2, 'Ex1 (fatto) + Ex3 (saltato, conta comunque come chiuso) = 2');
  assert.strictEqual(progress.items.length, 3);
  assert.strictEqual(progress.items[1].exi, 1, 'la voce della coppia punta al primo dei due indici (exi=1), non al partner');
});

test('toggleWeekSkipped ha lo stesso "mood" di toggleWeekDone: avvia l\'allenamento, e un mix fatto/saltato chiude comunque esercizio e giorno', () => {
  const window = loadApp();
  window.__bridge.activeDayIdx = 0;
  window.__bridge.workoutInProgress = false;
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [{ name:'Push', esercizi: [
      { nome:'Ex A', recupero:['60s','60s','60s','60s'], schema:['','','',''], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false], sets:[[],[],[],[]] }
    ]}]
  };
  window.toggleWeekSkipped(0, 0);
  assert.strictEqual(window.__bridge.workoutInProgress, true, 'saltare una settimana deve avviare "allenamento in corso", come completarla');

  const ex = window.__bridge.state.days[0].esercizi[0];
  assert.strictEqual(ex.weekSkipped[0], true);

  // chiude le altre settimane mescolando fatto/saltato
  ex.weekDone[1] = true; ex.weekSkipped[2] = true; ex.weekDone[3] = true;
  assert.strictEqual(window.exerciseFullyClosed(ex), true, 'fatta+saltata su tutte le settimane deve contare come esercizio chiuso, non solo tutto fatto');

  const day = window.__bridge.state.days[0];
  assert.strictEqual(window.allExercisesClosed(day), true, 'il giorno deve risultare chiuso (bottone "Giorno terminato") anche con un mix fatto/saltato');
});

test('updateSet non chiede "settimana completata?" su un esercizio collegato finche\' anche il partner non ha l\'ultima serie compilata', () => {
  const window = loadApp();
  window.__bridge.activeDayIdx = 0;
  window.__bridge.state = {
    weeksPerBlock: 4, currentWeek: 0,
    days: [{ name:'Upper', esercizi: [
      { nome:'Ex A', linkGroupId:'g1', recupero:['60s','60s','60s','60s'], schema:['','','',''], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false], sets:[[{peso:'',rip:''}],[],[],[]] },
      { nome:'Ex B', linkGroupId:'g1', recupero:['60s','60s','60s','60s'], schema:['','','',''], weekDone:[false,false,false,false], weekSkipped:[false,false,false,false], sets:[[{peso:'',rip:''}],[],[],[]] }
    ]}]
  };
  window.__bridge.weekDoneConfirmTarget = null;

  // compila l'ultima (unica, qui) serie del PRIMO esercizio - il partner
  // (Ex B) non ha ancora scritto nulla
  window.updateSet(0, 0, 0, 'peso', '50');
  window.updateSet(0, 0, 0, 'rip', '8');
  assert.strictEqual(window.__bridge.weekDoneConfirmTarget, null, 'BUG: non deve chiedere conferma finche\' il partner (Ex B) non ha finito anche lui');

  // ora compila anche il partner: SOLO ora deve scattare la conferma
  window.updateSet(1, 0, 0, 'peso', '50');
  window.updateSet(1, 0, 0, 'rip', '8');
  // niente deepStrictEqual: l'oggetto viene creato dentro il "realm" della
  // finestra jsdom, con un Object.prototype diverso da quello nativo di Node
  // - stessa forma ma "strict" li considererebbe comunque diversi
  const target = window.__bridge.weekDoneConfirmTarget;
  assert.ok(target, 'con entrambi compilati deve finalmente chiedere conferma');
  assert.strictEqual(target.exi, 1);
  assert.strictEqual(target.w, 0);
});

test('extendWeeksPerBlock allunga (mai riduce) le settimane del blocco in corso, copiando avanti l\'ultimo schema/recupero', () => {
  const window = loadApp();
  window.__bridge.state = {
    weeksPerBlock: 2, currentWeek: 0,
    days: [{ name:'Push', esercizi: [
      { nome:'Ex A', schema:['3x8','4x6'], recupero:['60s','90s'], weekNote:['',''], weekDone:[true,false], weekSkipped:[false,false], maxShown:[false,false],
        sets:[[{peso:50,rip:8}],[]], maxExtra:[[],[]] }
    ]}]
  };
  const ok = window.extendWeeksPerBlock(4);
  assert.strictEqual(ok, true);
  assert.strictEqual(window.__bridge.state.weeksPerBlock, 4);
  const ex = window.__bridge.state.days[0].esercizi[0];
  assert.strictEqual(ex.schema.length, 4);
  assert.strictEqual(ex.schema[2], '4x6', 'le settimane nuove ereditano l\'ultimo schema scritto');
  assert.strictEqual(ex.recupero[3], '90s', 'stesso principio per il recupero');
  assert.strictEqual(ex.weekDone[2], false);
  assert.strictEqual(ex.sets[0][0].peso, 50, 'le settimane gia\' scritte non devono essere toccate');
  // niente deepStrictEqual: gli array vengono creati dentro il "realm" della
  // finestra jsdom, con un Array.prototype diverso da quello nativo di Node
  assert.strictEqual(ex.sets[2].length, 0, 'le settimane nuove partono con le serie vuote');

  // due settimane nuove diverse non devono condividere lo stesso array (bug
  // gia' visto altrove in questo codice quando si riempie con un valore
  // condiviso invece che uno fresco per indice)
  ex.sets[2].push({peso:99, rip:1});
  assert.strictEqual(ex.sets[3].length, 0, 'BUG: le settimane nuove non devono condividere lo stesso array di serie');

  const notOk = window.extendWeeksPerBlock(3); // <= attuale (4), non deve ridurre
  assert.strictEqual(notOk, false);
  assert.strictEqual(window.__bridge.state.weeksPerBlock, 4, 'non deve mai ridurre le settimane da qui');
});

test('computeExerciseRepsAtSameWeight confronta le ripetizioni fatte allo stesso peso (il piu\' usato) nel tempo', () => {
  const window = loadApp();
  window.__bridge.state = {
    title:'Attuale', weeksPerBlock: 3, currentWeek: 2,
    days: [{ name:'Push', esercizi: [{
      nome:'Panca',
      sets: [[{peso:60,rip:6}], [{peso:60,rip:8}], [{peso:65,rip:5}]]
    }]}]
  };
  window.__bridge.storicoExtra = {};
  window.__bridge.storicoDates = {};
  window.__bridge.deletedStorico = [];

  const { referenceWeight, points } = window.computeExerciseRepsAtSameWeight('Panca');
  assert.strictEqual(referenceWeight, 60, '60kg e\' il peso usato piu\' spesso (2 volte contro 1)');
  assert.strictEqual(points.length, 2, 'solo i periodi dove e\' stato usato ESATTAMENTE quel peso');
  assert.strictEqual(points[0].value, 6);
  assert.strictEqual(points[1].value, 8, 'le rip a 60kg sono salite da 6 a 8: si vede il progresso a parita\' di peso');
});

// ---------------- runner ----------------
let passed = 0, failed = 0;
for(const t of tests){
  try{
    t.fn();
    passed++;
    console.log('  ok - ' + t.name);
  }catch(err){
    failed++;
    console.log('  FAIL - ' + t.name);
    console.log('    ' + (err && err.message ? err.message : err));
  }
}
console.log('\n' + passed + ' passati, ' + failed + ' falliti su ' + tests.length);
process.exit(failed > 0 ? 1 : 0);
