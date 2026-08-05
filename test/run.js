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

test('computeProgressionHint suggerisce una direzione ma non rivela mai il numero di ripetizioni fatte prima', () => {
  const window = loadApp();
  const exMoltoRipetute = { sets: [[{peso:60, rip:12}], [], [], []] };
  const hintPeso = window.computeProgressionHint(exMoltoRipetute, 1);
  assert.ok(hintPeso, 'con tante ripetizioni la scorsa settimana deve suggerire qualcosa');
  assert.ok(!/\d/.test(hintPeso), 'BUG: il suggerimento non deve contenere numeri (rivelerebbe indirettamente la performance precedente)');
  assert.ok(hintPeso.toLowerCase().includes('peso'), 'con reps alte deve spingere verso piu\' peso');

  const exPocheRipetute = { sets: [[{peso:60, rip:6}], [], [], []] };
  const hintRip = window.computeProgressionHint(exPocheRipetute, 1);
  assert.ok(hintRip.toLowerCase().includes('ripetiz'), 'con reps basse deve spingere verso piu\' ripetizioni');

  assert.strictEqual(window.computeProgressionHint({sets:[[]]}, 0), null, 'settimana 0 non ha una settimana precedente con cui confrontarsi');
  assert.strictEqual(window.computeProgressionHint({sets:[[],[]]}, 1), null, 'nessun dato la settimana scorsa -> nessun suggerimento');
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
