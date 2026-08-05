// carica l'app vera (index.html + tutti i suoi <script src>, nello stesso
// ordine reale) dentro una finestra jsdom, cosi' i test girano sul codice
// COSI' COM'E' - niente da riscrivere/duplicare per i test, e se l'ordine di
// caricamento nell'index.html reale si rompe (una dipendenza tra file spostata
// per sbaglio) i test lo scoprono subito invece di un utente sul telefono.
// app-init.js (l'ultimo script, quello che avvia davvero l'app leggendo
// localStorage ecc.) NON viene eseguito qui: ogni test parte da uno stato
// pulito che si costruisce da solo, per restare prevedibile e isolato dagli
// altri test
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function loadApp(){
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // runScripts:'dangerously' e' necessario perche' window.eval() da solo NON
  // esegue il codice nel vero contesto vm della finestra jsdom (gli
  // identificatori liberi come "document" restano legati al Node esterno e
  // falliscono con "document is not defined") - iniettando invece dei veri
  // elementi <script> jsdom li esegue nel contesto giusto, esattamente come
  // farebbe un browser con dei <script src>
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;

  // localStorage: jsdom (con url http://localhost/) lo fornisce gia' di suo,
  // ma partiamo comunque puliti a ogni loadApp() cosi' un test non lascia
  // tracce per il successivo
  window.localStorage.clear();

  // GSAP e le API browser che jsdom non implementa (o che qui non servono
  // davvero, essendo animazioni/notifiche/vibrazione): stub minimi cosi' i
  // file che le chiamano non esplodono, senza tirare dentro la libreria vera
  window.gsap = {
    from(){}, to(){}, set(){}, killTweensOf(){}, fromTo(){},
    timeline(){ return { to:()=>({}), from:()=>({}) }; },
    registerPlugin(){}
  };
  window.navigator.vibrate = ()=>{};
  window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} }); // = "desktop": disattiva lo scroll magnetico, dipende da layout reale che jsdom non calcola
  window.scrollTo = ()=>{};
  window.confirm = () => true;  // i test che vogliono un "annulla" lo sovrascrivono loro
  window.alert = () => {};
  window.prompt = () => null;

  // ogni <script src="..."> nell'ordine in cui compare in index.html (l'app
  // dipende da quell'ordine: variabili/funzioni dichiarate in un file
  // vengono usate da quelli caricati dopo, esattamente come in un browser vero)
  const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m => m[1])
    .filter(src => !src.includes('gsap.min.js') && !src.includes('app-init.js'));

  for(const src of scriptSrcs){
    const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.head.appendChild(scriptEl); // eseguito subito da jsdom, nel vero contesto della finestra
  }

  // "ponte" verso le variabili globali dell'app dichiarate con let/const
  // (state, collapsedMap, storicoExtra...): in JS queste NON diventano
  // proprieta' di window (a differenza di var e delle function), quindi
  // "window.state = ..." dall'esterno non tocca il binding vero che le
  // funzioni dell'app leggono davvero - resterebbero silenziosamente
  // disallineate. Questo script gira invece DENTRO il contesto della pagina
  // (stesso trucco dei file sopra), dove "state" ecc. sono identificatori
  // liberi che risolvono al binding giusto; i getter/setter, anche se poi
  // richiamati da fuori (Node), restano chiusi su quel binding
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
      get workoutInProgress(){ return workoutInProgress; }, set workoutInProgress(v){ workoutInProgress = v; }
    };
  `;
  window.document.head.appendChild(bridgeScript);

  return window;
}

module.exports = { loadApp };
