import { collectStreakLogs } from './streak';
import { supabase } from './supabase';

export interface PrayerRule { id: string; title: string }
export interface PrayerLog { rule_id: string; day: string }

// Must stay at or below the server's row limit (max_rows, 1000 by default).
const PAGE = 500;

// rule_id breaks ties so that rows can't move between pages.
const logsPage = (offset: number) =>
  supabase.from('prayer_logs').select('rule_id, day').order('day', { ascending: false }).order('rule_id').range(offset, offset + PAGE - 1);

export async function loadPrayerData(requireAll: boolean): Promise<{ rules: PrayerRule[]; logs: PrayerLog[] }> {
  const [r, l] = await Promise.all([
    supabase.from('prayer_rules').select('id, title').order('sort').order('created_at'),
    logsPage(0),
  ]);
  const rules = (r.data ?? []) as PrayerRule[];
  const logs = await collectStreakLogs(
    rules.map((x) => x.id),
    requireAll,
    (l.data ?? []) as PrayerLog[],
    async (offset) => (await logsPage(offset)).data as PrayerLog[] | null,
    PAGE,
  );
  return { rules, logs };
}
