-- Blocco C: notifiche push vere.
-- Da eseguire DOPO schema.sql (e opzionalmente schema_block_b.sql, non e'
-- collegato a quello). Incolla ed esegui questo file intero nell'SQL editor
-- del progetto Supabase.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- ogni utente gestisce SOLO le proprie subscription
create policy "un utente gestisce le proprie subscription push"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- la Edge Function schedulata (vedi supabase/push-reminder-function.ts) usa
-- la chiave service_role, che scavalca comunque la RLS by design: non serve
-- una policy apposita per lei.
