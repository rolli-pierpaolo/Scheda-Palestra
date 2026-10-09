const WORKOUT_VIEW_KEY = 'viridis_workout_view_v1';
let workoutIdentityDirty = false;
let pendingWorkoutAnchor=null;
let workoutIdentityOwners=new Map();
function workoutIdentity(item){
  if(!item.uiId){ item.uiId = crypto.randomUUID(); workoutIdentityDirty = true; }
  return item.uiId;
}
function prepareWorkoutIdentity(){
  if(!state || (typeof isViewingShared==='function' && isViewingShared())) return;
  const present=new Set();
  state.days.forEach(day=>{present.add(day);(day.esercizi||[]).forEach(ex=>{present.add(ex);[...(ex.sets||[]),...(ex.maxEntries||[])].forEach(rows=>(rows||[]).forEach(row=>present.add(row)));});});
  const seen=new Set();
  const nextOwners=new Map();
  const unique=item=>{
    const owner=workoutIdentityOwners.get(item.uiId);
    if(item.uiId&&(seen.has(item.uiId)||(owner&&owner!==item&&present.has(owner))))delete item.uiId;
    seen.add(workoutIdentity(item));nextOwners.set(item.uiId,item);
  };
  state.days.forEach((day,di)=>{
    unique(day);
    (day.esercizi||[]).forEach((ex,ei)=>{
      unique(ex);
      (ex.sets||[]).forEach((sets,w)=>(sets||[]).forEach((set,si)=>{
        [set,...maxEntriesAfter(ex,w,si).map(m=>m.entry)].forEach((entry,part)=>{
          unique(entry);
          const oldKey=JSON.stringify([state.title,state.programStartDate,di,day.name,ex.loadReminderId||ei,ex.nome,w,si,part]);
          const key=JSON.stringify(['v2',ex.uiId,w,workoutIdentity(entry)]);
          if(finishedSeriesUI.has(oldKey)){
            finishedSeriesUI.set(key,finishedSeriesUI.get(oldKey));
            finishedSeriesUI.delete(oldKey);
            saveFinishedSeriesUI();
          }
        });
      }));
    });
  });
  workoutIdentityOwners=nextOwners;
  if(workoutIdentityDirty){workoutIdentityDirty=false;saveState();}
}
function recordExerciseDate(ex,w){
  if(w!==state.currentWeek) return;
  if(!ex.sessionDates)ex.sessionDates=[];
  if(!ex.sessionDates[w])ex.sessionDates[w]=new Date().toISOString();
}
function captureWorkoutSession(dayIdx){
  const day=state.days[dayIdx];
  if(!day)return;
  const week=state.currentWeek||0;
  const exercises=(day.esercizi||[]).map(ex=>({
    nome:ex.nome,uiId:ex.uiId,linkType:ex.linkType,linkGroupId:ex.linkGroupId,
    sets:JSON.parse(JSON.stringify(ex.sets?.[week]||[])),
    maxEntries:JSON.parse(JSON.stringify(ex.maxEntries?.[week]||ex.maxExtra?.[week]||[])),
    skipped:!!ex.weekSkipped?.[week],completed:!!ex.weekDone?.[week]
  }));
  if(!exercises.some(ex=>[...ex.sets,...ex.maxEntries].some(s=>String(s.rip??'').trim())))return;
  if(!Array.isArray(state.sessionHistory))state.sessionHistory=[];
  const date=new Date().toISOString();
  const last=state.sessionHistory[state.sessionHistory.length-1];
  if(last&&last.dayId===day.uiId&&last.week===week&&new Date(last.date).toDateString()===new Date(date).toDateString()&&JSON.stringify(last.exercises)===JSON.stringify(exercises))return;
  state.sessionHistory.push({id:crypto.randomUUID(),date,block:state.title,week,day:day.name,dayId:day.uiId,exercises});
}
function persistWorkoutView(){
  if(!state || document.getElementById('viewActive')?.style.display==='none')return;
  if(typeof isViewingShared==='function'&&isViewingShared())return;
  const day=state.days[activeDayIdx],ex=day?.esercizi[activeExerciseIdx];
  const slide=document.querySelector('.ex-carousel-slide.current');
  const anchor=slide&&[...slide.querySelectorAll('.set-series-group,.linked-set-group')].find(el=>el.getBoundingClientRect().bottom>120);
  const rows=slide?[...slide.querySelectorAll('.set-series-group,.linked-set-group')]:[];
  try{localStorage.setItem(WORKOUT_VIEW_KEY,JSON.stringify({dayId:day?.uiId,exId:ex?.uiId,dayIdx:activeDayIdx,exi:activeExerciseIdx,week:state.currentWeek,top:window.scrollY,series:rows.indexOf(anchor),offset:anchor?.getBoundingClientRect().top}));}catch(e){}
}
function restoreWorkoutView(){
  let saved;try{saved=JSON.parse(localStorage.getItem(WORKOUT_VIEW_KEY)||'null');}catch(e){}
  if(!saved||saved.week!==state.currentWeek)return;
  const di=state.days.findIndex(d=>d.uiId===saved.dayId);
  if(di<0)return;
  const ei=state.days[di].esercizi.findIndex(ex=>ex.uiId===saved.exId);
  if(ei<0)return;
  activeDayIdx=di;activeExerciseIdx=ei;
  viewScrollPositions.active=Math.max(0,Number(saved.top)||0);
  pendingWorkoutAnchor=saved;
  return saved;
}
function workoutViewScrollTop(view){
  if(view!=='active'||!pendingWorkoutAnchor)return viewScrollPositions[view];
  const saved=pendingWorkoutAnchor;pendingWorkoutAnchor=null;
  const row=document.querySelectorAll('.ex-carousel-slide.current .set-series-group,.ex-carousel-slide.current .linked-set-group')[saved.series];
  return row&&Number.isFinite(saved.offset)?Math.max(0,window.scrollY+row.getBoundingClientRect().top-Math.max(120,saved.offset)):viewScrollPositions.active;
}
let workoutViewTimer;
window.addEventListener('scroll',()=>{
  clearTimeout(workoutViewTimer);workoutViewTimer=setTimeout(persistWorkoutView,180);
},{passive:true});
window.addEventListener('pagehide',persistWorkoutView);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistWorkoutView();});
