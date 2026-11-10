import { describe, expect, it } from 'vitest';
import { leadSaint } from '../src/lib/leadSaint';
import { pinnedImage } from '../src/lib/saintImage';

describe('leadSaint', () => {
  it('keeps Orthocal\'s first saint by default', () => {
    expect(leadSaint(['Greatmartyr Catherine of Alexandria', 'Great Martyr Mercurius (ca. 259)'])).toBe('Greatmartyr Catherine of Alexandria');
  });

  it('puts a widely known saint ahead of a lesser-known first entry', () => {
    const day = ['Apostles of the 70 Erastus, Olympas, Herodion, Sosipater, Quartus, Tertius', 'Our Venerable Father Arsenios of Cappadocia, the Wonderworker (1924)'];
    expect(leadSaint(day)).toBe(day[1]);
    expect(leadSaint(['Ven. Theophanes the Confessor', 'St Gregory the Great (the Dialogist), Pope of Rome (604)'])).toBe('St Gregory the Great (the Dialogist), Pope of Rome (604)');
  });

  it('handles an empty day', () => {
    expect(leadSaint([])).toBeUndefined();
  });

  it('has an icon for nearly every promoted saint', () => {
    const promoted = ['Our Venerable Father Arsenios of Cappadocia, the Wonderworker (1924)', 'Holy Prophet Moses, who beheld God.', 'Trans. Rel. St Alexander Nevsky', 'St Martin the Confessor, Pope of Rome'];
    for (const name of promoted) expect(pinnedImage(name), name).toBeDefined();
  });
});
