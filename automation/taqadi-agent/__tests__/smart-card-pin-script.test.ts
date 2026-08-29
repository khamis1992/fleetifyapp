import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS } from '../smart-card-pin';

describe('Windows smart-card PIN helper', () => {
  const script = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'automation/taqadi-agent/windows/enter-smart-card-pin.ps1',
    ),
    'utf8',
  );

  it('never types the PIN into a browser window', () => {
    expect(script).toContain("'chrome'");
    expect(script).toContain("'msedge'");
    expect(script).toContain('$window.Current.ProcessId');
    expect(script).toContain('$browserProcessNames -contains');
  });

  it('only targets a password edit control', () => {
    expect(script).toContain('IsPasswordProperty');
    expect(script).toContain('if ($isPassword -ne $true) { continue }');
  });

  it('stops before the government-card third-attempt lockout threshold', () => {
    expect(MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS).toBe(2);
  });
});
