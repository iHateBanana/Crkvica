alter table public.profiles
  add column if not exists language text check (language in ('en', 'sr', 'sr-Latn')) default 'en',
  add column if not exists show_slava boolean default false,
  add column if not exists slava text;
