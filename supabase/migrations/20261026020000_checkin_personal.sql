alter table public.checkins
  add column if not exists energy int check (energy between 1 and 5),
  add column if not exists gratitude text,
  add column if not exists intention text,
  add column if not exists pray_for text,
  add column if not exists reflection text;
