import { addDays, dayDiff, fromIso } from './orthodox';
import type { CycleStage } from './supabase';

export type Hormone = 'estrogen' | 'progesterone' | 'testosterone' | 'lh' | 'fsh' | 'hcg';
export const HORMONE_META: Record<Hormone, { label: string; color: string }> = {
  estrogen: { label: 'Estrogen', color: '#ff5fb0' },
  progesterone: { label: 'Progesterone', color: '#9b6cff' },
  testosterone: { label: 'Testosterone', color: '#f5d442' },
  lh: { label: 'LH', color: '#ff6a55' },
  fsh: { label: 'FSH', color: '#5ee08f' },
  hcg: { label: 'hCG', color: '#38bdf8' },
};

export const PHASE_COLORS: Record<string, string> = {
  Period: '#c0364a',
  Follicular: '#e08a3c',
  Ovulation: '#e2b552',
  Luteal: '#6b6ee0',
  'Trimester 1': '#e08aa8',
  'Trimester 2': '#d96a96',
  'Trimester 3': '#b84a7e',
  'Hormones steady': '#7a8a9a',
  Postpartum: '#d6a67a',
  'Low hormones': '#7a8a9a',
};

export interface CycleModel {
  stage: CycleStage;
  length: number;
  periodLength: number;
  lastStart: Date | null;
  starts: Date[];
}

export interface DayInfo {
  levels: Partial<Record<Hormone, number>>;
  phase: string;
  cycleDay: number | null;
  pregnancyDay: number | null;
}

const g = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const gw = (x: number, m: number, s: number, len: number) => g(x, m, s) + g(x + len, m, s) + g(x - len, m, s);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export const HORMONES_FOR: Record<CycleStage, Hormone[]> = {
  regular: ['progesterone', 'estrogen', 'fsh', 'testosterone', 'lh'],
  perimenopause: ['progesterone', 'estrogen', 'fsh', 'testosterone', 'lh'],
  contraception: ['progesterone', 'estrogen', 'fsh', 'lh'],
  pregnant: ['progesterone', 'estrogen', 'hcg', 'testosterone'],
  postpartum: ['progesterone', 'estrogen', 'fsh', 'lh'],
  menopause: ['estrogen', 'progesterone', 'fsh', 'lh'],
};

// Illustrative, normalized curves based on typical textbook patterns, not measurements.
export function infoFor(model: CycleModel, day: Date): DayInfo {
  const { stage, length: L, periodLength: p, lastStart } = model;
  const ov = L - 14;

  if (stage === 'pregnant') {
    if (!lastStart) return { levels: {}, phase: 'Trimester 1', cycleDay: null, pregnancyDay: null };
    const dpg = dayDiff(day, lastStart);
    const w = dpg / 7;
    return {
      levels: {
        estrogen: clamp(0.15 + (0.85 * w) / 36),
        progesterone: clamp(0.1 + (0.9 * w) / 32),
        hcg: clamp(0.05 + 0.95 * g(w, 10, 3.5) + (w > 14 ? 0.12 : 0)),
        testosterone: clamp(0.2 + (0.3 * w) / 40),
      },
      phase: w < 14 ? 'Trimester 1' : w < 28 ? 'Trimester 2' : 'Trimester 3',
      cycleDay: null,
      pregnancyDay: dpg,
    };
  }

  if (stage === 'menopause') return { levels: { estrogen: 0.07, progesterone: 0.03, fsh: 0.75, lh: 0.5 }, phase: 'Low hormones', cycleDay: null, pregnancyDay: null };
  if (stage === 'postpartum') return { levels: { estrogen: 0.08, progesterone: 0.04, fsh: 0.1, lh: 0.08 }, phase: 'Postpartum', cycleDay: null, pregnancyDay: null };

  const cd = lastStart ? (((dayDiff(day, lastStart) % L) + L) % L) + 1 : null;
  const x = cd ?? 1;

  if (stage === 'contraception') {
    return {
      levels: { estrogen: 0.16, progesterone: 0.1, fsh: 0.1, lh: 0.08 },
      phase: cd !== null && cd <= p ? 'Period' : 'Hormones steady',
      cycleDay: cd,
      pregnancyDay: null,
    };
  }

  const k = stage === 'perimenopause' ? { e: 0.8, pr: 0.55 } : { e: 1, pr: 1 };
  const levels = {
    estrogen: clamp((0.12 + 0.75 * gw(x, ov - 1, 2.2, L) + 0.45 * gw(x, ov + 7, 3.2, L)) * k.e),
    progesterone: clamp((0.04 + 0.9 * gw(x, ov + 7, 3.5, L)) * k.pr),
    testosterone: clamp(0.2 + 0.3 * gw(x, ov - 0.5, 2.5, L)),
    lh: clamp(0.08 + 0.92 * gw(x, ov - 0.5, 0.8, L)),
    fsh: clamp(0.12 + 0.4 * gw(x, 3, 3, L) + 0.35 * gw(x, ov - 0.5, 1, L)),
  };
  const phase = cd === null ? 'Follicular' : cd <= p ? 'Period' : cd < ov - 1 ? 'Follicular' : cd <= ov + 1 ? 'Ovulation' : 'Luteal';
  return { levels, phase, cycleDay: cd, pregnancyDay: null };
}

export function nextPeriod(model: CycleModel, today: Date): Date | null {
  if (!model.lastStart || model.stage === 'pregnant' || model.stage === 'menopause') return null;
  let d = addDays(model.lastStart, model.length);
  while (dayDiff(d, today) < 0) d = addDays(d, model.length);
  return d;
}

export function fertileWindow(model: CycleModel, today: Date): [Date, Date] | null {
  if (model.stage !== 'regular' || !model.lastStart) return null;
  const ov = model.length - 14;
  let start = addDays(model.lastStart, ov - 5);
  while (dayDiff(addDays(start, 6), today) < 0) start = addDays(start, model.length);
  return [start, addDays(start, 6)];
}

export function modelFrom(
  stage: CycleStage,
  entries: { kind: string; day: string }[],
  overrides: { cycle_length: number | null; period_length: number | null },
): CycleModel {
  const starts = entries.filter((e) => e.kind === 'period_start').map((e) => fromIso(e.day)).sort((a, b) => a.getTime() - b.getTime());
  const gaps = starts.slice(1).map((d, i) => dayDiff(d, starts[i])).filter((v) => v >= 15 && v <= 60).slice(-6);
  const autoLen = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;

  const ends = entries.filter((e) => e.kind === 'period_end').map((e) => fromIso(e.day));
  const lens = starts
    .map((s) => ends.find((e) => dayDiff(e, s) >= 0 && dayDiff(e, s) <= 10))
    .map((e, i) => (e ? dayDiff(e, starts[i]) + 1 : null))
    .filter((v): v is number => v !== null);
  const autoPeriod = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 5;

  return {
    stage,
    length: overrides.cycle_length ?? autoLen,
    periodLength: overrides.period_length ?? autoPeriod,
    lastStart: starts.length ? starts[starts.length - 1] : null,
    starts,
  };
}
