// stato del bottone flottante "Giorno terminato" (vedi css .floating-finish-btn):
// funzione a parte invece che solo dentro renderActive(), perche' showView()
// deve poterlo ricalcolare anche quando si torna sulla tab Allenamento SENZA
// un vero re-render (es. dal tab in alto) - senza questo, il bottone poteva
// restare nascosto dall'ultima volta che si era su Home/Storico
function updateFloatingFinishBtn(){
  const floatBtn = document.getElementById('floatingFinishBtn');
  if(!floatBtn) return;
  const day = state.days[activeDayIdx];
  if(!day){ floatBtn.style.display = 'none'; return; }
  const showFloat = day.esercizi.length>0 && allExercisesClosed(day);
  floatBtn.style.display = showFloat ? '' : 'none';
  floatBtn.style.setProperty('--accent', dayAccent(day, activeDayIdx).c);
}
// stesso conteggio degli esercizi "chiusi" gia' usato altrove (allExercisesClosed,
// computeCurrentDoingExerciseIdx): una coppia collegata (super/jump set) conta
// come UN solo esercizio, essendo un'unica card - qui pero' serve anche la
// lista con l'indice di posizione (per l'indice rapido sotto)
function computeDayProgress(day){
  const w = state.currentWeek || 0;
  let total = 0, done = 0;
  const items = [];
  for(let exi=0; exi<day.esercizi.length; exi++){
    const ex = day.esercizi[exi];
    if(ex.linkGroupId && day.esercizi[exi-1] && day.esercizi[exi-1].linkGroupId===ex.linkGroupId) continue;
    total++;
    const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
    const isDone = w>=nWeeks || (ex.weekDone && ex.weekDone[w]) || (ex.weekSkipped && ex.weekSkipped[w]);
    if(isDone) done++;
    items.push({ exi, pos: total, isDone });
  }
  return { total, done, items };
}
// si vede SUBITO entrando nel giorno, senza dover scrollare fino in fondo o
// aspettare che compaia il bottone flottante "Giorno terminato" (che scatta
// solo a tutti finiti) - non e' sticky apposta: impilare un altro elemento
// fisso sopra l'header sticky di ogni esercizio avrebbe richiesto ricalcolare
// --topbar-h (vedi updateTopbarHeightVar in js/app-init.js) e rischiava
// sovrapposizioni difficili da verificare in ogni caso reale
function renderDayProgressBar(progress, accent){
  if(progress.total===0) return '';
  const pct = Math.round((progress.done/progress.total)*100);
  return `<div class="day-progress-bar-wrap" style="--accent:${accent}">
    <div class="day-progress-label">${progress.done} di ${progress.total} esercizi di questa settimana</div>
    <div class="day-progress-track"><div class="day-progress-fill" style="width:${pct}%"></div></div>
  </div>`;
}
// solo sui giorni lunghi (6+ esercizi/coppie): un salto diretto invece di
// dover scrollare tutta la pagina per trovare un esercizio specifico
function renderExerciseJumpIndex(progress, accent){
  if(progress.total<6) return '';
  const dots = progress.items.map(it =>
    `<button class="ex-jump-dot ${it.isDone?'done':''}" style="--accent:${accent}" onclick="scrollToExerciseCard(${it.exi})" aria-label="Vai a esercizio ${it.pos}">${it.pos}</button>`
  ).join('');
  return `<div class="ex-jump-index">${dots}</div>`;
}
function scrollToExerciseCard(exi){
  // se la card e' chiusa e' display:none: prima la apro (stessa funzione
  // usata dal tocco sull'header), altrimenti non avrebbe una posizione reale
  // su cui scrollare. renderActive() la ricrea da zero, quindi la cerco di
  // nuovo DOPO invece di tenere il riferimento vecchio
  if(isExerciseCardCollapsed(activeDayIdx, exi)){
    collapsedMap[activeDayIdx+"_"+exi+"_card"] = false;
    saveCollapsed();
    renderActive();
  }
  const card = document.querySelector('#viewActive .card[data-exi="'+exi+'"], #viewActive .card[data-exi2="'+exi+'"]');
  if(!card) return;
  const wrap = card.closest('.ex-card-wrap') || card;
  const topbar = document.querySelector('.topbar');
  const stickyHeader = wrap.querySelector('.ex-sticky-header');
  const offset = (topbar ? topbar.getBoundingClientRect().height : 0) + (stickyHeader ? stickyHeader.getBoundingClientRect().height : 0) + 14;
  const rect = card.getBoundingClientRect();
  const target = window.scrollY + rect.top - offset;
  window.scrollTo({top: Math.max(0,target), behavior:'smooth'});
}
function renderActive(){
  const day = state.days[activeDayIdx];
  const a = dayAccent(day, activeDayIdx);
  const main = document.getElementById('viewActive');
  if(reorderMode){
    const floatBtn = document.getElementById('floatingFinishBtn');
    if(floatBtn) floatBtn.style.display = 'none';
    main.innerHTML = renderReorderList(day);
    return;
  }
  // se il giorno non ha ancora esercizi, un invito a aggiungerne uno invece
  // di lasciare la pagina vuota e basta
  const emptyState = day.esercizi.length===0 ? `<div class="empty-day">
      <div class="empty-day-title">Nessun esercizio ancora</div>
      <div class="empty-day-sub">Aggiungine uno per iniziare a costruire "${escapeHtml(day.name)}"</div>
    </div>` : '';
  const reorderBtn = day.esercizi.length>1 ? `<button class="add-ex" onclick="toggleReorderMode()">${ICON_REORDER} Modifica ordine</button>` : '';
const finishBtn = day.esercizi.length>0 ? `<button class="finish-day-btn" style="--accent:${a.c}" onclick="openFinishWorkoutModal(${activeDayIdx})">${ICON_CHECK} <span class="accent-shine">Giorno di allenamento terminato!</span></button>` : '';  const suggestedIdx = computeSuggestedDayIdx();

// piccolo banner pulsante invece del box grande di prima: deve vedersi
// SUBITO entrando nel giorno diverso da quello previsto, ma senza occupare
// spazio vero - tutto il banner e' cliccabile, un solo tocco per cambiare
const switchTrainingDay =
activeDayIdx !== suggestedIdx
?
`
<button class="switch-training-pill"
onclick="confirmSwitchTrainingDay(${activeDayIdx}, ${suggestedIdx})">
  ${ICON_WARNING} Previsto: ${escapeHtml(state.days[suggestedIdx].name)} — tocca per fare ${escapeHtml(day.name)} oggi
</button>
`
:
'';


  // gli esercizi "collegati" (super set/jump set, vedi piu' sotto) vengono
  // renderizzati insieme in un'unica card: quello che segue nell'array (il
  // partner) va saltato qui, e' gia' incluso dentro linkedExerciseCard
  let cardsHtml = '';
  for(let exi=0; exi<day.esercizi.length; exi++){
    const ex = day.esercizi[exi];
    if(ex.linkGroupId && day.esercizi[exi-1] && day.esercizi[exi-1].linkGroupId===ex.linkGroupId) continue;
    const partnerExi = (ex.linkGroupId && day.esercizi[exi+1] && day.esercizi[exi+1].linkGroupId===ex.linkGroupId) ? exi+1 : null;
    cardsHtml += partnerExi!==null ? linkedExerciseCard(ex, exi, day.esercizi[partnerExi], partnerExi, a) : exerciseCard(ex, exi, a);
  }
  const progress = computeDayProgress(day);
  const progressBarHtml = renderDayProgressBar(progress, a.c);
  const jumpIndexHtml = renderExerciseJumpIndex(progress, a.c);
  main.innerHTML = progressBarHtml + jumpIndexHtml + switchTrainingDay + emptyState + cardsHtml +
    `<div class="add-ex-row">
       <button class="add-ex" onclick="addExercise(${activeDayIdx})">+ Aggiungi esercizio</button>
       ${reorderBtn}
     </div>
     ${finishBtn}
     <button class="archive-btn" onclick="archiveAndReset()">${ICON_ARCHIVE} Archivia "${escapeHtml(state.title||'questo mese')}" e inizia un nuovo mese</button>`;
    autoGrowAllExNames();
    autoGrowAllExSchema();

  updateFloatingFinishBtn();

  if(typeof gsap !== "undefined" && activeFirstAnimation){
  activeFirstAnimation = false;

  gsap.from("#viewActive .card", {
    y:35,
    opacity:0,
    duration:0.55,
    stagger:0.12,
    ease:"power2.out"
  });
}
}

// ---------------- RIORDINO ESERCIZI ----------------
// modalita' dedicata (solo nome + frecce, niente editing dei dati): finche' non
// premi "Conferma" il nuovo ordine resta solo in memoria, mai scritto su
// localStorage, cosi' cambiare idea a meta' non lascia nulla di salvato a meta'
let reorderMode = false;
let reorderDirty = false;
let reorderBackup = null;
function toggleReorderMode(){
  if(reorderMode){
    reorderMode = false;
    reorderBackup = null;
  } else {
    reorderBackup = state.days[activeDayIdx].esercizi.slice();
    reorderMode = true;
    reorderDirty = false;
  }
  renderActive();
}
// chiamata quando si esce dalla scheda attiva (cambio giorno o tab Storico)
// mentre c'e' un riordino non ancora confermato: lo scarta silenziosamente
function discardReorderIfPending(){
  if(reorderMode && reorderDirty && reorderBackup){
    state.days[activeDayIdx].esercizi = reorderBackup;
  }
  reorderMode = false;
  reorderDirty = false;
  reorderBackup = null;
}
// una coppia di esercizi collegati (super set/jump set) va spostata sempre
// insieme, mai separata: qui si raggruppano in "blocchi" (1 esercizio, o 2 se
// collegati) e il riordino si fa scambiando blocchi interi, non singoli indici
function computeExerciseBlocks(day){
  const blocks = [];
  for(let i=0;i<day.esercizi.length;i++){
    const ex = day.esercizi[i];
    if(ex.linkGroupId && day.esercizi[i-1] && day.esercizi[i-1].linkGroupId===ex.linkGroupId) continue;
    const partner = (ex.linkGroupId && day.esercizi[i+1] && day.esercizi[i+1].linkGroupId===ex.linkGroupId) ? i+1 : null;
    blocks.push(partner!==null ? [i, partner] : [i]);
  }
  return blocks;
}
function moveExerciseBlock(blockIdx, delta){
  const day = state.days[activeDayIdx];
  const blocks = computeExerciseBlocks(day);
  const targetIdx = blockIdx + delta;
  if(targetIdx<0 || targetIdx>=blocks.length) return;
  const list = day.esercizi;
  const blockA = blocks[blockIdx].map(i=>list[i]);
  const blockB = blocks[targetIdx].map(i=>list[i]);
  // toglie entrambi i blocchi (dagli indici piu' alti ai piu' bassi, per non
  // sballarsi da soli togliendo) e li reinserisce scambiati di posto
  const allIdx = [...blocks[blockIdx], ...blocks[targetIdx]].sort((x,y)=>y-x);
  allIdx.forEach(i=> list.splice(i,1));
  const insertAt = Math.min(...blocks[blockIdx], ...blocks[targetIdx]);
  const ordered = delta>0 ? [...blockB, ...blockA] : [...blockA, ...blockB];
  list.splice(insertAt, 0, ...ordered);
  reorderDirty = true;
  renderActive();
}
function confirmReorderOrder(){
  if(!confirm('Confermi il nuovo ordine degli esercizi?')) return;
  reorderMode = false;
  reorderDirty = false;
  reorderBackup = null;
  saveState();
  renderActive();
}
function renderReorderList(day){
  if(!day.esercizi.length){
    return '<div class="empty-day"><div class="empty-day-title">Nessun esercizio da riordinare</div></div>';
  }
  const blocks = computeExerciseBlocks(day);
  const lastBlockIdx = blocks.length-1;
  const rows = blocks.map((block, bi)=>{
    const upBtn = bi>0 ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},-1)" aria-label="Sposta su">▲</button>` : '';
    const downBtn = bi<lastBlockIdx ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},1)" aria-label="Sposta giù">▼</button>` : '';
    const names = block.map(i=>escapeHtml(day.esercizi[i].nome || '(senza nome)')).join(' + ');
    return `<div class="reorder-row">
      <span class="reorder-name">${names}</span>
      <div class="reorder-arrows">${upBtn}${downBtn}</div>
    </div>`;
  }).join('');
  const btn = reorderDirty
    ? `<button class="add-ex small2" style="border-color:var(--green);color:var(--green);" onclick="confirmReorderOrder()">${ICON_CHECK} Conferma nuovo ordine</button>`
    : `<button class="add-ex small2" onclick="toggleReorderMode()">${ICON_CLOSE} Chiudi modifica ordine</button>`;
  return `<div class="reorder-banner">Tocca le frecce per spostare un esercizio, poi conferma</div>${rows}${btn}`;
}

function updateTitles(){
document.getElementById('tabActiveLabel').textContent = state.title || "Allenamento";}

// suggerisce il prossimo titolo incrementando l'ultimo numero trovato (es. "WO 18" -> "WO 19");
// se non c'e' nessun numero nel titolo attuale, ripiega su un nome generico
function suggestNextTitle(t){
  const m = /^(.*?)(\d+)(\D*)$/.exec(t || "");
  if(m){ return m[1] + (parseInt(m[2],10)+1) + m[3]; }
  return (t || "WO") + " nuovo";
}

function archiveAndReset(){
  const archiveName = prompt("Con che nome salvare questo mese nello Storico?", state.title || "WO");
  if(archiveName === null || !archiveName.trim()) return;
  const newTitle = prompt("Nome del nuovo mese che stai per iniziare?", suggestNextTitle(state.title));
  if(newTitle === null || !newTitle.trim()) return;
  // richiesto a ogni nuovo blocco (non solo la primissima volta), precompilato
  // con l'ultimo valore usato: cosi' si puo' cambiare durata da un blocco
  // all'altro senza doverla lasciare per forza fissa a quella iniziale
  let weeksVal = prompt("Quante settimane durerà il nuovo blocco?", String(state.weeksPerBlock||4));
  if(weeksVal === null) return;
  let weeksN = parseInt(String(weeksVal).replace(',','.'), 10);
  if(isNaN(weeksN) || weeksN<1) weeksN = state.weeksPerBlock||4;
  if(weeksN>12) weeksN = 12;
  if(!confirm(`Salvo "${archiveName}" nello Storico e azzero pesi/ripetizioni per iniziare "${newTitle}" (${weeksN} settimane). Nome esercizi, recupero e schema restano come base di partenza. Continuare?`)) return;

  storicoExtra[archiveName.trim()] = JSON.parse(JSON.stringify(state.days));
  saveStorico();
  storicoDates[archiveName.trim()] = todayKey();
  saveStoricoDates();
  checkAchievements(); // va fatto ORA: valuta anche "zero settimane saltate" sul blocco appena archiviato, prima che state venga azzerato qui sotto

  const newDays = state.days.map(d => ({
    name: d.name,
    esercizi: d.esercizi.map(ex => ({
      nome: ex.nome, commento: ex.commento,
      recupero: resizeArr(ex.recupero, weeksN, ''), schema: resizeArr(ex.schema, weeksN, ''),
      sets: Array.from({length:weeksN}, (_,i) => (ex.sets && ex.sets[i] ? ex.sets[i].map(()=>({peso:'',rip:''})) : []))
    }))
  }));
state = { 
  title: newTitle.trim(), 
  days: newDays, 
  programStartDate: todayKey(), 
  weeksPerBlock: weeksN,
  currentTrainingDayIdx: null,
  trainingQueue: newDays.map((_,i)=>i)
};
saveState();

  collapsedMap = {};
  saveCollapsed();

  activeDayIdx = 0;
  updateTitles();
  renderDayTabs();
  renderActive();
  renderHistList();
  alert(`Fatto! "${archiveName.trim()}" è ora nello Storico. Hai iniziato "${newTitle.trim()}".`);
}

// il suggerimento compare SOLO nella settimana subito dopo una segnata come
// completata (vedi toggleWeekDone/il quadratino con la spunta): se la
// settimana precedente non e' stata completata, niente suggerimento, anche
// se in una settimana ancora prima ci fossero gia' dei pesi
// il valore della settimana scorsa va ripreso cosi' com'e' stato scritto,
// non riparsato a numero: chi scrive "4,5p" ci mette apposta anche la lettera
// (fallimento, presa, tecnica...) e perderla nel suggerimento farebbe perdere
// anche il significato, non solo la formattazione
function suggestNextWeight(ex, w, si){
  if(w===0) return null;
  if(!(ex.weekDone && ex.weekDone[w-1])) return null;
  const s = ex.sets && ex.sets[w-1] && ex.sets[w-1][si];
  if(!s || s.peso===undefined || s.peso===null) return null;
  const raw = String(s.peso).trim();
  return raw==='' ? null : raw;
}
// stessa idea di suggestNextWeight ma per le righe "Max": se la settimana
// scorsa il Max era compilato, la nuova settimana lo apre gia' con quel peso
// come suggerimento (placeholder, non un valore vero e proprio finche' non lo
// si conferma scrivendoci sopra)
function suggestNextMaxWeight(ex, w, mi){
  if(w===0) return null;
  if(!(ex.weekDone && ex.weekDone[w-1])) return null;
  const m = ex.maxExtra && ex.maxExtra[w-1] && ex.maxExtra[w-1][mi];
  if(!m || m.peso===undefined || m.peso===null) return null;
  const raw = String(m.peso).trim();
  return raw==='' ? null : raw;
}
function exerciseCard(ex, exi, accent){

  const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);

  const record = getRecordForExercise(ex.nome);
  const recordAttr = record ? record.peso : 'null';
  const cardCollapsed = isExerciseCardCollapsed(activeDayIdx, exi);


  const weeksHtml = weeks.map(w=>{


    const currentWeek = state.currentWeek || 0;

    const isCurrentWeek = w === currentWeek;
    const isPastWeek = w < currentWeek;
    const isFutureWeek = w > currentWeek;

    const isReadOnlyWeek = isPastWeek;


    const sets = ex.sets && ex.sets[w] ? ex.sets[w] : [];


    const setRows = (sets.length ? sets : [
      {peso:'',rip:''},
      {peso:'',rip:''},
      {peso:'',rip:''},
      {peso:'',rip:''}
    ]).map((s,si)=>{


      const roman = ["I","II","III","IV","V","VI","VII","VIII"][si] || (si+1);


      const suggestedKg = (!s.peso && s.peso!==0)
      ? suggestNextWeight(ex,w,si)
      : null;


      const kgPlaceholder = suggestedKg!==null
      ? ('ultimo peso: '+suggestedKg)
      : 'kg';



      return `
      <div class="set-row">


        <div class="set-label">${roman}</div>


        <div class="kg-wrap">


          <div class="stepper-pair">

            <button class="stepper"
            ${isReadOnlyWeek?'disabled':''}
            onclick="stepSet(${exi},${w},${si},-2.5,this)">
            −
            </button>


            <button class="stepper"
            ${isReadOnlyWeek?'disabled':''}
            onclick="stepSet(${exi},${w},${si},2.5,this)">
            +
            </button>


          </div>



          <input class="set-input"
          ${isReadOnlyWeek?'disabled':''}
          onpointerdown="onSetInputPointerDown(event,this)"
          onpointermove="onSetInputPointerMove(event)"
          onpointerup="onSetInputPointerCancel()"
          onpointerleave="onSetInputPointerCancel()"
          onpointercancel="onSetInputPointerCancel()"
          onblur="resetFieldKeyboard(this)"
          oninput="scheduleAutoAdvance(this)"
          inputmode="decimal"
          placeholder="${kgPlaceholder}"
          value="${escapeAttr(s.peso ?? '')}"
          onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr})">


        </div>



        <input class="set-input"
        ${isReadOnlyWeek?'disabled':''}
        onpointerdown="onSetInputPointerDown(event,this)"
        onpointermove="onSetInputPointerMove(event)"
        onpointerup="onSetInputPointerCancel()"
        onpointerleave="onSetInputPointerCancel()"
        onpointercancel="onSetInputPointerCancel()"
        onblur="resetFieldKeyboard(this)"
        inputmode="numeric"
        placeholder="rip"
        value="${escapeAttr(s.rip ?? '')}"
        onchange="updateSet(${exi},${w},${si},'rip',this.value)">



      </div>`;
    }).join('');



    const wkey = activeDayIdx+"_"+exi+"_"+w;


    const isCompletedWeek =
      state.completedWeeks &&
      state.completedWeeks.includes(w);



    const isCollapsed = isCurrentWeek ? false : true;



    const weekDone = !!(ex.weekDone && ex.weekDone[w]);
    const weekSkipped = !!(ex.weekSkipped && ex.weekSkipped[w]);



    const maxRaw = (ex.maxExtra && ex.maxExtra[w]) || [];

    const maxPair = [
      maxRaw[0]||{},
      maxRaw[1]||{}
    ];



    const maxShown = !!(ex.maxShown && ex.maxShown[w]);

    const maxSuggested = [
      (!maxPair[0].peso && maxPair[0].peso!==0) ? suggestNextMaxWeight(ex,w,0) : null,
      (!maxPair[1].peso && maxPair[1].peso!==0) ? suggestNextMaxWeight(ex,w,1) : null
    ];
    const maxKgPlaceholder = [
      maxSuggested[0]!==null ? ('ultimo: '+maxSuggested[0]) : 'max kg',
      maxSuggested[1]!==null ? ('ultimo: '+maxSuggested[1]) : 'max kg'
    ];

    const maxRowHtml = maxShown ? `

    <div class="set-row max-row">


      <div></div>


      <div class="max-cell">


        <input class="set-input max-input"
        ${isReadOnlyWeek?'disabled':''}
        onpointerdown="onSetInputPointerDown(event,this)"
        onpointermove="onSetInputPointerMove(event)"
        onpointerup="onSetInputPointerCancel()"
        onpointerleave="onSetInputPointerCancel()"
        onpointercancel="onSetInputPointerCancel()"
        onblur="resetFieldKeyboard(this)"
        inputmode="decimal"
        placeholder="${maxKgPlaceholder[0]}"
        value="${escapeAttr(maxPair[0].peso??'')}"
        onchange="updateMax(${exi},${w},0,'peso',this.value)">



        <input class="set-input max-input"
        ${isReadOnlyWeek?'disabled':''}
        onpointerdown="onSetInputPointerDown(event,this)"
        onpointermove="onSetInputPointerMove(event)"
        onpointerup="onSetInputPointerCancel()"
        onpointerleave="onSetInputPointerCancel()"
        onpointercancel="onSetInputPointerCancel()"
        onblur="resetFieldKeyboard(this)"
        inputmode="decimal"
        placeholder="${maxKgPlaceholder[1]}"
        value="${escapeAttr(maxPair[1].peso??'')}"
        onchange="updateMax(${exi},${w},1,'peso',this.value)">


      </div>



      <div class="max-cell">


        <input class="set-input max-input"
        ${isReadOnlyWeek?'disabled':''}
        onpointerdown="onSetInputPointerDown(event,this)"
        onpointermove="onSetInputPointerMove(event)"
        onpointerup="onSetInputPointerCancel()"
        onpointerleave="onSetInputPointerCancel()"
        onpointercancel="onSetInputPointerCancel()"
        onblur="resetFieldKeyboard(this)"
        inputmode="numeric"
        placeholder="max rip"
        value="${escapeAttr(maxPair[0].rip??'')}"
        onchange="updateMax(${exi},${w},0,'rip',this.value)">



        <input class="set-input max-input"
        ${isReadOnlyWeek?'disabled':''}
        onpointerdown="onSetInputPointerDown(event,this)"
        onpointermove="onSetInputPointerMove(event)"
        onpointerup="onSetInputPointerCancel()"
        onpointerleave="onSetInputPointerCancel()"
        onpointercancel="onSetInputPointerCancel()"
        onblur="resetFieldKeyboard(this)"
        inputmode="numeric"
        placeholder="max rip"
        value="${escapeAttr(maxPair[1].rip??'')}"
        onchange="updateMax(${exi},${w},1,'rip',this.value)">


      </div>


    </div>


    ` : '';



    return `

    <div class="week-block">


      <button class="week-toggle
      ${isCollapsed?'collapsed':''}
      ${weekDone?'done':''}
      ${weekSkipped?'skipped':''}
      ${isCurrentWeek?'current-week':''}
      ${isCompletedWeek?'completed-week':''}
      ${isFutureWeek?'future-week':''}"
      style="background:${accent.d}"
      ${isFutureWeek ? `ondblclick="toggleWeek(this,'${wkey}',${w})"` : `onclick="toggleWeek(this,'${wkey}',${w})"`}>


        <span>

        ${
  isCompletedWeek
  ? ICON_CHECK+' '
  : isCurrentWeek
    ? ICON_FLAME+' '
    : isFutureWeek
      ? ICON_LOCK+' '
      : ''
}

        SETTIMANA ${w+1}${weekSkipped?' — saltata':''}${weekDone && ex.schema[w] ? ` <span class="week-toggle-schema">(${escapeHtml(ex.schema[w])})</span>` : ''}

        </span>


        <span class="chev">▾</span>


      </button>



      <div class="week-body ${isCollapsed?'collapsed':''}">
      <input class="week-note"
      ${isReadOnlyWeek?'disabled':''}
      placeholder="nota settimana (facoltativo)"
      value="${escapeAttr((ex.weekNote && ex.weekNote[w]) ?? '')}"
      onchange="updateWeekNote(${exi},${w},this.value)">

      ${isCurrentWeek && !weekDone && !weekSkipped ? (()=>{ const hint = computeProgressionHint(ex, w); return hint ? `<div class="progression-hint">${escapeHtml(hint.text)} ${hint.icon}</div>` : ''; })() : ''}

      <div class="meta-row-schema">
        <span class="meta-label small">Serie</span>
        <div class="meta-field-center">
          <textarea class="meta-input schema" rows="1"
          ${isReadOnlyWeek?'disabled':''}
          oninput="autoGrowTextarea(this);autoWidthSchema(this)"
          onchange="updateMeta(${exi},'schema',${w},this.value)">${escapeHtml(ex.schema[w]??'')}</textarea>
        </div>
      </div>

      <div class="meta-row meta-row-combined">

        <div class="meta-group">
          <span class="meta-label small">Rec.</span>
          <div class="meta-field-center">
            <div class="combo-wrap">
              <input class="meta-input"
              ${isReadOnlyWeek?'disabled':''}
              placeholder="—"
              value="${escapeAttr(ex.recupero[w]??'')}"
              oninput="onComboInput(this,'recuperi')"
              onfocus="onComboFocus(this,'recuperi')"
              onchange="updateMeta(${exi},'recupero',${w},this.value)">
            </div>
          </div>
        </div>

      </div>

      <div class="sets-wrap">

        ${setRows}

      </div>




      ${maxRowHtml}





      <div class="set-btns">



        <div class="week-done-wrap">

          <div class="week-status-col">
            <span class="week-done-label">completata</span>
            <button class="week-done-btn ${weekDone?'checked':''}"
            data-exi="${exi}" data-w="${w}"
            ${isReadOnlyWeek?'disabled':''}
            onclick="toggleWeekDone(${exi},${w})">
            ${ICON_CHECK}
            </button>
          </div>

          <div class="week-status-col">
            <span class="week-done-label">saltata</span>
            <button class="week-skip-btn ${weekSkipped?'checked':''}"
            data-exi="${exi}" data-w="${w}"
            ${isReadOnlyWeek?'disabled':''}
            onclick="toggleWeekSkipped(${exi},${w})">
            ⏭
            </button>
          </div>

        </div>

        <div class="set-btns-secondary">

          <button class="max-toggle"
          ${isReadOnlyWeek?'disabled':''}
          onclick="toggleMax(${exi},${w})">

          ${maxShown?'nascondi max':'max'}

          </button>


        <div class="set-btns-right">


          <button class="add-ex small"
          ${isReadOnlyWeek?'disabled':''}
          onclick="addSet(${exi},${w})">

          + serie

          </button>




          <button class="add-ex small danger"
          ${isReadOnlyWeek?'disabled':''}
          onclick="removeSet(${exi},${w})">

          − serie

          </button>



        </div>

        </div>



      </div>



    </div>



    </div>`;



  }).join('');




  const prBadge = record
  ? `<div class="pr-badge">${ICON_TROPHY} Record: ${escapeHtml(String(record.peso))} kg${record.rip?' × '+escapeHtml(String(record.rip)):''}</div>`
  : '';




  return `

  <div class="ex-card-wrap" style="--accent:${accent.c}">
  <div class="ex-sticky-header ${cardCollapsed?'collapsed':''}" id="stickyHeader-${exi}"
  onpointerdown="onStickyPointerDown(event,${exi})" onpointermove="onStickyPointerMove(event)" onpointerup="onStickyPointerCancel()" onpointerleave="onStickyPointerCancel()" onpointercancel="onStickyPointerCancel()"
  onclick="handleStickyHeaderClick(${exi})" ondblclick="startEditStickyName(${exi})">${escapeHtml(ex.nome||'Esercizio')}<span class="ex-collapse-chev">▾</span></div>
  <div class="card ${cardCollapsed?'ex-collapsed':''}" data-exi="${exi}" style="--accent:${accent.c}">


    <div class="card-head">


      <button class="ex-more-btn" onclick="openExerciseContextMenu(${exi}, '${escapeJs(ex.nome||'')}')" title="Altre azioni" aria-label="Altre azioni">${ICON_MORE}</button>


      ${prBadge}




      

<textarea
class="ex-comment"
rows="1"
placeholder="Note / tecnica (facoltativo)"
onchange="updateComment(${exi},this.value)">${escapeHtml(ex.commento || '')}
</textarea>



    </div>




    <div class="weeks">

    ${weeksHtml}

    </div>




  </div>
  </div>`;



}

// apri/chiudi un blocco settimana: tocca solo le classi CSS (niente renderActive,
// sennò si perderebbe subito lo scroll), e ricorda lo stato aperto/chiuso per quando si
// ridisegna la pagina altre volte
function toggleWeek(btn, key, weekIdx){

  const nowCollapsed = btn.classList.toggle('collapsed');

  btn.nextElementSibling.classList.toggle('collapsed');

  collapsedMap[key] = nowCollapsed;

  saveCollapsed();

}

// stesso principio del collasso per settimana qui sopra, ma un livello piu'
// su: ogni CARD esercizio puo' essere chiusa o aperta. Di default resta
// aperta solo quella su cui si sta davvero lavorando (vedi
// computeCurrentDoingExerciseIdx in js/navigation.js), le altre partono
// chiuse - su un giorno con tanti esercizi la pagina resta leggera invece di
// scorrere tutto aperto. Riusa collapsedMap con una chiave diversa da quelle
// delle settimane (suffisso "_card" non numerico, non puo' scontrarsi con un
// indice di settimana vero)
function isExerciseCardCollapsed(dayIdx, exi){
  const key = dayIdx+"_"+exi+"_card";
  if(key in collapsedMap) return !!collapsedMap[key];
  return exi !== computeCurrentDoingExerciseIdx(dayIdx);
}
function toggleExerciseCollapse(exi){
  const key = activeDayIdx+"_"+exi+"_card";
  collapsedMap[key] = !isExerciseCardCollapsed(activeDayIdx, exi);
  saveCollapsed();
  renderActive();
}
// distingue un tocco singolo (apri/chiudi la card) da un doppio tocco
// (rinomina l'esercizio, vedi startEditStickyName/startEditLinkedSticky piu'
// sotto): senza questo, ogni doppio click farebbe scattare ANCHE il
// collasso, non solo la rinomina - il secondo click arrivato in tempo (entro
// la soglia) annulla il collasso e lascia fare tutto a ondblclick
let stickyClickTimer = null;
function handleStickyHeaderClick(exi){
  // una pressione prolungata (menu contestuale, vedi sotto) finisce comunque
  // con un pointerup/click nativo del browser: se e' gia' scattata lei, il
  // click che segue va ignorato, non deve ANCHE aprire/chiudere la card
  if(stickyGesture.longFired){ stickyGesture.longFired = false; return; }
  if(stickyClickTimer){
    clearTimeout(stickyClickTimer);
    stickyClickTimer = null;
    return;
  }
  stickyClickTimer = setTimeout(()=>{
    stickyClickTimer = null;
    toggleExerciseCollapse(exi);
  }, 250);
}
// pressione prolungata sul nome esercizio: apre un menu contestuale con le
// stesse azioni gia' nelle iconcine della card (Elimina, Grafico, Calcola
// dischi, Collega) - piu' comodo da mirare col dito che 4 iconcine minuscole.
// Solo sulla card SOLO (non su quella di una coppia collegata: li' le azioni
// sono gia' sdoppiate su due righe separate, meno affollate, e "a quale dei
// due esercizi si riferirebbe" sarebbe ambiguo per un solo gesto)
let stickyGesture = { longTimer:null, startX:0, startY:0, longFired:false };
function onStickyPointerDown(e, exi){
  stickyGesture.startX = e.clientX;
  stickyGesture.startY = e.clientY;
  stickyGesture.longFired = false;
  clearTimeout(stickyGesture.longTimer);
  stickyGesture.longTimer = setTimeout(()=>{
    stickyGesture.longFired = true;
    const ex = state.days[activeDayIdx].esercizi[exi];
    openExerciseContextMenu(exi, ex ? ex.nome : '');
  }, 500);
}
function onStickyPointerMove(e){
  const dx = Math.abs(e.clientX-stickyGesture.startX), dy = Math.abs(e.clientY-stickyGesture.startY);
  if(dx>10 || dy>10) clearTimeout(stickyGesture.longTimer);
}
function onStickyPointerCancel(){
  clearTimeout(stickyGesture.longTimer);
}
function openExerciseContextMenu(exi, exName){
  closeExerciseContextMenu();
  const el = document.createElement('div');
  el.id = 'exContextMenu';
  el.className = 'modal-overlay ex-context-overlay';
  el.onclick = (e) => { if(e.target===el) closeExerciseContextMenu(); };
  el.innerHTML = `
    <div class="ex-context-sheet">
      <div class="ex-context-title">${escapeHtml(exName||'Esercizio')}</div>
      <button class="ex-context-action" onclick="closeExerciseContextMenu();openChart(${exi})">${ICON_CHART} Grafico progressione</button>
      <button class="ex-context-action" onclick="closeExerciseContextMenu();openPlateCalc(${exi})">${ICON_PLATE} Calcola dischi bilanciere</button>
      <button class="ex-context-action" onclick="closeExerciseContextMenu();openLinkPicker(${exi})">${ICON_LINK} Collega esercizio</button>
      <button class="ex-context-action danger" onclick="closeExerciseContextMenu();deleteExercise(${exi})">${ICON_TRASH} Elimina esercizio</button>
    </div>
    <button class="ex-context-cancel" onclick="closeExerciseContextMenu()">Annulla</button>
  `;
  document.body.appendChild(el);
  vibrate(20);
}
function closeExerciseContextMenu(){
  const el = document.getElementById('exContextMenu');
  if(el) el.remove();
}


function updateName(exi, val){
  state.days[activeDayIdx].esercizi[exi].nome = val;
  saveState();
}
// ---------------- MODIFICA NOME DALL'HEADER STICKY ----------------
// il campo nome dentro la card era ridondante con l'header sticky (che resta
// visibile scorrendo, quindi e' gia' piu' comodo): la modifica vera e propria
// vive solo qui ora. Un solo tocco non fa nulla apposta (per non aprirla per
// sbaglio scrollando o toccando l'header), serve il doppio tocco - stessa
// logica gia' usata per le settimane future (vedi week-toggle.future-week)
function startEditStickyName(exi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const header = document.getElementById('stickyHeader-'+exi);
  if(!header || !ex) return;
  header.classList.add('editing');
  header.innerHTML = `<div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
    oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
    onfocus="onComboFocus(this,'esercizi')"
    onblur="finishEditStickyName(${exi})"
    onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome??'')}</textarea></div>`;
  const ta = header.querySelector('textarea');
  ta.focus();
  const len = ta.value.length; ta.setSelectionRange(len,len);
}
// il salvataggio vero lo fa gia' l'onchange (updateName): qui si torna solo
// alla scritta statica, rileggendo il nome aggiornato dallo stato
function finishEditStickyName(exi){
  const header = document.getElementById('stickyHeader-'+exi);
  if(!header) return;
  header.classList.remove('editing');
  const ex = state.days[activeDayIdx].esercizi[exi];
  header.textContent = (ex && ex.nome) || 'Esercizio';
}
// stessa idea per gli esercizi collegati, ma con tre righe (esercizio A / tipo
// di collegamento / esercizio B) invece del vecchio "A + B" su una riga sola:
// qui il doppio tocco serve anche a capire QUALE dei due si sta modificando,
// mostrandoli entrambi con un campo a testa invece di dover indovinare da che
// meta' del testo si e' toccato
function startEditLinkedSticky(exiA, exiB){
  const day = state.days[activeDayIdx];
  const exA = day.esercizi[exiA], exB = day.esercizi[exiB];
  const header = document.getElementById('stickyHeaderLinked-'+exiA);
  if(!header || !exA || !exB) return;
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  header.classList.add('editing');
  header.innerHTML = `
    <div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
      oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
      onfocus="onComboFocus(this,'esercizi')"
      onchange="updateName(${exiA},this.value)">${escapeHtml(exA.nome??'')}</textarea></div>
    <button class="ex-sticky-linktype-btn" onclick="openLinkPicker(${exiA})">${typeLabel}</button>
    <div class="combo-wrap"><textarea class="ex-sticky-name-input" rows="1"
      oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)"
      onfocus="onComboFocus(this,'esercizi')"
      onchange="updateName(${exiB},this.value)">${escapeHtml(exB.nome??'')}</textarea></div>
    <button class="ex-sticky-confirm-btn" onclick="finishEditLinkedSticky(${exiA},${exiB})">${ICON_CHECK} Conferma</button>
  `;
}
// niente onblur qui apposta: passare dal primo campo al secondo (o al bottone
// del tipo di collegamento) farebbe scattare il blur del primo prima ancora
// di aver finito - si chiude solo quando si preme davvero "Conferma"
function finishEditLinkedSticky(exiA, exiB){
  const header = document.getElementById('stickyHeaderLinked-'+exiA);
  if(!header) return;
  header.classList.remove('editing');
  renderStickyLinkedDisplay(header, exiA, exiB);
}
function renderStickyLinkedDisplay(header, exiA, exiB){
  const day = state.days[activeDayIdx];
  const exA = day.esercizi[exiA], exB = day.esercizi[exiB];
  if(!exA || !exB) return;
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  header.innerHTML = `<div class="ex-sticky-line">${escapeHtml(exA.nome||'Esercizio')}</div><div class="ex-sticky-line ex-sticky-linktype">${escapeHtml(typeLabel)}</div><div class="ex-sticky-line">${escapeHtml(exB.nome||'Esercizio')}</div>`;
}
function updateComment(exi, val){
  state.days[activeDayIdx].esercizi[exi].commento = val;
  saveState();
}
function updateMeta(exi, field, w, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  ex[field][w] = val;
  // le settimane successive seguono quella appena modificata (comoda scrittura
  // in cascata), finche' non vengono a loro volta modificate a mano: da li'
  // in poi e' quella modifica manuale a propagarsi in avanti
  for(let k=w+1;k<ex[field].length;k++){ ex[field][k] = val; }
  if(w<ex[field].length-1) renderActive();
  saveState();
}
// nota libera per la singola settimana, senza cascata: a differenza di
// recupero/schema qui ogni settimana resta indipendente dalle altre
function updateWeekNote(exi, w, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekNote) ex.weekNote=emptyStrArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  ex.weekNote[w] = val;
  saveState();
}
function updateSet(exi, w, si, field, val, recordPeso){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  ex.sets[w][si][field]=val;
  saveState();
  if(field==='peso' && recordPeso!==undefined && recordPeso!==null){
    const p = parseFloat(String(val).replace(',','.'));
    if(!isNaN(p) && p>recordPeso){
      celebratePR();
      bumpAchievCounter('prCount');
      checkAchievements();
    }
  }
  // scrivere le rip nell'ultima serie della settimana e' di solito il segnale
  // che quella settimana e' finita: lo chiediamo subito invece di aspettare
  // che l'utente vada a cercare il tasto "completata" a parte. Non se ha
  // aperto il riquadro "max" per questa settimana: vuol dire che vuole ancora
  // registrare un tentativo di massimale, non ha finito per davvero
  const maxOpenHere = ex.maxShown && ex.maxShown[w];
  const lastSetJustFilled = field==='rip' && String(val||'').trim()!=='' && si===ex.sets[w].length-1 && !(ex.weekDone && ex.weekDone[w]) && !maxOpenHere;
  if(lastSetJustFilled){
    // esercizio collegato (super/jump set): finire di scrivere il PRIMO dei
    // due non basta, la conferma deve aspettare che anche il partner abbia
    // l'ultima serie compilata - altrimenti scatta troppo presto, prima
    // ancora di aver registrato il secondo esercizio della coppia
    const partner = findLinkedPartner(exi);
    const partnerReady = !partner || isLastSetOfWeekFilled(partner.ex, w);
    if(partnerReady) askWeekDoneConfirm(exi, w, ex.nome);
  }
}
function isLastSetOfWeekFilled(ex, w){
  const sets = ex.sets && ex.sets[w];
  if(!sets || !sets.length) return false;
  const last = sets[sets.length-1];
  return !!(last && String(last.rip||'').trim() !== '');
}
// modale dell'app al posto del confirm() nativo del browser: quello di sistema
// non segue lo stile dell'app ed e' capitato apparisse ancora con la tastiera
// aperta sopra, illeggibile - qui si chiude prima la tastiera (blur) e si apre
// un modale vero, sempre visibile e leggibile
let weekDoneConfirmTarget = null;
function askWeekDoneConfirm(exi, w, exName){
  weekDoneConfirmTarget = {exi, w};
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  // titolo con settimana + nome esercizio ben in vista (prima diceva solo
  // "Settimana finita?", il nome stava solo nel sottotitolo piu' piccolo e
  // sembrava riferirsi a tutto l'allenamento invece che a questo esercizio)
  document.getElementById('weekDoneModalBody').innerHTML = `
    <div class="finish-title" style="font-size:20px;">${ICON_CHECK} Settimana ${w+1} di "${escapeHtml(exName||'questo esercizio')}"</div>
    <div class="finish-subtitle" style="font-size:14px;">Segnarla come completata?</div>
    <div class="finish-buttons">
      <button class="add-ex small2" onclick="closeWeekDoneConfirm(false)">No, non ancora</button>
      <button class="add-ex small2" style="border-color:var(--green);color:var(--green);" onclick="closeWeekDoneConfirm(true)">Sì, fatta ${ICON_CHECK}</button>
    </div>
  `;
  const modal = document.getElementById('weekDoneModal');
  // il blur() sopra puo' impiegare un istante a far richiudere la tastiera:
  // il piccolo ritardo evita che il modale si apra ancora mentre la vista si
  // sta ridimensionando, che lo farebbe comparire storto/troppo in alto
  setTimeout(()=>{
    modal.style.display = 'flex';
    if(typeof gsap !== 'undefined'){
      gsap.fromTo('#weekDoneModal .finish-modal', {y:40,opacity:0,scale:.95}, {y:0,opacity:1,scale:1,duration:.35,ease:'back.out(1.5)'});
    }
  }, 150);
}
function closeWeekDoneConfirm(confirmed){
  document.getElementById('weekDoneModal').style.display = 'none';
  const target = weekDoneConfirmTarget;
  weekDoneConfirmTarget = null;
  if(!confirmed || !target) return;
  toggleWeekDone(target.exi, target.w);
  // esercizi collegati: il bottone "completata" manuale segna sempre ENTRAMBI
  // insieme (vedi linkedExerciseCard) - se si scriveva nel secondo dei due il
  // partner restava non segnato, e la casella visualizzata (che legge lo
  // stato del primo) sembrava non essersi spuntata anche confermando "si'"
  const partner = findLinkedPartner(target.exi);
  if(partner) toggleWeekDone(partner.exi, target.w);
}
function stepSet(exi, w, si, delta, btn){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.sets[w]) ex.sets[w]=[];
  while(ex.sets[w].length<=si) ex.sets[w].push({peso:'',rip:''});
  let cur = parseFloat(String(ex.sets[w][si].peso).replace(',','.'));
  if(isNaN(cur)) cur = 0;
  let next = Math.max(0, Math.round((cur+delta)*10)/10);
  const record = getRecordForExercise(ex.nome);
  ex.sets[w][si].peso = next;
  const input = btn.closest('.kg-wrap').querySelector('.set-input');
  if(input) input.value = next;
  saveState();
  if(record && next>record.peso){
    celebratePR();
    bumpAchievCounter('prCount');
    checkAchievements();
  }
}
// il riquadro "max" ha lo stesso spirito a cascata di recupero/schema: espandendolo
// in una settimana si espande anche in quelle dopo. Nascondendolo pero' NON si
// nasconde nelle settimane successive che hanno gia' dei dati inseriti, altrimenti
// si perderebbero di vista senza cancellarli davvero
function maxHasData(ex, w){
  const pair = (ex.maxExtra && ex.maxExtra[w]) || [];
  return pair.some(m=> m && (String(m.peso||'').trim() || String(m.rip||'').trim()));
}
function toggleMax(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.maxShown) ex.maxShown=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const showing = !ex.maxShown[w];
  ex.maxShown[w] = showing;
  for(let k=w+1;k<ex.maxShown.length;k++){
    if(showing || !maxHasData(ex,k)) ex.maxShown[k] = showing;
  }
  saveState();
  renderActive();
}
// segna la settimana come completata (solo per QUESTO esercizio) e, se non era
// gia' l'ultima, chiude questa settimana e apre la successiva: il suggerimento
// di peso (suggestNextWeight) fara' comparire da solo il peso appena usato
// come placeholder nella settimana che si apre. Se la si segna completata (non
// se la si smarca) e c'e' un esercizio dopo in questo giorno, la pagina avanza
// da sola su quello, cosi' non serve scrollare a mano
// se exi fa parte di una coppia collegata, il "prossimo esercizio" deve
// saltare il partner (e' gia' visibile nella stessa card) e puntare a quello
// dopo l'intero gruppo, altrimenti l'auto-avanzamento resterebbe fermo li'
function nextCardIndex(exi){
  const list = state.days[activeDayIdx].esercizi;
  const ex = list[exi];
  let next = exi+1;
  if(ex && ex.linkGroupId && list[next] && list[next].linkGroupId===ex.linkGroupId) next++;
  return next;
}
// un esercizio e' "chiuso per il blocco" quando OGNI settimana risulta fatta
// O saltata - saltare una settimana apposta (infortunio, imprevisto) conta
// come chiuderla, non come lasciarla in sospeso: usata sia per il festeggiamento
// di fine esercizio sotto, sia (indirettamente, vedi allExercisesClosed in
// js/navigation.js) per far comparire il bottone "Giorno terminato"
function exerciseFullyClosed(ex){
  if(!ex.weekDone) return false;
  return ex.weekDone.every((d,i) => d || (ex.weekSkipped && ex.weekSkipped[i]));
}
function toggleWeekDone(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekDone) ex.weekDone=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowDone = !ex.weekDone[w];
  ex.weekDone[w] = nowDone;
  // completata e saltata sono mutuamente esclusive: segnarne una toglie l'altra
  if(nowDone && ex.weekSkipped) ex.weekSkipped[w] = false;

  // l'allenamento si considera "iniziato" solo quando si segna davvero
  // completata almeno una settimana, non solo toccando/guardando un campo
  if(nowDone && !workoutInProgress){
    workoutInProgress = true;
    saveWorkoutInProgress();
  }
  // segnare completata la settimana che si sta davvero svolgendo oggi collassa
  // da sola la card: quell'esercizio non serve piu' aperto, si passa al
  // prossimo che si vuole fare (in ordine o no, vedi isExerciseCardCollapsed)
  if(nowDone && w === state.currentWeek){
    collapsedMap[activeDayIdx+"_"+exi+"_card"] = true;
    saveCollapsed();
  }
  saveState();
  renderActive();
  if(nowDone){
    vibrate(15);
    pulseWeekDoneBtn(exi, w);
    checkAchievements();
    if(exerciseFullyClosed(ex)) celebrateExerciseDone(ex.nome);
  }
  const next = nextCardIndex(exi);
  if(nowDone && state.days[activeDayIdx].esercizi[next]){
    activeExerciseIdx = next;
    saveActivePos();
    // forza aperto il prossimo anche se era stato chiuso a mano in precedenza
    // (es. l'aveva sbirciato e richiuso): l'avanzamento automatico deve
    // sempre atterrare su una card visibile, mai su una nascosta
    collapsedMap[activeDayIdx+"_"+next+"_card"] = false;
    saveCollapsed();
    renderActive();
    setTimeout(()=>trySnapToActiveExercise(true), 250);
  }
}
// piccolo pop quando si spunta una settimana come completata: il cambio di
// stato (bordo/colore via CSS ".checked") resta istantaneo, qui si aggiunge
// solo un rimbalzo dopo il re-render - renderActive() ricrea il bottone da
// zero, quindi il tween va fatto DOPO, sul bottone nuovo, non su quello appena
// distrutto (un tween sull'elemento vecchio non avrebbe piu' alcun effetto visibile)
function pulseWeekDoneBtn(exi, w){
  if(typeof gsap === "undefined") return;
  const btn = document.querySelector(`.week-done-btn[data-exi="${exi}"][data-w="${w}"]`);
  if(!btn) return;
  gsap.fromTo(btn, {scale:1.5}, {scale:1, duration:.35, ease:"back.out(3)"});
}
// stesso identico pop di pulseWeekDoneBtn ma sul bottone "saltata": segnare
// una settimana come saltata apposta ha la stessa dignita' di segnarla fatta,
// non deve sentirsi un'azione di serie B
function pulseWeekSkipBtn(exi, w){
  if(typeof gsap === "undefined") return;
  const btn = document.querySelector(`.week-skip-btn[data-exi="${exi}"][data-w="${w}"]`);
  if(!btn) return;
  gsap.fromTo(btn, {scale:1.5}, {scale:1, duration:.35, ease:"back.out(3)"});
}
// notifica piccola e discreta (non il festeggiamento vistoso di un PR) quando
// TUTTE le settimane di un esercizio risultano chiuse (fatte o saltate): dura
// pochissimo, serve solo a confermare "questo esercizio e' finito per il blocco intero"
function celebrateExerciseDone(name){
  let el = document.getElementById('exDoneToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'exDoneToast';
    el.className = 'ex-done-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `${ICON_CHECK} ${escapeHtml(name||'Esercizio')} completato`;
  el.classList.add('show');
  clearTimeout(window._exDoneToastTimer);
  window._exDoneToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 1100);
}
// "saltata" e' per le settimane che non farai apposta (infortunio, imprevisto):
// diversamente da una settimana lasciata vuota per caso, questa resta distinguibile
// anche nello Storico (vedi renderHistBody in history.js) invece di sparire e basta.
// Stesso "mood" di toggleWeekDone qui sopra (vibrazione, pop, controllo
// obiettivi, avanzamento al prossimo esercizio): per l'app saltare di
// proposito e' comunque chiudere la settimana, non un'azione minore
function toggleWeekSkipped(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekSkipped) ex.weekSkipped=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowSkipped = !ex.weekSkipped[w];
  ex.weekSkipped[w] = nowSkipped;
  if(nowSkipped && ex.weekDone) ex.weekDone[w] = false;

  if(nowSkipped && !workoutInProgress){
    workoutInProgress = true;
    saveWorkoutInProgress();
  }
  // stesso principio di toggleWeekDone qui sopra: saltare di proposito la
  // settimana di oggi collassa comunque la card, non e' un'azione minore
  if(nowSkipped && w === state.currentWeek){
    collapsedMap[activeDayIdx+"_"+exi+"_card"] = true;
    saveCollapsed();
  }
  saveState();
  renderActive();
  if(nowSkipped){
    vibrate(15);
    pulseWeekSkipBtn(exi, w);
    checkAchievements();
    if(exerciseFullyClosed(ex)) celebrateExerciseDone(ex.nome);
  }
  const next = nextCardIndex(exi);
  if(nowSkipped && state.days[activeDayIdx].esercizi[next]){
    activeExerciseIdx = next;
    saveActivePos();
    collapsedMap[activeDayIdx+"_"+next+"_card"] = false;
    saveCollapsed();
    renderActive();
    setTimeout(()=>trySnapToActiveExercise(true), 250);
  }
}
function updateMax(exi, w, idx, field, val){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.maxExtra) ex.maxExtra=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  if(!ex.maxExtra[w]) ex.maxExtra[w]=[];
  if(!ex.maxExtra[w][idx]) ex.maxExtra[w][idx]={};
  ex.maxExtra[w][idx][field]=val;
  saveState();
}
function addSet(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets) ex.sets=emptySetsArr((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4);
  for(let k=0;k<ex.sets.length;k++){ if(!ex.sets[k]) ex.sets[k]=[]; ex.sets[k].push({peso:'',rip:''}); }
  renderActive();
  saveState();
}
// tocca SOLO la settimana su cui si sta agendo: ne' il controllo "ha dati?" ne'
// l'eliminazione vera e propria guardano le altre 3 settimane, che restano
// come stanno anche se hanno la stessa riga piena
// per default elimina l'ultima riga in TUTTE le settimane insieme (comodo,
// tiene le settimane allineate). Ma se un'ALTRA settimana ha gia' dei dati in
// quella riga, la cascata la cancellerebbe senza che l'utente se ne accorga:
// in quel caso si tocca solo la settimana su cui si sta lavorando, lasciando
// le altre esattamente come stanno
function removeSet(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.sets || !ex.sets[w] || ex.sets[w].length<=1) return; // tieni sempre almeno 1 serie in questa settimana
  const hasRowData = weekSets => {
    if(!weekSets || !weekSets.length) return false;
    const last = weekSets[weekSets.length-1];
    return last && (String(last.peso||'').trim() || String(last.rip||'').trim());
  };
  const currentHasData = hasRowData(ex.sets[w]);
  if(currentHasData && !confirm('L\'ultima serie di questa settimana ha dei dati inseriti (kg/rip). Eliminarla comunque?')) return;
  const otherWeeksHaveData = ex.sets.some((weekSets,k) => k!==w && hasRowData(weekSets));
  if(otherWeeksHaveData){
    ex.sets[w].pop();
  } else {
    for(let k=0;k<ex.sets.length;k++){ if(ex.sets[k] && ex.sets[k].length>0) ex.sets[k].pop(); }
  }
  renderActive();
  saveState();
}
// aggiunge una scheda esercizio vuota in fondo al giorno; niente qui obbliga a
// scegliere subito il nome, si compila dopo dal campo con l'autocomplete
function addExercise(dayIdx){
  const n = ensureWeeksPerBlock();
  state.days[dayIdx].esercizi.push({nome:'',commento:'',recupero:emptyStrArr(n),schema:emptyStrArr(n),sets:emptySetsArr(n)});
  renderActive();
  saveState();
}
// oltre alla conferma gia' presente, tiene per qualche secondo l'esercizio
// appena tolto (lastDeletedExercise) cosi' un tocco su "Annulla" lo rimette
// esattamente dove stava, in caso di ripensamento o tocco sbagliato
let lastDeletedExercise = null;
let undoDeleteTimer = null;
function deleteExercise(exi){
  if(!confirm('Eliminare questo esercizio?')) return;
  const ex = state.days[activeDayIdx].esercizi[exi];
  const dayIdx = activeDayIdx;
  if(ex.linkGroupId){
    const partner = findLinkedPartner(exi);
    if(partner){ partner.ex.linkGroupId = null; partner.ex.linkType = null; }
    ex.linkGroupId = null; ex.linkType = null;
  }
  state.days[dayIdx].esercizi.splice(exi,1);
  renderActive();
  saveState();

  lastDeletedExercise = {dayIdx, exi, ex};
  const toast = document.getElementById('undoToast');
  toast.classList.add('show');
  clearTimeout(undoDeleteTimer);
  undoDeleteTimer = setTimeout(()=>{
    toast.classList.remove('show');
    lastDeletedExercise = null;
  }, 6000);
}
function undoDeleteExercise(){
  if(!lastDeletedExercise) return;
  const {dayIdx, exi, ex} = lastDeletedExercise;
  if(state.days[dayIdx]){
    const idx = Math.min(exi, state.days[dayIdx].esercizi.length);
    state.days[dayIdx].esercizi.splice(idx, 0, ex);
    if(dayIdx === activeDayIdx) renderActive();
    saveState();
  }
  lastDeletedExercise = null;
  clearTimeout(undoDeleteTimer);
  document.getElementById('undoToast').classList.remove('show');
}

// ---------------- SUPERSET / JUMP SET (esercizi collegati) ----------------
// due esercizi "collegati" restano due oggetti indipendenti (peso/rip propri,
// grafico e calcolo dischi propri), ma condividono un'unica intestazione
// settimana (recupero/schema/nota/completata-saltata/max): quei campi si
// scrivono su ENTRAMBI richiamando due volte le stesse funzioni gia' esistenti
// per il singolo esercizio, cosi' restano coerenti anche se poi li si slega
let linkPickerExi = null;
let linkPickerPartnerExi = null;
function findLinkedPartner(exi){
  const list = state.days[activeDayIdx].esercizi;
  const ex = list[exi];
  if(!ex || !ex.linkGroupId) return null;
  if(list[exi-1] && list[exi-1].linkGroupId === ex.linkGroupId) return {ex:list[exi-1], exi:exi-1};
  if(list[exi+1] && list[exi+1].linkGroupId === ex.linkGroupId) return {ex:list[exi+1], exi:exi+1};
  return null;
}
function openLinkPicker(exi){
  linkPickerExi = exi;
  linkPickerPartnerExi = null;
  linkListFilterText = '';
  linkListFilterGroup = '';
  renderLinkModal();
  document.getElementById('linkModal').style.display = 'flex';
}
function closeLinkPicker(){
  document.getElementById('linkModal').style.display = 'none';
  linkPickerExi = null;
  linkPickerPartnerExi = null;
}
function pickLinkPartner(exiB){
  linkPickerPartnerExi = exiB;
  renderLinkModal();
}
function chooseLinkType(type){
  linkExercises(linkPickerExi, linkPickerPartnerExi, type);
  closeLinkPicker();
}
// collega i due esercizi e sposta il partner subito dopo il primo: il gruppo
// deve restare sempre adiacente, e' cosi' che il render li riconosce come coppia
function linkExercises(exiA, exiB, type){
  const list = state.days[activeDayIdx].esercizi;
  const objA = list[exiA];
  const objB = list[exiB];
  const id = 'link_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  objA.linkGroupId = id; objA.linkType = type;
  objB.linkGroupId = id; objB.linkType = type;
  const idxB = list.indexOf(objB);
  list.splice(idxB, 1);
  const idxA = list.indexOf(objA);
  list.splice(idxA+1, 0, objB);
  saveState();
  renderActive();
  bumpAchievCounter('linkCount');
  checkAchievements();
}
function unlinkExercise(exi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex) return;
  const partner = findLinkedPartner(exi);
  ex.linkGroupId = null; ex.linkType = null;
  if(partner){ partner.ex.linkGroupId = null; partner.ex.linkType = null; }
  closeLinkPicker();
  saveState();
  renderActive();
}
function renderLinkModal(){
  const body = document.getElementById('linkBody');
  if(!body || linkPickerExi===null) return;
  const day = state.days[activeDayIdx];
  const ex = day.esercizi[linkPickerExi];
  if(!ex) return;
  const titleEl = document.getElementById('linkTitle');
  if(titleEl) titleEl.textContent = 'Collega — ' + (ex.nome || 'Esercizio');
  const partner = findLinkedPartner(linkPickerExi);
  if(partner){
    const typeLabel = ex.linkType==='jumpset' ? 'jump set' : 'super set';
    body.innerHTML = `<div class="footer-note" style="padding:0 0 12px;">Collegato con "${escapeHtml(partner.ex.nome||'Esercizio')}" (${typeLabel}).</div>
      <button class="add-ex" style="border-color:var(--red);color:var(--red);" onclick="unlinkExercise(${linkPickerExi})">Slega</button>`;
    return;
  }
  if(linkPickerPartnerExi !== null){
    body.innerHTML = `<div class="footer-note" style="padding:0 0 10px;">Che tipo di collegamento?</div>
      <div class="cal-editor-list">
        <button class="cal-day-toggle" onclick="chooseLinkType('superset')">Super set</button>
        <button class="cal-day-toggle" onclick="chooseLinkType('jumpset')">Jump set</button>
      </div>`;
    return;
  }
  // stessa lista completa (alfabetica, ricercabile, filtrabile per gruppo
  // muscolare) della Libreria esercizi, non solo quelli gia' in questo giorno:
  // toccando un nome lo collega se esiste gia' qui, altrimenti lo crea al volo.
  // Se il testo cercato non corrisponde a nessun esercizio noto, compare anche
  // un bottone per aggiungerlo e collegarlo subito con quel nome nuovo
  const names = filteredExerciseNames(linkListFilterText, linkListFilterGroup);
  const trimmed = linkListFilterText.trim();
  const exactMatch = trimmed && getList('esercizi').some(n=>String(n).toLowerCase()===trimmed.toLowerCase());
  const addRow = (trimmed && !exactMatch)
    ? `<button class="cal-day-toggle" style="border-color:var(--green);color:var(--green);margin-bottom:8px;" onclick="onLinkPartnerNameChosen('${escapeAttr(escapeJs(trimmed))}')">＋ Aggiungi e collega "${escapeHtml(trimmed)}"</button>`
    : '';
  body.innerHTML = `<div class="footer-note" style="padding:0 0 10px;">Con quale esercizio vuoi collegare "${escapeHtml(ex.nome||'questo esercizio')}"?</div>
    <div class="meta-row"><span class="meta-label">Cerca</span><input class="meta-input" id="linkSearchInput" placeholder="Cerca o scrivi un nuovo esercizio..." value="${escapeAttr(linkListFilterText)}" oninput="onLinkListSearchInput(this.value)"></div>
    ${renderGroupFilterChipsHtml(linkListFilterGroup, 'onLinkListGroupFilter')}
    ${addRow}
    ${renderExerciseRowsHtml(names, {onRowClick:'onLinkPartnerNameChosen'})}`;
}
let linkListFilterText = '';
let linkListFilterGroup = '';
// il re-render sostituisce il campo di ricerca nel DOM: senza rimettere a mano
// il focus (e il cursore in fondo al testo), ogni carattere digitato farebbe
// perdere il focus e servirebbe ritoccare il campo a ogni lettera
function onLinkListSearchInput(val){
  linkListFilterText = val;
  renderLinkModal();
  const inp = document.getElementById('linkSearchInput');
  if(inp){ inp.focus(); const p = inp.value.length; inp.setSelectionRange(p,p); }
}
function onLinkListGroupFilter(group){
  linkListFilterGroup = group;
  renderLinkModal();
}
// risolve il nome cercato/scritto: se corrisponde (case-insensitive) a un
// esercizio gia' presente in questo giorno lo usa come partner, altrimenti ne
// crea uno nuovo con quel nome (stesso identico esercizio vuoto che crea
// "+ Aggiungi esercizio", solo col nome gia' compilato) e lo usa come partner
function onLinkPartnerNameChosen(val){
  val = String(val||'').trim();
  if(!val) return;
  const day = state.days[activeDayIdx];
  const key = val.toLowerCase();
  const matchIdx = day.esercizi.findIndex((e,i)=> i!==linkPickerExi && String(e.nome||'').trim().toLowerCase()===key);
  if(matchIdx !== -1){
    if(day.esercizi[matchIdx].linkGroupId){
      alert('"'+val+'" è già collegato a un altro esercizio in questo giorno. Slegalo prima di provare a collegarlo di nuovo.');
      return;
    }
    pickLinkPartner(matchIdx);
    return;
  }
  const n = ensureWeeksPerBlock();
  day.esercizi.push({nome:val, commento:'', recupero:emptyStrArr(n), schema:emptyStrArr(n), sets:emptySetsArr(n)});
  pickLinkPartner(day.esercizi.length-1);
}
// input kg/rip di UNA sola riga di UN solo esercizio del gruppo (con la sua
// etichetta per distinguerla dall'altro esercizio nella stessa riga numerata)
function linkedSubRowInputsHtml(ex, exi, w, si){
  const sets = ex.sets && ex.sets[w] ? ex.sets[w] : [];
  const s = sets[si] || {peso:'',rip:''};
  const record = getRecordForExercise(ex.nome);
  const recordAttr = record ? record.peso : 'null';
  const suggestedKg = (!s.peso && s.peso!==0) ? suggestNextWeight(ex, w, si) : null;
  const kgPlaceholder = suggestedKg!==null ? ('ultimo peso: '+suggestedKg) : 'kg';
  return `<span class="linked-tag" title="${escapeAttr(ex.nome||'')}">${escapeHtml(ex.nome||'—')}</span>
    <div class="kg-wrap">
      <div class="stepper-pair">
        <button class="stepper" onclick="stepSet(${exi},${w},${si},-2.5,this)">−</button>
        <button class="stepper" onclick="stepSet(${exi},${w},${si},2.5,this)">+</button>
      </div>
      <input class="set-input" onpointerdown="onSetInputPointerDown(event,this)" onpointermove="onSetInputPointerMove(event)" onpointerup="onSetInputPointerCancel()" onpointerleave="onSetInputPointerCancel()" onpointercancel="onSetInputPointerCancel()" onblur="resetFieldKeyboard(this)" oninput="scheduleAutoAdvance(this)" inputmode="decimal" placeholder="${kgPlaceholder}" value="${escapeAttr(s.peso ?? '')}" onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr})">
    </div>
    <input class="set-input" onpointerdown="onSetInputPointerDown(event,this)" onpointermove="onSetInputPointerMove(event)" onpointerup="onSetInputPointerCancel()" onpointerleave="onSetInputPointerCancel()" onpointercancel="onSetInputPointerCancel()" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="rip" value="${escapeAttr(s.rip ?? '')}" onchange="updateSet(${exi},${w},${si},'rip',this.value)">`;
}
// la card per una coppia collegata: stesso impianto di exerciseCard, ma con due
// intestazioni (una per esercizio) e un'unica settimana condivisa, dove ogni
// riga numerata si sdoppia in due sotto-righe (una per esercizio)
function linkedExerciseCard(exA, exiA, exB, exiB, accent){
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  const nWeeks = (exA.recupero && exA.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);
  const cardCollapsed = isExerciseCardCollapsed(activeDayIdx, exiA);
  const weeksHtml = weeks.map(w=>{
    const wkey = activeDayIdx+"_"+exiA+"_"+w;
    const isCurrentWeek = w === state.currentWeek;

const isPastWeek = w < state.currentWeek;

const isFutureWeek = w > state.currentWeek;


const isCollapsed = 
  (wkey in collapsedMap)
  ? !!collapsedMap[wkey]
  : !isCurrentWeek;

    const weekDone = !!(exA.weekDone && exA.weekDone[w]);
    const weekSkipped = !!(exA.weekSkipped && exA.weekSkipped[w]);
    const maxShown = !!(exA.maxShown && exA.maxShown[w]);
    const nRows = Math.max(
      exA.sets && exA.sets[w] ? exA.sets[w].length : 0,
      exB.sets && exB.sets[w] ? exB.sets[w].length : 0,
      4
    );
    let setsHtml = '';
    for(let si=0; si<nRows; si++){
      const roman = ["I","II","III","IV","V","VI","VII","VIII"][si] || (si+1);
      setsHtml += `<div class="linked-set-group">
        <div class="linked-set-wrap">
          <div class="set-label">${roman}</div>
          <div class="linked-sub-rows">
            <div class="linked-sub-row">${linkedSubRowInputsHtml(exA, exiA, w, si)}</div>
            <div class="linked-sub-row">${linkedSubRowInputsHtml(exB, exiB, w, si)}</div>
          </div>
        </div>
      </div>`;
    }
    let maxRowHtml = '';
    if(maxShown){
      const maxA = ((exA.maxExtra && exA.maxExtra[w]) || [])[0] || {};
      const maxB = ((exB.maxExtra && exB.maxExtra[w]) || [])[0] || {};
      const maxAKgPh = (!maxA.peso && maxA.peso!==0 && suggestNextMaxWeight(exA,w,0)!==null) ? ('ultimo: '+suggestNextMaxWeight(exA,w,0)) : 'max kg';
      const maxBKgPh = (!maxB.peso && maxB.peso!==0 && suggestNextMaxWeight(exB,w,0)!==null) ? ('ultimo: '+suggestNextMaxWeight(exB,w,0)) : 'max kg';
      const pointerAttrs = `onpointerdown="onSetInputPointerDown(event,this)" onpointermove="onSetInputPointerMove(event)" onpointerup="onSetInputPointerCancel()" onpointerleave="onSetInputPointerCancel()" onpointercancel="onSetInputPointerCancel()" onblur="resetFieldKeyboard(this)"`;
      maxRowHtml = `<div class="linked-set-group">
        <div class="linked-set-wrap">
          <div class="set-label">max</div>
          <div class="linked-sub-rows">
            <div class="linked-sub-row">
              <span class="linked-tag" title="${escapeAttr(exA.nome||'')}">${escapeHtml(exA.nome||'—')}</span>
              <input class="set-input max-input" ${pointerAttrs} inputmode="decimal" placeholder="${maxAKgPh}" value="${escapeAttr(maxA.peso??'')}" onchange="updateMax(${exiA},${w},0,'peso',this.value)">
              <input class="set-input max-input" ${pointerAttrs} inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxA.rip??'')}" onchange="updateMax(${exiA},${w},0,'rip',this.value)">
            </div>
            <div class="linked-sub-row">
              <span class="linked-tag" title="${escapeAttr(exB.nome||'')}">${escapeHtml(exB.nome||'—')}</span>
              <input class="set-input max-input" ${pointerAttrs} inputmode="decimal" placeholder="${maxBKgPh}" value="${escapeAttr(maxB.peso??'')}" onchange="updateMax(${exiB},${w},0,'peso',this.value)">
              <input class="set-input max-input" ${pointerAttrs} inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxB.rip??'')}" onchange="updateMax(${exiB},${w},0,'rip',this.value)">
            </div>
          </div>
        </div>
      </div>`;
    }
    return `

<div class="week-block">

  <button class="week-toggle
  ${isCollapsed?'collapsed':''}
  ${weekDone?'done':''}
  ${weekSkipped?'skipped':''}
  ${isCurrentWeek?'current-week':''}
  ${isPastWeek?'completed-week':''}
  ${isFutureWeek?'future-week':''}"
  style="background:${accent.d}"
  ${isFutureWeek ? `ondblclick="toggleWeek(this,'${wkey}',${w})"` : `onclick="toggleWeek(this,'${wkey}',${w})"`}>

    <span>

    ${
      isPastWeek
      ? ICON_CHECK+' '
      : isCurrentWeek
        ? ICON_FLAME+' '
        : ICON_LOCK+' '
    }

    SETTIMANA ${w+1}${weekSkipped?' — saltata':''}${weekDone && exA.schema[w] ? ` <span class="week-toggle-schema">(${escapeHtml(exA.schema[w])})</span>` : ''}

    </span>

    <span class="chev">▾</span>

  </button>


  <div class="week-body ${isCollapsed?'collapsed':''}">

    <input class="week-note"
    placeholder="nota settimana (facoltativo)"
    value="${escapeAttr((exA.weekNote && exA.weekNote[w]) ?? '')}"
    onchange="updateWeekNote(${exiA},${w},this.value);updateWeekNote(${exiB},${w},this.value)">

    ${isCurrentWeek && !weekDone && !weekSkipped ? (()=>{ const hint = computeProgressionHint(exA, w); return hint ? `<div class="progression-hint">${escapeHtml(hint.text)} ${hint.icon}</div>` : ''; })() : ''}

    <div class="meta-row-schema">
      <span class="meta-label small">Serie</span>
      <div class="meta-field-center">
        <div class="combo-wrap">
          <textarea class="meta-input schema" rows="1"
          oninput="onComboInput(this,'schemi');autoGrowTextarea(this);autoWidthSchema(this)"
          onfocus="onComboFocus(this,'schemi')"
          onchange="updateMeta(${exiA},'schema',${w},this.value);updateMeta(${exiB},'schema',${w},this.value)">${escapeHtml(exA.schema[w]??'')}</textarea>
        </div>
      </div>
    </div>

    <div class="meta-row meta-row-combined">

      <div class="meta-group">
        <span class="meta-label small">Rec.</span>
        <div class="meta-field-center">
          <div class="combo-wrap">
            <input class="meta-input"
            placeholder="—"
            value="${escapeAttr(exA.recupero[w]??'')}"
            oninput="onComboInput(this,'recuperi')"
            onfocus="onComboFocus(this,'recuperi')"
            onchange="updateMeta(${exiA},'recupero',${w},this.value);updateMeta(${exiB},'recupero',${w},this.value)">
          </div>
        </div>
      </div>

    </div>

    <div class="sets-wrap">

      ${setsHtml}

    </div>

    ${maxRowHtml}

    <div class="set-btns">

      <div class="week-done-wrap">

        <div class="week-status-col">
          <span class="week-done-label">completata</span>
          <button class="week-done-btn ${weekDone?'checked':''}"
          data-exi="${exiA}" data-w="${w}"
          onclick="toggleWeekDone(${exiA},${w});toggleWeekDone(${exiB},${w})">
          ${ICON_CHECK}
          </button>
        </div>

        <div class="week-status-col">
          <span class="week-done-label">saltata</span>
          <button class="week-skip-btn ${weekSkipped?'checked':''}"
          data-exi="${exiA}" data-w="${w}"
          onclick="toggleWeekSkipped(${exiA},${w});toggleWeekSkipped(${exiB},${w})">
          ⏭
          </button>
        </div>

      </div>

      <div class="set-btns-secondary">

        <button class="max-toggle"
        onclick="toggleMax(${exiA},${w});toggleMax(${exiB},${w})">

          ${maxShown?'nascondi max':'max'}

        </button>

        <div class="set-btns-right">

          <button class="add-ex small"
          onclick="addSet(${exiA},${w});addSet(${exiB},${w})">

          + serie

          </button>

          <button class="add-ex small danger"
          onclick="removeSet(${exiA},${w});removeSet(${exiB},${w})">

          − serie

          </button>

        </div>

      </div>

    </div>

  </div>

</div>

`;
  }).join('');

  const recordA = getRecordForExercise(exA.nome);
  const recordB = getRecordForExercise(exB.nome);
  const prBadgeA = recordA ? `<div class="pr-badge">${ICON_TROPHY} Record: ${escapeHtml(String(recordA.peso))} kg${recordA.rip? ' × '+escapeHtml(String(recordA.rip)) : ''}</div>` : '';
  const prBadgeB = recordB ? `<div class="pr-badge">${ICON_TROPHY} Record: ${escapeHtml(String(recordB.peso))} kg${recordB.rip? ' × '+escapeHtml(String(recordB.rip)) : ''}</div>` : '';

  return `<div class="ex-card-wrap" style="--accent:${accent.c}">
  <div class="ex-sticky-header linked ${cardCollapsed?'collapsed':''}" id="stickyHeaderLinked-${exiA}" onclick="handleStickyHeaderClick(${exiA})" ondblclick="startEditLinkedSticky(${exiA},${exiB})">
    <div class="ex-sticky-line">${escapeHtml(exA.nome||'Esercizio')}</div>
    <div class="ex-sticky-line ex-sticky-linktype">${typeLabel}</div>
    <div class="ex-sticky-line">${escapeHtml(exB.nome||'Esercizio')}</div>
    <span class="ex-collapse-chev">▾</span>
  </div>
  <div class="card linked-group ${cardCollapsed?'ex-collapsed':''}" data-exi="${exiA}" data-exi2="${exiB}" style="--accent:${accent.c}">
    <div class="linked-pair-frame">
      <div class="card-head linked-head compact">
        <button class="ex-more-btn" onclick="openExerciseContextMenu(${exiA}, '${escapeJs(exA.nome||'')}')" title="Altre azioni" aria-label="Altre azioni">${ICON_MORE}</button>
        ${prBadgeA}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiA},this.value)">${escapeHtml(exA.commento??'')}</textarea>
      </div>
      <button class="link-type-divider" onclick="openLinkPicker(${exiA})" title="Gestisci collegamento"><span class="link-type-pill" style="background:${accent.d}">${ICON_LIGHTNING} ${typeLabel} <span class="link-type-manage">${ICON_LINK} gestisci</span></span></button>
      <div class="card-head linked-head compact">
        <button class="ex-more-btn" onclick="openExerciseContextMenu(${exiB}, '${escapeJs(exB.nome||'')}')" title="Altre azioni" aria-label="Altre azioni">${ICON_MORE}</button>
        ${prBadgeB}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiB},this.value)">${escapeHtml(exB.commento??'')}</textarea>
      </div>
    </div>
    <div class="weeks">${weeksHtml}</div>
  </div>
  </div>`;
}

