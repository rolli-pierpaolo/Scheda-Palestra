// ---------------- TIMER DI RECUPERO ----------------
function parseRecuperoSeconds(text){
  if(!text) return 60;
  text = String(text).trim();
  // range in minuti, es. "2-3'"
  let m = /(\d+)\s*-\s*(\d+)\s*'/.exec(text);
  if(m) return Math.round((parseInt(m[1],10)+parseInt(m[2],10))/2*60);
  // secondi: doppio apice/doppie virgolette (controllato PRIMA dei minuti,
  // altrimenti "60''" verrebbe letto come "60'" = 60 minuti invece di 60 secondi)
  m = /(\d+)\s*(''|"|”|’’)/.exec(text);
  if(m) return parseInt(m[1],10);
  // minuti: singolo apice
  m = /(\d+)\s*'/.exec(text);
  if(m) return parseInt(m[1],10)*60;
  m = /(\d+)/.exec(text);
  if(m) return parseInt(m[1],10);
  return 60;
}
let timerInterval = null;
let timerRemaining = 0;
let audioCtx = null;
function unlockAudio(){
  // iOS richiede che l'AudioContext venga creato/sbloccato DENTRO un tocco reale
  // dell'utente: lo facciamo qui (chiamato dal tasto ▶, che e' un vero tap),
  // cosi il beep suonato piu' tardi dal timer (fuori da un tap diretto) funziona.
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    // suono impercettibile solo per "sbloccare" definitivamente il contesto audio
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.01);
  }catch(e){}
}
function startTimerFromRow(btn){
  unlockAudio();
  const input = btn.parentElement.querySelector('.meta-input');
  const secs = parseRecuperoSeconds(input ? input.value : '');
  startTimer(secs);
}
function startTimer(seconds){
  clearInterval(timerInterval);
  timerRemaining = seconds;
  const bar = document.getElementById('timerBar');
  bar.classList.remove('done');
  bar.style.display = 'flex';
  updateTimerClock();
  timerInterval = setInterval(()=>{
    timerRemaining--;
    updateTimerClock();
    if(timerRemaining <= 0){
      clearInterval(timerInterval);
      timerDone();
    }
  }, 1000);
}
function updateTimerClock(){
  const m = Math.max(0, Math.floor(timerRemaining/60));
  const s = Math.max(0, timerRemaining%60);
  document.getElementById('timerClock').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function timerDone(){
  const bar = document.getElementById('timerBar');
  bar.classList.add('done');
  document.getElementById('timerClock').textContent = "PRONTO";
  // Nota: iOS Safari non implementa la Vibration API (limite di sistema, nessun
  // trucco JS puo' aggirarlo) - la chiamata resta per i pochi browser che la supportano,
  // ma su iPhone l'avviso e' affidato al suono + al flash colorato della barra.
  if(navigator.vibrate) navigator.vibrate([200,100,200,100,400]);
  playBeep();
  flashScreen();
}
function flashScreen(){
  document.body.classList.add('flash');
  let n = 0;
  const iv = setInterval(()=>{
    document.body.classList.toggle('flash');
    n++;
    if(n>=6) clearInterval(iv);
  }, 250);
}
function stopTimer(){
  clearInterval(timerInterval);
  document.getElementById('timerBar').style.display = 'none';
  document.body.classList.remove('flash');
}
function playBeep(){
  if(!audioCtx) return;
  try{
    if(audioCtx.state === 'suspended') audioCtx.resume();
    let t = audioCtx.currentTime;
    for(let i=0;i<4;i++){
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.28);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t+0.3);
      t += 0.4;
    }
  }catch(e){}
}


