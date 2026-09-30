const SUPABASE_URL = 'https://prvfiaeirqlwqtwonkfq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZqjBFAJPKt7BMcrpEgk2Xw_4q3t7X85';

let supabaseClient = null;
if(typeof supabase !== 'undefined' && supabase.createClient){
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let syncSession = null;
let syncRealtimeChannel = null;
let syncPushTimer = null;
// Le revisioni locali distinguono le modifiche in attesa dalla copia confermata dal cloud.

const SYNC_LOCAL_REVISION_KEY = 'scheda_wo18_sync_local_revision_v1';
const SYNC_CONFIRMED_REVISION_KEY = 'scheda_wo18_sync_confirmed_revision_v1';
function readSyncRevision(key){
  try{ return parseInt(localStorage.getItem(key), 10) || 0; }catch(e){ return 0; }
}
function writeSyncRevision(key, value){
  try{ localStorage.setItem(key, String(value)); }catch(e){}
}
let syncLocalRevision = readSyncRevision(SYNC_LOCAL_REVISION_KEY);
let syncConfirmedRevision = readSyncRevision(SYNC_CONFIRMED_REVISION_KEY);
let syncConflictRemoteUpdatedAt = '';
const syncClientId = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

function isSyncEnabled(){
  return !!supabaseClient && !!syncSession;
}

function initSync(){
  if(!supabaseClient) return;
  supabaseClient.auth.getSession().then(({data}) => {
    syncSession = data && data.session;
    if(syncSession){
      subscribeSyncRealtime();
      checkRemoteUpdateOnBoot();
    }
    if(typeof renderAuthStatus === 'function') renderAuthStatus();
  });
  supabaseClient.auth.onAuthStateChange((event, session) => {
    syncSession = session;
    if(event === 'SIGNED_IN') onSyncLogin();
    if(event === 'SIGNED_OUT') onSyncLogout();
    if(typeof renderAuthStatus === 'function') renderAuthStatus();
  });
}

function onSyncLogin(){
  pullFromCloud(true);
  subscribeSyncRealtime();
}
const LAST_CLOUD_PUSH_KEY = "scheda_wo18_last_cloud_push_v1";
const BOOT_CHECK_SLACK_MS = 5000;
async function checkRemoteUpdateOnBoot(){
  if(!isSyncEnabled()) return;
  let lastPush = 0;
  try{ lastPush = parseInt(localStorage.getItem(LAST_CLOUD_PUSH_KEY), 10) || 0; }catch(e){}
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('updated_at')
    .eq('user_id', syncSession.user.id)
    .maybeSingle();
  if(error || !data || !data.updated_at) return;
  const cloudUpdatedAt = new Date(data.updated_at).getTime();
  if(isNaN(cloudUpdatedAt)) return;
  if(lastPush === 0){
    try{ localStorage.setItem(LAST_CLOUD_PUSH_KEY, String(cloudUpdatedAt)); }catch(e){}
    return;
  }
  if(cloudUpdatedAt > lastPush + BOOT_CHECK_SLACK_MS) showSyncUpdateBanner();
}
function onSyncLogout(){
  if(syncRealtimeChannel){ supabaseClient.removeChannel(syncRealtimeChannel); syncRealtimeChannel = null; }
  hideSyncUpdateBanner();
}

let cloudPushPending = false;
function pushToCloud(){
  if(!isSyncEnabled()) return;
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  syncLocalRevision++;
  writeSyncRevision(SYNC_LOCAL_REVISION_KEY, syncLocalRevision);
  cloudPushPending = true;
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(flushCloudPush, 800);
}
async function flushCloudPush(){
  clearTimeout(syncPushTimer);
  if(!cloudPushPending) return;
  cloudPushPending = false;
  if(!isSyncEnabled()) return;
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  const payload = buildBackupPayload();
  const revisionBeingSent = syncLocalRevision;
  try{
    const result = await supabaseClient.from('user_data').upsert({
      user_id: syncSession.user.id,
      payload,
      client_id: syncClientId,
      updated_at: new Date().toISOString()
    });
    if(result?.error)throw result.error;
    syncConfirmedRevision = Math.max(syncConfirmedRevision,revisionBeingSent);
    writeSyncRevision(SYNC_CONFIRMED_REVISION_KEY, syncConfirmedRevision);
    try{ localStorage.setItem(LAST_CLOUD_PUSH_KEY, String(Date.now())); }catch(e){}
  }catch(e){}
  if(typeof updateWorkoutSaveStatus==='function')updateWorkoutSaveStatus();
}
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushCloudPush();
});
window.addEventListener('pagehide', flushCloudPush);

async function pullFromCloud(force){
  if(!isSyncEnabled() || !supabaseClient) return;
  if(!force) return;
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('payload')
    .eq('user_id', syncSession.user.id)
    .maybeSingle();
  if(error || !data || !data.payload) return;
  let payload = data.payload;
  if(typeof payload === 'string'){
    try{ payload = JSON.parse(payload); }catch(e){ return; }
  }
  const check = validateBackup(payload);
  if(!check.valid) return;
  const localCollapsed = collapsedMap;
  const localDayIdx = activeDayIdx;
  const localExerciseIdx = activeExerciseIdx;
  applyBackup(payload);
  collapsedMap = localCollapsed;
  saveCollapsed();
  if(state.days[localDayIdx]){
    activeDayIdx = localDayIdx;
    if(typeof localExerciseIdx === 'number' && state.days[activeDayIdx].esercizi[localExerciseIdx]) activeExerciseIdx = localExerciseIdx;
    saveActivePos();
    renderDayTabs();
    renderActive();
  }
  hideSyncUpdateBanner();
}

function subscribeSyncRealtime(){
  if(!supabaseClient || !syncSession) return;
  if(syncRealtimeChannel) supabaseClient.removeChannel(syncRealtimeChannel);
  syncRealtimeChannel = supabaseClient
    .channel('user_data_' + syncSession.user.id)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'user_data',
      filter: 'user_id=eq.' + syncSession.user.id
    }, (payload) => {
      if(payload.new && payload.new.client_id === syncClientId) return;
      showSyncUpdateBanner(payload.new && payload.new.updated_at);
    })
    .subscribe();
}

// Applica la copia remota solo dopo la scelta dell'utente.

function hasUnsyncedLocalChanges(){
  return syncLocalRevision > syncConfirmedRevision || cloudPushPending;
}
function showSyncUpdateBanner(remoteUpdatedAt){
  syncConflictRemoteUpdatedAt = remoteUpdatedAt || syncConflictRemoteUpdatedAt || '';
  let el = document.getElementById('syncUpdateBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'syncUpdateBanner';
    el.className = 'sync-update-banner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  if(hasUnsyncedLocalChanges()){
    el.innerHTML = `<div><b>Modifiche su due dispositivi</b><br><span>Decidi quale versione mantenere.</span></div>
      <div class="sync-update-actions"><button onclick="pullFromCloud(true)">Carica l'altra copia</button><button onclick="keepLocalCloudVersion()">Tieni questa copia</button></div>`;
  } else {
    el.innerHTML = `<span>🔄 Dati aggiornati da un altro dispositivo</span><button onclick="pullFromCloud(true)">Ricarica</button>`;
  }
  el.classList.add('show');
}
function keepLocalCloudVersion(){
  if(!isSyncEnabled()) return;
  if(syncLocalRevision === syncConfirmedRevision){
    syncLocalRevision++;
    writeSyncRevision(SYNC_LOCAL_REVISION_KEY, syncLocalRevision);
  }
  cloudPushPending = true;
  flushCloudPush();
  hideSyncUpdateBanner();
}
function hideSyncUpdateBanner(){
  const el = document.getElementById('syncUpdateBanner');
  if(el) el.classList.remove('show');
  syncConflictRemoteUpdatedAt = '';
}
