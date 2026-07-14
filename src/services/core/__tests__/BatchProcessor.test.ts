import { describe, expect, it } from 'vitest';
import { BatchProcessor } from '../BatchProcessor';

describe('BatchProcessor', () => {
  it('waits for every concurrent chunk before returning', async () => {
    const processor = new BatchProcessor({ batchSize: 2, maxConcurrency: 2 });
    const completed: number[] = [];

    const result = await processor.processChunked(
      [1, 2, 3, 4, 5, 6],
      async (items, batchIndex) => {
        await new Promise((resolve) => setTimeout(resolve, (3 - batchIndex) * 5));
        completed.push(batchIndex);
        return items.map((item) => item * 10);
      }
    );

    expect(completed).toHaveLength(3);
    expect(result.chunks).toHaveLength(3);
    expect(result.totalResults.sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50, 60]);
    expect(result.totalErrors).toEqual([]);
  });

  it('returns stable metrics for an empty operation', async () => {
    const processor = new BatchProcessor();
    const result = await processor.process([], async () => []);

    expect(result.success).toBe(true);
    expect(result.progress.percentage).toBe(100);
    expect(result.metrics.averageBatchTime).toBe(0);
    expect(result.metrics.successRate).toBe(1);
  });
});
