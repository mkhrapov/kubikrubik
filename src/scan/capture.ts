export type RGB = readonly [number, number, number];

export interface Square {
  x: number;
  y: number;
  size: number;
}

/** Default fraction of the shorter side of the preview that the 3×3 grid overlay spans. */
export const DEFAULT_GRID_FRACTION = 0.62;
export const MIN_GRID_FRACTION = 0.3;
export const MAX_GRID_FRACTION = 0.95;

/**
 * The grid overlay is a centered square spanning `fraction` of the shorter
 * displayed side. The <video> uses object-fit: cover, so this maps that square
 * back into intrinsic video pixels.
 */
export function gridSquareInVideoPixels(
  video: HTMLVideoElement,
  fraction = DEFAULT_GRID_FRACTION,
): Square {
  const { videoWidth: vw, videoHeight: vh, clientWidth: cw, clientHeight: ch } = video;
  const scale = Math.max(cw / vw, ch / vh); // cover
  const displayedW = vw * scale;
  const displayedH = vh * scale;
  const cropX = (displayedW - cw) / 2; // CSS px hidden on the left
  const cropY = (displayedH - ch) / 2;
  const sideCss = Math.min(cw, ch) * fraction;
  const xCss = (cw - sideCss) / 2;
  const yCss = (ch - sideCss) / 2;
  return {
    x: (xCss + cropX) / scale,
    y: (yCss + cropY) / scale,
    size: sideCss / scale,
  };
}

/** Snapshot of the grid region, plus the 9 sampled sticker colors (row-major). */
export interface FaceCapture {
  colors: RGB[];
  /** Data URL of the cropped grid square, for the review screen. */
  thumbnail: string;
}

const SIZE = 240;

function drawRegion(
  source: CanvasImageSource,
  region: Square,
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.drawImage(source, region.x, region.y, region.size, region.size, 0, 0, SIZE, SIZE);
  return ctx;
}

/** Samples the 9 sticker colors only (cheap; used for the live preview). */
export function sampleFace(
  source: CanvasImageSource,
  region: Square,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): RGB[] {
  const ctx = drawRegion(source, region, canvas);
  return sampleGrid(ctx.getImageData(0, 0, SIZE, SIZE));
}

/** Samples the 9 sticker colors and keeps a JPEG of the region. */
export function captureFace(
  source: CanvasImageSource,
  region: Square,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): FaceCapture {
  const ctx = drawRegion(source, region, canvas);
  const colors = sampleGrid(ctx.getImageData(0, 0, SIZE, SIZE));
  return { colors, thumbnail: canvas.toDataURL('image/jpeg', 0.7) };
}

/**
 * Robust RGB of each cell of a 3×3 grid covering `image`.
 *
 * Only the inner 40% of each cell is used (sticker borders, gaps and small
 * misalignments stay out). Within it, pixels are ranked by brightness and the
 * brightest 45% and darkest 10% are discarded before taking a per-channel
 * median: specular glare (bright) and shadowed edges or grid lines (dark) are
 * the usual contaminants, and both are extreme in brightness.
 */
export function sampleGrid(image: ImageData): RGB[] {
  const cell = image.width / 3;
  const inset = cell * 0.3;
  const out: RGB[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = Math.round(col * cell + inset);
      const y0 = Math.round(row * cell + inset);
      const x1 = Math.round((col + 1) * cell - inset);
      const y1 = Math.round((row + 1) * cell - inset);
      const pixels: { r: number; g: number; b: number; luma: number }[] = [];
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * image.width + x) * 4;
          const r = image.data[i]!;
          const g = image.data[i + 1]!;
          const b = image.data[i + 2]!;
          pixels.push({ r, g, b, luma: 0.299 * r + 0.587 * g + 0.114 * b });
        }
      }
      pixels.sort((a, b) => a.luma - b.luma);
      const lo = Math.floor(pixels.length * 0.1);
      const hi = Math.max(lo + 1, Math.floor(pixels.length * 0.55));
      const kept = pixels.slice(lo, hi);
      out.push([
        median(kept.map((p) => p.r)),
        median(kept.map((p) => p.g)),
        median(kept.map((p) => p.b)),
      ]);
    }
  }
  return out;
}

function median(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function rgbToCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
