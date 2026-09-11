import { describe, expect, it } from 'vitest';
import { NotationError, formatMoves, parseMoves } from '../src/cube';

describe('notation', () => {
  it('round-trips standard notation', () => {
    const alg = "R U' F2 D B' L";
    expect(formatMoves(parseMoves(alg))).toBe(alg);
  });

  it('ignores extra whitespace', () => {
    expect(parseMoves("  R   U'\n F2 ")).toHaveLength(3);
    expect(parseMoves('')).toEqual([]);
  });

  it('rejects unknown tokens', () => {
    expect(() => parseMoves('R M U')).toThrow(NotationError);
    expect(() => parseMoves('r')).toThrow(NotationError);
  });
});
