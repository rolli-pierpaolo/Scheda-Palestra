
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  -- Identifica le scritture di questa sessione ed evita avvisi sui propri aggiornamenti.

  client_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "un utente legge solo la propria riga"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "un utente crea solo la propria riga"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "un utente aggiorna solo la propria riga"
  on public.user_data for update
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_data;
