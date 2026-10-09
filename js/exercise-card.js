const TRAINING_FOCUS_MODE_KEY = 'scheda_wo18_training_focus_v1';
let trainingFocusMode = localStorage.getItem(TRAINING_FOCUS_MODE_KEY) === '1';
let editingExerciseIdx = null;
let pendingWeekVisual = null;
document.body.classList.toggle('training-focus', trainingFocusMode);
function toggleTrainingFocusMode(){
  trainingFocusMode = !trainingFocusMode;
  document.body.classList.toggle('training-focus', trainingFocusMode);
  localStorage.setItem(TRAINING_FOCUS_MODE_KEY, trainingFocusMode ? '1' : '0');
  renderActive();
}

function updateBlockFinishTab(){
  const btn = document.getElementById('blockFinishTab');
  if(!btn) return;
  const day = state.days[activeDayIdx];
  const blockComplete = (state.completedWeeks||[]).length >= (state.weeksPerBlock||4);
  btn.classList.toggle('ready', blockComplete);
  const label = btn.querySelector('.block-finish-label');
  if(label) label.textContent = blockComplete ? 'Scheda completata' : 'Gestisci scheda';
  if(day) btn.style.setProperty('--accent', dayAccent(day, activeDayIdx).c);
  btn.title = blockComplete ? "Scheda completata: archivia o aggiungi settimane" : "Gestisci, archivia o prolunga la scheda";
  btn.setAttribute('aria-label', btn.title);
}
function computeDayProgress(day){
  const w = state.currentWeek || 0;
  let total = 0, done = 0;
  const items = [];
  for(const [exi] of computeExerciseBlocks(day)){
    const ex = day.esercizi[exi];
    total++;
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    const isDone = w>=nWeeks || (ex.weekDone && ex.weekDone[w]) || (ex.weekSkipped && ex.weekSkipped[w]);
    if(isDone) done++;
    items.push({ exi, pos: total, isDone });
  }
  return { total, done, items };
}
function renderDayExerciseStrip(progress, accent, activeExi){
  if(progress.total===0) return '';
  const day = state.days[activeDayIdx];
  const chips = progress.items.map(it=>{
    const ex = day.esercizi[it.exi];
    const isCurrent = it.exi===activeExi;
    const cls = ['day-ex-chip', it.isDone?'done':'', isCurrent?'current':''].filter(Boolean).join(' ');
    return `<button class="${cls}" style="--accent:${accent}" onpointerdown="startExerciseStripGesture(event)" onpointermove="trackExerciseStripGesture(event)" onpointerup="endExerciseStripGesture()" onclick="activateExerciseChip(${it.exi})" aria-label="Esercizio ${it.pos}: ${escapeAttr(ex.nome||'senza nome')}"><span class="day-ex-chip-pos">${it.pos}</span><span class="day-ex-chip-name">${escapeHtml(ex.nome||'Esercizio')}</span></button>`;
  }).join('');
  return `<div class="day-ex-strip" id="dayExStrip">${chips}<button type="button" class="day-add-exercise" onclick="addExercise(${activeDayIdx})">+ Aggiungi</button></div>`;
}
function renderWorkoutProgress(progress, activeExi, accent){
  if(!progress.total) return '';
  const current = progress.items.find(it=>it.exi===activeExi) || progress.items[0];
  const position = current ? current.pos : 1;
  const percent = Math.round((position / progress.total) * 100);
  return `<section class="workout-progress" style="--accent:${accent}" aria-label="Avanzamento allenamento">
    <div class="workout-progress-copy"><span>Esercizio <b>${position}</b> di ${progress.total}</span><b>${percent}%</b></div>
    <div class="workout-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${position}" aria-label="Esercizio ${position} di ${progress.total}"><span style="width:${percent}%"></span></div>
  </section>`;
}
function pulseCurrentExerciseChip(){
  if(typeof gsap === "undefined" || prefersReducedMotion()) return;
  const chip = document.querySelector(".day-ex-chip.current");
  if(!chip) return;
  gsap.killTweensOf(chip);
  gsap.to(chip, {
    scale: 1.018,
    duration: 1.35,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
}
let exerciseStripGesture = {startX:0,startY:0,moved:false};
let exerciseStripIgnoreClickUntil = 0;
function startExerciseStripGesture(event){
  exerciseStripGesture.startX = event.clientX;
  exerciseStripGesture.startY = event.clientY;
  exerciseStripGesture.moved = false;
}
function trackExerciseStripGesture(event){
  if(Math.abs(event.clientX-exerciseStripGesture.startX)>8 || Math.abs(event.clientY-exerciseStripGesture.startY)>8) exerciseStripGesture.moved = true;
}
function endExerciseStripGesture(){
  if(exerciseStripGesture.moved) exerciseStripIgnoreClickUntil = Date.now()+450;
  setTimeout(()=>{ exerciseStripGesture.moved = false; },0);
}
function activateExerciseChip(exi){ if(Date.now() >= exerciseStripIgnoreClickUntil && !exerciseStripGesture.moved) goToExerciseSlide(exi); }
function renderExerciseJumpIndex(progress, accent){
  if(progress.total===0) return '';
  const activeItem = progress.items.find(it => it.exi===activeExerciseIdx) || progress.items[0];
  const activePos = activeItem.pos;
  const hasPrev = activePos > 1;
  const hasNext = activePos < progress.total;
  const prevExi = hasPrev ? progress.items[activePos-2].exi : null;
  const nextExi = hasNext ? progress.items[activePos].exi : null;
  const dots = progress.items.map(it =>
    `<button class="ex-jump-dot ${it.isDone?'done':''} ${it.exi===activeItem.exi?'current':''}" style="--accent:${accent}" onclick="goToExerciseSlide(${it.exi})" aria-label="Vai a esercizio ${it.pos}">${it.pos}</button>`
  ).join('');
  return `<div class="ex-carousel-nav" id="exCarouselNav">
    <button class="ex-nav-arrow prev" ${hasPrev?`onclick="goToExerciseSlide(${prevExi})"`:'style="visibility:hidden" tabindex="-1"'} aria-label="Esercizio precedente">‹</button>
    <div class="ex-jump-index">${dots}</div>
    <button class="ex-nav-arrow next" ${hasNext?`onclick="goToExerciseSlide(${nextExi})"`:'style="visibility:hidden" tabindex="-1"'} aria-label="Esercizio successivo">›</button>
  </div>`;
}
function goToExerciseSlide(exi){
  const day = state.days[activeDayIdx];
  if(!day || !day.esercizi[exi]) return;
  activeExerciseIdx = exi;
  saveActivePos();
  const progress = computeDayProgress(day);
  const item = progress.items.find(it => it.exi===exi);
  const slideIdx = item ? progress.items.indexOf(item) : 0;
  const track = document.getElementById('exCarouselTrack');
  document.querySelectorAll('.ex-carousel-slide').forEach((slide,index)=>slide.classList.toggle('current',index===slideIdx));
  if(!track){ renderActive(); return; }
  track.style.transform = 'translateX(-'+(slideIdx*100)+'%)';
  updateWorkoutTopbarTitle();
  const navWrap = document.getElementById('exCarouselNav');
  if(navWrap) navWrap.outerHTML = renderExerciseJumpIndex(progress, dayAccent(day, activeDayIdx).c);
  const stripWrap = document.getElementById('dayExStrip');
  if(stripWrap) stripWrap.outerHTML = renderDayExerciseStrip(progress, dayAccent(day, activeDayIdx).c, exi);
  requestAnimationFrame(()=>{
    const currentChip = document.querySelector('#dayExStrip .day-ex-chip.current');
    if(currentChip && typeof currentChip.scrollIntoView === 'function') currentChip.scrollIntoView({block:'nearest',inline:'center',behavior:prefersReducedMotion()?'instant':'smooth'});
  });
  pulseCurrentExerciseChip();
}
function updateWorkoutTopbarTitle(){
  const title = document.getElementById('topbarTitle');
  const subtitle = document.getElementById('topbarSubtitle');
  const editBtn = document.getElementById('workoutTitleEditBtn');
  const activeView = document.getElementById('viewActive');
  const topbar = document.querySelector('.topbar');
  if(topbar && activeView && activeView.style.display !== 'none') topbar.classList.add('is-workout-header');
  const day = state.days[activeDayIdx];
  const ex = day && day.esercizi[activeExerciseIdx];
  if(!title || !editBtn || !activeView || activeView.style.display === 'none' || !ex) return;
  if(topbar) topbar.style.setProperty('--workout-accent', dayAccent(day,activeDayIdx).c);
  title.textContent = day.name || 'Allenamento';
  if(subtitle){
    const workoutName = String(state.title || 'Allenamento').replace(/^wo\b/i,'Workout');
    subtitle.textContent = `${workoutName} · Settimana ${(state.currentWeek||0)+1}`;
    subtitle.hidden = false;
  }
  editBtn.classList.toggle('active', editingExerciseIdx === activeExerciseIdx);
  editBtn.setAttribute('aria-label', editingExerciseIdx === activeExerciseIdx ? 'Chiudi modifica esercizio' : 'Modifica esercizio');
  editBtn.title = editingExerciseIdx === activeExerciseIdx ? 'Chiudi modifica' : 'Modifica esercizio';
  editBtn.hidden = true;
}
function toggleWorkoutTopbarEdit(){
  const day = state.days[activeDayIdx];
  const ex = day && day.esercizi[activeExerciseIdx];
  if(!ex) return;
  if(editingExerciseIdx === activeExerciseIdx){
    const input = document.querySelector('.exercise-card-name-input');
    if(input) updateName(activeExerciseIdx,input.value);
  }
  toggleExerciseEditMode(activeExerciseIdx);
}
function renderActive(){
  prepareWorkoutIdentity();
  if(typeof resetQuickKeyboardUI==='function') resetQuickKeyboardUI();
  const day = state.days[activeDayIdx];
  let maxLayoutWasRepaired = false;
  day.esercizi.forEach(ex=>{
    if(syncMaxLayoutsForward(ex)) maxLayoutWasRepaired = true;
  });
  if(maxLayoutWasRepaired) saveState();
  const a = dayAccent(day, activeDayIdx);
  updateThemeColor();
  const main = document.getElementById('viewActive');
  main.style.setProperty('--accent', a.c);
  document.body.style.setProperty('--water-base', darkenColor(a.c,0.10));
  document.body.style.setProperty('--water-mid', darkenColor(a.c,0.55));
  document.body.style.setProperty('--water-glow', darkenColor(a.c,0.85));
  if(reorderMode){
    main.innerHTML = renderReorderList(day);
    return;
  }
  const emptyState = day.esercizi.length===0 ? `<div class="empty-day">
      <div class="empty-day-title">Nessun esercizio ancora</div>
      <div class="empty-day-sub">Aggiungine uno per iniziare a costruire "${escapeHtml(day.name)}"</div>
    </div>` : '';

  const suggestedIdx = computeSuggestedDayIdx();

const switchTrainingDay =
activeDayIdx !== suggestedIdx
?
`
<button class="switch-training-pill"
onclick="confirmSwitchTrainingDay(${activeDayIdx}, ${suggestedIdx})">
  ${ICON_WARNING} Previsto: ${escapeHtml(state.days[suggestedIdx].name)} — tocca per fare ${escapeHtml(day.name)} oggi
</button>
`
:
'';


  const progress = computeDayProgress(day);
  activeExerciseIdx = resolveActiveExerciseIdx(day);
  saveActivePos();
  const workoutProgressHtml = renderWorkoutProgress(progress, activeExerciseIdx, a.c);
  const dayExStripHtml = renderDayExerciseStrip(progress, a.c, activeExerciseIdx);
  const dayActionsHtml = day.esercizi.length ? '' : `<div class="workout-list-actions"><button type="button" onclick="addExercise(${activeDayIdx})">+ Aggiungi esercizio</button></div>`;
  const dayManagementHtml = '';

  const activeItem = progress.items.find(it => it.exi===activeExerciseIdx);
  const activeSlideIdx = activeItem ? progress.items.indexOf(activeItem) : 0;
  let slidesHtml = '';
  progress.items.forEach((it, slideIdx) => {
    const ex = day.esercizi[it.exi];
    const partnerExi = findLinkedPartner(it.exi)?.exi ?? null;
    const cardHtml = partnerExi!==null
      ? linkedExerciseCard(ex, it.exi, day.esercizi[partnerExi], partnerExi, a, dayManagementHtml)
      : exerciseCard(ex, it.exi, a, dayManagementHtml);
    slidesHtml += `<div class="ex-carousel-slide${slideIdx===activeSlideIdx?' current':''}">${cardHtml}</div>`;
  });
  const carouselHtml = progress.total>0 ? `
    <div class="ex-carousel-viewport">
      <div class="ex-carousel-track" id="exCarouselTrack" style="transform:translateX(-${activeSlideIdx*100}%)">${slidesHtml}</div>
    </div>` : '';

  main.innerHTML = workoutProgressHtml + dayExStripHtml + dayActionsHtml + switchTrainingDay + emptyState + carouselHtml;
  refreshAllSeriesFinishUI();
    autoGrowAllExNames();
    autoGrowAllExSchema();
  applyPendingWeekVisual();

  updateBlockFinishTab();
  pulseCurrentExerciseChip();
  updateWorkoutTopbarTitle();

  const currentCard = document.querySelector("#viewActive .ex-carousel-slide.current .card");
  if(typeof gsap !== "undefined" && !prefersReducedMotion() && activeFirstAnimation && currentCard){
  activeFirstAnimation = false;

  gsap.from(currentCard, {
    y:12,
    opacity:0,
    duration:0.32,
    ease:"power3.out",
    overwrite:true
  });
}
function applyPendingWeekVisual(){
  const effect = pendingWeekVisual;
  pendingWeekVisual = null;
  if(!effect) return;
  const selector = effect.type==='max'
    ? `.set-series-group[data-exi="${effect.exi}"][data-week="${effect.w}"][data-set="${effect.si}"]`
    : `.week-block[data-exi="${effect.exi}"][data-week="${effect.w}"]`;
  const el = document.querySelector(selector);
  if(!el) return;
  const cls = effect.type==='max' ? 'max-enter' : effect.type==='done' ? 'week-complete-in' : 'week-skip-in';
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), 520);
}
}
function resolveActiveExerciseIdx(day){
  if(activeExerciseIdx !== null && day.esercizi[activeExerciseIdx]){
    return computeExerciseBlocks(day).find(block=>block.includes(activeExerciseIdx))?.[0] ?? activeExerciseIdx;
  }
  const fallback = computeCurrentDoingExerciseIdx(activeDayIdx);
  return fallback !== null ? fallback : 0;
}

let reorderMode = false;
let reorderDirty = false;
let reorderBackup = null;
function toggleReorderMode(){
  if(reorderMode){
    reorderMode = false;
    reorderBackup = null;
  } else {
    reorderBackup = state.days[activeDayIdx].esercizi.slice();
    reorderMode = true;
    reorderDirty = false;
  }
  renderActive();
}
function discardReorderIfPending(){
  if(reorderMode && reorderDirty && reorderBackup){
    state.days[activeDayIdx].esercizi = reorderBackup;
  }
  reorderMode = false;
  reorderDirty = false;
  reorderBackup = null;
}
function computeExerciseBlocks(day){
  const blocks = [];
  const seen=new Set();
  for(let i=0;i<day.esercizi.length;i++){
    if(seen.has(i))continue;
    const ex = day.esercizi[i];
    const partner=ex.linkGroupId?day.esercizi.findIndex((other,j)=>j!==i&&!seen.has(j)&&other.linkGroupId===ex.linkGroupId):-1;
    const block=partner>=0?[i,partner]:[i];
    block.forEach(index=>seen.add(index));blocks.push(block);
  }
  return blocks;
}
function moveExerciseBlock(blockIdx, delta){
  const day = state.days[activeDayIdx];
  const blocks = computeExerciseBlocks(day);
  const targetIdx = blockIdx + delta;
  if(targetIdx<0 || targetIdx>=blocks.length) return;
  const list = day.esercizi;
  const active=list[activeExerciseIdx];
  [blocks[blockIdx],blocks[targetIdx]]=[blocks[targetIdx],blocks[blockIdx]];
  day.esercizi=blocks.flatMap(block=>block.map(i=>list[i]));
  if(active)activeExerciseIdx=day.esercizi.indexOf(active);
  reorderDirty = true;
  renderActive();
}
async function confirmReorderOrder(){
  if(!await ViridisConfirmDialog('Confermi il nuovo ordine degli esercizi?')) return;
  reorderMode = false;
  reorderDirty = false;
  reorderBackup = null;
  saveState();
  renderActive();
}
function renderReorderList(day){
  if(!day.esercizi.length){
    return '<div class="empty-day"><div class="empty-day-title">Nessun esercizio da riordinare</div></div>';
  }
  const blocks = computeExerciseBlocks(day);
  const lastBlockIdx = blocks.length-1;
  const rows = blocks.map((block, bi)=>{
    const upBtn = bi>0 ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},-1)" aria-label="Sposta su">▲</button>` : '';
    const downBtn = bi<lastBlockIdx ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},1)" aria-label="Sposta giù">▼</button>` : '';
    const names = block.map(i=>escapeHtml(day.esercizi[i].nome || '(senza nome)')).join(`<span class="exercise-link-label">${exerciseLinkLabel(day.esercizi[block[0]])}</span>`);
    return `<div class="reorder-row">
      <span class="reorder-name">${names}</span>
      <div class="reorder-arrows">${upBtn}${downBtn}</div>
    </div>`;
  }).join('');
  const btn = reorderDirty
    ? `<button class="add-ex small2" style="border-color:var(--green);color:var(--green);" onclick="confirmReorderOrder()">${ICON_CHECK} Conferma nuovo ordine</button>`
    : `<button class="add-ex small2" onclick="toggleReorderMode()">${ICON_CLOSE} Chiudi modifica ordine</button>`;
  return `<div class="reorder-banner">Tocca le frecce per spostare un esercizio, poi conferma</div>${rows}${btn}`;
}

function updateTitles(){
document.getElementById('tabActiveLabel').textContent = 'Allenamento';}

function suggestNextTitle(t){
  const m = /^(.*?)(\d+)(\D*)$/.exec(t || "");
  if(m){ return m[1] + (parseInt(m[2],10)+1) + m[3]; }
  return (t || "WO") + " nuovo";
}

function isBlockComplete(){
  return (state.completedWeeks||[]).length >= (state.weeksPerBlock||4);
}
function closeBlockCompleteModal(){
  document.getElementById('blockCompleteModal').style.display = 'none';
}
function openBlockCompletionFlow(){
  if(!isBlockComplete()){
    archiveAndReset();
    return;
  }
  openBlockCompleteModal();
}
function openBlockCompleteModal(){
  const modal = document.getElementById('blockCompleteModal');
  const body = document.getElementById('blockCompleteBody');
  if(!modal || !body || modal.style.display !== 'none') return;
  const weeks = state.weeksPerBlock || 4;
  body.innerHTML = `
    <div class="finish-title-row">${ICON_TROPHY}<span class="finish-title-text">Scheda completata!</span></div>
    <div class="finish-subtitle">Hai completato tutti gli allenamenti delle ${weeks} settimane previste.</div>
    <div class="finish-message">Vuoi archiviare l'allenamento e iniziarne uno nuovo?</div>
    <div class="finish-buttons">
      <button class="add-ex small2" onclick="askAddWeeksAfterBlock()">No</button>
      <button class="finish-confirm-btn" onclick="closeBlockCompleteModal();archiveAndReset()">Sì, archivia</button>
    </div>`;
  modal.style.display = 'flex';
}
function askAddWeeksAfterBlock(){
  const body = document.getElementById('blockCompleteBody');
  body.innerHTML = `
    <div class="finish-title" style="font-size:21px;">Vuoi continuare?</div>
    <div class="finish-message">Vuoi aggiungere altre settimane a questo allenamento?</div>
    <div class="finish-buttons">
      <button class="add-ex small2" onclick="leaveCompletedBlockAsIs()">No, lasciala così</button>
      <button class="finish-confirm-btn" onclick="showAddWeeksForm()">Sì, aggiungi settimane</button>
    </div>`;
}
function showAddWeeksForm(){
  const current = state.weeksPerBlock || 4;
  const available = Math.max(1, 12-current);
  const body = document.getElementById('blockCompleteBody');
  body.innerHTML = `
    <div class="finish-title" style="font-size:21px;">Aggiungi settimane</div>
    <div class="finish-message">Quante settimane vuoi aggiungere? Puoi arrivare fino a 12 settimane totali.</div>
    <input id="addWeeksInput" class="meta-input block-weeks-input" type="text" value="1" aria-label="Numero di settimane da aggiungere">
    <div class="finish-buttons" style="margin-top:14px;">
      <button class="add-ex small2" onclick="askAddWeeksAfterBlock()">Indietro</button>
      <button class="finish-confirm-btn" onclick="confirmAddWeeksAfterBlock(${current},${available})">Conferma</button>
    </div>`;
  setTimeout(()=>document.getElementById('addWeeksInput')?.focus(), 0);
}
function confirmAddWeeksAfterBlock(current, available){
  const input = document.getElementById('addWeeksInput');
  let extra = parseInt((input && input.value) || '', 10);
  if(!Number.isInteger(extra) || extra < 1 || extra > available){
    ViridisFieldError(input, `Inserisci un numero da 1 a ${available}.`);
    return;
  }
  extendWeeksPerBlock(current + extra);
  state.currentWeek = current;
  state.completedTrainingDays = [];
  state.trainingQueue = state.days.map((_,i)=>i);
  state.currentTrainingDayIdx = state.trainingQueue[0] ?? null;
  state.blockCompletionPromptDismissed = false;
  saveState();
  closeBlockCompleteModal();
  activeDayIdx = computeSuggestedDayIdx();
  renderDayTabs();
  renderActive();
  showView('active');
}
function leaveCompletedBlockAsIs(){
  state.blockCompletionPromptDismissed = true;
  saveState();
  closeBlockCompleteModal();
}
function maybePromptBlockCompletion(){
  if(!isBlockComplete() || state.blockCompletionPromptDismissed) return;
  setTimeout(()=>openBlockCompleteModal(), 500);
}

async function archiveAndReset(){
  const weeksPerBlock = state.weeksPerBlock || 4;
  const completedWeeksCount = (state.completedWeeks||[]).length;
  const blockComplete = completedWeeksCount >= weeksPerBlock;
  if(!blockComplete){
    const missingWeeks = weeksPerBlock - completedWeeksCount;
    const trainingsLeftThisWeek = state.days.length - (state.completedTrainingDays||[]).length;
    const parts = [];
    if(trainingsLeftThisWeek>0) parts.push(`${trainingsLeftThisWeek} allenament${trainingsLeftThisWeek===1?'o':'i'} di questa settimana`);
    parts.push(`${missingWeeks} settiman${missingWeeks===1?'a':'e'} del blocco`);
    if(!await ViridisConfirmDialog(`Attenzione: questo blocco non e' ancora completo - mancano ancora ${parts.join(' e ')}.\n\nSe termini adesso, quello che manca resta non fatto e riparti da zero con un nuovo blocco.\n\nSei sicuro di voler terminare comunque?`)) return;
  }
  const archiveName = await ViridisInputDialog("Con che nome salvare questo mese nello Storico?", state.title || "WO");
  if(archiveName === null || !archiveName.trim()) return;
  const newTitle = await ViridisInputDialog("Nome del nuovo mese che stai per iniziare?", suggestNextTitle(state.title));
  if(newTitle === null || !newTitle.trim()) return;
  let weeksVal = await ViridisWeeksPicker("Quante settimane durerà il nuovo blocco?", state.weeksPerBlock||4);
  if(weeksVal === null) return;
  let weeksN = parseInt(String(weeksVal).replace(',','.'), 10);
  if(isNaN(weeksN) || weeksN<1) weeksN = state.weeksPerBlock||4;
  if(weeksN>12) weeksN = 12;
  if(!await ViridisConfirmDialog(`Salvo "${archiveName}" nello Storico e azzero pesi/ripetizioni per iniziare "${newTitle}" (${weeksN} settimane). Nome esercizi, recupero e schema restano come base di partenza. Continuare?`)) return;

  storicoExtra[archiveName.trim()] = JSON.parse(JSON.stringify(state.days));
  saveStorico();
  storicoDates[archiveName.trim()] = todayKey();
  saveStoricoDates();
  checkAchievements();

  const newDays = state.days.map(d => ({
    name: d.name,
    esercizi: d.esercizi.map(ex => ({
      nome: ex.nome, commento: ex.commento,
      ...(ex.loadReminderId ? {loadReminderId:ex.loadReminderId} : {}),
      recupero: resizeArr(ex.recupero, weeksN, ''), schema: resizeArr(ex.schema, weeksN, ''),
      sets: Array.from({length:weeksN}, (_,i) => (ex.sets && ex.sets[i] ? ex.sets[i].map(()=>({peso:'',rip:''})) : []))
    }))
  }));
state = { 
  sessionHistory:state.sessionHistory||[],
  exerciseAliases:state.exerciseAliases||[],
  ...(Array.isArray(state.loadReminders) ? {loadReminders:state.loadReminders.map(r=>({...r,review:true}))} : {}),
  title: newTitle.trim(), 
  days: newDays, 
  programStartDate: todayKey(), 
  weeksPerBlock: weeksN,
  currentTrainingDayIdx: null,
  trainingQueue: newDays.map((_,i)=>i)
};
saveState();

  collapsedMap = {};
  saveCollapsed();

  activeDayIdx = 0;
  updateTitles();
  renderDayTabs();
  renderActive();
  renderHistList();
  ViridisToast(`Fatto! "${archiveName.trim()}" è ora nello Storico. Hai iniziato "${newTitle.trim()}".`);
}

function suggestNextWeight(ex, w, si){
  if(w===0) return null;
  const s = ex.sets && ex.sets[w-1] && ex.sets[w-1][si];
  if(!s || s.peso===undefined || s.peso===null) return null;
  const raw = String(s.peso).trim();
  const previousDone = !!(ex.weekDone && ex.weekDone[w-1]);
  const isPureNumber = /^[+-]?\d+(?:[.,]\d+)?$/.test(raw);
  if(!previousDone && isPureNumber) return null;
  return raw==='' ? null : raw;
}
function suggestNextMaxWeight(ex, w, mi){
  if(w===0) return null;
  const m = ex.maxExtra && ex.maxExtra[w-1] && ex.maxExtra[w-1][mi];
  if(!m || m.peso===undefined || m.peso===null) return null;
  const raw = String(m.peso).trim();
  const previousDone = !!(ex.weekDone && ex.weekDone[w-1]);
  const isPureNumber = /^[+-]?\d+(?:[.,]\d+)?$/.test(raw);
  if(!previousDone && isPureNumber) return null;
  return raw==='' ? null : raw;
}
function getMaxEntries(ex, w){
  const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
  if(!ex.maxEntries) ex.maxEntries = Array.from({length:nWeeks}, (_, week)=>{
    const legacy = (ex.maxExtra && ex.maxExtra[week]) || [];
    const lastSet = Math.max(0, ((ex.sets && ex.sets[week]) || []).length - 1);
    // Conserva anche i Max vuoti salvati dalle versioni precedenti.

    const wasShown = !!(ex.maxShown && ex.maxShown[week]);
    return legacy.filter(m => m && (wasShown || String(m.peso||'').trim() || String(m.rip||'').trim()))
      .map(m => ({afterSet:lastSet, peso:m.peso||'', rip:m.rip||''}));
  });
  while(ex.maxEntries.length < nWeeks) ex.maxEntries.push([]);
  if(!ex.maxEntries[w]) ex.maxEntries[w] = [];
  return ex.maxEntries[w];
}
function maxEntriesAfter(ex, w, si){
  return getMaxEntries(ex,w).map((entry,index)=>({entry,index})).filter(item=>item.entry.afterSet===si);
}
function exerciseWeekCount(ex){
  return Math.max(
    state.weeksPerBlock || 4,
    (ex.recupero && ex.recupero.length) || 0,
    (ex.sets && ex.sets.length) || 0,
    (ex.maxEntries && ex.maxEntries.length) || 0
  );
}
function setHasRecordedData(set){
  return !!(set && (String(set.peso || '').trim() || String(set.rip || '').trim()));
}
function weekHasRecordedExerciseData(ex, w){
  const sets = (ex.sets && ex.sets[w]) || [];
  return sets.some(setHasRecordedData) || getMaxEntries(ex,w).some(entry =>
    entry && (String(entry.peso || '').trim() || String(entry.rip || '').trim())
  );
}
function removeMaxAttachedToSet(ex, w, setIndex){
  const entries = getMaxEntries(ex,w);
  const kept = entries.filter(entry => entry && entry.afterSet < setIndex);
  if(kept.length !== entries.length) ex.maxEntries[w] = kept;
}
function carryMaxLayoutForward(ex, fromWeek, onlyWeek){
  if(!ex || fromWeek < 0) return false;
  const template = getMaxEntries(ex,fromWeek);
  if(!template.length) return false;
  const nWeeks = exerciseWeekCount(ex);
  const lastWeek = onlyWeek===undefined ? nWeeks-1 : onlyWeek;
  let changed = false;
  if(!ex.maxShown){
    ex.maxShown = Array.from({length:nWeeks},()=>false);
    changed = true;
  }
  for(let week=fromWeek+1; week<=lastWeek && week<nWeeks; week++){
    const target = getMaxEntries(ex,week);
    const sourceCounts = new Map();
    template.forEach(entry=>{
      const seen = sourceCounts.get(entry.afterSet)||0;
      sourceCounts.set(entry.afterSet,seen+1);
      const matching = target.filter(item=>item.afterSet===entry.afterSet)[seen];
      if(!matching){
        target.push({afterSet:entry.afterSet,peso:entry.peso??'',rip:''});
        changed = true;
        return;
      }
      if(!String(matching.peso??'').trim() && String(entry.peso??'').trim()){
        matching.peso = entry.peso;
        changed = true;
      }
    });
    if(!ex.maxShown[week]){
      ex.maxShown[week] = true;
      changed = true;
    }
  }
  return changed;
}
function syncMaxLayoutsForward(ex){
  let changed = false;
  const nWeeks = exerciseWeekCount(ex);
  for(let week=0; week<nWeeks-1; week++){
    if(getMaxEntries(ex,week).length && carryMaxLayoutForward(ex,week)) changed = true;
  }
  return changed;
}
function renderMaxEntries(ex, exi, w, si, isReadOnlyWeek, showComparison){
  const entries = maxEntriesAfter(ex,w,si);
  if(!entries.length) return '';
  const kgFields = entries.map(({entry,index},attempt)=>
    `<input type="text" class="set-input max-input" ${isReadOnlyWeek?'disabled':''} aria-label="Peso Max ${attempt+1}" placeholder="Kg" value="${escapeAttr(entry.peso??'')}" oninput="updateMaxEntry(${exi},${w},${index},'peso',this.value,true)" onchange="updateMaxEntry(${exi},${w},${index},'peso',this.value)">`).join('');
  const ripFields = entries.map(({entry,index},attempt)=>{
    const previous = previousMaxEntry(ex,w,index);
    const canCompare = showComparison && String(previous?.rip??'').trim();
    return `<div class="max-rip-compare"><input type="text" class="set-input max-input" ${isReadOnlyWeek?'disabled':''} aria-label="Ripetizioni Max ${attempt+1}" placeholder="Rip" value="${escapeAttr(entry.rip??'')}" oninput="updateMaxEntry(${exi},${w},${index},'rip',this.value,true)" onchange="updateMaxEntry(${exi},${w},${index},'rip',this.value);updateMaxRepCompareAvailability(this)">${canCompare ? `<button type="button" class="rep-compare-btn max-compare-btn" aria-label="Confronta ripetizioni Max" title="Confronta con la settimana scorsa" ${isReadOnlyWeek ? 'disabled' : ''} onclick="showMaxRepComparison(${exi},${w},${index})">↺</button>` : ''}</div>`;
  }).join('');
  return `<div class="max-entry-box"><div class="set-row max-entry-row" style="--max-count:${entries.length}"><span class="set-label max-label">MAX</span><div class="max-cell">${kgFields}</div><div class="max-cell">${ripFields}</div></div></div>`;
}
function getSetPrescription(schema, setIndex){
  const raw = String(schema||'').replace(/\s+/g,' ').trim();
  if(!raw) return {target:'', extras:''};
  // Il ramping non specifica quante serie fare. Il back-off non descrive la prima serie.

  if(/\bramping\b/i.test(raw))return {target:'',extras:''};
  const parts = raw.match(/\d+\s*[x×][\s\S]*?(?=\s*\d+\s*[x×]|$)/gi) || [];
  const expanded = parts.flatMap(rawPart=>{
    const match = rawPart.match(/^\s*(\d+)\s*[x×]\s*(.*)$/i);
    if(!match) return [];
    const count = Math.max(1,Number.parseInt(match[1],10)||1);
    const detail=match[2].trim();
    const lastOnly=detail.match(/\s*\(?\bULTIMA\b\s+(.+?)\)?\s*$/i);
    const base=lastOnly?detail.slice(0,lastOnly.index).trim():detail;
    const bits = base.split('+').map(part=>part.trim()).filter(Boolean);
    const target = (bits.shift()||'').replace(/\s*[-–]\s*/g,'–');
    const prescription = {
      target: target ? (/\d/.test(target) ? `${target} reps` : target) : '',
      extras: [bits.length ? `+ ${bits.join(' + ')}` : '',lastOnly?lastOnly[1].trim():''].filter(Boolean).join(' · ')
    };
    return Array.from({length:count},(_,index)=>({
      target: prescription.target,
      extras: index===count-1 ? prescription.extras : ''
    }));
  });
  return expanded[setIndex] || {target:'', extras:''};
}
function toggleExerciseWeek(exi, w, key){
  const block = document.querySelector(`.week-block[data-exi="${exi}"][data-week="${w}"]`);
  const button = block && block.querySelector(':scope > .week-toggle');
  if(button) toggleWeek(button,key,w);
}
function renderExerciseCardHero(ex, exi, accent){
  const week = state.currentWeek || 0;
  const key = `${activeDayIdx}_${exi}_${week}`;
  const editing = editingExerciseIdx === exi;
  const name = editing
    ? `<textarea class="exercise-card-name-input" rows="1" aria-label="Nome esercizio" oninput="autoGrowTextarea(this)" onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome||'')}</textarea>`
    : `<h2>${escapeHtml(ex.nome||'Esercizio')}</h2>`;
  return `<div class="exercise-card-hero">
    <div class="card-heading-actions"><button type="button" class="card-week-pill" onclick="toggleExerciseWeek(${exi},${week},'${key}')" aria-label="Apri o chiudi settimana ${week+1}">SETTIMANA ${week+1}<span>▾</span></button>${renderCardEditButton(exi)}</div>
    <div class="exercise-card-title">${name}</div>
  </div>`;
}
function toggleCardEdit(exi,button){
  if(editingExerciseIdx===exi){
    const fields=button.closest('.exercise-card-hero').querySelectorAll('.exercise-card-name-input');
    const partner=findLinkedPartner(exi);
    if(fields[0])updateName(exi,fields[0].value);
    if(fields[1]&&partner)updateName(partner.exi,fields[1].value);
  }
  if(editingExerciseIdx===exi)toggleExerciseEditMode(exi);
  else {
    const ex=state.days[activeDayIdx].esercizi[exi];
    openExerciseContextMenu(exi,ex.nome,state.currentWeek||0,findLinkedPartner(exi)?.exi);
  }
}
function renderCardEditButton(exi){
  const editing=editingExerciseIdx===exi;
  if(typeof isViewingShared==='function'&&isViewingShared())return '';
  return `<button type="button" class="card-edit-button" aria-label="${editing?'Conferma modifica esercizio':'Opzioni esercizio'}" onclick="toggleCardEdit(${exi},this)">${editing?ICON_CHECK:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l1-5L16 4l4 4L9 19z"/></svg>'}</button>`;
}
function renderLinkedExerciseCardHero(exA, exiA, exB, exiB, accent){
  const week = state.currentWeek || 0;
  const key = `${activeDayIdx}_${exiA}_${week}`;
  const editing = editingExerciseIdx === exiA;
  const names = editing
    ? `<textarea class="exercise-card-name-input" rows="1" aria-label="Nome primo esercizio" oninput="autoGrowTextarea(this)" onchange="updateName(${exiA},this.value)">${escapeHtml(exA.nome||'')}</textarea><textarea class="exercise-card-name-input linked" rows="1" aria-label="Nome secondo esercizio" oninput="autoGrowTextarea(this)" onchange="updateName(${exiB},this.value)">${escapeHtml(exB.nome||'')}</textarea>`
    : `<h2>${escapeHtml(exA.nome||'Esercizio')}</h2><span class="exercise-link-label">${exerciseLinkLabel(exA)}</span><h2>${escapeHtml(exB.nome||'Esercizio')}</h2>`;
  return `<div class="exercise-card-hero linked-hero">
    <div class="card-heading-actions"><button type="button" class="card-week-pill" onclick="toggleExerciseWeek(${exiA},${week},'${key}')" aria-label="Apri o chiudi settimana ${week+1}">SETTIMANA ${week+1}<span>▾</span></button>${renderCardEditButton(exiA)}</div>
    <div class="exercise-card-title">${names}</div>
  </div>`;
}
function renderExerciseNote(ex, exi){
  return `<details class="exercise-note-disclosure" ${String(ex.commento||'').trim()?'open':''}><summary>${String(ex.commento||'').trim()?'Nota esercizio':'Aggiungi nota'}</summary><label class="exercise-note-field">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8.5 H16 M8 12 H16 M8 15.5 H13"/></svg>
    <textarea class="ex-comment" rows="1" aria-label="Nota esercizio" placeholder="Aggiungi una nota (facoltativo)" onchange="updateComment(${exi},this.value)">${escapeHtml(ex.commento || '')}</textarea>
  </label></details>`;
}
function completedWeeksGroupKey(exi){
  return `completed-weeks_${activeDayIdx}_${exi}`;
}
function renderWeekSections(entries, groupKey, dayManagementHtml=''){
  const current = entries.filter(entry=>entry.group==='current').map(entry=>entry.html).join('');
  const completed = entries.filter(entry=>entry.group==='completed').map(entry=>entry.html).join('');
  const future = entries.filter(entry=>entry.group==='future').map(entry=>entry.html).join('');
  const completedCount = entries.filter(entry=>entry.group==='completed').length;
  const futureCount = entries.filter(entry=>entry.group==='future').length;
  const completedCollapsed = (groupKey in collapsedMap) ? !!collapsedMap[groupKey] : true;
  const completedTarget = Math.max(1, state.currentWeek || completedCount);
  const completedPercent = Math.min(100, Math.round((completedCount / completedTarget) * 100));
  return `
    <section class="week-section week-section-current" aria-label="Settimana corrente">${current}</section>
    ${completedCount ? `<section class="week-section week-section-completed" aria-label="Settimane concluse">
      <button type="button" class="week-group-toggle ${completedCollapsed?'collapsed':''}" aria-expanded="${completedCollapsed?'false':'true'}" onclick="toggleCompletedWeeks(this,'${groupKey}')">
        <span class="week-group-copy"><span>${ICON_CHECK} Settimane concluse <b>${completedCount}/${completedTarget}</b></span><i><em style="width:${completedPercent}%"></em></i></span><span class="chev">▾</span>
      </button>
      <div class="week-group-content ${completedCollapsed?'collapsed':''}">${completed}</div>
    </section>` : ''}
    ${dayManagementHtml}
    ${futureCount ? `<section class="week-section week-section-future" aria-label="Prossime settimane">
      <div class="week-section-label">PROSSIME SETTIMANE <b>${futureCount}</b></div>${future}
    </section>` : ''}`;
}
function exerciseCard(ex, exi, accent, dayManagementHtml=''){

  const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);

  const record = getRecordForExercise(ex.nome);
  const recordAttr = record ? record.peso : 'null';


  const weekEntries = weeks.map(w=>{


    const currentWeek = state.currentWeek || 0;

    const isCurrentWeek = w === currentWeek;
    const isPastWeek = w < currentWeek;
    const isFutureWeek = w > currentWeek;

    const isReadOnlyWeek = false;


    const sets = ex.sets && ex.sets[w] ? ex.sets[w] : [];


    const setRows = (sets.length ? sets : [
      {peso:'',rip:''},
      {peso:'',rip:''},
      {peso:'',rip:''},
      {peso:'',rip:''}
    ]).map((s,si)=>{


      const roman = ["I","II","III","IV","V","VI","VII","VIII"][si] || (si+1);


      const suggestedKg = (!s.peso && s.peso!==0)
      ? suggestNextWeight(ex,w,si)
      : null;


      const setFilled = String(s.peso??'').trim() && String(s.rip??'').trim();
      const maxHtml = renderMaxEntries(ex,exi,w,si,isReadOnlyWeek,isCurrentWeek);
      const prescription = getSetPrescription(ex.schema && ex.schema[w],si);
      const compactFinish=!s.dropset&&!maxHtml;
      return `
      <div class="set-series-group${maxHtml?' has-max':''}${setFilled?' is-filled':''}" data-exi="${exi}" data-week="${w}" data-set="${si}">
      <div class="set-series-heading">
        <button type="button" class="set-label set-series-number${s.dropset?' dropset':''}" ${isReadOnlyWeek?'disabled':''} onclick="toggleDropset(${exi},${w},${si},this)" title="Segna/togli come dropset">SERIE ${si+1}</button>
        <div class="set-series-prescription">${prescription.target ? `<span>${escapeHtml(prescription.target)}</span>` : ''}${prescription.extras ? `<small>${escapeHtml(prescription.extras)}</small>` : ''}</div>
        ${compactFinish&&!isReadOnlyWeek?renderSeriesFinish(exi,w,si):''}
      </div>
      <div class="set-columns-labels"><span>PESO (kg)</span><span>RIPETIZIONI</span></div>
      <div class="set-row${setFilled?' filled':''}">
        <div class="kg-cell">
        <div class="kg-wrap kg-with-reminder">
            <button class="stepper"
            aria-label="Riduci peso serie ${si+1}"
            ${isReadOnlyWeek?'disabled':''}
            onclick="stepSet(${exi},${w},${si},-2.5,this)">
            −
            </button>
          <input type="text" class="set-input"
          ${isReadOnlyWeek?'disabled':''}
          aria-label="Peso serie ${si+1} in chilogrammi"
          placeholder="0"
          value="${escapeAttr(s.peso ?? '')}"
          oninput="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr},true)" onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr});markSetVisualState(this)">
            <button type="button" class="stepper" aria-label="Aumenta peso serie ${si+1}" ${isReadOnlyWeek?'disabled':''} onclick="stepSet(${exi},${w},${si},2.5,this)">+</button>
        </div>
        ${renderLoadReminder(ex,exi,w,si,true)}
        ${suggestedKg!==null ? `<button type="button" class="kg-fill-chip" ${isReadOnlyWeek?'disabled':''} title="Usa l'ultimo peso: ${suggestedKg} kg" onclick="fillSuggestedWeight(${exi},${w},${si},'${suggestedKg}',this,${recordAttr})">↺ ultimo: ${suggestedKg} kg</button>` : ''}
        </div>
        <div class="rip-cell">
        <div class="rip-wrap">
        <input type="text" class="set-input"
        ${isReadOnlyWeek?'disabled':''}
        aria-label="Ripetizioni serie ${si+1}"
        placeholder="0"
        value="${escapeAttr(s.rip ?? '')}"
        oninput="updateSet(${exi},${w},${si},'rip',this.value,undefined,true)" onchange="updateSet(${exi},${w},${si},'rip',this.value);updateRepCompareAvailability(this);markSetVisualState(this)">

        <button type="button" class="rpe-chip ${s.rpe?'filled':''}" ${isReadOnlyWeek?'disabled':''} onclick="editRpe(${exi},${w},${si},this)" title="RPE di questa serie">${s.rpe ? escapeHtml(String(s.rpe)) : 'RPE'}</button>
        </div>
        ${renderPreviousSetButton(ex,exi,w,si)}
        <span class="rep-comparison" aria-live="polite" hidden></span>
        </div>


      </div>${renderLoadReminder(ex,exi,w,si)}${maxHtml}${!compactFinish&&!isReadOnlyWeek?renderSeriesFinish(exi,w,si):''}</div>`;
    }).join('');



    const wkey = activeDayIdx+"_"+exi+"_"+w;


    const isCompletedWeek =
      state.completedWeeks &&
      state.completedWeeks.includes(w);



    const weekDone = !!(ex.weekDone && ex.weekDone[w]);
    const weekSkipped = !!(ex.weekSkipped && ex.weekSkipped[w]);

    const isCollapsed = (wkey in collapsedMap) ? !!collapsedMap[wkey] : (!isCurrentWeek || weekDone || weekSkipped);
    const isCompletedGroup = !isCurrentWeek && (isPastWeek || isCompletedWeek || weekDone || weekSkipped);
    const isFutureGroup = !isCurrentWeek && !isCompletedGroup;



    return {group:isCurrentWeek?'current':isCompletedGroup?'completed':'future', html:`

    <div class="week-block ${isCurrentWeek?'current-week-block':''} ${isCompletedGroup?'completed-week-block':''} ${isFutureGroup?'future-week-block':''}" data-exi="${exi}" data-week="${w}">


      <button class="week-toggle
      ${isCollapsed?'collapsed':''}
      ${weekDone?'done':''}
      ${weekSkipped?'skipped':''}
      ${isCurrentWeek?'current-week':''}
      ${isCompletedGroup?'completed-week':''}
      ${isFutureGroup?'future-week':''}"
      style="background:${accent.d}"
      ${isFutureGroup ? `ondblclick="toggleWeek(this,'${wkey}',${w})"` : `onclick="toggleWeek(this,'${wkey}',${w})"`}>


        <span>

        ${
  isCompletedGroup
  ? ICON_CHECK+' '
  : isCurrentWeek
    ? ICON_FLAME+' '
    : isFutureGroup
      ? ICON_LOCK+' '
      : ''
}

        SETTIMANA ${w+1}${weekSkipped?' — saltata':''}${weekDone && ex.schema[w] ? ` <span class="week-toggle-schema">(${escapeHtml(ex.schema[w])})</span>` : ''}

        </span>


        <span class="chev">▾</span>


      </button>



      <div class="week-body ${isCollapsed?'collapsed':''}" data-exi="${exi}" data-week="${w}">
      ${renderWeekQuickSummary(exi,w,ex)}
      ${isCurrentWeek ? renderExerciseNote(ex,exi) : ''}
      <div class="week-note-wrap">
      <input class="week-note"
      ${isReadOnlyWeek?'disabled':''}
      placeholder="nota settimana (facoltativo)"
      value="${escapeAttr((ex.weekNote && ex.weekNote[w]) ?? '')}"
      onchange="updateWeekNote(${exi},${w},this.value)">

      </div>
      <div class="week-config">

      <div class="meta-row-schema">
        <span class="meta-label small">Serie</span>
        <div class="meta-field-center">
          <textarea class="meta-input schema" rows="1"
          ${isReadOnlyWeek?'disabled':''}
          oninput="autoGrowTextarea(this);autoWidthSchema(this)"
          onchange="updateMeta(${exi},'schema',${w},this.value)">${escapeHtml(ex.schema[w]??'')}</textarea>
        </div>
      </div>

      <div class="meta-row meta-row-combined">

        <div class="meta-group">
          <span class="meta-label small">Rec.</span>
          <div class="meta-field-center">
            <div class="combo-wrap">
              <input class="meta-input"
              ${isReadOnlyWeek?'disabled':''}
              placeholder="—"
              value="${escapeAttr(ex.recupero[w]??'')}"
              oninput="onComboInput(this,'recuperi')"
              onfocus="onComboFocus(this,'recuperi')"
              onchange="updateMeta(${exi},'recupero',${w},this.value)">
            </div>
          </div>
        </div>

      </div>

      </div>
      <div class="sets-wrap">
        ${renderUnassignedLoadReminders(ex,exi,w)}

        ${setRows}

      </div>

      <div class="set-btns-secondary">
        <button class="week-actions-btn" ${isReadOnlyWeek?'disabled':''} onclick="openExerciseContextMenu(${exi}, '${escapeJs(ex.nome||'')}', ${w})" aria-label="Azioni esercizio">${ICON_MORE}<span>Opzioni serie</span></button>
      </div>




      <div class="set-btns">



        <div class="week-done-wrap">

          <div class="week-status-col">
            <button class="week-skip-btn ${weekSkipped?'checked':''}"
            data-exi="${exi}" data-w="${w}"
            aria-pressed="${weekSkipped?'true':'false'}"
            ${isReadOnlyWeek?'disabled':''}
            onclick="toggleWeekSkipped(${exi},${w})">
            ⏭
            <span>Salta esercizio</span>
            </button>
          </div>

          <div class="week-status-col">
            <button class="week-done-btn ${weekDone?'checked':''}"
            data-exi="${exi}" data-w="${w}"
            aria-pressed="${weekDone?'true':'false'}"
            ${isReadOnlyWeek?'disabled':''}
            onclick="toggleWeekDone(${exi},${w})">
            ${ICON_CHECK}
            <span>Completa esercizio</span>
            </button>
          </div>

        </div>

      </div>



    </div>



    </div>`};



  });
  const weeksHtml = renderWeekSections(weekEntries, completedWeeksGroupKey(exi), dayManagementHtml);




  const prBadge = '';




  return `

  <div class="card" data-exi="${exi}" style="--accent:${accent.c}">


    <div class="card-head">


      ${prBadge}






${renderExerciseCardHero(ex,exi,accent)}



    </div>




    <div class="weeks">

    ${weeksHtml}

    </div>




  </div>`;



}
function renderExerciseStickyHeader(exi){
  const day = state.days[activeDayIdx];
  if(!day) return '';
  let ex = day.esercizi[exi];
  if(!ex) return '';
  const primary=computeExerciseBlocks(day).find(block=>block.includes(exi))?.[0];
  if(primary!==undefined&&primary!==exi){
    exi = primary;
    ex = day.esercizi[exi];
  }
  const accent = dayAccent(day, activeDayIdx).c;
  const isEditing = editingExerciseIdx === exi;
  const editBtn = `<button class="ex-edit-mode-btn ${isEditing?'active':''}" onclick="toggleExerciseEditMode(${exi})" aria-label="${isEditing?'Chiudi modifica':'Modifica esercizio'}" title="${isEditing?'Chiudi modifica':'Modifica esercizio'}">${isEditing ? ICON_CHECK : ICON_GEAR}</button>`;
  const partnerExi = findLinkedPartner(exi)?.exi ?? null;
  if(partnerExi !== null){
    const exB = day.esercizi[partnerExi];
    const typeLabel = ex.linkType === 'jumpset' ? 'Jump set' : 'Super set';
    return `<div class="ex-sticky-header-slot" id="exStickyHeaderSlot"><div class="ex-sticky-header linked" id="exStickyHeaderOuter" style="--accent:${accent}">
      <div class="ex-sticky-top"><div class="ex-sticky-name-area">${isEditing ? `<textarea class="ex-sticky-name-input" rows="1" oninput="autoGrowTextarea(this)" onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome??'')}</textarea>` : `<div class="ex-sticky-line">${escapeHtml(ex.nome||'Esercizio')}</div>`}</div>${editBtn}</div>
      <div class="ex-sticky-line ex-sticky-linktype">${typeLabel}</div>
      ${isEditing ? `<textarea class="ex-sticky-name-input" rows="1" oninput="autoGrowTextarea(this)" onchange="updateName(${partnerExi},this.value)">${escapeHtml(exB.nome??'')}</textarea>` : `<div class="ex-sticky-line">${escapeHtml(exB.nome||'Esercizio')}</div>`}
    </div></div>`;
  }
  return `<div class="ex-sticky-header-slot" id="exStickyHeaderSlot"><div class="ex-sticky-header" id="exStickyHeaderOuter" style="--accent:${accent}">
    <div class="ex-sticky-top"><div class="ex-sticky-name-area">${isEditing ? `<textarea class="ex-sticky-name-input" rows="1" oninput="autoGrowTextarea(this)" onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome??'')}</textarea>` : escapeHtml(ex.nome||'Esercizio')}</div>${editBtn}</div></div></div>`;
}

function syncExerciseStickyHeaderSpace(){
  const slot = document.getElementById('exStickyHeaderSlot');
  if(slot) slot.style.height = '';
}

function toggleExerciseEditMode(exi){
  editingExerciseIdx = editingExerciseIdx===exi ? null : exi;
  renderActive();
}
function renderWeekQuickSummary(exi, w, ex, partnerExi){
  const editing = editingExerciseIdx===exi;
  const pairUpdate = (field, value) => typeof partnerExi==='number' ? `updateMeta(${exi},'${field}',${w},${value});updateMeta(${partnerExi},'${field}',${w},${value})` : `updateMeta(${exi},'${field}',${w},${value})`;
  const content = editing
    ? `<textarea class="week-inline-meta schema" rows="1" oninput="autoGrowTextarea(this)" onchange="${pairUpdate('schema','this.value')}">${escapeHtml(ex.schema[w]??'')}</textarea><i>·</i><input class="week-inline-meta" value="${escapeAttr(ex.recupero[w]??'')}" onchange="${pairUpdate('recupero','this.value')}">`
    : `<span class="week-plan-schema">${escapeHtml(ex.schema[w] || 'Serie libere')}</span><span class="week-plan-recovery">Recupero: ${escapeHtml(ex.recupero[w] || 'libero')}</span>`;
  return `<div class="week-quick-summary ${editing?'editing':''}"><div class="week-summary-metas">${content}${!editing&&w===state.currentWeek?`<div class="workout-quick-tools"><button type="button" class="rest-settings-trigger" onclick="configureWorkoutRest()">Timer e avvisi</button><button type="button" class="rest-settings-trigger" onclick="openExerciseHistory(${exi})">Storico esercizio</button></div>`:''}</div><button type="button" class="week-note-trigger" onclick="toggleWeekNote(this)" aria-label="Aggiungi nota alla settimana">Nota</button></div>`;
}

function toggleWeek(btn, key, weekIdx){

  const nowCollapsed = btn.classList.toggle('collapsed');

  btn.nextElementSibling.classList.toggle('collapsed');

  collapsedMap[key] = nowCollapsed;

  saveCollapsed();

}

function toggleCompletedWeeks(btn, key){
  const content = btn.nextElementSibling;
  if(!content) return;
  const nowCollapsed = btn.classList.toggle('collapsed');
  content.classList.toggle('collapsed', nowCollapsed);
  btn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
  collapsedMap[key] = nowCollapsed;
  saveCollapsed();
}

function toggleWeekConfig(btn){
  const body = btn.closest('.week-body');
  if(!body) return;
  const open = body.classList.toggle('show-config');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const label = btn.querySelector('small');
  if(label) label.textContent = open ? 'Chiudi' : 'Opzioni';
}
function toggleWeekNote(btn){
  const body = btn.closest('.week-body');
  if(!body) return;
  const open = body.classList.toggle('show-note');
  btn.textContent = open ? 'Chiudi nota' : 'Nota';
  if(open){ const input = body.querySelector('.week-note'); if(input) input.focus(); }
}
function openWeekConfig(exi, w, field){
  const body = document.querySelector(`.week-body[data-exi="${exi}"][data-week="${w}"]`);
  if(!body) return;
  body.classList.add('show-config');
  const target = field==='schema' ? body.querySelector('textarea.meta-input.schema') : body.querySelector('input.meta-input');
  if(target){
    target.focus();
    if(typeof target.select==='function') target.select();
  }
}

let stickyGesture = { longTimer:null, startX:0, startY:0 };
function onStickyPointerDown(e, exi){
  stickyGesture.startX = e.clientX;
  stickyGesture.startY = e.clientY;
  clearTimeout(stickyGesture.longTimer);
  stickyGesture.longTimer = setTimeout(()=>{
    const ex = state.days[activeDayIdx].esercizi[exi];
    openExerciseContextMenu(exi, ex ? ex.nome : '');
  }, 500);
}
function onStickyPointerMove(e){
  const dx = Math.abs(e.clientX-stickyGesture.startX), dy = Math.abs(e.clientY-stickyGesture.startY);
  if(dx>10 || dy>10) clearTimeout(stickyGesture.longTimer);
}
function onStickyPointerCancel(){
  clearTimeout(stickyGesture.longTimer);
}
async function shareExercise(exi){
  const ex = state.days[activeDayIdx] && state.days[activeDayIdx].esercizi[exi];
  if(!ex) return;
  const record = getRecordForExercise(ex.nome);
  const text = record
    ? `💪 ${ex.nome}: record personale ${record.peso}kg × ${record.rip||'?'} rip\nTracciato con Viridis`
    : `🏋️ ${ex.nome} - allenamento tracciato con Viridis`;
  if(navigator.share){
    try{ await navigator.share({text}); }catch(e){}
  } else if(navigator.clipboard && navigator.clipboard.writeText){
    try{
      await navigator.clipboard.writeText(text);
      showQuickToast('Copiato negli appunti');
    }catch(e){}
  }
}
function openExerciseContextMenu(exi, exName, weekIdx, partnerExi){
  closeExerciseContextMenu();
  const hasWeekContext = typeof weekIdx === 'number';
  const exercise = state.days[activeDayIdx] && state.days[activeDayIdx].esercizi[exi];
  const hasMax = hasWeekContext && exercise && getMaxEntries(exercise,weekIdx).length;
  const partnerArg = typeof partnerExi === 'number' ? `,${partnerExi}` : '';
  const maxActions = hasWeekContext ? `<div class="ex-context-max-actions" aria-label="Serie Max">
      <button class="ex-context-quick-action max-primary" onclick="closeExerciseContextMenu();requestAddMax(${exi},${weekIdx}${partnerArg})"><span class="ex-context-action-icon">${ICON_PLATE}</span><span>Aggiungi serie Max</span></button>
      ${hasMax ? `<button class="ex-context-max-remove" onclick="closeExerciseContextMenu();requestRemoveMax(${exi},${weekIdx}${partnerArg})"><span class="ex-context-action-icon">${ICON_TRASH}</span><span>Rimuovi serie Max</span></button>` : ''}
    </div>` : '';
  const setActions = hasWeekContext ? `<div class="ex-context-action-pair ex-context-series-actions" aria-label="Serie esercizio">
      <button class="ex-context-quick-action paired-action" onclick="closeExerciseContextMenu();addSet(${exi},${weekIdx})${typeof partnerExi==='number'?`;addSet(${partnerExi},${weekIdx})`:''}"><span class="ex-context-quick-symbol">＋</span><span>Aggiungi serie</span></button>
      <button class="ex-context-quick-action paired-action danger" onclick="closeExerciseContextMenu();removeSet(${exi},${weekIdx})${typeof partnerExi==='number'?`.then(()=>removeSet(${partnerExi},${weekIdx}))`:''}"><span class="ex-context-quick-symbol">−</span><span>Rimuovi ultima serie</span></button>
    </div>` : '';
  const el = document.createElement('div');
  el.id = 'exContextMenu';
  el.className = 'modal-overlay ex-context-overlay';
  el.onclick = (e) => { if(e.target===el) closeExerciseContextMenu(); };
  el.innerHTML = `
    <div class="ex-context-sheet" role="dialog" aria-modal="true" aria-labelledby="exerciseOptionsTitle" tabindex="-1">
      <div class="ex-sheet-grip" aria-hidden="true"><span></span></div>
      <div class="ex-sheet-header"><div class="ex-context-title" id="exerciseOptionsTitle">${escapeHtml(exName||'Esercizio')}</div><button type="button" class="ex-sheet-close" aria-label="Chiudi opzioni esercizio" onclick="closeExerciseContextMenu()">${ICON_CLOSE}</button></div>
      <div class="ex-sheet-content">
      ${hasWeekContext ? `<div class="ex-context-group-label">Serie</div>` : ''}
      ${setActions}
      ${hasWeekContext?'<div class="ex-context-group-label">Serie Max</div>':''}${maxActions}
      <div class="ex-context-group-label">Collegamento</div>
      <button class="ex-context-action ex-context-row-action" onclick="closeExerciseContextMenu();openLinkPicker(${exi})"><span class="ex-context-action-icon">${ICON_LINK}</span><span class="ex-context-action-copy">${exercise?.linkGroupId?'Modifica o scollega unione':'Collega esercizio'}</span><span aria-hidden="true">›</span></button>
      <div class="ex-context-group-label">Strumenti</div>
      <button class="ex-context-action ex-context-row-action" onclick="closeExerciseContextMenu();openChart(${exi})"><span class="ex-context-action-icon">${ICON_CHART}</span><span>Grafico progressione</span></button>
      <button class="ex-context-action ex-context-row-action" onclick="closeExerciseContextMenu();openPlateCalc(${exi})"><span class="ex-context-action-icon">${ICON_PLATE}</span><span>Calcola dischi bilanciere</span></button>
      <div class="ex-context-group-label">Altro</div>
      <button class="ex-context-action ex-context-row-action" onclick="closeExerciseContextMenu();toggleExerciseEditMode(${exi})"><span class="ex-context-action-icon">${ICON_GEAR}</span><span>Modifica esercizio</span><span class="ex-context-action-chevron">›</span></button>
      <button class="ex-context-action ex-context-row-action" onclick="closeExerciseContextMenu();shareExercise(${exi})"><span class="ex-context-action-icon">${ICON_SHARE}</span><span class="ex-context-action-copy">Condividi</span></button>
      <div class="ex-context-danger-zone"><button class="ex-context-action ex-context-row-action danger" onclick="closeExerciseContextMenu();deleteExercise(${exi})"><span class="ex-context-action-icon">${ICON_TRASH}</span><span class="ex-context-action-copy">Elimina esercizio</span></button></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.sheetCleanup=bindViridisSheet(el,el.querySelector('.ex-context-sheet'),closeExerciseContextMenu);
  vibrate(20);
}
function closeExerciseContextMenu(){
  const el = document.getElementById('exContextMenu');
  if(el){el.sheetCleanup?.();el.remove();}
}

function openDayManagementMenu(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  closeDayManagementMenu();
  const day = state.days[activeDayIdx];
  if(!day || !day.esercizi || !day.esercizi.length) return;
  const progress = computeDayProgress(day);
  const isClosed = allExercisesClosed(day);
  const el = document.createElement('div');
  el.id = 'dayManagementMenu';
  el.className = 'modal-overlay ex-context-overlay day-management-overlay';
  el.onclick = (e) => { if(e.target===el) closeDayManagementMenu(); };
  el.innerHTML = `
    <div class="ex-context-sheet day-management-sheet" role="dialog" aria-modal="true" aria-labelledby="dayManagementTitle" tabindex="-1">
      <div class="ex-sheet-grip" aria-hidden="true"><span></span></div>
      <div class="ex-sheet-header"><div class="ex-context-title" id="dayManagementTitle">${escapeHtml(day.name||'Giornata')}</div><button class="ex-sheet-close" type="button" onclick="closeDayManagementMenu()" aria-label="Chiudi opzioni giornata">${ICON_CLOSE}</button></div>
      <div class="ex-sheet-content">
      <div class="ex-context-group-label">Organizza</div>
      ${day.esercizi.length>1?`<button class="ex-context-action" onclick="closeDayManagementMenu();toggleReorderMode()">${ICON_REORDER} Modifica ordine</button>`:''}
      <div class="ex-context-group-label">Vista</div>
      <button class="ex-context-action" onclick="closeDayManagementMenu();toggleTrainingFocusMode()">${trainingFocusMode ? '↙' : '⛶'} ${trainingFocusMode ? 'Torna alla vista normale' : 'Modalità allenamento grande'}</button>
      <div class="ex-context-group-label">Questa giornata · ${progress.done}/${progress.total} esercizi chiusi</div>
      ${isClosed
        ? `<button class="ex-context-action day-finish-action" onclick="closeDayManagementMenu();openFinishWorkoutModal(${activeDayIdx})">${ICON_CHECK} Termina giornata</button>`
        : `<button class="ex-context-action day-skip-action" onclick="closeDayManagementMenu();skipRemainingExercisesForDay()">${ICON_WARNING} Salta gli esercizi rimanenti</button>`}
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.sheetCleanup=bindViridisSheet(el,el.querySelector('.ex-context-sheet'),closeDayManagementMenu);
  vibrate(20);
}
function closeDayManagementMenu(){
  const el = document.getElementById('dayManagementMenu');
  if(el){el.sheetCleanup?.();el.remove();}
}
async function skipRemainingExercisesForDay(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  const day = state.days[activeDayIdx];
  const w = state.currentWeek || 0;
  if(!day || !day.esercizi || !day.esercizi.length) return;
  const remaining = day.esercizi.filter(ex=>{
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    return w < nWeeks && !((ex.weekDone && ex.weekDone[w]) || (ex.weekSkipped && ex.weekSkipped[w]));
  });
  if(!remaining.length){
    openFinishWorkoutModal(activeDayIdx);
    return;
  }
  const plural = remaining.length === 1 ? 'esercizio rimanente' : 'esercizi rimanenti';
  if(!await ViridisConfirmDialog(`Vuoi saltare ${remaining.length} ${plural} di ${day.name||'questa giornata'}? Gli esercizi gia' completati e tutti i dati inseriti resteranno invariati.`)) return;
  remaining.forEach(ex=>{
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    if(!ex.weekDone) ex.weekDone = new Array(nWeeks).fill(false);
    if(!ex.weekSkipped) ex.weekSkipped = new Array(nWeeks).fill(false);
    ex.weekDone[w] = false;
    ex.weekSkipped[w] = true;
  });
  saveState();
  checkAchievements();
  renderActive();
  openFinishWorkoutModal(activeDayIdx);
  vibrate([15,35,15]);
}


function updateName(exi, val){
  state.days[activeDayIdx].esercizi[exi].nome = val;
  saveState();
}
function startEditStickyName(exi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const header = document.getElementById('exStickyHeaderOuter');
  if(!header || !ex) return;
  header.classList.add('editing');
  header.innerHTML = `<div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
    oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
    onfocus="onComboFocus(this,'esercizi')"
    onblur="finishEditStickyName(${exi})"
    onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome??'')}</textarea></div>`;
  const ta = header.querySelector('textarea');
  ta.focus();
  const len = ta.value.length; ta.setSelectionRange(len,len);
}
function finishEditStickyName(exi){
  const header = document.getElementById('exStickyHeaderOuter');
  if(!header) return;
  header.classList.remove('editing');
  const ex = state.days[activeDayIdx].esercizi[exi];
  header.textContent = (ex && ex.nome) || 'Esercizio';
}
function startEditLinkedSticky(exiA, exiB){
  const day = state.days[activeDayIdx];
  const exA = day.esercizi[exiA], exB = day.esercizi[exiB];
  const header = document.getElementById('exStickyHeaderOuter');
  if(!header || !exA || !exB) return;
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  header.classList.add('editing');
  header.innerHTML = `
    <div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
      oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
      onfocus="onComboFocus(this,'esercizi')"
      onchange="updateName(${exiA},this.value)">${escapeHtml(exA.nome??'')}</textarea></div>
    <button class="ex-sticky-linktype-btn" onclick="openLinkPicker(${exiA})">${typeLabel}</button>
    <div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
      oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
      onfocus="onComboFocus(this,'esercizi')"
      onchange="updateName(${exiB},this.value)">${escapeHtml(exB.nome??'')}</textarea></div>
    <button class="ex-sticky-confirm-btn" onclick="finishEditLinkedSticky(${exiA},${exiB})">${ICON_CHECK} Conferma</button>
  `;
}
function finishEditLinkedSticky(exiA, exiB){
  const header = document.getElementById('exStickyHeaderOuter');
  if(!header) return;
  header.classList.remove('editing');
  renderStickyLinkedDisplay(header, exiA, exiB);
}
function renderStickyLinkedDisplay(header, exiA, exiB){
  const day = state.days[activeDayIdx];
  const exA = day.esercizi[exiA], exB = day.esercizi[exiB];
  if(!exA || !exB) return;
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  header.innerHTML = `<div class="ex-sticky-line">${escapeHtml(exA.nome||'Esercizio')}</div><div class="ex-sticky-line ex-sticky-linktype">${escapeHtml(typeLabel)}</div><div class="ex-sticky-line">${escapeHtml(exB.nome||'Esercizio')}</div>`;
}
function updateComment(exi, val){
  state.days[activeDayIdx].esercizi[exi].commento = val;
  saveState();
}
function updateMeta(exi, field, w, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  ex[field][w] = val;
  for(let k=w+1;k<ex[field].length;k++){ ex[field][k] = val; }
  if(w<ex[field].length-1) renderActive();
  saveState();
}
function updateWeekNote(exi, w, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekNote) ex.weekNote=emptyStrArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  ex.weekNote[w] = val;
  saveState();
}
function updateSet(exi, w, si, field, val, recordPeso, isDraft=false){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  ex.sets[w][si][field]=val;
  if(field==='rip'&&String(val??'').trim())recordExerciseDate(ex,w);
  refreshSeriesFinishUI(exi,w);
  const finishPartner=findLinkedPartner(exi);
  if(finishPartner)refreshSeriesFinishUI(finishPartner.exi,w);
  if(field==='rip' && String(val||'').trim()!=='') markWorkoutStartedByRep();
  saveState();
  if(isDraft) return;
  if(field==='peso' && recordPeso!==undefined && recordPeso!==null && !ex.sets[w][si].dropset){
    const p = parseFloat(String(val).replace(',','.'));
    if(!isNaN(p) && p>recordPeso){
      celebratePR(ex.nome, p);
      bumpAchievCounter('prCount');
      checkAchievements();
    }
  }

}

function renderPreviousSetButton(ex,exi,w,si){
  const previous=ex.sets?.[w-1]?.[si];
  if(w!==state.currentWeek||!String(previous?.rip??'').trim())return '';
  const text=`Prima: ${previous.peso||'—'} kg × ${previous.rip}`;
  return `<button type="button" class="rep-compare-btn previous-set-button" aria-label="Confronta, settimana ${w}: ${escapeAttr(text)}" onclick="showRepComparison(${exi},${w},${si},this)">${escapeHtml(text)}</button>`;
}
function getPreviousWeekRep(ex, w, si){
  if(!ex || w < 1 || !ex.sets || !ex.sets[w-1] || !ex.sets[w-1][si]) return null;
  const value = String(ex.sets[w-1][si].rip ?? '').trim();
  return value || null;
}
function updateRepCompareAvailability(input){
  const cell = input.closest('.rip-cell');
  if(!cell) return;
  const btn = cell.querySelector('.rep-compare-btn');
  const output = cell.querySelector('.rep-comparison');
  if(btn) btn.disabled = false;
  if(output){ output.hidden = true; output.textContent = ''; }
}
function updateMaxRepCompareAvailability(input){
  const wrap = input.closest('.max-rip-compare');
  const btn = wrap && wrap.querySelector('.max-compare-btn');
  if(btn) btn.disabled = false;
}
function markSetVisualState(input){
  const row = input.closest('.set-row');
  if(!row) return;
  const values = [...row.querySelectorAll('.set-input:not(.max-input)')].map(el=>String(el.value||'').trim());
  const filled = values.length >= 2 && values.every(Boolean);
  row.classList.toggle('filled', filled);
  const group = row.closest('.set-series-group');
  if(group) group.classList.toggle('is-filled', filled);
}
function showRepComparison(exi, w, si, btn){
  const ex = state.days[activeDayIdx] && state.days[activeDayIdx].esercizi[exi];
  const cell = btn.closest('.rip-cell');
  const output = cell && cell.querySelector('.rep-comparison');
  if(!ex || !output) return;
  const current = String((((ex.sets||[])[w]||[])[si]||{}).rip ?? '').trim();
  const previous = getPreviousWeekRep(ex, w, si);
  if(previous === null){
    output.textContent = 'Nessun dato per questa serie la settimana scorsa.';
  } else {
    const nowNum = Number(String(current).replace(',','.'));
    const prevNum = Number(String(previous).replace(',','.'));
    const sameWeight=historyWeightKey(ex.sets[w][si].peso)===historyWeightKey(ex.sets[w-1][si].peso);
    const delta = current && sameWeight && Number.isFinite(nowNum) && Number.isFinite(prevNum) ? nowNum - prevNum : null;
    const deltaText = delta === null || delta === 0 ? '' : ` · ${delta>0?'+':''}${String(delta).replace('.',',')}`;
    const weight = String(ex.sets[w-1][si].peso ?? '').trim();
    output.textContent = `Settimana scorsa: ${weight ? `${weight} kg × ` : ''}${previous} rip${deltaText}`;
  }
  output.hidden = false;
}
function previousMaxEntry(ex,w,index){
  if(w<1)return null;
  const entries=getMaxEntries(ex,w),current=entries[index];
  if(!current)return null;
  const attempt=entries.slice(0,index).filter(entry=>entry.afterSet===current.afterSet).length;
  return getMaxEntries(ex,w-1).filter(entry=>entry.afterSet===current.afterSet)[attempt]||null;
}
function showMaxRepComparison(exi, w, index){
  const ex = state.days[activeDayIdx] && state.days[activeDayIdx].esercizi[exi];
  if(!ex) return;
  const current = getMaxEntries(ex,w)[index];
  if(!current) return;
  const previous = previousMaxEntry(ex,w,index);
  if(!previous || !String(previous.rip||'').trim()){
    showQuickToast('Nessun Max corrispondente la settimana scorsa');
    return;
  }
  const nowNum = Number(String(current.rip).replace(',','.'));
  const prevNum = Number(String(previous.rip).replace(',','.'));
  const sameWeight=historyWeightKey(current.peso)===historyWeightKey(previous.peso);
  const delta = String(current.rip??'').trim()&&sameWeight&&Number.isFinite(nowNum) && Number.isFinite(prevNum) ? nowNum-prevNum : null;
  const deltaText = delta===null || delta===0 ? '' : ` · ${delta>0?'+':''}${String(delta).replace('.',',')}`;
  const weight = String(previous.peso ?? '').trim();
  showQuickToast(`Max settimana scorsa: ${weight ? `${weight} kg × ` : ''}${previous.rip} rip${deltaText}`);
}
function isLastSetOfWeekFilled(ex, w){
  const sets = ex.sets && ex.sets[w];
  if(!sets || !sets.length) return false;
  const last = sets[sets.length-1];
  return !!(last && String(last.rip||'').trim() !== '');
}
let weekDoneConfirmTarget = null;
let finishWorkoutPromptTimer = null;

function promptFinishWorkoutWhenReady(dayIdx, weekIdx){
  const day = state.days[dayIdx];
  if(!day || weekIdx !== state.currentWeek || !day.esercizi.length || !allExercisesClosed(day)) return;
  if((state.completedTrainingDays||[]).includes(dayIdx)) return;
  const modal = document.getElementById('finishWorkoutModal');
  if(!modal || modal.style.display !== 'none') return;
  clearTimeout(finishWorkoutPromptTimer);
  finishWorkoutPromptTimer = setTimeout(()=>{
    const currentDay = state.days[dayIdx];
    if(weekIdx !== state.currentWeek || !currentDay || !allExercisesClosed(currentDay)) return;
    if((state.completedTrainingDays||[]).includes(dayIdx)) return;
    if(modal.style.display === 'none') openFinishWorkoutModal(dayIdx);
  }, 350);
}

function askWeekDoneConfirm(exi, w, exName){
  weekDoneConfirmTarget = {exi, w};
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  document.getElementById('weekDoneModalBody').innerHTML = `
    <div class="finish-title" style="font-size:20px;">${ICON_CHECK} Settimana ${w+1} di "${escapeHtml(exName||'questo esercizio')}"</div>
    <div class="finish-subtitle" style="font-size:14px;">Segnarla come completata?</div>
    <div class="finish-buttons">
      <button class="add-ex small2" onclick="closeWeekDoneConfirm(false)">No, non ancora</button>
      <button class="add-ex small2" style="border-color:var(--green);color:var(--green);" onclick="closeWeekDoneConfirm(true)">Sì, fatta ${ICON_CHECK}</button>
    </div>
  `;
  const modal = document.getElementById('weekDoneModal');
  setTimeout(()=>{
    modal.style.display = 'flex';
    if(typeof gsap !== 'undefined'){
      gsap.fromTo('#weekDoneModal .finish-modal', {y:'100%',opacity:0}, {y:0,opacity:1,duration:.35,ease:'power3.out'});
    }
  }, 150);
}
let weekDoneConfirmTimer = null;
function requestWeekDoneConfirm(exi, w, exName){
  clearTimeout(weekDoneConfirmTimer);
  const active = document.activeElement;
  if(typeof isQuickNumberTarget === 'function' && isQuickNumberTarget(active)){
    active.addEventListener('blur', ()=>requestWeekDoneConfirm(exi,w,exName), {once:true});
    return;
  }
  if(!weekDoneConfirmTarget) askWeekDoneConfirm(exi,w,exName);
}
function closeWeekDoneConfirm(confirmed){
  document.getElementById('weekDoneModal').style.display = 'none';
  const target = weekDoneConfirmTarget;
  weekDoneConfirmTarget = null;
  if(!confirmed || !target) return;
  toggleWeekDone(target.exi, target.w);
  const partner = findLinkedPartner(target.exi);
  if(partner) toggleWeekDone(partner.exi, target.w);
}
function stepSet(exi, w, si, delta, btn){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  let cur = parseFloat(String(ex.sets[w][si].peso).replace(',','.'));
  if(isNaN(cur)) cur = 0;
  let next = Math.max(0, Math.round((cur+delta)*10)/10);
  const record = getRecordForExercise(ex.nome);
  ex.sets[w][si].peso = next;
  const input = btn.closest('.kg-wrap').querySelector('.set-input');
  if(input) input.value = next;
  saveState();
  if(record && next>record.peso && !ex.sets[w][si].dropset){
    celebratePR(ex.nome, next);
    bumpAchievCounter('prCount');
    checkAchievements();
  }
}
function fillSuggestedWeight(exi, w, si, value, btn, recordPeso){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  const input = btn.closest('.kg-cell').querySelector('.set-input');
  if(input) input.value = value;
  updateSet(exi, w, si, 'peso', value, recordPeso);
  btn.remove();
}
async function editRpe(exi, w, si, btn){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  const cur = ex.sets[w][si].rpe || '';
  const raw = await ViridisInputDialog('RPE di questa serie (1-10, es. 8 o 8.5). Lascia vuoto per toglierlo:', cur, {title:'Sforzo percepito · RPE', inputMode:'decimal', validate:value => value.trim() && (isNaN(parseFloat(value.replace(",","."))) || parseFloat(value.replace(",","."))<1 || parseFloat(value.replace(",","."))>10) ? 'RPE deve essere un numero tra 1 e 10.' : ''});
  if(raw === null) return;
  const val = raw.trim();
  if(val !== ''){
    const n = parseFloat(val.replace(',','.'));
    if(isNaN(n) || n<1 || n>10){ ViridisToast('RPE deve essere un numero tra 1 e 10.'); return; }
  }
  ex.sets[w][si].rpe = val;
  saveState();
  btn.textContent = val || 'RPE';
  btn.classList.toggle('filled', !!val);
}
function toggleDropset(exi, w, si, btn){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  ex.sets[w][si].dropset = !ex.sets[w][si].dropset;
  saveState();
  btn.classList.toggle('dropset', !!ex.sets[w][si].dropset);
}
function maxHasData(ex, w){
  if(ex.maxEntries && ex.maxEntries[w]) return ex.maxEntries[w].some(m=> m && (String(m.peso||'').trim() || String(m.rip||'').trim()));
  const pair = (ex.maxExtra && ex.maxExtra[w]) || [];
  return pair.some(m=> m && (String(m.peso||'').trim() || String(m.rip||'').trim()));
}
async function requestAddMax(exi, w, partnerExi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const weekBody = document.querySelector(`.week-body[data-exi="${exi}"][data-week="${w}"]`);
  const displayedSets = weekBody ? weekBody.querySelectorAll('.set-series-group, .linked-set-group').length : 0;
  const nSets = displayedSets || Math.max(1, ((ex.sets && ex.sets[w]) || []).length);
  const raw = await ViridisOptionPicker({title:'Aggiungi serie Max', message:'Dopo quale serie vuoi inserirla?', hint:'Il Max verrà inserito subito dopo la serie selezionata.', grid:true, choices:Array.from({length:nSets}, (_, i) => ({label:String(i+1), value:String(i+1)}))});
  if(raw===null) return;
  const afterSet = Number.parseInt(String(raw).trim(),10);
  if(!Number.isInteger(afterSet) || afterSet<1 || afterSet>nSets){
    ViridisToast(`Inserisci un numero da 1 a ${nSets}.`);
    return;
  }
  const entries = getMaxEntries(ex,w);
  // Il primo gruppo Max contiene due tentativi; i successivi tocchi ne aggiungono uno.

  const amount = entries.some(entry=>entry.afterSet===afterSet-1) ? 1 : 2;
  for(let i=0;i<amount;i++) entries.push({afterSet:afterSet-1,peso:'',rip:''});
  carryMaxLayoutForward(ex,w);
  if(typeof partnerExi==='number'){
    const partner = state.days[activeDayIdx].esercizi[partnerExi];
    const partnerEntries = getMaxEntries(partner,w);
    for(let i=0;i<amount;i++) partnerEntries.push({afterSet:afterSet-1,peso:'',rip:''});
    carryMaxLayoutForward(partner,w);
  }
  pendingWeekVisual = {type:'max',exi,w,si:afterSet-1};
  saveState();
  renderActive();
  ViridisToast('Serie Max aggiunta');
}
async function requestRemoveMax(exi, w, partnerExi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const entries = getMaxEntries(ex,w);
  if(!entries.length) return;
  const series = [...new Set(entries.map(entry=>entry.afterSet))].sort((a,b)=>a-b);
  let afterSet;
  if(series.length===1){
    afterSet = series[0];
    if(!await ViridisConfirmDialog(`Vuoi eliminare il Max dopo la serie ${afterSet+1}?`)) return;
  } else {
    const raw = await ViridisOptionPicker({title:'Rimuovi serie Max', message:'Quale gruppo Max vuoi rimuovere?', choices:series.map((set,index)=>({label:`Max dopo serie ${set+1}`, value:String(index+1)}))});
    if(raw===null) return;
    const choice = Number.parseInt(String(raw).trim(),10)-1;
    if(!Number.isInteger(choice) || choice<0 || choice>=series.length){
      ViridisToast('Seleziona uno dei Max indicati.');
      return;
    }
    afterSet = series[choice];
  }
  const toRemove = entries.filter(entry=>entry.afterSet===afterSet);
  const partnerEntries = typeof partnerExi==='number' ? getMaxEntries(state.days[activeDayIdx].esercizi[partnerExi],w) : [];
  const hasData = [...toRemove, ...partnerEntries.filter(entry=>entry.afterSet===afterSet)]
    .some(entry=>String(entry.peso||'').trim() || String(entry.rip||'').trim());
  if(hasData && !await ViridisConfirmDialog('Questo Max contiene kg o ripetizioni. Vuoi eliminarlo comunque?')) return;
  ex.maxEntries[w] = entries.filter(entry=>entry.afterSet!==afterSet);
  if(typeof partnerExi==='number'){
    state.days[activeDayIdx].esercizi[partnerExi].maxEntries[w] = partnerEntries.filter(entry=>entry.afterSet!==afterSet);
  }
  saveState();
  renderActive();
}
function updateMaxEntry(exi, w, index, field, val, isDraft=false){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const entry = getMaxEntries(ex,w)[index];
  if(!entry) return;
  entry[field] = val;
  if(field==='rip'&&String(val??'').trim())recordExerciseDate(ex,w);
  refreshSeriesFinishUI(exi,w);
  const finishPartner=findLinkedPartner(exi);
  if(finishPartner)refreshSeriesFinishUI(finishPartner.exi,w);
  if(!isDraft) carryMaxLayoutForward(ex,w);
  if(field==='rip' && String(val||'').trim()!=='') markWorkoutStartedByRep();
  saveState();
}
function toggleMax(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.maxShown) ex.maxShown=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const showing = !ex.maxShown[w];
  ex.maxShown[w] = showing;
  for(let k=w+1;k<ex.maxShown.length;k++){
    if(showing || !maxHasData(ex,k)) ex.maxShown[k] = showing;
  }
  saveState();
  renderActive();
}
function nextCardIndex(exi){
  const day=state.days[activeDayIdx];
  const blocks=computeExerciseBlocks(day);
  const index=blocks.findIndex(block=>block.includes(exi));
  return blocks[index+1]?.[0] ?? day.esercizi.length;
}
function exerciseFullyClosed(ex){
  if(!ex.weekDone) return false;
  return ex.weekDone.every((d,i) => d || (ex.weekSkipped && ex.weekSkipped[i]));
}
function toggleWeekDone(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekDone) ex.weekDone=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowDone = !ex.weekDone[w];
  ex.weekDone[w] = nowDone;
  if(nowDone && ex.weekSkipped) ex.weekSkipped[w] = false;
  if(nowDone) pendingWeekVisual = {type:'done',exi,w};

  saveState();
  renderActive();
  if(nowDone){
    vibrate(15);
    pulseWeekDoneBtn(exi, w);
    checkAchievements();
    if(exerciseFullyClosed(ex)) celebrateExerciseDone(ex.nome);
    promptFinishWorkoutWhenReady(activeDayIdx, w);
  }
  const next = nextCardIndex(exi);
  if(nowDone && w === state.currentWeek && state.days[activeDayIdx].esercizi[next]){
    setTimeout(()=>goToExerciseSlide(next), 250);
  }
}
function pulseWeekDoneBtn(exi, w){
  if(typeof gsap === "undefined" || prefersReducedMotion()) return;
  const btn = document.querySelector(`.week-done-btn[data-exi="${exi}"][data-w="${w}"]`);
  if(!btn) return;
  gsap.fromTo(btn, {scale:1.5}, {scale:1, duration:.35, ease:"back.out(3)"});
}
function pulseWeekSkipBtn(exi, w){
  if(typeof gsap === "undefined" || prefersReducedMotion()) return;
  const btn = document.querySelector(`.week-skip-btn[data-exi="${exi}"][data-w="${w}"]`);
  if(!btn) return;
  gsap.fromTo(btn, {scale:1.5}, {scale:1, duration:.35, ease:"back.out(3)"});
}
function celebrateExerciseDone(name){
  let el = document.getElementById('exDoneToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'exDoneToast';
    el.className = 'ex-done-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `${ICON_CHECK} ${escapeHtml(name||'Esercizio')} completato`;
  el.classList.add('show');
  clearTimeout(window._exDoneToastTimer);
  window._exDoneToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 1100);
}
function toggleWeekSkipped(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekSkipped) ex.weekSkipped=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowSkipped = !ex.weekSkipped[w];
  ex.weekSkipped[w] = nowSkipped;
  if(nowSkipped && ex.weekDone) ex.weekDone[w] = false;
  if(nowSkipped) pendingWeekVisual = {type:'skipped',exi,w};

  saveState();
  renderActive();
  if(nowSkipped){
    vibrate(15);
    pulseWeekSkipBtn(exi, w);
    checkAchievements();
    if(exerciseFullyClosed(ex)) celebrateExerciseDone(ex.nome);
    promptFinishWorkoutWhenReady(activeDayIdx, w);
  }
  const next = nextCardIndex(exi);
  if(nowSkipped && w === state.currentWeek && state.days[activeDayIdx].esercizi[next]){
    setTimeout(()=>goToExerciseSlide(next), 250);
  }
}
function updateMax(exi, w, idx, field, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.maxExtra) ex.maxExtra=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.maxExtra[w]) ex.maxExtra[w]=[];
  if(!ex.maxExtra[w][idx]) ex.maxExtra[w][idx]={};
  ex.maxExtra[w][idx][field]=val;
  if(field==='rip' && String(val||'').trim()!=='') markWorkoutStartedByRep();
  saveState();
}
function addSet(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const nWeeks = exerciseWeekCount(ex);
  if(!ex.sets) ex.sets=emptySetsArr(nWeeks);
  while(ex.sets.length<nWeeks) ex.sets.push([]);
  // Propaga lo schema dalla settimana modificata in avanti, senza cambiare il passato.

  for(let k=w;k<nWeeks;k++){
    if(!ex.sets[k]) ex.sets[k]=[];
    ex.sets[k].push({peso:'',rip:''});
  }
  renderActive();
  saveState();
}
async function removeSet(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets || !ex.sets[w] || ex.sets[w].length<=1) return;
  const lastIndex=ex.sets[w].length-1;
  const currentHasData = setHasRecordedData(ex.sets[w][lastIndex]) ||
    getMaxEntries(ex,w).some(entry=>entry.afterSet>=lastIndex&&setHasRecordedData(entry));
  if(currentHasData && !await ViridisConfirmDialog('L’ultima serie o i suoi Max contengono peso o ripetizioni. Vuoi eliminarli comunque?')) return;
  const nWeeks = exerciseWeekCount(ex);
  let preservedWeeks = 0;
  for(let k=w;k<nWeeks;k++){
    const weekSets = ex.sets[k] || [];
    if(weekSets.length<=1) continue;
    if(k!==w && weekHasRecordedExerciseData(ex,k)){
      preservedWeeks++;
      continue;
    }
    const removedSetIndex = weekSets.length-1;
    weekSets.pop();
    removeMaxAttachedToSet(ex,k,removedSetIndex);
  }
  renderActive();
  saveState();
  if(preservedWeeks){
    const message = preservedWeeks===1
      ? 'Serie rimossa: 1 settimana gia compilata e stata mantenuta.'
      : `Serie rimossa: ${preservedWeeks} settimane gia compilate sono state mantenute.`;
    ViridisToast(message);
  }
}
async function addExercise(dayIdx){
  const n = state.weeksPerBlock || await ensureWeeksPerBlock();
  state.days[dayIdx].esercizi.push({nome:'',commento:'',recupero:emptyStrArr(n),schema:emptyStrArr(n),sets:emptySetsArr(n)});
  renderActive();
  saveState();
}
let lastDeletedExercise = null;
let undoDeleteTimer = null;
async function deleteExercise(exi){
  if(!await ViridisConfirmDialog('Eliminare questo esercizio?')) return;
  const ex = state.days[activeDayIdx].esercizi[exi];
  const dayIdx = activeDayIdx;
  if(ex.linkGroupId){
    const partner = findLinkedPartner(exi);
    if(partner){ partner.ex.linkGroupId = null; partner.ex.linkType = null; }
    ex.linkGroupId = null; ex.linkType = null;
  }
  state.days[dayIdx].esercizi.splice(exi,1);
  renderActive();
  saveState();

  lastDeletedExercise = {dayIdx, exi, ex};
  const toast = document.getElementById('undoToast');
  toast.classList.add('show');
  clearTimeout(undoDeleteTimer);
  undoDeleteTimer = setTimeout(()=>{
    toast.classList.remove('show');
    lastDeletedExercise = null;
  }, 6000);
}
function undoDeleteExercise(){
  if(!lastDeletedExercise) return;
  const {dayIdx, exi, ex} = lastDeletedExercise;
  if(state.days[dayIdx]){
    const idx = Math.min(exi, state.days[dayIdx].esercizi.length);
    state.days[dayIdx].esercizi.splice(idx, 0, ex);
    if(dayIdx === activeDayIdx) renderActive();
    saveState();
  }
  lastDeletedExercise = null;
  clearTimeout(undoDeleteTimer);
  document.getElementById('undoToast').classList.remove('show');
}

let linkPickerExi = null;
let linkPickerPartnerExi = null;
function findLinkedPartner(exi){
  const list = state.days[activeDayIdx].esercizi;
  const ex = list[exi];
  if(!ex || !ex.linkGroupId) return null;
  const index=list.findIndex((other,i)=>i!==exi&&other.linkGroupId===ex.linkGroupId);
  if(index>=0)return {ex:list[index],exi:index};
  return null;
}
function exerciseLinkLabel(ex){return ex.linkType==='jumpset'?'Jump set':ex.linkType==='dropset'?'Drop set':'Superset';}
function openLinkPicker(exi){
  linkPickerExi = exi;
  linkPickerPartnerExi = null;
  linkListFilterText = '';
  linkListFilterGroup = '';
  renderLinkModal();
  document.getElementById('linkModal').style.display = 'flex';
}
function closeLinkPicker(){
  document.getElementById('linkModal').style.display = 'none';
  linkPickerExi = null;
  linkPickerPartnerExi = null;
}
function pickLinkPartner(exiB){
  linkPickerPartnerExi = exiB;
  renderLinkModal();
}
function chooseLinkType(type){
  linkExercises(linkPickerExi, linkPickerPartnerExi, type);
  closeLinkPicker();
}
function linkExercises(exiA, exiB, type){
  const list = state.days[activeDayIdx].esercizi;
  const objA = list[exiA];
  const objB = list[exiB];
  const id = 'link_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  objA.linkGroupId = id; objA.linkType = type;
  objB.linkGroupId = id; objB.linkType = type;
  const idxB = list.indexOf(objB);
  list.splice(idxB, 1);
  const idxA = list.indexOf(objA);
  list.splice(idxA+1, 0, objB);
  saveState();
  renderActive();
  bumpAchievCounter('linkCount');
  checkAchievements();
}
function unlinkExercise(exi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex) return;
  const partner = findLinkedPartner(exi);
  ex.linkGroupId = null; ex.linkType = null;
  if(partner){ partner.ex.linkGroupId = null; partner.ex.linkType = null; }
  closeLinkPicker();
  saveState();
  renderActive();
}
function renderLinkModal(){
  const body = document.getElementById('linkBody');
  if(!body || linkPickerExi===null) return;
  const day = state.days[activeDayIdx];
  const ex = day.esercizi[linkPickerExi];
  if(!ex) return;
  const titleEl = document.getElementById('linkTitle');
  if(titleEl) titleEl.textContent = 'Collega — ' + (ex.nome || 'Esercizio');
  const partner = findLinkedPartner(linkPickerExi);
  if(partner){
    const typeLabel = ex.linkType==='jumpset' ? 'jump set' : 'super set';
    body.innerHTML = `<div class="footer-note" style="padding:0 0 12px;">Collegato con "${escapeHtml(partner.ex.nome||'Esercizio')}" (${typeLabel}).</div>
      <button class="add-ex" style="border-color:var(--red);color:var(--red);" onclick="unlinkExercise(${linkPickerExi})">Slega</button>`;
    return;
  }
  if(linkPickerPartnerExi !== null){
    body.innerHTML = `<div class="footer-note" style="padding:0 0 10px;">Che tipo di collegamento?</div>
      <div class="cal-editor-list">
        <button class="cal-day-toggle" onclick="chooseLinkType('superset')">Super set</button>
        <button class="cal-day-toggle" onclick="chooseLinkType('jumpset')">Jump set</button>
      </div>`;
    return;
  }
  const names = filteredExerciseNames(linkListFilterText, linkListFilterGroup);
  const trimmed = linkListFilterText.trim();
  const exactMatch = trimmed && getList('esercizi').some(n=>String(n).toLowerCase()===trimmed.toLowerCase());
  const addRow = (trimmed && !exactMatch)
    ? `<button class="cal-day-toggle" style="border-color:var(--green);color:var(--green);margin-bottom:8px;" onclick="onLinkPartnerNameChosen('${escapeAttr(escapeJs(trimmed))}')">＋ Aggiungi e collega "${escapeHtml(trimmed)}"</button>`
    : '';
  body.innerHTML = `<div class="footer-note" style="padding:0 0 10px;">Con quale esercizio vuoi collegare "${escapeHtml(ex.nome||'questo esercizio')}"?</div>
    <div class="meta-row"><span class="meta-label">Cerca</span><input class="meta-input" id="linkSearchInput" placeholder="Cerca o scrivi un nuovo esercizio..." value="${escapeAttr(linkListFilterText)}" oninput="onLinkListSearchInput(this.value)"></div>
    ${renderGroupFilterChipsHtml(linkListFilterGroup, 'onLinkListGroupFilter')}
    ${addRow}
    ${renderExerciseRowsHtml(names, {onRowClick:'onLinkPartnerNameChosen'})}`;
}
let linkListFilterText = '';
let linkListFilterGroup = '';
function onLinkListSearchInput(val){
  linkListFilterText = val;
  renderLinkModal();
  const inp = document.getElementById('linkSearchInput');
  if(inp){ inp.focus(); const p = inp.value.length; inp.setSelectionRange(p,p); }
}
function onLinkListGroupFilter(group){
  linkListFilterGroup = group;
  renderLinkModal();
}
async function onLinkPartnerNameChosen(val){
  val = String(val||'').trim();
  if(!val) return;
  const day = state.days[activeDayIdx];
  const key = val.toLowerCase();
  const matchIdx = day.esercizi.findIndex((e,i)=> i!==linkPickerExi && String(e.nome||'').trim().toLowerCase()===key);
  if(matchIdx !== -1){
    if(day.esercizi[matchIdx].linkGroupId){
      ViridisToast('"'+val+'" è già collegato a un altro esercizio in questo giorno. Slegalo prima di provare a collegarlo di nuovo.');
      return;
    }
    pickLinkPartner(matchIdx);
    return;
  }
  const n = state.weeksPerBlock || await ensureWeeksPerBlock();
  day.esercizi.push({nome:val, commento:'', recupero:emptyStrArr(n), schema:emptyStrArr(n), sets:emptySetsArr(n)});
  pickLinkPartner(day.esercizi.length-1);
}
function linkedSubRowInputsHtml(ex, exi, w, si){
  const sets = ex.sets && ex.sets[w] ? ex.sets[w] : [];
  const s = sets[si] || {peso:'',rip:''};
  const record = getRecordForExercise(ex.nome);
  const recordAttr = record ? record.peso : 'null';
  const suggestedKg = (!s.peso && s.peso!==0) ? suggestNextWeight(ex, w, si) : null;
  const prescription = getSetPrescription(ex.schema && ex.schema[w],si);
  return `<span class="linked-tag" title="${escapeAttr(ex.nome||'')}">${escapeHtml(ex.nome||'—')}${prescription.target ? `<strong class="linked-prescription">${escapeHtml(prescription.target)}</strong>` : ''}${prescription.extras ? `<small class="linked-prescription">${escapeHtml(prescription.extras)}</small>` : ''}</span>
    <div class="kg-cell">
    <span class="linked-field-label">PESO (kg)</span>
    <div class="kg-wrap">
        <button class="stepper" onclick="stepSet(${exi},${w},${si},-2.5,this)">−</button>
      <input type="text" class="set-input" aria-label="Peso ${escapeAttr(ex.nome)} serie ${si+1}" placeholder="kg" value="${escapeAttr(s.peso ?? '')}" oninput="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr},true)" onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr})">
        <button class="stepper" onclick="stepSet(${exi},${w},${si},2.5,this)">+</button>
    </div>
    ${suggestedKg!==null ? `<button type="button" class="kg-fill-chip" title="Usa l'ultimo peso: ${suggestedKg} kg" onclick="fillSuggestedWeight(${exi},${w},${si},'${suggestedKg}',this,${recordAttr})">↺ ultimo: ${suggestedKg} kg</button>` : ''}
    </div>
    <div class="rip-cell">
    <span class="linked-field-label">RIPETIZIONI</span>
    <div class="rip-wrap">
    <input type="text" class="set-input" aria-label="Ripetizioni ${escapeAttr(ex.nome)} serie ${si+1}" placeholder="rip" value="${escapeAttr(s.rip ?? '')}" oninput="updateSet(${exi},${w},${si},'rip',this.value,undefined,true)" onchange="updateSet(${exi},${w},${si},'rip',this.value);updateRepCompareAvailability(this)">
    <button type="button" class="rpe-chip ${s.rpe?'filled':''}" onclick="editRpe(${exi},${w},${si},this)" title="RPE di questa serie">${s.rpe ? escapeHtml(String(s.rpe)) : 'RPE'}</button>
    </div>
    ${renderPreviousSetButton(ex,exi,w,si)}
    <span class="rep-comparison" aria-live="polite" hidden></span>
    </div>`;
}
function linkedMaxEntriesHtml(exA, exiA, exB, exiB, w, si){
  const aItems = maxEntriesAfter(exA,w,si);
  const bItems = maxEntriesAfter(exB,w,si);
  const count = Math.max(aItems.length,bItems.length);
  let html = '';
  for(let i=0;i<count;i++){
    const a = aItems[i], b = bItems[i];
    html += `<div class="linked-set-group max-entry-group"><div class="linked-set-wrap">
      <div class="set-label max-label">MAX</div><div class="linked-sub-rows">
      <div class="linked-sub-row"><span class="linked-tag">${escapeHtml(exA.nome||'—')}</span><input type="text" class="set-input max-input" placeholder="kg" value="${escapeAttr(a ? a.entry.peso??'' : '')}" ${a?'':'disabled'} oninput="updateMaxEntry(${exiA},${w},${a ? a.index : 0},'peso',this.value,true)" onchange="updateMaxEntry(${exiA},${w},${a ? a.index : 0},'peso',this.value)"><input type="text" class="set-input max-input" placeholder="rip" value="${escapeAttr(a ? a.entry.rip??'' : '')}" ${a?'':'disabled'} oninput="updateMaxEntry(${exiA},${w},${a ? a.index : 0},'rip',this.value,true)" onchange="updateMaxEntry(${exiA},${w},${a ? a.index : 0},'rip',this.value)"></div>
      <div class="linked-sub-row"><span class="linked-tag">${escapeHtml(exB.nome||'—')}</span><input type="text" class="set-input max-input" placeholder="kg" value="${escapeAttr(b ? b.entry.peso??'' : '')}" ${b?'':'disabled'} oninput="updateMaxEntry(${exiB},${w},${b ? b.index : 0},'peso',this.value,true)" onchange="updateMaxEntry(${exiB},${w},${b ? b.index : 0},'peso',this.value)"><input type="text" class="set-input max-input" placeholder="rip" value="${escapeAttr(b ? b.entry.rip??'' : '')}" ${b?'':'disabled'} oninput="updateMaxEntry(${exiB},${w},${b ? b.index : 0},'rip',this.value,true)" onchange="updateMaxEntry(${exiB},${w},${b ? b.index : 0},'rip',this.value)"></div>
      </div></div></div>`;
  }
  return html;
}
function linkedExerciseCard(exA, exiA, exB, exiB, accent, dayManagementHtml=''){
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  const nWeeks = (exA.recupero && exA.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);
  const weekEntries = weeks.map(w=>{
    const wkey = activeDayIdx+"_"+exiA+"_"+w;
    const isCurrentWeek = w === state.currentWeek;

const isPastWeek = w < state.currentWeek;

const isFutureWeek = w > state.currentWeek;


    const weekDone = !!(exA.weekDone && exA.weekDone[w]);
    const weekSkipped = !!(exA.weekSkipped && exA.weekSkipped[w]);
    const isCollapsed =
      (wkey in collapsedMap)
      ? !!collapsedMap[wkey]
      : (!isCurrentWeek || weekDone || weekSkipped);
    const isCompletedGroup = !isCurrentWeek && (isPastWeek || weekDone || weekSkipped);
    const isFutureGroup = !isCurrentWeek && !isCompletedGroup;
    const nRows = Math.max(
      exA.sets && exA.sets[w] ? exA.sets[w].length : 0,
      exB.sets && exB.sets[w] ? exB.sets[w].length : 0,
      0
    ) || 4;
    let setsHtml = '';
    for(let si=0; si<nRows; si++){
      const roman = ["I","II","III","IV","V","VI","VII","VIII"][si] || (si+1);
      setsHtml += `<div class="linked-set-group">
        <div class="linked-set-wrap">
          <div class="set-label">${roman}</div>
          <div class="linked-sub-rows">
            <div class="linked-sub-row">${linkedSubRowInputsHtml(exA, exiA, w, si)}</div>
            <span class="exercise-link-label">${exerciseLinkLabel(exA)}</span>
            <div class="linked-sub-row">${linkedSubRowInputsHtml(exB, exiB, w, si)}</div>
          </div>
        </div>
      ${linkedMaxEntriesHtml(exA,exiA,exB,exiB,w,si)}${renderSeriesFinish(exiA,w,si,exiB)}</div>`;
    }
    return {group:isCurrentWeek?'current':isCompletedGroup?'completed':'future', html:`

<div class="week-block ${isCurrentWeek?'current-week-block':''} ${isCompletedGroup?'completed-week-block':''} ${isFutureGroup?'future-week-block':''}" data-exi="${exiA}" data-week="${w}">

  <button class="week-toggle
  ${isCollapsed?'collapsed':''}
  ${weekDone?'done':''}
  ${weekSkipped?'skipped':''}
  ${isCurrentWeek?'current-week':''}
  ${isCompletedGroup?'completed-week':''}
  ${isFutureGroup?'future-week':''}"
  style="background:${accent.d}"
  ${isFutureGroup ? `ondblclick="toggleWeek(this,'${wkey}',${w})"` : `onclick="toggleWeek(this,'${wkey}',${w})"`}>

    <span>

    ${
      isCompletedGroup
      ? ICON_CHECK+' '
      : isCurrentWeek
        ? ICON_FLAME+' '
        : ICON_LOCK+' '
    }

    SETTIMANA ${w+1}${weekSkipped?' — saltata':''}${weekDone && exA.schema[w] ? ` <span class="week-toggle-schema">(${escapeHtml(exA.schema[w])})</span>` : ''}

    </span>

    <span class="chev">▾</span>

  </button>


  <div class="week-body ${isCollapsed?'collapsed':''}" data-exi="${exiA}" data-week="${w}">
    ${renderWeekQuickSummary(exiA,w,exA,exiB)}
    <div class="week-note-wrap">
    <input class="week-note"
    placeholder="nota settimana (facoltativo)"
    value="${escapeAttr((exA.weekNote && exA.weekNote[w]) ?? '')}"
    onchange="updateWeekNote(${exiA},${w},this.value);updateWeekNote(${exiB},${w},this.value)">

    </div>
    <div class="week-config">

    <div class="meta-row-schema">
      <span class="meta-label small">Serie</span>
      <div class="meta-field-center">
        <div class="combo-wrap">
          <textarea class="meta-input schema" rows="1"
          oninput="onComboInput(this,'schemi');autoGrowTextarea(this);autoWidthSchema(this)"
          onfocus="onComboFocus(this,'schemi')"
          onchange="updateMeta(${exiA},'schema',${w},this.value);updateMeta(${exiB},'schema',${w},this.value)">${escapeHtml(exA.schema[w]??'')}</textarea>
        </div>
      </div>
    </div>

    <div class="meta-row meta-row-combined">

      <div class="meta-group">
        <span class="meta-label small">Rec.</span>
        <div class="meta-field-center">
          <div class="combo-wrap">
            <input class="meta-input"
            placeholder="—"
            value="${escapeAttr(exA.recupero[w]??'')}"
            oninput="onComboInput(this,'recuperi')"
            onfocus="onComboFocus(this,'recuperi')"
            onchange="updateMeta(${exiA},'recupero',${w},this.value);updateMeta(${exiB},'recupero',${w},this.value)">
          </div>
        </div>
      </div>

    </div>

    </div>
    <div class="sets-wrap">

      ${setsHtml}

    </div>

    <div class="set-btns-secondary">
      <button class="week-actions-btn" onclick="openExerciseContextMenu(${exiA}, '${escapeJs(exA.nome||'')}', ${w}, ${exiB})" aria-label="Azioni esercizio">${ICON_MORE}<span>Opzioni serie</span></button>
    </div>

    <div class="set-btns">

      <div class="week-done-wrap">

        <div class="week-status-col">
          <button class="week-skip-btn ${weekSkipped?'checked':''}"
          data-exi="${exiA}" data-w="${w}"
          aria-pressed="${weekSkipped?'true':'false'}"
          onclick="toggleWeekSkipped(${exiA},${w});toggleWeekSkipped(${exiB},${w})">
          ⏭
          <span>Salta esercizio</span>
          </button>
        </div>

        <div class="week-status-col">
          <button class="week-done-btn ${weekDone?'checked':''}"
          data-exi="${exiA}" data-w="${w}"
          aria-pressed="${weekDone?'true':'false'}"
          onclick="toggleWeekDone(${exiA},${w});toggleWeekDone(${exiB},${w})">
          ${ICON_CHECK}
          <span>Completa esercizio</span>
          </button>
        </div>

      </div>

    </div>

  </div>

</div>

`};
  });
  const weeksHtml = renderWeekSections(weekEntries, completedWeeksGroupKey(exiA), dayManagementHtml);

  const recordA = getRecordForExercise(exA.nome);
  const recordB = getRecordForExercise(exB.nome);
  const prBadgeA = '';
  const prBadgeB = '';

  return `<div class="card linked-group" data-exi="${exiA}" data-exi2="${exiB}" style="--accent:${accent.c}">
    <div class="card-head">${renderLinkedExerciseCardHero(exA,exiA,exB,exiB,accent)}</div>
    <div class="linked-pair-frame">
      <div class="card-head linked-head compact">
        ${prBadgeA}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiA},this.value)">${escapeHtml(exA.commento??'')}</textarea>
      </div>
      <button class="link-type-divider" onclick="openLinkPicker(${exiA})" title="Gestisci collegamento"><span class="link-type-pill" style="background:${accent.d}">${ICON_LIGHTNING} ${typeLabel} <span class="link-type-manage">${ICON_LINK} gestisci</span></span></button>
      <div class="card-head linked-head compact">
        ${prBadgeB}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiB},this.value)">${escapeHtml(exB.commento??'')}</textarea>
      </div>
    </div>
    <div class="weeks">${weeksHtml}</div>
  </div>`;
}
