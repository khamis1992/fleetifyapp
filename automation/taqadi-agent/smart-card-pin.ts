import { spawn } from 'node:child_process';
import path from 'node:path';

export const MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS = 2;
let smartCardPinSubmissions = 0;

export function reserveSmartCardPinSubmission() {
  if (smartCardPinSubmissions >= MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS) return false;
  smartCardPinSubmissions += 1;
  return true;
}

export function startWindowsSmartCardPinHelper(pin: string): 'started' | 'not-applicable' | 'limit-reached' {
  if (process.platform !== 'win32' || process.env.VITEST || !pin) return 'not-applicable';
  if (!reserveSmartCardPinSubmission()) return 'limit-reached';

  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const powershellPath = path.join(
    systemRoot,
    'System32/WindowsPowerShell/v1.0/powershell.exe',
  );
  const scriptPath = path.resolve(
    process.cwd(),
    'automation/taqadi-agent/windows/enter-smart-card-pin.ps1',
  );
  const child = spawn(
    powershellPath,
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-WindowStyle',
      'Hidden',
      '-File',
      scriptPath,
    ],
    {
      detached: false,
      // Deliberately do not pass the worker's Supabase/service credentials to
      // this narrow desktop helper.
      env: {
        SystemRoot: systemRoot,
        WINDIR: process.env.WINDIR || systemRoot,
        TEMP: process.env.TEMP || '',
        TMP: process.env.TMP || '',
        TAQADI_SMART_CARD_PIN: pin,
      },
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  child.unref();
  return 'started';
}
