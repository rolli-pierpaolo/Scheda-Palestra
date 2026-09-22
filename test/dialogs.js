const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {loadApp} = require('./app-loader');
const tests = [];
const test = (name, run) => tests.push({name, run});
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
async function until(find){
  const deadline=Date.now()+2000;
  while(Date.now()<deadline){const value=find();if(value)return value;await tick();}
  throw new Error('Interfaccia non pronta entro 2 secondi');
}
function app(){
  const w = loadApp();
  ['alert','confirm','prompt'].forEach(name => { w[name] = () => { throw new Error('Dialogo nativo: ' + name); }; });
  w.__bridge.accessibilityPrefs.reduceMotion = true;
  w.__bridge.activeDayIdx = 0;
  w.__bridge.state = {title:'Test',weeksPerBlock:4,currentWeek:0,completedWeeks:[],completedTrainingDays:[],days:[{name:'A',esercizi:[exercise(),exercise()]}]};
  w.renderActive = () => {};
  return w;
}
function exercise(){
  return {nome:'Test',recupero:['60','60','60','60'],schema:['3x8','3x8','3x8','3x8'],sets:Array.from({length:4},()=>Array.from({length:3},()=>({peso:'',rip:''}))),weekDone:[false,false,false,false],weekSkipped:[false,false,false,false]};
}
async function click(w, text){
  const button = await until(()=>[...w.document.querySelectorAll('.viridis-dialog button')].find(b => b.textContent === text && !b.disabled));
  assert.ok(button, 'Pulsante mancante: '+text);
  button.click();
  await tick();
}
test('nessuna chiamata nativa nel codice applicativo', () => {
  const root = path.join(__dirname,'..');
  const sources = fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')&&!f.endsWith('.min.js')).map(f=>path.join(root,'js',f));
  sources.push(path.join(root,'index.html'));
  sources.forEach(file => assert.ok(!/(?:\bwindow\s*\.\s*)?\b(?:alert|prompt|confirm)\s*\(/.test(fs.readFileSync(file,'utf8')),file));
});
test('Max: scelta dinamica, nessun input, partner e cascata identici, doppio tap singolo', async () => {
  const w=app(), [ex, partner]=w.__bridge.state.days[0].esercizi;
  for(const n of [1,3,5,40]){
    ex.sets[0]=Array.from({length:n},()=>({peso:'',rip:''}));
    const before=JSON.stringify(w.__bridge.state);
    const cancelled=w.requestAddMax(0,0,1);
    await tick();
    assert.strictEqual(w.document.querySelectorAll('.viridis-option').length,n);
    assert.strictEqual(w.document.querySelector('.viridis-dialog input'),null);
    assert.strictEqual(w.document.activeElement.className,'viridis-dialog');
    await click(w,'Annulla'); await cancelled;
    assert.strictEqual(JSON.stringify(w.__bridge.state),before);
  }
  const pending=w.requestAddMax(0,0,1);
  await tick();
  const b=[...w.document.querySelectorAll('.viridis-option')].find(b=>b.textContent==='3');
  b.click(); b.click(); await pending;
  assert.strictEqual(ex.maxEntries[0].length,2);
  assert.deepStrictEqual(Array.from(ex.maxEntries[0],m=>m.afterSet),[2,2]);
  assert.strictEqual(partner.maxEntries[0].length,2);
  assert.strictEqual(ex.maxEntries[1].length,2);
  const again=w.requestAddMax(0,0,1); await click(w,'3'); await again;
  assert.strictEqual(ex.maxEntries[0].length,3);
  assert.strictEqual(partner.maxEntries[0].length,3);
  assert.strictEqual(w.document.querySelector('.viridis-overlay'),null);
  w.close();
});
test('rimozione Max: selezione gruppo, tutela dati e partner, annullamento', async () => {
  const w=app(), [ex,partner]=w.__bridge.state.days[0].esercizi;
  for(const e of [ex,partner]) e.maxEntries=[[{afterSet:0,peso:'10',rip:'8'},{afterSet:2,peso:'',rip:''}],[],[],[]];
  let pending=w.requestRemoveMax(0,0,1);
  await click(w,'Max dopo serie 1'); await click(w,'Annulla'); await pending;
  assert.strictEqual(ex.maxEntries[0].length,2);
  pending=w.requestRemoveMax(0,0,1);
  await click(w,'Max dopo serie 1'); await click(w,'Elimina'); await pending;
  assert.strictEqual(ex.maxEntries[0].length,1);
  assert.strictEqual(partner.maxEntries[0][0].afterSet,2);
  pending=w.requestRemoveMax(0,0,1); await click(w,'Elimina'); await pending;
  assert.strictEqual(ex.maxEntries[0].length,0);
  w.close();
});
test('conferme: Esc, focus, sfondo inerte e coda non sovrapposta', async () => {
  const w=app(), trigger=w.document.getElementById('settingsBtn');
  trigger.focus();
  const a=w.ViridisConfirmDialog('Eliminare questo esercizio?');
  const b=w.ViridisConfirmDialog('Confermi il nuovo ordine?');
  await tick();
  assert.strictEqual(w.document.querySelectorAll('.viridis-overlay').length,1);
  assert.ok(w.document.querySelector('.viridis-primary.is-danger'));
  assert.ok(w.document.querySelector('.topbar').inert);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.strictEqual(await a,false);
  await click(w,'Conferma');
  assert.strictEqual(await b,true);
  assert.strictEqual(w.document.activeElement,trigger);
  assert.ok(!w.document.querySelector('.topbar').inert);
  w.close();
});
test('RPE: validazione inline, tastiera decimale, valore e rimozione invariati', async () => {
  const w=app(), ex=w.__bridge.state.days[0].esercizi[0];
  const button=w.document.createElement('button');
  let pending=w.editRpe(0,0,0,button); await tick();
  const input=w.document.querySelector('.viridis-input');
  assert.strictEqual(input.inputMode,'decimal');
  input.value='11'; await click(w,'Continua');
  assert.strictEqual(input.getAttribute('aria-invalid'),'true');
  assert.strictEqual(ex.sets[0][0].rpe,undefined);
  input.value='8,5'; await click(w,'Continua'); await pending;
  assert.strictEqual(ex.sets[0][0].rpe,'8,5');
  pending=w.editRpe(0,0,0,button); await tick();
  w.document.querySelector('.viridis-input').value='';
  await click(w,'Continua'); await pending;
  assert.strictEqual(ex.sets[0][0].rpe,'');
  w.close();
});
test('backup: errori, annullamento e ripristino invocano gli stessi handler', async () => {
  const w=app(); let applied=0,pushed=0;
  w.applyBackup=()=>applied++; w.pushToCloud=()=>pushed++;
  const backup=JSON.stringify({state:{days:[]}});
  for(const choice of ['Annulla','Ripristina']){
    const pending=w.importBackup(); await tick();
    assert.ok(w.document.querySelector('textarea.viridis-input'));
    w.document.querySelector('.viridis-input').value=backup;
    await click(w,'Verifica backup'); await click(w,choice); await pending;
    assert.strictEqual(applied,choice==='Annulla'?0:1);
    assert.strictEqual(pushed,applied);
  }
  const invalid=w.importBackup(); await tick();
  w.document.querySelector('.viridis-input').value='{bad';
  await click(w,'Verifica backup'); await invalid; await tick();
  assert.ok(w.document.querySelector('.viridis-dialog').textContent.includes('Testo non valido'));
  await click(w,'Ho capito');
  assert.strictEqual(applied,1);
  w.close();
});
test('settimane iniziali: scelta e Annulla mantengono anche il fallback originale', async () => {
  const w=app(); w.__bridge.state.weeksPerBlock=null;
  let pending=w.ensureWeeksPerBlock(); await click(w,'7');
  assert.strictEqual(await pending,7);
  w.__bridge.state.weeksPerBlock=null;
  pending=w.ensureWeeksPerBlock(); await click(w,'Annulla');
  assert.strictEqual(await pending,4);
  w.close();
});
test('select: stessi value e onchange, nessun menu nativo', async () => {
  const w=app(); let count=0;
  const select=w.document.createElement('select');
  select.innerHTML='<option value="a">Primo</option><option value="b">Secondo</option>';
  select.onchange=()=>count++;
  w.document.body.append(select); await tick();
  assert.ok(select.hidden);
  select.nextElementSibling.click(); await click(w,'Secondo');
  await until(()=>select.value==='b');
  assert.strictEqual(select.value,'b'); assert.strictEqual(count,1);
  assert.strictEqual(select.nextElementSibling.textContent,'Secondo');
  w.close();
});
test('conferme distruttive: annullare lascia serie, giorni, libreria e condivisione invariati', async () => {
  const w=app(); w.ViridisConfirmDialog=async()=>false;
  w.__bridge.state.days[0].esercizi[0].sets[0][2].peso='10';
  const withData=JSON.stringify(w.__bridge.state);
  await w.removeSet(0,0); await w.deleteExercise(0); await w.deleteDay(0);
  assert.strictEqual(JSON.stringify(w.__bridge.state),withData);
  let removed=false; w.removeLibraryExercise=()=>removed=true;
  await w.removeExerciseFromLibrary('Test'); assert.ok(!removed);
  w.isSyncEnabled=()=>true;
  w.__bridge.supabaseClient={from:()=>{throw Error('Non deve cancellare');}};
  await w.revokeViewer('test');
  w.close();
});
test('Max su righe iniziali visibili: tutte le scelte, nessuna materializzazione prima del tocco', async()=>{
  const w=app(), ex=w.__bridge.state.days[0].esercizi[0];
  ex.sets=[[],[],[],[]];
  const body=w.document.createElement('div');
  body.className='week-body'; body.dataset.exi='0'; body.dataset.week='0';
  body.innerHTML='<div class="set-series-group"></div>'.repeat(4);
  w.document.body.append(body);
  const pending=w.requestAddMax(0,0); await tick();
  assert.strictEqual(w.document.querySelectorAll('.viridis-option').length,4);
  assert.strictEqual(ex.sets[0].length,0);
  await click(w,'3'); await pending;
  assert.strictEqual(ex.sets[0].length,0);
  assert.strictEqual(ex.maxEntries[0][0].afterSet,2);
  w.close();
});
test('archiviazione completa: stesso storico, stessi azzeramenti e ordine dei passaggi', async()=>{
  const w=app(); w.__bridge.state.completedWeeks=[0,1,2,3];
  w.__bridge.state.days[0].esercizi[0].sets[0][0]={peso:'80',rip:'8'};
  const original=JSON.stringify(w.__bridge.state.days);
  const names=['Archivio test','Nuovo test'];
  w.ViridisInputDialog=async()=>names.shift();
  w.ViridisWeeksPicker=async()=>'6';
  let confirmations=0;
  w.ViridisConfirmDialog=async()=>{confirmations++;return true;};
  await w.archiveAndReset();
  assert.strictEqual(confirmations,1);
  assert.strictEqual(JSON.stringify(w.__bridge.storicoExtra['Archivio test']),original);
  assert.strictEqual(w.__bridge.state.title,'Nuovo test');
  assert.strictEqual(w.__bridge.state.weeksPerBlock,6);
  assert.strictEqual(w.__bridge.state.days[0].esercizi[0].sets.length,6);
  assert.ok(!JSON.stringify(w.__bridge.state.days).includes('"peso":"80"'));
  w.close();
});
test('conferme accettate: serie con dati, esercizio con undo, giorni e libreria', async()=>{
  const w=app(); w.ViridisConfirmDialog=async()=>true;
  const ex=w.__bridge.state.days[0].esercizi[0];
  ex.sets[0][2].peso='10'; ex.sets[1][2].peso='20';
  await w.removeSet(0,0);
  assert.strictEqual(ex.sets[0].length,2);
  assert.strictEqual(ex.sets[1].length,3);
  await w.deleteExercise(0);
  assert.strictEqual(w.__bridge.state.days[0].esercizi.length,1);
  w.undoDeleteExercise(); assert.strictEqual(w.__bridge.state.days[0].esercizi.length,2);
  w.__bridge.state.days.push({name:'B',esercizi:[]});
  await w.deleteDay(1); assert.strictEqual(w.__bridge.state.days.length,1);
  let removed=''; w.removeLibraryExercise=name=>removed=name;
  w.renderExerciseLibrary=()=>{};
  await w.removeExerciseFromLibrary('Test'); assert.strictEqual(removed,'Test');
  w.close();
});
test('estensione blocco, riordino e bilanciere personalizzato', async()=>{
  const w=app(); w.ViridisConfirmDialog=async()=>false;
  const input={value:'6'};
  await w.handleExtendWeeksInput(input); assert.strictEqual(input.value,4);
  w.ViridisConfirmDialog=async()=>true; input.value='6';
  await w.handleExtendWeeksInput(input); assert.strictEqual(w.__bridge.state.weeksPerBlock,6);
  w.closeDaysModal();
  await w.confirmReorderOrder();
  let kg;
  w.setExerciseBarKg=value=>kg=value;
  const pending=w.promptCustomBarKg(); await tick();
  assert.strictEqual(w.document.querySelector('.viridis-input').inputMode,'decimal');
  w.document.querySelector('.viridis-input').value='8,5';
  await click(w,'Continua'); await pending; assert.strictEqual(kg,8.5);
  w.close();
});
test('cambio giornata: entrambi i rami originali restano distinti', async()=>{
  for(const choice of [false,true]){
    const w=app(); w.__bridge.state.days.push({name:'B',esercizi:[]});
    w.ViridisOptionPicker=async()=>choice;
    await w.askSwitchTrainingDay(1,0);
    assert.strictEqual(w.__bridge.state.currentTrainingDayIdx,1);
    assert.strictEqual(JSON.stringify(w.__bridge.state.weekOrder),choice?'[1,0]':undefined);
    w.__bridge.state.currentTrainingDayIdx=0;
    await w.confirmSwitchTrainingDay(1,0);
    assert.strictEqual(w.__bridge.state.currentTrainingDayIdx,choice?1:0);
    w.close();
  }
});
test('backup file e copia manuale: stessi payload, niente input nativi', async()=>{
  const w=app(); let applied=0, pushed=0;
  w.applyBackup=()=>applied++;w.pushToCloud=()=>pushed++;
  w.ViridisConfirmDialog=async()=>true;
  let reader;
  w.FileReader=class{constructor(){reader=this;}readAsText(){this.result='{"state":{"days":[]}}';}};
  w.importBackupFile({target:{files:[{}],value:'file'}});
  await reader.onload(); assert.strictEqual(applied,1); assert.strictEqual(pushed,1);
  const pending=w.promptFallbackExport('{"a":"<script>"}'); await tick();
  const field=w.document.querySelector('textarea.viridis-input');
  assert.ok(field.readOnly); assert.strictEqual(field.value,'{"a":"<script>"}');
  await click(w,'Fine'); await pending; w.close();
});
test('colore giorno: scelta e codice personalizzato richiamano updateDayColor', async()=>{
  const w=app(); let color;
  w.updateDayColor=(i,value)=>color=value;w.openDaysModal=()=>{};
  let pending=w.chooseDayColor(0); await click(w,'Verde'); await pending;
  assert.strictEqual(color,w.accentFor(null,0).c);
  pending=w.chooseDayColor(0); await click(w,'Colore personalizzato');
  const field=await until(()=>w.document.querySelector('.viridis-input'));
  field.value='#123abc'; await click(w,'Continua'); await pending;
  assert.strictEqual(color,'#123abc'); w.close();
});
test('vibrazione disabilitata e testo non interpretato come HTML', async()=>{
  const w=app(); w.__bridge.accessibilityPrefs.vibration=false;
  let vibrations=0;w.navigator.vibrate=()=>vibrations++;
  const pending=w.ViridisOptionPicker({title:'<img src=x>',choices:[{label:'<b>Scelta</b>',value:1}]});
  await click(w,'<b>Scelta</b>'); await pending;
  assert.strictEqual(vibrations,0);
  w.ViridisToast('<img src=x onerror=bad()>');
  assert.strictEqual(w.document.querySelector('.viridis-toast img'),null);
  w.close();
});
(async()=>{
  let failed=0;
  for(const {name,run} of tests){
    try{await run(); console.log('  ok - '+name);}
    catch(error){failed++; console.error('  FAIL - '+name+'\n'+error.stack);}
  }
  console.log(`${tests.length-failed} passati, ${failed} falliti su ${tests.length}`);
  process.exit(failed?1:0);
})();
