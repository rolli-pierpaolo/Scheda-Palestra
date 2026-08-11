// ---------------- CONDIVISIONE CON UN COACH (sola lettura) ----------------
// un utente puo' invitare via email un'altra persona (es. il proprio coach)
// a VEDERE (mai modificare) i propri dati. Chi riceve l'invito entra in una
// modalita' di sola visualizzazione che riusa il rendering vero dell'app -
// mai un secondo sistema di rendering separato - ma con tutti gli input
// bloccati via CSS (vedi .shared-readonly in css/style.css) e con ogni
// salvataggio disattivato mentre si guardano dati non propri: vedi
// isViewingShared(), controllato da saveState/saveActivePos/saveCollapsed
// (js/combobox.js, js/navigation.js) e da pushToCloud (js/sync.js).

// se non-null, siamo in modalita' visualizzazione dei dati di un altro
// utente (l'id del proprietario). sharedViewBackup e' l'istantanea dello
// stato VERO del viewer, per poterlo ripristinare uscendo dalla visualizzazione
let viewingSharedOwnerId = null;
let sharedViewBackup = null;

function isViewingShared(){
  return !!viewingSharedOwnerId;
}

// ---- lato proprietario: invita/revoca chi puo' vedere i TUOI dati ----
async function loadMyInvites(){
  if(!isSyncEnabled()) return [];
  const { data, error } = await supabaseClient
    .from('shared_access')
    .select('id, viewer_email, created_at')
    .eq('owner_user_id', syncSession.user.id)
    .order('created_at', {ascending:false});
  return error ? [] : (data||[]);
}
async function inviteViewer(){
  const input = document.getElementById('shareInviteEmail');
  const errorEl = document.getElementById('shareInviteError');
  if(!input) return;
  let email = String(input.value||'').trim().toLowerCase();
  if(errorEl) errorEl.textContent = '';
  if(!isSyncEnabled()){ if(errorEl) errorEl.textContent = 'Devi essere collegato per condividere i tuoi dati.'; return; }
  if(!email || !email.includes('@')){ if(errorEl) errorEl.textContent = 'Inserisci un indirizzo email valido.'; return; }
  if(email === (syncSession.user.email||'').toLowerCase()){ if(errorEl) errorEl.textContent = 'Non puoi invitare te stesso.'; return; }
  const { error } = await supabaseClient.from('shared_access').insert({
    owner_user_id: syncSession.user.id,
    viewer_email: email
  });
  if(error){
    if(errorEl) errorEl.textContent = error.code==='23505' ? 'Hai gia\' invitato questa email.' : error.message;
    return;
  }
  input.value = '';
  renderSharingSection();
}
async function revokeViewer(id){
  if(!isSyncEnabled()) return;
  if(!confirm('Togliere a questa persona la possibilita\' di vedere i tuoi dati?')) return;
  await supabaseClient.from('shared_access').delete().eq('id', id);
  renderSharingSection();
}

// ---- lato invitato: vede chi lo ha invitato, entra/esce dalla visualizzazione ----
async function loadSharedWithMe(){
  if(!isSyncEnabled() || !syncSession.user.email) return [];
  const { data, error } = await supabaseClient
    .from('shared_access')
    .select('owner_user_id, created_at')
    .eq('viewer_email', syncSession.user.email.toLowerCase());
  return error ? [] : (data||[]);
}

async function viewSharedAccount(ownerUserId){
  if(!isSyncEnabled()) return;
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('payload')
    .eq('user_id', ownerUserId)
    .maybeSingle();
  if(error || !data || !data.payload){ alert('Non riesco a caricare questi dati al momento.'); return; }
  let payload = data.payload;
  if(typeof payload === 'string'){
    try{ payload = JSON.parse(payload); }catch(e){ alert('I dati ricevuti non sono validi.'); return; }
  }
  const check = validateBackup(payload);
  if(!check.valid){ alert('I dati ricevuti non sono validi: ' + check.reason); return; }

  // istantanea di TUTTO lo stato vero del viewer, per ripristinarlo uscendo
  sharedViewBackup = {
    state, storicoExtra, collapsedMap, deletedStorico, calendarLog,
    extraLists, exerciseGroups, deletedEsercizi
  };
  viewingSharedOwnerId = ownerUserId;
  applyBackup(payload); // stesso riuso della sync - qui pero' non si salva mai, vedi le guardie in saveState/saveActivePos/saveCollapsed/pushToCloud
  activeDayIdx = 0;
  document.body.classList.add('shared-readonly');
  showSharedViewBanner();
  closeAuthModal();
  showView('active');
}

function exitSharedView(){
  if(!sharedViewBackup) return;
  state = sharedViewBackup.state;
  storicoExtra = sharedViewBackup.storicoExtra;
  collapsedMap = sharedViewBackup.collapsedMap;
  deletedStorico = sharedViewBackup.deletedStorico;
  calendarLog = sharedViewBackup.calendarLog;
  extraLists = sharedViewBackup.extraLists;
  exerciseGroups = sharedViewBackup.exerciseGroups;
  deletedEsercizi = sharedViewBackup.deletedEsercizi;
  sharedViewBackup = null;
  viewingSharedOwnerId = null;
  document.body.classList.remove('shared-readonly');
  hideSharedViewBanner();
  activeDayIdx = 0;
  renderDayTabs();
  showHome();
}

function showSharedViewBanner(){
  let el = document.getElementById('sharedViewBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'sharedViewBanner';
    el.className = 'shared-view-banner';
    document.body.appendChild(el);
  }
  el.innerHTML = '👀 Stai vedendo dati condivisi (sola lettura) <button class="exit-shared-view" onclick="exitSharedView()">Torna ai tuoi dati</button>';
  el.classList.add('show');
}
function hideSharedViewBanner(){
  const el = document.getElementById('sharedViewBanner');
  if(el) el.classList.remove('show');
}

// ---- rendering della sezione dentro Storico > Impostazioni ----
async function renderSharingSection(){
  const invitesEl = document.getElementById('shareInvitesList');
  const sharedWithMeEl = document.getElementById('sharedWithMeList');
  if(!invitesEl || !sharedWithMeEl) return;
  if(!isSyncEnabled()){
    invitesEl.innerHTML = '<div class="footer-note">Accedi al tuo account per condividere i dati con un coach.</div>';
    sharedWithMeEl.innerHTML = '';
    return;
  }
  invitesEl.innerHTML = '<div class="footer-note">Caricamento...</div>';
  const invites = await loadMyInvites();
  invitesEl.innerHTML = invites.length
    ? invites.map(inv => `<div class="share-row"><span>${escapeHtml(inv.viewer_email)}</span><button class="ex-context-action danger small" onclick="revokeViewer('${escapeAttr(inv.id)}')">Revoca</button></div>`).join('')
    : '<div class="footer-note">Non hai ancora condiviso i tuoi dati con nessuno.</div>';

  const sharedWithMe = await loadSharedWithMe();
  sharedWithMeEl.innerHTML = sharedWithMe.length
    ? sharedWithMe.map(s => `<div class="share-row"><span>Dati condivisi con te</span><button class="add-ex small2" onclick="viewSharedAccount('${escapeAttr(s.owner_user_id)}')">Visualizza</button></div>`).join('')
    : '<div class="footer-note">Nessuno ha ancora condiviso i propri dati con te.</div>';
}
