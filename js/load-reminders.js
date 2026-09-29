// Promemoria manuali: non scrivono mai pesi, ripetizioni o progressioni.
// Sono parte dello stato esistente, quindi seguono salvataggio, backup e sync.
function loadReminderList(){
  return Array.isArray(state.loadReminders) ? state.loadReminders.filter(r=>r && typeof r.exerciseName==='string' && Number.isInteger(r.setIndex) && r.setIndex>=0) : [];
}
function loadReminderName(value){ return String(value||'').trim().toLocaleLowerCase('it'); }
function loadReminderSignature(ex,w){
  return JSON.stringify([(ex.schema||[])[w]||'',((ex.sets||[])[w]||[]).map(s=>!!s.dropset)]);
}
function loadReminderMatches(reminder,ex){
  if(ex.loadReminderId && reminder.exerciseId===ex.loadReminderId) return true;
  // Un esercizio ricreato può recuperare la nota, ma solo se il nome è univoco.
  const matches=state.days.flatMap(d=>d.esercizi||[]).filter(e=>loadReminderName(e.nome)===loadReminderName(reminder.exerciseName));
  return matches.length===1 && matches[0]===ex;
}
function loadReminderBound(reminder,ex,w){
  return !reminder.review && reminder.exerciseId===ex.loadReminderId &&
    reminder.signature===loadReminderSignature(ex,w) && reminder.setIndex<((ex.sets||[])[w]||[]).length;
}
function loadReminderWritable(ex,w){
  return w===(state.currentWeek||0) && state.days.some(d=>(d.esercizi||[]).includes(ex)) &&
    !(typeof isViewingShared==='function' && isViewingShared());
}
function renderLoadReminder(ex,exi,w,si,compact=false){
  if(!loadReminderWritable(ex,w)) return '';
  const reminder=loadReminderList().find(r=>loadReminderMatches(r,ex)&&loadReminderBound(r,ex,w)&&r.setIndex===si);
  if(compact)return `<button type="button" class="load-reminder-inline${reminder?' has-reminder':''}" onclick="editLoadReminder(${exi},${w},${si})" aria-label="Prossima volta · serie ${si+1}${reminder?.target?` · ${escapeAttr(reminder.target)} kg`:''}" title="Promemoria aumento carico">Prossima<br>volta</button>`;
  if(!reminder)return '';
  const label=reminder ? (reminder.target ? `↑ ${reminder.sourceWeek===w?'Prossima':'Obiettivo'}: ${reminder.target} kg` : '↑ Da aumentare') : '↑ Prossima volta';
  return `<button type="button" class="load-reminder-chip${reminder?' has-reminder':''}" onclick="editLoadReminder(${exi},${w},${si})" aria-label="${escapeAttr(label)} · serie ${si+1}">${escapeHtml(label)}</button>`;
}
function renderUnassignedLoadReminders(ex,exi,w){
  if(!loadReminderWritable(ex,w)) return '';
  return loadReminderList().map((r,index)=>{
    if(!loadReminderMatches(r,ex)||loadReminderBound(r,ex,w)) return '';
    return `<button type="button" class="load-reminder-review" onclick="reassignLoadReminder(${exi},${w},${index})">↑ Promemoria precedente · serie ${Number(r.setIndex)+1}${r.target?` → ${escapeHtml(r.target)} kg`:': da aumentare'}<small>La struttura è cambiata: scegli la serie</small></button>`;
  }).join('');
}
function saveLoadReminderUI(){ saveState();renderActive(); }
function renderHomeLoadReminders(){
  const rows=[];
  state.days.forEach((day,di)=>(day.esercizi||[]).forEach((ex,ei)=>{
    loadReminderList().filter(r=>loadReminderMatches(r,ex)).forEach(r=>rows.push(`<button type="button" class="home-reminder-item" onclick="openLoadReminderFromHome(${di},${ei})"><b>${escapeHtml(ex.nome)} · Serie ${r.setIndex+1}</b><span>${r.target?`↑ Obiettivo ${escapeHtml(r.target)} kg`:'↑ Da aumentare'}${r.review?' · Da riassociare':''}</span></button>`));
  }));
  return rows.length?`<section class="home-reminders"><h3>Da ricordare</h3>${rows.slice(0,3).join('')}${rows.length>3?`<small>Altri ${rows.length-3} promemoria nelle schede esercizio</small>`:''}</section>`:'';
}
function openLoadReminderFromHome(dayIdx,exi){
  startDayFromHome(dayIdx);goToExerciseSlide(exi);
}
async function editLoadReminder(exi,w,si){
  const snapshot=state, ex=state.days[activeDayIdx]?.esercizi[exi];
  const set=ex?.sets?.[w]?.[si];
  if(!set||!loadReminderWritable(ex,w)) return;
  if(typeof resetQuickKeyboardUI==='function') resetQuickKeyboardUI();
  const reminder=loadReminderList().find(r=>loadReminderMatches(r,ex)&&loadReminderBound(r,ex,w)&&r.setIndex===si);
  if(reminder){
    const action=await ViridisOptionPicker({title:`Aumento · serie ${si+1}`,
      message:`${reminder.sourceWeight?`Quando l’hai segnato: ${reminder.sourceWeight} kg${reminder.sourceReps?` × ${reminder.sourceReps} rip`:''}. `:''}${reminder.target?`Obiettivo: ${reminder.target} kg.`:'Ricordati di aumentare il carico.'}`,
      choices:[{label:'Fatto · togli promemoria',value:'done'},{label:'Rimanda · mantieni promemoria',value:'defer'},{label:'Modifica obiettivo',value:'edit'},{label:'Rimuovi promemoria',value:'remove'}]});
    if(state!==snapshot||!loadReminderWritable(ex,w)||!loadReminderList().includes(reminder)||!action) return;
    if(action==='defer'){ViridisToast('Promemoria mantenuto per la prossima volta');return;}
    if(action!=='edit'){
      state.loadReminders=loadReminderList().filter(r=>r!==reminder);saveLoadReminderUI();
      ViridisToast(action==='done'?'Aumento segnato come fatto':'Promemoria rimosso');return;
    }
  }
  const target=await ViridisInputDialog('Quale carico vuoi usare la prossima volta?',reminder?.target||'',{
    title:`Prossima volta · serie ${si+1}`,inputMode:'decimal',acceptLabel:'Salva promemoria',
    hint:'Peso in kg facoltativo. Lascia vuoto per ricordarti soltanto di aumentare. Non modifica il carico di oggi.',
    validate:value=>!value.trim()||(/^\d+(?:[.,]\d+)?$/.test(value.trim())&&Number(value.replace(',','.'))>0)?'':'Inserisci un peso maggiore di zero oppure lascia vuoto.'
  });
  if(target===null||state!==snapshot||!loadReminderWritable(ex,w)||ex.sets?.[w]?.[si]!==set) return;
  if(reminder&&!loadReminderList().includes(reminder)) return;
  if(!ex.loadReminderId) ex.loadReminderId=crypto.randomUUID();
  const record={exerciseId:ex.loadReminderId,exerciseName:ex.nome,setIndex:si,
    signature:loadReminderSignature(ex,w),sourceWeek:w,sourceWeight:reminder?.sourceWeight??String(set.peso??''),sourceReps:reminder?.sourceReps??String(set.rip??''),target:target.trim(),review:false};
  if(reminder) Object.assign(reminder,record);
  else state.loadReminders=[...loadReminderList(),record];
  saveLoadReminderUI();ViridisToast('Promemoria salvato per la prossima volta');
}
async function reassignLoadReminder(exi,w,index){
  const snapshot=state,ex=state.days[activeDayIdx]?.esercizi[exi],reminder=loadReminderList()[index];
  if(!reminder||!ex||!loadReminderWritable(ex,w)||!loadReminderMatches(reminder,ex)) return;
  const signature=loadReminderSignature(ex,w);
  const choices=(ex.sets?.[w]||[]).map((s,si)=>({label:`Serie ${si+1}${s.dropset?' · dropset':''}${s.peso?` · ${s.peso} kg`:''}`,value:String(si)}));
  choices.push({label:'Rimuovi promemoria',value:'remove'});
  const choice=await ViridisOptionPicker({title:'Riassocia aumento',message:`Prima: serie ${reminder.setIndex+1}${reminder.target?`, obiettivo ${reminder.target} kg`:''}. Scegli dove mostrarlo nella scheda attuale.`,choices});
  if(choice===null||state!==snapshot||!loadReminderWritable(ex,w)||!loadReminderList().includes(reminder)||signature!==loadReminderSignature(ex,w)) return;
  if(choice==='remove') state.loadReminders=loadReminderList().filter(r=>r!==reminder);
  else{
    const si=Number(choice);
    if(!Number.isInteger(si)||!ex.sets[w][si]) return;
    if(loadReminderList().some(r=>r!==reminder&&loadReminderMatches(r,ex)&&loadReminderBound(r,ex,w)&&r.setIndex===si)){
      ViridisToast('Questa serie ha già un promemoria. Modificalo prima di riassociare questo.');return;
    }
    if(!ex.loadReminderId) ex.loadReminderId=crypto.randomUUID();
    Object.assign(reminder,{exerciseId:ex.loadReminderId,exerciseName:ex.nome,setIndex:si,signature,sourceWeek:-1,review:false});
  }
  saveLoadReminderUI();
}
