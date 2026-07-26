import { describe, expect, it } from 'vitest';
import { orderDocumentCorners } from './documentScanner';

describe('orderDocumentCorners', () => {
  it('orders shuffled corners clockwise from the top-left', () => {
    expect(
      orderDocumentCorners([
        { x: 940, y: 1320 },
        { x: 90, y: 120 },
        { x: 120, y: 1280 },
        { x: 900, y: 80 },
      ])
    ).toEqual([
      { x: 90, y: 120 },
      { x: 900, y: 80 },
      { x: 940, y: 1320 },
      { x: 120, y: 1280 },
    ]);
  });
});
