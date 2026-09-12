import { describe, expect, it } from 'vitest';
import { sampleGrid } from '../src/scan/capture';

function makeImage(size: number, paint: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data } as ImageData;
}

describe('sampleGrid', () => {
  it('reads the color of each cell', () => {
    const img = makeImage(90, (x, y) => [Math.floor(x / 30) * 100, Math.floor(y / 30) * 100, 7]);
    const colors = sampleGrid(img);
    expect(colors).toHaveLength(9);
    expect(colors[0]).toEqual([0, 0, 7]);
    expect(colors[2]).toEqual([200, 0, 7]);
    expect(colors[6]).toEqual([0, 200, 7]);
    expect(colors[8]).toEqual([200, 200, 7]);
  });

  it('ignores glare covering half of a cell', () => {
    // A bluish-white reflection covers the left half of the inner region of every cell.
    const img = makeImage(90, (x) => (x % 30 < 15 ? [220, 235, 240] : [200, 30, 40]));
    for (const c of sampleGrid(img)) expect(c).toEqual([200, 30, 40]);
  });

  it('ignores specular highlights and cell borders', () => {
    const img = makeImage(90, (x, y) => {
      const cx = x % 30;
      const cy = y % 30;
      if (cx < 3 || cy < 3 || cx > 26 || cy > 26) return [0, 0, 0]; // black gaps
      if (cx > 12 && cx < 17 && cy > 12 && cy < 17) return [255, 255, 255]; // glare spot
      return [200, 30, 40];
    });
    for (const c of sampleGrid(img)) expect(c).toEqual([200, 30, 40]);
  });
});
