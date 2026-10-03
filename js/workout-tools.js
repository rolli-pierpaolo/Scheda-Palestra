const REST_PREF_KEY = 'viridis_rest_preferences_v1';
let restPreferences = {enabled:false,sound:true};
try{Object.assign(restPreferences,JSON.parse(localStorage.getItem(REST_PREF_KEY)||'{}'));}catch(e){}
let workoutRest = null, workoutRestInterval = null, restAudio = null;
const finishedSeriesUI = new Map();
const seriesEntryKeys = new WeakMap();

function restSecondsFromText(value){
  const text=String(value||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[”“]/g,'"');
  const match=text.match(/^(?:(?:super|jump)\s*set\s*)?(\d+)\s*(s|sec|secondi|"|''|m|min|minuti|')?$/);
  if(!match)return null;
  const seconds=Number(match[1])*(/^(m|min|minuti|')$/.test(match[2]||'')?60:1);
  return seconds>0&&seconds<=3600?seconds:null;
}
function unlockRestAudio(){
  if(!restPreferences.sound)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!restAudio)restAudio=new Audio();
    if(restAudio.state==='suspended')restAudio.resume().catch(()=>{});
  }catch(e){}
}
function playRestSignal(){
  vibrate([160,100,160]);
  if(!restPreferences.sound)return false;
  if(!restAudio||restAudio.state!=='running')return false;
  try{
    [0,.3,.6].forEach(offset=>{
      const oscillator=restAudio.createOscillator(),gain=restAudio.createGain();
      const start=restAudio.currentTime+offset;
      oscillator.frequency.value=740;gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(.16,start+.025);
      gain.gain.exponentialRampToValueAtTime(.001,start+.22);
      oscillator.connect(gain);gain.connect(restAudio.destination);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      oscillator.start(start);oscillator.stop(start+.23);
    });return true;
  }catch(e){return false;}
}
function saveRestPreferences(){try{localStorage.setItem(REST_PREF_KEY,JSON.stringify(restPreferences));}catch(e){} }
async function configureWorkoutRest(){
  // Crea il contesto audio durante il gesto utente, prima di aprire il dialogo.
  unlockRestAudio();
  const action=await ViridisOptionPicker({title:'Recupero facoltativo',
    message:'Avviso sonoro con app aperta e vibrazione dove supportata. Con iPhone bloccato gli avvisi non sono garantiti. Prova il suono prima di usarlo.',
    choices:[{label:restPreferences.enabled?'Disattiva timer automatico':'Attiva timer dopo Completa serie',value:'toggle'},
      {label:restPreferences.sound?'Disattiva suono':'Attiva suono',value:'sound'},
      {label:'Prova avviso',value:'test'}]});
  if(action==='toggle')restPreferences.enabled=!restPreferences.enabled;
  if(action==='sound')restPreferences.sound=!restPreferences.sound;
  if(action==='test'){
    unlockRestAudio();
    if(restAudio?.state==='suspended')try{await restAudio.resume();}catch(e){}
    ViridisToast(playRestSignal()?'Avviso di prova riprodotto':restPreferences.sound?'Audio non disponibile: riprova con app aperta':'Suono disattivato · prova vibrazione dove supportata');
  }
  if(action==='toggle'||action==='sound'){
    saveRestPreferences();
    ViridisToast(action==='toggle'?(restPreferences.enabled?'Recupero automatico attivato':'Recupero automatico disattivato'):(restPreferences.sound?'Suono attivato':'Suono disattivato'));
  }
}
async function startWorkoutRest(exi,w){
  if(typeof isViewingShared==='function'&&isViewingShared())return;
  unlockRestAudio();
  const ex=state.days[activeDayIdx]?.esercizi[exi];
  if(!ex||w!==state.currentWeek)return;
  let seconds=restSecondsFromText(ex.recupero?.[w]);
  if(seconds===null){
    const value=await ViridisOptionPicker({title:'Quanto recupero?',message:`Scheda: ${ex.recupero?.[w]||'recupero libero'}`,
      choices:[30,45,60,90,120,150,180,240,300].map(n=>({label:n<60?`${n} secondi`:`${n/60} minuti`,value:String(n)}))});
    if(value===null)return;seconds=Number(value);
  }
  workoutRest={end:Date.now()+seconds*1000,name:ex.nome,announced:false};
  clearInterval(workoutRestInterval);
  workoutRestInterval=setInterval(tickWorkoutRest,250);tickWorkoutRest();
}
function stopWorkoutRest(){workoutRest=null;clearInterval(workoutRestInterval);document.getElementById('workoutRestPanel')?.remove();}
function adjustWorkoutRest(delta){if(!workoutRest)return;workoutRest.end=Math.max(Date.now(),Math.max(Date.now(),workoutRest.end)+delta*1000);workoutRest.announced=false;clearInterval(workoutRestInterval);workoutRestInterval=setInterval(tickWorkoutRest,250);tickWorkoutRest();}
function tickWorkoutRest(){
  if(!workoutRest)return;
  let panel=document.getElementById('workoutRestPanel');
  if(!panel){
    panel=document.createElement('section');panel.id='workoutRestPanel';panel.className='workout-rest-panel';panel.setAttribute('aria-label','Timer recupero');
    panel.innerHTML='<div class="rest-heading"><span class="rest-context"></span><button type="button" onclick="stopWorkoutRest()" aria-label="Chiudi recupero">×</button></div><div class="rest-controls"><button type="button" onclick="adjustWorkoutRest(-15)">−15 s</button><strong class="rest-time"></strong><button type="button" onclick="adjustWorkoutRest(15)">+15 s</button></div><p class="rest-status" role="status"></p>';
    document.body.append(panel);
  }
  const seconds=Math.max(0,Math.ceil((workoutRest.end-Date.now())/1000));
  panel.querySelector('.rest-context').textContent=workoutRest.name;
  panel.querySelector('.rest-time').textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  panel.classList.toggle('finished',seconds===0);
  if(seconds===0&&!workoutRest.announced&&document.visibilityState!=='hidden'){
    workoutRest.announced=true;playRestSignal();clearInterval(workoutRestInterval);
    panel.querySelector('.rest-status').textContent='Recupero terminato · riprendi quando sei pronto';
  }else if(seconds>0&&panel.querySelector('.rest-status').textContent!=='Recupero in corso')panel.querySelector('.rest-status').textContent='Recupero in corso';
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tickWorkoutRest();});

function seriesUIEntries(exi,w,si,partnerExi){
  const indexes=Number.isInteger(partnerExi)?[exi,partnerExi]:[exi];
  return indexes.flatMap(index=>{
    const ex=state.days[activeDayIdx]?.esercizi[index];
    if(!ex)return [];
    const entries=[ex.sets?.[w]?.[si]||{peso:'',rip:''},...maxEntriesAfter(ex,w,si).map(item=>item.entry)];
    entries.forEach((entry,part)=>seriesEntryKeys.set(entry,JSON.stringify([
      state.title,state.programStartDate,activeDayIdx,state.days[activeDayIdx].name,
      ex.loadReminderId||index,ex.nome,w,si,part
    ])));
    return entries;
  });
}
function seriesUIFinished(entries){return entries.length>0&&entries.every(s=>{
  const key=seriesEntryKeys.get(s);
  if(finishedSeriesUI.get(key)===`${s.peso}|${s.rip}`)return true;
  finishedSeriesUI.delete(key);
  return false;
});}
function renderSeriesFinish(exi,w,si,partnerExi){
  if(w!==state.currentWeek||(typeof isViewingShared==='function'&&isViewingShared()))return '';
  const ex=state.days[activeDayIdx]?.esercizi[exi];
  const type=Number.isInteger(partnerExi)?(ex.linkType==='jumpset'?' jump set':' superset'):(ex.sets?.[w]?.[si]?.dropset?' dropset':'');
  const done=seriesUIFinished(seriesUIEntries(exi,w,si,partnerExi));
  const compact=!type&&!maxEntriesAfter(ex,w,si).length;
  const label=done?'Serie'+type+' completata':'Completa serie'+type;
  return `<button type="button" class="series-finish${compact?' compact':''}${done?' is-finished':''}" aria-label="${label} ${si+1}" title="${label}" aria-pressed="${done}" data-finish-ex="${exi}" data-finish-week="${w}" data-finish-set="${si}" onclick="completeSeriesUI(${exi},${w},${si},${Number.isInteger(partnerExi)?partnerExi:'null'},this)">${compact?'✓':(done?'✓ ':'')+label}</button>`;
}
function completeSeriesUI(exi,w,si,partnerExi,button){
  const ex=state.days[activeDayIdx]?.esercizi[exi];
  if(!ex||w!==state.currentWeek||(typeof isViewingShared==='function'&&isViewingShared()))return;
  if(!document.getElementById('quickNumberBar')?.hidden||isQuickNumberTarget(document.activeElement)){
    finishQuickKeyboardInput();
  }
  const entries=seriesUIEntries(exi,w,si,partnerExi);
  if(!entries.length||entries.some(s=>!String(s.rip??'').trim()||!String(s.peso??'').trim())){
    ViridisToast('Inserisci peso e ripetizioni di tutta la serie, inclusi eventuali Max.');return;
  }
  if(!seriesUIFinished(entries)){
    entries.forEach(s=>finishedSeriesUI.set(seriesEntryKeys.get(s),`${s.peso}|${s.rip}`));vibrate(15);
    if(restPreferences.enabled)startWorkoutRest(exi,w);
  }
  refreshSeriesFinishUI(exi,w);
}
function reopenSeriesUI(exi,w,si,partnerExi){
  seriesUIEntries(exi,w,si,partnerExi).forEach(s=>finishedSeriesUI.delete(seriesEntryKeys.get(s)));
  refreshSeriesFinishUI(exi,w);
}
function updateSeriesFinishButton(button){
  const exi=Number(button.dataset.finishEx),w=Number(button.dataset.finishWeek),si=Number(button.dataset.finishSet);
  const partner=findLinkedPartner(exi);
  const template=document.createElement('template');
  template.innerHTML=renderSeriesFinish(exi,w,si,partner?.exi);
  const updated=template.content.firstElementChild;
  if(!updated)return;
  // Mantiene il pulsante durante il blur, altrimenti il click puo andare perso.
  for(const attr of updated.attributes)button.setAttribute(attr.name,attr.value);
  button.innerHTML=updated.innerHTML;
  const group=button.closest('.set-series-group,.linked-set-group');
  if(!group)return;
  const done=button.getAttribute('aria-pressed')==='true';
  group.classList.toggle('series-collapsed',done);
  group.querySelector(':scope > .series-completed-summary')?.remove();
  if(done){
    const summary=document.createElement('button');
    summary.type='button';summary.className='series-completed-summary';
    const values=seriesUIEntries(exi,w,si,partner?.exi).map(s=>`${s.peso} kg × ${s.rip}`).join(' · ');
    summary.innerHTML=`<span class="series-completed-title">✓ Serie ${si+1}</span><span class="series-completed-values">${escapeHtml(values)}</span><span class="series-completed-edit">Modifica</span>`;
    summary.setAttribute('aria-label',`Serie ${si+1} completata: ${values}. Riapri per modificare`);
    summary.onclick=()=>{reopenSeriesUI(exi,w,si,partner?.exi);button.focus({preventScroll:true});};
    group.appendChild(summary);
  }
}
function refreshAllSeriesFinishUI(){document.querySelectorAll('[data-finish-ex]').forEach(updateSeriesFinishButton);}
function refreshSeriesFinishUI(exi,w){
  document.querySelectorAll(`[data-finish-ex="${exi}"][data-finish-week="${w}"]`).forEach(updateSeriesFinishButton);
}

function workoutSaveStatus(){
  if(typeof isViewingShared==='function'&&isViewingShared())return 'Scheda condivisa · sola lettura';
  try{if(localStorage.getItem(STORAGE_KEY)!==JSON.stringify(state))return 'Modifiche non ancora salvate sul dispositivo';}catch(e){return 'Salvataggio locale non disponibile';}
  if(typeof isSyncEnabled!=='function'||!isSyncEnabled())return 'Salvato sul dispositivo · account non collegato';
  if(syncLocalRevision>syncConfirmedRevision||cloudPushPending)return navigator.onLine===false?'Salvato sul dispositivo · offline, sincronizzazione in attesa':'Salvato sul dispositivo · sincronizzazione in attesa';
  return localStorage.getItem(LAST_CLOUD_PUSH_KEY)?'Salvato sul dispositivo · sincronizzato':'Salvato sul dispositivo · account collegato';
}
function renderWorkoutSaveStatus(){return `<p class="workout-save-status" role="status">${escapeHtml(workoutSaveStatus())}</p>`;}
function updateWorkoutSaveStatus(){document.querySelectorAll('.workout-save-status').forEach(el=>el.textContent=workoutSaveStatus());}
window.addEventListener('online',updateWorkoutSaveStatus);window.addEventListener('offline',updateWorkoutSaveStatus);
