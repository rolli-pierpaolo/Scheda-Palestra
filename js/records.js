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
// il disco al posto del trofeo: stesso motivo usato altrove nell'app
// (ICON_PLATE, gia' usata per l'obiettivo "Tre cifre"), coerente col resto
// invece del solito emoji generico
function celebratePR(){
  showQuickToast(ICON_PLATE + " Nuovo record personale!");
}

