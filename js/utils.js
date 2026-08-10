const FEEDBACK_FORM_URL = "https://forms.gle/sjQnNHYtPJqRnG119";
function openFeedbackForm(){
  if(!FEEDBACK_FORM_URL){
    alert('Link al modulo feedback non ancora configurato (FEEDBACK_FORM_URL in js/utils.js).');
    return;
  }
  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
}
// icone SVG in linea (stroke="currentColor": prendono da sole il colore del
// bottone che le contiene, niente CSS in piu' da coordinare) al posto delle
// emoji sui bottoni funzionali della card esercizio - stesso stile a linee
// dell'icona Home nella barra di navigazione, cosi' l'app ha un set coerente
// invece di dipendere da come ogni telefono disegna le emoji
const ICON_TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M4 7 H20"/><path d="M9 7 V4.5 A1 1 0 0 1 10 3.5 H14 A1 1 0 0 1 15 4.5 V7"/><path d="M6 7 L7 20 A1 1 0 0 0 8 21 H16 A1 1 0 0 0 17 20 L18 7"/><path d="M10 11 V17"/><path d="M14 11 V17"/></svg>';
const ICON_CHART = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M4 20 V4"/><path d="M4 20 H20"/><path d="M6.5 15 L11 10.5 L14 13.5 L19 7.5"/></svg>';
const ICON_PLATE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><path d="M10 14 L14 10"/><path d="M8.5 15.5 L6.5 17.5 A3 3 0 0 1 2.5 13.5 L5.5 10.5 A3 3 0 0 1 9.5 10.5"/><path d="M15.5 8.5 L17.5 6.5 A3 3 0 0 1 21.5 10.5 L18.5 13.5 A3 3 0 0 1 14.5 13.5"/></svg>';
// "..." stile iOS: tre pallini pieni invece del solito bordo/tratto delle
// altre icone di questo set, si legge meglio a quella dimensione minuscola
const ICON_MORE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle"><circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/></svg>';
// seconda tornata: intestazioni/bottoni di Storico + chrome dei modali. Stessa
// funzione svgIcon() per non ripetere gli attributi comuni ogni volta - il
// "d" di ogni singolo path resta l'unica parte che cambia da icona a icona
function svgIcon(inner, size){
  size = size || 16;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="vertical-align:middle">${inner}</svg>`;
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
// terza tornata: badge obiettivi, toast/festeggiamenti, indicatori settimana
const ICON_FLAG = svgIcon('<path d="M6 3 V21"/><path d="M6 4 H16 L13.5 7.5 L16 11 H6"/>');
const ICON_STAR = svgIcon('<path d="M12 3 L14.6 9 L21 9.6 L16.2 13.8 L17.6 20 L12 16.7 L6.4 20 L7.8 13.8 L3 9.6 L9.4 9 Z"/>');
const ICON_TROPHY = svgIcon('<path d="M7 4 H17 V8 A5 5 0 0 1 7 8 Z"/><path d="M7 5 H4.5 A2.5 2.5 0 0 0 7 9.5"/><path d="M17 5 H19.5 A2.5 2.5 0 0 1 17 9.5"/><path d="M12 13 V17"/><path d="M9 20 H15"/><path d="M10 17 H14 L14.5 20 H9.5 Z"/>');
const ICON_CYCLE = svgIcon('<path d="M5 12 A7 7 0 0 1 18.5 8"/><path d="M15.5 5 L18.5 8 L21 5.5"/><path d="M19 12 A7 7 0 0 1 5.5 16"/><path d="M8.5 19 L5.5 16 L3 18.5"/>');
const ICON_LOCK = svgIcon('<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11 V7.5 A4 4 0 0 1 16 7.5 V11"/>');
const ICON_WARNING = svgIcon('<path d="M12 4 L21 19 H3 Z"/><path d="M12 10 V14"/><circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none"/>');
const ICON_FLAME = svgIcon('<path d="M12 2 C12 2 6 9 6 13.5 A6 6 0 0 0 18 13.5 C18 11 16.5 9.5 15.8 9 C16 11 14 12 14 10 C14 7.5 15 6 12 2 Z"/>');
const ICON_LIGHTNING = svgIcon('<path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z"/>');
// varianti a colori pieni delle stesse 3 forme, usate SOLO per l'icona finale
// delle frasi motivazionali in Home (splitMotivation, in js/home.js): li'
// l'utente le vuole colorate e "piene" invece che in tinta unita come il
// resto dell'app - tutte le altre icone (bottoni, badge...) restano
// outline/monocromatiche per coerenza col resto dell'interfaccia
const ICON_FLAME_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><path d="M12 2 C12 2 6 9 6 13.5 A6 6 0 0 0 18 13.5 C18 11 16.5 9.5 15.8 9 C16 11 14 12 14 10 C14 7.5 15 6 12 2 Z" fill="#FF7A1A"/></svg>';
const ICON_LIGHTNING_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><path d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z" fill="#FFD400"/></svg>';
const ICON_PLATE_COLOR = '<svg viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle"><circle cx="12" cy="12" r="8" fill="none" stroke="#FF3D7F" stroke-width="3"/><circle cx="12" cy="12" r="3" fill="#FF3D7F"/></svg>';
const ICON_POINT = svgIcon('<circle cx="12" cy="12" r="8.5"/><path d="M12 8 V13"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>');
// stessa identica forma della casetta gia' in HTML nella barra di navigazione:
// costante qui solo per poterla riusare anche dentro le stringhe JS (guida)
const ICON_HOME = svgIcon('<path d="M4 11 L12 4 L20 11 V20 H4 Z"/><path d="M9.5 20 V13 H14.5 V20"/>');
// vibrazione breve su azioni chiave (spunta settimana, obiettivo sbloccato,
// giorno terminato): silenziosa se il dispositivo/browser non la supporta
// (es. iOS Safari, che non implementa la Vibration API)
function vibrate(pattern){
  if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}
// auto-avanzamento del focus dal campo kg al campo rip della stessa riga: le
// tastiere numeriche (inputmode decimal/numeric) di solito non hanno un tasto
// "avanti", quindi qui si usa una piccola pausa dopo l'ultimo tasto premuto -
// se dopo quella pausa il focus e' ancora sul campo kg (l'utente non e' gia'
// passato oltre da solo) si salta al campo successivo della riga
function scheduleAutoAdvance(input){
  clearTimeout(input._advanceTimer);
  if(!input.value) return;
  input._advanceTimer = setTimeout(()=>{
    if(document.activeElement !== input) return;
    const row = input.closest('.set-row, .linked-sub-row');
    if(!row) return;
    const fields = row.querySelectorAll('.set-input:not(.max-input)');
    const idx = Array.prototype.indexOf.call(fields, input);
    const next = fields[idx+1];
    if(next) next.focus();
  }, 700);
}
// hash minimo e stabile (non Math.random): la stessa frase resta la stessa
// finche' non cambia il seed (esercizio+settimana), invece di saltare a caso
// a ogni render - stesso principio di pickMotivationalPhrase in js/home.js
function pickFromPool(pool, seed){
  let hash = 0;
  for(let i=0;i<seed.length;i++){ hash = (hash*31 + seed.charCodeAt(i)) >>> 0; }
  return pool[hash % pool.length];
}
// piu' varianti apposta (prima era una singola frase fissa per direzione,
// sempre identica: "leggeva sempre uguale", cosa giustamente segnalata come
// stucchevole da rileggere esercizio dopo esercizio) - il seed usato per
// scegliere il suffisso e' diverso da quello della frase base (vedi sotto),
// cosi' le due cose non sono sempre "incollate" nella stessa combinazione
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
// frase motivazionale per la settimana CORRENTE non ancora conclusa: SEMPRE
// presente a prescindere dai dati delle settimane vecchie (anche alla primissima
// settimana in assoluto, dove non c'e' proprio nulla prima) - i dati passati
// servono solo per aggiungere un breve suggerimento di direzione in piu' (piu'
// peso o piu' ripetizioni) quando ci sono, MAI per decidere se mostrare la
// frase o no. La base viene dal pool motivazionale del GRUPPO MUSCOLARE di
// QUESTO esercizio (vedi MUSCLE_MOTIVATION/getExerciseGroup) - non ha senso
// una frase sul petto mentre stai facendo gambe. Il suffisso di direzione non
// rivela mai il numero di ripetizioni fatte la volta scorsa: vederlo scritto
// potrebbe influenzare a farne apposta di meno per "eguagliarlo" invece di
// superarlo (richiesta esplicita dell'utente)
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
// per infilare un nome dentro una stringa JS tra apici singoli scritta a mano
// in un onclick="...('...')" : nomi con un apostrofo (es. "SLDL (TI TORMENTERA')",
// un esercizio vero salvato in DATA) romperebbero l'attributo senza questo escape
function escapeJs(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeHtml(s){ if(s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// altezza della textarea del nome esercizio calcolata sul contenuto reale
// (scrollHeight): azzerare l'altezza prima del ricalcolo e' necessario,
// altrimenti scrollHeight resterebbe quello vecchio se il testo si accorcia
function autoGrowTextarea(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
// dopo ogni renderActive() le textarea dei nomi partono tutte con l'altezza
// di una riga sola: qui si ricalcolano subito, cosi' i nomi lunghi si vedono
// gia' per intero dal primo render, senza dover toccare l'esercizio
function autoGrowAllExNames(){
  document.querySelectorAll('#viewActive .ex-name').forEach(autoGrowTextarea);
}
// le note/tecnica (.ex-comment) NON si allargano piu' col contenuto: restano
// piccole finche' non ci si clicca sopra (vedi :focus in css/style.css),
// niente piu' bisogno di ricalcolarle dopo ogni render
// stesso principio per il campo "Serie" (schema): prima era un input a riga
// singola che tagliava gli schemi scritti lunghi, ora e' una textarea con
// riga propria che cresce con il testo, stessa logica di nome/note
function autoGrowAllExSchema(){
  document.querySelectorAll('#viewActive .meta-input.schema').forEach(el=>{
    autoGrowTextarea(el);
    autoWidthSchema(el);
  });
}
// larghezza in "ch" (circa 1 carattere) invece che altezza: per uno schema
// corto ("4x8") il campo resta piccolo come il Recupero qui sopra, invece di
// occupare comunque tutta la riga. Solo se il testo supera la larghezza
// disponibile (max-width:100% in CSS) va a capo, e li' entra in gioco la
// crescita in altezza di autoGrowTextarea qui sopra
function autoWidthSchema(el){
  const len = (el.value || '').length;
  el.style.width = Math.max(4, Math.min(len + 2, 40)) + 'ch';
}
// i campi kg/rip usano inputmode="decimal"/"numeric" cosi' di default si apre
// la tastiera solo numeri (piu' comoda per la maggior parte degli inserimenti),
// ma a volte serve poter scrivere anche lettere/simboli (es. "fallimento"):
// doppio tap sul campo passa alla tastiera intera, e torna in automatico a
// quella numerica di default appena si esce dal campo (blur vero, non quello
// interno usato per far ridisegnare la tastiera dal sistema operativo)
function toggleFieldKeyboard(input){
  const dflt = input.dataset.defaultInputmode || input.getAttribute('inputmode') || 'decimal';
  input.dataset.defaultInputmode = dflt;
  const switchingToText = input.getAttribute('inputmode') !== 'text';
  input._kbSwitching = true;
  input.setAttribute('inputmode', switchingToText ? 'text' : dflt);
  input.blur();
  setTimeout(()=>{ input._kbSwitching = false; input.focus(); }, 30);
}
function resetFieldKeyboard(input){
  if(input._kbSwitching) return;
  if(input.dataset.defaultInputmode){
    input.setAttribute('inputmode', input.dataset.defaultInputmode);
    delete input.dataset.defaultInputmode;
  }
}

