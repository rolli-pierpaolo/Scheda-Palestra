const FEEDBACK_FORM_URL = "https://forms.gle/sjQnNHYtPJqRnG119";
function openFeedbackForm(){
  if(!FEEDBACK_FORM_URL){
    ViridisToast('Link al modulo feedback non ancora configurato (FEEDBACK_FORM_URL in js/utils.js).');
    return;
  }
  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
}
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M4 7 H20"/><path d="M9 7 V4.5 A1 1 0 0 1 10 3.5 H14 A1 1 0 0 1 15 4.5 V7"/><path d="M6 7 L7 20 A1 1 0 0 0 8 21 H16 A1 1 0 0 0 17 20 L18 7"/><path d="M10 11 V17"/><path d="M14 11 V17"/></svg>';
const ICON_CHART = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M4 20 V4"/><path d="M4 20 H20"/><path d="M6.5 15 L11 10.5 L14 13.5 L19 7.5"/></svg>';
const ICON_PLATE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M10 14 L14 10"/><path d="M8.5 15.5 L6.5 17.5 A3 3 0 0 1 2.5 13.5 L5.5 10.5 A3 3 0 0 1 9.5 10.5"/><path d="M15.5 8.5 L17.5 6.5 A3 3 0 0 1 21.5 10.5 L18.5 13.5 A3 3 0 0 1 14.5 13.5"/></svg>';
const ICON_MORE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/></svg>';
function showQuickToast(msg){
  let el = document.getElementById('prToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'prToast';
    el.className = 'pr-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(window._prToastTimer);
  window._prToastTimer = setTimeout(()=>{ el.classList.remove('show'); }, 2200);
}
const CELEBRATION_SHARD_COLORS = ['var(--green)','var(--amber)','var(--red)','var(--steel)'];
function showCelebration(opts){
  let overlay = document.getElementById('celebrationOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'celebrationOverlay';
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = '<div class="celebration-burst"></div><div class="celebration-card"><div class="celebration-icon"></div><div class="celebration-label"></div><div class="celebration-title"></div><div class="celebration-subtitle"></div></div>';
    document.body.appendChild(overlay);
  }
  const card = overlay.querySelector('.celebration-card');
  card.classList.toggle('accent-amber', opts.accent === 'amber');
  overlay.querySelector('.celebration-icon').innerHTML = opts.icon || '';
  overlay.querySelector('.celebration-label').textContent = opts.label || '';
  overlay.querySelector('.celebration-title').textContent = opts.title || '';
  const sub = overlay.querySelector('.celebration-subtitle');
  sub.textContent = opts.subtitle || '';
  sub.style.display = opts.subtitle ? '' : 'none';

  const reduceMotion = typeof prefersReducedMotion === 'function' ? prefersReducedMotion() : (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const burst = overlay.querySelector('.celebration-burst');
  burst.innerHTML = '';
  if(!reduceMotion){
    for(let i=0;i<18;i++){
      const s = document.createElement('div');
      s.className = 'celebration-shard';
      s.style.background = CELEBRATION_SHARD_COLORS[i % CELEBRATION_SHARD_COLORS.length];
      burst.appendChild(s);
    }
  }

  overlay.classList.add('show');
  clearTimeout(window._celebrationTimer);

  if(typeof gsap !== 'undefined'){
    gsap.killTweensOf(card);
    if(reduceMotion){
      gsap.fromTo(card, {opacity:0}, {opacity:1, duration:.25});
    } else {
      gsap.fromTo(card, {scale:.6, opacity:0, y:20}, {scale:1, opacity:1, y:0, duration:.5, ease:'back.out(1.8)'});
      burst.querySelectorAll('.celebration-shard').forEach(s=>{
        const angle = Math.random()*Math.PI*2;
        const dist = 90 + Math.random()*90;
        gsap.set(s, {x:0, y:0, opacity:1, rotation:0, scale:.6+Math.random()*.6});
        gsap.to(s, {
          x: Math.cos(angle)*dist,
          y: Math.sin(angle)*dist - 20,
          rotation: (Math.random()*360)-180,
          opacity: 0,
          duration: .9 + Math.random()*.4,
          ease: 'power2.out'
        });
      });
    }
  }

  vibrate(opts.vibrate || [25,40,25,40,110]);

  window._celebrationTimer = setTimeout(()=>{ overlay.classList.remove('show'); }, opts.duration || 2600);
}
function svgIcon(inner, size){
  size = size || 16;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle">${inner}</svg>`;
}
const ICON_GEAR = svgIcon('<path d="M4 7 H14"/><circle cx="17" cy="7" r="2.3"/><path d="M10 12 H20"/><circle cx="7" cy="12" r="2.3"/><path d="M4 17 H14"/><circle cx="17" cy="17" r="2.3"/>');
const ICON_DISK = svgIcon('<path d="M5 4.5 H16 L19 7.5 V19 A0.8 0.8 0 0 1 18.2 19.8 H5.8 A0.8 0.8 0 0 1 5 19 V4.5 Z"/><path d="M7.5 4.5 V9.5 H15 V4.5"/><path d="M8.5 13.5 H15.5 V19.5 H8.5 Z"/>');
const ICON_ARCHIVE = svgIcon('<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M4.5 8.5 V18.5 A1 1 0 0 0 5.5 19.5 H18.5 A1 1 0 0 0 19.5 18.5 V8.5"/><path d="M10 12.5 H14"/>');
const ICON_PENCIL = svgIcon('<path d="M4 20 L4.5 16.5 L15 6 A1.5 1.5 0 0 1 17 6 L18 7 A1.5 1.5 0 0 1 18 9 L7.5 19.5 Z"/><path d="M13.5 7.5 L16.5 10.5"/>');
const ICON_DOWNLOAD = svgIcon('<path d="M12 4 V15"/><path d="M7 11 L12 16 L17 11"/><path d="M5 20 H19"/>');
const ICON_SHARE = svgIcon('<path d="M12 15 V4"/><path d="M8 8 L12 4 L16 8"/><path d="M5 13 V19 A1 1 0 0 0 6 20 H18 A1 1 0 0 0 19 19 V13"/>');
const ICON_UPLOAD = svgIcon('<path d="M12 20 V9"/><path d="M7 13 L12 8 L17 13"/><path d="M5 4 H19"/>');
const ICON_FOLDER = svgIcon('<path d="M3.5 7 A1 1 0 0 1 4.5 6 H9.5 L11.5 8 H19.5 A1 1 0 0 1 20.5 9 V17.5 A1 1 0 0 1 19.5 18.5 H4.5 A1 1 0 0 1 3.5 17.5 Z"/>');
const ICON_CALENDAR = svgIcon('<rect x="4" y="5.5" width="16" height="15" rx="1.5"/><path d="M4 10 H20"/><path d="M8 3.5 V7"/><path d="M16 3.5 V7"/>');
const ICON_BOOK = svgIcon('<path d="M5 5 A1.5 1.5 0 0 1 6.5 3.5 H11 V20 H6.5 A1.5 1.5 0 0 1 5 18.5 Z"/><path d="M13 3.5 H17.5 A1.5 1.5 0 0 1 19 5 V18.5 A1.5 1.5 0 0 1 17.5 20 H13 Z"/>');
const ICON_TARGET = svgIcon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>');
const ICON_QUESTION = svgIcon('<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.3 A2.5 2.2 0 0 1 12 7.3 A2.5 2.2 0 0 1 14.5 9.3 C14.5 11 12 11 12 13.3"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>');
const ICON_CHAT = svgIcon('<path d="M4 6 A1.5 1.5 0 0 1 5.5 4.5 H18.5 A1.5 1.5 0 0 1 20 6 V14 A1.5 1.5 0 0 1 18.5 15.5 H9 L5 19 V15.5 H5.5 A1.5 1.5 0 0 1 4 14 Z"/>');
const ICON_CLOSE = svgIcon('<path d="M6 6 L18 18"/><path d="M18 6 L6 18"/>', 15);
const ICON_REORDER = svgIcon('<path d="M8 4 L8 20"/><path d="M5 7 L8 4 L11 7"/><path d="M16 20 L16 4"/><path d="M13 17 L16 20 L19 17"/>');
const ICON_CHECK = svgIcon('<path d="M5 12.5 L10 17.5 L19 6.5"/>');
const ICON_BELL = svgIcon('<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18.5 H4 Z"/><path d="M10 20.5 A2 2 0 0 0 14 20.5"/>');
const ICON_BELL_OFF = svgIcon('<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18.5 H4 Z"/><path d="M10 20.5 A2 2 0 0 0 14 20.5"/><path d="M4 4 L20 20"/>');
const ICON_FLAG = svgIcon('<path d="M6 3 V21"/><path d="M6 4 H16 L13.5 7.5 L16 11 H6"/>');
const ICON_STAR = svgIcon('<path d="M12 3 L14.6 9 L21 9.6 L16.2 13.8 L17.6 20 L12 16.7 L6.4 20 L7.8 13.8 L3 9.6 L9.4 9 Z"/>');
const ICON_TROPHY = svgIcon('<path d="M7 4 H17 V8 A5 5 0 0 1 7 8 Z"/><path d="M7 5 H4.5 A2.5 2.5 0 0 0 7 9.5"/><path d="M17 5 H19.5 A2.5 2.5 0 0 1 17 9.5"/><path d="M12 13 V17"/><path d="M9 20 H15"/><path d="M10 17 H14 L14.5 20 H9.5 Z"/>');
const ICON_CYCLE = svgIcon('<path d="M5 12 A7 7 0 0 1 18.5 8"/><path d="M15.5 5 L18.5 8 L21 5.5"/><path d="M19 12 A7 7 0 0 1 5.5 16"/><path d="M8.5 19 L5.5 16 L3 18.5"/>');
const ICON_LOCK = svgIcon('<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11 V7.5 A4 4 0 0 1 16 7.5 V11"/>');
const ICON_WARNING = svgIcon('<path d="M12 4 L21 19 H3 Z"/><path d="M12 10 V14"/><circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none"/>');
const ICON_FLAME = svgIcon('<path d="M12 2 C12 2 6 9 6 13.5 A6 6 0 0 0 18 13.5 C18 11 16.5 9.5 15.8 9 C16 11 14 12 14 10 C14 7.5 15 6 12 2 Z"/>');
const ICON_LIGHTNING = svgIcon('<path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z"/>');
const ICON_FLAME_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><path d="M12 2 C12 2 6 9 6 13.5 A6 6 0 0 0 18 13.5 C18 11 16.5 9.5 15.8 9 C16 11 14 12 14 10 C14 7.5 15 6 12 2 Z" fill="#FF7A1A"/></svg>';
const ICON_LIGHTNING_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z" fill="#FFD400"/></svg>';
const ICON_PLATE_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><circle cx="12" cy="12" r="8" fill="none" stroke="#FF3D7F" stroke-width="3"/><circle cx="12" cy="12" r="3" fill="#FF3D7F"/></svg>';
const ICON_POINT = svgIcon('<circle cx="12" cy="12" r="8.5"/><path d="M12 8 V13"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>');
const ICON_HOME = svgIcon('<path d="M4 11 L12 4 L20 11 V20 H4 Z"/><path d="M9.5 20 V13 H14.5 V20"/>');
function vibrate(pattern){
  if(typeof accessibilityPrefs !== 'undefined' && !accessibilityPrefs.vibration) return;
  if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}
let quickNumberInput = null;
let quickKeyboardMode = 'numbers';
let quickKeyboardOriginScrollY = null;
let suppressQuickKeyboardClickUntil = 0;
let quickKeyboardCloseTimer = null;
let quickKeyboardRestoreTimer = null;
let quickKeyboardInteractionUntil = 0;
let quickKeyboardFinishRequested = false;
let quickKeyboardScrollTween = null;
let quickKeyboardRevealFrame = null;
function scheduleQuickKeyboardReveal(){
  if(quickKeyboardRevealFrame !== null) cancelAnimationFrame(quickKeyboardRevealFrame);
  quickKeyboardRevealFrame = requestAnimationFrame(()=>{
    quickKeyboardRevealFrame = null;
    revealQuickKeyboardInput();
  });
}
function quickKeyboardReducedMotion(){
  return document.body.classList.contains('a11y-reduce-motion') ||
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function stopQuickKeyboardScroll(){
  if(quickKeyboardScrollTween) quickKeyboardScrollTween.kill();
  quickKeyboardScrollTween = null;
  const bar = document.getElementById('quickNumberBar');
  if(bar && bar.hidden) clearQuickKeyboardScrollSpace();
}
function moveQuickKeyboardScroll(top){
  stopQuickKeyboardScroll();
  if(quickKeyboardReducedMotion()){
    window.scrollTo({top,behavior:'instant'});
  }else if(window.gsap && window.gsap.ticker){
    const position = {y:window.scrollY};
    const duration = Math.min(.52,.24 + Math.abs(top-position.y)/2400);
    quickKeyboardScrollTween = window.gsap.to(position,{
      y:top,duration,ease:'power2.inOut',
      onUpdate:()=>window.scrollTo({top:position.y,behavior:'instant'}),
      onComplete:()=>{
        quickKeyboardScrollTween=null;
        const bar = document.getElementById('quickNumberBar');
        if(bar && bar.hidden) clearQuickKeyboardScrollSpace();
      }
    });
  }else{
    window.scrollBy({top:top-window.scrollY,behavior:'smooth'});
  }
}
// Lo scroll manuale interrompe il riposizionamento automatico.
window.addEventListener('touchstart',stopQuickKeyboardScroll,{passive:true});
window.addEventListener('wheel',stopQuickKeyboardScroll,{passive:true});
const quickKeyboardPressTimers = new WeakMap();
let quickKeyboardPinnedOpen = false;
function usesTouchKeyboard(){ return !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches); }
function isQuickNumberTarget(el){
  if(!el || !el.isConnected || !el.matches || !el.matches('input.set-input:not(:disabled)')) return false;
  for(let node=el;node&&node!==document.body;node=node.parentElement){
    if(node.hidden || node.inert || node.style.display==='none') return false;
  }
  return true;
}
function positionQuickNumberBar(){
  const bar = document.getElementById('quickNumberBar');
  if(!bar || bar.hidden) return;
  const viewport = window.visualViewport;
  const keyboardInset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  bar.style.bottom = keyboardInset > 40 ? (keyboardInset + 8) + 'px' : '';
}
function updateQuickKeyboardAccent(bar){
  const day = typeof state !== 'undefined' && state && state.days && state.days[activeDayIdx];
  if(day && typeof dayAccent === 'function') bar.style.setProperty('--accent', dayAccent(day,activeDayIdx).c);
}
function revealQuickKeyboardInput(){
  const input = quickNumberInput;
  const bar = document.getElementById('quickNumberBar');
  if(!input || !bar || bar.hidden) return;
  const barBox = bar.getBoundingClientRect();
  const keyboardHeight = Math.ceil(barBox.height);
  if(keyboardHeight){
    document.body.style.setProperty('--quick-keyboard-space',`${keyboardHeight + 52}px`);
    document.body.classList.add('quick-keyboard-open');
  }
  const inputBox = input.getBoundingClientRect();
  const rest=document.getElementById('workoutRestPanel');
  const safeTop = Math.max(112,(window.visualViewport?.offsetTop||0) + 72,rest?rest.getBoundingClientRect().bottom+8:0);
  // offsetTop esclude la trasformazione usata nell'animazione di ingresso.
  const keyboardTop = bar.offsetHeight ? bar.offsetTop : barBox.top;
  const targetTop = Math.max(safeTop,keyboardTop - Math.max(inputBox.height,54) - 42);
  const delta = inputBox.top - targetTop;
  if(delta > 6) moveQuickKeyboardScroll(window.scrollY + Math.ceil(delta));
}
function clearQuickKeyboardScrollSpace(){
  document.body.classList.remove('quick-keyboard-open');
  document.body.style.removeProperty('--quick-keyboard-space');
}
function restoreQuickKeyboardScroll(){
  clearTimeout(quickKeyboardRestoreTimer);
  quickKeyboardOriginScrollY = null;
  stopQuickKeyboardScroll();
}
function resetQuickKeyboardUI(){
  if(quickKeyboardRevealFrame !== null) cancelAnimationFrame(quickKeyboardRevealFrame);
  quickKeyboardRevealFrame = null;
  stopQuickKeyboardScroll();
  clearTimeout(quickKeyboardCloseTimer);
  clearTimeout(quickKeyboardRestoreTimer);
  quickNumberInput = null;
  quickKeyboardPinnedOpen = false;
  quickKeyboardFinishRequested = false;
  quickKeyboardInteractionUntil = 0;
  suppressQuickKeyboardClickUntil = 0;
  quickKeyboardOriginScrollY = null;
  const bar = document.getElementById('quickNumberBar');
  if(bar){bar.hidden=true;bar.classList.remove('is-closing');bar.style.bottom='';}
  clearQuickKeyboardScrollSpace();
}
function showQuickKeyboardBar(bar){
  clearTimeout(quickKeyboardCloseTimer);
  clearTimeout(quickKeyboardRestoreTimer);
  bar.hidden = false;
  bar.classList.remove('is-closing');
}
function hideQuickKeyboardBar(bar){
  if(bar.hidden || bar.classList.contains('is-closing')) return;
  bar.classList.add('is-closing');
  clearTimeout(quickKeyboardCloseTimer);
  quickKeyboardCloseTimer = setTimeout(()=>{
    if(!quickNumberInput){
      bar.hidden = true;
      bar.classList.remove('is-closing');
      bar.style.bottom = '';
      // Rimuove lo spazio aggiuntivo dopo la chiusura della tastiera.

      if(!quickKeyboardScrollTween) clearQuickKeyboardScrollSpace();
    }
  },240);
}
function primeQuickKeyboardInput(input){
  if(!isQuickNumberTarget(input)) return null;
  if(input !== quickNumberInput && quickKeyboardOriginScrollY === null) quickKeyboardOriginScrollY = window.scrollY;
  quickNumberInput = input;
  quickKeyboardPinnedOpen = true;
  quickKeyboardFinishRequested = false;
  const bar = document.getElementById('quickNumberBar');
  if(!bar) return input;
  updateQuickKeyboardAccent(bar);
  showQuickKeyboardBar(bar);
  if(window.matchMedia && window.matchMedia('(pointer:coarse)').matches){
    input.inputMode = 'none';
    scheduleQuickKeyboardReveal();
  }
  positionQuickNumberBar();
  return input;
}
function resolveQuickKeyboardInput(){
  // Su iOS il focus puo riferirsi ancora al campo precedente. Usa quello appena toccato.

  if(isQuickNumberTarget(quickNumberInput) && quickNumberInput.isConnected) return quickNumberInput;
  const active = document.activeElement;
  if(!usesTouchKeyboard() && isQuickNumberTarget(active)) return primeQuickKeyboardInput(active);
  return null;
}
function syncQuickNumberBar(){
  const bar = document.getElementById('quickNumberBar');
  if(!bar) return;
  if(document.visibilityState==='hidden') return;
  if(quickNumberInput && !isQuickNumberTarget(quickNumberInput)){
    resetQuickKeyboardUI();
    return;
  }
  const active = document.activeElement;
  const nextInput = isQuickNumberTarget(active) ? active : null;
  if(nextInput && !usesTouchKeyboard()){
    primeQuickKeyboardInput(nextInput);
    return;
  }
  if(!nextInput && Date.now() < quickKeyboardInteractionUntil && !quickKeyboardFinishRequested){
    setTimeout(syncQuickNumberBar,Math.max(20,quickKeyboardInteractionUntil-Date.now()));
    return;
  }
  if(quickKeyboardPinnedOpen && !quickKeyboardFinishRequested){
    showQuickKeyboardBar(bar);
    positionQuickNumberBar();
    return;
  }
  quickNumberInput = null;
  hideQuickKeyboardBar(bar);
  quickKeyboardFinishRequested = false;
  restoreQuickKeyboardScroll();
  positionQuickNumberBar();
}
function commitQuickNumberInput(input){
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
function setQuickKeyboardMode(mode){
  quickKeyboardMode = mode === 'letters' ? 'letters' : 'numbers';
  const bar = document.getElementById('quickNumberBar');
  if(!bar) return;
  bar.querySelector('.quick-keyboard-numbers').hidden = quickKeyboardMode !== 'numbers';
  bar.querySelector('.quick-keyboard-letters').hidden = quickKeyboardMode !== 'letters';
  bar.querySelectorAll('.quick-keyboard-mode').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===quickKeyboardMode));
  scheduleQuickKeyboardReveal();
}
function flashQuickKeyboardKey(button){
  if(!button) return;
  clearTimeout(quickKeyboardPressTimers.get(button));
  button.classList.remove('is-pressed');
  void button.offsetWidth;
  button.classList.add('is-pressed');
  quickKeyboardPressTimers.set(button,setTimeout(()=>button.classList.remove('is-pressed'),110));
}
function insertQuickKey(value){
  const input = resolveQuickKeyboardInput();
  if(!input || input.disabled) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(value,start,end,'end');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dataset.quickKeyboardDirty = '1';
  input.focus({preventScroll:true});
}
function insertQuickNumber(value){ insertQuickKey(value); }
function deleteQuickNumber(){
  const input = resolveQuickKeyboardInput();
  if(!input || input.disabled) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if(start===0 && end===0) return;
  input.setRangeText('',start===end ? start-1 : start,end,'end');
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dataset.quickKeyboardDirty = '1';
  input.focus({preventScroll:true});
}
function finishQuickKeyboardInput(){
  const input = resolveQuickKeyboardInput();
  const bar = document.getElementById('quickNumberBar');
  if(!input){
    quickKeyboardPinnedOpen = false;
    quickKeyboardFinishRequested = true;
    if(bar) hideQuickKeyboardBar(bar);
    restoreQuickKeyboardScroll();
    return;
  }
  // Azzera il riferimento prima di blur: onchange puo rimuovere il campo dal DOM.

  quickKeyboardFinishRequested = true;
  quickKeyboardPinnedOpen = false;
  quickNumberInput = null;
  if(input.dataset.quickKeyboardDirty){
    delete input.dataset.quickKeyboardDirty;
    commitQuickNumberInput(input);
  }
  input.blur();
  if(bar) hideQuickKeyboardBar(bar);
  restoreQuickKeyboardScroll();
}
// Imposta inputmode prima del focus per evitare la tastiera di sistema.

document.addEventListener('pointerdown', event=>{
  const target = event.target;
  if(isQuickNumberTarget(target)){
    if(window.matchMedia && window.matchMedia('(pointer:coarse)').matches) target.inputMode = 'none';
  }
  const finishButton = target?.closest?.('.series-finish');
  if(finishButton && quickNumberInput){
    suppressQuickKeyboardClickUntil = 0;
    event.preventDefault();
  }
  const keyboardArea = target && target.closest && target.closest('#quickNumberBar');
  if(keyboardArea){
    suppressQuickKeyboardClickUntil = Date.now()+600;
    quickKeyboardInteractionUntil = Date.now()+120;
    const key = target.closest('#quickNumberBar button');
    if(key){
      flashQuickKeyboardKey(key);
      vibrate(8);
      if(key.classList.contains('quick-keyboard-mode')) setQuickKeyboardMode(key.dataset.mode);
      else if(key.dataset.quickKey !== undefined) insertQuickKey(key.dataset.quickKey);
      else if(key.dataset.quickAction === 'delete') deleteQuickNumber();
      else if(key.dataset.quickAction === 'finish') finishQuickKeyboardInput();
    }
    event.preventDefault();
  }
}, true);
document.addEventListener('mousedown', event=>{
  if(usesTouchKeyboard() && isQuickNumberTarget(event.target)) event.preventDefault();
}, true);
document.addEventListener('click', event=>{
  if(Date.now() < suppressQuickKeyboardClickUntil || (event.target && event.target.closest && event.target.closest('#quickNumberBar'))){
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if(isQuickNumberTarget(event.target)){
    if(usesTouchKeyboard()){
      event.preventDefault();
      event.target.focus({preventScroll:true});
    }
    primeQuickKeyboardInput(event.target);
  }
}, true);
document.addEventListener('keydown', event=>{
  if(event.key === 'Enter' && isQuickNumberTarget(event.target)) event.preventDefault();
});
document.addEventListener('focusin', syncQuickNumberBar);
// La posizione resta in memoria solo finche la pagina e aperta.
let suspendedWorkoutScroll = null;
function suspendWorkoutViewport(){
  if(suspendedWorkoutScroll !== null) return;
  suspendedWorkoutScroll = window.scrollY;
  if(quickKeyboardRevealFrame !== null) cancelAnimationFrame(quickKeyboardRevealFrame);
  quickKeyboardRevealFrame = null;
  stopQuickKeyboardScroll();
  clearTimeout(quickKeyboardRestoreTimer);
  // Mantiene lo spazio della tastiera per non troncare lo scroll.
}
function resumeWorkoutViewport(){
  if(suspendedWorkoutScroll === null) return;
  const top = suspendedWorkoutScroll;
  suspendedWorkoutScroll = null;
  window.scrollTo({top,behavior:'instant'});
}
window.addEventListener('pagehide', suspendWorkoutViewport);
window.addEventListener('pageshow', resumeWorkoutViewport);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden') suspendWorkoutViewport();
  else resumeWorkoutViewport();
});
document.addEventListener('touchstart', event=>{
  if(isQuickNumberTarget(event.target) && usesTouchKeyboard()) event.target.inputMode='none';
}, {capture:true,passive:true});
document.addEventListener('focusout', event=>{
  const input = event.target;
  const keyboardTapInProgress = Date.now() < quickKeyboardInteractionUntil && !quickKeyboardFinishRequested;
  if(isQuickNumberTarget(input) && input.dataset.quickKeyboardDirty && !keyboardTapInProgress){
    delete input.dataset.quickKeyboardDirty;
    commitQuickNumberInput(input);
  }
  setTimeout(syncQuickNumberBar,keyboardTapInProgress ? 130 : 0);
});
if(window.visualViewport){ window.visualViewport.addEventListener('resize', positionQuickNumberBar); window.visualViewport.addEventListener('scroll', positionQuickNumberBar); }
function pickFromPool(pool, seed){
  let hash = 0;
  for(let i=0;i<seed.length;i++){ hash = (hash*31 + seed.charCodeAt(i)) >>> 0; }
  return pool[hash % pool.length];
}
const PROGRESSION_SUFFIX_PESO = [
  " Stavolta carica un filo di più!",
  " Oggi il ferro sale ancora!",
  " Un gradino di peso in più, forza!",
  " Stavolta punta più in alto col carico!",
];
const PROGRESSION_SUFFIX_REP = [
  " Stavolta spremi una rip in più!",
  " Oggi qualche ripetizione extra, dai!",
  " Trova un'altra rip nelle gambe... o nelle braccia!",
  " Stavolta il numero sale ancora!",
];
function computeProgressionHint(ex, w){
  if(w < 0) return null;
  const group = getExerciseGroup(ex.nome);
  const pool = (group && MUSCLE_MOTIVATION[group]) ? MUSCLE_MOTIVATION[group] : DEFAULT_MOTIVATION;
  const base = splitMotivation(pickFromPool(pool, (ex.nome||'')+'_'+w));
  let suffix = '';
  if(w > 0){
    const prevSets = (ex.sets && ex.sets[w-1]) || [];
    let best = null;
    prevSets.forEach(s=>{
      const p = parseFloat(String(s.peso).replace(',','.'));
      const r = parseFloat(String(s.rip).replace(',','.'));
      if(isNaN(p) || p<=0 || isNaN(r) || r<=0) return;
      if(!best || p>best.p || (p===best.p && r>best.r)) best = {p, r};
    });
    if(best){
      const suffixPool = best.r >= 10 ? PROGRESSION_SUFFIX_PESO : PROGRESSION_SUFFIX_REP;
      suffix = pickFromPool(suffixPool, (ex.nome||'')+'_'+w+'_suffix');
    }
  }
  return { text: base.text + suffix, icon: base.icon };
}
function escapeAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function escapeJs(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function autoGrowTextarea(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function autoGrowAllExNames(){
  document.querySelectorAll('#viewActive .ex-name').forEach(autoGrowTextarea);
}
function autoGrowAllExSchema(){
  document.querySelectorAll('#viewActive .meta-input.schema').forEach(el=>{
    autoGrowTextarea(el);
    autoWidthSchema(el);
  });
}
function autoWidthSchema(el){
  const len = (el.value || '').length;
  el.style.width = Math.max(4, Math.min(len + 2, 40)) + 'ch';
}
