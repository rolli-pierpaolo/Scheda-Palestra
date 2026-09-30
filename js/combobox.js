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
function getStorico(){
  const merged = Object.assign({}, DATA.storico, storicoExtra);
  deletedStorico.forEach(t=>{ delete merged[t]; });
  return merged;
}
async function deleteHistEntry(t){
  if(!await ViridisConfirmDialog('Eliminare definitivamente "'+t+'" dallo storico? Non potrai piu recuperarlo (a meno di avere un backup).')) return;
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
let saveStatePending=false;
function saveState(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  saveStatePending = true;
  flushSaveState();
}
function flushSaveState(){
  if(!saveStatePending) return;
  saveStatePending = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if(typeof pushToCloud === 'function') pushToCloud();
  if(typeof updateWorkoutSaveStatus==='function')updateWorkoutSaveStatus();
}
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushSaveState();
});
window.addEventListener('pagehide', flushSaveState);
function saveCollapsed(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedMap));
}
