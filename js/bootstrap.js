(function(){
  document.documentElement.style.zoom = '';

  if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    var updateBannerShown = false;
    function showAppUpdateBanner(){
      var banner = document.getElementById('appUpdateBanner');
      if(banner){ banner.hidden = false; updateBannerShown = true; }
    }
    var applyingUpdate = false;
    window.applyAppUpdate = function(){
      if(applyingUpdate)return;
      applyingUpdate = true;
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if(typeof finishQuickKeyboardInput==='function')finishQuickKeyboardInput();
      if(typeof persistWorkoutView==='function')persistWorkoutView();
      if(typeof flushSaveState==='function')flushSaveState();
      navigator.serviceWorker.getRegistration().then(function(registration){
        if(registration && registration.waiting){
          navigator.serviceWorker.addEventListener('controllerchange',function(){window.location.reload();},{once:true});
          registration.waiting.postMessage({type:'APPLY_UPDATE'});
        }else window.location.reload();
      }).catch(function(){
        applyingUpdate = false;
        if(typeof ViridisToast==='function')ViridisToast('Aggiornamento non disponibile. I dati sono salvati: riprova tra poco.');
      });
    };
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js?rev=20261009b', {updateViaCache:'none'}).then(function(registration){
        if(registration.waiting) showAppUpdateBanner();
        registration.addEventListener('updatefound', function(){
          var worker = registration.installing;
          if(!worker) return;
          worker.addEventListener('statechange', function(){
            if(worker.state === 'installed' && navigator.serviceWorker.controller){
              showAppUpdateBanner();
            }
          });
        });
        function checkForUpdate(){ registration.update().catch(function(){}); }
        window.addEventListener('focus', checkForUpdate);
        document.addEventListener('visibilitychange', function(){
          if(document.visibilityState === 'visible') checkForUpdate();
        });
        setInterval(checkForUpdate, 15 * 60 * 1000);
      }).catch(function(){});
      navigator.serviceWorker.addEventListener('controllerchange', function(){
        if(!updateBannerShown) showAppUpdateBanner();
      });
    });
  }
})();
