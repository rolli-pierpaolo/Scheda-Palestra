// ---------------- GUIDA INTRODUTTIVA (onboarding) ----------------
// elenco cumulativo di consigli sulle funzioni principali per l'utente medio.
// Ogni consiglio porta la versione della guida in cui è stato aggiunto: quando
// si aggiunge una funzione nuova utile all'utente medio basta alzare di uno
// CURRENT_GUIDE_VERSION e mettere lo stesso numero sul consiglio nuovo. Chi ha
// già visto una versione precedente si rivedrà l'intera guida, vecchi
// consigli più quello nuovo evidenziato, non solo la differenza, così la
// ripassa tutta insieme alla novità invece di dimenticarsela col tempo
const ONBOARDING_VERSION_KEY = "scheda_wo18_onboarding_version_v1";
const CURRENT_GUIDE_VERSION = 2;
// Tre passaggi, non una lunga lista di funzioni: al primo avvio si capisce
// subito dove iniziare, come registrare la seduta e dove rileggere i dati.
// Nessun passaggio modifica la scheda; la personalizzazione apre soltanto
// l'editor esistente dei giorni.
const ONBOARDING_STEPS = [
  { icon:ICON_HOME, eyebrow:'PASSO 1 · LA TUA SCHEDA', title:'Dai forma al tuo piano.', text:'I giorni e i colori restano tuoi: puoi adattarli quando vuoi, senza perdere le serie già registrate.' },
  { icon:ICON_CHECK, eyebrow:'PASSO 2 · ALLENATI', title:'Una serie alla volta.', text:'Inserisci peso e ripetizioni, poi Viridis conserva lo schema, i Max e ciò che serve alla settimana successiva.' },
  { icon:ICON_CHART, eyebrow:'PASSO 3 · PROGREDISCI', title:'Guarda il percorso, non solo il numero.', text:'Calendario, volume, record e schede archiviate ti aiutano a leggere la costanza senza distrarti durante l’allenamento.' }
];
let onboardingStep = 0;

// legge da localStorage l'ultima versione della guida che l'utente ha visto
function getSeenGuideVersion(){
  const raw = localStorage.getItem(ONBOARDING_VERSION_KEY);
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}
// ricorda che l'utente ha visto questa versione della guida
function setSeenGuideVersion(v){
  localStorage.setItem(ONBOARDING_VERSION_KEY, String(v));
}
// da chiamare una volta all'avvio: se sono stati aggiunti consigli nuovi da
// quando l'utente ha visto la guida l'ultima volta, o non l'ha mai vista,
// prima apertura, la ripropone per intero, con i consigli nuovi evidenziati
function maybeShowOnboarding(){
  const seen = getSeenGuideVersion();
  if(seen >= CURRENT_GUIDE_VERSION) return;
  onboardingStep = 0;
  renderOnboardingModal(seen);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// riapertura manuale dal bottone in Impostazioni: mostra la guida completa
// senza evidenziare nulla come novità, e non tocca la versione già salvata
function openOnboarding(){
  onboardingStep = 0;
  renderOnboardingModal(CURRENT_GUIDE_VERSION, true);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// costruisce il contenuto della guida. isManual indica una riapertura
// volontaria dal bottone in Impostazioni, non un avviso automatico di
// aggiornamento: il titolo resta neutro anche se in teoria seenVersion è
// maggiore di zero, qui non c'è mai niente da evidenziare come novità
function renderOnboardingModal(seenVersion, isManual){
  const isUpdate = !isManual && seenVersion > 0;
  const step = ONBOARDING_STEPS[onboardingStep] || ONBOARDING_STEPS[0];
  const dayPreview = typeof state !== 'undefined' ? (state.days || []).slice(0,4).map((day, index)=>{
    const accent = typeof dayAccent === 'function' ? dayAccent(day, index).c : 'var(--green)';
    return `<span style="--accent:${escapeAttr(accent)}"><i></i>${escapeHtml(day.name || `Giorno ${index+1}`)}</span>`;
  }).join('') : '';
  const setupAction = onboardingStep === 0 ? `<button class="onb-text-action" type="button" onclick="openOnboardingPlanSetup()">Personalizza giorni e colori <i>›</i></button>` : '';
  const progressDots = ONBOARDING_STEPS.map((_, i)=>`<i class="${i===onboardingStep?'active':''}"></i>`).join('');
  const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
  const headline = isUpdate && onboardingStep === 0 ? 'Novità in Viridis' : step.title;
  document.getElementById('onboardingBody').innerHTML = `
    <div class="onb-step-count"><span>${escapeHtml(step.eyebrow)}</span><div>${progressDots}</div></div>
    <div class="onb-hero-icon">${step.icon}</div>
    <div class="onb-title">${escapeHtml(headline)}</div>
    <div class="onb-intro">${escapeHtml(step.text)}</div>
    ${onboardingStep === 0 ? `<div class="onb-plan-preview">${dayPreview || '<span><i></i>La tua prima giornata</span>'}</div>` : ''}
    ${setupAction}
    <button class="onb-primary-action" type="button" onclick="${isLast ? 'closeOnboarding()' : 'continueOnboarding()'}">${isLast ? 'Inizia con Viridis' : 'Continua'} <i>›</i></button>
  `;
}
function continueOnboarding(){
  onboardingStep = Math.min(onboardingStep + 1, ONBOARDING_STEPS.length - 1);
  renderOnboardingModal(CURRENT_GUIDE_VERSION, true);
}
function openOnboardingPlanSetup(){
  closeOnboarding();
  if(typeof openDaysModal === 'function') openDaysModal();
}
// chiude la guida e ricorda che questa versione è stata vista
function closeOnboarding(){
  document.getElementById('onboardingModal').style.display = 'none';
  setSeenGuideVersion(CURRENT_GUIDE_VERSION);
}
