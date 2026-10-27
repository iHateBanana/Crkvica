alter table public.profiles
  add column if not exists cycle_stage text not null default 'regular'
    check (cycle_stage in ('regular', 'contraception', 'pregnant', 'postpartum', 'perimenopause', 'menopause')),
  add column if not exists cycle_length int check (cycle_length between 20 and 45),
  add column if not exists period_length int check (period_length between 2 and 10);

alter table public.cycle_entries drop constraint if exists cycle_entries_kind_check;
alter table public.cycle_entries
  add constraint cycle_entries_kind_check check (kind in ('period_start', 'period_end', 'note', 'log')),
  add column if not exists flow text check (flow in ('spotting', 'light', 'medium', 'heavy')),
  add column if not exists symptoms text[] not null default '{}';
