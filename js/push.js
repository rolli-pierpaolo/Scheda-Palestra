const VAPID_PUBLIC_KEY = 'BFXitGkIG8cE5cPSeLLyJP-vGmKcQj9QHGISK7jcVwamet7BAVI3B4ho7DKeyBCiyAYu9i9rsi1DncGMQUt-S3g';

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for(let i=0; i<rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function isPushSupported(){
  return 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

async function getCurrentPushSubscription(){
  if(!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function enablePushNotifications(){
  if(!isPushSupported()){ ViridisToast('Le notifiche push non sono supportate su questo browser/dispositivo.'); return; }
  if(!isSyncEnabled()){ ViridisToast('Devi prima collegare il tuo account per attivare i promemoria.'); return; }
  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){ renderPushStatus(); return; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub){
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  const json = sub.toJSON();
  try{
    await supabaseClient.from('push_subscriptions').upsert({
      user_id: syncSession.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth
    }, {onConflict: 'user_id,endpoint'});
  }catch(e){}
  renderPushStatus();
}

async function disablePushNotifications(){
  const sub = await getCurrentPushSubscription();
  if(sub){
    if(isSyncEnabled()){
      try{ await supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }catch(e){}
    }
    await sub.unsubscribe();
  }
  renderPushStatus();
}

async function renderPushStatus(){
  const el = document.getElementById('pushStatus');
  const btn = document.getElementById('pushToggleBtn');
  if(!el || !btn) return;
  if(!isPushSupported()){
    el.textContent = 'Le notifiche push non sono supportate su questo dispositivo/browser.';
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  const sub = await getCurrentPushSubscription();
  if(sub){
    el.textContent = 'Promemoria allenamento attivi su questo dispositivo.';
    btn.textContent = 'Disattiva promemoria';
    btn.onclick = disablePushNotifications;
  } else {
    el.textContent = 'Ricevi un promemoria quando non ti alleni da un po\'.';
    btn.textContent = 'Attiva promemoria';
    btn.onclick = enablePushNotifications;
  }
}
