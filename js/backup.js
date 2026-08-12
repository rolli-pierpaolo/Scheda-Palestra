function exportBackup(){
  const json = JSON.stringify(buildBackupPayload());
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(json).then(()=>{
      alert("Backup copiato negli appunti! Incollalo subito in una Nota, Mail o messaggio per conservarlo.");
    }).catch(()=>{ promptFallbackExport(json); });
  } else {
    promptFallbackExport(json);
  }
}
function promptFallbackExport(json){
  prompt("Copia tutto questo testo (tocca dentro, seleziona tutto, copia) e conservalo:", json);
}
// alternativa a "Esporta backup": invece di copiare il testo negli appunti,
// scarica direttamente un file .json (stessa funzione downloadBackupFile
// gia' usata dal backup automatico giornaliero)
// nome fisso (non con la data) apposta: cosi' se il telefono/browser permette
// di sovrascrivere un file scaricato in precedenza con lo stesso nome, lo fa,
// invece di accumulare un file diverso ogni giorno. Non e' garantito (dipende
// dal browser/sistema, una pagina web non puo' deciderlo con certezza), ma e'
// il modo che ci arriva piu' vicino
function exportBackupFile(){
  const json = JSON.stringify(buildBackupPayload());
  downloadBackupFile(json, 'scheda-wo-backup.json');
}
// genera il backup fresco al volo e lo passa DIRETTAMENTE al foglio di
// condivisione nativo del telefono (Drive, WhatsApp, mail...), senza dover
// prima scaricarlo e poi andarlo a recuperare a mano dai download. Se il
// telefono/browser non supporta la condivisione di file (es. desktop, iOS
// vecchi) ripiega sullo stesso download di sempre, cosi' non si rompe nulla
async function shareBackup(){
  const json = JSON.stringify(buildBackupPayload());
  try{
    const file = new File([json], 'scheda-wo-backup.json', {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'Backup Scheda Allenamento'});
      return;
    }
  }catch(e){
    if(e && e.name === 'AbortError') return; // condivisione annullata dall'utente, non e' un errore
  }
  downloadBackupFile(json, 'scheda-wo-backup.json');
}
// applica un oggetto di backup gia' parsato (arrivi qui sia da testo incollato
// che da file) e ridisegna tutto: stesso identico effetto in entrambi i casi
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
  // BUG risolto qui: mancava questa riga. renderActive() sopra ridisegna
  // solo la scheda Allenamento (#viewActive) - se in quel momento si e'
  // sulla Home (es. dopo aver toccato "dati aggiornati, tocca per
  // ricaricare" nel banner della sync), i dati venivano aggiornati
  // davvero dietro le quinte ma la Home restava quella vecchia in vista,
  // sembrando che il tocco sul banner non avesse fatto nulla
  if(typeof renderHome === 'function') renderHome();
}
// controllo piu' serio di "c'e' backup.state.days": applyBackup usa gia'
// "|| {}"/"|| []" per ogni sezione opzionale, quindi qui basta controllare che
// QUELLO che c'e' abbia davvero la forma giusta - un campo del tipo sbagliato
// (es. un array al posto di un oggetto) e' un segnale di corruzione piu'
// forte di un campo assente, e prima passava inosservato fino a un crash
// piu' avanti invece che con un messaggio chiaro subito
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
function importBackup(){
  const txt = prompt("Incolla qui il testo del backup che avevi salvato:");
  if(!txt || !txt.trim()) return;
  let backup;
  try{
    backup = JSON.parse(txt);
  }catch(e){
    alert("Testo non valido: assicurati di aver incollato tutto il backup.");
    return;
  }
  const check = validateBackup(backup);
  if(!check.valid){
    alert("Backup non valido: " + check.reason);
    return;
  }
  if(!confirm("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
  applyBackup(backup);
  // applyBackup scrive solo in locale (la usano anche pullFromCloud e la
  // visualizzazione condivisa, dove ripubblicare sul cloud sarebbe sbagliato
  // o inutile): qui invece, un ripristino manuale voluto dall'utente, va
  // anche mandato al cloud se e' collegato - altrimenti il dispositivo
  // resta con dati diversi da quelli sincronizzati finche' non si tocca
  // qualcos'altro
  if(typeof pushToCloud === 'function') pushToCloud();
  alert("Backup ripristinato!");
}
// stesso identico flusso di importBackup, ma leggendo un file scelto dal telefono
// (es. quello scaricato dal backup automatico) invece di un testo incollato a mano
function importBackupFile(event){
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = ''; // permette di riselezionare lo stesso file una seconda volta
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let backup;
    try{
      backup = JSON.parse(reader.result);
    }catch(e){
      alert("File non valido: non sembra un backup JSON.");
      return;
    }
    const check = validateBackup(backup);
    if(!check.valid){
      alert("File non valido: " + check.reason);
      return;
    }
    if(!confirm("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
    applyBackup(backup);
    if(typeof pushToCloud === 'function') pushToCloud();
    alert("Backup ripristinato dal file!");
  };
  reader.onerror = () => alert("Errore durante la lettura del file.");
  reader.readAsText(file);
}

// ---------------- BACKUP AUTOMATICO GIORNALIERO ----------------
// una pagina web non puo' salvare file da sola in modo del tutto invisibile
// (il telefono/browser mostra comunque il download), pero' possiamo evitare di
// doverci pensare noi: alla prima apertura della giornata (24h dall'ultimo
// backup automatico) scarichiamo da soli un file col backup, stesso formato
// di "Esporta backup", cosi' c'e' sempre una copia recente anche se ce ne dimentichiamo
const AUTO_BACKUP_KEY = "scheda_wo18_last_autobackup_v1";
function maybeAutoBackup(){
  let last = 0;
  try{ last = parseInt(localStorage.getItem(AUTO_BACKUP_KEY),10) || 0; }catch(e){}
  if(Date.now() - last < 24*60*60*1000) return; // gia' fatto nelle ultime 24h
  try{
    // niente piu' alert() prima: bloccava l'apertura dell'app finche' non si
    // toccava "OK", ogni volta. Il download parte subito, il tocco di spiegazione
    // resta solo nel piccolo avviso che sparisce da solo (showAutoBackupToast) -
    // il download in se' il browser/telefono lo segnala comunque a modo suo
    // (barra scaricamenti o notifica di sistema), nessuna pagina web puo'
    // salvare un file del tutto invisibile: quella parte non dipende da noi
    const json = JSON.stringify(buildBackupPayload());
    downloadBackupFile(json, 'scheda-wo-backup.json');
    localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now()));
    showAutoBackupToast();
  }catch(e){} // se qualcosa va storto va bene lo stesso: c'e' sempre "Esporta backup" a mano
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
// export CSV (oltre al JSON, che resta il formato "vero" per un ripristino
// completo): una riga per SERIE con dati veri, su tutta la cronologia (blocco
// attivo + tutti quelli archiviati, stessa fonte di getChronologicalBlocks
// gia' usata da Andamenti) - pensato per aprirlo in Excel/Fogli, non per
// reimportarlo in app
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
  if(rows.length<=1){ alert('Non ci sono ancora serie registrate da esportare.'); return; }
  const csv = rows.map(r=>r.map(csvEscapeCell).join(',')).join('\r\n');
  // BOM iniziale: senza, Excel su alcuni sistemi legge gli accenti italiani
  // (perche', gia' fatta...) come caratteri sbagliati
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

