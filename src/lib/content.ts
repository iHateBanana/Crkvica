import { T, translate } from './i18n';
import { Fast, Feast } from './orthodox';

export interface Quote { text: string; by: string; }

export const QUOTES: Quote[] = [
  { text: 'Acquire the Spirit of peace, and thousands around you will be saved.', by: 'St. Seraphim of Sarov' },
  { text: 'God became man so that man might become god.', by: 'St. Athanasius the Great' },
  { text: 'Keep your mind in hell, and despair not.', by: 'St. Silouan the Athonite' },
  { text: 'Be at peace with your own soul, then heaven and earth will be at peace with you.', by: 'St. Isaac the Syrian' },
  { text: 'O Lord and Master of my life, take from me the spirit of sloth, despondency, lust of power and idle talk. But give rather the spirit of chastity, humility, patience and love to thy servant.', by: 'Prayer of St. Ephrem' },
  { text: 'The bread you hold back belongs to the hungry.', by: 'St. Basil the Great' },
  { text: 'Let us begin again, for until now we have done nothing.', by: 'St. Anthony the Great (attributed)' },
  { text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.', by: 'The Jesus Prayer' },
  { text: 'Christ is risen! Indeed He is risen!', by: 'Paschal greeting' },
  { text: 'Glory to God for all things.', by: 'St. John Chrysostom (attributed)' },
];

export const quoteFor = (d: Date) =>
  QUOTES[Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) % QUOTES.length];

// One chapter of the New Testament per day, restarting each year (260 chapters).
const NT: [string, number][] = [
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28], ['Romans', 16],
  ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6], ['Ephesians', 6], ['Philippians', 4],
  ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4],
  ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3],
  ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1], ['Revelation', 22],
];

export function readingFor(d: Date): string {
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start.getTime()) / 86400000);
  let i = (doy - 1) % 260;
  for (const [book, n] of NT) {
    if (i < n) return `${book} ${i + 1}`;
    i -= n;
  }
  return 'Matthew 1';
}

export const MOODS = ['Peaceful', 'Grateful', 'Joyful', 'Hopeful', 'Tired', 'Anxious', 'Distracted', 'Sorrowful', 'Tempted'];
export const DEEDS = ['Prayed', 'Went to church', 'Read Scripture', 'Fasted', 'Confessed', 'Gave alms', 'Forgave someone', 'Lit a candle'];

export interface Todo { id: string; text: string; }

export function todosFor(d: Date, feasts: Feast[], fast: Fast, t: T = (k, v) => translate('en', k, v)): Todo[] {
  const out: Todo[] = [
    { id: 'morning', text: t('Say morning prayers') },
    { id: 'read', text: t('Read {ref}', { ref: readingFor(d) }) },
  ];
  const red = feasts.find((f) => f.red);
  if (red) out.push({ id: 'litu', text: t('Attend Divine Liturgy for {feast}', { feast: t(red.name) }) });
  else if (d.getDay() === 0) out.push({ id: 'litu', text: t('Attend Sunday Divine Liturgy') });
  if (fast.level !== 'none') out.push({ id: 'fast', text: t('Keep the fast: {fast}', { fast: t(fast.label) }) });
  if (d.getDay() === 3) out.push({ id: 'wed', text: t('Wednesday: remember the betrayal of Christ') });
  if (d.getDay() === 5) out.push({ id: 'fri', text: t('Friday: remember the Cross') });
  out.push({ id: 'alms', text: t('Do one act of kindness or almsgiving') });
  out.push({ id: 'evening', text: t('Say evening prayers and examine your day') });
  return out;
}
