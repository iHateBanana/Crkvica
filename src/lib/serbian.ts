const CYR: Record<string, string> = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I', Ј: 'J', К: 'K', Л: 'L', Љ: 'Lj',
  М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č',
  Џ: 'Dž', Ш: 'Š',
};

const isUpperCyrillic = (ch: string | undefined) => !!ch && !!CYR[ch];

// Serbian Cyrillic to Latin. A capital digraph inside an all-caps word stays all caps (ЉУБА -> LJUBA).
export function toLatin(s: string): string {
  const chars = Array.from(s);
  let out = '';
  chars.forEach((ch, i) => {
    const up = ch.toUpperCase();
    const m = CYR[up];
    if (!m) { out += ch; return; }
    if (ch !== up) { out += m.toLowerCase(); return; }
    out += m.length > 1 && (isUpperCyrillic(chars[i + 1]) || isUpperCyrillic(chars[i - 1])) ? m.toUpperCase() : m;
  });
  return out;
}

// Case-, script- and diacritic-insensitive key for names: "Ђурђе", "Đurđe" and "djurdje" all match.
export function normalizeName(s: string): string {
  return toLatin(s.normalize('NFC').trim().toLowerCase())
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}
