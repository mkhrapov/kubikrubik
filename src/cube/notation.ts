import { FACES, type Face, type Move } from './types';

const FACE_SET: ReadonlySet<string> = new Set(FACES);

export class NotationError extends Error {}

/** Parses "R U' F2" (also accepts "R2'" / lowercase-insensitive spacing) into moves. */
export function parseMoves(alg: string): Move[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map(parseMove);
}

export function parseMove(token: string): Move {
  const m = /^([URFDLB])(2|'|2')?$/.exec(token);
  if (!m || !FACE_SET.has(m[1]!)) {
    throw new NotationError(`Unknown move "${token}"`);
  }
  const face = m[1] as Face;
  const suffix = m[2] ?? '';
  const turns = suffix === '' ? 1 : suffix === '2' ? 2 : suffix === "'" ? 3 : 2;
  return { face, turns };
}

export function formatMove(move: Move): string {
  return move.face + (move.turns === 1 ? '' : move.turns === 2 ? '2' : "'");
}

export function formatMoves(moves: Move[]): string {
  return moves.map(formatMove).join(' ');
}

export function invertMove(move: Move): Move {
  return { face: move.face, turns: move.turns === 2 ? 2 : move.turns === 1 ? 3 : 1 };
}

export function invertMoves(moves: Move[]): Move[] {
  return moves.map(invertMove).reverse();
}
