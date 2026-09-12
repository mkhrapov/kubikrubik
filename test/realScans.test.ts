import { describe, expect, it } from 'vitest';
import { validateFacelets, type Face, type Facelets } from '../src/cube';
import { classifyStickers } from '../src/scan/colorClassify';
import { REAL_SCANS } from './fixtures/realScans';

describe('classifyStickers on real webcam scans', () => {
  for (const scan of REAL_SCANS) {
    it(`${scan.name}: ground truth is a legal cube`, () => {
      expect(validateFacelets(scan.truth.split('') as Face[])).toEqual({ ok: true });
    });

    it(`${scan.name}: every usable sticker is classified correctly`, () => {
      const result = classifyStickers(scan.samples);
      const truth = scan.truth.split('') as Facelets;
      const wrong = result.facelets
        .map((f, i) => (f !== truth[i] && !scan.knownBad.includes(i) ? i : -1))
        .filter((i) => i >= 0);
      expect(wrong, `misclassified indices: ${wrong.join(', ')}`).toEqual([]);
    });
  }
});
