import { FACES, type Face } from '../cube';
import { rgbToCss, type RGB } from '../scan/capture';

/** Fallback sticker colors for manual entry (standard Western color scheme). */
export const DEFAULT_FACE_COLORS: RGB[] = [
  [245, 245, 245], // U white
  [196, 30, 58], // R red
  [0, 158, 96], // F green
  [255, 213, 0], // D yellow
  [255, 120, 0], // L orange
  [0, 81, 186], // B blue
];

export const FACE_LABEL: Record<Face, string> = {
  U: 'top',
  R: 'right',
  F: 'front',
  D: 'bottom',
  L: 'left',
  B: 'back',
};

export function faceColorMap(faceColors: RGB[]): Record<Face, string> {
  const map = {} as Record<Face, string>;
  FACES.forEach((face, i) => {
    map[face] = rgbToCss(faceColors[i] ?? DEFAULT_FACE_COLORS[i]!);
  });
  return map;
}

/** Nudges very dark camera samples up so stickers stay recognizable in the 3D view. */
export function brighten(rgb: RGB, minLuma = 60): RGB {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  if (luma >= minLuma) return rgb;
  const gain = Math.min(2.5, minLuma / Math.max(luma, 1));
  return [Math.min(255, rgb[0] * gain), Math.min(255, rgb[1] * gain), Math.min(255, rgb[2] * gain)];
}
