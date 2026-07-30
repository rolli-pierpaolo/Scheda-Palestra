function renderActive(){
  const day = state.days[activeDayIdx];
  const a = dayAccent(day, activeDayIdx);
  const main = document.getElementById('viewActive');
  if(reorderMode){
    main.innerHTML = renderReorderList(day);
    return;
  }
  // se il giorno non ha ancora esercizi, un invito a aggiungerne uno invece
  // di lasciare la pagina vuota e basta
  const emptyState = day.esercizi.length===0 ? `<div class="empty-day">
      <div class="empty-day-title">Nessun esercizio ancora</div>
      <div class="empty-day-sub">Aggiungine uno per iniziare a costruire "${escapeHtml(day.name)}"</div>
    </div>` : '';
  const reorderBtn = day.esercizi.length>1 ? `<button class="add-ex" onclick="toggleReorderMode()">↕️ Modifica ordine</button>` : '';
  const finishBtn = day.esercizi.length>0 ? `<button class="add-ex" style="margin-top:18px;border-color:var(--green);color:var(--green);font-size:15px;" onclick="finishDay()">✅ Giorno terminato — vai al prossimo</button>` : '';
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
  main.innerHTML = emptyState + cardsHtml +
    `<div class="add-ex-row">
       <button class="add-ex" onclick="addExercise(${activeDayIdx})">+ Aggiungi esercizio</button>
       ${reorderBtn}
     </div>
     ${finishBtn}
     <button class="add-ex" style="margin-top:10px;border-color:var(--amber);color:var(--amber);" onclick="archiveAndReset()">📦 Archivia "${escapeHtml(state.title||'questo mese')}" e inizia un nuovo mese</button>`;
  autoGrowAllExNames();
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
    const upBtn = bi>0 ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},-1)">▲</button>` : '';
    const downBtn = bi<lastBlockIdx ? `<button class="reorder-arrow" onclick="moveExerciseBlock(${bi},1)">▼</button>` : '';
    const names = block.map(i=>escapeHtml(day.esercizi[i].nome || '(senza nome)')).join(' + ');
    return `<div class="reorder-row">
      <span class="reorder-name">${names}</span>
      <div class="reorder-arrows">${upBtn}${downBtn}</div>
    </div>`;
  }).join('');
  const btn = reorderDirty
    ? `<button class="add-ex small2" style="border-color:var(--green);color:var(--green);" onclick="confirmReorderOrder()">✅ Conferma nuovo ordine</button>`
    : `<button class="add-ex small2" onclick="toggleReorderMode()">✕ Chiudi modifica ordine</button>`;
  return `<div class="reorder-banner">Tocca le frecce per spostare un esercizio, poi conferma</div>${rows}${btn}`;
}

function updateTitles(){
  document.getElementById('tabActiveBtn').textContent = "Allenamento (" + (state.title || "attuale") + ")";
}

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
  checkAchievements(); // va fatto ORA: valuta anche "zero settimane saltate" sul blocco appena archiviato, prima che state venga azzerato qui sotto

  const newDays = state.days.map(d => ({
    name: d.name,
    esercizi: d.esercizi.map(ex => ({
      nome: ex.nome, commento: ex.commento,
      recupero: resizeArr(ex.recupero, weeksN, ''), schema: resizeArr(ex.schema, weeksN, ''),
      sets: Array.from({length:weeksN}, (_,i) => (ex.sets && ex.sets[i] ? ex.sets[i].map(()=>({peso:'',rip:''})) : []))
    }))
  }));
  state = { title: newTitle.trim(), days: newDays, programStartDate: todayKey(), weeksPerBlock: weeksN };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

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
function suggestNextWeight(ex, w, si){
  if(w===0) return null;
  if(!(ex.weekDone && ex.weekDone[w-1])) return null;
  const s = ex.sets && ex.sets[w-1] && ex.sets[w-1][si];
  if(!s || s.peso===undefined || s.peso===null || String(s.peso).trim()==='') return null;
  const p = parseFloat(String(s.peso).replace(',','.'));
  return isNaN(p) ? null : Math.round(p*10)/10;
}
function exerciseCard(ex, exi, accent){
  const nWeeks = (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);
  const record = getRecordForExercise(ex.nome);
  const recordAttr = record ? record.peso : 'null';
  const weeksHtml = weeks.map(w=>{
    const sets = ex.sets && ex.sets[w] ? ex.sets[w] : [];
    const setRows = (sets.length?sets:[{peso:'',rip:''},{peso:'',rip:''},{peso:'',rip:''},{peso:'',rip:''}]).map((s,si)=>{
      const roman = ["I","II","III","IV","V","VI","VII","VIII"][si] || (si+1);
      const suggestedKg = (!s.peso && s.peso!==0) ? suggestNextWeight(ex, w, si) : null;
      const kgPlaceholder = suggestedKg!==null ? ('ultimo peso: '+suggestedKg) : 'kg';
      return `<div class="set-row">
        <div class="set-label">${roman}</div>
        <div class="kg-wrap">
          <div class="stepper-pair">
            <button class="stepper" onclick="stepSet(${exi},${w},${si},-2.5,this)">−</button>
            <button class="stepper" onclick="stepSet(${exi},${w},${si},2.5,this)">+</button>
          </div>
          <input class="set-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="${kgPlaceholder}" value="${escapeAttr(s.peso ?? '')}" onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr})">
        </div>
        <input class="set-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="rip" value="${escapeAttr(s.rip ?? '')}" onchange="updateSet(${exi},${w},${si},'rip',this.value)">
      </div>`;
    }).join('');
    const wkey = activeDayIdx+"_"+exi+"_"+w;
    const isCollapsed = (wkey in collapsedMap) ? !!collapsedMap[wkey] : (w !== 0);
    // due tentativi extra (0 e 1) invece di uno solo, ognuno con la sua kg/rip;
    // insieme occupano lo stesso spazio che prima occupava la singola casella
    const maxRaw = (ex.maxExtra && ex.maxExtra[w]) || [];
    const maxPair = [maxRaw[0]||{}, maxRaw[1]||{}];
    const maxShown = !!(ex.maxShown && ex.maxShown[w]);
    const weekDone = !!(ex.weekDone && ex.weekDone[w]);
    const weekSkipped = !!(ex.weekSkipped && ex.weekSkipped[w]);
    const maxRowHtml = maxShown ? `<div class="set-row max-row">
          <div></div>
          <div class="max-cell">
            <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="max kg" value="${escapeAttr(maxPair[0].peso??'')}" onchange="updateMax(${exi},${w},0,'peso',this.value)">
            <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="max kg" value="${escapeAttr(maxPair[1].peso??'')}" onchange="updateMax(${exi},${w},1,'peso',this.value)">
          </div>
          <div class="max-cell">
            <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxPair[0].rip??'')}" onchange="updateMax(${exi},${w},0,'rip',this.value)">
            <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxPair[1].rip??'')}" onchange="updateMax(${exi},${w},1,'rip',this.value)">
          </div>
        </div>` : '';
    return `<div class="week-block">
      <button class="week-toggle ${isCollapsed?'collapsed':''} ${weekDone?'done':''} ${weekSkipped?'skipped':''}" style="background:${accent.d}" onclick="toggleWeek(this,'${wkey}')">
        <span>SETTIMANA ${w+1}${weekSkipped?' — saltata':''}</span><span class="chev">▾</span>
      </button>
      <div class="week-body ${isCollapsed?'collapsed':''}">
        <input class="week-note" placeholder="nota settimana (facoltativo)" value="${escapeAttr((ex.weekNote && ex.weekNote[w]) ?? '')}" onchange="updateWeekNote(${exi},${w},this.value)">
        <div class="meta-row"><span class="meta-label">Recupero</span><div class="combo-wrap"><input class="meta-input" placeholder="—" value="${escapeAttr(ex.recupero[w]??'')}" oninput="onComboInput(this,'recuperi')" onfocus="onComboFocus(this,'recuperi')" onchange="updateMeta(${exi},'recupero',${w},this.value)"></div><button class="recupero-play" onclick="startTimerFromRow(this)">▶</button></div>
        <div class="meta-row"><span class="meta-label">Sets x Reps</span><div class="combo-wrap"><input class="meta-input schema" placeholder="—" value="${escapeAttr(ex.schema[w]??'')}" oninput="onComboInput(this,'schemi')" onfocus="onComboFocus(this,'schemi')" onchange="updateMeta(${exi},'schema',${w},this.value)"></div></div>
        <div class="sets-wrap">${setRows}</div>
        ${maxRowHtml}
        <div class="set-btns">
          <button class="max-toggle" onclick="toggleMax(${exi},${w})">${maxShown?'nascondi max':'max'}</button>
          <div class="week-done-wrap">
            <span class="week-done-label">completata / saltata:</span>
            <div class="week-status-btns">
              <button class="week-done-btn ${weekDone?'checked':''}" onclick="toggleWeekDone(${exi},${w})" title="Segna settimana completata">✓</button>
              <button class="week-skip-btn ${weekSkipped?'checked':''}" onclick="toggleWeekSkipped(${exi},${w})" title="Segna settimana saltata">⏭</button>
            </div>
          </div>
          <div class="set-btns-right">
            <button class="add-ex small" onclick="addSet(${exi},${w})">+ serie</button>
            <button class="add-ex small danger" onclick="removeSet(${exi},${w})">− serie</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  const prBadge = record ? `<div class="pr-badge">\ud83c\udfc6 Record: ${escapeHtml(String(record.peso))} kg${record.rip? ' \u00d7 '+escapeHtml(String(record.rip)) : ''}</div>` : '';
  return `<div class="card" data-exi="${exi}" style="--accent:${accent.c}">
    <div class="card-head">
      <button class="del-ex" onclick="deleteExercise(${exi})">Elimina</button>
      <button class="chart-btn" onclick="openChart(${exi})" title="Grafico progressione">\ud83d\udcc8</button>
      <button class="chart-btn" onclick="openPlateCalc(${exi})" title="Calcola dischi bilanciere">\ud83c\udfcb\ufe0f</button>
      <button class="chart-btn" onclick="openLinkPicker(${exi})" title="Collega (super set/jump set)">\ud83d\udd17</button>
      <div class="name-row">
        <div class="combo-wrap"><textarea class="ex-name" rows="1" placeholder="Seleziona esercizio..." oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)" onfocus="onComboFocus(this,'esercizi')" onchange="updateName(${exi},this.value)">${escapeHtml(ex.nome??'')}</textarea></div>
      </div>
      ${prBadge}
      <textarea class="ex-comment" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exi},this.value)">${escapeHtml(ex.commento??'')}</textarea>
    </div>
    <div class="weeks">${weeksHtml}</div>
  </div>`;
}

// apri/chiudi un blocco settimana: tocca solo le classi CSS (niente renderActive,
// sennò si perderebbe subito lo scroll), e ricorda lo stato aperto/chiuso per quando si
// ridisegna la pagina altre volte
function toggleWeek(btn, key){
  const nowCollapsed = btn.classList.toggle('collapsed');
  btn.nextElementSibling.classList.toggle('collapsed');
  collapsedMap[key] = nowCollapsed;
  saveCollapsed();
}

function updateName(exi, val){
  state.days[activeDayIdx].esercizi[exi].nome = val;
  saveState();
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
function toggleWeekDone(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekDone) ex.weekDone=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowDone = !ex.weekDone[w];
  ex.weekDone[w] = nowDone;
  // completata e saltata sono mutuamente esclusive: segnarne una toglie l'altra
  if(nowDone && ex.weekSkipped) ex.weekSkipped[w] = false;
  if(nowDone && w<ex.weekDone.length-1){
    collapsedMap[activeDayIdx+"_"+exi+"_"+w] = true;
    collapsedMap[activeDayIdx+"_"+exi+"_"+(w+1)] = false;
    saveCollapsed();
  }
  // l'allenamento si considera "iniziato" solo quando si segna davvero
  // completata almeno una settimana, non solo toccando/guardando un campo
  if(nowDone && !workoutInProgress){
    workoutInProgress = true;
    saveWorkoutInProgress();
  }
  saveState();
  renderActive();
  if(nowDone) checkAchievements();
  const next = nextCardIndex(exi);
  if(nowDone && state.days[activeDayIdx].esercizi[next]){
    activeExerciseIdx = next;
    saveActivePos();
    setTimeout(()=>trySnapToActiveExercise(true), 120);
  }
}
// "saltata" e' per le settimane che non farai apposta (infortunio, imprevisto):
// diversamente da una settimana lasciata vuota per caso, questa resta distinguibile
// anche nello Storico (vedi renderHistBody in history.js) invece di sparire e basta
function toggleWeekSkipped(exi, w){
  const ex = state.days[activeDayIdx].esercizi[exi];
  if(!ex.weekSkipped) ex.weekSkipped=new Array((ex.recupero&&ex.recupero.length)||state.weeksPerBlock||4).fill(false);
  const nowSkipped = !ex.weekSkipped[w];
  ex.weekSkipped[w] = nowSkipped;
  if(nowSkipped && ex.weekDone) ex.weekDone[w] = false;
  saveState();
  renderActive();
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
      <input class="set-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="${kgPlaceholder}" value="${escapeAttr(s.peso ?? '')}" onchange="updateSet(${exi},${w},${si},'peso',this.value,${recordAttr})">
    </div>
    <input class="set-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="rip" value="${escapeAttr(s.rip ?? '')}" onchange="updateSet(${exi},${w},${si},'rip',this.value)">`;
}
// la card per una coppia collegata: stesso impianto di exerciseCard, ma con due
// intestazioni (una per esercizio) e un'unica settimana condivisa, dove ogni
// riga numerata si sdoppia in due sotto-righe (una per esercizio)
function linkedExerciseCard(exA, exiA, exB, exiB, accent){
  const typeLabel = exA.linkType === 'jumpset' ? 'Jump set' : 'Super set';
  const nWeeks = (exA.recupero && exA.recupero.length) || state.weeksPerBlock || 4;
  const weeks = Array.from({length:nWeeks}, (_,i)=>i);
  const weeksHtml = weeks.map(w=>{
    const wkey = activeDayIdx+"_"+exiA+"_"+w;
    const isCollapsed = (wkey in collapsedMap) ? !!collapsedMap[wkey] : (w !== 0);
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
      maxRowHtml = `<div class="linked-set-group">
        <div class="linked-set-wrap">
          <div class="set-label">max</div>
          <div class="linked-sub-rows">
            <div class="linked-sub-row">
              <span class="linked-tag" title="${escapeAttr(exA.nome||'')}">${escapeHtml(exA.nome||'—')}</span>
              <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="max kg" value="${escapeAttr(maxA.peso??'')}" onchange="updateMax(${exiA},${w},0,'peso',this.value)">
              <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxA.rip??'')}" onchange="updateMax(${exiA},${w},0,'rip',this.value)">
            </div>
            <div class="linked-sub-row">
              <span class="linked-tag" title="${escapeAttr(exB.nome||'')}">${escapeHtml(exB.nome||'—')}</span>
              <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="decimal" placeholder="max kg" value="${escapeAttr(maxB.peso??'')}" onchange="updateMax(${exiB},${w},0,'peso',this.value)">
              <input class="set-input max-input" ondblclick="toggleFieldKeyboard(this)" onblur="resetFieldKeyboard(this)" inputmode="numeric" placeholder="max rip" value="${escapeAttr(maxB.rip??'')}" onchange="updateMax(${exiB},${w},0,'rip',this.value)">
            </div>
          </div>
        </div>
      </div>`;
    }
    return `<div class="week-block">
      <button class="week-toggle ${isCollapsed?'collapsed':''} ${weekDone?'done':''} ${weekSkipped?'skipped':''}" style="background:${accent.d}" onclick="toggleWeek(this,'${wkey}')">
        <span>SETTIMANA ${w+1}${weekSkipped?' — saltata':''}</span><span class="chev">▾</span>
      </button>
      <div class="week-body ${isCollapsed?'collapsed':''}">
        <input class="week-note" placeholder="nota settimana (facoltativo)" value="${escapeAttr((exA.weekNote && exA.weekNote[w]) ?? '')}" onchange="updateWeekNote(${exiA},${w},this.value);updateWeekNote(${exiB},${w},this.value)">
        <div class="meta-row"><span class="meta-label">Recupero</span><div class="combo-wrap"><input class="meta-input" placeholder="—" value="${escapeAttr(exA.recupero[w]??'')}" oninput="onComboInput(this,'recuperi')" onfocus="onComboFocus(this,'recuperi')" onchange="updateMeta(${exiA},'recupero',${w},this.value);updateMeta(${exiB},'recupero',${w},this.value)"></div><button class="recupero-play" onclick="startTimerFromRow(this)">▶</button></div>
        <div class="meta-row"><span class="meta-label">Sets x Reps</span><div class="combo-wrap"><input class="meta-input schema" placeholder="—" value="${escapeAttr(exA.schema[w]??'')}" oninput="onComboInput(this,'schemi')" onfocus="onComboFocus(this,'schemi')" onchange="updateMeta(${exiA},'schema',${w},this.value);updateMeta(${exiB},'schema',${w},this.value)"></div></div>
        <div class="sets-wrap">${setsHtml}</div>
        ${maxRowHtml}
        <div class="set-btns">
          <button class="max-toggle" onclick="toggleMax(${exiA},${w});toggleMax(${exiB},${w})">${maxShown?'nascondi max':'max'}</button>
          <div class="week-done-wrap">
            <span class="week-done-label">completata / saltata:</span>
            <div class="week-status-btns">
              <button class="week-done-btn ${weekDone?'checked':''}" onclick="toggleWeekDone(${exiA},${w});toggleWeekDone(${exiB},${w})" title="Segna settimana completata">✓</button>
              <button class="week-skip-btn ${weekSkipped?'checked':''}" onclick="toggleWeekSkipped(${exiA},${w});toggleWeekSkipped(${exiB},${w})" title="Segna settimana saltata">⏭</button>
            </div>
          </div>
          <div class="set-btns-right">
            <button class="add-ex small" onclick="addSet(${exiA},${w});addSet(${exiB},${w})">+ serie</button>
            <button class="add-ex small danger" onclick="removeSet(${exiA},${w});removeSet(${exiB},${w})">− serie</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  const recordA = getRecordForExercise(exA.nome);
  const recordB = getRecordForExercise(exB.nome);
  const prBadgeA = recordA ? `<div class="pr-badge">🏆 Record: ${escapeHtml(String(recordA.peso))} kg${recordA.rip? ' × '+escapeHtml(String(recordA.rip)) : ''}</div>` : '';
  const prBadgeB = recordB ? `<div class="pr-badge">🏆 Record: ${escapeHtml(String(recordB.peso))} kg${recordB.rip? ' × '+escapeHtml(String(recordB.rip)) : ''}</div>` : '';

  return `<div class="card linked-group" data-exi="${exiA}" data-exi2="${exiB}" style="--accent:${accent.c}">
    <div class="linked-pair-frame">
      <div class="card-head linked-head compact">
        <button class="del-ex" onclick="deleteExercise(${exiA})">Elimina</button>
        <button class="chart-btn" onclick="openChart(${exiA})" title="Grafico progressione">📈</button>
        <button class="chart-btn" onclick="openPlateCalc(${exiA})" title="Calcola dischi bilanciere">🏋️</button>
        <div class="name-row"><div class="combo-wrap"><textarea class="ex-name" rows="1" placeholder="Seleziona esercizio..." oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)" onfocus="onComboFocus(this,'esercizi')" onchange="updateName(${exiA},this.value)">${escapeHtml(exA.nome??'')}</textarea></div></div>
        ${prBadgeA}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiA},this.value)">${escapeHtml(exA.commento??'')}</textarea>
      </div>
      <button class="link-type-divider" onclick="openLinkPicker(${exiA})" title="Gestisci collegamento"><span class="link-type-pill" style="background:${accent.d}">⚡ ${typeLabel} <span class="link-type-manage">🔗 gestisci</span></span></button>
      <div class="card-head linked-head compact">
        <button class="del-ex" onclick="deleteExercise(${exiB})">Elimina</button>
        <button class="chart-btn" onclick="openChart(${exiB})" title="Grafico progressione">📈</button>
        <button class="chart-btn" onclick="openPlateCalc(${exiB})" title="Calcola dischi bilanciere">🏋️</button>
        <div class="name-row"><div class="combo-wrap"><textarea class="ex-name" rows="1" placeholder="Seleziona esercizio..." oninput="onComboInput(this,'esercizi');autoGrowTextarea(this)" onfocus="onComboFocus(this,'esercizi')" onchange="updateName(${exiB},this.value)">${escapeHtml(exB.nome??'')}</textarea></div></div>
        ${prBadgeB}
        <textarea class="ex-comment compact" placeholder="Note / tecnica (facoltativo)" onchange="updateComment(${exiB},this.value)">${escapeHtml(exB.commento??'')}</textarea>
      </div>
    </div>
    <div class="weeks">${weeksHtml}</div>
  </div>`;
}

