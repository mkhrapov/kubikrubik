export type RGB = readonly [number, number, number];

export interface Square {
  x: number;
  y: number;
  size: number;
}

/** Fraction of the shorter side of the preview that the 3×3 grid overlay spans. */
export const GRID_FRACTION = 0.62;

/**
 * The grid overlay is a centered square spanning GRID_FRACTION of the shorter
 * displayed side. The <video> uses object-fit: cover, so this maps that square
 * back into intrinsic video pixels.
 */
export function gridSquareInVideoPixels(video: HTMLVideoElement): Square {
  const { videoWidth: vw, videoHeight: vh, clientWidth: cw, clientHeight: ch } = video;
  const scale = Math.max(cw / vw, ch / vh); // cover
  const displayedW = vw * scale;
  const displayedH = vh * scale;
  const cropX = (displayedW - cw) / 2; // CSS px hidden on the left
  const cropY = (displayedH - ch) / 2;
  const sideCss = Math.min(cw, ch) * GRID_FRACTION;
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
  /** Data URL of the cropped grid square, for the review thumbnail. */
  thumbnail: string;
}

/**
 * Samples the average color of the central part of each of the 9 grid cells.
 * `region` is in intrinsic pixels of `source`.
 */
export function captureFace(
  source: CanvasImageSource,
  region: Square,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
): FaceCapture {
  const SIZE = 240;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.drawImage(source, region.x, region.y, region.size, region.size, 0, 0, SIZE, SIZE);
  const colors = sampleGrid(ctx.getImageData(0, 0, SIZE, SIZE));
  return { colors, thumbnail: canvas.toDataURL('image/jpeg', 0.7) };
}

/** Mean RGB of the inner 40% of each cell of a 3×3 grid covering `image`. */
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
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * image.width + x) * 4;
          r += image.data[i]!;
          g += image.data[i + 1]!;
          b += image.data[i + 2]!;
          n++;
        }
      }
      out.push([r / n, g / n, b / n]);
    }
  }
  return out;
}

export function rgbToCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
