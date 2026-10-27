import { addDays, dayDiff, makeDate } from './orthodox';

export interface Slava {
  id: string;
  en: string;
  sr: string; // Serbian (Cyrillic)
  julian: [number, number]; // [month, day] on the Julian (Old) calendar
  names: string[]; // name days (Cyrillic)
}

// Common Serbian slavas and the names celebrated on them. Verify with your parish.
export const SLAVAS: Slava[] = [
  { id: 'basil', en: 'St. Basil the Great (Vasiljevdan)', sr: 'Свети Василије Велики (Васиљевдан)', julian: [1, 1], names: ['Василије', 'Васа', 'Васо', 'Васиљка'] },
  { id: 'jovan', en: 'St. John the Baptist (Jovanjdan)', sr: 'Свети Јован Крститељ (Јовањдан)', julian: [1, 7], names: ['Јован', 'Јована', 'Јованка', 'Иван', 'Ивана', 'Јово'] },
  { id: 'sava', en: 'St. Sava (Savindan)', sr: 'Свети Сава (Савиндан)', julian: [1, 14], names: ['Сава', 'Савка', 'Саво', 'Савина'] },
  { id: 'atanasije', en: 'St. Athanasius the Great', sr: 'Свети Атанасије Велики', julian: [1, 18], names: ['Атанасије', 'Танасије', 'Таса'] },
  { id: 'grigorije', en: 'St. Gregory the Theologian', sr: 'Свети Григорије Богослов', julian: [1, 25], names: ['Григорије', 'Грга', 'Гргур'] },
  { id: 'trifun', en: 'St. Tryphon (Trifundan)', sr: 'Свети Трифун (Трифундан)', julian: [2, 1], names: ['Трифун', 'Трипо'] },
  { id: 'simeon', en: 'St. Simeon the Myrrh-streaming', sr: 'Свети Симеон Мироточиви', julian: [2, 13], names: ['Симеон', 'Симо', 'Сима', 'Симонида'] },
  { id: 'djordje', en: 'St. George (Đurđevdan)', sr: 'Свети Георгије (Ђурђевдан)', julian: [4, 23], names: ['Ђорђе', 'Ђурђе', 'Ђурђа', 'Ђурђица', 'Јурица'] },
  { id: 'marko', en: 'St. Mark the Evangelist', sr: 'Свети Марко Јеванђелист', julian: [4, 25], names: ['Марко', 'Марка'] },
  { id: 'vasilije-ostroski', en: 'St. Basil of Ostrog', sr: 'Свети Василије Острошки', julian: [4, 29], names: ['Василије', 'Васа'] },
  { id: 'jelena', en: 'Sts. Constantine & Helen', sr: 'Свети цар Константин и царица Јелена', julian: [5, 21], names: ['Константин', 'Коста', 'Јелена', 'Јелка', 'Лена'] },
  { id: 'vidovdan', en: 'Vidovdan (St. Prince Lazar)', sr: 'Видовдан (Свети кнез Лазар)', julian: [6, 15], names: ['Лазар', 'Лазарица', 'Вид', 'Вида', 'Видоје'] },
  { id: 'petrovdan', en: 'Sts. Peter & Paul (Petrovdan)', sr: 'Свети апостоли Петар и Павле (Петровдан)', julian: [6, 29], names: ['Петар', 'Пера', 'Перо', 'Павле', 'Паја', 'Петра', 'Павла'] },
  { id: 'gavrilo', en: 'Archangel Gabriel', sr: 'Свети архангел Гаврило', julian: [7, 13], names: ['Гаврило', 'Гавро', 'Габријела'] },
  { id: 'ilija', en: 'St. Elijah (Ilindan)', sr: 'Свети пророк Илија (Илиндан)', julian: [7, 20], names: ['Илија', 'Илинка', 'Иле'] },
  { id: 'ana', en: 'St. Anna', sr: 'Света Ана', julian: [7, 25], names: ['Ана', 'Анка', 'Ања', 'Анђа'] },
  { id: 'pantelija', en: 'St. Panteleimon (Pantelejevdan)', sr: 'Свети Пантелејмон (Пантелијевдан)', julian: [7, 27], names: ['Пантелија', 'Пантелеј'] },
  { id: 'preobrazenje', en: 'Transfiguration (Preobraženje)', sr: 'Преображење Господње', julian: [8, 6], names: [] },
  { id: 'gospojina', en: 'Dormition of the Theotokos (Velika Gospojina)', sr: 'Велика Госпојина', julian: [8, 15], names: ['Марија', 'Мара', 'Маја'] },
  { id: 'krstovdan', en: 'Exaltation of the Cross (Krstovdan)', sr: 'Крстовдан', julian: [9, 14], names: ['Крста', 'Крстан', 'Крстина'] },
  { id: 'petka', en: 'St. Paraskevi (Petkovdan)', sr: 'Света Петка (Петковдан)', julian: [10, 14], names: ['Петка', 'Парашкева', 'Петкана'] },
  { id: 'luka', en: 'St. Luke the Evangelist (Lukindan)', sr: 'Свети апостол Лука (Лукиндан)', julian: [10, 18], names: ['Лука'] },
  { id: 'mitrovdan', en: 'St. Demetrius (Mitrovdan)', sr: 'Свети великомученик Димитрије (Митровдан)', julian: [10, 26], names: ['Димитрије', 'Митар', 'Мита', 'Митра', 'Митко'] },
  { id: 'kuzman', en: 'Sts. Cosmas & Damian', sr: 'Свети Козма и Дамјан', julian: [11, 1], names: ['Козма', 'Дамјан'] },
  { id: 'aranđelovdan', en: 'Archangel Michael (Aranđelovdan)', sr: 'Свети архангел Михаило (Аранђеловдан)', julian: [11, 8], names: ['Михаило', 'Михајло', 'Миша', 'Михаела'] },
  { id: 'katarina', en: 'St. Catherine', sr: 'Света Катарина', julian: [11, 24], names: ['Катарина', 'Ката', 'Катица'] },
  { id: 'aleksandar', en: 'St. Alexander Nevsky', sr: 'Свети Александар Невски', julian: [11, 23], names: ['Александар', 'Саша', 'Александра'] },
  { id: 'andrija', en: 'St. Andrew the First-called', sr: 'Свети апостол Андреј', julian: [11, 30], names: ['Андреј', 'Андрија', 'Андреја', 'Андријана'] },
  { id: 'nikola', en: 'St. Nicholas (Nikoljdan)', sr: 'Свети Никола (Николјдан)', julian: [12, 6], names: ['Никола', 'Николина', 'Николета', 'Николај'] },
  { id: 'spiridon', en: 'St. Spyridon', sr: 'Свети Спиридон', julian: [12, 12], names: ['Спиридон', 'Спиро'] },
  { id: 'stefan', en: 'St. Stephen (Stefanovdan)', sr: 'Свети архиђакон Стефан (Стефановдан)', julian: [12, 27], names: ['Стефан', 'Стеван', 'Стево', 'Стефанија'] },
];

// Julian date of a civil (Gregorian) date, valid 1900-2099.
export const julianOf = (d: Date) => addDays(d, -13);

export function slavaOn(d: Date): Slava | undefined {
  const j = julianOf(d);
  return SLAVAS.find((s) => s.julian[0] === j.getMonth() + 1 && s.julian[1] === j.getDate());
}

// Days until the next occurrence of a slava (0 if today).
export function daysUntilSlava(s: Slava, from: Date): number {
  for (let y = from.getFullYear(); y <= from.getFullYear() + 1; y++) {
    // Julian date -> civil date: add 13 days.
    const civil = addDays(makeDate(y, s.julian[0], s.julian[1]), 13);
    const diff = dayDiff(civil, from);
    if (diff >= 0) return diff;
  }
  return 0;
}
