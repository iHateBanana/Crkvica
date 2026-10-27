create table public.fast_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('weekday', 'period')),
  key text not null,
  level text not null check (level in ('none', 'wine-oil', 'fish', 'strict')),
  primary key (user_id, kind, key)
);

alter table public.fast_rules enable row level security;
create policy "own fast rules" on public.fast_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
