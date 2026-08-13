// ---------------- LIBRERIA ESERCIZI ----------------
// elenco completo (alfabetico) di tutti gli esercizi memorizzati, con ricerca
// testuale e filtro per gruppo muscolare: usato sia dalla tab Storico (per
// gestire/aggiungere/togliere esercizi) sia dal picker di collegamento in
// js/exercise-card.js (che riusa filteredExerciseNames e renderExerciseListRows)
// filtra e ordina alfabeticamente i nomi degli esercizi in base al testo
// cercato e al gruppo muscolare scelto
function filteredExerciseNames(text, group){
  const q = String(text||'').trim().toLowerCase();
  return getList('esercizi').slice()
    .sort((a,b)=> String(a).localeCompare(String(b), 'it', {sensitivity:'base'}))
    .filter(name=>{
      if(q && !String(name).toLowerCase().includes(q)) return false;
      if(group && getExerciseGroup(name) !== group) return false;
      return true;
    });
}
// disegna la fila di pillole per filtrare per gruppo muscolare, riusata sia
// dalla Libreria che dal picker di collegamento
function renderGroupFilterChipsHtml(activeGroup, onclickPrefix){
  const chips = [{label:'Tutti', val:''}].concat(MUSCLE_GROUPS.map(g=>({label:g, val:g})));
  return `<div class="exlib-group-filters">${chips.map(c=>
    `<button class="exlib-group-chip ${activeGroup===c.val?'active':''}" onclick="${onclickPrefix}('${c.val}')">${escapeHtml(c.label)}</button>`
  ).join('')}</div>`;
}
// disegna la lista di esercizi come righe, con gruppo muscolare, e se
// richiesto anche il nome modificabile e il bottone per rimuoverli
function renderExerciseRowsHtml(names, opts){
  if(!names.length) return '<div class="footer-note">Nessun esercizio trovato.</div>';
  return `<div class="exlib-list">${names.map(name=>{
    const group = getExerciseGroup(name);
    const jsName = escapeAttr(escapeJs(name)); // sicuro dentro onclick="fn('...')" anche coi nomi con apostrofo, per esempio "SLDL (TI TORMENTERA')"
    const groupSelect = opts.editableGroup ? `<select class="exlib-group-select" onchange="setExerciseGroupFromLibrary('${jsName}',this.value)">
        <option value="" ${!group?'selected':''}>—</option>
        ${MUSCLE_GROUPS.map(g=>`<option value="${g}" ${group===g?'selected':''}>${escapeHtml(g)}</option>`).join('')}
      </select>` : (group ? `<span class="exlib-row-group">${escapeHtml(group)}</span>` : '');
    const delBtn = opts.removable ? `<button class="exlib-row-del" onclick="event.stopPropagation();removeExerciseFromLibrary('${jsName}')" title="Rimuovi dalla libreria">${ICON_TRASH}</button>` : '';
    const clickAttr = opts.onRowClick ? ` onclick="${opts.onRowClick}('${jsName}')"` : '';
    const nameHtml = opts.editableName
      ? `<input class="exlib-row-name-input" value="${escapeAttr(name)}" onclick="event.stopPropagation()" onchange="renameLibraryExercise('${jsName}', this.value)">`
      : `<span class="exlib-row-name">${escapeHtml(name)}</span>`;
    return `<div class="exlib-row"${clickAttr}>
      ${nameHtml}
      ${groupSelect}
      ${delBtn}
    </div>`;
  }).join('')}</div>`;
}

let libraryFilterText = '';
let libraryFilterGroup = '';
// nascosta di default: la x per eliminare e il nome modificabile compaiono
// solo dopo aver premuto "Modifica", così scorrendo la lista non si rischia
// di toccarla per sbaglio
let libraryEditMode = false;
// apre la Libreria esercizi, ripartendo sempre senza filtri e in sola lettura
function openExerciseLibrary(){
  libraryFilterText = '';
  libraryFilterGroup = '';
  libraryEditMode = false;
  const btn = document.getElementById('libraryEditBtn');
  if(btn) btn.innerHTML = ICON_PENCIL;
  renderExerciseLibrary();
  document.getElementById('libraryModal').style.display = 'flex';
}
function closeExerciseLibrary(){
  document.getElementById('libraryModal').style.display = 'none';
}
// accende o spegne la modalità modifica della Libreria
function toggleLibraryEditMode(){
  libraryEditMode = !libraryEditMode;
  const btn = document.getElementById('libraryEditBtn');
  if(btn) btn.innerHTML = libraryEditMode ? ICON_CHECK : ICON_PENCIL;
  renderExerciseLibrary();
}
// rinomina una voce della Libreria: se era di base la nasconde, come una
// rimozione, e aggiunge il nuovo nome al suo posto con lo stesso gruppo. Non
// tocca gli esercizi già inseriti nelle schede o nello storico, che restano
// col nome vecchio: la Libreria è solo l'elenco dei suggerimenti
function renameLibraryExercise(oldName, newName){
  newName = String(newName||'').trim();
  oldName = String(oldName||'').trim();
  if(!newName || newName.toLowerCase()===oldName.toLowerCase()){ renderExerciseLibrary(); return; }
  const group = getExerciseGroup(oldName);
  removeLibraryExercise(oldName);
  addLibraryExercise(newName, group);
  renderExerciseLibrary();
}
// il re-render sostituisce il campo di ricerca nel DOM: senza rimettere a mano
// il focus, e il cursore in fondo al testo, ogni carattere digitato farebbe
// perdere il focus e servirebbe ritoccare il campo a ogni lettera
function onLibrarySearchInput(val){
  libraryFilterText = val;
  renderExerciseLibrary();
  const inp = document.getElementById('librarySearchInput');
  if(inp){ inp.focus(); const p = inp.value.length; inp.setSelectionRange(p,p); }
}
// cambia il gruppo muscolare usato per filtrare la lista
function onLibraryGroupFilter(group){
  libraryFilterGroup = group;
  renderExerciseLibrary();
}
// assegna un gruppo muscolare a un esercizio, scelto dal menu a tendina
// nella riga corrispondente
function setExerciseGroupFromLibrary(name, group){
  setExerciseGroup(name, group);
  renderExerciseLibrary();
}
// toglie un esercizio dalla Libreria, con conferma
function removeExerciseFromLibrary(name){
  if(!confirm('Togliere "'+name+'" dalla libreria esercizi? Non tocca gli esercizi gia\' inseriti nelle schede, solo i suggerimenti futuri.')) return;
  removeLibraryExercise(name);
  renderExerciseLibrary();
}
// legge il form in fondo alla Libreria e aggiunge il nuovo esercizio scritto
function addExerciseFromLibraryForm(){
  const nameInput = document.getElementById('libraryNewName');
  const groupSelect = document.getElementById('libraryNewGroup');
  const name = nameInput ? nameInput.value.trim() : '';
  if(!name) return;
  addLibraryExercise(name, groupSelect ? groupSelect.value : '');
  if(nameInput) nameInput.value = '';
  libraryFilterText = '';
  renderExerciseLibrary();
}
// disegna tutto il contenuto della Libreria: campo di ricerca, filtri per
// gruppo, form per aggiungere un esercizio nuovo, e la lista risultante
function renderExerciseLibrary(){
  const body = document.getElementById('libraryBody');
  if(!body) return;
  const names = filteredExerciseNames(libraryFilterText, libraryFilterGroup);
  body.innerHTML = `
    <div class="meta-row"><span class="meta-label">Cerca</span><input class="meta-input" id="librarySearchInput" placeholder="Cerca un esercizio..." value="${escapeAttr(libraryFilterText)}" oninput="onLibrarySearchInput(this.value)"></div>
    ${renderGroupFilterChipsHtml(libraryFilterGroup, 'onLibraryGroupFilter')}
    <div class="exlib-add-form">
      <input class="meta-input" id="libraryNewName" placeholder="Nuovo esercizio...">
      <select class="exlib-group-select" id="libraryNewGroup">
        <option value="">Gruppo — facoltativo</option>
        ${MUSCLE_GROUPS.map(g=>`<option value="${g}">${escapeHtml(g)}</option>`).join('')}
      </select>
      <button class="add-ex small2" onclick="addExerciseFromLibraryForm()">+ Aggiungi</button>
    </div>
    ${renderExerciseRowsHtml(names, {editableGroup:true, removable:libraryEditMode, editableName:libraryEditMode})}
  `;
}
