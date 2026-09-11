import { describe, expect, it } from 'vitest';
import {
  FACES,
  applyMove,
  cubiePositionOfSticker,
  faceletIndex,
  solvedFacelets,
  stickerIndexAt,
  stickerPosition,
} from '../src/cube';
import { layerStickerIndices } from '../src/viewer/cubeView';

describe('net geometry', () => {
  it('faceletIndex and stickerPosition are inverses', () => {
    for (let i = 0; i < 54; i++) {
      const p = stickerPosition(i);
      expect(faceletIndex(p.face, p.row, p.col)).toBe(i);
    }
  });

  it('every sticker sits on an outer cubie facing its own face', () => {
    for (let i = 0; i < 54; i++) {
      const face = FACES[Math.floor(i / 9)]!;
      expect(stickerIndexAt(cubiePositionOfSticker(i), face)).toBe(i);
    }
  });

  it('assigns exactly 54 stickers to 26 cubies with the right counts', () => {
    const perCubie = new Map<string, number>();
    for (let i = 0; i < 54; i++) {
      const key = cubiePositionOfSticker(i).join(',');
      perCubie.set(key, (perCubie.get(key) ?? 0) + 1);
    }
    expect(perCubie.size).toBe(26);
    const counts = [...perCubie.values()].sort();
    expect(counts.filter((c) => c === 1)).toHaveLength(6);
    expect(counts.filter((c) => c === 2)).toHaveLength(12);
    expect(counts.filter((c) => c === 3)).toHaveLength(8);
  });

  it('a face turn only changes stickers in that layer', () => {
    for (const face of FACES) {
      const before = solvedFacelets();
      const after = applyMove(applyMove(before, { face: 'R', turns: 1 }), { face, turns: 1 });
      const mid = applyMove(before, { face: 'R', turns: 1 });
      const layer = new Set(layerStickerIndices(face));
      expect(layer.size).toBe(21);
      for (let i = 0; i < 54; i++) {
        if (!layer.has(i)) expect(after[i], `${face} moved sticker ${i}`).toBe(mid[i]);
      }
    }
  });
});
