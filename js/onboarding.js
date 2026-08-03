// ---------------- GUIDA INTRODUTTIVA (onboarding) ----------------
// elenco CUMULATIVO di consigli sulle funzioni principali per l'utente medio.
// Ogni consiglio porta la versione della guida in cui e' stato aggiunto: quando
// si aggiunge una funzione nuova utile all'utente medio basta alzare di 1
// CURRENT_GUIDE_VERSION e mettere lo stesso numero sul consiglio nuovo. Chi ha
// gia' visto una versione precedente si rivedra' l'intera guida (vecchi
// consigli + quello nuovo, evidenziato), non solo la differenza - cosi' la
// ripassa tutta insieme alla novita', invece di dimenticarsela col tempo
const ONBOARDING_VERSION_KEY = "scheda_wo18_onboarding_version_v1";
const CURRENT_GUIDE_VERSION = 1;
const GUIDE_TIPS = [
  { v:1, icon:ICON_HOME, title:'Home', text:'Qui vedi il giorno di allenamento suggerito (quello che "respira") e l\'ordine dei prossimi. Tocca la card evidenziata per iniziare.' },
  { v:1, icon:ICON_CHECK, title:'Settimana completata', text:'Quando finisci l\'ultima ripetizione di un esercizio in una settimana, l\'app te lo chiede e la segna come fatta da sola.' },
  { v:1, icon:ICON_FLAG, title:'Giorno terminato', text:'A fine sessione premi "Giorno di allenamento terminato": viene registrata e torni alla Home, pronto per il prossimo giorno.' },
  { v:1, icon:ICON_LINK, title:'Super set', text:'Puoi collegare due esercizi per farli uno dopo l\'altro senza pausa, tipo super set o giant set.' },
  { v:1, icon:ICON_TARGET, title:'Obiettivi nascosti', text:'In "Obiettivi" trovi traguardi a sorpresa: restano oscurati finche\' non li sblocchi allenandoti davvero.' },
  { v:1, icon:ICON_CALENDAR, title:'Calendario', text:'Il Calendario, dentro Storico, mostra tutti i giorni di allenamento fatti, con un pallino colorato per ogni sessione.' },
];

function getSeenGuideVersion(){
  const raw = localStorage.getItem(ONBOARDING_VERSION_KEY);
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}
function setSeenGuideVersion(v){
  localStorage.setItem(ONBOARDING_VERSION_KEY, String(v));
}
// da chiamare una volta all'avvio: se sono stati aggiunti consigli nuovi da
// quando l'utente ha visto la guida l'ultima volta (o non l'ha mai vista, prima
// apertura) la ripropone per intero, coi consigli nuovi evidenziati
function maybeShowOnboarding(){
  const seen = getSeenGuideVersion();
  if(seen >= CURRENT_GUIDE_VERSION) return;
  renderOnboardingModal(seen);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// riapertura manuale (bottone in Impostazioni): mostra la guida completa senza
// evidenziare nulla come "novita'", e non tocca la versione gia' salvata
function openOnboarding(){
  renderOnboardingModal(CURRENT_GUIDE_VERSION, true);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// isManual: riapertura volontaria dal bottone in Impostazioni, non un avviso
// automatico di aggiornamento - il titolo resta neutro anche se in teoria
// seenVersion>0 (qui non c'e' mai niente da evidenziare come "novita'")
function renderOnboardingModal(seenVersion, isManual){
  const isUpdate = !isManual && seenVersion > 0;
  const title = isUpdate ? 'Novità in Logbook' : 'Come funziona Logbook';
  const intro = isUpdate
    ? 'L\'app si è aggiornata: ecco di nuovo tutte le funzioni principali, con le novità evidenziate.'
    : 'Una guida veloce alle funzioni principali, prima di iniziare.';
  const tipsHtml = GUIDE_TIPS.map(tip=>{
    // "Novità" solo per chi la guida l'ha gia' vista prima (isUpdate): alla
    // primissima apertura in assoluto e' tutto nuovo per definizione, quindi
    // evidenziarlo tutto non direbbe niente e sarebbe solo rumore visivo
    const isNew = isUpdate && tip.v > seenVersion;
    return `
    <div class="onb-tip${isNew?' onb-tip-new':''}">
      <div class="onb-tip-icon">${tip.icon}</div>
      <div class="onb-tip-body">
        <div class="onb-tip-title">${escapeHtml(tip.title)}${isNew?' <span class="onb-new-badge">Novità</span>':''}</div>
        <div class="onb-tip-text">${escapeHtml(tip.text)}</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('onboardingBody').innerHTML = `
    <div class="onb-title">${escapeHtml(title)}</div>
    <div class="onb-intro">${escapeHtml(intro)}</div>
    <div class="onb-tips">${tipsHtml}</div>
    <button class="add-ex" style="width:100%;margin-top:16px;" onclick="closeOnboarding()">Ho capito, si parte! ${ICON_FLAME}</button>
  `;
}
function closeOnboarding(){
  document.getElementById('onboardingModal').style.display = 'none';
  setSeenGuideVersion(CURRENT_GUIDE_VERSION);
}
