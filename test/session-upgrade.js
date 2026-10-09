const assert=require('assert');
const {loadApp}=require('./app-loader');
let count=0;
function fixture(){
  const w=loadApp();
  w.__bridge.state={title:'Test',currentWeek:0,weeksPerBlock:2,days:[{name:'Pull',esercizi:[{nome:'Lat',recupero:['90','90'],schema:['2x8','2x8'],sets:[[{peso:'40',rip:'8'},{peso:'30',rip:'10'}],[{peso:'40',rip:''}]]}]}]};
  w.__bridge.activeDayIdx=0;w.__bridge.activeExerciseIdx=0;
  w.prepareWorkoutIdentity();return w;
}
function test(name,fn){const w=fixture();try{fn(w);count++;console.log('ok - '+name);}finally{w.close();}}
test('spunte seguono rinomina e riordino e sopravvivono al backup',w=>{
  w.completeSeriesUI(0,0,0,null);
  const ex=w.__bridge.state.days[0].esercizi[0];ex.nome='Lat rinominata';w.__bridge.state.days[0].name='Nuovo giorno';
  const copy=JSON.parse(JSON.stringify(ex));w.__bridge.state.days[0].esercizi.unshift(copy);w.prepareWorkoutIdentity();
  // Una copia aggiunta davanti non deve appropriarsi dell'identita del vecchio esercizio.
  assert.notEqual(ex.uiId,copy.uiId);
  assert(w.seriesUIFinished(w.seriesUIEntries(1,0,0,null)));
  assert(!w.seriesUIFinished(w.seriesUIEntries(0,0,0,null)));
  const backup=w.buildBackupPayload();assert.equal(backup.schemaVersion,2);assert.equal(backup.finishedSeries.length,1);
  assert(w.validateBackup(backup).valid);w.applyBackup(JSON.parse(JSON.stringify(backup)));
  assert(w.buildBackupPayload().finishedSeries.length===1);
  assert(w.seriesUIFinished(w.seriesUIEntries(1,0,0,null)));
});
test('spunte migrano dal formato precedente senza cambiare kg e ripetizioni',w=>{
  const state=w.__bridge.state,ex=state.days[0].esercizi[0];
  const old=JSON.stringify([state.title,state.programStartDate,0,'Pull',0,'Lat',0,0,0]);
  const other=loadApp({viridis_finished_series_v1:JSON.stringify([[old,'40|8']])});
  try{other.__bridge.state=JSON.parse(JSON.stringify(state));other.prepareWorkoutIdentity();assert(other.seriesUIFinished(other.seriesUIEntries(0,0,0,null)));assert.equal(other.__bridge.state.days[0].esercizi[0].sets[0][0].rip,'8');}finally{other.close();}
});
test('volume include Max una sola volta ed esclude valori ambigui',w=>{
  const ex=w.__bridge.state.days[0].esercizi[0];ex.maxEntries=[[{afterSet:0,peso:'20',rip:'5'},{afterSet:0,peso:'20',rip:'8/6'}],[]];ex.maxExtra=[[{peso:'20',rip:'5'}],[]];
  assert.equal(w.computeWeekTotalVolume(0),720);
  assert.equal(w.computeExerciseTrend('Lat').volumePoints[0].value,720);
});
test('le nuove sessioni conservano date e valori anche dopo modifiche della scheda',w=>{
  w.captureWorkoutSession(0);const session=w.__bridge.state.sessionHistory[0];assert(session.date);
  w.captureWorkoutSession(0);assert.equal(w.__bridge.state.sessionHistory.length,1);
  w.__bridge.state.days[0].esercizi[0].sets[0][0].rip='12';
  assert.equal(session.exercises[0].sets[0].rip,'8');
  const history=w.collectExerciseHistory('Lat');assert.equal(history.length,1);assert.equal(history[0].rows[0].rip,'8');
});
test('backup vecchi restano importabili e spunte corrotte sono respinte',w=>{
  assert(w.validateBackup({schemaVersion:1,state:w.__bridge.state}).valid);
  assert(!w.validateBackup({state:w.__bridge.state,finishedSeries:[[{},'8']]}).valid);
  assert(!w.validateBackup({state:{...w.__bridge.state,sessionHistory:[{exercises:null}]}}).valid);
  assert(!w.validateBackup({state:{...w.__bridge.state,exerciseAliases:[42]}}).valid);
});
test('confronto visibile prima di digitare e senza delta tra carichi diversi',w=>{
  const ex=w.__bridge.state.days[0].esercizi[0];w.__bridge.state.currentWeek=1;ex.sets[1][0]={peso:'50',rip:'10'};w.renderActive();
  const button=w.document.querySelector('.previous-set-button');assert(button);assert(button.textContent.includes('40 kg'));
  w.showRepComparison(0,1,0,button);assert(!button.closest('.rip-cell').querySelector('.rep-comparison').textContent.includes('+2'));
});
test('estendere il blocco conserva le spunte Max senza copiarle nelle settimane nuove',w=>{
  const ex=w.__bridge.state.days[0].esercizi[0];
  ex.maxEntries=[[{afterSet:0,peso:'20',rip:'6'}],[]];
  w.completeSeriesUI(0,0,0,null);w.extendWeeksPerBlock(3);w.prepareWorkoutIdentity();
  assert(w.seriesUIFinished(w.seriesUIEntries(0,0,0,null)));
  assert.equal(ex.maxEntries[2][0].rip,'');
  assert.notEqual(ex.maxEntries[0][0].uiId,ex.maxEntries[2][0].uiId);
});
test('lo storico conserva anche una registrazione composta solo da Max',w=>{
  const ex=w.__bridge.state.days[0].esercizi[0];ex.sets[0].forEach(s=>s.rip='');
  ex.maxEntries=[[{afterSet:0,peso:'20',rip:'6'}],[]];w.captureWorkoutSession(0);
  assert.equal(w.collectExerciseHistory('Lat')[0].rows[0].label,'Max 1 · dopo serie 1');
  ex.nome='Nuovo nome';assert(w.getAllExerciseNamesEverUsed().includes('Lat'));
});
test('un archivio rinominato mantiene sessioni e filtri nella stessa scheda',w=>{
  w.captureWorkoutSession(0);
  w.__bridge.storicoExtra={'Archivio rinominato':JSON.parse(JSON.stringify(w.__bridge.state.days))};
  w.__bridge.state.days=[];
  const records=w.collectExerciseHistory('Lat');
  assert.equal(records.length,1);assert.equal(records[0].blockKey,'archive:Archivio rinominato');
});
test('la posizione nel backup segue esercizio e giorno dopo il riordino',w=>{
  const state=w.__bridge.state,day=state.days[0],ex=day.esercizi[0];
  const backup=JSON.parse(JSON.stringify(w.buildBackupPayload()));
  backup.workoutSession.position=JSON.stringify({week:0,dayId:day.uiId,exId:ex.uiId,top:480,series:1,offset:180});
  backup.state.days.unshift({name:'Altro',esercizi:[]});
  w.applyBackup(backup);
  w.document.querySelectorAll('.ex-carousel-slide.current .set-series-group')[1].getBoundingClientRect=()=>({top:660});
  assert.equal(w.__bridge.activeDayIdx,1);assert.equal(w.workoutViewScrollTop('active'),480);
});
test('il confronto Max segue la serie madre anche con un Max nuovo precedente',w=>{
  const ex=w.__bridge.state.days[0].esercizi[0];
  ex.sets[1].push({peso:'30',rip:''});
  ex.maxEntries=[[{afterSet:1,peso:'15',rip:'6'}],[{afterSet:0,peso:'25',rip:''},{afterSet:1,peso:'17',rip:''}]];
  assert.equal(w.previousMaxEntry(ex,1,1).peso,'15');
  assert.equal(w.previousMaxEntry(ex,1,0),null);
  let message='';w.showQuickToast=text=>message=text;
  w.showMaxRepComparison(0,1,1);assert(message.includes('15 kg × 6'));assert(!message.includes('+'));
});
test('le date dei filtri seguono il giorno locale',w=>{
  const date=new w.Date(2026,9,9,0,15);
  assert.equal(w.historyDateKey(date.toISOString()),'2026-10-09');
  assert.equal(w.historyDateKey('non valida'),'');
});
test('lo storico in sheet torna alla sua sede senza cambiare pagina',w=>{
  w.renderActive();const results=w.document.getElementById('exerciseHistoryResults'),parent=results.parentElement;
  w.openExerciseHistory(0);assert(results.closest('#exerciseHistorySheet'));
  w.closeExerciseHistorySheet();assert.equal(results.parentElement,parent);assert(!w.document.getElementById('exerciseHistorySheet'));
});
test('passaggio esercizio cerca prima avanti e poi recupera il primo precedente aperto',w=>{
  const day=w.__bridge.state.days[0],base=day.esercizi[0];
  day.esercizi=Array.from({length:5},(_,i)=>({...JSON.parse(JSON.stringify(base)),nome:'Esercizio '+i,weekDone:[false,false],weekSkipped:[false,false]}));
  day.esercizi[1].weekDone[0]=true;day.esercizi[2].weekSkipped[0]=true;
  assert.equal(w.nextCardIndex(0),3);
  day.esercizi[4].weekDone[0]=true;
  assert.equal(w.nextCardIndex(3),0);
  day.esercizi[0].weekDone[0]=true;
  assert.equal(w.nextCardIndex(3),5);
});
test('la navigazione tratta le coppie come un gruppo e controlla entrambi i componenti',w=>{
  const day=w.__bridge.state.days[0],base=day.esercizi[0];
  day.esercizi=Array.from({length:4},(_,i)=>({...JSON.parse(JSON.stringify(base)),nome:'Esercizio '+i,weekDone:[false,false]}));
  day.esercizi[1].linkGroupId=day.esercizi[2].linkGroupId='coppia';
  day.esercizi[1].linkType=day.esercizi[2].linkType='jumpset';
  day.esercizi[1].weekDone[0]=true;
  assert.equal(w.nextCardIndex(0),1);
  day.esercizi[2].weekDone[0]=true;
  assert.equal(w.nextCardIndex(0),3);
  assert.equal(w.nextCardIndex(2),3);
});
test('completa e salta usano il prossimo aperto e conservano la richiesta di fine giornata',w=>{
  const day=w.__bridge.state.days[0],base=day.esercizi[0];
  day.esercizi=Array.from({length:3},(_,i)=>({...JSON.parse(JSON.stringify(base)),nome:'Esercizio '+i,weekDone:[false,false]}));
  day.esercizi[1].weekDone[0]=true;
  w.renderActive();const callbacks=[];w.setTimeout=(fn,ms)=>{if(ms===250)callbacks.push(fn);return 1;};
  let moved=null,finished=0;w.goToExerciseSlide=i=>moved=i;
  w.promptFinishWorkoutWhenReady=()=>{if(w.allExercisesClosed(day))finished++;};
  w.toggleWeekDone(0,0);callbacks.pop()();assert.equal(moved,2);
  moved=null;w.toggleWeekSkipped(2,0);callbacks.pop()();assert.equal(moved,null);assert.equal(finished,1);
});
test('un cambio esercizio manuale annulla il salto automatico in attesa',w=>{
  const day=w.__bridge.state.days[0];day.esercizi.push(JSON.parse(JSON.stringify(day.esercizi[0])));
  let callback;w.setTimeout=fn=>{callback=fn;return 1;};let moves=0;w.goToExerciseSlide=()=>moves++;
  w.advanceToOpenExercise(0,0);w.__bridge.activeExerciseIdx=1;callback();assert.equal(moves,0);
});
console.log(count+' test aggiornamento passati');
