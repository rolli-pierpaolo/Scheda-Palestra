// ---------------- RECORD PERSONALI (PR) ----------------
function maxPesoInDay(day, key){
  let m = null;
  (day.esercizi||[]).forEach(ex=>{
    if(String(ex.nome||'').trim().toLowerCase() !== key) return;
    (ex.sets||[]).forEach(weekSets=>{
      (weekSets||[]).forEach(s=>{
        const p = parseFloat(String(s.peso).replace(',','.'));
        if(!isNaN(p) && p>0){
          if(m===null || p>m.peso || (p===m.peso && (parseFloat(String(s.rip).replace(',','.'))||0) > (parseFloat(String(m.rip).replace(',','.'))||0))){
            m = {peso:p, rip:s.rip};
          }
        }
      });
    });
  });
  return m;
}
function getRecordForExercise(name){
  const key = String(name||'').trim().toLowerCase();
  if(!key) return null;
  let best = null;
  (state.days||[]).forEach(day=>{
    const m = maxPesoInDay(day, key);
    if(m && (best===null || m.peso>best.peso)) best = m;
  });
  const storico = getStorico();
  Object.keys(storico).forEach(t=>{
    (storico[t]||[]).forEach(day=>{
      const m = maxPesoInDay(day, key);
      if(m && (best===null || m.peso>best.peso)) best = m;
    });
  });
  return best;
}
// festeggiamento a schermo intero (vedi showCelebration in js/utils.js) al
// posto del vecchio toast: un record merita di essere notato, non solo
// accennato in un angolo per due secondi
// PR accumulati dalla sessione in corso (svuotati da confirmFinishWorkout
// in js/animations.js quando l'allenamento finisce per davvero): servono
// al recap nel popup "Giorno terminato", non sono un log storico
let sessionPRs = [];
function celebratePR(name, weight){
  sessionPRs.push({name: name||'', weight});
  const w = (weight!==undefined && weight!==null && !isNaN(weight)) ? String(weight).replace('.',',')+' kg' : '';
  showCelebration({
    icon: ICON_PLATE,
    label: 'Nuovo record personale',
    title: name || 'Record personale',
    subtitle: w ? ('Nuovo massimale: '+w) : '',
    accent: 'green'
  });
}

