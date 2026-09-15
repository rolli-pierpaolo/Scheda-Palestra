// Fallback per viewer HTML che ignorano il meta viewport: forza la scala corretta
// misurando l'overflow reale e applicando uno zoom compensativo.
(function(){
  function fitToScreen(){
    var sw = window.innerWidth || document.documentElement.clientWidth;
    var dw = document.documentElement.scrollWidth;
    if(dw > sw + 4){
      document.documentElement.style.zoom = String(sw/dw);
    } else {
      document.documentElement.style.zoom = "";
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(fitToScreen, 50); });
  window.addEventListener('load', fitToScreen);
  window.addEventListener('resize', fitToScreen);
  window.addEventListener('orientationchange', function(){ setTimeout(fitToScreen, 200); });

  // service worker per funzionare anche offline (vedi sw.js): richiede una
  // connessione "sicura" (https, o localhost) - su file:// il browser non lo
  // registra nemmeno, quindi qui non succede nulla di grave, silenziosamente
  if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    var updateBannerShown = false;
    function showAppUpdateBanner(){
      var banner = document.getElementById('appUpdateBanner');
      if(banner){ banner.hidden = false; updateBannerShown = true; }
    }
    // Richiamata dal pulsante nel banner. blur fa scattare prima l'eventuale
    // onchange del campo su cui si sta scrivendo; i dati vengono così salvati
    // prima del refresh, senza richiedere di chiudere l'app manualmente.
    window.applyAppUpdate = function(){
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.location.reload();
    };
    window.addEventListener('load', function(){
      // Il numero di build nel URL evita che una cache HTTP troppo aggressiva
      // trattenga il service worker precedente dopo una nuova pubblicazione.
      navigator.serviceWorker.register('sw.js?v=1.22').then(function(registration){
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
        // Controlla subito al ritorno nell'app e poi periodicamente: il banner
        // rende l'aggiornamento una scelta di un tocco, non una sequenza di
        // chiusure e riaperture.
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
