// ---------------- COMBOBOX (suggerimenti + aggiungi nuovo) ----------------
let comboOpenInput = null;
function closeCombo(){
  const existing = document.querySelector('.combo-panel');
  if(existing) existing.remove();
  comboOpenInput = null;
}
function comboFilteredList(kind, query){
  const q = (query||'').trim().toLowerCase();
  const all = getList(kind);
  if(!q) return all;
  return all.filter(v=>String(v).toLowerCase().includes(q));
}
// disegna il menu a tendina con i suggerimenti sotto il campo, piu' una voce
// "+ Aggiungi ..." se quello scritto non esiste ancora nella lista
function renderComboPanel(input, kind){
  closeCombo();
  const wrap = input.closest('.combo-wrap');
  if(!wrap) return;
  const query = input.value;
  const items = comboFilteredList(kind, query);
  const panel = document.createElement('div');
  panel.className = 'combo-panel';
  let html = '';
  items.slice(0,80).forEach(v=>{
    html += `<div class="combo-option" data-val="${escapeAttr(v)}">${escapeHtml(v)}</div>`;
  });
  const trimmed = query.trim();
  const already = trimmed && items.some(v=>String(v).toLowerCase()===trimmed.toLowerCase());
  if(trimmed && !already){
    html += `<div class="combo-add" data-val="${escapeAttr(trimmed)}">＋ Aggiungi "${escapeHtml(trimmed)}"</div>`;
  }
  if(!html){
    html = `<div class="combo-empty">Scrivi per cercare o per aggiungere una nuova voce</div>`;
  }
  panel.innerHTML = html;
  wrap.appendChild(panel);
  comboOpenInput = input;
  panel.querySelectorAll('.combo-option').forEach(el=>{
    el.addEventListener('mousedown', (e)=>{ e.preventDefault(); selectComboValue(input, el.dataset.val, kind, false); });
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); selectComboValue(input, el.dataset.val, kind, false); }, {passive:false});
  });
  const addEl = panel.querySelector('.combo-add');
  if(addEl){
    addEl.addEventListener('mousedown', (e)=>{ e.preventDefault(); selectComboValue(input, addEl.dataset.val, kind, true); });
    addEl.addEventListener('touchstart', (e)=>{ e.preventDefault(); selectComboValue(input, addEl.dataset.val, kind, true); }, {passive:false});
  }
}
// scelto un suggerimento (o scritta una voce nuova): valorizza il campo e lancia
// 'change' a mano, cosi' scatta comunque l'onchange collegato al campo (updateName,
// updateMeta, ecc.) anche se non e' stato l'utente a digitare direttamente
function selectComboValue(input, val, kind, isNew){
  if(isNew){
    const already = getList(kind).some(v=>String(v).toLowerCase()===val.toLowerCase());
    if(!already){
      if(!extraLists[kind]) extraLists[kind]=[];
      extraLists[kind].push(val);
      saveExtraLists();
    }
  }
  input.value = val;
  closeCombo();
  input.dispatchEvent(new Event('change', {bubbles:true}));
  input.blur();
}
function onComboFocus(input, kind){
  renderComboPanel(input, kind);
}
function onComboInput(input, kind){
  renderComboPanel(input, kind);
}
// chiude il menu suggerimenti se si tocca/clicca fuori dal combo-wrap aperto
document.addEventListener('mousedown', function(e){
  if(comboOpenInput && !e.target.closest('.combo-wrap')){
    closeCombo();
  }
});
document.addEventListener('touchstart', function(e){
  if(comboOpenInput && !e.target.closest('.combo-wrap')){
    closeCombo();
  }
}, {passive:true});
// unisce lo storico "di base" (DATA.storico, quello gia' presente all'esportazione)
// con quello aggiunto dopo (storicoExtra), togliendo le voci che l'utente ha
// eliminato (deletedStorico) - senza questo, un mese cancellato ricomparirebbe
// ogni volta perche' DATA.storico non si puo' modificare davvero (e' incorporato nel file)
function getStorico(){
  const merged = Object.assign({}, DATA.storico, storicoExtra);
  deletedStorico.forEach(t=>{ delete merged[t]; });
  return merged;
}
function deleteHistEntry(t){
  if(!confirm('Eliminare definitivamente "'+t+'" dallo storico? Non potrai piu recuperarlo (a meno di avere un backup).')) return;
  if(Object.prototype.hasOwnProperty.call(storicoExtra, t)){
    delete storicoExtra[t];
    saveStorico();
  }
  if(!deletedStorico.includes(t)){
    deletedStorico.push(t);
    saveDeletedStorico();
  }
  if(histActive === t){ histActive = null; }
  renderHistList();
  renderHistDayTabs();
  renderHistBody();
}
function saveStorico(){
  localStorage.setItem(STORICO_KEY, JSON.stringify(storicoExtra));
}
let saveTimer=null;
// debounced: se arrivano piu' chiamate ravvicinate (es. digitando) aspetta 400ms
// di quiete prima di scrivere davvero su localStorage, invece di farlo ad ogni tasto
function saveState(){
  document.getElementById('saveStatus').textContent = "Salvataggio...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.getElementById('saveStatus').textContent = "Salvato";
  }, 400);
}
function saveCollapsed(){
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedMap));
}

