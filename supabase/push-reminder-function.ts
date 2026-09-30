
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:noreply@logbook.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const DAYS_THRESHOLD = 2;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: subs, error: subsError } = await supabase.from('push_subscriptions').select('*');
  if (subsError) return new Response('errore lettura subscription: ' + subsError.message, { status: 500 });
  if (!subs || !subs.length) return new Response('nessuna subscription attiva', { status: 200 });

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: rows, error: dataError } = await supabase
    .from('user_data')
    .select('user_id, payload')
    .in('user_id', userIds);
  if (dataError) return new Response('errore lettura dati utenti: ' + dataError.message, { status: 500 });

  let sent = 0;
  for (const row of rows || []) {
    let payload = row.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) { continue; }
    }
    const calendarLog = payload.calendarLog || {};
    const dates = Object.keys(calendarLog).filter((k) => calendarLog[k] && calendarLog[k].length);
    if (!dates.length) continue;
    dates.sort();
    const lastDate = new Date(dates[dates.length - 1]);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < DAYS_THRESHOLD) continue;

    const userSubs = subs.filter((s) => s.user_id === row.user_id);
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: 'Viridis', body: `Non ti alleni da ${daysSince} giorni - torna a farti sotto!` })
        );
        sent++;
      } catch (err) {
        // Rimuove le sottoscrizioni scadute o revocate.

        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }
  return new Response(`promemoria mandati: ${sent}`, { status: 200 });
});
