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
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    });
  }
})();
