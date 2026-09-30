const ONBOARDING_VERSION_KEY = "scheda_wo18_onboarding_version_v1";
const CURRENT_GUIDE_VERSION = 2;
const ONBOARDING_STEPS = [
  { icon:ICON_HOME, eyebrow:'PASSO 1 · LA TUA SCHEDA', title:'Dai forma al tuo piano.', text:'I giorni e i colori restano tuoi: puoi adattarli quando vuoi, senza perdere le serie già registrate.' },
  { icon:ICON_CHECK, eyebrow:'PASSO 2 · ALLENATI', title:'Una serie alla volta.', text:'Inserisci peso e ripetizioni, poi Viridis conserva lo schema, i Max e ciò che serve alla settimana successiva.' },
  { icon:ICON_CHART, eyebrow:'PASSO 3 · PROGREDISCI', title:'Guarda il percorso, non solo il numero.', text:'Calendario, volume, record e schede archiviate ti aiutano a leggere la costanza senza distrarti durante l’allenamento.' }
];
let onboardingStep = 0;

function getSeenGuideVersion(){
  const raw = localStorage.getItem(ONBOARDING_VERSION_KEY);
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}
function setSeenGuideVersion(v){
  localStorage.setItem(ONBOARDING_VERSION_KEY, String(v));
}
function maybeShowOnboarding(){
  const seen = getSeenGuideVersion();
  if(seen >= CURRENT_GUIDE_VERSION) return;
  onboardingStep = 0;
  renderOnboardingModal(seen);
  document.getElementById('onboardingModal').style.display = 'flex';
}
function openOnboarding(){
  onboardingStep = 0;
  renderOnboardingModal(CURRENT_GUIDE_VERSION, true);
  document.getElementById('onboardingModal').style.display = 'flex';
}
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
function closeOnboarding(){
  document.getElementById('onboardingModal').style.display = 'none';
  setSeenGuideVersion(CURRENT_GUIDE_VERSION);
}
