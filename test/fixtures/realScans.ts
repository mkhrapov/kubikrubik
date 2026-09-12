import type { RGB } from '../../src/scan/capture';

/**
 * Real scans captured with a laptop webcam under warm indoor light, with the
 * user's manual corrections as ground truth. Facelet strings are in U R F D L B
 * order (face letters, not colors).
 */
export interface RealScan {
  name: string;
  samples: RGB[];
  /** Ground truth after manual correction. */
  truth: string;
  /** Indices where the sample itself is unusable (finger/glare); excluded from exact-match checks. */
  knownBad: number[];
}

export const REAL_SCANS: RealScan[] = [
  {
    name: 'scan 2 (japanese scheme, cool-ish light)',
    samples: [
      [134, 135, 140],
      [137, 139, 142],
      [12, 65, 46],
      [149, 154, 161],
      [132, 138, 149],
      [163, 154, 66],
      [111, 82, 74],
      [159, 171, 186],
      [222, 155, 175],
      [5, 69, 50],
      [175, 45, 53],
      [121, 24, 40],
      [24, 48, 136],
      [130, 37, 55],
      [128, 37, 54],
      [102, 142, 217],
      [142, 68, 91],
      [144, 71, 93],
      [1, 77, 53],
      [0, 76, 56],
      [22, 49, 132],
      [152, 164, 76],
      [16, 101, 89],
      [163, 177, 124],
      [8, 93, 75],
      [204, 75, 87],
      [165, 180, 101],
      [118, 25, 42],
      [18, 44, 133],
      [116, 32, 46],
      [8, 94, 96],
      [48, 91, 203],
      [14, 96, 94],
      [188, 53, 64],
      [132, 41, 62],
      [156, 170, 100],
      [159, 43, 46],
      [164, 44, 48],
      [160, 42, 46],
      [6, 82, 65],
      [178, 59, 63],
      [122, 37, 57],
      [168, 203, 195],
      [50, 85, 186],
      [61, 89, 185],
      [133, 140, 147],
      [141, 135, 47],
      [143, 139, 50],
      [144, 163, 183],
      [159, 164, 98],
      [192, 85, 101],
      [145, 160, 176],
      [32, 61, 149],
      [37, 67, 147],
    ],
    truth: 'UUFUUBUULFLRDRRDRRFFDBFBFLBRDRFDFLRBLLLFLRBDDUBBUBLUDD',
    knownBad: [6, 42],
  },
];
