import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readWorkflow = (name: string) => readFileSync(
  resolve(process.cwd(), `.github/workflows/${name}`),
  'utf8',
);

const readProjectFile = (path: string) => readFileSync(
  resolve(process.cwd(), path),
  'utf8',
);

describe('invoice automation workflows', () => {
  it('runs canonical invoice generation monthly and fails on partial results', () => {
    const workflow = readWorkflow('scheduled-invoice-generation.yml');

    expect(workflow).toContain('cron: "0 9 28 * *"');
    expect(workflow).toContain('secrets.SUPABASE_URL');
    expect(workflow).toContain('secrets.INVOICE_GENERATOR_SECRET');
    expect(workflow).toContain('/functions/v1/generate-monthly-invoices');
    expect(workflow).toContain('(.success == true) and ((.results.failed // 0) == 0)');
    expect(workflow).toContain('for ((iteration = 1; iteration <= max_iterations; iteration++))');
    expect(workflow).toContain('afterContractId');
    expect(workflow).toContain('.continuation.hasMore');
    expect(workflow).toContain('continuation cursor did not advance');
    expect(workflow).toContain('exceeded $max_iterations batches');
    expect(workflow).toContain('concurrency:');
  });

  it('runs reminders daily and fails when any reminder error is reported', () => {
    const workflow = readWorkflow('daily-payment-reminders.yml');

    expect(workflow).toContain('cron: "0 9 * * *"');
    expect(workflow).toContain('secrets.SUPABASE_URL');
    expect(workflow).toContain('secrets.PAYMENT_REMINDERS_SECRET');
    expect(workflow).toContain('/functions/v1/process-payment-reminders');
    expect(workflow).toContain('(.success == true)');
    expect(workflow).toContain('(.results.errors // [])');
    expect(workflow).toContain('for ((iteration = 1; iteration <= max_iterations; iteration++))');
    expect(workflow).toContain('upcomingAfterInvoiceId');
    expect(workflow).toContain('overdueAfterInvoiceId');
    expect(workflow).toContain('.continuation.upcoming.hasMore');
    expect(workflow).toContain('.continuation.overdue.hasMore');
    expect(workflow).toContain('exceeded $max_iterations batches');
    expect(workflow).toContain('concurrency:');
  });

  it('keeps each monthly generator invocation bounded and resumable', () => {
    const source = readProjectFile(
      'supabase/functions/generate-monthly-invoices/index.ts',
    );

    expect(source).toContain('afterContractId?: string');
    expect(source).toContain('MAX_BATCH_SIZE = 200');
    expect(source).toContain('.limit(batchSize + 1)');
    expect(source).toContain('query.gt("id", afterContractId)');
    expect(source).toContain('page.slice(0, batchSize)');
    expect(source).toContain('afterContractId: contractBatch.nextAfterContractId');
    expect(source).toContain('data?.success !== true');
    expect(source).not.toContain('for (let from = 0; ; from += pageSize)');
  });
});
