import type { Facelets, Move } from '../cube';

export type SolverRequest =
  { id: number; type: 'init' } | { id: number; type: 'solve'; facelets: Facelets };

export type SolverResponse =
  | { id: number; type: 'init'; ok: true }
  | { id: number; type: 'solve'; ok: true; moves: Move[] }
  | { id: number; type: 'init' | 'solve'; ok: false; error: string };
