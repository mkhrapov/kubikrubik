import type { Face } from '../cube';

export interface ScanStep {
  face: Face;
  title: string;
  instruction: string;
}

/**
 * Capture order chosen so that every photographed face maps to the Kociemba
 * net row-by-row with no rotation, as long as the user keeps the same face on
 * top while turning the cube left, and tilts (rather than turns) for U and D.
 */
export const SCAN_STEPS: readonly ScanStep[] = [
  {
    face: 'F',
    title: 'Front face',
    instruction:
      'Hold the cube with any face toward the camera. Remember which face is on top — keep it there for the next three steps.',
  },
  {
    face: 'R',
    title: 'Right face',
    instruction:
      'Turn the cube a quarter turn to the left, so the face that was on the right now faces the camera. Same face still on top.',
  },
  {
    face: 'B',
    title: 'Back face',
    instruction: 'Turn the cube another quarter turn to the left. Same face still on top.',
  },
  {
    face: 'L',
    title: 'Left face',
    instruction: 'Turn the cube another quarter turn to the left. Same face still on top.',
  },
  {
    face: 'U',
    title: 'Top face',
    instruction:
      'Turn the cube back to the first (front) face, then tilt it so the top faces the camera. The front face should now be at the bottom of the frame.',
  },
  {
    face: 'D',
    title: 'Bottom face',
    instruction:
      'From the front position, tilt the cube the other way so the bottom faces the camera. The front face should now be at the top of the frame.',
  },
];
