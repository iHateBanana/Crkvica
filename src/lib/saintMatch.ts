// Decides whether a Wikipedia page really is the saint named on the calendar. A wrong picture is worse than none, so
// anything uncertain is rejected and the app keeps its plain cross. Loose search results included a different Gregory,
// churches named after the saint, and a painting of a pagan myth.

const words = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3);

const HONORIFIC = new Set(['holy', 'saint', 'our', 'ven', 'venerable', 'rep', 'righteous', 'blv', 'blessed', 'great', 'new', 'greatmartyr', 'the', 'and', 'for', 'with', 'from']);
const ROLE = new Set(['apostle', 'prophet', 'martyr', 'hieromartyr', 'bishop', 'archbishop', 'patriarch', 'metropolitan', 'confessor', 'monk', 'nun', 'abbot', 'virgin', 'prince', 'princess', 'king', 'queen', 'emperor', 'empress', 'tsar', 'evangelist', 'archangel', 'father', 'mother', 'equal']);
const OF = 'of';

// Calendar entries that aren't one identifiable person: groups, feasts and days of the year.
const NOT_ONE_PERSON = /\b(martyrs|apostles|fathers|mothers|saints|sts|youths|brothers|sisters|companions|others|sunday|saturday|week|forefeast|afterfeast|leavetaking|synaxis|feast|fast|translation|finding|icon)\b|&/i;

// The part of "St John the Merciful, Patriarch of Alexandria" that names the person, as lowercase words.
export function nameWords(name: string): { name: string[]; roles: string[] } {
  const head = name.replace(/\([^)]*\)/g, ' ').split(/,| - |;/)[0];
  const all = words(head).filter((w) => w !== OF && !HONORIFIC.has(w));
  return { name: all.filter((w) => !ROLE.has(w)), roles: all.filter((w) => ROLE.has(w)) };
}

export const isSinglePerson = (name: string) => !NOT_ONE_PERSON.test(name) && nameWords(name).name.length > 0;

const BUILDING_OR_OTHER = /\b(church|cathedral|monastery|basilica|chapel|abbey|parish|school|college|university|city|town|village|municipality|district|film|album|novel|disambiguation|list|feast|day|icon)\b/i;
const HOLY_PERSON = /\b(saint|martyr|hieromartyr|bishop|archbishop|monk|nun|apostle|prophet|patriarch|hermit|ascetic|stylite|theologian|evangelist|priest|abbot|confessor|wonderworker)\b/i;
const BAD_IMAGE = /\.svg|\b(map|coat|arms|flag|seal|stamp|coin|church|cathedral|monastery|basilica|chapel|tomb|grave|relics?|building|logo)\b/i;

export interface WikiPage { title: string; description?: string; file?: string }

export function isSamePerson(calendarName: string, page: WikiPage): boolean {
  if (!isSinglePerson(calendarName) || !page.description) return false;
  const { name, roles } = nameWords(calendarName);
  const title = words(page.title);
  if (!name.every((w) => title.includes(w))) return false;
  if (BUILDING_OR_OTHER.test(page.title) || BUILDING_OR_OTHER.test(page.description)) return false;
  if (!HOLY_PERSON.test(page.description)) return false;
  // A lone first name ("Gregory", "Philip") is too common to trust unless the page adds nothing else, or agrees on the role.
  if (name.length === 1) {
    const extra = title.filter((w) => w !== OF && !name.includes(w) && !HONORIFIC.has(w));
    const about = words(`${page.title} ${page.description}`);
    if (extra.length > 0 && !roles.some((r) => about.includes(r))) return false;
    if (extra.some((w) => !ROLE.has(w))) return false;
  }
  return true;
}

export const isCredibleMatch = (calendarName: string, page: WikiPage): boolean =>
  !!page.file && !BAD_IMAGE.test(page.file.replace(/_/g, ' ')) && isSamePerson(calendarName, page);

// The commemoration to illustrate: the main one, unless it's a day rather than a person ("23rd Sunday after Pentecost").
export function imageSubject(mainName: string | undefined, saints: string[]): string | undefined {
  if (!mainName) return undefined;
  if (!/\b(sunday|saturday|week|forefeast|afterfeast|leavetaking)\b/i.test(mainName)) return mainName;
  return saints.find((s) => s !== mainName && !/\b(sunday|saturday|week|forefeast|afterfeast|leavetaking)\b/i.test(s));
}
