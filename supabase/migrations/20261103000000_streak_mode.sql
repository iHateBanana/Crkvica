alter table public.profiles
  add column if not exists streak_requires_all boolean not null default false;
