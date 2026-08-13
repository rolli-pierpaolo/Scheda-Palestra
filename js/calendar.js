// ---------------- CALENDARIO ALLENAMENTI ----------------
// mostra un mese alla volta con un pallino colorato, il colore del giorno
// Push/Pull/Legs eccetera, per ogni data in cui è stato registrato un
// allenamento, tramite "Giorno terminato" o toccando a mano una cella per
// correggerla
let calendarMonthOffset = 0;
let calendarViewDate = null;   // "YYYY-MM-DD" della cella aperta, o null per la vista a griglia
let calendarViewMode = null;   // 'info' per il riepilogo di sola lettura, 'edit' per selezione e conferma
let calendarEditPending = null; // nomi giorno selezionati mentre si è in modalità modifica, non ancora salvati
const CAL_MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
// apre il calendario, sempre partendo dal mese corrente e dalla vista a griglia
function openCalendar(){
  calendarMonthOffset = 0;
  calendarViewDate = null;
  calendarViewMode = null;
  calendarEditPending = null;
  renderCalendar();
  document.getElementById('calendarModal').style.display = 'flex';
}
function closeCalendar(){
  document.getElementById('calendarModal').style.display = 'none';
}
// passa al mese precedente o successivo
function shiftCalendarMonth(delta){
  calendarMonthOffset += delta;
  renderCalendar();
}
// quante date, oggi incluso, hanno almeno un allenamento registrato negli
// ultimi N giorni: piccola spinta motivazionale, calcolata da calendarLog
// che già esiste, senza bisogno di un nuovo storage
function countRecentWorkoutDays(days){
  let count = 0;
  const d = new Date();
  for(let i=0;i<days;i++){
    if(calendarLog[todayKey(d)] && calendarLog[todayKey(d)].length) count++;
    d.setDate(d.getDate()-1);
  }
  return count;
}
// tocca una cella: se ha già un allenamento registrato, mostra un riepilogo
// veloce di sola lettura invece di buttare in faccia subito la lista di
// scelte; se è vuota, va dritto alla selezione perché non c'è nulla da
// riassumere
function openCalendarDay(key){
  calendarViewDate = key;
  const hasEntries = (calendarLog[key]||[]).length > 0;
  if(hasEntries){
    calendarViewMode = 'info';
  } else {
    calendarViewMode = 'edit';
    calendarEditPending = [];
  }
  renderCalendar();
}
// passa dal riepilogo alla modifica di una data già registrata
function editCalendarDay(){
  calendarViewMode = 'edit';
  calendarEditPending = (calendarLog[calendarViewDate]||[]).map(e=>e.name);
  renderCalendar();
}
// chiude la vista di dettaglio di una singola data, tornando alla griglia
function closeCalendarDayView(){
  calendarViewDate = null;
  calendarViewMode = null;
  calendarEditPending = null;
  renderCalendar();
}
// accende o spegne un giorno tra quelli selezionati per questa data,
// senza ancora salvare nulla
function togglePendingCalendarDay(dayIdx){
  const day = state.days[dayIdx];
  if(!day) return;
  const i = calendarEditPending.indexOf(day.name);
  if(i>=0) calendarEditPending.splice(i,1); else calendarEditPending.push(day.name);
  renderCalendar();
}
// niente si salva finché non si preme "Conferma": stesso spirito della
// modalità di riordino esercizi, così toccare le scelte per sbaglio non scrive subito
function confirmCalendarDay(){
  const key = calendarViewDate;
  const entries = calendarEditPending.map(name=>{
    const idx = state.days.findIndex(d=>d.name===name);
    const a = dayAccent(state.days[idx], idx);
    return {name, color: a.c};
  });
  if(entries.length) calendarLog[key] = entries; else delete calendarLog[key];
  saveCalendarLog();
  closeCalendarDayView();
}
// trasforma una data "YYYY-MM-DD" in un formato leggibile in italiano
function formatDateItalian(key){
  const [y,m,d] = key.split('-').map(Number);
  return d + ' ' + CAL_MONTH_NAMES[m-1] + ' ' + y;
}
// disegna il riepilogo di sola lettura di una data già registrata
function renderCalendarInfo(key){
  const entries = calendarLog[key] || [];
  const chips = entries.map(e=>`<div class="cal-info-chip" style="--accent:${e.color}">${escapeHtml(e.name)}</div>`).join('');
  return `<div class="cal-editor">
    <div class="cal-editor-date">${formatDateItalian(key)}</div>
    <div class="cal-info-list">${chips}</div>
    <div class="cal-editor-actions">
      <button class="add-ex small2" onclick="editCalendarDay()">${ICON_PENCIL} Modifica</button>
      <button class="add-ex small2" onclick="closeCalendarDayView()">← Torna al calendario</button>
    </div>
  </div>`;
}
// disegna la selezione dei giorni allenati per una data specifica
function renderCalendarEdit(key){
  const rows = state.days.map((day,idx)=>{
    const a = dayAccent(day, idx);
    const active = calendarEditPending.includes(day.name);
    return `<button class="cal-day-toggle ${active?'active':''}" style="--accent:${a.c}" onclick="togglePendingCalendarDay(${idx})">${escapeHtml(day.name)}</button>`;
  }).join('');
  return `<div class="cal-editor">
    <div class="cal-editor-date">${formatDateItalian(key)}</div>
    <div class="cal-editor-hint">Tocca i giorni allenati in questa data, poi conferma</div>
    <div class="cal-editor-list">${rows}</div>
    <button class="add-ex" style="margin-top:14px;border-color:var(--green);color:var(--green);" onclick="confirmCalendarDay()">${ICON_CHECK} Conferma</button>
    <button class="add-ex small2" style="margin-top:8px;" onclick="closeCalendarDayView()">← Annulla</button>
  </div>`;
}
// disegna il calendario intero: o la griglia del mese, o il dettaglio di una
// singola data se ne è stata aperta una
function renderCalendar(){
  const body = document.getElementById('calendarBody');
  if(!body) return;
  if(calendarViewDate){
    body.innerHTML = calendarViewMode==='edit' ? renderCalendarEdit(calendarViewDate) : renderCalendarInfo(calendarViewDate);
    return;
  }
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth()+calendarMonthOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDow = (base.getDay()+6)%7; // lunedì diventa il giorno zero, invece di domenica
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayK = todayKey();
  let monthCount = 0;
  let cells = '';
  for(let i=0;i<firstDow;i++) cells += '<div class="cal-cell empty"></div>';
  for(let d=1; d<=daysInMonth; d++){
    const key = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const entries = calendarLog[key] || [];
    if(entries.length) monthCount++;
    const dots = entries.map(e=>`<span class="cal-dot" style="background:${e.color}" title="${escapeAttr(e.name)}"></span>`).join('');
    cells += `<div class="cal-cell ${key===todayK?'today':''}" onclick="openCalendarDay('${key}')"><span class="cal-daynum">${d}</span><div class="cal-dots">${dots}</div></div>`;
  }
  const recent7 = countRecentWorkoutDays(7);
  body.innerHTML = `<div class="cal-stats">${ICON_FLAME} Ultimi 7 giorni: <b>${recent7}</b> allenamenti · Questo mese: <b>${monthCount}</b></div>
    <div class="cal-header">
      <button onclick="shiftCalendarMonth(-1)">‹</button>
      <span>${CAL_MONTH_NAMES[month]} ${year}</span>
      <button onclick="shiftCalendarMonth(1)">›</button>
    </div>
    <div class="cal-grid cal-grid-head"><div>L</div><div>M</div><div>M</div><div>G</div><div>V</div><div>S</div><div>D</div></div>
    <div class="cal-grid">${cells}</div>`;
}
