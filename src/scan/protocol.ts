import type { Face } from '../cube';

export interface ScanStep {
  face: Face;
  title: string;
  instruction: string;
}

/**
 * Capture order chosen so that (a) every photographed face maps to the Kociemba
 * net row-by-row with no rotation, and (b) the top, bottom and front colors are
 * known before the user starts turning the cube for the side faces, so the UI
 * can show which colors belong around the face being photographed.
 *
 * Front is photographed head-on; top/bottom by tilting (not turning) the cube;
 * the sides by turning the cube to the left a quarter turn at a time, keeping
 * the same face on top.
 */
export const SCAN_STEPS: readonly ScanStep[] = [
  {
    face: 'F',
    title: 'Front face',
    instruction:
      'Hold the cube with any face toward the camera. This is your “front”; the face on top now is your “top”.',
  },
  {
    face: 'U',
    title: 'Top face',
    instruction:
      'Tilt the cube so the top faces the camera. The front face should now point at the floor (bottom of the frame).',
  },
  {
    face: 'D',
    title: 'Bottom face',
    instruction:
      'Tilt the cube the other way so the bottom faces the camera. The front face should now point at the ceiling (top of the frame).',
  },
  {
    face: 'R',
    title: 'Right face',
    instruction:
      'Return to the front position, then turn the cube a quarter turn to the left so the right face points at the camera. Same face on top.',
  },
  {
    face: 'B',
    title: 'Back face',
    instruction: 'Turn the cube another quarter turn to the left. Same face on top.',
  },
  {
    face: 'L',
    title: 'Left face',
    instruction: 'Turn the cube another quarter turn to the left. Same face on top.',
  },
];

export type Edge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Which face is adjacent to each edge of the photographed image, given the
 * holding instructions above (true camera frame, not mirrored).
 */
export const NEIGHBORS: Record<Face, Record<Edge, Face>> = {
  F: { top: 'U', right: 'R', bottom: 'D', left: 'L' },
  U: { top: 'B', right: 'R', bottom: 'F', left: 'L' },
  D: { top: 'F', right: 'R', bottom: 'B', left: 'L' },
  R: { top: 'U', right: 'B', bottom: 'D', left: 'F' },
  B: { top: 'U', right: 'L', bottom: 'D', left: 'R' },
  L: { top: 'U', right: 'F', bottom: 'D', left: 'B' },
};
