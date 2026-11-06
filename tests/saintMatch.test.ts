import { describe, expect, it } from 'vitest';
import { imageSubject, isCredibleMatch, isSinglePerson } from '../src/lib/saintMatch';

// Page data recorded from en.wikipedia.org while evaluating this feature.
const page = (title: string, description: string, file: string) => ({ title, description, file });

describe('isCredibleMatch accepts the right saint', () => {
  it.each([
    ['St John the Merciful, Patriarch of Alexandria', page('John the Merciful', '7th-century Greek Patriarch of Alexandria', 'San_Giovanni_Elemosinario.jpg')],
    ['Ven. Alypius the Stylite', page('Alypius the Stylite', 'Christian saint (died 640)', 'Saint_Alypius_stylite.gif')],
    ['Ven. Sabbas the Sanctified', page('Sabbas the Sanctified', 'Byzantine monk', 'SabbastheSanctified.jpg')],
    ['Ven. Daniel the Stylite', page('Daniel the Stylite', 'Christian saint (c. 409 – 493)', 'Spas_na_Ilyine_-_Stylite_Daniel.jpg')],
    ['Holy Apostle Philip', page('Philip the Apostle', 'Apostle of Jesus', 'Rubens_apostel_philippus.jpg')],
    ['St. Basil of Ostrog', page('Basil of Ostrog', 'Serbian Orthodox bishop and saint', 'Vasily_Ostrojsky.jpg')],
  ])('%s', (name, p) => {
    expect(isCredibleMatch(name, p)).toBe(true);
  });
});

describe('isCredibleMatch rejects everything the loose search got wrong', () => {
  it.each([
    ['a different saint', 'St Gregory the Wonderworker', page('Gregory Palamas', 'Byzantine Greek theologian (c. 1296 – 1357/9)', 'Палама.jpg')],
    ['a lone first name matching a different saint', 'St Gregory', page('Gregory Palamas', 'Byzantine Greek theologian', 'Палама.jpg')],
    ['a church named after the saint', 'St. Nicholas the Wonderworker', page('St. Nicholas Greek Orthodox Church (Manhattan)', 'Church in Manhattan, New York', 'St._Nicholas.jpg')],
    ['a cathedral named after the saint', 'Great Martyr George', page('Saint George Greek Orthodox Cathedral', 'Orthodox church and museum in Beirut', 'St._Georg.jpg')],
    ['a church named after a Serbian saint', 'St. Sava of Serbia', page('Church of Saint Sava', 'Church in Belgrade, Serbia', 'Hram_svetog_save.jpg')],
    ['a person who is not a saint', 'Holy Apostle Philip', page('Philip II of Macedon', 'King of Macedonia', 'Philip.jpg')],
    ['one person standing in for a group', 'Apostles of the 70 Erastus, Olympas, Herodion', page('Tertius of Iconium', 'Amanuensis for Paul the Apostle', 'Erastus.jpg')],
    ['the wrong member of a group', 'Martyrs Thyrsus, Leucis, Callinicus', page('Thyrsus', 'Christian saint', 'Thyrsus.jpg')],
    ['an unrelated page for a feast', 'Theophany (Baptism of the Lord)', page('Theophany', 'Appearance of a deity in an observable way', 'Rubens-Death-of-Semele.jpg')],
    ['a day rather than a person', '23rd Sunday after Pentecost', page('Pentecost', 'Christian feast', 'Pentecost.jpg')],
    ['a page with no image', 'St Paul the Confessor of Constantinople', { title: 'Paul I of Constantinople', description: 'Archbishop of Constantinople' }],
    ['a building as the lead image', 'Ven. Daniel the Stylite', page('Daniel the Stylite', 'Christian saint', 'Monastery_of_Daniel.jpg')],
    ['a coat of arms as the lead image', 'St. Basil of Ostrog', page('Basil of Ostrog', 'Serbian Orthodox bishop and saint', 'Coat_of_arms.png')],
    ['a diagram', 'St. Basil of Ostrog', page('Basil of Ostrog', 'Serbian Orthodox bishop and saint', 'Basil.svg')],
  ])('%s', (_label, name, p) => {
    expect(isCredibleMatch(name, p)).toBe(false);
  });
});

describe('isSinglePerson', () => {
  it('separates people from groups and days', () => {
    expect(isSinglePerson('Ven. Alypius the Stylite')).toBe(true);
    expect(isSinglePerson('Martyrs Thyrsus, Leucis, Callinicus')).toBe(false);
    expect(isSinglePerson('Forefeast of Entry')).toBe(false);
  });
});

describe('imageSubject', () => {
  it('uses the main commemoration when it is a person', () => {
    expect(imageSubject('St. Sava', ['St. Sava', 'Other'])).toBe('St. Sava');
  });
  it('skips past a Sunday to the first saint', () => {
    expect(imageSubject('23rd Sunday after Pentecost', ['23rd Sunday after Pentecost', 'St Paul the Confessor'])).toBe('St Paul the Confessor');
  });
  it('gives nothing when there is nobody to illustrate', () => {
    expect(imageSubject('23rd Sunday after Pentecost', ['23rd Sunday after Pentecost'])).toBeUndefined();
    expect(imageSubject(undefined, [])).toBeUndefined();
  });
});
