function activeWorkoutTimer(){
  const timer=state?.activeWorkoutTimer;
  return timer&&Number.isFinite(timer.startedAt)&&timer.startedAt>0&&typeof timer.dayId==='string'?timer:null;
}
function formatWorkoutDuration(ms){
  const seconds=Math.max(0,Math.floor(ms/1000)),hours=Math.floor(seconds/3600);
  return (hours?hours+':':'')+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
function renderWorkoutTimer(){
  if(typeof isViewingShared==='function'&&isViewingShared())return '';
  const timer=activeWorkoutTimer(),day=state.days[activeDayIdx];
  if(!day)return '';
  const same=timer&&timer.dayId===day.uiId&&timer.week===state.currentWeek;
  return `<section class="workout-session-bar" aria-label="Durata allenamento"><div><span>${timer?(same?'Allenamento in corso':escapeHtml(timer.day)+' in corso'):'Durata allenamento'}</span><b id="workoutElapsed" role="timer" aria-label="Tempo trascorso">${timer?formatWorkoutDuration(Date.now()-timer.startedAt):'00:00'}</b></div><button type="button" onclick="${timer?'requestEndTimedWorkout()':'startTimedWorkout()'}">${timer?'Termina allenamento':'Inizia allenamento'}</button></section>`;
}
function refreshWorkoutTimer(){
  const output=document.getElementById('workoutElapsed'),timer=activeWorkoutTimer();
  if(output&&timer)output.textContent=formatWorkoutDuration(Date.now()-timer.startedAt);
}
function startTimedWorkout(){
  if(activeWorkoutTimer()||(typeof isViewingShared==='function'&&isViewingShared()))return;
  const day=state.days[activeDayIdx];if(!day)return;
  finishQuickKeyboardInput();
  prepareWorkoutIdentity();
  const startedAt=Date.now();
  state.activeWorkoutTimer={id:crypto.randomUUID(),dayId:day.uiId,day:day.name,week:state.currentWeek,block:state.title,startedAt};
  workoutInProgress=true;workoutStartedAt=startedAt;
  saveWorkoutInProgress();saveWorkoutStartedAt();saveState();renderActive();
  if(typeof requestWakeLock==='function')requestWakeLock();
}
function finishTimedWorkout(dayIdx,week=state.currentWeek){
  if(typeof isViewingShared==='function'&&isViewingShared())return null;
  const timer=activeWorkoutTimer(),day=state.days[dayIdx];
  if(!timer||(dayIdx>=0&&day?.uiId!==timer.dayId)||week!==timer.week)return null;
  const endedAt=Date.now(),record={...timer,endedAt,durationMs:Math.max(0,endedAt-timer.startedAt)};
  if(!Array.isArray(state.workoutDurations))state.workoutDurations=[];
  if(!state.workoutDurations.some(item=>item.id===record.id))state.workoutDurations.push(record);
  state.activeWorkoutTimer=null;saveState();
  const bar=document.querySelector('.workout-session-bar');if(bar)bar.outerHTML=renderWorkoutTimer();
  return record;
}
async function requestEndTimedWorkout(){
  const timer=activeWorkoutTimer();if(!timer)return;
  const dayIdx=state.days.findIndex(day=>day.uiId===timer.dayId);
  if(!await ViridisConfirmDialog('Fermare il tempo e salvare la durata? Le serie non completate resteranno tali.',{title:'Termina allenamento',acceptLabel:'Termina'}))return;
  if(activeWorkoutTimer()?.id!==timer.id)return;
  const record=finishTimedWorkout(dayIdx,timer.week);if(!record)return;
  clearWorkoutSession();
  if(state.days[dayIdx]&&timer.week===state.currentWeek&&allExercisesClosed(state.days[dayIdx]))openFinishWorkoutModal(dayIdx);
  else ViridisToast('Durata salvata: '+formatWorkoutDuration(record.durationMs));
  renderActive();renderProgressOverview();
}
function recordedWorkoutDuration(day){
  const timer=activeWorkoutTimer();
  if(timer?.dayId===day.uiId&&timer.week===state.currentWeek)return Math.max(0,Date.now()-timer.startedAt);
  const entries=(state.workoutDurations||[]).filter(item=>item.dayId===day.uiId&&item.week===state.currentWeek&&item.block===state.title);
  return entries.length?entries[entries.length-1].durationMs:null;
}
function renderWorkoutDurations(){
  const rows=[...(state.workoutDurations||[])].sort((a,b)=>b.startedAt-a.startedAt);
  if(!rows.length)return '';
  const average=rows.reduce((sum,row)=>sum+row.durationMs,0)/rows.length;
  return `<section class="progress-timeline-card workout-duration-history"><div class="progress-section-head"><span>DURATA ALLENAMENTI</span><span>Media ${formatWorkoutDuration(average)}</span></div><div class="workout-duration-list">${rows.map(row=>`<div class="workout-duration-row"><div><b>${escapeHtml(row.day)}</b><small>${escapeHtml(new Date(row.startedAt).toLocaleDateString('it-IT'))} · Settimana ${row.week+1} · ${escapeHtml(row.block||'')}</small></div><strong>${formatWorkoutDuration(row.durationMs)}</strong></div>`).join('')}</div></section>`;
}
setInterval(()=>{if(!document.hidden)refreshWorkoutTimer();},1000);
document.addEventListener('visibilitychange',refreshWorkoutTimer);
