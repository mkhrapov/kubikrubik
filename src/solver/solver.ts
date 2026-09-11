import type { Facelets, Move } from '../cube';
import type { SolverRequest, SolverResponse } from './protocol';

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

/**
 * Promise API over the solver Web Worker. Table generation takes a few seconds,
 * so `initSolver()` is kicked off at app start and `solve()` awaits it.
 */
class SolverClient {
  private worker: Worker | undefined;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: SolverResponse) => void }>();
  private initPromise: Promise<void> | undefined;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<SolverResponse>) => {
        const p = this.pending.get(e.data.id);
        if (p) {
          this.pending.delete(e.data.id);
          p.resolve(e.data);
        }
      };
      this.worker.onerror = (e) => {
        for (const [id, p] of this.pending) {
          p.resolve({ id, type: 'solve', ok: false, error: e.message || 'Solver worker crashed' });
        }
        this.pending.clear();
        this.worker = undefined;
        this.initPromise = undefined;
      };
    }
    return this.worker;
  }

  private request(msg: WithoutId<SolverRequest>): Promise<SolverResponse> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      const req: SolverRequest = { ...msg, id };
      this.getWorker().postMessage(req);
    });
  }

  initSolver(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.request({ type: 'init' }).then((r) => {
        if (!r.ok) {
          this.initPromise = undefined;
          throw new Error(r.error);
        }
      });
    }
    return this.initPromise;
  }

  async solve(facelets: Facelets): Promise<Move[]> {
    await this.initSolver();
    const r = await this.request({ type: 'solve', facelets });
    if (!r.ok) throw new Error(r.error);
    if (r.type !== 'solve') throw new Error('Unexpected solver response');
    return r.moves;
  }
}

export const solver = new SolverClient();
