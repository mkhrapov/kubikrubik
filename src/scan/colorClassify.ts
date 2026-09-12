import { FACES, type Face, type Facelets } from '../cube';
import type { RGB } from './capture';

export type Lab = readonly [number, number, number];

/** sRGB (0–255) → CIELAB, D65. Perceptual distances work far better than RGB. */
export function rgbToLab([r, g, b]: RGB): Lab {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Lightness is down-weighted: shadows and uneven light change L a lot while
 * the chroma (a, b) of a sticker stays comparatively stable.
 */
const L_WEIGHT = 0.5;

function dist2(a: Lab, b: Lab): number {
  return (L_WEIGHT * (a[0] - b[0])) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export interface Classification {
  facelets: Facelets;
  /** 0–1 per sticker: how clearly it belongs to its face vs. the runner-up. */
  confidence: number[];
  /** Representative RGB of each face, indexed like FACES. */
  faceColors: RGB[];
}

/**
 * Maps 54 sampled sticker colors (Kociemba order) to face letters.
 *
 * The 6 center stickers seed one class each, so no color scheme is assumed.
 * Stickers are assigned greedily by distance under the constraint of exactly
 * 9 per face, the class centroids are refined, and the process repeats.
 */
export function classifyStickers(samples: RGB[], iterations = 3): Classification {
  if (samples.length !== 54) throw new Error(`Expected 54 samples, got ${samples.length}`);
  const labs = samples.map(rgbToLab);
  let centroids: Lab[] = FACES.map((_, i) => labs[i * 9 + 4]!);
  let assignment: number[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    assignment = assignWithCapacity(labs, centroids, 9);
    centroids = FACES.map((_, k) => {
      const members = labs.filter((_, i) => assignment[i] === k);
      return meanLab(members);
    });
  }

  const confidence = labs.map((lab, i) => {
    const own = Math.sqrt(dist2(lab, centroids[assignment[i]!]!));
    const other = Math.min(
      ...centroids.filter((_, k) => k !== assignment[i]).map((c) => Math.sqrt(dist2(lab, c))),
    );
    return other === 0 ? 0 : Math.max(0, Math.min(1, (other - own) / other));
  });

  const faceColors = FACES.map((_, k) => {
    const members = samples.filter((_, i) => assignment[i] === k);
    const sum = members.reduce<[number, number, number]>(
      (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
      [0, 0, 0],
    );
    return [sum[0] / members.length, sum[1] / members.length, sum[2] / members.length] as RGB;
  });

  return {
    facelets: assignment.map((k) => FACES[k] as Face),
    confidence,
    faceColors,
  };
}

/** Global greedy: repeatedly take the closest (sample, class) pair with spare capacity. */
function assignWithCapacity(labs: Lab[], centroids: Lab[], capacity: number): number[] {
  const pairs: { i: number; k: number; d: number }[] = [];
  labs.forEach((lab, i) => centroids.forEach((c, k) => pairs.push({ i, k, d: dist2(lab, c) })));
  pairs.sort((a, b) => a.d - b.d);
  const assignment = new Array<number>(labs.length).fill(-1);
  const counts = new Array<number>(centroids.length).fill(0);
  let remaining = labs.length;
  for (const { i, k } of pairs) {
    if (remaining === 0) break;
    if (assignment[i] !== -1 || counts[k]! >= capacity) continue;
    assignment[i] = k;
    counts[k]!++;
    remaining--;
  }
  return assignment;
}

function meanLab(items: Lab[]): Lab {
  const n = items.length || 1;
  const s = items.reduce<[number, number, number]>(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
    [0, 0, 0],
  );
  return [s[0] / n, s[1] / n, s[2] / n];
}
