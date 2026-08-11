-- Schema Supabase per la sincronizzazione di Logbook.
-- Incolla ed esegui questo file intero nell'SQL editor del progetto Supabase
-- (dashboard -> SQL Editor -> New query -> incolla -> Run).
--
-- Una sola tabella: una riga per utente, con dentro l'intero backup dell'app
-- (lo stesso oggetto gia' usato per l'export/import manuale, vedi
-- buildBackupPayload() in js/chart.js e applyBackup() in js/backup.js).

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  -- id casuale generato una volta per apertura dell'app (non salvato in
  -- localStorage): serve solo a riconoscere "questa scrittura l'ho appena
  -- fatta io da questo stesso dispositivo", per non mostrarsi da soli
  -- l'avviso "dati aggiornati da un altro dispositivo" dopo ogni proprio salvataggio
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

-- abilita gli aggiornamenti in tempo reale (necessario per il banner
-- "dati aggiornati da un altro dispositivo")
alter publication supabase_realtime add table public.user_data;
