import Cube from 'cubejs';
import { describe, expect, it } from 'vitest';
import { applyMoves, isSolved, solvedFacelets, type Face, type Facelets } from '../src/cube';
import { solveFacelets } from '../src/solver/kociemba';

const toFacelets = (s: string): Facelets => s.split('') as Face[];

describe('solveFacelets', () => {
  it('returns no moves for a solved cube', () => {
    expect(solveFacelets(solvedFacelets())).toEqual([]);
  });

  it('solutions from cubejs, applied with our move engine, solve random cubes', () => {
    for (let i = 0; i < 5; i++) {
      const start = toFacelets(Cube.random().asString());
      const moves = solveFacelets(start);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves.length).toBeLessThanOrEqual(24);
      expect(isSolved(applyMoves(start, moves))).toBe(true);
    }
  }, 60_000);
});
