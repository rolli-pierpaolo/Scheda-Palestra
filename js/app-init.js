// ---------------- INIT ----------------
loadState();
loadActivePos();
loadAchievements();
maybeAutoBackup();
updateTitles();
renderDayTabs();
renderActive();
renderHistList();
checkAchievements();
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
