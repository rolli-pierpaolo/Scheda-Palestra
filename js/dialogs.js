// Dialoghi di presentazione: null = annulla input/scelta, false = annulla conferma.
// Nessun accesso a stato, storage o sincronizzazione.
const ViridisDialogs = (() => {
  let tail = Promise.resolve();
  let sequence = 0;
  function open(options){
    const task = tail.then(() => new Promise(resolve => {
      const previous = document.activeElement;
      const overlay = document.createElement('div');
      overlay.className = 'viridis-overlay' + (options.sheet ? ' is-sheet' : '');
      const box = document.createElement('section');
      box.className = 'viridis-dialog';
      box.tabIndex = -1;
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      const id = 'viridis-dialog-' + (++sequence);
      const title = document.createElement('h2');
      title.id = id;
      title.textContent = options.title || 'VIRIDIS';
      box.setAttribute('aria-labelledby', id);
      box.append(title);
      const message = document.createElement('p');
      message.id = id + '-description';
      message.textContent = options.message || '';
      box.setAttribute('aria-describedby', message.id);
      box.append(message);
      overlay.append(box);
      let done = false;
      const reduced = () => typeof prefersReducedMotion === 'function' && prefersReducedMotion();
      const siblings = [...document.body.children].filter(el => !['SCRIPT','STYLE'].includes(el.tagName));
      const inertStates = siblings.map(el => el.inert);
      siblings.forEach(el => { el.inert = true; });
      const oldOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      function finish(value, button){
        if(done) return;
        done = true;
        if(button && options.choices){
          button.classList.add('is-selected');
          if(typeof vibrate === 'function') vibrate(8);
        }
        box.querySelectorAll('button').forEach(el => { el.disabled = true; });
        setTimeout(() => {
          overlay.classList.add('is-closing');
          setTimeout(() => {
            overlay.remove();
            document.removeEventListener('keydown', keydown, true);
            if(window.visualViewport){
              visualViewport.removeEventListener('resize', resize);
              visualViewport.removeEventListener('scroll', resize);
            }
            siblings.forEach((el, i) => { el.inert = inertStates[i]; });
            document.body.style.overflow = oldOverflow;
            if(previous && previous.isConnected && !previous.closest('[inert]')) previous.focus({preventScroll:true});
            resolve(value);
          }, reduced() ? 0 : 160);
        }, button && options.choices && !reduced() ? 90 : 0);
      }
      function button(label, className, action, parent = box){
        const el = document.createElement('button');
        el.type = 'button';
        el.className = className;
        el.textContent = label;
        el.onclick = () => action(el);
        parent.append(el);
        return el;
      }
      if(options.choices){
        const list = document.createElement('div');
        list.className = 'viridis-options' + (options.grid ? ' is-grid' : '');
        box.append(list);
        options.choices.forEach(choice => {
          const el = button(choice.label, 'viridis-option', b => finish(choice.value, b), list);
          if(choice.color){
            const swatch = document.createElement('span');
            swatch.className = 'viridis-swatch';
            swatch.style.backgroundColor = choice.color;
            swatch.setAttribute('aria-hidden', 'true');
            el.prepend(swatch);
          }
          if(choice.selected) el.setAttribute('aria-current', 'true');
        });
      }
      let input;
      if(options.input){
        input = document.createElement(options.multiline ? 'textarea' : 'input');
        input.className = 'viridis-input';
        input.value = options.value == null ? '' : String(options.value);
        input.setAttribute('aria-label', options.message);
        input.inputMode = options.inputMode || 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.readOnly = !!options.readOnly;
        box.append(input);
      }
      if(options.hint){
        const hint = document.createElement('p');
        hint.className = 'viridis-hint';
        hint.textContent = options.hint;
        box.append(hint);
      }
      const error = document.createElement('p');
      error.className = 'viridis-error';
      error.id = id + '-error';
      error.setAttribute('role', 'status');
      error.hidden = true;
      box.append(error);
      const actions = document.createElement('div');
      actions.className = 'viridis-actions';
      box.append(actions);
      if(!options.notice) button(options.cancelLabel || 'Annulla', 'viridis-secondary', () => finish(options.cancelValue), actions);
      function submit(){
        const value = input ? input.value : true;
        const invalid = options.validate && options.validate(value);
        if(invalid){
          error.textContent = invalid;
          error.hidden = false;
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', error.id);
          input.focus();
          return;
        }
        finish(value);
      }
      if(!options.choices) button(options.acceptLabel || (options.notice ? 'Ho capito' : 'Continua'), 'viridis-primary' + (options.destructive ? ' is-danger' : ''), submit, actions);
      if(input) input.addEventListener('keydown', event => {
        if(event.key === 'Enter' && !options.multiline){ event.preventDefault(); submit(); }
      });
      overlay.onclick = event => { if(event.target === overlay && !options.notice) finish(options.cancelValue); };
      function keydown(event){
        if(event.key === 'Escape'){
          event.preventDefault(); event.stopImmediatePropagation();
          finish(options.cancelValue);
        } else if(event.key === 'Tab'){
          event.stopImmediatePropagation();
          const els = [...box.querySelectorAll('button:not(:disabled),input,textarea')];
          const first = els[0], last = els[els.length-1];
          if(!els.length){ event.preventDefault(); box.focus(); }
          else if(event.shiftKey && (document.activeElement === first || document.activeElement === box)){
            event.preventDefault(); last.focus();
          } else if(!event.shiftKey && (document.activeElement === last || document.activeElement === box)){
            event.preventDefault(); first.focus();
          }
        }
      }
      function resize(){
        if(!window.visualViewport) return;
        overlay.style.top = visualViewport.offsetTop + 'px';
        overlay.style.height = visualViewport.height + 'px';
      }
      document.addEventListener('keydown', keydown, true);
      document.body.append(overlay);
      if(window.visualViewport){
        visualViewport.addEventListener('resize', resize);
        visualViewport.addEventListener('scroll', resize);
        resize();
      }
      // Focus sul contenitore: le scelte non aprono mai la tastiera.
      box.focus({preventScroll:true});
    }));
    tail = task.catch(() => {});
    return task;
  }
  return { open };
})();

function ViridisConfirmDialog(message, options = {}){
  const destructive = /elimina|togliere|sovrascriv|azzero|terminare comunque/i.test(message);
  return ViridisDialogs.open({title:destructive ? 'Conferma operazione' : 'Conferma', message,
    destructive, acceptLabel:/elimina/i.test(message) ? 'Elimina' : /togliere/i.test(message) ? 'Rimuovi' : /sovrascriv/i.test(message) ? 'Ripristina' : 'Conferma',
    cancelValue:false, ...options});
}
function ViridisInputDialog(message, value = '', options = {}){
  return ViridisDialogs.open({title:'Inserisci valore', message, value, input:true, sheet:true, cancelValue:null, ...options});
}
function ViridisOptionPicker(options){
  return ViridisDialogs.open({sheet:true, cancelValue:null, ...options});
}
function ViridisWeeksPicker(message, selected = 4){
  return ViridisOptionPicker({title:'Durata del blocco', message, grid:true,
    choices:Array.from({length:12}, (_, i) => ({label:String(i+1), value:String(i+1), selected:i+1 === Number(selected)}))});
}
function ViridisModal(message, options = {}){
  return ViridisDialogs.open({title:'Attenzione', message, notice:true, ...options});
}
function ViridisFieldError(input, message){
  if(!input){ ViridisToast(message); return; }
  let error = input.nextElementSibling;
  if(!error || !error.classList.contains('viridis-field-error')){
    error = document.createElement('p');
    error.className = 'viridis-field-error';
    error.id = (input.id || 'viridis-field') + '-error';
    error.setAttribute('role','status');
    input.after(error);
  }
  error.textContent = message;
  input.setAttribute('aria-invalid','true');
  input.setAttribute('aria-describedby',error.id);
  input.addEventListener('input', () => {
    error.remove(); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
  }, {once:true});
  input.focus();
}
const viridisToastQueue = [];
let viridisToastActive = false;
function ViridisToast(message){
  viridisToastQueue.push(String(message));
  if(viridisToastActive) return;
  function next(){
    const text = viridisToastQueue.shift();
    if(text === undefined){ viridisToastActive = false; return; }
    viridisToastActive = true;
    const el = document.createElement('div');
    el.className = 'viridis-toast';
    if(/errore|non valid|non support|permesso negato|devi prima|non riesco|già collegato|deve essere/i.test(text)) el.classList.add('is-error');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
    el.textContent = text;
    setTimeout(() => { el.remove(); next(); }, Math.min(10000, Math.max(3500, text.length * 55)));
  }
  next();
}

// Conserva value e onchange dei select esistenti: cambia solo il controllo visibile.
// Anche quelli generati dopo un render usano lo stesso selettore touch.
const viridisSelectButtons = new WeakMap();
function enhanceViridisSelects(){
  if(!window.document) return;
  document.querySelectorAll('select').forEach(select => {
    let button = viridisSelectButtons.get(select);
    if(!button){
      button = document.createElement('button');
      button.type = 'button';
      button.className = select.className + ' viridis-select-button';
      button.style.cssText = select.style.cssText;
      button.setAttribute('aria-haspopup', 'dialog');
      select.classList.add('viridis-native-select');
      select.hidden = true;
      select.tabIndex = -1;
      select.after(button);
      viridisSelectButtons.set(select, button);
      button.onclick = async () => {
        const value = await ViridisOptionPicker({title:select.getAttribute('aria-label') || 'Scegli un’opzione',
          choices:[...select.options].filter(option => !option.disabled && !option.hidden).map(option => ({label:option.text, value:option.value, selected:option.selected}))});
        if(value === null || !select.isConnected || value === select.value) return;
        select.value = value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        enhanceViridisSelects();
      };
      select.addEventListener('change', enhanceViridisSelects);
    }
    const text = select.selectedOptions[0]?.text || 'Scegli';
    if(button.textContent !== text) button.textContent = text;
    button.disabled = select.disabled;
  });
}
new MutationObserver(enhanceViridisSelects).observe(document.body, {childList:true, subtree:true});
enhanceViridisSelects();
