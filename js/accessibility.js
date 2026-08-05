// ---------------- ACCESSIBILITA': GESTIONE FOCUS NEI MODALI ----------------
// Aggiunge la gestione del focus a TUTTI i modali dell'app in un colpo solo,
// osservando i cambi di style.display invece di dover toccare ognuna delle
// dozzine di funzioni apri/chiudi sparse in una decina di file diversi: chi
// naviga a tastiera o con uno screen reader, aprendo un modale, ci si ritrova
// subito dentro (invece di restare "fuori" sulla pagina sotto, invisibile ma
// ancora raggiungibile con Tab); chiudendolo, il focus torna esattamente al
// bottone che l'aveva aperto, invece di perdersi in cima alla pagina.
(function(){
  let lastFocusedBeforeModal = null;

  function getFocusable(container){
    return container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function onModalOpened(modalEl){
    lastFocusedBeforeModal = document.activeElement;
    const box = modalEl.querySelector('.modal-box') || modalEl;
    const focusables = getFocusable(box);
    if(focusables.length){
      focusables[0].focus();
    } else {
      box.setAttribute('tabindex','-1');
      box.focus();
    }
  }
  function onModalClosed(){
    if(lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)){
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  }

  // i modali di questa app usano sempre e solo display:none (chiuso) /
  // display:flex (aperto), mai altri valori - vedi tutte le funzioni open*/close*
  function isOpen(el){
    return el.style.display !== 'none' && el.style.display !== '';
  }

  document.querySelectorAll('.modal-overlay').forEach(modalEl=>{
    let wasOpen = isOpen(modalEl);
    const observer = new MutationObserver(()=>{
      const nowOpen = isOpen(modalEl);
      if(nowOpen && !wasOpen) onModalOpened(modalEl);
      if(!nowOpen && wasOpen) onModalClosed();
      wasOpen = nowOpen;
    });
    observer.observe(modalEl, { attributes:true, attributeFilter:['style'] });
  });

  // Esc chiude il modale aperto in questo momento, come ci si aspetta da
  // tastiera - senza dover sapere quale specifica funzione closeX() usare,
  // basta simulare il click sullo sfondo (ogni modale lo gestisce gia' da solo)
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    const openModal = [...document.querySelectorAll('.modal-overlay')].find(isOpen);
    if(openModal) openModal.click();
  });
})();
