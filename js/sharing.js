
let viewingSharedOwnerId = null;
let sharedViewBackup = null;

function isViewingShared(){
  return !!viewingSharedOwnerId;
}

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
    if(errorEl) errorEl.textContent = error.code==='23505' ? 'Hai già invitato questa email.' : error.message;
    return;
  }
  input.value = '';
  renderSharingSection();
}
async function revokeViewer(id){
  if(!isSyncEnabled()) return;
  if(!await ViridisConfirmDialog('Togliere a questa persona la possibilità di vedere i tuoi dati?')) return;
  await supabaseClient.from('shared_access').delete().eq('id', id);
  renderSharingSection();
}

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
  if(error || !data || !data.payload){ ViridisToast('Non riesco a caricare questi dati al momento.'); return; }
  let payload = data.payload;
  if(typeof payload === 'string'){
    try{ payload = JSON.parse(payload); }catch(e){ ViridisToast('I dati ricevuti non sono validi.'); return; }
  }
  const check = validateBackup(payload);
  if(!check.valid){ ViridisToast('I dati ricevuti non sono validi: ' + check.reason); return; }

  sharedViewBackup = {
    state, storicoExtra, collapsedMap, deletedStorico, calendarLog,
    extraLists, exerciseGroups, deletedEsercizi
  };
  viewingSharedOwnerId = ownerUserId;
  applyBackup(payload);
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
