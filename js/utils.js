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

