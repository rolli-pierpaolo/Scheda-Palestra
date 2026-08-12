// ---------------- ANDAMENTI (dashboard progressi su tutta la cronologia) ----------------
// A differenza del grafico per-esercizio esistente (js/chart.js, solo mese
// attivo), qui si guarda TUTTA la cronologia: ogni mese archiviato nello
// Storico conta come UN punto (aggregato su tutte le sue settimane - schema
// serie/rip cambia da un mese all'altro, entrare nel dettaglio settimana per
// settimana tra mesi diversi non avrebbe senso), il mese ATTIVO invece resta
// un punto per settimana come nel grafico esistente, visto che li' lo schema
// e' lo stesso lungo tutto il blocco

// formula di Epley: stima del massimale (1RM) da peso e ripetizioni fatte,
// piu' onesta del solo peso sollevato quando le ripetizioni cambiano da una
// settimana all'altra
function epley1RM(peso, rip){
  return peso * (1 + rip/30);
}

// volume totale (tutti gli esercizi di tutti i giorni) di UNA settimana del
// blocco attivo - usata per l'assaggio di andamento in Home (vedi
// computeHomeVolumeTrend piu' sotto)
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

// volume + numero di serie con dati veri di UN giorno, nella settimana
// corrente - usato dal recap del popup "Giorno terminato" (vedi
// openFinishWorkoutModal in js/animations.js), stesso conteggio di
// computeWeekTotalVolume ma per un solo giorno invece di tutti insieme
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
  return { volume: Math.round(volume), setsCount };
}
// piccolo assaggio di "Andamenti" mostrato in Home: confronta l'ultima
// settimana GIA' CONCLUSA con quella subito precedente (entrambe finite per
// davvero) - apposta non "questo mese contro il precedente", che sarebbe un
// confronto sbilanciato finche' il mese e' ancora a meta'
function computeHomeVolumeTrend(){
  const w = state.currentWeek || 0;
  if(w < 2) return null; // servono almeno 2 settimane gia' concluse prima di questa
  const lastVol = computeWeekTotalVolume(w-1);
  const prevVol = computeWeekTotalVolume(w-2);
  if(lastVol <= 0 || prevVol <= 0) return null;
  return { pct: Math.round(((lastVol - prevVol) / prevVol) * 100) };
}

// tutti i "blocchi" (mesi) in ordine cronologico: quelli archiviati (via
// getStorico, gia' in js/combobox.js) datati con storicoDates, piu' il
// blocco ATTIVO per ultimo (sempre il piu' recente per definizione)
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

// tutti i nomi esercizio unici in tutta la cronologia, per il selettore
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

// per un esercizio (case-insensitive sul nome): un punto per volume totale
// (somma peso*rip di tutte le serie) e uno per la stima 1RM migliore, per
// ogni periodo (settimana nel blocco attivo, mese intero negli archiviati)
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

// confronto "a parita' di peso": trova il peso usato piu' spesso in assoluto
// per questo esercizio (la "moda", non il piu' recente - piu' robusto, un
// singolo tentativo isolato non lo sposta) e per ogni periodo mostra la
// MIGLIOR ripetizione fatta esattamente a quel peso. Un modo diverso di
// leggere i progressi rispetto a volume/1RM: utile soprattutto sui
// macchinari a incrementi fissi, dove il peso resta spesso lo stesso per
// mesi e il vero progresso si vede nelle ripetizioni a parita' di carico
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
    body.innerHTML = '<div class="footer-note" style="padding:10px 0;">Non ci sono ancora dati a sufficienza: allena qualche esercizio prima di tornare qui.</div>';
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
    : '<div class="footer-note" style="padding:10px 0;">Non ci sono ancora abbastanza periodi con dati per il volume.</div>';
  const rmHtml = oneRMPoints.length >= 2
    ? renderChartSVG(oneRMPoints)
    : '<div class="footer-note" style="padding:10px 0;">Non ci sono ancora abbastanza periodi con dati per la stima 1RM.</div>';
  const sameWeightHtml = sameWeightPoints.length >= 2
    ? renderChartSVG(sameWeightPoints)
    : '<div class="footer-note" style="padding:10px 0;">Non ci sono ancora abbastanza periodi con dati a questo peso.</div>';
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
