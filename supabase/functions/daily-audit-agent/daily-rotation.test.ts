import { describe, expect, it } from "vitest";
import {
  buildDailyRotatingRanges,
  getUtcDayNumber,
} from "./daily-rotation.ts";

describe("daily audit contract rotation", () => {
  it("returns no ranges for an empty population", () => {
    expect(buildDailyRotatingRanges(0, 500, 20_000)).toEqual([]);
  });

  it("returns the full ordered population when it fits within the limit", () => {
    expect(buildDailyRotatingRanges(80, 500, 20_000)).toEqual([
      { from: 0, to: 79 },
    ]);
  });

  it("advances by one audit window per UTC day", () => {
    expect(buildDailyRotatingRanges(1_200, 500, 0)).toEqual([
      { from: 0, to: 499 },
    ]);
    expect(buildDailyRotatingRanges(1_200, 500, 1)).toEqual([
      { from: 500, to: 999 },
    ]);
  });

  it("splits a wrapping window into ordered tail and head ranges", () => {
    expect(buildDailyRotatingRanges(1_200, 500, 2)).toEqual([
      { from: 1_000, to: 1_199 },
      { from: 0, to: 299 },
    ]);
  });

  it("eventually covers every row when count is not divisible by the limit", () => {
    const visited = new Set<number>();

    for (let day = 0; day < 12; day += 1) {
      for (const range of buildDailyRotatingRanges(1_200, 500, day)) {
        for (let index = range.from; index <= range.to; index += 1) {
          visited.add(index);
        }
      }
    }

    expect(visited.size).toBe(1_200);
  });

  it("uses UTC day boundaries for deterministic daily selection", () => {
    expect(getUtcDayNumber(new Date("2026-08-03T00:00:00.000Z"))).toBe(
      getUtcDayNumber(new Date("2026-08-03T23:59:59.999Z")),
    );
    expect(getUtcDayNumber(new Date("2026-08-04T00:00:00.000Z"))).toBe(
      getUtcDayNumber(new Date("2026-08-03T23:59:59.999Z")) + 1,
    );
  });
});
