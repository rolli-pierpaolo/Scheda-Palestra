
function epley1RM(peso, rip){
  return peso * (1 + rip/30);
}

function computeWeekTotalVolume(w){
  let vol = 0;
  (state.days||[]).forEach(day=>{
    (day.esercizi||[]).forEach(ex=>{
      ((ex.sets && ex.sets[w]) || []).forEach(s=>{
        const p = parseFloat(String(s.peso).replace(',','.'));
        const r = parseFloat(String(s.rip).replace(',','.'));
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
    ((ex.sets && ex.sets[w]) || []).forEach(s=>{
      const p = parseFloat(String(s.peso).replace(',','.'));
      const r = parseFloat(String(s.rip).replace(',','.'));
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
  return [...names].sort((a,b)=>a.localeCompare(b, 'it'));
}

function computeExerciseTrend(exerciseName){
  const key = String(exerciseName||'').trim().toLowerCase();
  const volumePoints = [];
  const oneRMPoints = [];
  getChronologicalBlocks().forEach(block=>{
    if(block.current){
      const nWeeks = state.weeksPerBlock || 4;
      for(let w=0; w<nWeeks; w++){
        let vol = 0, best1rm = 0;
        (block.days||[]).forEach(day=>{
          (day.esercizi||[]).forEach(ex=>{
            if(!ex || String(ex.nome||'').trim().toLowerCase() !== key) return;
            ((ex.sets && ex.sets[w]) || []).forEach(s=>{
              const p = parseFloat(String(s.peso).replace(',','.'));
              const r = parseFloat(String(s.rip).replace(',','.'));
              if(isNaN(p) || p<=0 || isNaN(r) || r<=0) return;
              vol += p*r;
              const e = epley1RM(p,r);
              if(e>best1rm) best1rm = e;
            });
          });
        });
        if(vol>0) volumePoints.push({label:'Sett. '+(w+1), value:Math.round(vol)});
        if(best1rm>0) oneRMPoints.push({label:'Sett. '+(w+1), value:Math.round(best1rm)});
      }
    } else {
      let vol = 0, best1rm = 0;
      (block.days||[]).forEach(day=>{
        (day.esercizi||[]).forEach(ex=>{
          if(!ex || String(ex.nome||'').trim().toLowerCase() !== key) return;
          (ex.sets||[]).forEach(weekSets=>{
            (weekSets||[]).forEach(s=>{
              const p = parseFloat(String(s.peso).replace(',','.'));
              const r = parseFloat(String(s.rip).replace(',','.'));
              if(isNaN(p) || p<=0 || isNaN(r) || r<=0) return;
              vol += p*r;
              const e = epley1RM(p,r);
              if(e>best1rm) best1rm = e;
            });
          });
        });
      });
      if(vol>0) volumePoints.push({label:block.name, value:Math.round(vol)});
      if(best1rm>0) oneRMPoints.push({label:block.name, value:Math.round(best1rm)});
    }
  });
  return { volumePoints, oneRMPoints };
}

function computeExerciseRepsAtSameWeight(exerciseName){
  const key = String(exerciseName||'').trim().toLowerCase();
  const blocks = getChronologicalBlocks();

  const weightCounts = {};
  blocks.forEach(block=>{
    (block.days||[]).forEach(day=>{
      (day.esercizi||[]).forEach(ex=>{
        if(!ex || String(ex.nome||'').trim().toLowerCase()!==key) return;
        (ex.sets||[]).forEach(weekSets=>{
          (weekSets||[]).forEach(s=>{
            const p = parseFloat(String(s.peso).replace(',','.'));
            if(!isNaN(p) && p>0){
              const k = p.toFixed(1);
              weightCounts[k] = (weightCounts[k]||0)+1;
            }
          });
        });
      });
    });
  });
  const weightKeys = Object.keys(weightCounts);
  if(!weightKeys.length) return { referenceWeight: null, points: [] };
  let referenceWeight = parseFloat(weightKeys[0]);
  let bestCount = weightCounts[weightKeys[0]];
  weightKeys.forEach(k=>{
    if(weightCounts[k] > bestCount){ bestCount = weightCounts[k]; referenceWeight = parseFloat(k); }
  });

  const points = [];
  blocks.forEach(block=>{
    if(block.current){
      const nWeeks = state.weeksPerBlock || 4;
      for(let w=0; w<nWeeks; w++){
        let bestRip = 0;
        (block.days||[]).forEach(day=>{
          (day.esercizi||[]).forEach(ex=>{
            if(!ex || String(ex.nome||'').trim().toLowerCase()!==key) return;
            ((ex.sets && ex.sets[w]) || []).forEach(s=>{
              const p = parseFloat(String(s.peso).replace(',','.'));
              const r = parseFloat(String(s.rip).replace(',','.'));
              if(isNaN(p) || isNaN(r) || r<=0) return;
              if(Math.abs(p-referenceWeight) < 0.05 && r>bestRip) bestRip = r;
            });
          });
        });
        if(bestRip>0) points.push({label:'Sett. '+(w+1), value:bestRip});
      }
    } else {
      let bestRip = 0;
      (block.days||[]).forEach(day=>{
        (day.esercizi||[]).forEach(ex=>{
          if(!ex || String(ex.nome||'').trim().toLowerCase()!==key) return;
          (ex.sets||[]).forEach(weekSets=>{
            (weekSets||[]).forEach(s=>{
              const p = parseFloat(String(s.peso).replace(',','.'));
              const r = parseFloat(String(s.rip).replace(',','.'));
              if(isNaN(p) || isNaN(r) || r<=0) return;
              if(Math.abs(p-referenceWeight) < 0.05 && r>bestRip) bestRip = r;
            });
          });
        });
      });
      if(bestRip>0) points.push({label:block.name, value:bestRip});
    }
  });
  return { referenceWeight, points };
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
    <div class="trends-section-label">Volume totale sollevato (peso × ripetizioni)</div>
    ${volHtml}
    <div class="trends-section-label" style="margin-top:16px;">Stima 1RM (formula di Epley)</div>
    ${rmHtml}
    <div class="trends-section-label" style="margin-top:16px;">Ripetizioni a parità di peso${referenceWeight!==null ? ` (a ${referenceWeight} kg, il tuo carico più usato)` : ''}</div>
    ${sameWeightHtml}
  `;
}
