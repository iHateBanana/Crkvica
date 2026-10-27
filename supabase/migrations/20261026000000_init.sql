-- Run in the Supabase SQL editor.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender text check (gender in ('male', 'female', 'unspecified')) default 'unspecified',
  calendar_style text check (calendar_style in ('new', 'old')) default 'new',
  cycle_tracking_enabled boolean default false,
  created_at timestamptz default now()
);

create table public.prayer_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  sort int default 0,
  created_at timestamptz default now()
);

create table public.prayer_logs (
  rule_id uuid not null references public.prayer_rules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (rule_id, day)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  title text,
  body text not null,
  created_at timestamptz default now()
);

create table public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('period_start', 'period_end', 'note')),
  day date not null,
  note text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.prayer_rules enable row level security;
alter table public.prayer_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.cycle_entries enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own rules" on public.prayer_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on public.prayer_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own journal" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cycle" on public.cycle_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile automatically on sign-up (gender/name passed as sign-up metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gender)
  values (new.id, new.raw_user_meta_data->>'display_name', coalesce(new.raw_user_meta_data->>'gender', 'unspecified'));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
