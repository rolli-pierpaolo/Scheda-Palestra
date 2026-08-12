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
//
// BUG GRAVE risolto qui: il blocco getSession().then(...) sotto viene
// eseguito ad OGNI avvio dell'app, non solo alla primissima volta che ci si
// collega - e su iPhone, mettere la PWA in background e' spesso sufficiente
// perche' iOS ricarichi la pagina da zero (quindi "avvio dell'app" capita
// molto piu' spesso di quanto sembri, non solo aprendo l'icona da chiusa).
// Prima, trovare una sessione gia' salvata veniva trattato come un login
// vero e proprio e faceva partire onSyncLogin() -> pullFromCloud(true), che
// SOVRASCRIVE lo stato locale con l'ultima copia sul cloud senza chiedere -
// se quella copia sul cloud era piu' vecchia (es. l'ultimo invio al cloud
// non aveva fatto in tempo a partire prima che il telefono mettesse in
// pausa l'app), il giorno/la settimana su cui si era andava indietro da
// solo ad ogni riapertura. Ora un semplice "la sessione c'era gia'" non
// forza piu' nulla: ci si iscrive al realtime e si controlla in modo NON
// distruttivo se il cloud ha qualcosa di piu' recente (vedi
// checkRemoteUpdateOnBoot) - se si', si mostra il solito banner "dati
// aggiornati", mai una sovrascrittura silenziosa. Il pull forzato resta
// SOLO per un login vero, quello si' fatto apposta in quel momento
// dall'utente (vedi onAuthStateChange piu' sotto, evento SIGNED_IN - che
// supabase-js emette solo per un login/registrazione veri, MAI per una
// sessione ripresa da quella salvata in precedenza, quella e' 'INITIAL_SESSION')
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
  pullFromCloud(true); // login vero e proprio appena fatto: sovrascrivere e' proprio quello che ci si aspetta
  subscribeSyncRealtime();
}
// controllo non distruttivo all'avvio: confronta il momento dell'ultimo
// invio riuscito al cloud DA QUESTO dispositivo (lastCloudPushAt, salvato in
// flushCloudPush) con l'orario dell'ultima scrittura sulla riga cloud - se
// il cloud e' piu' recente, vuol dire che e' arrivato un aggiornamento da
// un altro dispositivo (o un invio di questo stesso dispositivo non ancora
// riflesso qui) mentre l'app non era aperta: si avvisa con lo stesso banner
// del realtime, MAI un'applicazione automatica. Qualche secondo di margine
// (BOOT_CHECK_SLACK_MS) assorbe la differenza tra l'orologio del telefono e
// quello del server, oltre alla latenza della richiesta stessa
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
  // BUG risolto qui: LAST_CLOUD_PUSH_KEY e' una chiave nuova, chi aveva gia'
  // sincronizzato da prima di questo fix non ce l'ha ancora salvata - senza
  // questo controllo, lastPush restava 0 e QUALSIASI data vera sul cloud
  // (che e' sempre "dopo il 1970") risultava "piu' recente", facendo
  // comparire il banner anche senza nessuna modifica vera da nessuna parte.
  // La prima volta che si controlla, si registra solo il punto di partenza
  // (senza avvisare): il confronto vero parte dal controllo successivo
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

// chiamata da saveState() (vedi js/combobox.js) ogni volta che lo stato
// locale viene salvato: manda la stessa identica busta dell'export manuale.
// Debounce separato (piu' lungo di quello del salvataggio locale) per non
// mandare una richiesta di rete a ogni piccola modifica ravvicinata.
// flushCloudPush() (chiamata anche da visibilitychange/pagehide qui sotto)
// prova a mandarla SUBITO invece di aspettare gli 800ms, per lo stesso motivo
// del flush locale in js/combobox.js: l'app in background ha poco tempo
let cloudPushPending = false;
function pushToCloud(){
  if(!isSyncEnabled()) return;
  // guardia in piu' (saveState() gia' non chiama nemmeno pushToCloud in
  // questo caso, vedi js/combobox.js): mentre si guardano dati condivisi da
  // un altro utente, non deve mai partire una scrittura verso il cloud
  if(typeof isViewingShared === 'function' && isViewingShared()) return;
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
  try{
    await supabaseClient.from('user_data').upsert({
      user_id: syncSession.user.id,
      payload,
      client_id: syncClientId,
      updated_at: new Date().toISOString()
    });
    // usato da checkRemoteUpdateOnBoot per sapere se, al prossimo avvio, il
    // cloud contiene qualcosa di piu' recente di quello che si e' mandato
    // da qui - salvato SOLO se l'invio e' andato davvero a buon fine
    try{ localStorage.setItem(LAST_CLOUD_PUSH_KEY, String(Date.now())); }catch(e){}
  }catch(e){} // offline o rete assente: l'app continua a funzionare in locale, riprovera' al prossimo salvataggio
}
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushCloudPush();
});
window.addEventListener('pagehide', flushCloudPush);

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
  // BUG risolto qui: applyBackup() azzera SEMPRE activeDayIdx/activeExerciseIdx
  // a 0 - giusto per un ripristino vero (import di un backup, si riparte da
  // capo), ma qui si sta solo allineando ai dati piu' recenti: ogni volta
  // che si toccava il banner "dati aggiornati" (o, prima del fix del falso
  // positivo, anche senza toccarlo) si veniva riportati al primo giorno
  // anche restando esattamente sui propri dati veri
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
