/// <reference lib="webworker" />
import { ensureSolverTables, solveFacelets } from './kociemba';
import type { SolverRequest, SolverResponse } from './protocol';

const post = (msg: SolverResponse) => self.postMessage(msg);

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  const req = event.data;
  try {
    if (req.type === 'init') {
      ensureSolverTables();
      post({ id: req.id, type: 'init', ok: true });
    } else {
      post({ id: req.id, type: 'solve', ok: true, moves: solveFacelets(req.facelets) });
    }
  } catch (e) {
    post({
      id: req.id,
      type: req.type,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};
