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
  if(!backup || !backup.state || !backup.state.days){
    alert("Il testo incollato non sembra un backup valido.");
    return;
  }
  if(!confirm("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
  applyBackup(backup);
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
    if(!backup || !backup.state || !backup.state.days){
      alert("Il file scelto non sembra un backup valido.");
      return;
    }
    if(!confirm("Questo sovrascrivera' l'allenamento attivo, lo storico e lo stato delle settimane con quelli del backup. Continuare?")) return;
    applyBackup(backup);
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
    // avviso PRIMA di far comparire il file, altrimenti su telefono spunta un
    // download misterioso senza spiegazione e non si capisce cos'e'
    alert("📥 Sta per scaricarsi un file: e' il backup automatico di oggi (scheda-wo-backup.json). Non serve aprirlo, resta li' pronto se un giorno ti servisse ripristinare i dati.");
    const json = JSON.stringify(buildBackupPayload());
    downloadBackupFile(json, 'scheda-wo-backup.json');
    localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now()));
    showAutoBackupToast();
  }catch(e){} // se qualcosa va storto va bene lo stesso: c'e' sempre "Esporta backup" a mano
}
function downloadBackupFile(json, filename){
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function showAutoBackupToast(){
  let el = document.getElementById('autoBackupToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'autoBackupToast';
    el.className = 'pr-toast';
    document.body.appendChild(el);
  }
  el.textContent = "💾 Backup automatico di oggi salvato";
  el.classList.add('show');
  clearTimeout(window._autoBackupToastTimer);
  window._autoBackupToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 2600);
}

