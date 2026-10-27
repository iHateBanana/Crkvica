export type CalendarStyle = 'new' | 'old';

const DAY = 86400000;

// Dates are handled at local noon, so a DST change (23 or 25 hour day) can never move a date.
export const makeDate = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);
export const addDays = (d: Date, n: number) => makeDate(d.getFullYear(), d.getMonth() + 1, d.getDate() + n);
export const dayDiff = (a: Date, b: Date) =>
  Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / DAY);
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = (s: string) => makeDate(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10));

// The Julian calendar runs 13 days behind the Gregorian one from 1 Mar 1900 to 28 Feb 2100 (Julian dates).
// This is the only place the offset is applied.
const JULIAN_OFFSET = 13;

// Julian calendar date (as a Date holding the Julian year/month/day) of a civil Gregorian date.
export const julianOf = (d: Date) => addDays(d, -JULIAN_OFFSET);

// Civil Gregorian date of a Julian calendar date.
export const julianToCivil = (y: number, m: number, d: number) => addDays(makeDate(y, m, d), JULIAN_OFFSET);

// Orthodox Pascha (Meeus Julian algorithm) converted to the civil Gregorian date.
export function pascha(year: number): Date {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return julianToCivil(year, month, day);
}

// On the Old (Julian) calendar fixed feasts fall on the same Julian date number, 13 days later in civil time.
export const liturgicalDate = (d: Date, style: CalendarStyle) => (style === 'old' ? julianOf(d) : d);

const STORY: Record<string, string> = {
  'Circumcision of the Lord / St. Basil the Great': 'Eight days after His birth, Christ was circumcised and given the name Jesus. The same day the Church honors St. Basil the Great (c. 330-379), Archbishop of Caesarea in Cappadocia. Born to a family of saints, he studied in Athens, gave away his wealth and became a monk. As bishop he built a vast complex for the poor and sick, defended the Nicene faith against the Arians, and wrote the Divine Liturgy that bears his name and is served on this day.',
  'Three Hierarchs': 'Basil the Great, Gregory the Theologian and John Chrysostom lived in the fourth century and were each gifted in learning and prayer. In the eleventh century, people at Constantinople quarrelled over which was greatest. The three appeared to Bishop John of Euchaita in a dream and said they were one in God. The Church then set a single feast for them on January 30 and made them patrons of education.',
  'Great Martyr George': 'George was a young Roman officer from Cappadocia in the early fourth century. When Emperor Diocletian began persecuting Christians, George gave away his wealth, confessed Christ before the emperor and endured torture before being beheaded. The Church calls him the Victorious and the Trophy-bearer, and he is invoked as a defender of the weak.',
  'Equals-to-the-Apostles Constantine & Helen': 'Constantine (c. 272-337) saw a cross of light in the sky before a decisive battle and became the first Christian emperor, ending the persecutions. He summoned the First Ecumenical Council at Nicaea in 325. His mother Helen travelled to Jerusalem in her old age and, according to tradition, found the True Cross. Both are called Equal-to-the-Apostles.',
  'Holy Apostles Peter & Paul': 'Peter was a Galilean fisherman who first confessed Christ as Son of God. Paul was a persecutor of the Church who was called by Christ on the road to Damascus and carried the Gospel to the Gentiles. Tradition says both were martyred in Rome under Nero around 64-67, Peter crucified and Paul beheaded. The Apostles\' Fast ends with this feast.',
  'Nativity of St. John the Baptist': 'John was born six months before Christ to the aged priest Zachariah and Elizabeth, after an angel promised a son. His father, struck mute for doubting, regained his speech when he wrote "His name is John." John went on to prepare the way of the Lord in the wilderness.',
  'Beheading of St. John the Baptist': 'John rebuked King Herod for taking his brother\'s wife, Herodias. Herod imprisoned him, and at a banquet, urged by Herodias, her daughter asked for his head on a platter. John thus became a martyr for the truth. Orthodox Christians keep this day as a strict fast.',
  'Synaxis of St. John the Baptist': 'The day after Theophany the Church gathers to honor John the Baptist, who baptized Christ in the Jordan. He is called the Forerunner and is among the most honored saints in the Church after the Theotokos.',
  'St. Nicholas the Wonderworker': 'Nicholas (c. 270-343) was Bishop of Myra in Lycia. Tradition tells that he secretly gave gold to a poor man so his three daughters would not be sold, and that he saved three innocent men from execution. He suffered for the faith under Diocletian and was present at the Council of Nicaea. He is loved as a protector of the poor, of travelers and of sailors.',
  'Great Martyr Demetrios': 'Demetrios was a Roman officer in Thessalonica around 306. He openly preached Christ and was imprisoned and speared on the order of Emperor Maximian. His tomb became a place of healing, and he has long been the protector of Thessalonica and a patron of soldiers.',
  'Synaxis of the Archangel Michael': 'Michael is the chief of the angelic hosts, whose name means "Who is like God?" In Scripture and Tradition he leads the heavenly armies against the powers of darkness. Today we honor him and all the bodiless powers: Gabriel, Raphael, Uriel and the rest of the angels.',
  'Holy Apostle Philip': 'Philip, one of the Twelve, was called by Christ in Galilee and brought Nathanael to Him. After Pentecost he preached the Gospel and was martyred in Hierapolis. The Nativity Fast begins the day after this feast, which is why it is known as the Philip\'s Fast.',
};

export interface Feast { name: string; rank: 'great' | 'major' | 'minor'; red?: boolean; about?: string; story?: string; }

// Red-letter days: the Great Feasts (and Pascha), plus a few other major days marked red in many printed calendars.
const RED_EXTRA = new Set([
  'Circumcision of the Lord / St. Basil the Great',
  'Nativity of St. John the Baptist',
  'Holy Apostles Peter & Paul',
  'Beheading of St. John the Baptist',
  'Synaxis of St. John the Baptist',
  'Protection of the Theotokos',
]);

const ABOUT: Record<string, string> = {
  'Theophany (Baptism of the Lord)': 'Christ is baptized in the Jordan and the Holy Trinity is revealed. Waters are blessed in church.',
  'Meeting of the Lord': 'Forty days after Nativity, Christ is brought to the Temple and received by righteous Simeon and Anna.',
  'Annunciation of the Theotokos': 'The Archangel Gabriel announces to the Virgin Mary that she will bear the Son of God.',
  'Transfiguration of the Lord': 'On Mount Tabor Christ shows His divine glory to Peter, James and John.',
  'Dormition of the Theotokos': 'The falling asleep of the Virgin Mary, and her being taken up into heaven.',
  'Nativity of the Theotokos': 'The birth of the Virgin Mary to Joachim and Anna.',
  'Exaltation of the Holy Cross': 'We honor the Life-giving Cross found by St. Helen in Jerusalem. A strict day of fasting.',
  'Entry of the Theotokos into the Temple': 'The young Virgin Mary is brought to the Temple to be raised in prayer.',
  'Nativity of the Lord': 'The birth of Christ in Bethlehem. God became man.',
  'Palm Sunday': 'Christ enters Jerusalem as King, and Holy Week begins.',
  'Holy Pascha - Resurrection of the Lord': 'The Feast of Feasts: Christ is risen from the dead, trampling down death by death.',
  'Ascension of the Lord': 'Forty days after Pascha, Christ ascends in glory to the Father.',
  'Pentecost': 'The Holy Spirit descends on the Apostles. The birthday of the Church.',
  'Holy Apostles Peter & Paul': 'The two chief Apostles, honored together. This ends the Apostles\' Fast.',
  'St. Nicholas the Wonderworker': 'The beloved Bishop of Myra, defender of the faith and helper of the poor.',
  'Great Martyr Demetrios': 'A Christian officer of Thessalonica martyred around 306. Patron of soldiers and of Thessalonica.',
  'Great Martyr George': 'A Roman soldier who confessed Christ before Emperor Diocletian. The Trophy-bearer.',
  'Protection of the Theotokos': 'The Virgin Mary appears at Blachernae and spreads her veil over the faithful.',
  'Synaxis of the Archangel Michael': 'We honor the Archangel Michael and all the angelic hosts.',
  'Three Hierarchs': 'Saints Basil the Great, Gregory the Theologian and John Chrysostom, teachers of the Church.',
  'Equals-to-the-Apostles Constantine & Helen': 'The Emperor and his mother, who found the True Cross.',
  'Beheading of St. John the Baptist': 'The Forerunner is martyred for speaking the truth. A strict fast day.',
  'Nativity of St. John the Baptist': 'The birth of the Forerunner to Zachariah and Elizabeth.',
};

const FIXED: Record<string, Feast> = {
  '01-01': { name: 'Circumcision of the Lord / St. Basil the Great', rank: 'major' },
  '01-06': { name: 'Theophany (Baptism of the Lord)', rank: 'great' },
  '01-07': { name: 'Synaxis of St. John the Baptist', rank: 'major' },
  '01-30': { name: 'Three Hierarchs', rank: 'minor' },
  '02-02': { name: 'Meeting of the Lord', rank: 'great' },
  '03-25': { name: 'Annunciation of the Theotokos', rank: 'great' },
  '04-23': { name: 'Great Martyr George', rank: 'minor' },
  '05-21': { name: 'Equals-to-the-Apostles Constantine & Helen', rank: 'minor' },
  '06-24': { name: 'Nativity of St. John the Baptist', rank: 'major' },
  '06-29': { name: 'Holy Apostles Peter & Paul', rank: 'major' },
  '08-06': { name: 'Transfiguration of the Lord', rank: 'great' },
  '08-15': { name: 'Dormition of the Theotokos', rank: 'great' },
  '08-29': { name: 'Beheading of St. John the Baptist', rank: 'major' },
  '09-01': { name: 'Church New Year', rank: 'minor' },
  '09-08': { name: 'Nativity of the Theotokos', rank: 'great' },
  '09-14': { name: 'Exaltation of the Holy Cross', rank: 'great' },
  '10-01': { name: 'Protection of the Theotokos', rank: 'minor' },
  '10-26': { name: 'Great Martyr Demetrios', rank: 'minor' },
  '11-08': { name: 'Synaxis of the Archangel Michael', rank: 'major' },
  '11-14': { name: 'Holy Apostle Philip', rank: 'minor' },
  '11-21': { name: 'Entry of the Theotokos into the Temple', rank: 'great' },
  '12-06': { name: 'St. Nicholas the Wonderworker', rank: 'major' },
  '12-25': { name: 'Nativity of the Lord', rank: 'great' },
  '12-26': { name: 'Synaxis of the Theotokos', rank: 'minor' },
};

// Offsets are days from Pascha.
const MOVABLE: [number, Feast][] = [
  [-70, { name: 'Sunday of the Publican & Pharisee', rank: 'minor' }],
  [-48, { name: 'Clean Monday - Beginning of Great Lent', rank: 'major' }],
  [-42, { name: 'Sunday of Orthodoxy', rank: 'major' }],
  [-8, { name: 'Lazarus Saturday', rank: 'major' }],
  [-7, { name: 'Palm Sunday', rank: 'great' }],
  [-3, { name: 'Holy Thursday', rank: 'major' }],
  [-2, { name: 'Holy Friday', rank: 'major' }],
  [-1, { name: 'Holy Saturday', rank: 'major' }],
  [0, { name: 'Holy Pascha - Resurrection of the Lord', rank: 'great' }],
  [7, { name: 'Thomas Sunday', rank: 'minor' }],
  [24, { name: 'Mid-Pentecost', rank: 'minor' }],
  [39, { name: 'Ascension of the Lord', rank: 'great' }],
  [49, { name: 'Pentecost', rank: 'great' }],
  [56, { name: 'Sunday of All Saints', rank: 'major' }],
];

export function feastsOn(d: Date, style: CalendarStyle): Feast[] {
  const off = dayDiff(d, pascha(d.getFullYear()));
  const out = MOVABLE.filter(([o]) => o === off).map(([, f]) => f);
  const l = liturgicalDate(d, style);
  const fixed = FIXED[`${String(l.getMonth() + 1).padStart(2, '0')}-${String(l.getDate()).padStart(2, '0')}`];
  if (fixed) out.push(fixed);
  return out.map((f) => ({ ...f, red: f.rank === 'great' || RED_EXTRA.has(f.name), about: ABOUT[f.name], story: STORY[f.name] }));
}

export const isRedLetter = (d: Date, style: CalendarStyle) => feastsOn(d, style).some((f) => f.red);

// Next red-letter feasts after `from` (excludes ordinary Sundays).
export function upcomingRedLetter(from: Date, style: CalendarStyle, count = 6) {
  const out: { date: Date; feast: Feast }[] = [];
  for (let i = 0; i < 400 && out.length < count; i++) {
    const d = addDays(from, i);
    const f = feastsOn(d, style).find((x) => x.red);
    if (f) out.push({ date: d, feast: f });
  }
  return out;
}

export type FastLevel = 'none' | 'strict' | 'wine-oil' | 'fish';
export interface Fast { level: FastLevel; label: string; detail: string; }

export const DETAIL: Record<FastLevel, string> = {
  none: 'All foods permitted.',
  strict: 'Strict fast: no meat, dairy, eggs, fish, oil or wine.',
  'wine-oil': 'Wine and oil permitted; no meat, dairy, eggs or fish.',
  fish: 'Fish, wine and oil permitted; no meat, dairy or eggs.',
};

// General reference only; practice varies by jurisdiction and spiritual father.
export function fastOn(d: Date, style: CalendarStyle): Fast {
  const y = d.getFullYear();
  const p = pascha(y);
  const off = dayDiff(d, p);
  const l = liturgicalDate(d, style);
  const m = l.getMonth() + 1, day = l.getDate();
  const dow = d.getDay();
  const mk = (level: FastLevel, label: string): Fast => ({ level, label, detail: DETAIL[level] });
  const weekend = dow === 0 || dow === 6;
  const wedFri = dow === 3 || dow === 5;

  // Fast-free periods
  if (off >= 0 && off <= 6) return mk('none', 'Bright Week (fast-free)');
  if (off >= 49 && off <= 55) return mk('none', 'Trinity Week (fast-free)');
  if (off >= -70 && off <= -64) return mk('none', 'Publican & Pharisee week (fast-free)');
  if ((m === 12 && day >= 25) || (m === 1 && day <= 4)) return mk('none', 'Afterfeast of the Nativity (fast-free)');

  // Great Lent & Holy Week
  if (off >= -48 && off <= -1) {
    if (off === -2) return mk('strict', 'Holy Friday');
    if (off === -1) return mk('strict', 'Holy Saturday');
    if (m === 3 && day === 25) return mk('fish', 'Great Lent - Annunciation');
    if (off === -7) return mk('fish', 'Great Lent - Palm Sunday');
    if (off === -8) return mk('fish', 'Great Lent - Lazarus Saturday (fish roe)');
    if (weekend) return mk('wine-oil', 'Great Lent');
    return mk('strict', 'Great Lent');
  }

  // Dormition Fast (Aug 1-14)
  if (m === 8 && day <= 14) {
    if (day === 6) return mk('fish', 'Dormition Fast - Transfiguration');
    return mk(weekend || dow === 2 || dow === 4 ? 'wine-oil' : 'strict', 'Dormition Fast');
  }

  // Nativity Fast (Nov 15 - Dec 24)
  if ((m === 11 && day >= 15) || (m === 12 && day <= 24)) {
    if (m === 11 && day === 21) return mk('fish', 'Nativity Fast - Entry of the Theotokos');
    if (m === 12 && day === 6) return mk('fish', 'Nativity Fast - St. Nicholas');
    if (m === 12 && day >= 20) return mk('wine-oil', 'Nativity Fast (forefeast)');
    return mk(wedFri ? 'wine-oil' : 'fish', 'Nativity Fast');
  }

  // Apostles' Fast: Monday after All Saints until the eve of Peter & Paul
  const start = addDays(p, 57);
  const end = style === 'old' ? julianToCivil(y, 6, 28) : makeDate(y, 6, 28);
  if (dayDiff(d, start) >= 0 && dayDiff(d, end) <= 0) {
    if (m === 6 && day === 24) return mk('fish', "Apostles' Fast - Nativity of St. John the Baptist");
    return mk(wedFri ? 'wine-oil' : 'fish', "Apostles' Fast");
  }

  if (m === 8 && day === 29) return mk('strict', 'Beheading of St. John the Baptist');
  if (m === 9 && day === 14) return mk('wine-oil', 'Exaltation of the Cross');
  if (m === 1 && day === 5) return mk('strict', 'Eve of Theophany');

  // Great feasts falling on Wednesday or Friday outside a fast: fish is permitted
  if (wedFri && ((m === 9 && day === 8) || (m === 2 && day === 2))) return mk('fish', 'Great feast on a fast day');
  if (wedFri) return mk('wine-oil', dow === 3 ? 'Wednesday fast' : 'Friday fast');
  return mk('none', 'No fast');
}

// Everything the app knows locally about a civil date. Every screen goes through this, so the
// Julian date, feasts and fast can never disagree. Saints and readings are added by useDayInfo (orthocal.ts).
export function getDayInfo(d: Date, style: CalendarStyle) {
  return { date: d, style, julian: julianOf(d), liturgicalDate: liturgicalDate(d, style), feasts: feastsOn(d, style), fast: fastOn(d, style) };
}

const STOP = new Set(['great', 'holy', 'saint', 'martyr', 'greatmartyr', 'apostle', 'apostles', 'venerable', 'father', 'fathers', 'hieromartyr', 'the', 'and', 'of']);
const stems = (s: string) =>
  new Set(
    s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 5)),
  );

// Orthocal commemorations that are not already shown as a main feast (matched loosely: the names differ between sources).
export function remainingCommemorations(saints: string[], shown: string[]): string[] {
  const left = [...saints];
  for (const name of shown) {
    const a = stems(name);
    if (!a.size) continue;
    const i = left.findIndex((s) => {
      const b = stems(s);
      if (!b.size) return false;
      let shared = 0;
      a.forEach((w) => { if (b.has(w)) shared++; });
      return shared >= Math.min(2, a.size, b.size);
    });
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

