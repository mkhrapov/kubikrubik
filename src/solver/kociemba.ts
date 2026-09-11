import Cube from 'cubejs';
import { parseMoves, type Facelets, type Move } from '../cube';

let initialized = false;

/** Builds cubejs's lookup tables. Takes seconds; safe to call repeatedly. */
export function ensureSolverTables(): void {
  if (initialized) return;
  Cube.initSolver();
  initialized = true;
}

export class SolveError extends Error {}

/**
 * Solves a (pre-validated) facelet layout with Kociemba's two-phase algorithm.
 * Returns the moves that bring the cube to the solved state.
 */
export function solveFacelets(facelets: Facelets): Move[] {
  ensureSolverTables();
  const cube = Cube.fromString(facelets.join(''));
  if (cube.isSolved()) return [];
  // 22 is cubejs's default; one deeper retry covers the rare miss.
  const solution = cube.solve(22) ?? cube.solve(24);
  if (solution == null) throw new SolveError('No solution found');
  return parseMoves(solution);
}
