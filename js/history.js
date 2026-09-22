// ---------------- STORICO ----------------
// stessa idea di activeDayIdx/activeExerciseIdx ma per la tab Storico: histActive
// è il titolo del WO archiviato scelto, per esempio "WO 12", histDayIdx il
// giorno dentro quel WO. È tutto di sola lettura, qui non si modifica nulla
// dei dati storici
let histActive = null;
let histDayIdx = 0;
let histEditMode = false;

// le due sotto-sezioni del tab Progressi, Cronologia e Strumenti, vedi
// index.html: una alla volta, si riparte sempre da Cronologia ogni volta che
// si entra nel tab, è quella che si vuole vedere più spesso. Le vere
// Impostazioni, account, backup, notifiche, non vivono più qui: sono nel
// modale aperto dall'icona a ingranaggio in alto, vedi sotto
function showHistSection(section){
  ['cronologia','strumenti'].forEach(s=>{
    const label = s.charAt(0).toUpperCase()+s.slice(1);
    document.getElementById('histSection'+label).style.display = (s===section) ? '' : 'none';
    document.getElementById('histSubTab'+label).classList.toggle('active', s===section);
  });
}

// Dashboard compatta dei Progressi: usa soltanto dati già presenti
// (calendario, settimane e storico), quindi non introduce un secondo formato
// di salvataggio né cambia il modo in cui vengono contati gli allenamenti.
function progressTimelineEntries(limit=4){
  return Object.keys(calendarLog || {})
    .filter(key => Array.isArray(calendarLog[key]) && calendarLog[key].length)
    .sort((a,b) => b.localeCompare(a))
    .slice(0, limit)
    .map(key => ({ key, entries: calendarLog[key] || [] }));
}
function progressDateLabel(key){
  if(typeof formatDateItalian === 'function') return formatDateItalian(key);
  const parts = String(key || '').split('-').map(Number);
  return parts.length === 3 ? `${parts[2]}/${String(parts[1]).padStart(2,'0')}` : String(key || '');
}
function renderProgressOverview(){
  const el = document.getElementById('progressOverview');
  if(!el || typeof state === 'undefined') return;
  const weekly = typeof computeWeeklyProgress === 'function' ? computeWeeklyProgress() : {done:0,total:0};
  const completed = Math.min(weekly.done || 0, weekly.total || 0);
  const total = weekly.total || 0;
  const weeklyPct = total ? Math.round(completed / total * 100) : 0;
  const sessions = typeof computeMonthlyWorkoutsCount === 'function' ? computeMonthlyWorkoutsCount() : 0;
  const archived = Object.keys(getStorico() || {}).length;
  const blockWeek = typeof computeCurrentBlockWeek === 'function' ? computeCurrentBlockWeek() : ((state.currentWeek || 0) + 1);
  const timeline = progressTimelineEntries();
  const timelineHtml = timeline.length ? timeline.map(({key, entries}) => {
    const names = entries.slice(0,2).map(entry => escapeHtml(entry.name || 'Allenamento')).join(' · ');
    const extra = entries.length > 2 ? ` +${entries.length - 2}` : '';
    const accent = entries[0] && entries[0].color ? entries[0].color : 'var(--green)';
    return `<button class="progress-timeline-row" type="button" onclick="openCalendar()">
      <span class="progress-timeline-dot" style="--accent:${escapeAttr(accent)}"></span>
      <span><b>${escapeHtml(progressDateLabel(key))}</b><small>${names}${extra}</small></span>
      <i>›</i>
    </button>`;
  }).join('') : `<div class="progress-timeline-empty">Il tuo primo allenamento apparirà qui.</div>`;

  el.innerHTML = `
    <section class="progress-hero-card">
      <div class="progress-hero-topline"><span>PROGRESSI</span><button type="button" onclick="openCalendar()" aria-label="Apri calendario">${ICON_CALENDAR}</button></div>
      <div class="progress-hero-title">Il tuo ritmo,<br><em>in chiaro.</em></div>
      <div class="progress-weekline"><span>Settimana ${blockWeek} di ${state.weeksPerBlock || 4}</span><b>${completed}/${total || 0} giorni</b></div>
      <div class="progress-week-track" aria-label="${weeklyPct}% della settimana completata"><span style="width:${weeklyPct}%"></span></div>
      <div class="progress-metric-grid">
        <div><b>${sessions}</b><span>sessioni nel blocco</span></div>
        <div><b>${archived}</b><span>schede archiviate</span></div>
      </div>
    </section>
    <section class="progress-quick-actions" aria-label="Strumenti progressi">
      <button type="button" onclick="openTrends()"><span>${ICON_CHART}</span><b>Andamenti</b><small>Forza e volume</small></button>
      <button type="button" onclick="openAchievements()"><span>${ICON_TARGET}</span><b>Obiettivi</b><small>I tuoi traguardi</small></button>
      <button type="button" onclick="openCalendar()"><span>${ICON_CALENDAR}</span><b>Calendario</b><small>Sessioni e costanza</small></button>
    </section>
    <section class="progress-timeline-card">
      <div class="progress-section-head"><span>ATTIVITÀ RECENTE</span><button type="button" onclick="openCalendar()">Vedi tutto</button></div>
      <div class="progress-timeline">${timelineHtml}</div>
    </section>`;
}
// apre il modale Impostazioni, aggiornando prima lo stato di condivisione
// e notifiche così sono sempre freschi
function openSettingsModal(){
  if(typeof renderAppearanceSettings === 'function') renderAppearanceSettings();
  if(typeof renderAccessibilitySettings === 'function') renderAccessibilitySettings();
  if(typeof renderSharingSection === 'function') renderSharingSection();
  if(typeof renderPushStatus === 'function') renderPushStatus();
  if(typeof renderAutoBackupStatus === 'function') renderAutoBackupStatus();
  document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal(){
  document.getElementById('settingsModal').style.display = 'none';
}
// accende o spegne la modalità modifica dello storico, che mostra i
// bottoni per eliminare un blocco archiviato
function toggleHistEdit(){
  histEditMode = !histEditMode;
  const btn = document.getElementById('histEditBtn');
  if(btn){ btn.innerHTML = histEditMode ? (ICON_CHECK+' Fatto') : (ICON_PENCIL+' Modifica'); btn.classList.toggle('active', histEditMode); }
  renderHistList();
}
// disegna la lista dei blocchi archiviati, come pillole cliccabili
function renderHistList(){
  const el = document.getElementById('histList');
  const titles = Object.keys(getStorico());
  const editBtn = document.getElementById('histEditBtn');
  if(!titles.length){
    el.innerHTML = `<div class="history-empty-list"><span>${ICON_ARCHIVE}</span><div><b>Nessuna scheda archiviata</b><small>Quando chiudi un blocco, potrai rivederlo qui senza perdere lo storico.</small></div></div>`;
    if(editBtn){
      editBtn.hidden = true;
      editBtn.style.setProperty('display', 'none', 'important');
    }
    return;
  }
  if(editBtn){
    editBtn.hidden = false;
    editBtn.style.removeProperty('display');
  }
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
// sceglie quale blocco archiviato guardare, e mostra sempre il suo primo giorno
function selectHist(t){
  histActive = t; histDayIdx = 0;
  renderHistList();
  renderHistDayTabs();
  renderHistBody();
}
// disegna i tab dei giorni dentro il blocco archiviato scelto
function renderHistDayTabs(){
  const el = document.getElementById('histDayTabs');
  if(!histActive){ el.innerHTML=''; return; }
  const days = getStorico()[histActive];
  el.innerHTML = days.map((d,i)=>{
    const a = dayAccent(d, i);
    return `<button class="day-btn ${i===histDayIdx?'active':''}" style="--accent:${a.c}" onclick="selectHistDay(${i})">${escapeHtml(d.name)}</button>`;
  }).join('');
}
// cambia il giorno mostrato dentro il blocco archiviato
function selectHistDay(i){ histDayIdx=i; renderHistDayTabs(); renderHistBody(); }
// scheda di sola lettura per un esercizio del WO storico: una riga per ogni
// settimana che ha davvero delle serie compilate, le settimane senza dati,
// tipo quelle mai arrivate a farle, spariscono invece di mostrarsi vuote
function renderHistBody(){
  const el = document.getElementById('histBody');
  if(!histActive){ el.innerHTML = `<div class="history-empty-state"><span>${ICON_ARCHIVE}</span><b>Le tue schede archiviate</b><small>Seleziona un blocco per vedere esercizi, serie e settimane registrate.</small></div>`; return; }
  const day = getStorico()[histActive][histDayIdx];
  const a = dayAccent(day, histDayIdx);
  el.innerHTML = day.esercizi.map(ex=>{
    // il numero di settimane di questo esercizio storico, non quello del blocco
    // attivo: un WO archiviato può avere una durata diversa da quella corrente
    const nWeeks = (ex.sets && ex.sets.length) || (ex.recupero && ex.recupero.length) || 4;
    const weeksHtml = Array.from({length:nWeeks}, (_,i)=>i).map(w=>{
      const sets = (ex.sets[w]||[]).filter(s=>s.peso||s.rip);
      if(!sets.length){
        if(ex.weekSkipped && ex.weekSkipped[w]) return `<div class="hist-week hist-week-skipped">Sett.${w+1}: saltata</div>`;
        return '';
      }
      const chips = sets.map(s=>`<span class="hist-set">${s.dropset?'↓ ':''}${escapeHtml(s.peso??'')}${s.peso&&s.rip?' × ':''}${escapeHtml(s.rip??'')}${s.rpe?' @'+escapeHtml(String(s.rpe)):''}</span>`).join('');
      return `<div class="hist-week">Sett.${w+1} (${escapeHtml(ex.recupero[w]||'')}): ${chips}</div>`;
    }).join('');
    return `<div class="card hist-card" style="--accent:${a.c}">
      <div class="ex-name">${escapeHtml(ex.nome)}</div>
      <div class="schema-line">${escapeHtml(ex.schema[0]||'')}</div>
      <div style="padding:0 12px 12px;">${weeksHtml || '<span class="footer-note">Nessun dato registrato</span>'}</div>
    </div>`;
  }).join('');
}
