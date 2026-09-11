/**
 * Minimal typings for the subset of `cubejs` (CommonJS, untyped) that we use.
 * Facelet strings follow the same U R F D L B order as our `Facelets` type.
 */
declare module 'cubejs' {
  class Cube {
    constructor(state?: unknown);
    static fromString(facelets: string): Cube;
    static random(): Cube;
    static inverse(alg: string): string;
    /** Builds the two-phase move/pruning tables; slow (seconds), call once. */
    static initSolver(): void;
    asString(): string;
    isSolved(): boolean;
    move(alg: string): this;
    randomize(): this;
    clone(): Cube;
    /** Returns a space-separated solution, or null when none is found within maxDepth. */
    solve(maxDepth?: number): string | null;
  }
  export = Cube;
}
