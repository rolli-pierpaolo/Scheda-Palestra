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

  function trapFocus(e, modalEl){
    if(e.key !== 'Tab') return;
    const box = modalEl.querySelector('.modal-box') || modalEl;
    const focusables = [...getFocusable(box)].filter(el => !el.hidden);
    if(!focusables.length){
      e.preventDefault();
      box.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }

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

  document.addEventListener('keydown', (e)=>{
    const openModal = [...document.querySelectorAll('.modal-overlay')].find(isOpen);
    if(!openModal) return;
    if(e.key === 'Tab'){
      trapFocus(e, openModal);
      return;
    }
    if(e.key !== 'Escape') return;
    e.preventDefault();
    const closeButton = openModal.querySelector('.modal-head button') ||
      [...getFocusable(openModal)].find(el =>
        el.tagName === 'BUTTON' && /annulla|no, non/i.test(el.textContent || '')
      );
    if(closeButton) closeButton.click();
    else openModal.click();
  });
})();
