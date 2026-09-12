import { describe, expect, it } from 'vitest';
import { FACES, solvedFacelets, type Face } from '../src/cube';
import type { RGB } from '../src/scan/capture';
import { classifyStickers, rgbToLab } from '../src/scan/colorClassify';

// Typical sticker colors under warm indoor light: white, red, green, yellow, orange, blue.
const PALETTE: Record<Face, RGB> = {
  U: [235, 230, 215],
  R: [200, 30, 40],
  F: [20, 150, 70],
  D: [240, 210, 30],
  L: [245, 120, 20],
  B: [10, 60, 180],
};

function noisy([r, g, b]: RGB, seed: number, amount = 18): RGB {
  const n = (k: number) => ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1) * amount;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return [clamp(r + n(1)), clamp(g + n(2)), clamp(b + n(3))];
}

describe('rgbToLab', () => {
  it('maps white to L≈100 and black to L≈0', () => {
    expect(rgbToLab([255, 255, 255])[0]).toBeCloseTo(100, 0);
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 0);
  });
});

describe('classifyStickers', () => {
  it('recovers a solved cube from noisy samples', () => {
    const samples = solvedFacelets().map((f, i) => noisy(PALETTE[f], i));
    const result = classifyStickers(samples);
    expect(result.facelets).toEqual(solvedFacelets());
    expect(Math.min(...result.confidence)).toBeGreaterThan(0.3);
  });

  it('recovers a scrambled layout, including red/orange and white/yellow', () => {
    const truth: Face[] = solvedFacelets();
    // Deterministic shuffle of non-center stickers.
    const idx = truth.map((_, i) => i).filter((i) => i % 9 !== 4);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = (i * 7919) % (i + 1);
      const a = idx[i]!;
      const b = idx[j]!;
      [truth[a], truth[b]] = [truth[b]!, truth[a]!];
    }
    const samples = truth.map((f, i) => noisy(PALETTE[f], i + 100, 25));
    expect(classifyStickers(samples).facelets).toEqual(truth);
  });

  it('always yields exactly 9 stickers per face, even for ambiguous input', () => {
    // Orange samples pulled toward red: capacity constraint must still hold.
    const samples = solvedFacelets().map((f, i) =>
      f === 'L' && i % 9 !== 4 ? noisy([215, 60, 30], i) : noisy(PALETTE[f], i),
    );
    const { facelets } = classifyStickers(samples);
    for (const face of FACES) {
      expect(facelets.filter((f) => f === face)).toHaveLength(9);
    }
  });

  it('rejects the wrong number of samples', () => {
    expect(() => classifyStickers([])).toThrow();
  });
});

describe('classifyStickers under uneven lighting', () => {
  it('tolerates a strong brightness gradient across each face', () => {
    const truth: Face[] = solvedFacelets();
    const idx = truth.map((_, i) => i).filter((i) => i % 9 !== 4);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = (i * 104729) % (i + 1);
      const a = idx[i]!;
      const b = idx[j]!;
      [truth[a], truth[b]] = [truth[b]!, truth[a]!];
    }
    // Stickers in the bottom-right of each face are in shadow (down to 55%).
    const samples = truth.map((f, i) => {
      const within = i % 9;
      const shade = 1 - (0.45 * ((within % 3) + Math.floor(within / 3))) / 4;
      const base = PALETTE[f];
      return noisy([base[0] * shade, base[1] * shade, base[2] * shade], i + 7, 12);
    });
    expect(classifyStickers(samples).facelets).toEqual(truth);
  });
});
