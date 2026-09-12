import { describe, expect, it } from 'vitest';
import { expectedFaceColors } from '../src/scan/scheme';

describe('expectedFaceColors', () => {
  it('returns the reference coloring for white top / green front', () => {
    expect(expectedFaceColors({ scheme: 'western', top: 'white', front: 'green' })).toEqual({
      U: 'white',
      D: 'yellow',
      F: 'green',
      B: 'blue',
      R: 'red',
      L: 'orange',
    });
    expect(expectedFaceColors({ scheme: 'japanese', top: 'white', front: 'green' })).toEqual({
      U: 'white',
      D: 'blue',
      F: 'green',
      B: 'yellow',
      R: 'red',
      L: 'orange',
    });
  });

  it('keeps handedness when the cube is held differently', () => {
    // Western, yellow on top, green in front: red must be on the LEFT.
    expect(expectedFaceColors({ scheme: 'western', top: 'yellow', front: 'green' })).toEqual({
      U: 'yellow',
      D: 'white',
      F: 'green',
      B: 'blue',
      R: 'orange',
      L: 'red',
    });
    // Western, green on top, white in front.
    expect(expectedFaceColors({ scheme: 'western', top: 'green', front: 'white' })).toMatchObject({
      U: 'green',
      D: 'blue',
      F: 'white',
      B: 'yellow',
      R: 'orange',
      L: 'red',
    });
  });

  it('rejects opposite or identical top/front colors', () => {
    expect(
      expectedFaceColors({ scheme: 'western', top: 'white', front: 'yellow' }),
    ).toBeUndefined();
    expect(expectedFaceColors({ scheme: 'japanese', top: 'white', front: 'blue' })).toBeUndefined();
    expect(expectedFaceColors({ scheme: 'western', top: 'red', front: 'red' })).toBeUndefined();
  });
});
