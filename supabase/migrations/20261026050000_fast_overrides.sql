create table public.fast_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  level text not null check (level in ('none', 'wine-oil', 'fish', 'strict')),
  created_at timestamptz default now(),
  primary key (user_id, day)
);

alter table public.fast_overrides enable row level security;
create policy "own fast overrides" on public.fast_overrides for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
