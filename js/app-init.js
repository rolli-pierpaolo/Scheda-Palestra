// ---------------- INIT ----------------
// chiede al sistema di NON liberare mai i dati di questo sito sotto pressione
// di spazio ("storage persistente"): silenzioso su quasi tutti i browser
// (nessuna finestra di permesso, la decisione e' automatica in base all'uso),
// riduce il rischio di perdita dati se l'app resta a lungo senza essere aperta.
// Un solo tentativo basta, non serve richiederlo a ogni avvio
if('storage' in navigator && navigator.storage.persist && localStorage.getItem('scheda_wo18_storage_persist_asked_v1') !== '1'){
  navigator.storage.persist().catch(()=>{}).finally(()=>{
    try{ localStorage.setItem('scheda_wo18_storage_persist_asked_v1','1'); }catch(e){}
  });
}
loadState();
loadActivePos();
loadAchievements();
maybeAutoBackup();
updateTitles();
renderDayTabs();
renderActive();
renderHistList();
checkAchievements();

initAnimations();

document.getElementById('histBody').innerHTML = '<div class="footer-note">Seleziona un WO storico qui sopra.</div>';
// niente allenamento in corso (mai iniziato, o concluso con "Giorno terminato"):
// si apre sulla Home invece che tornare dritti sulla scheda esercizi
if(workoutInProgress){
  showView('active');
  requestWakeLock(); // si apre gia' sulla tab Allenamento, quindi il wake lock parte subito
  if(activeExerciseIdx !== null && !isDesktopDevice()){
    // si posiziona subito (senza animazione: e' l'apertura della pagina, non uno
    // scroll fatto dall'utente); il piccolo ritardo lascia il tempo al browser di
    // calcolare il layout della pagina appena renderizzata
    setTimeout(()=>{
      const card = document.querySelector('#viewActive .card[data-exi="'+activeExerciseIdx+'"], #viewActive .card[data-exi2="'+activeExerciseIdx+'"]');
      if(card) card.scrollIntoView({block:'center'});
    }, 120);
  }
} else {
  showHome();
}
