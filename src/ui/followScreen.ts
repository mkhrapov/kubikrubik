import type { App, AppState, Unmount } from '../app';
import { applyMove, formatMove, isSolved, type Facelets, type Move } from '../cube';
import { CubeView } from '../viewer/cubeView';
import { button, clear, el } from './components';
import { FACE_LABEL, brighten, faceColorMap } from './palette';

type FollowState = Extract<AppState, { screen: 'follow' }>;

function describeMove(move: Move): string {
  const face = FACE_LABEL[move.face].toUpperCase();
  if (move.turns === 2) return `Turn the ${face} face a half turn (180°).`;
  const dir = move.turns === 1 ? 'clockwise' : 'counter-clockwise';
  return `Turn the ${face} face ${dir} a quarter turn, as if you were looking straight at that face.`;
}

/**
 * Plays the solution one move at a time on a 3D cube. `states[k]` is the cube
 * before move k, so Prev/Next just animate between neighboring states.
 */
export function mountFollowScreen(container: HTMLElement, app: App, state: FollowState): Unmount {
  const { moves } = state;
  const states: Facelets[] = [state.facelets];
  for (const m of moves) states.push(applyMove(states[states.length - 1]!, m));
  const colors = faceColorMap(state.faceColors.map((c) => brighten(c)));
  // `index` is the move currently shown (0-based); the 3D cube displays the
  // state *after* it, i.e. states[index + 1]. index === moves.length = finished.
  let index = 0;
  let busy = false;
  /** Whether the current move has been animated yet (the first waits for a click). */
  let played = false;

  const viewport = el('div', { class: 'viewport' });
  const view = new CubeView(viewport, states[0]!, colors);

  const holdHint = el(
    'p',
    { class: 'hold-hint' },
    'Hold the cube with ',
    el('i', { class: 'swatch', style: { background: colors.U } }),
    ' on top and ',
    el('i', { class: 'swatch', style: { background: colors.F } }),
    ' facing you.',
  );
  const progress = el('div', { class: 'step-label' });
  const moveLabel = el('div', { class: 'move-label' });
  const moveText = el('p', { class: 'instruction' });
  const sequence = el('div', { class: 'sequence' });

  const prevBtn = button('← Prev', () => void goTo(index - 1));
  const replayBtn = button('Replay', () => void play(index));
  const nextBtn = button('Next →', () => void (played ? goTo(index + 1) : play(index)), {
    primary: true,
  });
  const restartBtn = button('Scan another cube', () => app.go({ screen: 'scan' }), {
    primary: true,
  });

  container.append(
    el('header', { class: 'panel' }, holdHint, progress, moveLabel, moveText),
    viewport,
    el(
      'footer',
      { class: 'panel' },
      sequence,
      el('div', { class: 'actions' }, prevBtn, replayBtn, nextBtn, restartBtn),
    ),
  );
  render();

  /** Animates move k from the state before it. */
  async function play(k: number): Promise<void> {
    if (busy || k < 0 || k >= moves.length) return;
    busy = true;
    render();
    view.setFacelets(states[k]!);
    await view.animateMove(moves[k]!, states[k + 1]!);
    played = true;
    busy = false;
    render();
  }

  async function goTo(k: number): Promise<void> {
    if (busy || k < 0 || k > moves.length) return;
    index = k;
    if (k === moves.length) {
      view.setFacelets(states[k]!);
      render();
      return;
    }
    await play(k);
  }

  function render(): void {
    const finished = index >= moves.length;
    if (moves.length === 0) {
      progress.textContent = '';
      moveLabel.textContent = isSolved(state.facelets) ? '✓' : '';
      moveText.textContent = 'This cube is already solved.';
    } else if (finished) {
      progress.textContent = `All ${moves.length} moves done`;
      moveLabel.textContent = '🎉';
      moveText.textContent = 'Solved! Your cube should now match the picture.';
    } else {
      const m = moves[index]!;
      progress.textContent = `Move ${index + 1} of ${moves.length}`;
      moveLabel.textContent = formatMove(m);
      moveText.textContent = played
        ? describeMove(m)
        : `${describeMove(m)} Press “Show move” to see it on the cube.`;
    }
    prevBtn.hidden = replayBtn.hidden = nextBtn.hidden = moves.length === 0;
    restartBtn.hidden = !finished && moves.length > 0;
    nextBtn.textContent = !played
      ? 'Show move ▶'
      : index === moves.length - 1
        ? 'Done ✓'
        : 'Done, next →';
    replayBtn.hidden = replayBtn.hidden || !played;
    prevBtn.disabled = busy || index === 0;
    nextBtn.disabled = busy || finished;
    replayBtn.disabled = busy || finished;

    clear(sequence);
    moves.forEach((m, i) => {
      sequence.append(
        el(
          'span',
          {
            class: ['seq-move', i < index && 'is-done', i === index && 'is-current']
              .filter(Boolean)
              .join(' '),
          },
          formatMove(m),
        ),
      );
    });
    sequence.querySelector('.is-current')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  return () => view.dispose();
}
