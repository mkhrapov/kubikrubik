import type { App, Unmount } from '../app';
import { FACES, solvedFacelets } from '../cube';
import { CameraError, startCamera, type CameraSession } from '../scan/camera';
import { captureFace, gridSquareInVideoPixels, rgbToCss, type FaceCapture } from '../scan/capture';
import { classifyStickers } from '../scan/colorClassify';
import { SCAN_STEPS } from '../scan/protocol';
import { button, clear, el } from './components';
import { DEFAULT_FACE_COLORS } from './palette';

/**
 * Step-by-step camera capture of the six faces. Samples are collected per
 * step and classified into face letters only once all six are in, because
 * classification uses the six center stickers as color references.
 */
export function mountScanScreen(container: HTMLElement, app: App): Unmount {
  const captures: (FaceCapture | undefined)[] = Array<FaceCapture | undefined>(6).fill(undefined);
  let step = 0;
  let session: CameraSession | undefined;
  let facing: 'environment' | 'user' = 'environment';
  let disposed = false;

  const video = el('video', { autoplay: true, playsinline: true, muted: true, class: 'preview' });
  const grid = el(
    'div',
    { class: 'grid-overlay', 'aria-hidden': 'true' },
    ...Array.from({ length: 9 }, () => el('div', { class: 'grid-cell' })),
  );
  const cameraMessage = el('div', { class: 'camera-message', hidden: true });
  const stage = el('div', { class: 'stage' }, video, grid, cameraMessage);

  const stepLabel = el('div', { class: 'step-label' });
  const title = el('h1', { class: 'title' });
  const instruction = el('p', { class: 'instruction' });
  const header = el('header', { class: 'panel' }, stepLabel, title, instruction);

  const thumbs = el('div', { class: 'thumbs' });
  const captureBtn = button('Capture', onCapture, { primary: true, class: 'btn-capture' });
  const reviewBtn = button('Review colors →', onReview, { primary: true });
  const flipBtn = button('Flip camera', onFlip);
  const manualBtn = button('Enter colors manually', onManual);
  const actions = el('div', { class: 'actions' }, flipBtn, captureBtn, reviewBtn, manualBtn);
  const footer = el('footer', { class: 'panel' }, thumbs, actions);

  container.append(header, stage, footer);
  render();
  void openCamera();

  async function openCamera(): Promise<void> {
    session?.stop();
    session = undefined;
    cameraMessage.hidden = true;
    try {
      session = await startCamera(video, facing);
      if (disposed) session.stop();
    } catch (e) {
      const err = e instanceof CameraError ? e : new CameraError('unknown', String(e));
      clear(cameraMessage);
      cameraMessage.append(
        el('p', {}, err.message),
        el(
          'p',
          { class: 'muted' },
          err.kind === 'denied'
            ? 'Allow camera access in your browser settings and reload, or enter the colors by hand.'
            : 'You can still enter the sticker colors by hand.',
        ),
      );
      cameraMessage.hidden = false;
    }
    render();
  }

  function onCapture(): void {
    if (!session || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    captures[step] = captureFace(video, gridSquareInVideoPixels(video));
    const next = captures.findIndex((c, i) => i > step && !c);
    step = next !== -1 ? next : captures.findIndex((c) => !c);
    if (step === -1) step = 5;
    render();
  }

  function onFlip(): void {
    facing = facing === 'environment' ? 'user' : 'environment';
    void openCamera();
  }

  function onReview(): void {
    if (captures.some((c) => !c)) return;
    // Captures are in scan order (F R B L U D); facelets must be in U R F D L B order.
    const byFace = new Map(SCAN_STEPS.map((s, i) => [s.face, captures[i]!]));
    const samples = FACES.flatMap((face) => byFace.get(face)!.colors);
    const result = classifyStickers(samples);
    app.go({
      screen: 'review',
      facelets: result.facelets,
      faceColors: result.faceColors,
      confidence: result.confidence,
    });
  }

  function onManual(): void {
    app.go({ screen: 'review', facelets: solvedFacelets(), faceColors: DEFAULT_FACE_COLORS });
  }

  function render(): void {
    const s = SCAN_STEPS[step]!;
    const done = captures.filter(Boolean).length;
    stepLabel.textContent = `Face ${step + 1} of 6 · ${done} captured`;
    title.textContent = s.title;
    instruction.textContent = s.instruction;
    captureBtn.disabled = !session;
    captureBtn.textContent = captures[step] ? 'Retake' : 'Capture';
    reviewBtn.hidden = done < 6;
    captureBtn.hidden = done >= 6 && !captures[step];

    clear(thumbs);
    SCAN_STEPS.forEach((st, i) => {
      const cap = captures[i];
      const swatch = el(
        'div',
        { class: 'mini-grid' },
        ...Array.from({ length: 9 }, (_, k) =>
          el('span', { style: { background: cap ? rgbToCss(cap.colors[k]!) : 'transparent' } }),
        ),
      );
      thumbs.append(
        el(
          'button',
          {
            type: 'button',
            class: ['thumb', i === step && 'is-current', cap && 'is-done']
              .filter(Boolean)
              .join(' '),
            onclick: () => {
              step = i;
              render();
            },
            title: st.title,
          },
          swatch,
          el('span', { class: 'thumb-label' }, st.face),
        ),
      );
    });
  }

  return () => {
    disposed = true;
    session?.stop();
  };
}
