-- Daily soul check-ins (mood + what you did today), one per user per day.
create table public.checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  mood text,
  deeds text[] not null default '{}',
  created_at timestamptz default now(),
  primary key (user_id, day)
);

alter table public.checkins enable row level security;
create policy "own checkins" on public.checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
