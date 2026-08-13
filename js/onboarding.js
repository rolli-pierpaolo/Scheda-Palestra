// ---------------- GUIDA INTRODUTTIVA (onboarding) ----------------
// elenco cumulativo di consigli sulle funzioni principali per l'utente medio.
// Ogni consiglio porta la versione della guida in cui è stato aggiunto: quando
// si aggiunge una funzione nuova utile all'utente medio basta alzare di uno
// CURRENT_GUIDE_VERSION e mettere lo stesso numero sul consiglio nuovo. Chi ha
// già visto una versione precedente si rivedrà l'intera guida, vecchi
// consigli più quello nuovo evidenziato, non solo la differenza, così la
// ripassa tutta insieme alla novità invece di dimenticarsela col tempo
const ONBOARDING_VERSION_KEY = "scheda_wo18_onboarding_version_v1";
const CURRENT_GUIDE_VERSION = 1;
const GUIDE_TIPS = [
  { v:1, icon:ICON_HOME, title:'Home', text:'Qui vedi il giorno di allenamento suggerito (quello che "respira") e l\'ordine dei prossimi. Tocca la card evidenziata per iniziare.' },
  { v:1, icon:ICON_CHECK, title:'Settimana completata', text:'Quando finisci l\'ultima ripetizione di un esercizio in una settimana, l\'app te lo chiede e la segna come fatta da sola.' },
  { v:1, icon:ICON_FLAG, title:'Giorno terminato', text:'A fine sessione premi "Giorno di allenamento terminato": viene registrata e torni alla Home, pronto per il prossimo giorno.' },
  { v:1, icon:ICON_LINK, title:'Super set', text:'Puoi collegare due esercizi per farli uno dopo l\'altro senza pausa, tipo super set o giant set.' },
  { v:1, icon:ICON_TARGET, title:'Obiettivi nascosti', text:'In "Obiettivi" trovi traguardi a sorpresa: restano oscurati finche\' non li sblocchi allenandoti davvero.' },
  { v:1, icon:ICON_CALENDAR, title:'Calendario', text:'Il Calendario, dentro Progressi, mostra tutti i giorni di allenamento fatti, con un pallino colorato per ogni sessione.' },
];

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
  renderOnboardingModal(seen);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// riapertura manuale dal bottone in Impostazioni: mostra la guida completa
// senza evidenziare nulla come novità, e non tocca la versione già salvata
function openOnboarding(){
  renderOnboardingModal(CURRENT_GUIDE_VERSION, true);
  document.getElementById('onboardingModal').style.display = 'flex';
}
// costruisce il contenuto della guida. isManual indica una riapertura
// volontaria dal bottone in Impostazioni, non un avviso automatico di
// aggiornamento: il titolo resta neutro anche se in teoria seenVersion è
// maggiore di zero, qui non c'è mai niente da evidenziare come novità
function renderOnboardingModal(seenVersion, isManual){
  const isUpdate = !isManual && seenVersion > 0;
  const title = isUpdate ? 'Novità in Viridis' : 'Come funziona Viridis';
  const intro = isUpdate
    ? 'L\'app si è aggiornata: ecco di nuovo tutte le funzioni principali, con le novità evidenziate.'
    : 'Una guida veloce alle funzioni principali, prima di iniziare.';
  const tipsHtml = GUIDE_TIPS.map(tip=>{
    // l'etichetta "novità" compare solo per chi la guida l'ha già vista prima:
    // alla primissima apertura in assoluto è tutto nuovo per definizione,
    // quindi evidenziarlo tutto non direbbe niente e sarebbe solo rumore visivo
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
// chiude la guida e ricorda che questa versione è stata vista
function closeOnboarding(){
  document.getElementById('onboardingModal').style.display = 'none';
  setSeenGuideVersion(CURRENT_GUIDE_VERSION);
}
