import type { App, Unmount } from '../app';
import { FACES, solvedFacelets, type Face } from '../cube';
import { CameraError, startCamera, type CameraSession } from '../scan/camera';
import {
  DEFAULT_GRID_FRACTION,
  MAX_GRID_FRACTION,
  MIN_GRID_FRACTION,
  captureFace,
  gridSquareInVideoPixels,
  rgbToCss,
  sampleFace,
  type FaceCapture,
  type RGB,
} from '../scan/capture';
import { classifyStickers } from '../scan/colorClassify';
import { NEIGHBORS, SCAN_STEPS, type Edge } from '../scan/protocol';
import {
  COLOR_NAMES,
  COLOR_RGB,
  expectedFaceColors,
  loadSchemeSettings,
  saveSchemeSettings,
  schemeColorsAsRgb,
  type ColorName,
  type SchemeName,
  type SchemeSettings,
} from '../scan/scheme';
import { button, clear, el } from './components';
import { DEFAULT_FACE_COLORS, FACE_LABEL } from './palette';

const GRID_FRACTION_KEY = 'kubikrubik.gridFraction';
const LIVE_SAMPLE_MS = 150;
const EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

function loadGridFraction(): number {
  try {
    const v = Number(localStorage.getItem(GRID_FRACTION_KEY));
    if (v >= MIN_GRID_FRACTION && v <= MAX_GRID_FRACTION) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_GRID_FRACTION;
}

/**
 * Step-by-step camera capture of the six faces. Samples are collected per
 * step and classified into face letters only once all six are in, because
 * classification uses the six center stickers as color references.
 *
 * Everything inside `.frame` is in true camera coordinates; for a user-facing
 * camera the whole frame is CSS-mirrored so the cube moves the way the user
 * moves it. Sampling always reads the unmirrored video.
 */
export function mountScanScreen(container: HTMLElement, app: App): Unmount {
  const captures: (FaceCapture | undefined)[] = Array<FaceCapture | undefined>(6).fill(undefined);
  let step = 0;
  let session: CameraSession | undefined;
  let facing: 'environment' | 'user' = 'environment';
  let mirrored = false;
  let gridFraction = loadGridFraction();
  let scheme: SchemeSettings = loadSchemeSettings();
  let expected = expectedFaceColors(scheme);
  let disposed = false;
  const sampleCanvas = document.createElement('canvas');

  const video = el('video', { autoplay: true, playsinline: true, muted: true, class: 'preview' });
  const cellSwatches = Array.from({ length: 9 }, () => el('span', { class: 'cell-swatch' }));
  const edgeBadges = {} as Record<Edge, HTMLElement>;
  for (const edge of EDGES) {
    edgeBadges[edge] = el('div', { class: `edge-badge edge-${edge}`, hidden: true });
  }
  const grid = el(
    'div',
    { class: 'grid-overlay', 'aria-hidden': 'true' },
    ...cellSwatches.map((sw) => el('div', { class: 'grid-cell' }, sw)),
    ...EDGES.map((e) => edgeBadges[e]),
  );
  const frame = el('div', { class: 'frame' }, video, grid);

  const sizeSlider = el('input', {
    type: 'range',
    min: String(MIN_GRID_FRACTION * 100),
    max: String(MAX_GRID_FRACTION * 100),
    value: String(Math.round(gridFraction * 100)),
    class: 'grid-size',
    'aria-label': 'Grid size',
    oninput: () => setGridFraction(Number(sizeSlider.value) / 100),
  });
  const mirrorBtn = el(
    'button',
    { type: 'button', class: 'pill-btn', onclick: () => setMirrored(!mirrored) },
    'Mirror',
  );
  const controls = el(
    'div',
    { class: 'stage-controls' },
    el('label', { class: 'pill' }, el('span', {}, 'Grid size'), sizeSlider),
    mirrorBtn,
  );
  const cameraMessage = el('div', { class: 'camera-message', hidden: true });
  const stage = el('div', { class: 'stage' }, frame, controls, cameraMessage);

  const stepLabel = el('div', { class: 'step-label' });
  const title = el('h1', { class: 'title' });
  const instruction = el('p', { class: 'instruction' });
  const tip = el(
    'p',
    { class: 'muted tip' },
    'Fill the grid with the face, avoid glare, and check that the dots match the stickers. The badges around the grid show which face color belongs on each side.',
  );
  const schemeSelect = select(
    [
      ['western', 'Western (white↔yellow)'],
      ['japanese', 'Japanese (white↔blue)'],
    ],
    scheme.scheme,
    (v) => updateScheme({ scheme: v as SchemeName }),
  );
  const topSelect = select(
    COLOR_NAMES.map((c) => [c, c]),
    scheme.top,
    (v) => updateScheme({ top: v as ColorName }),
  );
  const frontSelect = select(
    COLOR_NAMES.map((c) => [c, c]),
    scheme.front,
    (v) => updateScheme({ front: v as ColorName }),
  );
  const schemeWarning = el('span', { class: 'scheme-warning', hidden: true });
  const schemeRow = el(
    'div',
    { class: 'scheme-row' },
    el('label', {}, 'Scheme ', schemeSelect),
    el('label', {}, 'Top ', topSelect),
    el('label', {}, 'Front ', frontSelect),
    schemeWarning,
  );
  const header = el('header', { class: 'panel' }, stepLabel, title, instruction, tip, schemeRow);

  const thumbs = el('div', { class: 'thumbs' });
  const captureBtn = button('Capture', onCapture, { primary: true, class: 'btn-capture' });
  const reviewBtn = button('Review colors →', onReview, { primary: true });
  const flipBtn = button('Flip camera', onFlip);
  const manualBtn = button('Enter colors manually', onManual);
  const actions = el('div', { class: 'actions' }, flipBtn, captureBtn, reviewBtn, manualBtn);
  const footer = el('footer', { class: 'panel' }, thumbs, actions);

  container.append(header, stage, footer);
  setGridFraction(gridFraction);
  render();
  void openCamera();
  const liveTimer = window.setInterval(updateLiveSwatches, LIVE_SAMPLE_MS);

  function setGridFraction(f: number): void {
    gridFraction = f;
    stage.style.setProperty('--grid-fraction', String(f));
    try {
      localStorage.setItem(GRID_FRACTION_KEY, String(f));
    } catch {
      /* storage unavailable */
    }
  }

  function updateScheme(patch: Partial<SchemeSettings>): void {
    scheme = { ...scheme, ...patch };
    saveSchemeSettings(scheme);
    expected = expectedFaceColors(scheme);
    render();
  }

  /** Human name of a face's color per the chosen scheme, e.g. "green". */
  function colorName(face: Face): ColorName | undefined {
    return expected?.[face];
  }

  /** Best known display color of a face: captured center if any, else the scheme's color. */
  function displayColor(face: Face): RGB | undefined {
    const captured = centerColor(face);
    if (captured) return captured;
    const name = colorName(face);
    return name ? COLOR_RGB[name] : undefined;
  }

  function setMirrored(on: boolean): void {
    mirrored = on;
    frame.classList.toggle('is-mirrored', on);
    mirrorBtn.classList.toggle('is-on', on);
    mirrorBtn.setAttribute('aria-pressed', String(on));
  }

  function videoReady(): boolean {
    return !!session && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }

  /** Center color of an already-captured face, if any. */
  function centerColor(face: Face): RGB | undefined {
    const i = SCAN_STEPS.findIndex((s) => s.face === face);
    return captures[i]?.colors[4];
  }

  /** Paints what the sampler currently reads into each grid cell. */
  function updateLiveSwatches(): void {
    if (!videoReady()) return;
    const colors = sampleFace(video, gridSquareInVideoPixels(video, gridFraction), sampleCanvas);
    colors.forEach((c, i) => {
      cellSwatches[i]!.style.background = rgbToCss(c);
    });
  }

  async function openCamera(): Promise<void> {
    session?.stop();
    session = undefined;
    cameraMessage.hidden = true;
    try {
      session = await startCamera(video, facing);
      if (disposed) session.stop();
      // Laptop webcams and front phone cameras face the user: mirror so the
      // cube moves on screen the way the user moves it.
      setMirrored(session.facingMode !== 'environment');
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
    if (!videoReady()) return;
    captures[step] = captureFace(video, gridSquareInVideoPixels(video, gridFraction), sampleCanvas);
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
    // Captures are in scan order; facelets must be in U R F D L B order.
    const byFace = new Map(SCAN_STEPS.map((s, i) => [s.face, captures[i]!]));
    const samples = FACES.flatMap((face) => byFace.get(face)!.colors);
    const result = classifyStickers(samples);
    // Debug hook: inspect the last scan from the console (window.__lastScan).
    (window as unknown as { __lastScan: unknown }).__lastScan = { samples, result };
    const photos = {} as Record<Face, string>;
    for (const face of FACES) photos[face] = byFace.get(face)!.thumbnail;
    app.go({
      screen: 'review',
      facelets: result.facelets,
      faceColors: result.faceColors,
      confidence: result.confidence,
      photos,
    });
  }

  function onManual(): void {
    app.go({
      screen: 'review',
      facelets: solvedFacelets(),
      faceColors: expected ? schemeColorsAsRgb(expected) : DEFAULT_FACE_COLORS,
    });
  }

  function swatch(color: RGB): HTMLElement {
    return el('i', { class: 'swatch', style: { background: rgbToCss(color) } });
  }

  function render(): void {
    const s = SCAN_STEPS[step]!;
    const done = captures.filter(Boolean).length;
    stepLabel.textContent = `Face ${step + 1} of 6 · ${done} captured`;
    const name = colorName(s.face);
    clear(title);
    title.append(s.title);
    if (name) title.append(' — ', swatch(COLOR_RGB[name]), ` ${name}`);
    instruction.textContent = s.instruction;
    schemeWarning.hidden = !!expected;
    schemeWarning.textContent = expected
      ? ''
      : `${scheme.top} and ${scheme.front} cannot be top and front at the same time in this scheme.`;
    captureBtn.disabled = !session;
    captureBtn.textContent = captures[step] ? 'Retake' : 'Capture';
    reviewBtn.hidden = done < 6;
    captureBtn.hidden = done >= 6 && !captures[step];

    // Badges: the color of the face that belongs on each side of this one.
    for (const edge of EDGES) {
      const neighbor = NEIGHBORS[s.face][edge];
      const color = displayColor(neighbor);
      const badge = edgeBadges[edge];
      clear(badge);
      badge.hidden = !color;
      if (color) {
        const label = colorName(neighbor) ?? FACE_LABEL[neighbor];
        badge.append(el('span', { class: 'unmirror' }, swatch(color), ` ${label}`));
      }
    }

    clear(thumbs);
    SCAN_STEPS.forEach((st, i) => {
      const cap = captures[i];
      const expectedRgb = displayColor(st.face);
      const mini = el(
        'div',
        { class: 'mini-grid' },
        ...Array.from({ length: 9 }, (_, k) =>
          el('span', {
            style: {
              background: cap
                ? rgbToCss(cap.colors[k]!)
                : k === 4 && expectedRgb
                  ? rgbToCss(expectedRgb)
                  : 'transparent',
            },
          }),
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
          mini,
          el('span', { class: 'thumb-label' }, FACE_LABEL[st.face]),
          el('span', { class: 'thumb-color' }, colorName(st.face) ?? ''),
        ),
      );
    });
  }

  return () => {
    disposed = true;
    window.clearInterval(liveTimer);
    session?.stop();
  };
}

function select(
  options: ReadonlyArray<readonly [string, string]>,
  value: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const node = el(
    'select',
    { class: 'select', onchange: () => onChange(node.value) },
    ...options.map(([v, label]) => el('option', { value: v, selected: v === value }, label)),
  );
  return node;
}
