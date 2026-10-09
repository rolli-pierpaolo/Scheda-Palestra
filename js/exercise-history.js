let exerciseHistoryName = '';
let exerciseHistoryWeight = '';
let exerciseHistoryBlock = '';
let exerciseHistoryDate = '';
function historyDateKey(value){
  const date=new Date(value);
  if(!value||!Number.isFinite(date.getTime()))return '';
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
function matchingHistoryNames(name){
  const key=String(name||'').trim().toLocaleLowerCase('it');
  const group=(state.exerciseAliases||[]).find(names=>names.includes(key));
  return group||[key];
}
async function chooseHistoryAlias(){
  const current=exerciseHistoryName;
  const names=getAllExerciseNamesEverUsed().filter(name=>!matchingHistoryNames(current).includes(name.toLocaleLowerCase('it')));
  if(!names.length){ViridisToast('Non ci sono altri nomi da collegare.');return;}
  const name=await ViridisOptionPicker({title:'Altro nome dello stesso esercizio',message:'Scegli solo una denominazione equivalente. Varianti e macchine diverse devono restare separate.',choices:names.map(name=>({label:name,value:name}))});
  if(name===null||current!==exerciseHistoryName)return;
  if(!await ViridisConfirmDialog(`Mostrare insieme lo storico di "${current}" e "${name}"? Pesi, ripetizioni e nomi originali non vengono modificati.`)||current!==exerciseHistoryName)return;
  const merged=[...new Set([...matchingHistoryNames(current),...matchingHistoryNames(name)])];
  state.exerciseAliases=[...(state.exerciseAliases||[]).filter(group=>!group.some(n=>merged.includes(n))),merged];
  saveState();renderExerciseHistory();
}
function clearHistoryAlias(){
  const names=matchingHistoryNames(exerciseHistoryName);
  state.exerciseAliases=(state.exerciseAliases||[]).filter(group=>group!==names);
  saveState();renderExerciseHistory();
}
async function chooseHistoryDate(){
  const dates=[...new Set(collectExerciseHistory(exerciseHistoryName).map(r=>historyDateKey(r.date)).filter(Boolean))].sort().reverse();
  const date=await ViridisOptionPicker({title:'Data registrazione',choices:[{label:'Tutte le date',value:''},...dates.map(value=>({value,label:new Date(value+'T12:00:00').toLocaleDateString('it-IT')}))]});
  if(date===null)return;exerciseHistoryDate=date;renderExerciseHistory();
}
let historySheetCleanup=null;
let historyCompareSelection=[];
function closeExerciseHistorySheet(){
  const sheet=document.getElementById('exerciseHistorySheet');
  if(!sheet)return;
  historySheetCleanup?.();historySheetCleanup=null;
  const results=sheet.querySelector('#exerciseHistoryResults');
  const marker=document.getElementById('exerciseHistoryPlaceholder');
  if(results&&marker)marker.replaceWith(results);
  sheet.remove();
}
function openExerciseHistory(exi){
  const ex=state.days[activeDayIdx]?.esercizi[exi];
  if(!ex)return;
  if(typeof finishQuickKeyboardInput==='function')finishQuickKeyboardInput();
  closeExerciseHistorySheet();
  exerciseHistoryName=ex.nome;exerciseHistoryWeight='';exerciseHistoryBlock='';exerciseHistoryDate='';historyCompareSelection=[];
  document.getElementById('exerciseHistorySearch').value=ex.nome;
  document.getElementById('exerciseHistorySuggestions').replaceChildren();
  const results=document.getElementById('exerciseHistoryResults');
  const marker=document.createElement('div');marker.id='exerciseHistoryPlaceholder';results.before(marker);
  const overlay=document.createElement('div');overlay.id='exerciseHistorySheet';overlay.className='modal-overlay ex-context-overlay';
  overlay.innerHTML='<section class="ex-context-sheet history-sheet" role="dialog" aria-modal="true" aria-labelledby="historySheetTitle" tabindex="-1"><div class="ex-sheet-grip" aria-hidden="true"><span></span></div><div class="ex-sheet-header"><h2 id="historySheetTitle">Storico esercizio</h2><button class="ex-sheet-close" aria-label="Chiudi storico" onclick="closeExerciseHistorySheet()">'+ICON_CLOSE+'</button></div><div class="ex-sheet-content"></div></section>';
  overlay.onclick=e=>{if(e.target===overlay)closeExerciseHistorySheet();};
  overlay.querySelector('.ex-sheet-content').append(results);document.body.append(overlay);
  historySheetCleanup=bindViridisSheet(overlay,overlay.querySelector('section'),closeExerciseHistorySheet);
  renderExerciseHistory();
}
function historyRecordLabel(record){return (record.date?new Date(record.date).toLocaleDateString('it-IT')+' · ':'')+record.block+' · S'+(record.week+1)+' · '+record.day;}
function historyRecordId(record){return record.id||JSON.stringify([record.blockKey,record.week,record.di,record.ei]);}
async function compareExerciseSessions(){
  const name=exerciseHistoryName;
  const records=collectExerciseHistory(exerciseHistoryName);
  if(records.length<2){ViridisToast('Servono almeno due registrazioni.');return;}
  const first=await ViridisOptionPicker({title:'Prima registrazione',choices:records.map(r=>({label:historyRecordLabel(r),value:historyRecordId(r)}))});
  if(first===null)return;
  const second=await ViridisOptionPicker({title:'Seconda registrazione',choices:records.filter(r=>historyRecordId(r)!==first).map(r=>({label:historyRecordLabel(r),value:historyRecordId(r)}))});
  if(second===null||name!==exerciseHistoryName)return;
  historyCompareSelection=[first,second];renderExerciseHistory();
}
function renderHistoryComparison(records){
  const pair=historyCompareSelection.map(id=>records.find(r=>historyRecordId(r)===id));
  if(pair.length!==2||pair.some(r=>!r))return '';
  const labels=[...new Set(pair.flatMap(r=>r.rows.map(s=>s.label)))];
  return '<section class="history-comparison"><h4>Confronto registrazioni</h4><p>'+pair.map(r=>escapeHtml(historyRecordLabel(r))).join('<br>')+'</p><table><thead><tr><th>Serie</th><th>Prima</th><th>Seconda</th></tr></thead><tbody>'+labels.map(label=>'<tr><td>'+escapeHtml(label)+'</td>'+pair.map(r=>{const row=r.rows.find(s=>s.label===label);return '<td>'+ (row?escapeHtml((row.peso||'—')+' kg × '+row.rip):'—')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table><button onclick="historyCompareSelection=[];renderExerciseHistory()">Chiudi confronto</button></section>';
}
function historyWeightKey(value){
  const raw=String(value??'').trim().toLocaleLowerCase('it');
  return /^[+-]?\d+(?:[.,]\d+)?$/.test(raw) ? String(Number(raw.replace(',','.'))) : raw;
}
function collectExerciseHistory(name){
  const result=[];
  const blocks=getChronologicalBlocks();
  blocks.forEach((block,bi)=>{
    (block.days||[]).forEach((day,di)=>{
      (day.esercizi||[]).forEach((ex,ei)=>{
        if(!matchingHistoryNames(name).includes(String(ex.nome||'').trim().toLocaleLowerCase('it'))) return;
        const maxWeeks=Math.max(ex.sets?.length||0,ex.maxEntries?.length||0,ex.maxExtra?.length||0);
        for(let week=0;week<maxWeeks;week++){
          if(block.current && week>(state.currentWeek||0)) continue;
          const rows=[];
          ((ex.sets&&ex.sets[week])||[]).forEach((set,si)=>{
            if(!set || !String(set.rip??'').trim()) return;
            rows.push({label:`Serie ${si+1}`,peso:String(set.peso??''),rip:String(set.rip),rpe:String(set.rpe??''),dropset:!!set.dropset});
          });
          const max=((ex.maxEntries&&ex.maxEntries[week]) || (ex.maxExtra&&ex.maxExtra[week]) || []);
          max.forEach((set,mi)=>{
            if(!set || !String(set.rip??'').trim()) return;
            const after=Number.isInteger(set.afterSet)?` · dopo serie ${set.afterSet+1}`:'';
            rows.push({label:`Max ${mi+1}${after}`,peso:String(set.peso??''),rip:String(set.rip),rpe:String(set.rpe??''),dropset:false});
          });
          if(rows.length) result.push({date:ex.sessionDates?.[week]||'',exerciseId:ex.uiId,linkType:ex.linkType,blockKey:(block.current?'active:':'archive:')+block.name,block:block.name,current:!!block.current,archiveDate:block.current?'':block.date,week,day:day.name||'Giorno',bi,di,ei,completed:!!ex.weekDone?.[week],skipped:!!ex.weekSkipped?.[week],rows});
        }
      });
    });
  });
  (state.sessionHistory||[]).forEach(session=>{
    const block=blocks.find(b=>b.days?.some(d=>d.uiId&&d.uiId===session.dayId));
    session.exercises.forEach((ex,ei)=>{
      if(!matchingHistoryNames(name).includes(String(ex.nome||'').trim().toLocaleLowerCase('it')))return;
      const rows=[...ex.sets.map((s,i)=>({...s,label:'Serie '+(i+1)})),...ex.maxEntries.map((s,i)=>({...s,label:'Max '+(i+1)+(Number.isInteger(s.afterSet)?' · dopo serie '+(s.afterSet+1):'')}))].filter(s=>String(s.rip??'').trim()).map(s=>({...s,peso:String(s.peso??''),rip:String(s.rip),rpe:String(s.rpe??'')}));
      if(!rows.length)return;
      for(let i=result.length-1;i>=0;i--)if(result[i].exerciseId===ex.uiId&&ex.uiId&&result[i].week===session.week&&!result[i].id)result.splice(i,1);
      result.push({id:session.id+':'+(ex.uiId||ei),blockKey:block?(block.current?'active:':'archive:')+block.name:'session:'+session.block,block:block?.name||session.block,current:!!block?.current,week:session.week,day:session.day,date:session.date,completed:ex.completed,skipped:ex.skipped,rows,linkType:ex.linkType,bi:0,di:0,ei});
    });
  });
  return result.sort((a,b)=>a.date&&b.date?b.date.localeCompare(a.date):a.date?-1:b.date?1:b.bi-a.bi||b.week-a.week||a.di-b.di||a.ei-b.ei);
}
function searchExerciseHistory(query){
  const target=document.getElementById('exerciseHistorySuggestions');
  if(!target) return;
  const q=String(query||'').trim().toLocaleLowerCase('it');
  const names=[...new Map(getAllExerciseNamesEverUsed().map(name=>[name.toLocaleLowerCase('it'),name])).values()].filter(name=>name.toLocaleLowerCase('it').includes(q));
  target.replaceChildren();
  if(!q){target.textContent='Scrivi il nome, poi scegli l’esercizio.';return;}
  if(!names.length){target.textContent='Nessun esercizio trovato.';return;}
  names.forEach(name=>{
    const button=document.createElement('button');
    button.type='button';button.className='exercise-history-choice';button.textContent=name;
    button.onclick=()=>{
      exerciseHistoryName=name;exerciseHistoryWeight='';exerciseHistoryBlock='';exerciseHistoryDate='';historyCompareSelection=[];
      document.getElementById('exerciseHistorySearch').value=name;
      target.replaceChildren();
      document.getElementById('exerciseHistorySearch').blur();
      renderExerciseHistory();
    };
    target.append(button);
  });
}
async function chooseExerciseHistoryWeight(){
  const records=collectExerciseHistory(exerciseHistoryName).filter(r=>!exerciseHistoryBlock||r.blockKey===exerciseHistoryBlock);
  const weights=[...new Set(records.flatMap(r=>r.rows.map(s=>historyWeightKey(s.peso))).filter(Boolean))];
  weights.sort((a,b)=>a.localeCompare(b,'it',{numeric:true}));
  const value=await ViridisOptionPicker({title:'Con quale peso?',message:'Mostra le ripetizioni registrate con quel carico.',choices:[{label:'Tutti i pesi',value:''},...weights.map(value=>({label:`${value} kg`,value}))]});
  if(value===null)return;
  exerciseHistoryWeight=value;renderExerciseHistory();
}
async function chooseExerciseHistoryBlock(){
  const blocks=new Map();
  collectExerciseHistory(exerciseHistoryName).forEach(r=>blocks.set(r.blockKey,r.block+(r.current?' · attuale':'')));
  const value=await ViridisOptionPicker({title:'Quale scheda?',choices:[{label:'Tutte le schede',value:''},...[...blocks].map(([value,label])=>({value,label}))]});
  if(value===null)return;
  exerciseHistoryBlock=value;exerciseHistoryWeight='';renderExerciseHistory();
}
function renderExerciseHistory(){
  const target=document.getElementById('exerciseHistoryResults');
  if(!target||!exerciseHistoryName)return;
  const all=collectExerciseHistory(exerciseHistoryName);
  const records=all.filter(r=>(!exerciseHistoryBlock||r.blockKey===exerciseHistoryBlock)&&(!exerciseHistoryDate||historyDateKey(r.date)===exerciseHistoryDate)).map(r=>({...r,rows:r.rows.filter(s=>!exerciseHistoryWeight||historyWeightKey(s.peso)===exerciseHistoryWeight)})).filter(r=>r.rows.length);
  const numericRows=records.flatMap(r=>r.rows).filter(s=>/^\d+(?:[.,]\d+)?$/.test(s.rip.trim()));
  const best=exerciseHistoryWeight&&numericRows.length?numericRows.reduce((a,b)=>Number(a.rip.replace(',','.'))>=Number(b.rip.replace(',','.'))?a:b):null;
  const latest=records[0];
  target.innerHTML=`<h3>${escapeHtml(exerciseHistoryName)}</h3>
    <div class="exercise-history-filters"><button type="button" onclick="chooseExerciseHistoryWeight()">Peso: ${escapeHtml(exerciseHistoryWeight?exerciseHistoryWeight+' kg':'tutti')} ▾</button><button type="button" onclick="chooseHistoryDate()">${exerciseHistoryDate?new Date(exerciseHistoryDate+'T12:00:00').toLocaleDateString('it-IT'):'Tutte le date'} ▾</button><button type="button" onclick="chooseExerciseHistoryBlock()">${escapeHtml(exerciseHistoryBlock?(all.find(r=>r.blockKey===exerciseHistoryBlock)?.block||'Scheda'):'Tutte le schede')} ▾</button></div>
    <div class="exercise-history-actions"><button type="button" onclick="compareExerciseSessions()">Confronta due sessioni</button><details><summary>Nomi esercizio</summary><button type="button" onclick="chooseHistoryAlias()">Collega nome storico</button>${matchingHistoryNames(exerciseHistoryName).length>1?'<button type="button" onclick="clearHistoryAlias()">Separa nomi storici</button>':''}</details></div>
    ${renderHistoryComparison(all)}${latest?`<div class="exercise-history-overview"><div><small>Ultima registrazione</small><b>${escapeHtml(latest.rows.map(s=>`${s.peso||'—'} kg × ${s.rip}`).join(' · '))}</b><small>${escapeHtml(latest.block)} · Settimana ${latest.week+1}</small></div>${best?`<div><small>Migliore serie a ${escapeHtml(exerciseHistoryWeight)} kg</small><b>${escapeHtml(best.rip)} rip</b></div>`:''}</div>`:''}
    <p class="exercise-history-note">${records.length} registrazioni · dalla scheda più recente. Le registrazioni precedenti senza data restano indicate per scheda e settimana.</p>
    ${records.length?records.map((record,i)=>`<details class="exercise-history-session" ${i===0?'open':''}>
      <summary>${i===0?'<span class="exercise-history-latest">ULTIMA REGISTRAZIONE DISPONIBILE</span>':''}<b>${escapeHtml(record.block)} · Settimana ${record.week+1}</b><small>${record.date?escapeHtml(new Date(record.date).toLocaleDateString('it-IT'))+' · ':''}${escapeHtml(record.day)} · ${record.rows.length} serie${record.linkType?' · '+escapeHtml(record.linkType):''}</small></summary>
      <p>${escapeHtml(record.day)}${record.skipped?' · Saltato':record.completed?' · Completato':' · Non segnato completato'}</p>
      ${record.archiveDate?`<p>Archiviata il ${escapeHtml(progressDateLabel(record.archiveDate))}</p>`:''}
      <table><caption class="sr-only">Serie registrate, peso e ripetizioni</caption><thead><tr><th scope="col">Serie</th><th scope="col">Kg</th><th scope="col">Rep</th></tr></thead><tbody>${record.rows.map(row=>`<tr><td>${escapeHtml(row.label)}${row.dropset?'<small>Drop set</small>':''}${row.rpe?`<small>RPE ${escapeHtml(row.rpe)}</small>`:''}</td><td>${escapeHtml(row.peso||'—')}</td><td><b>${escapeHtml(row.rip)}</b></td></tr>`).join('')}</tbody></table>
    </details>`).join(''):'<p class="exercise-history-note">Nessuna ripetizione registrata con questi filtri.</p>'}`;
}
