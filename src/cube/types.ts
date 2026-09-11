/** Face names in Kociemba facelet order. Index in this array = face index. */
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = (typeof FACES)[number];

/**
 * 54 stickers in Kociemba order: U0..U8, R0..R8, F0..F8, D0..D8, L0..L8, B0..B8.
 * Within a face, stickers are row-major (top-left → bottom-right) as seen in
 * the standard unfolded net:
 *
 *          U
 *      L   F   R   B
 *          D
 */
export type Facelets = Face[];

export const FACELET_COUNT = 54;

/** A face turn: `turns` clockwise quarter turns as seen looking at that face. */
export interface Move {
  face: Face;
  turns: 1 | 2 | 3;
}

export function faceIndex(face: Face): number {
  return FACES.indexOf(face);
}

export function solvedFacelets(): Facelets {
  return FACES.flatMap((f) => Array<Face>(9).fill(f));
}

export function isSolved(facelets: Facelets): boolean {
  return facelets.every((f, i) => f === facelets[i - (i % 9) + 4]);
}
