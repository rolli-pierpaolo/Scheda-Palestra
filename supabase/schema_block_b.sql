-- Blocco B: condivisione in sola lettura con un coach.
-- Da eseguire DOPO supabase/schema.sql (che deve gia' essere stato applicato).
-- Incolla ed esegui questo file intero nell'SQL editor del progetto Supabase.

create table public.shared_access (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  viewer_email text not null,
  created_at timestamptz not null default now(),
  unique(owner_user_id, viewer_email)
);

alter table public.shared_access enable row level security;

-- il proprietario gestisce (crea/vede/cancella) i propri inviti
create policy "il proprietario gestisce i propri inviti"
  on public.shared_access for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- chi e' stato invitato vede di esserlo (per sapere chi gli ha condiviso i dati)
create policy "un invitato vede gli inviti ricevuti"
  on public.shared_access for select
  using (viewer_email = (auth.jwt() ->> 'email'));

-- estende la policy di sola lettura su user_data: oltre al proprietario
-- (gia' concesso in schema.sql), anche chi risulta invitato per quel
-- proprietario puo' leggere (mai scrivere) la sua riga
create policy "un invitato legge la riga del proprietario che lo ha invitato"
  on public.user_data for select
  using (
    exists (
      select 1 from public.shared_access
      where shared_access.owner_user_id = user_data.user_id
      and shared_access.viewer_email = (auth.jwt() ->> 'email')
    )
  );
