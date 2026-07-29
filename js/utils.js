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

