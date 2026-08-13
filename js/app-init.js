// ---------------- INIT ----------------
// chiede al sistema di non liberare mai i dati di questo sito sotto pressione
// di spazio, storage persistente: silenzioso su quasi tutti i browser, nessuna
// finestra di permesso, la decisione è automatica in base all'uso, riduce il
// rischio di perdita dati se l'app resta a lungo senza essere aperta. Un solo
// tentativo basta, non serve richiederlo a ogni avvio
if('storage' in navigator && navigator.storage.persist && localStorage.getItem('scheda_wo18_storage_persist_asked_v1') !== '1'){
  navigator.storage.persist().catch(()=>{}).finally(()=>{
    try{ localStorage.setItem('scheda_wo18_storage_persist_asked_v1','1'); }catch(e){}
  });
}
// altezza reale della topbar, varia da telefono a telefono per via della
// tacca o isola dinamica, env(safe-area-inset-top): usata per posizionare
// l'header sticky del nome esercizio esattamente sotto, senza sovrapporsi né
// lasciare uno spazio vuoto. Ricalcolata anche al resize, rotazione schermo
function updateTopbarHeightVar(){
  const el = document.querySelector('.topbar');
  if(el) document.documentElement.style.setProperty('--topbar-h', el.offsetHeight + 'px');
}
updateTopbarHeightVar();
window.addEventListener('resize', updateTopbarHeightVar);

// tutta l'inizializzazione vera e propria è avvolta in un try/catch: se
// qualcosa qui dentro va storto, il sospetto principale essendo html e js
// disallineati per via della cache, vedi js/error-boundary.js, l'app prova a
// ripararsi da sola invece di restare rotta in silenzio con dati che
// sembrano spariti mentre sono ancora lì in localStorage
try{
  // carica tutto quello che serve dal telefono: la scheda vera, dove si era
  // rimasti, gli obiettivi sbloccati, e fa partire subito il primo disegno
  // delle varie parti della pagina
  loadState();
  loadActivePos();
  loadAchievements();
  maybeAutoBackup();
  updateTitles();
  renderDayTabs();
  renderActive();
  renderHistList();
  checkAchievements();
  // il badge numerico sull'icona, esercizi rimasti oggi, è stato tolto:
  // confuso con delle notifiche vere e giudicato inutile. Questa riga pulisce
  // un badge eventualmente rimasto acceso da prima che lo si togliesse, va
  // tolta anche lei una volta che nessuno ha più un badge vecchio in giro
  if('clearAppBadge' in navigator) navigator.clearAppBadge().catch(()=>{});
  if(typeof initSync === 'function') initSync();

  initAnimations();

  document.getElementById('histBody').innerHTML = '<div class="footer-note">Seleziona un WO storico qui sopra.</div>';
  // niente allenamento in corso, mai iniziato o concluso con "Giorno terminato":
  // si apre sulla Home invece che tornare dritti sulla scheda esercizi.
  // workoutInProgress da solo però non basta: è un interruttore per tutto
  // il blocco, resta acceso anche settimane dopo per via di giorni già
  // conclusi in passato. Si torna dritti al giorno attivo solo se quel
  // giorno, per la settimana corrente, ha davvero un peso scritto, altrimenti
  // è solo la posizione dell'ultima occhiata data, non un allenamento appeso
  // lì, vedi dayHasRealProgressThisWeek in js/state.js
  if(workoutInProgress && dayHasRealProgressThisWeek(state.days[activeDayIdx])){
    // il carosello si posiziona già da solo sulla slide giusta dentro
    // renderActive(), chiamata poco sopra, che traduce activeExerciseIdx nel
    // transform del track - niente altro da fare qui all'apertura dell'app
    showView('active');
    requestWakeLock(); // si apre già sulla tab Allenamento, quindi il wake lock parte subito
  } else {
    showHome();
  }

  // guida rapida: si mostra da sola solo se ci sono consigli mai visti, prima
  // apertura o funzioni nuove aggiunte dopo l'ultima volta. Il piccolo ritardo
  // la fa comparire sopra la vista già scelta sopra, invece di sbattere in
  // faccia prima ancora che la pagina sia visibile
  setTimeout(()=>{ maybeShowOnboarding(); }, 300);

  // banner "installa app", solo iOS Safari, non già installata: ritardo
  // maggiore della guida rapida, così non compaiono insieme sovrapposti
  setTimeout(()=>{ maybeShowInstallBanner(); }, 900);
}catch(err){
  // qualcosa è andato storto durante l'avvio: tenta una riparazione
  // automatica prima di arrendersi e mostrare un banner
  attemptSelfHealOrShowBanner();
}
