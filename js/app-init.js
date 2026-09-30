if('storage' in navigator && navigator.storage.persist && localStorage.getItem('scheda_wo18_storage_persist_asked_v1') !== '1'){
  navigator.storage.persist().catch(()=>{}).finally(()=>{
    try{ localStorage.setItem('scheda_wo18_storage_persist_asked_v1','1'); }catch(e){}
  });
}
function updateTopbarHeightVar(){
  const el = document.querySelector('.topbar');
  if(el) document.documentElement.style.setProperty('--topbar-h', el.offsetHeight + 'px');
}
updateTopbarHeightVar();
window.addEventListener('resize', updateTopbarHeightVar);
if(typeof ResizeObserver !== 'undefined'){
  const topbarElement = document.querySelector('.topbar');
  if(topbarElement) new ResizeObserver(updateTopbarHeightVar).observe(topbarElement);
}

try{
  loadState();
  loadAccessibilityPrefs();
  workoutStartedAt = Number(localStorage.getItem(WORKOUT_STARTED_AT_KEY)) || 0;
  loadActivePos();
  loadAchievements();
  maybeAutoBackup();
  updateTitles();
  renderDayTabs();
  renderActive();
  renderHistList();
  checkAchievements();
  if('clearAppBadge' in navigator) navigator.clearAppBadge().catch(()=>{});
  if(typeof initSync === 'function') initSync();

  renderHistBody();
  if(workoutInProgress && dayHasRealProgressThisWeek(state.days[activeDayIdx])){
    showView('active');
    requestWakeLock();
  } else {
    if(workoutInProgress) clearWorkoutSession();
    showHome();
  }

  setTimeout(()=>{ maybeShowOnboarding(); }, 300);

  setTimeout(()=>{ maybeShowInstallBanner(); }, 900);
}catch(err){
  attemptSelfHealOrShowBanner();
}
