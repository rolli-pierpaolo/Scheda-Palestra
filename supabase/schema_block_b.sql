
create table public.shared_access (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  viewer_email text not null,
  created_at timestamptz not null default now(),
  unique(owner_user_id, viewer_email)
);

alter table public.shared_access enable row level security;

create policy "il proprietario gestisce i propri inviti"
  on public.shared_access for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "un invitato vede gli inviti ricevuti"
  on public.shared_access for select
  using (viewer_email = (auth.jwt() ->> 'email'));

create policy "un invitato legge la riga del proprietario che lo ha invitato"
  on public.user_data for select
  using (
    exists (
      select 1 from public.shared_access
      where shared_access.owner_user_id = user_data.user_id
      and shared_access.viewer_email = (auth.jwt() ->> 'email')
    )
  );
