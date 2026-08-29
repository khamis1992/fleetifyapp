import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/legal/LawsuitPreparation/index.tsx'),
  'utf8',
);

describe('one-click Taqadi filing start', () => {
  it('always enqueues a ready filing from the primary action', () => {
    expect(source).toContain("button: 'بدء إجراءات رفع الدعوى'");
    expect(source).toContain('await actions.startTaqadiAutomation();');
    expect(source).not.toMatch(/ui\.taqadiServerRunning\s*\?\s*'بدء إجراءات رفع الدعوى'/);
    expect(source).not.toMatch(/run:\s*ui\.taqadiServerRunning/);
  });

  it('explains that review, approval, and submission continue automatically', () => {
    expect(source).toContain('طابور وكيل تقاضي');
    expect(source).toContain('والإرسال');
  });
});
