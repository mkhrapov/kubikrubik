import type { App, AppState, Unmount } from '../app';
import { FACES, validateFacelets, type Face, type Facelets } from '../cube';
import { solver } from '../solver/solver';
import { button, clear, el } from './components';
import { FACE_LABEL, faceColorMap } from './palette';

type ReviewState = Extract<AppState, { screen: 'review' }>;

/** Net position (grid column/row, 1-based) of each face's top-left sticker. */
const NET_ORIGIN: Record<Face, [number, number]> = {
  U: [4, 1],
  L: [1, 4],
  F: [4, 4],
  R: [7, 4],
  B: [10, 4],
  D: [4, 7],
};

/**
 * Lets the user check and fix the detected stickers on an unfolded net, then
 * solve. Centers are fixed (they define the colors); tapping a sticker cycles
 * it through the six colors. Solve is only enabled for a valid cube.
 */
export function mountReviewScreen(container: HTMLElement, app: App, state: ReviewState): Unmount {
  const facelets: Facelets = state.facelets.slice();
  const colors = faceColorMap(state.faceColors);
  const confidence = state.confidence;
  let solving = false;

  const net = el('div', { class: 'net' });
  const errors = el('ul', { class: 'errors' });
  const legend = el(
    'div',
    { class: 'legend' },
    ...FACES.map((f) =>
      el(
        'span',
        { class: 'legend-item' },
        el('i', { class: 'swatch', style: { background: colors[f] } }),
        FACE_LABEL[f],
      ),
    ),
  );
  const solveBtn = button('Solve', onSolve, { primary: true });
  const backBtn = button('← Rescan', () => app.go({ screen: 'scan' }));
  const status = el('p', { class: 'muted status' });

  container.append(
    el(
      'header',
      { class: 'panel' },
      el('h1', { class: 'title' }, 'Check the colors'),
      el(
        'p',
        { class: 'instruction' },
        'Tap any sticker to change its color. Dashed stickers were hard to read. Centers are fixed.',
      ),
      legend,
    ),
    el('main', { class: 'net-wrap' }, net),
    el(
      'footer',
      { class: 'panel' },
      errors,
      status,
      el('div', { class: 'actions' }, backBtn, solveBtn),
    ),
  );
  render();

  function cycle(i: number): void {
    const current = FACES.indexOf(facelets[i]!);
    facelets[i] = FACES[(current + 1) % 6]!;
    render();
  }

  async function onSolve(): Promise<void> {
    if (solving || !validateFacelets(facelets).ok) return;
    solving = true;
    solveBtn.disabled = true;
    status.textContent = 'Solving…';
    try {
      const moves = await solver.solve(facelets);
      app.go({ screen: 'follow', facelets, faceColors: state.faceColors, moves });
    } catch (e) {
      status.textContent = `Could not solve: ${e instanceof Error ? e.message : String(e)}`;
      solving = false;
      solveBtn.disabled = false;
    }
  }

  function render(): void {
    const result = validateFacelets(facelets);
    const flagged = new Set<number>(result.ok ? [] : result.errors.flatMap((e) => e.facelets));

    clear(net);
    facelets.forEach((face, i) => {
      const f = FACES[Math.floor(i / 9)]!;
      const [c0, r0] = NET_ORIGIN[f];
      const within = i % 9;
      const isCenter = within === 4;
      const classes = [
        'sticker',
        isCenter && 'is-center',
        flagged.has(i) && 'is-error',
        confidence && confidence[i]! < 0.25 && !isCenter && 'is-unsure',
      ]
        .filter(Boolean)
        .join(' ');
      net.append(
        el(
          'button',
          {
            type: 'button',
            class: classes,
            disabled: isCenter,
            'aria-label': `${FACE_LABEL[f]} face sticker ${within + 1}: ${FACE_LABEL[face]}`,
            style: {
              background: colors[face],
              gridColumn: String(c0 + (within % 3)),
              gridRow: String(r0 + Math.floor(within / 3)),
            },
            onclick: () => cycle(i),
          },
          isCenter ? f : '',
        ),
      );
    });

    clear(errors);
    if (!result.ok) {
      for (const err of result.errors) errors.append(el('li', {}, err.message));
    }
    solveBtn.disabled = !result.ok || solving;
    status.textContent = result.ok ? '' : 'Fix the highlighted stickers to continue.';
  }

  return () => {};
}
