function exportBackup(){
  const json = JSON.stringify(buildBackupPayload());
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(json).then(()=>{
      ViridisToast("Backup copiato negli appunti! Incollalo subito in una Nota, Mail o messaggio per conservarlo.");
    }).catch(()=>{ promptFallbackExport(json); });
  } else {
    promptFallbackExport(json);
  }
}
async function promptFallbackExport(json){
  await ViridisInputDialog("Copia tutto questo testo (tocca dentro, seleziona tutto, copia) e conservalo:", json, {title:"Copia backup", multiline:true, readOnly:true, acceptLabel:"Fine"});
}
function exportBackupFile(){
  const json = JSON.stringify(buildBackupPayload());
  downloadBackupFile(json, 'scheda-wo-backup.json');
}
async function shareBackup(){
  const json = JSON.stringify(buildBackupPayload());
  try{
    const file = new File([json], 'scheda-wo-backup.json', {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'Backup Scheda Allenamento'});
      return;
    }
  }catch(e){
    if(e && e.name === 'AbortError') return;
  }
  downloadBackupFile(json, 'scheda-wo-backup.json');
}
function applyBackup(backup){
  state = backup.state;
  storicoExtra = backup.storicoExtra || {};
  collapsedMap = backup.collapsedMap || {};
  deletedStorico = backup.deletedStorico || [];
  calendarLog = backup.calendarLog || {};
  extraLists = backup.extraLists || {esercizi:[], recuperi:[], schemi:[], giorni:[]};
  exerciseGroups = backup.exerciseGroups || {};
  deletedEsercizi = backup.deletedEsercizi || [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStorico();
  saveCollapsed();
  saveDeletedStorico();
  saveCalendarLog();
  saveExtraLists();
  saveExerciseGroups();
  saveDeletedEsercizi();
  activeDayIdx = 0;
  histActive = null;
  updateTitles();
  renderDayTabs();
  renderActive();
  renderHistList();
  document.getElementById('histDayTabs').innerHTML = '';
  document.getElementById('histBody').innerHTML = '<div class="footer-note">Seleziona un WO storico qui sopra.</div>';
  if(typeof renderHome === 'function') renderHome();
}
function validateBackup(backup){
  if(!backup || typeof backup !== 'object' || Array.isArray(backup)){
    return { valid:false, reason:"il testo non contiene un backup valido." };
  }
  if(!backup.state || typeof backup.state !== 'object'){
    return { valid:false, reason:"manca la scheda di allenamento (state)." };
  }
  if(!Array.isArray(backup.state.days)){
    return { valid:false, reason:"manca l'elenco dei giorni di allenamento." };
  }
  for(const day of backup.state.days){
    if(!day || typeof day !== 'object' || !Array.isArray(day.esercizi)){
      return { valid:false, reason:"un giorno di allenamento nel backup non ha un elenco esercizi valido." };
    }
  }
  const optionalObjectFields = ['storicoExtra','collapsedMap','calendarLog','exerciseGroups'];
  for(const f of optionalObjectFields){
    if(backup[f] !== undefined && (typeof backup[f] !== 'object' || Array.isArray(backup[f]))){
      return { valid:false, reason:'il campo "'+f+'" del backup non ha il formato atteso.' };
    }
  }
  const optionalArrayFields = ['deletedStorico','deletedEsercizi'];
  for(const f of optionalArrayFields){
    if(backup[f] !== undefined && !Array.isArray(backup[f])){
      return { valid:false, reason:'il campo "'+f+'" del backup non ha il formato atteso.' };
    }
  }
  return { valid:true };
}
async function importBackup(){
  const txt = await ViridisInputDialog("Incolla qui il testo del backup che avevi salvato:", "", {title:"Importa backup", multiline:true, acceptLabel:"Verifica backup"});
  if(!txt || !txt.trim()) return;
  let backup;
  try{
    backup = JSON.parse(txt);
  }catch(e){
    ViridisModal("Testo non valido: assicurati di aver incollato tutto il backup.");
    return;
  }
  const check = validateBackup(backup);
  if(!check.valid){
    ViridisModal("Backup non valido: " + check.reason);
    return;
  }
  if(!await ViridisConfirmDialog("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
  applyBackup(backup);
  if(typeof pushToCloud === 'function') pushToCloud();
  ViridisToast("Backup ripristinato!");
}
function importBackupFile(event){
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let backup;
    try{
      backup = JSON.parse(reader.result);
    }catch(e){
      ViridisModal("File non valido: non sembra un backup JSON.");
      return;
    }
    const check = validateBackup(backup);
    if(!check.valid){
      ViridisModal("File non valido: " + check.reason);
      return;
    }
    if(!await ViridisConfirmDialog("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
    applyBackup(backup);
    if(typeof pushToCloud === 'function') pushToCloud();
    ViridisToast("Backup ripristinato dal file!");
  };
  reader.onerror = () => ViridisToast("Errore durante la lettura del file.");
  reader.readAsText(file);
}

const AUTO_BACKUP_KEY = "scheda_wo18_last_autobackup_v1";
const AUTO_BACKUP_SNAPSHOT_KEY = "scheda_wo18_autobackup_snapshot_v1";
function formatAutoBackupDate(timestamp){
  if(!timestamp) return 'nessun backup automatico creato ancora';
  return new Date(timestamp).toLocaleString('it-IT', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
}
function renderAutoBackupStatus(){
  const el = document.getElementById('autoBackupStatus');
  if(!el) return;
  let last = 0;
  try{ last = parseInt(localStorage.getItem(AUTO_BACKUP_KEY),10) || 0; }catch(e){}
  el.textContent = 'Copia di sicurezza automatica attiva. Ultima: ' + formatAutoBackupDate(last) + '. Con account, i dati sono anche sincronizzati nel cloud.';
}
function createAutoBackupNow(){
  const json = JSON.stringify(buildBackupPayload());
  downloadBackupFile(json, 'scheda-wo-backup.json');
  saveAutomaticBackupSnapshot(json);
}
function saveAutomaticBackupSnapshot(json){
  try{
    localStorage.setItem(AUTO_BACKUP_SNAPSHOT_KEY, json || JSON.stringify(buildBackupPayload()));
    localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now()));
  }catch(e){}
  renderAutoBackupStatus();
}
function maybeAutoBackup(){
  let last = 0;
  try{ last = parseInt(localStorage.getItem(AUTO_BACKUP_KEY),10) || 0; }catch(e){}
  if(Date.now() - last < 24*60*60*1000) return;
  try{
    saveAutomaticBackupSnapshot();
  }catch(e){}
}
function downloadTextFile(content, filename, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function downloadBackupFile(json, filename){
  downloadTextFile(json, filename, 'application/json');
}
function csvEscapeCell(val){
  const s = String(val==null ? '' : val);
  return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function buildCSVRows(){
  const rows = [['Blocco','Giorno','Esercizio','Settimana','Serie','Peso (kg)','Ripetizioni','RPE']];
  getChronologicalBlocks().forEach(block=>{
    (block.days||[]).forEach(day=>{
      (day.esercizi||[]).forEach(ex=>{
        (ex.sets||[]).forEach((weekSets,w)=>{
          (weekSets||[]).forEach((s,si)=>{
            if(!s) return;
            const peso = s.peso!=null ? String(s.peso) : '';
            const rip = s.rip!=null ? String(s.rip) : '';
            const rpe = s.rpe!=null ? String(s.rpe) : '';
            if(peso==='' && rip==='' && rpe==='') return;
            rows.push([block.name, day.name||'', ex.nome||'', w+1, si+1, peso, rip, rpe]);
          });
        });
      });
    });
  });
  return rows;
}
function exportCSV(){
  const rows = buildCSVRows();
  if(rows.length<=1){ ViridisToast('Non ci sono ancora serie registrate da esportare.'); return; }
  const csv = rows.map(r=>r.map(csvEscapeCell).join(',')).join('\r\n');
  // Il BOM permette a Excel di leggere correttamente gli accenti nel CSV.

  downloadTextFile('﻿'+csv, 'viridis-export.csv', 'text/csv;charset=utf-8;');
}
function showAutoBackupToast(){
  let el = document.getElementById('autoBackupToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'autoBackupToast';
    el.className = 'pr-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = ICON_DISK + " Backup automatico di oggi salvato";
  el.classList.add('show');
  clearTimeout(window._autoBackupToastTimer);
  window._autoBackupToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 2600);
}
