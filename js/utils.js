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
// vibrazione breve su azioni chiave (spunta settimana, obiettivo sbloccato,
// giorno terminato): silenziosa se il dispositivo/browser non la supporta
// (es. iOS Safari, che non implementa la Vibration API - stesso limite gia'
// noto per il timer di recupero, vedi js/timer.js)
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
// stesso principio per le note/tecnica (.ex-comment): serve lo stesso richiamo
// da showView() quando la vista diventa visibile, altrimenti sugli esercizi
// collegati (super set/jump set) lo spazio nota resta calcolato a zero finche'
// non si cambia giorno e si torna indietro (renderActive() gira mentre la
// vista e' ancora display:none al primo ingresso in Allenamento)
function autoGrowAllExComments(){
  document.querySelectorAll('#viewActive .ex-comment').forEach(autoGrowTextarea);
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

