const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type InclusivePaginationRange = {
  from: number;
  to: number;
};

export function getUtcDayNumber(now: Date = new Date()): number {
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new RangeError("now must be a valid date");
  }

  return Math.floor(timestamp / MILLISECONDS_PER_DAY);
}

/**
 * Builds an inclusive, fixed-size window that advances once per UTC day.
 * A window that crosses the end of the ordered result set is split into two
 * ranges so the caller can fetch the tail followed by the wrapped head.
 */
export function buildDailyRotatingRanges(
  totalCount: number,
  requestedLimit: number,
  utcDayNumber: number,
): InclusivePaginationRange[] {
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new RangeError("totalCount must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit <= 0) {
    throw new RangeError("requestedLimit must be a positive safe integer");
  }
  if (!Number.isSafeInteger(utcDayNumber)) {
    throw new RangeError("utcDayNumber must be a safe integer");
  }
  if (totalCount === 0) return [];

  const windowSize = Math.min(requestedLimit, totalCount);
  const start = ((utcDayNumber * windowSize) % totalCount + totalCount) % totalCount;
  const inclusiveEnd = start + windowSize - 1;

  if (inclusiveEnd < totalCount) {
    return [{ from: start, to: inclusiveEnd }];
  }

  return [
    { from: start, to: totalCount - 1 },
    { from: 0, to: inclusiveEnd - totalCount },
  ];
}
