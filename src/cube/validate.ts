import { FACELET_COUNT, FACES, type Face, type Facelets } from './types';

const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

/** Facelet indices of the 8 corner positions, U/D sticker first, then clockwise. */
export const CORNER_FACELETS: ReadonlyArray<readonly [number, number, number]> = [
  [U + 8, R + 0, F + 2], // URF
  [U + 6, F + 0, L + 2], // UFL
  [U + 0, L + 0, B + 2], // ULB
  [U + 2, B + 0, R + 2], // UBR
  [D + 2, F + 8, R + 6], // DFR
  [D + 0, L + 8, F + 6], // DLF
  [D + 6, B + 8, L + 6], // DBL
  [D + 8, R + 8, B + 6], // DRB
];
const CORNER_COLORS: ReadonlyArray<readonly [Face, Face, Face]> = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

/** Facelet indices of the 12 edge positions. */
export const EDGE_FACELETS: ReadonlyArray<readonly [number, number]> = [
  [U + 5, R + 1], // UR
  [U + 7, F + 1], // UF
  [U + 3, L + 1], // UL
  [U + 1, B + 1], // UB
  [D + 5, R + 7], // DR
  [D + 1, F + 7], // DF
  [D + 3, L + 7], // DL
  [D + 7, B + 7], // DB
  [F + 5, R + 3], // FR
  [F + 3, L + 5], // FL
  [B + 5, L + 3], // BL
  [B + 3, R + 5], // BR
];
const EDGE_COLORS: ReadonlyArray<readonly [Face, Face]> = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
];

export interface ValidationError {
  code:
    | 'length'
    | 'color-count'
    | 'center'
    | 'bad-corner'
    | 'bad-edge'
    | 'duplicate-corner'
    | 'duplicate-edge'
    | 'twist'
    | 'flip'
    | 'parity';
  message: string;
  /** Facelet indices the UI should highlight. */
  facelets: number[];
}

export type ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] };

/**
 * Checks that a sticker layout describes a cube state reachable by face turns.
 * Structural problems (counts, impossible pieces) are reported first; the
 * global twist/flip/parity checks only run once every piece is identified.
 */
export function validateFacelets(facelets: Facelets): ValidationResult {
  const errors: ValidationError[] = [];

  if (facelets.length !== FACELET_COUNT) {
    return {
      ok: false,
      errors: [
        {
          code: 'length',
          message: `Expected ${FACELET_COUNT} stickers, got ${facelets.length}`,
          facelets: [],
        },
      ],
    };
  }

  for (const face of FACES) {
    const idx = facelets.flatMap((f, i) => (f === face ? [i] : []));
    if (idx.length !== 9) {
      errors.push({
        code: 'color-count',
        message: `${face} appears ${idx.length} times (expected 9)`,
        facelets: idx,
      });
    }
  }
  FACES.forEach((face, i) => {
    if (facelets[i * 9 + 4] !== face) {
      errors.push({
        code: 'center',
        message: `Center of face ${face} is ${facelets[i * 9 + 4]}`,
        facelets: [i * 9 + 4],
      });
    }
  });
  if (errors.length > 0) return { ok: false, errors };

  // Corners
  const cornerPerm: number[] = [];
  const cornerOri: number[] = [];
  const seenCorner = new Map<number, number>();
  CORNER_FACELETS.forEach((pos, i) => {
    const stickers = pos.map((p) => facelets[p]!);
    const ori = stickers.findIndex((s) => s === 'U' || s === 'D');
    if (ori < 0) {
      errors.push({
        code: 'bad-corner',
        message: `Corner ${stickers.join('')} has no U/D sticker`,
        facelets: [...pos],
      });
      return;
    }
    const a = stickers[(ori + 1) % 3];
    const b = stickers[(ori + 2) % 3];
    const cubie = CORNER_COLORS.findIndex(
      (c) => c[0] === stickers[ori] && c[1] === a && c[2] === b,
    );
    if (cubie < 0) {
      errors.push({
        code: 'bad-corner',
        message: `No corner piece has colors ${stickers.join('')}`,
        facelets: [...pos],
      });
      return;
    }
    const prev = seenCorner.get(cubie);
    if (prev !== undefined) {
      errors.push({
        code: 'duplicate-corner',
        message: `Corner ${CORNER_COLORS[cubie]!.join('')} appears twice`,
        facelets: [...CORNER_FACELETS[prev]!, ...pos],
      });
      return;
    }
    seenCorner.set(cubie, i);
    cornerPerm[i] = cubie;
    cornerOri[i] = ori;
  });

  // Edges
  const edgePerm: number[] = [];
  const edgeOri: number[] = [];
  const seenEdge = new Map<number, number>();
  EDGE_FACELETS.forEach((pos, i) => {
    const [s0, s1] = [facelets[pos[0]]!, facelets[pos[1]]!];
    let cubie = EDGE_COLORS.findIndex((c) => c[0] === s0 && c[1] === s1);
    let ori = 0;
    if (cubie < 0) {
      cubie = EDGE_COLORS.findIndex((c) => c[0] === s1 && c[1] === s0);
      ori = 1;
    }
    if (cubie < 0) {
      errors.push({
        code: 'bad-edge',
        message: `No edge piece has colors ${s0}${s1}`,
        facelets: [...pos],
      });
      return;
    }
    const prev = seenEdge.get(cubie);
    if (prev !== undefined) {
      errors.push({
        code: 'duplicate-edge',
        message: `Edge ${EDGE_COLORS[cubie]!.join('')} appears twice`,
        facelets: [...EDGE_FACELETS[prev]!, ...pos],
      });
      return;
    }
    seenEdge.set(cubie, i);
    edgePerm[i] = cubie;
    edgeOri[i] = ori;
  });
  if (errors.length > 0) return { ok: false, errors };

  const twist = cornerOri.reduce((s, o) => s + o, 0) % 3;
  if (twist !== 0) {
    errors.push({
      code: 'twist',
      message: 'A corner is twisted: the corner orientations do not add up',
      facelets: CORNER_FACELETS.flatMap((c, i) => (cornerOri[i] !== 0 ? [...c] : [])),
    });
  }
  const flip = edgeOri.reduce((s, o) => s + o, 0) % 2;
  if (flip !== 0) {
    errors.push({
      code: 'flip',
      message: 'An edge is flipped: the edge orientations do not add up',
      facelets: EDGE_FACELETS.flatMap((e, i) => (edgeOri[i] !== 0 ? [...e] : [])),
    });
  }
  if (permutationParity(cornerPerm) !== permutationParity(edgePerm)) {
    errors.push({
      code: 'parity',
      message: 'Two pieces are swapped: corner and edge permutation parity differ',
      facelets: [],
    });
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function permutationParity(perm: number[]): 0 | 1 {
  let swaps = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i]! > perm[j]!) swaps++;
    }
  }
  return (swaps % 2) as 0 | 1;
}
