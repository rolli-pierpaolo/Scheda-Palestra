// ---------------- COMBOBOX (suggerimenti + aggiungi nuovo) ----------------
let comboOpenInput = null;
// chiude il menu a tendina attualmente aperto, se c'è
function closeCombo(){
  const existing = document.querySelector('.combo-panel');
  if(existing) existing.remove();
  comboOpenInput = null;
}
// filtra la lista di suggerimenti di un certo tipo, giorni, esercizi,
// schemi, in base a cosa è stato scritto finora
function comboFilteredList(kind, query){
  const q = (query||'').trim().toLowerCase();
  const all = getList(kind);
  if(!q) return all;
  return all.filter(v=>String(v).toLowerCase().includes(q));
}
// disegna il menu a tendina con i suggerimenti sotto il campo, più una voce
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
// scelto un suggerimento, o scritta una voce nuova: valorizza il campo e
// lancia "change" a mano, così scatta comunque l'onchange collegato al
// campo, updateName, updateMeta e simili, anche se non è stato l'utente a
// digitare direttamente
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
// apre il menu suggerimenti quando il campo riceve il focus
function onComboFocus(input, kind){
  renderComboPanel(input, kind);
}
// aggiorna il menu suggerimenti a ogni carattere digitato
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
// unisce lo storico di base, DATA.storico, quello già presente
// all'esportazione, con quello aggiunto dopo, storicoExtra, togliendo le
// voci che l'utente ha eliminato: senza questo, un mese cancellato
// ricomparirebbe ogni volta perché DATA.storico non si può modificare
// davvero, è incorporato nel file
function getStorico(){
  const merged = Object.assign({}, DATA.storico, storicoExtra);
  deletedStorico.forEach(t=>{ delete merged[t]; });
  return merged;
}
// elimina definitivamente un blocco dallo storico, con conferma
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
// salva lo storico aggiunto dopo l'esportazione originale
function saveStorico(){
  localStorage.setItem(STORICO_KEY, JSON.stringify(storicoExtra));
}
let saveStatePending=false;
// scrive subito su localStorage, niente più debounce: prima aspettava
// 400 millisecondi di quiete prima di scrivere davvero, e quei 400
// millisecondi erano una finestra vera in cui una modifica esisteva solo in
// memoria. Su iPhone, mettere l'app in background era spesso sufficiente per
// far ricaricare la pagina a iOS prima che il timer scattasse, perdendo
// l'ultima modifica, posizione, settimana segnata fatta e così via: sembrava
// che tornasse tutto indietro. Ora ogni salvataggio è immediato e sincrono,
// per ogni singolo tocco - flushSaveState() resta come nome per
// compatibilità con visibilitychange e pagehide qui sotto, ma non c'è più
// nessun timer da anticipare: saveState() ha già scritto tutto nell'istante stesso
function saveState(){
  // mentre si guardano i dati condivisi da un altro utente, sola lettura,
  // vedi js/sharing.js, non si deve mai salvare: né in locale né sul
  // cloud, altrimenti si rischierebbe di scrivere i dati di qualcun altro
  // al posto dei propri
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  saveStatePending = true;
  flushSaveState();
}
// scrive davvero lo stato su localStorage e lo manda al cloud se collegato
function flushSaveState(){
  if(!saveStatePending) return;
  saveStatePending = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.getElementById('saveStatus').textContent = "Salvato";
  if(typeof pushToCloud === 'function') pushToCloud();
}
// rete di sicurezza in più, non dovrebbe più servire dato che saveState()
// scrive già subito: se mai restasse qualcosa in sospeso, lo scrive
// comunque nel momento esatto in cui l'app sta per finire in background
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushSaveState();
});
window.addEventListener('pagehide', flushSaveState);
// salva quali settimane sono aperte o chiuse manualmente
function saveCollapsed(){
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedMap));
}

