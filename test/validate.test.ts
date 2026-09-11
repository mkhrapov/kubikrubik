import Cube from 'cubejs';
import { describe, expect, it } from 'vitest';
import {
  applyMoves,
  parseMoves,
  solvedFacelets,
  validateFacelets,
  type Face,
  type Facelets,
} from '../src/cube';

const toFacelets = (s: string): Facelets => s.split('') as Face[];

function swap(f: Facelets, a: number, b: number): Facelets {
  const out = f.slice();
  [out[a], out[b]] = [out[b]!, out[a]!];
  return out;
}

describe('validateFacelets', () => {
  it('accepts the solved cube and random legal scrambles', () => {
    expect(validateFacelets(solvedFacelets())).toEqual({ ok: true });
    for (let i = 0; i < 20; i++) {
      expect(validateFacelets(toFacelets(Cube.random().asString()))).toEqual({ ok: true });
    }
    const scrambled = applyMoves(solvedFacelets(), parseMoves("R U R' U' F2 D B' L2 U'"));
    expect(validateFacelets(scrambled)).toEqual({ ok: true });
  });

  it('rejects wrong lengths and color counts', () => {
    expect(validateFacelets(solvedFacelets().slice(1))).toMatchObject({
      ok: false,
      errors: [{ code: 'length' }],
    });
    const f = solvedFacelets();
    f[0] = 'R';
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.code)).toEqual(['color-count', 'color-count']);
      expect(result.errors[1]!.facelets).toContain(0);
    }
  });

  it('rejects a moved center', () => {
    const f = swap(solvedFacelets(), 4, 13); // U center <-> R center
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain('center');
  });

  it('detects a single twisted corner', () => {
    // Rotate the stickers of the URF corner: U8, R0, F2.
    const f = solvedFacelets();
    [f[8], f[9], f[20]] = ['R', 'F', 'U'];
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.code)).toEqual(['twist']);
      expect(result.errors[0]!.facelets).toEqual(expect.arrayContaining([8, 9, 20]));
    }
  });

  it('detects a single flipped edge', () => {
    const f = swap(solvedFacelets(), 7, 19); // UF edge: U7 <-> F1
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toEqual(['flip']);
  });

  it('detects two swapped edges (parity)', () => {
    // Swap UF (U7,F1) with UR (U5,R1).
    let f = swap(solvedFacelets(), 7, 5);
    f = swap(f, 19, 10);
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toEqual(['parity']);
  });

  it('detects impossible pieces', () => {
    // Give the URF corner two U stickers and the UF edge U+D, keeping counts at 9.
    const f = solvedFacelets();
    f[9] = 'U'; // R0 -> U
    f[7] = 'R'; // U7 -> R
    const result = validateFacelets(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.code)).toEqual(expect.arrayContaining(['bad-corner']));
    }
  });
});
