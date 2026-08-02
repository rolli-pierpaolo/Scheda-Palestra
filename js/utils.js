// TODO: sostituisci con il link del tuo modulo (Google Form o simile) prima
// di usare il tasto "Lascia un feedback" - vuoto di proposito, niente email
// scritta nel codice visto che la repo e' pubblica su GitHub
const FEEDBACK_FORM_URL = "";
function openFeedbackForm(){
  if(!FEEDBACK_FORM_URL){
    alert('Link al modulo feedback non ancora configurato (FEEDBACK_FORM_URL in js/utils.js).');
    return;
  }
  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
}
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

