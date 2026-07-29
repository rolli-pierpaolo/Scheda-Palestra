// ---------------- CATEGORIE GIORNI (impostazioni) ----------------
function openDaysModal(){
  const body = document.getElementById('daysModalBody');
  body.innerHTML = state.days.map((d,i)=>{
    const a = dayAccent(d, i);
    return `
    <div class="days-row">
      <span class="days-label">Giorno ${i+1}</span>
      <div class="combo-wrap"><input class="meta-input" value="${escapeAttr(d.name)}" oninput="onComboInput(this,'giorni')" onfocus="onComboFocus(this,'giorni')" onchange="renameDay(${i},this.value)"></div>
      <input type="color" class="day-color-input" value="${a.c}" title="Colore del giorno" onchange="updateDayColor(${i},this.value)">
      <button class="del-day-btn" onclick="deleteDay(${i})" title="Elimina giorno">✕</button>
    </div>`;
  }).join('')
  + '<button class="add-ex small2" style="margin-top:6px;" onclick="addDay()">+ Aggiungi giorno</button>'
  + '<div class="footer-note" style="padding:12px 0 0;text-align:left;">Il nome scelto determina l\'etichetta della scheda per quel giorno; il colore puoi cambiarlo qui a fianco. Vale solo per il ciclo attivo.</div>';
  document.getElementById('daysModal').style.display = 'flex';
}
function closeDaysModal(){
  document.getElementById('daysModal').style.display = 'none';
}
function renameDay(i, val){
  val = (val||'').trim();
  if(!val){ renderDayTabs(); renderActive(); return; }
  state.days[i].name = val;
  saveState();
  renderDayTabs();
  renderActive();
}
// colore scelto a mano dall'utente per quel giorno: da qui in poi dayAccent()
// usa sempre questo invece di ripiegare su ACCENTS/posizione
function updateDayColor(i, hex){
  state.days[i].color = hex;
  saveState();
  renderDayTabs();
  if(i === activeDayIdx) renderActive();
}
// i giorni non sono per forza 4: se ne serve uno in piu' (es. un giorno di
// cardio a parte) si aggiunge qui, con un nome segnaposto da rinominare subito
function addDay(){
  state.days.push({ name: 'Nuovo giorno ' + (state.days.length + 1), esercizi: [] });
  saveState();
  openDaysModal();
  updateTitles();
  renderDayTabs();
}
// elimina il giorno e tutti i suoi esercizi (con conferma, dato che non si
// torna indietro); tiene sempre almeno un giorno e sposta activeDayIdx se
// quello eliminato era quello aperto o ne cambiava la posizione
function deleteDay(i){
  if(state.days.length<=1){ alert('Deve rimanere almeno un giorno.'); return; }
  if(!confirm('Eliminare "'+(state.days[i].name||('Giorno '+(i+1)))+'" e tutti i suoi esercizi?')) return;
  state.days.splice(i,1);
  if(activeDayIdx === i){ activeDayIdx = Math.min(i, state.days.length-1); }
  else if(activeDayIdx > i){ activeDayIdx--; }
  saveState();
  openDaysModal();
  updateTitles();
  renderDayTabs();
  renderActive();
}

// ridisegna da zero tutta la tab Allenamento per il giorno selezionato (tutte le
// schede esercizio piu' i due bottoni in fondo). E' l'unico punto che scrive
// dentro #viewActive: ogni volta che qualcosa cambia struttura (nuovo esercizio,
// nuova/rimossa serie, cascata di settimane...) si richiama semplicemente questa
