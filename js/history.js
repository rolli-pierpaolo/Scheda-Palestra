// ---------------- STORICO ----------------
// stessa idea di activeDayIdx/activeExerciseIdx ma per la tab Storico: histActive
// e' il titolo del WO archiviato scelto (es. "WO 12"), histDayIdx il giorno dentro
// quel WO. E' tutto di sola lettura, qui non si modifica nulla dei dati storici
let histActive = null;
let histDayIdx = 0;
let histEditMode = false;

// le 2 sotto-sezioni del tab Progressi (Cronologia/Strumenti, vedi
// index.html): una alla volta, si riparte sempre da Cronologia ogni volta che
// si entra nel tab - e' quella che si vuole vedere piu' spesso. Le vere
// Impostazioni (account, backup, notifiche...) non vivono piu' qui: sono in
// #settingsModal, aperto dall'icona a ingranaggio in alto (vedi sotto)
function showHistSection(section){
  ['cronologia','strumenti'].forEach(s=>{
    const label = s.charAt(0).toUpperCase()+s.slice(1);
    document.getElementById('histSection'+label).style.display = (s===section) ? '' : 'none';
    document.getElementById('histSubTab'+label).classList.toggle('active', s===section);
  });
}
function openSettingsModal(){
  if(typeof renderSharingSection === 'function') renderSharingSection();
  if(typeof renderPushStatus === 'function') renderPushStatus();
  document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal(){
  document.getElementById('settingsModal').style.display = 'none';
}
function toggleHistEdit(){
  histEditMode = !histEditMode;
  const btn = document.getElementById('histEditBtn');
  if(btn){ btn.innerHTML = histEditMode ? (ICON_CHECK+' Fatto') : (ICON_PENCIL+' Modifica'); btn.classList.toggle('active', histEditMode); }
  renderHistList();
}
function renderHistList(){
  const el = document.getElementById('histList');
  const titles = Object.keys(getStorico());
  el.innerHTML = titles.map(t=>{
    const safe = String(t).replace(/'/g,"\\'");
    const delBtn = histEditMode ? `<button class="hist-del" onclick="event.stopPropagation();deleteHistEntry('${safe}')" title="Elimina">\u2715</button>` : '';
    // la data manca per i blocchi archiviati prima che storicoDates esistesse:
    // in quel caso il sottotitolo semplicemente non compare, invece di mostrare
    // una data finta o un placeholder confuso
    const dateKey = storicoDates[t];
    const dateHtml = dateKey ? `<span class="hist-chip-date">${formatDateItalian(dateKey)}</span>` : '';
    return `<span class="hist-chip-wrap"><button class="hist-chip ${t===histActive?'active':''}" onclick="selectHist('${safe}')">${escapeHtml(t)}${dateHtml}</button>${delBtn}</span>`;
  }).join('');
}
function selectHist(t){
  histActive = t; histDayIdx = 0;
  renderHistList();
  renderHistDayTabs();
  renderHistBody();
}
function renderHistDayTabs(){
  const el = document.getElementById('histDayTabs');
  if(!histActive){ el.innerHTML=''; return; }
  const days = getStorico()[histActive];
  el.innerHTML = days.map((d,i)=>{
    const a = dayAccent(d, i);
    return `<button class="day-btn ${i===histDayIdx?'active':''}" style="--accent:${a.c}" onclick="selectHistDay(${i})">${escapeHtml(d.name)}</button>`;
  }).join('');
}
function selectHistDay(i){ histDayIdx=i; renderHistDayTabs(); renderHistBody(); }
// scheda di sola lettura per un esercizio del WO storico: una riga per ogni
// settimana che ha davvero delle serie compilate (le settimane senza dati,
// tipo quelle mai arrivate a farle, spariscono invece di mostrarsi vuote)
function renderHistBody(){
  const el = document.getElementById('histBody');
  if(!histActive){ el.innerHTML = '<div class="footer-note">Seleziona un WO storico qui sopra.</div>'; return; }
  const day = getStorico()[histActive][histDayIdx];
  const a = dayAccent(day, histDayIdx);
  el.innerHTML = day.esercizi.map(ex=>{
    // il numero di settimane di QUESTO esercizio storico (non quello del blocco
    // attivo: un WO archiviato puo' avere una durata diversa da quella corrente)
    const nWeeks = (ex.sets && ex.sets.length) || (ex.recupero && ex.recupero.length) || 4;
    const weeksHtml = Array.from({length:nWeeks}, (_,i)=>i).map(w=>{
      const sets = (ex.sets[w]||[]).filter(s=>s.peso||s.rip);
      if(!sets.length){
        if(ex.weekSkipped && ex.weekSkipped[w]) return `<div class="hist-week hist-week-skipped">Sett.${w+1}: saltata</div>`;
        return '';
      }
      const chips = sets.map(s=>`<span class="hist-set">${escapeHtml(s.peso??'')}${s.peso&&s.rip?' × ':''}${escapeHtml(s.rip??'')}</span>`).join('');
      return `<div class="hist-week">Sett.${w+1} (${escapeHtml(ex.recupero[w]||'')}): ${chips}</div>`;
    }).join('');
    return `<div class="card hist-card" style="--accent:${a.c}">
      <div class="ex-name">${escapeHtml(ex.nome)}</div>
      <div class="schema-line">${escapeHtml(ex.schema[0]||'')}</div>
      <div style="padding:0 12px 12px;">${weeksHtml || '<span class="footer-note">Nessun dato registrato</span>'}</div>
    </div>`;
  }).join('');
}

