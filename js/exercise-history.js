// Consultazione soltanto: nessuna normalizzazione o scrittura dei dati salvati.
let exerciseHistoryName = '';
let exerciseHistoryWeight = '';
let exerciseHistoryBlock = '';
function historyWeightKey(value){
  const raw=String(value??'').trim().toLocaleLowerCase('it');
  return /^[+-]?\d+(?:[.,]\d+)?$/.test(raw) ? String(Number(raw.replace(',','.'))) : raw;
}
function collectExerciseHistory(name){
  const key=String(name||'').trim().toLocaleLowerCase('it');
  const result=[];
  const blocks=getChronologicalBlocks();
  blocks.forEach((block,bi)=>{
    (block.days||[]).forEach((day,di)=>{
      (day.esercizi||[]).forEach((ex,ei)=>{
        if(String(ex.nome||'').trim().toLocaleLowerCase('it')!==key) return;
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
          if(rows.length) result.push({blockKey:(block.current?'active:':'archive:')+block.name,block:block.name,current:!!block.current,archiveDate:block.current?'':block.date,week,day:day.name||'Giorno',bi,di,ei,completed:!!ex.weekDone?.[week],skipped:!!ex.weekSkipped?.[week],rows});
        }
      });
    });
  });
  return result.sort((a,b)=>b.bi-a.bi || b.week-a.week || a.di-b.di || a.ei-b.ei);
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
      exerciseHistoryName=name;exerciseHistoryWeight='';exerciseHistoryBlock='';
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
  const records=all.filter(r=>!exerciseHistoryBlock||r.blockKey===exerciseHistoryBlock).map(r=>({...r,rows:r.rows.filter(s=>!exerciseHistoryWeight||historyWeightKey(s.peso)===exerciseHistoryWeight)})).filter(r=>r.rows.length);
  target.innerHTML=`<h3>${escapeHtml(exerciseHistoryName)}</h3>
    <div class="exercise-history-filters"><button type="button" onclick="chooseExerciseHistoryWeight()">Peso: ${escapeHtml(exerciseHistoryWeight?exerciseHistoryWeight+' kg':'tutti')} ▾</button><button type="button" onclick="chooseExerciseHistoryBlock()">${escapeHtml(exerciseHistoryBlock?(all.find(r=>r.blockKey===exerciseHistoryBlock)?.block||'Scheda'):'Tutte le schede')} ▾</button></div>
    <p class="exercise-history-note">${records.length} registrazioni · dalla scheda più recente. Le date delle singole sessioni non sono disponibili.</p>
    ${records.length?records.map((record,i)=>`<details class="exercise-history-session" ${i===0?'open':''}>
      <summary>${i===0?'<span class="exercise-history-latest">ULTIMA REGISTRAZIONE DISPONIBILE</span>':''}<b>${escapeHtml(record.block)} · Settimana ${record.week+1}</b><small>${escapeHtml(record.day)} · ${record.rows.length} serie</small></summary>
      <p>${escapeHtml(record.day)}${record.skipped?' · Saltato':record.completed?' · Completato':' · Non segnato completato'}</p>
      ${record.archiveDate?`<p>Archiviata il ${escapeHtml(progressDateLabel(record.archiveDate))}</p>`:''}
      <table><caption class="sr-only">Serie registrate, peso e ripetizioni</caption><thead><tr><th scope="col">Serie</th><th scope="col">Kg</th><th scope="col">Rep</th></tr></thead><tbody>${record.rows.map(row=>`<tr><td>${escapeHtml(row.label)}${row.dropset?'<small>Drop set</small>':''}${row.rpe?`<small>RPE ${escapeHtml(row.rpe)}</small>`:''}</td><td>${escapeHtml(row.peso||'—')}</td><td><b>${escapeHtml(row.rip)}</b></td></tr>`).join('')}</tbody></table>
    </details>`).join(''):'<p class="exercise-history-note">Nessuna ripetizione registrata con questi filtri.</p>'}`;
}
