import Cube from 'cubejs';
import { describe, expect, it } from 'vitest';
import {
  FACES,
  applyMove,
  applyMoves,
  formatMoves,
  invertMoves,
  isSolved,
  parseMoves,
  solvedFacelets,
  type Face,
  type Facelets,
} from '../src/cube';

const toFacelets = (s: string): Facelets => s.split('') as Face[];

describe('applyMove', () => {
  it('four quarter turns of any face are the identity', () => {
    for (const face of FACES) {
      let f = solvedFacelets();
      for (let i = 0; i < 4; i++) f = applyMove(f, { face, turns: 1 });
      expect(f).toEqual(solvedFacelets());
    }
  });

  it('turns=2 equals two quarter turns and turns=3 equals three', () => {
    for (const face of FACES) {
      const q = (n: number) =>
        applyMoves(
          solvedFacelets(),
          Array.from({ length: n }, () => ({ face, turns: 1 as const })),
        );
      expect(applyMove(solvedFacelets(), { face, turns: 2 })).toEqual(q(2));
      expect(applyMove(solvedFacelets(), { face, turns: 3 })).toEqual(q(3));
    }
  });

  it('matches cubejs for every single move', () => {
    for (const face of FACES) {
      for (const suffix of ['', '2', "'"]) {
        const alg = face + suffix;
        const ours = applyMoves(solvedFacelets(), parseMoves(alg)).join('');
        const theirs = new Cube().move(alg).asString();
        expect(ours, alg).toBe(theirs);
      }
    }
  });

  it('matches cubejs on a long scramble', () => {
    const alg = "R U R' U' F2 D B' L2 U' R' D2 F B2 L D' U2 B R2 F' L' D";
    const ours = applyMoves(solvedFacelets(), parseMoves(alg)).join('');
    expect(ours).toBe(new Cube().move(alg).asString());
    expect(isSolved(toFacelets(ours))).toBe(false);
  });

  it('applying an algorithm then its inverse restores the state', () => {
    const moves = parseMoves("R U R' U' F2 D B' L2");
    const state = applyMoves(solvedFacelets(), moves);
    expect(applyMoves(state, invertMoves(moves))).toEqual(solvedFacelets());
    expect(formatMoves(invertMoves(moves))).toBe("L2 B D' F2 U R U' R'");
  });
});
