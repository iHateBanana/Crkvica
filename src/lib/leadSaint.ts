// Orthocal lists a day's commemorations in its own order, which sometimes puts a little-known martyr ahead of a saint
// nearly everyone knows. When one of these appears in the day's headline, it leads the Today card instead. The names
// are Orthocal's exact strings; each was picked by hand against the others listed for its day.
const WELL_KNOWN = new Set([
  'Our Holy Father Hilary, Bishop of Poitiers (369)',
  'St Gregory the Great (the Dialogist), Pope of Rome (604)',
  'Our Holy Father Christodoulos, Wonderworker of Patmos (1111)',
  'St Photine the Samaritan Woman (66)',
  'Theodora the Righteous of Thessaloniki',
  'St Martin the Confessor, pope of Rome (655)',
  'St Martin the Confessor, Pope of Rome',
  'Holy Apostle Zaccheus',
  'Righteous Melchizedek, king of Salem.',
  'Holy Myrrh-bearers Mary and Martha, sisters of St Lazarus (1st c.)',
  'Sergius and Herman, Wonderworkers of Valaam',
  'Saint Païsios of the Holy Mountain (1994) (June 29 OC)',
  'St Nikodemos of the Holy Mountain, spiritual writer (1809)',
  'Holy Prophet Ezekiel (6th c. BC)',
  'St Irene, Abbess of the Convent of Chrysovalantou (912)',
  'New Hieromartyr Kosmas of Aitolia, Equal-to-the-Apostles (1779)',
  'Trans. Rel. St Alexander Nevsky',
  'Holy Prophet Moses, who beheld God.',
  'St Symeon the New Theologian (1022)',
  'Righteous John, Wonderworker of Kronstadt (1908).',
  'St Dimitri (Demetrius) of Rostov (1709)',
  'Our Venerable Father Arsenios of Cappadocia, the Wonderworker (1924)',
  'Our Holy Father Peter, Metropolitan of Moscow (1326)',
]);

export const leadSaint = (saints: readonly string[]): string | undefined => saints.find((s) => WELL_KNOWN.has(s)) ?? saints[0];
