import type { Face, Facelets, Move } from './cube';
import type { RGB } from './scan/capture';
import { clear } from './ui/components';
import { mountFollowScreen } from './ui/followScreen';
import { mountReviewScreen } from './ui/reviewScreen';
import { mountScanScreen } from './ui/scanScreen';

export type AppState =
  | { screen: 'scan' }
  | {
      screen: 'review';
      facelets: Facelets;
      faceColors: RGB[];
      confidence?: number[];
      /** Captured photo (data URL) of each face, when the cube was scanned. */
      photos?: Record<Face, string>;
    }
  | { screen: 'follow'; facelets: Facelets; faceColors: RGB[]; moves: Move[] };

export type Unmount = () => void;

const STATE_KEY = 'kubikrubik.state';

/** Last non-scan state, so a reload (common on phones) doesn't lose the scan. */
export function loadPersistedState(): AppState | undefined {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return undefined;
    const state = JSON.parse(raw) as AppState;
    return state.screen === 'review' || state.screen === 'follow' ? state : undefined;
  } catch {
    return undefined;
  }
}

function persistState(state: AppState): void {
  try {
    if (state.screen === 'scan') sessionStorage.removeItem(STATE_KEY);
    else sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable or full */
  }
}

export class App {
  private unmount: Unmount | undefined;

  constructor(private root: HTMLElement) {}

  /** Saves state without re-rendering (e.g. edits made inside a screen). */
  persist(state: AppState): void {
    persistState(state);
  }

  go(state: AppState): void {
    persistState(state);
    this.unmount?.();
    clear(this.root);
    const container = document.createElement('div');
    container.className = `screen screen-${state.screen}`;
    this.root.appendChild(container);
    switch (state.screen) {
      case 'scan':
        this.unmount = mountScanScreen(container, this);
        break;
      case 'review':
        this.unmount = mountReviewScreen(container, this, state);
        break;
      case 'follow':
        this.unmount = mountFollowScreen(container, this, state);
        break;
    }
  }
}
