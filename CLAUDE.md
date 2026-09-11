# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**kubikrubik** — a no-backend single-page web app (vanilla TypeScript + Vite) that solves a
_physical_ Rubik's cube: camera scan → editable net → Kociemba solve (`cubejs`) → animated 3D
move-by-move instructions (Three.js). Apache 2.0.

## Commands

```sh
npm run dev          # Vite dev server; open http://localhost:5173/rubik_cube.html
npm test             # vitest run (all tests in test/)
npx vitest run test/moves.test.ts        # single test file
npx vitest run -t "matches cubejs"       # single test by name
npm run typecheck    # tsc --noEmit (src + test); vite.config.ts uses tsconfig.node.json
npm run lint         # eslint (flat config, typescript-eslint, prettier-compatible)
npm run format       # prettier --write .
npm run build        # typecheck + vite build → dist/
```

Dev shortcut: `rubik_cube.html?scramble=<alg>` (DEV builds only) jumps straight to the review
screen with that scramble, bypassing the camera. Useful for exercising review/follow screens.

## Hosting constraints (why things look the way they do)

- The app is deployed into a **subfolder of another static site whose host cannot serve
  `index.html`**. Hence the entry file is `rubik_cube.html`; `vite.config.ts` sets `base: './'`
  and uses that file as the rollup input. Never introduce an `index.html` or absolute (`/assets/...`) URLs.
- The solver Web Worker is created with `new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })`
  so Vite emits it with a relative URL that works from any subfolder.
- Camera needs a secure context; the host must be HTTPS.

## Architecture

```
src/cube/      Pure domain, no DOM/deps. Facelets = Face[54] in Kociemba order (see below).
               moves.ts (facelet cycles per face), notation.ts, validate.ts (legal-state check),
               net.ts (index ↔ (face,row,col) and ↔ 3D cubie position).
src/scan/      camera.ts (getUserMedia), capture.ts (grid → 9 RGB samples), colorClassify.ts
               (54 RGB → Facelets, seeded by the 6 centers, 9-per-color constraint), protocol.ts
               (capture order + user instructions).
src/solver/    kociemba.ts wraps cubejs; solver.worker.ts runs it off-thread; solver.ts is the
               Promise client (init kicked off in main.ts at page load — table build takes seconds).
src/viewer/    cubeView.ts: Three.js cube; a move is animated by rotating a pivot group, then the
               cubies snap back and stickers are recolored from the new Facelets (cubies never
               permanently move).
src/ui/        scanScreen / reviewScreen / followScreen + tiny DOM helpers; src/app.ts is the
               screen state machine (scan → review → follow).
test/          Vitest. test/moves.test.ts cross-checks every move against cubejs; solver.test.ts
               proves cubejs solutions applied with our own move engine solve random cubes.
```

### Invariants worth knowing

- **Facelet order is Kociemba's: U R F D L B, 9 per face, row-major as seen in the standard net
  (U above F, L F R B in a row, D below F).** `cubejs`, `moves.ts`, `validate.ts`, `net.ts`, the
  scan protocol and the review net all depend on this. `cubejs.fromString` maps _colors to faces via
  the centers_, so facelets always hold face letters, never colors.
- **Scan order is F, R, B, L, U, D** with the same face kept on top; U is captured by tilting the
  top toward the camera, D by tilting the bottom toward the camera. With that protocol every
  captured 3×3 grid maps to the net row-by-row with no rotation. Changing instructions or order
  requires revisiting `scan/protocol.ts` _and_ `scanScreen.ts`'s `onReview`.
- The camera preview must never be CSS-mirrored (it would flip the grid mapping).
- 3D coordinates: +x = R, +y = U, +z = F. A clockwise turn (as seen from outside a face) is a
  negative rotation about that face's outward normal.
- `cubejs` is CommonJS with no types (`src/solver/cubejs.d.ts`). Its `lib/solve.js` reads
  top-level `this.Cube`, which is `undefined` in ESM — `vite.config.ts` has a `patchCubejs` plugin
  applied to the main build, the **worker sub-build** (`worker.plugins`) and dev pre-bundling
  (`optimizeDeps.rolldownOptions.plugins`). cubejs also declares a useless runtime dependency on
  `npm@6`; `package.json` `overrides` replaces it with an empty package.
- `[hidden] { display: none !important }` is in `styles.css` because several elements have their
  own `display` rules; use `el.hidden = …` to toggle visibility.
