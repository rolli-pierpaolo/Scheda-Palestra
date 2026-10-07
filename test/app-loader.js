const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function loadApp(storage = {}){
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;

  window.localStorage.clear();
  Object.entries(storage).forEach(([key,value])=>window.localStorage.setItem(key,value));
  // WebGL viene verificato separatamente: jsdom non dispone di una GPU.
  const originalContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = function(kind, ...args){
    return kind === 'webgl' ? null : originalContext.call(this,kind,...args);
  };

  window.gsap = {
    from(){}, to(){}, set(){}, killTweensOf(){}, fromTo(){},
    timeline(){ return { to:()=>({}), from:()=>({}) }; },
    registerPlugin(){}
  };
  window.navigator.vibrate = ()=>{};
  window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  window.scrollTo = ()=>{};
  window.confirm = () => true;
  window.alert = () => {};
  window.prompt = () => null;

  const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m => m[1].split('?')[0])
    .filter(src => !src.includes('gsap.min.js') && !src.includes('app-init.js'));

  for(const src of scriptSrcs){
    const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.head.appendChild(scriptEl);
  }

  const bridgeScript = window.document.createElement('script');
  bridgeScript.textContent = `
    window.__bridge = {
      get state(){ return state; }, set state(v){ state = v; },
      get collapsedMap(){ return collapsedMap; }, set collapsedMap(v){ collapsedMap = v; },
      get storicoExtra(){ return storicoExtra; }, set storicoExtra(v){ storicoExtra = v; },
      get storicoDates(){ return storicoDates; }, set storicoDates(v){ storicoDates = v; },
      get deletedStorico(){ return deletedStorico; }, set deletedStorico(v){ deletedStorico = v; },
      get calendarLog(){ return calendarLog; }, set calendarLog(v){ calendarLog = v; },
      get extraLists(){ return extraLists; }, set extraLists(v){ extraLists = v; },
      get exerciseGroups(){ return exerciseGroups; }, set exerciseGroups(v){ exerciseGroups = v; },
      get deletedEsercizi(){ return deletedEsercizi; }, set deletedEsercizi(v){ deletedEsercizi = v; },
      get DATA(){ return DATA; },
      get weekDoneConfirmTarget(){ return weekDoneConfirmTarget; }, set weekDoneConfirmTarget(v){ weekDoneConfirmTarget = v; },
      get activeDayIdx(){ return activeDayIdx; }, set activeDayIdx(v){ activeDayIdx = v; },
      get activeExerciseIdx(){ return activeExerciseIdx; }, set activeExerciseIdx(v){ activeExerciseIdx = v; },
      get workoutInProgress(){ return workoutInProgress; }, set workoutInProgress(v){ workoutInProgress = v; },
      get accessibilityPrefs(){ return accessibilityPrefs; }, set accessibilityPrefs(v){ accessibilityPrefs = v; },
      get viewingSharedOwnerId(){ return viewingSharedOwnerId; }, set viewingSharedOwnerId(v){ viewingSharedOwnerId = v; },
      get supabaseClient(){ return supabaseClient; }, set supabaseClient(v){ supabaseClient = v; },
      get syncSession(){ return syncSession; }, set syncSession(v){ syncSession = v; },
      get syncLocalRevision(){ return syncLocalRevision; }, set syncLocalRevision(v){ syncLocalRevision = v; },
      get syncConfirmedRevision(){ return syncConfirmedRevision; }, set syncConfirmedRevision(v){ syncConfirmedRevision = v; },
      get MUSCLE_MOTIVATION(){ return MUSCLE_MOTIVATION; },
      get DEFAULT_MOTIVATION(){ return DEFAULT_MOTIVATION; },
      get PROGRESSION_SUFFIX_PESO(){ return PROGRESSION_SUFFIX_PESO; },
      get PROGRESSION_SUFFIX_REP(){ return PROGRESSION_SUFFIX_REP; }
    };
  `;
  window.document.head.appendChild(bridgeScript);

  return window;
}

module.exports = { loadApp };
