import type { Face, Facelets, Move } from './types';

/**
 * Facelet cycles for one clockwise quarter turn of each face. Each 4-tuple
 * [a, b, c, d] means: the sticker at a moves to b, b to c, c to d, d to a.
 *
 * Indices follow the Kociemba layout described in ./types.ts.
 * Face offsets: U=0, R=9, F=18, D=27, L=36, B=45.
 */
const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

type Cycle = readonly [number, number, number, number];

function ownFace(o: number): Cycle[] {
  return [
    [o + 0, o + 2, o + 8, o + 6],
    [o + 1, o + 5, o + 7, o + 3],
  ];
}

const CYCLES: Record<Face, Cycle[]> = {
  U: [
    ...ownFace(U),
    [F + 0, L + 0, B + 0, R + 0],
    [F + 1, L + 1, B + 1, R + 1],
    [F + 2, L + 2, B + 2, R + 2],
  ],
  D: [
    ...ownFace(D),
    [F + 6, R + 6, B + 6, L + 6],
    [F + 7, R + 7, B + 7, L + 7],
    [F + 8, R + 8, B + 8, L + 8],
  ],
  R: [
    ...ownFace(R),
    [F + 2, U + 2, B + 6, D + 2],
    [F + 5, U + 5, B + 3, D + 5],
    [F + 8, U + 8, B + 0, D + 8],
  ],
  L: [
    ...ownFace(L),
    [U + 0, F + 0, D + 0, B + 8],
    [U + 3, F + 3, D + 3, B + 5],
    [U + 6, F + 6, D + 6, B + 2],
  ],
  F: [
    ...ownFace(F),
    [U + 6, R + 0, D + 2, L + 8],
    [U + 7, R + 3, D + 1, L + 5],
    [U + 8, R + 6, D + 0, L + 2],
  ],
  B: [
    ...ownFace(B),
    [U + 0, L + 6, D + 8, R + 2],
    [U + 1, L + 3, D + 7, R + 5],
    [U + 2, L + 0, D + 6, R + 8],
  ],
};

/** Returns a new facelet array with `move` applied. Input is not mutated. */
export function applyMove(facelets: Facelets, move: Move): Facelets {
  const out = facelets.slice();
  for (const [a, b, c, d] of CYCLES[move.face]) {
    const cycle = [a, b, c, d];
    for (let k = 0; k < 4; k++) {
      // Sticker at cycle[k] ends up at cycle[(k + turns) % 4].
      out[cycle[(k + move.turns) % 4]!] = facelets[cycle[k]!]!;
    }
  }
  return out;
}

export function applyMoves(facelets: Facelets, moves: Move[]): Facelets {
  return moves.reduce(applyMove, facelets);
}
