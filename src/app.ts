import type { Facelets, Move } from './cube';
import type { RGB } from './scan/capture';
import { clear } from './ui/components';
import { mountFollowScreen } from './ui/followScreen';
import { mountReviewScreen } from './ui/reviewScreen';
import { mountScanScreen } from './ui/scanScreen';

export type AppState =
  | { screen: 'scan' }
  | { screen: 'review'; facelets: Facelets; faceColors: RGB[]; confidence?: number[] }
  | { screen: 'follow'; facelets: Facelets; faceColors: RGB[]; moves: Move[] };

export type Unmount = () => void;

export class App {
  private unmount: Unmount | undefined;

  constructor(private root: HTMLElement) {}

  go(state: AppState): void {
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
