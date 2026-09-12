import { FACES, type Face } from '../cube';
import type { RGB } from './capture';

export type ColorName = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export const COLOR_NAMES: readonly ColorName[] = [
  'white',
  'yellow',
  'green',
  'blue',
  'red',
  'orange',
];

/** Display colors for the named sticker colors (used before anything is scanned). */
export const COLOR_RGB: Record<ColorName, RGB> = {
  white: [245, 245, 245],
  yellow: [255, 213, 0],
  green: [0, 158, 96],
  blue: [0, 81, 186],
  red: [196, 30, 58],
  orange: [255, 120, 0],
};

export type SchemeName = 'western' | 'japanese';

/**
 * Reference colorings with white on top and green in front. The two schemes
 * differ in which colors are opposite: Western pairs white/yellow and
 * green/blue, Japanese pairs white/blue and green/yellow.
 */
const REFERENCE: Record<SchemeName, Record<Face, ColorName>> = {
  western: { U: 'white', D: 'yellow', F: 'green', B: 'blue', R: 'red', L: 'orange' },
  japanese: { U: 'white', D: 'blue', F: 'green', B: 'yellow', R: 'red', L: 'orange' },
};

export interface SchemeSettings {
  scheme: SchemeName;
  top: ColorName;
  front: ColorName;
}

export const DEFAULT_SCHEME_SETTINGS: SchemeSettings = {
  scheme: 'western',
  top: 'white',
  front: 'green',
};

type Coloring = Record<Face, ColorName>;

// Whole-cube rotations expressed as "new face ← old face".
const ROTATIONS: ReadonlyArray<Partial<Record<Face, Face>>> = [
  { U: 'F', F: 'D', D: 'B', B: 'U' }, // x
  { F: 'R', R: 'B', B: 'L', L: 'F' }, // y
  { U: 'L', L: 'D', D: 'R', R: 'U' }, // z
];

function rotate(c: Coloring, rot: Partial<Record<Face, Face>>): Coloring {
  const out = { ...c };
  for (const face of FACES) {
    const from = rot[face];
    if (from) out[face] = c[from];
  }
  return out;
}

/** All 24 orientations of a coloring. */
function orientations(base: Coloring): Coloring[] {
  const seen = new Map<string, Coloring>();
  const queue = [base];
  while (queue.length) {
    const c = queue.pop()!;
    const key = FACES.map((f) => c[f]).join();
    if (seen.has(key)) continue;
    seen.set(key, c);
    for (const rot of ROTATIONS) queue.push(rotate(c, rot));
  }
  return [...seen.values()];
}

/**
 * Colors of all six faces for the chosen scheme when `top` is on U and
 * `front` on F, or undefined if those two colors cannot be adjacent.
 */
export function expectedFaceColors(s: SchemeSettings): Record<Face, ColorName> | undefined {
  return orientations(REFERENCE[s.scheme]).find((c) => c.U === s.top && c.F === s.front);
}

export function schemeColorsAsRgb(colors: Record<Face, ColorName>): RGB[] {
  return FACES.map((f) => COLOR_RGB[colors[f]]);
}

const KEY = 'kubikrubik.scheme';

export function loadSchemeSettings(): SchemeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<SchemeSettings>;
      if (
        (s.scheme === 'western' || s.scheme === 'japanese') &&
        COLOR_NAMES.includes(s.top as ColorName) &&
        COLOR_NAMES.includes(s.front as ColorName)
      ) {
        return s as SchemeSettings;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SCHEME_SETTINGS;
}

export function saveSchemeSettings(s: SchemeSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
