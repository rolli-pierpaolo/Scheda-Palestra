// ---------------- ACCOUNT (login/registrazione) ----------------
// niente di obbligatorio: senza account l'app funziona esattamente come
// prima, solo in locale. Il modale qui sotto e' l'unico punto in cui si
// tocca Supabase Auth (js/sync.js si occupa solo di push/pull dei dati,
// non di autenticazione)
let authMode = 'signin'; // 'signin' o 'signup', quale form mostra il modale
function openAuthModal(){
  authMode = 'signin';
  renderAuthModalBody();
  document.getElementById('authModal').style.display = 'flex';
}
function closeAuthModal(){
  document.getElementById('authModal').style.display = 'none';
}
function switchAuthMode(mode){
  authMode = mode;
  renderAuthModalBody();
}
function renderAuthModalBody(){
  const body = document.getElementById('authBody');
  if(!body) return;
  if(!supabaseClient){
    body.innerHTML = `<div class="footer-note">Sincronizzazione non disponibile al momento.</div>`;
    return;
  }
  if(syncSession){
    body.innerHTML = `
      <div class="footer-note" style="margin-bottom:10px;">Sincronizzazione attiva come <b>${escapeHtml(syncSession.user.email||'')}</b></div>
      <button class="add-ex" onclick="handleAuthSignOut()">Esci</button>
    `;
    return;
  }
  body.innerHTML = `
    <div class="meta-row"><span class="meta-label">Email</span><input class="meta-input" id="authEmailInput" type="email" autocomplete="email" placeholder="tua@email.it"></div>
    <div class="meta-row"><span class="meta-label">Password</span><input class="meta-input" id="authPasswordInput" type="password" autocomplete="${authMode==='signup'?'new-password':'current-password'}" placeholder="••••••••"></div>
    <div class="footer-note" id="authErrorMsg" style="color:var(--red,#B23D30);min-height:14px;"></div>
    ${authMode==='signin' ? `
      <button class="add-ex" onclick="handleAuthSignIn()">Accedi</button>
      <button class="ex-context-cancel" style="margin-top:8px;" onclick="switchAuthMode('signup')">Non hai un account? Registrati</button>
    ` : `
      <button class="add-ex" onclick="handleAuthSignUp()">Crea account</button>
      <button class="ex-context-cancel" style="margin-top:8px;" onclick="switchAuthMode('signin')">Hai gia' un account? Accedi</button>
    `}
  `;
}
function authSetError(msg){
  const el = document.getElementById('authErrorMsg');
  if(el) el.textContent = msg || '';
}
async function handleAuthSignIn(){
  const email = (document.getElementById('authEmailInput').value||'').trim();
  const password = document.getElementById('authPasswordInput').value||'';
  if(!email || !password){ authSetError('Inserisci email e password.'); return; }
  authSetError('');
  const { error } = await supabaseClient.auth.signInWithPassword({email, password});
  if(error){ authSetError(error.message); return; }
  closeAuthModal();
}
async function handleAuthSignUp(){
  const email = (document.getElementById('authEmailInput').value||'').trim();
  const password = document.getElementById('authPasswordInput').value||'';
  if(!email || !password){ authSetError('Inserisci email e password.'); return; }
  if(password.length < 6){ authSetError('La password deve avere almeno 6 caratteri.'); return; }
  authSetError('');
  const { error } = await supabaseClient.auth.signUp({email, password});
  if(error){ authSetError(error.message); return; }
  authSetError('');
  const body = document.getElementById('authBody');
  if(body) body.innerHTML = `<div class="footer-note">Controlla la tua email per confermare l'account, poi torna qui e accedi.</div>`;
}
async function handleAuthSignOut(){
  await supabaseClient.auth.signOut();
  renderAuthModalBody();
}
// aggiorna il bottone account nella topbar (icona piena se loggato, vuota se no)
function renderAuthStatus(){
  const btn = document.getElementById('accountBtn');
  if(btn){
    btn.classList.toggle('logged-in', !!syncSession);
    btn.title = syncSession ? ('Sincronizzato come ' + (syncSession.user.email||'')) : 'Account e sincronizzazione';
  }
  // stessa informazione ripetuta nella sezione Account dentro Impostazioni,
  // per chi arriva li' invece che dall'icona account in alto
  const settingsStatus = document.getElementById('settingsAccountStatus');
  if(settingsStatus){
    settingsStatus.textContent = syncSession
      ? ('Sincronizzato come ' + (syncSession.user.email||''))
      : 'Non sei collegato: i dati restano solo su questo dispositivo.';
  }
  if(document.getElementById('authModal').style.display === 'flex') renderAuthModalBody();
}
