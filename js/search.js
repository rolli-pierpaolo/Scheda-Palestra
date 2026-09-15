// ---------------- RICERCA GLOBALE ----------------
// Cerca i nomi degli esercizi sia nella scheda attiva sia in tutti i blocchi
// archiviati. Ogni risultato porta direttamente al punto giusto, senza dover
// ricordare in quale mese o giorno era stato inserito.
let globalSearchEntries = [];

function buildGlobalSearchEntries(){
  const entries = [];
  (state.days||[]).forEach((day, dayIdx)=>{
    (day.esercizi||[]).forEach((ex, exi)=>{
      if(!String(ex.nome||'').trim()) return;
      entries.push({kind:'active', name:ex.nome, day:day.name||'Giorno', dayIdx, exi});
    });
  });
  Object.entries(getStorico()).forEach(([blockName, days])=>{
    (days||[]).forEach((day, dayIdx)=>{
      (day.esercizi||[]).forEach((ex, exi)=>{
        if(!String(ex.nome||'').trim()) return;
        entries.push({kind:'history', name:ex.nome, day:day.name||'Giorno', blockName, dayIdx, exi});
      });
    });
  });
  return entries;
}

function openGlobalSearch(){
  globalSearchEntries = buildGlobalSearchEntries();
  const modal = document.getElementById('globalSearchModal');
  const input = document.getElementById('globalSearchInput');
  if(!modal || !input) return;
  input.value = '';
  renderGlobalSearchResults('');
  modal.style.display = 'flex';
  setTimeout(()=>input.focus(), 0);
}
function closeGlobalSearch(){
  document.getElementById('globalSearchModal').style.display = 'none';
}
function renderGlobalSearchResults(query){
  const el = document.getElementById('globalSearchResults');
  if(!el) return;
  const q = String(query||'').trim().toLocaleLowerCase('it');
  if(!q){
    el.innerHTML = '<div class="footer-note global-search-help">Cerca un esercizio nella scheda attiva o nello storico.</div>';
    return;
  }
  const results = globalSearchEntries.filter(item=>
    (item.name+' '+item.day+' '+(item.blockName||'')).toLocaleLowerCase('it').includes(q)
  ).slice(0,50);
  if(!results.length){
    el.innerHTML = '<div class="footer-note global-search-help">Nessun esercizio o giorno trovato.</div>';
    return;
  }
  el.innerHTML = results.map((item, i)=>`
    <button class="global-search-result" data-result-index="${i}">
      <span class="global-search-name">${escapeHtml(item.name)}</span>
      <span class="global-search-meta">${item.kind==='active' ? 'Scheda attiva' : escapeHtml(item.blockName)} · ${escapeHtml(item.day)}</span>
    </button>`).join('');
  el.querySelectorAll('[data-result-index]').forEach(btn=>{
    btn.addEventListener('click', ()=>openGlobalSearchResult(results[Number(btn.dataset.resultIndex)]));
  });
}
function openGlobalSearchResult(item){
  if(!item) return;
  closeGlobalSearch();
  if(item.kind === 'active'){
    selectDay(item.dayIdx);
    showView('active');
    setTimeout(()=>goToExerciseSlide(item.exi), 140);
    return;
  }
  histActive = item.blockName;
  histDayIdx = item.dayIdx;
  showHistSection('cronologia');
  renderHistList();
  renderHistDayTabs();
  renderHistBody();
  showView('hist');
}
