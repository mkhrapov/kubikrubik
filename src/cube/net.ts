import { FACES, type Face } from './types';

export interface StickerPosition {
  face: Face;
  row: number; // 0..2, top to bottom in the net
  col: number; // 0..2, left to right in the net
}

export function faceletIndex(face: Face, row: number, col: number): number {
  return FACES.indexOf(face) * 9 + row * 3 + col;
}

export function stickerPosition(index: number): StickerPosition {
  const face = FACES[Math.floor(index / 9)]!;
  const within = index % 9;
  return { face, row: Math.floor(within / 3), col: within % 3 };
}

export function faceOfIndex(index: number): Face {
  return FACES[Math.floor(index / 9)]!;
}

export function centerIndex(face: Face): number {
  return FACES.indexOf(face) * 9 + 4;
}

/** Cube-space coordinates: +x = R, +y = U, +z = F. Components are -1, 0 or 1. */
export type Vec3 = readonly [number, number, number];

export const FACE_NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/** Position of the cubie carrying a given sticker (see net orientation notes in types.ts). */
export function cubiePositionOfSticker(index: number): Vec3 {
  const { face, row, col } = stickerPosition(index);
  switch (face) {
    case 'U':
      return [col - 1, 1, row - 1];
    case 'D':
      return [col - 1, -1, 1 - row];
    case 'F':
      return [col - 1, 1 - row, 1];
    case 'B':
      return [1 - col, 1 - row, -1];
    case 'R':
      return [1, 1 - row, 1 - col];
    case 'L':
      return [-1, 1 - row, col - 1];
  }
}

/** Inverse of cubiePositionOfSticker: which facelet index is on `face` of the cubie at `pos`. */
export function stickerIndexAt(pos: Vec3, face: Face): number | undefined {
  const [x, y, z] = pos;
  const [nx, ny, nz] = FACE_NORMALS[face];
  if (x * nx + y * ny + z * nz !== 1) return undefined; // not an outer side
  for (let i = FACES.indexOf(face) * 9; i < FACES.indexOf(face) * 9 + 9; i++) {
    const p = cubiePositionOfSticker(i);
    if (p[0] === x && p[1] === y && p[2] === z) return i;
  }
  return undefined;
}
