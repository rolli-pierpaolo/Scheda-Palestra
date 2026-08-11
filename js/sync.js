// ---------------- SINCRONIZZAZIONE CLOUD (Supabase) ----------------
// niente di nuovo nel modello dati: si riusa la stessa identica "busta"
// gia' scritta per l'export/import manuale del backup (buildBackupPayload
// in js/chart.js, validateBackup/applyBackup in js/backup.js) invece di
// costruire un secondo sistema di salvataggio parallelo. L'app resta
// perfettamente usabile senza account: la sync e' un'aggiunta sopra al
// localStorage esistente, mai un requisito.
const SUPABASE_URL = 'https://prvfiaeirqlwqtwonkfq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZqjBFAJPKt7BMcrpEgk2Xw_4q3t7X85';

let supabaseClient = null;
if(typeof supabase !== 'undefined' && supabase.createClient){
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let syncSession = null; // sessione utente Supabase corrente, null se non loggato
let syncRealtimeChannel = null;
let syncPushTimer = null;
// generato una volta per apertura dell'app, MAI salvato: serve solo a
// riconoscere le proprie scritture quando tornano indietro via realtime
// (altrimenti ogni proprio salvataggio si autosegnalerebbe come "modificato
// da un altro dispositivo")
const syncClientId = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

function isSyncEnabled(){
  return !!supabaseClient && !!syncSession;
}

// va chiamata una volta all'avvio dell'app (vedi js/app-init.js): riprende la
// sessione salvata dal browser se l'utente aveva gia' fatto login prima, e
// resta in ascolto di login/logout successivi (es. da un'altra scheda, o
// dopo aver confermato l'email di registrazione)
function initSync(){
  if(!supabaseClient) return;
  supabaseClient.auth.getSession().then(({data}) => {
    syncSession = data && data.session;
    if(syncSession) onSyncLogin();
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
  pullFromCloud(true); // primo caricamento dopo il login: sovrascrivere e' proprio quello che ci si aspetta
  subscribeSyncRealtime();
}
function onSyncLogout(){
  if(syncRealtimeChannel){ supabaseClient.removeChannel(syncRealtimeChannel); syncRealtimeChannel = null; }
  hideSyncUpdateBanner();
}

// chiamata da saveState() (vedi js/combobox.js) ogni volta che lo stato
// locale viene salvato: manda la stessa identica busta dell'export manuale.
// Debounce separato (piu' lungo di quello del salvataggio locale) per non
// mandare una richiesta di rete a ogni piccola modifica ravvicinata
function pushToCloud(){
  if(!isSyncEnabled()) return;
  // guardia in piu' (saveState() gia' non chiama nemmeno pushToCloud in
  // questo caso, vedi js/combobox.js): mentre si guardano dati condivisi da
  // un altro utente, non deve mai partire una scrittura verso il cloud
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(async () => {
    if(typeof isViewingShared === 'function' && isViewingShared()) return;
    const payload = buildBackupPayload();
    try{
      await supabaseClient.from('user_data').upsert({
        user_id: syncSession.user.id,
        payload,
        client_id: syncClientId,
        updated_at: new Date().toISOString()
      });
    }catch(e){} // offline o rete assente: l'app continua a funzionare in locale, riprovera' al prossimo salvataggio
  }, 800);
}

// scarica la riga cloud e la applica con la stessa validazione gia' scritta
// per l'import manuale da file/testo. "force" true solo al login (dove
// sovrascrivere e' atteso); il richiamo dal banner "dati aggiornati" passa
// sempre true perche' li' e' un tocco esplicito dell'utente
async function pullFromCloud(force){
  if(!isSyncEnabled() || !supabaseClient) return;
  if(!force) return; // per ora l'unico ingresso non-forzato e' il banner stesso
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('payload')
    .eq('user_id', syncSession.user.id)
    .maybeSingle();
  if(error || !data || !data.payload) return;
  // il client normalmente restituisce gia' un oggetto per una colonna jsonb,
  // ma per sicurezza (a seconda di come e' stata salvata la riga) si accetta
  // anche una stringa JSON e la si interpreta prima di validarla
  let payload = data.payload;
  if(typeof payload === 'string'){
    try{ payload = JSON.parse(payload); }catch(e){ return; }
  }
  const check = validateBackup(payload);
  if(!check.valid) return;
  // il collasso dei blocchi settimana e' una preferenza di visualizzazione
  // locale (vedi js/state.js), non un dato: non deve venire sovrascritto
  // dalla sync di un altro dispositivo
  const localCollapsed = collapsedMap;
  applyBackup(payload);
  collapsedMap = localCollapsed;
  saveCollapsed();
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
      // e' la mia stessa scrittura che torna indietro: non e' una novita' da un altro dispositivo
      if(payload.new && payload.new.client_id === syncClientId) return;
      showSyncUpdateBanner();
    })
    .subscribe();
}

// niente sovrascrittura automatica e silenziosa: solo un avviso, si applica
// quando l'utente tocca davvero (potrebbe essere a meta' di un allenamento)
function showSyncUpdateBanner(){
  let el = document.getElementById('syncUpdateBanner');
  if(!el){
    el = document.createElement('button');
    el.id = 'syncUpdateBanner';
    el.className = 'sync-update-banner';
    el.onclick = () => pullFromCloud(true);
    document.body.appendChild(el);
  }
  el.textContent = '🔄 Dati aggiornati da un altro dispositivo — tocca per ricaricare';
  el.classList.add('show');
}
function hideSyncUpdateBanner(){
  const el = document.getElementById('syncUpdateBanner');
  if(el) el.classList.remove('show');
}
