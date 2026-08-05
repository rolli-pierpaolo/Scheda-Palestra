// ---------------- GRAFICO PROGRESSIONE ----------------
// un punto per ogni settimana (1-4) del mese ATTIVO corrente, con il peso
// massimo fatto in quella settimana per questo esercizio. Niente confronto con
// i mesi archiviati nello storico: schema serie/rip puo' cambiare da un mese
// all'altro, quindi confrontare i pesi tra mesi diversi non avrebbe senso
function computeExerciseWeekProgress(ex){
  const points = [];
  const nWeeks = (ex.sets && ex.sets.length) || (ex.recupero && ex.recupero.length) || state.weeksPerBlock || 4;
  for(let w=0; w<nWeeks; w++){
    const sets = (ex.sets && ex.sets[w]) || [];
    let best = null;
    sets.forEach(s=>{
      const p = parseFloat(String(s.peso).replace(',','.'));
      if(!isNaN(p) && p>0 && (best===null || p>best)) best = p;
    });
    if(best!==null) points.push({label:'Sett. '+(w+1), value:best});
  }
  return points;
}
// disegna a mano un piccolo grafico a linee in SVG (niente librerie esterne):
// scala i punti dentro l'area utile W/H meno i padding, poi costruisce il
// path della linea, i pallini e le etichette (saltandone alcune se sono troppe)
function renderChartSVG(points){
  const W = 320, H = 190, padL = 30, padR = 14, padT = 20, padB = 30;
  const vals = points.map(p=>p.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = (maxV - minV) || 1;
  const n = points.length;
  const stepX = n>1 ? (W - padL - padR) / (n - 1) : 0;
  const coords = points.map((p,i)=>{
    const x = padL + i*stepX;
    const y = padT + (H - padT - padB) * (1 - (p.value - minV)/range);
    return {x,y,label:p.label,value:p.value};
  });
  const path = coords.map((c,i)=> (i===0?'M':'L') + c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ');
  const dots = coords.map(c=>`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="#9ACD32"></circle>`).join('');
  const skip = Math.max(1, Math.ceil(n/6));
  const labels = coords.map((c,i)=> (i%skip===0 || i===n-1) ? `<text x="${c.x.toFixed(1)}" y="${H-10}" font-size="8" fill="#9E9E9E" text-anchor="middle">${escapeHtml(String(c.label).replace('WO ','W'))}</text>` : '').join('');
  const valLabels = coords.map(c=>`<text x="${c.x.toFixed(1)}" y="${(c.y-8).toFixed(1)}" font-size="9" fill="#F2F2F2" text-anchor="middle" font-weight="700">${c.value}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
    <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="#3A3A3A" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="#9ACD32" stroke-width="2"/>
    ${dots}${labels}${valLabels}
  </svg>`;
}
function openChart(exi){
  const ex = state.days[activeDayIdx].esercizi[exi];
  const points = computeExerciseWeekProgress(ex);
  document.getElementById('chartTitle').textContent = ex.nome || 'Esercizio';
  const body = document.getElementById('chartBody');
  if(points.length < 2){
    body.innerHTML = '<div class="footer-note" style="padding:10px 0;">Non ci sono ancora abbastanza settimane con dati per questo esercizio in "'+escapeHtml(state.title||'questo mese')+'".</div>';
  } else {
    body.innerHTML = renderChartSVG(points);
  }
  document.getElementById('chartModal').style.display = 'flex';
}
function closeChart(){
  document.getElementById('chartModal').style.display = 'none';
}

// stesso oggetto usato sia dal backup manuale (Esporta backup) sia da quello
// automatico giornaliero, cosi' restano sempre nello stesso formato importabile.
// schemaVersion non e' ancora usato per migrazioni (non serve finche' il
// formato non cambia davvero), ma c'e' gia' pronto: se in futuro cambiasse la
// forma di uno di questi campi, validateBackup (js/backup.js) puo' leggerlo
// per capire come interpretare un backup vecchio invece di rifiutarlo e basta
const BACKUP_SCHEMA_VERSION = 1;
function buildBackupPayload(){
  return { schemaVersion: BACKUP_SCHEMA_VERSION, state, storicoExtra, collapsedMap, deletedStorico, calendarLog, extraLists, exerciseGroups, deletedEsercizi, exportedAt: new Date().toISOString() };
}
