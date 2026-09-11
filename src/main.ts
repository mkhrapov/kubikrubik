import { App } from './app';
import { applyMoves, parseMoves, solvedFacelets } from './cube';
import { solver } from './solver/solver';
import { DEFAULT_FACE_COLORS } from './ui/palette';

// Table generation takes a few seconds; start it now so solving is instant later.
solver.initSolver().catch((e: unknown) => console.warn('Solver init failed', e));

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const app = new App(root);

// Dev shortcut: rubik_cube.html?scramble=R%20U%20F' skips the camera and opens
// the review screen with that scramble applied to a solved cube.
const scramble = import.meta.env.DEV ? new URLSearchParams(location.search).get('scramble') : null;
if (scramble !== null) {
  app.go({
    screen: 'review',
    facelets: applyMoves(solvedFacelets(), parseMoves(scramble)),
    faceColors: DEFAULT_FACE_COLORS,
  });
} else {
  app.go({ screen: 'scan' });
}
