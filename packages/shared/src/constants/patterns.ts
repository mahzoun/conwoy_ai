import { Pattern, PatternId } from '../types/game';

export const PATTERNS: Record<PatternId, Pattern> = {
  block: {
    id: 'block',
    name: 'Block',
    description: 'A 2x2 square — the simplest still life. Stable and unchanging.',
    cells: [
      [0, 0], [0, 1],
      [1, 0], [1, 1]
    ],
    width: 2,
    height: 2,
  },

  boat: {
    id: 'boat',
    name: 'Boat',
    description: 'A 5-cell still life shaped like a small boat. Stable.',
    cells: [
      [0, 0], [0, 1],
      [1, 0], [1, 2],
      [2, 1]
    ],
    width: 3,
    height: 3,
  },

  tub: {
    id: 'tub',
    name: 'Tub',
    description: 'A 4-cell diamond still life. Stable and compact.',
    cells: [
      [0, 1],
      [1, 0], [1, 2],
      [2, 1]
    ],
    width: 3,
    height: 3,
  },

  glider: {
    id: 'glider',
    name: 'Glider',
    description: 'The classic 5-cell spaceship. Moves diagonally across the board.',
    cells: [
      [0, 1],
      [1, 2],
      [2, 0], [2, 1], [2, 2]
    ],
    width: 3,
    height: 3,
  },

  lwss: {
    id: 'lwss',
    name: 'Lightweight Spaceship',
    description: 'A 9-cell spaceship that moves horizontally. Fast and aggressive.',
    cells: [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 0], [1, 4],
      [2, 4],
      [3, 0], [3, 3]
    ],
    width: 5,
    height: 4,
  },

  blinker: {
    id: 'blinker',
    name: 'Blinker',
    description: 'A 3-cell oscillator with period 2. Alternates between horizontal and vertical.',
    cells: [
      [0, 0], [0, 1], [0, 2]
    ],
    width: 3,
    height: 1,
  },

  toad: {
    id: 'toad',
    name: 'Toad',
    description: 'A 6-cell oscillator with period 2. A common and useful oscillator.',
    cells: [
      [0, 1], [0, 2], [0, 3],
      [1, 0], [1, 1], [1, 2]
    ],
    width: 4,
    height: 2,
  },

  beacon: {
    id: 'beacon',
    name: 'Beacon',
    description: 'A 6-cell oscillator with period 2, made of two interacting blocks.',
    cells: [
      [0, 0], [0, 1],
      [1, 0],
      [2, 3],
      [3, 2], [3, 3]
    ],
    width: 4,
    height: 4,
  },
};

export const PATTERN_LIST: Pattern[] = Object.values(PATTERNS);

export function getPattern(id: PatternId): Pattern {
  const pattern = PATTERNS[id];
  if (!pattern) {
    throw new Error(`Unknown pattern: ${id}`);
  }
  return pattern;
}
