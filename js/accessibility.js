// ---------------- ACCESSIBILITÀ: GESTIONE FOCUS NEI MODALI ----------------
// Aggiunge la gestione del focus a tutti i modali dell'app in un colpo solo,
// osservando i cambi di style.display invece di dover toccare ognuna delle
// dozzine di funzioni apri/chiudi sparse in una decina di file diversi: chi
// naviga a tastiera o con uno screen reader, aprendo un modale, ci si ritrova
// subito dentro invece di restare fuori sulla pagina sotto, invisibile ma
// ancora raggiungibile con tab. Chiudendolo, il focus torna esattamente al
// bottone che l'aveva aperto, invece di perdersi in cima alla pagina
(function(){
  // tiene a mente cosa era selezionato prima di aprire un modale, per
  // poterci tornare quando si chiude
  let lastFocusedBeforeModal = null;

  // trova tutti gli elementi dentro un contenitore su cui si può mettere il
  // focus (bottoni, link, campi di testo e simili)
  function getFocusable(container){
    return container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  // quando un modale si apre, sposta il focus dentro di esso: sul primo
  // elemento cliccabile se c'è, altrimenti sul modale stesso
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
  // quando un modale si chiude, riporta il focus dove stava prima di aprirlo
  function onModalClosed(){
    if(lastFocusedBeforeModal && document.body.contains(lastFocusedBeforeModal)){
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  }

  // i modali di questa app usano sempre e solo display:none (chiuso) o
  // display:flex (aperto), mai altri valori - vedi tutte le funzioni open*/close*
  function isOpen(el){
    return el.style.display !== 'none' && el.style.display !== '';
  }

  // osserva ogni modale già presente nella pagina e reagisce ogni volta che
  // si apre o si chiude, senza dover modificare le funzioni open*/close* stesse
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

  // esc chiude il modale aperto in questo momento, come ci si aspetta da
  // tastiera - senza dover sapere quale specifica funzione closeX() usare,
  // basta simulare il click sullo sfondo, che ogni modale gestisce già da solo
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    const openModal = [...document.querySelectorAll('.modal-overlay')].find(isOpen);
    if(openModal) openModal.click();
  });
})();
