-- Row Level Security filters these tables by user_id on every read, and none of them had an index that starts with it.
create index if not exists prayer_logs_user_day_idx on public.prayer_logs (user_id, day desc);
create index if not exists prayer_rules_user_sort_idx on public.prayer_rules (user_id, sort, created_at);
create index if not exists journal_entries_user_day_idx on public.journal_entries (user_id, day desc, created_at desc);
