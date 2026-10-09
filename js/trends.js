
function epley1RM(peso, rip){
  return peso * (1 + rip/30);
}

function computeWeekTotalVolume(w){
  let vol = 0;
  (state.days||[]).forEach(day=>{
    (day.esercizi||[]).forEach(ex=>{
      recordedExerciseSets(ex,w).forEach(s=>{
        const p = recordedNumber(s.peso);
        const r = recordedNumber(s.rip);
        if(!isNaN(p) && p>0 && !isNaN(r) && r>0) vol += p*r;
      });
    });
  });
  return vol;
}

function computeDaySessionStats(day){
  const w = state.currentWeek || 0;
  let volume = 0, setsCount = 0;
  (day.esercizi||[]).forEach(ex=>{
    recordedExerciseSets(ex,w).forEach(s=>{
      const p = recordedNumber(s.peso);
      const r = recordedNumber(s.rip);
      if(!isNaN(p) && p>0 && !isNaN(r) && r>0){ volume += p*r; setsCount++; }
    });
  });
  const elapsedMs = workoutStartedAt ? Math.max(0, Date.now() - workoutStartedAt) : 0;
  return { volume: Math.round(volume), setsCount, durationMins: Math.max(1, Math.round(elapsedMs / 60000)) };
}
function computeHomeVolumeTrend(){
  const w = state.currentWeek || 0;
  if(w < 2) return null;
  const lastVol = computeWeekTotalVolume(w-1);
  const prevVol = computeWeekTotalVolume(w-2);
  if(lastVol <= 0 || prevVol <= 0) return null;
  return { pct: Math.round(((lastVol - prevVol) / prevVol) * 100) };
}

function getChronologicalBlocks(){
  const storico = getStorico();
  const blocks = Object.keys(storico).map(name => ({
    name,
    days: storico[name],
    date: storicoDates[name] || ''
  }));
  blocks.sort((a,b) => a.date.localeCompare(b.date));
  blocks.push({ name: state.title || 'Attuale', days: state.days, date: '9999-99-99', current: true });
  return blocks;
}

function getAllExerciseNamesEverUsed(){
  const names = new Set();
  getChronologicalBlocks().forEach(b=>{
    (b.days||[]).forEach(day=>{
      (day.esercizi||[]).forEach(ex=>{
        if(ex && ex.nome && ex.nome.trim()) names.add(ex.nome.trim());
      });
    });
  });
  (state.sessionHistory||[]).forEach(session=>session.exercises.forEach(ex=>{
    if(ex.nome?.trim())names.add(ex.nome.trim());
  }));
  return [...names].sort((a,b)=>a.localeCompare(b, 'it'));
}

function recordedExerciseSets(ex,w){
  return [...(ex.sets?.[w]||[]),...(ex.maxEntries?.[w]||ex.maxExtra?.[w]||[])];
}
function recordedNumber(value){
  const text=String(value??'').trim().replace(',','.');
  return /^\d+(?:\.\d+)?$/.test(text)?Number(text):NaN;
}
function exerciseWeeklyPoints(name){
  const key=String(name||'').trim().toLowerCase();
  const points=[];
  getChronologicalBlocks().forEach(block=>{
    const exercises=(block.days||[]).flatMap(d=>d.esercizi||[]).filter(ex=>String(ex.nome||'').trim().toLowerCase()===key);
    const count=Math.max(0,...exercises.map(ex=>Math.max(ex.sets?.length||0,ex.maxEntries?.length||0)));
    for(let w=0;w<count;w++){
      if(block.current&&w>(state.currentWeek||0))continue;
      const rows=exercises.flatMap(ex=>recordedExerciseSets(ex,w)).map(s=>({peso:recordedNumber(s.peso),rip:recordedNumber(s.rip)})).filter(s=>s.peso>0&&s.rip>0);
      if(rows.length)points.push({label:block.current?'Sett. '+(w+1):block.name+' · S'+(w+1),rows});
    }
  });
  return points;
}
function computeExerciseTrend(exerciseName){
  const points=exerciseWeeklyPoints(exerciseName);
  return {
    volumePoints:points.map(p=>({label:p.label,value:Math.round(p.rows.reduce((sum,s)=>sum+s.peso*s.rip,0))})),
    oneRMPoints:points.map(p=>({label:p.label,value:Math.round(Math.max(...p.rows.map(s=>epley1RM(s.peso,s.rip))))}))
  };
}
function computeExerciseRepsAtSameWeight(exerciseName){
  const weeks=exerciseWeeklyPoints(exerciseName),counts=new Map();
  weeks.flatMap(p=>p.rows).forEach(s=>counts.set(s.peso,(counts.get(s.peso)||0)+1));
  const referenceWeight=[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a))[0]??null;
  const points=weeks.map(p=>({label:p.label,value:Math.max(0,...p.rows.filter(s=>s.peso===referenceWeight).map(s=>s.rip))})).filter(p=>p.value>0);
  return {referenceWeight,points};
}

let trendsSelectedExercise = null;

function openTrends(){
  const names = getAllExerciseNamesEverUsed();
  if(!trendsSelectedExercise || !names.includes(trendsSelectedExercise)){
    trendsSelectedExercise = names[0] || null;
  }
  renderTrendsModal(names);
  document.getElementById('trendsModal').style.display = 'flex';
}
function closeTrends(){
  document.getElementById('trendsModal').style.display = 'none';
}
function selectTrendsExercise(name){
  trendsSelectedExercise = name;
  renderTrendsModal(getAllExerciseNamesEverUsed());
}
function renderTrendsModal(names){
  const body = document.getElementById('trendsBody');
  if(!names.length){
    body.innerHTML = `<div class="trends-empty-state"><span>${ICON_CHART}</span><b>I primi dati arrivano allenandoti.</b><small>Dopo qualche serie vedrai qui volume, stima 1RM e ripetizioni a parità di peso.</small></div>`;
    return;
  }
  const options = names.map(n => `<option value="${escapeAttr(n)}" ${n===trendsSelectedExercise?'selected':''}>${escapeHtml(n)}</option>`).join('');
  const { volumePoints, oneRMPoints } = computeExerciseTrend(trendsSelectedExercise);
  const { referenceWeight, points: sameWeightPoints } = computeExerciseRepsAtSameWeight(trendsSelectedExercise);
  const record = getRecordForExercise(trendsSelectedExercise);
  const recordHtml = record
    ? `<div class="trends-record">${ICON_TROPHY} Record attuale: <b>${escapeHtml(String(record.peso))} kg</b> x ${escapeHtml(String(record.rip))}</div>`
    : '';
  const volHtml = volumePoints.length >= 2
    ? renderChartSVG(volumePoints)
    : '<div class="trends-chart-empty">Servono almeno due periodi con dati per mostrare il volume.</div>';
  const rmHtml = oneRMPoints.length >= 2
    ? renderChartSVG(oneRMPoints)
    : '<div class="trends-chart-empty">Servono almeno due periodi con dati per stimare l’1RM.</div>';
  const sameWeightHtml = sameWeightPoints.length >= 2
    ? renderChartSVG(sameWeightPoints)
    : '<div class="trends-chart-empty">Ripeti lo stesso carico in due periodi per confrontare le ripetizioni.</div>';
  body.innerHTML = `
    <select class="meta-input" style="margin-bottom:12px;" onchange="selectTrendsExercise(this.value)">${options}</select>
    ${recordHtml}
    <div class="trends-section-label">Volume settimanale · serie e Max (kg × ripetizioni)</div>
    ${volHtml}
    <div class="trends-section-label" style="margin-top:16px;">Stima 1RM (formula di Epley)</div>
    ${rmHtml}
    <div class="trends-section-label" style="margin-top:16px;">Ripetizioni a parità di peso${referenceWeight!==null ? ` (a ${referenceWeight} kg, il tuo carico più usato)` : ''}</div>
    ${sameWeightHtml}
  `;
}
