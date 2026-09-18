import { spawn } from 'node:child_process';
import path from 'node:path';

export const MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS = 2;
let smartCardPinSubmissions = 0;

export function reserveSmartCardPinSubmission() {
  if (smartCardPinSubmissions >= MAX_SMART_CARD_PIN_SUBMISSIONS_PER_PROCESS) return false;
  smartCardPinSubmissions += 1;
  return true;
}

/** Only call after this login flow has reached an authenticated portal page. */
export function confirmSmartCardAuthenticationSucceeded() {
  smartCardPinSubmissions = 0;
}

export const SMART_CARD_PIN_LIMIT_MESSAGE =
  'توقف إدخال الرقم السري تلقائيًا بعد محاولتين لم تُؤكّد نتيجتهما. لا يعني ذلك أن الرقم خاطئ. أكمل الدخول يدويًا في نافذة الوكيل، واختر حساب شركة العراف، ثم اضغط «متابعة من تقاضي».';

export interface SmartCardPinHelper {
  readonly status: 'watching' | 'submitted' | 'not-applicable' | 'limit-reached';
  /** Prevent a later native submission; true means one was already authorized. */
  cancel(): boolean;
}

export function startWindowsSmartCardPinHelper(pin: string): SmartCardPinHelper | null {
  if (process.platform !== 'win32' || process.env.VITEST || !pin) return null;

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
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    },
  );
  let status: SmartCardPinHelper['status'] = 'watching';
  let authorized = false;
  let cancelled = false;
  let output = '';
  const cancel = () => {
    cancelled = true;
    child.stdin?.end();
    child.kill();
    if (status === 'watching') status = 'not-applicable';
    return authorized;
  };
  child.stdin?.on('error', () => { /* Closing a native dialog can close stdin. */ });
  child.on('error', () => {
    if (!authorized) status = 'not-applicable';
  });
  child.on('exit', () => {
    if (status === 'watching') status = 'not-applicable';
  });
  child.stdout?.on('data', (data: Buffer) => {
    if (cancelled || status !== 'watching') return;
    output = (output + data.toString('utf8')).slice(-256);
    if (!output.split(/\r?\n/).includes('pin-ready')) return;
    // Launching the helper is not a PIN attempt. Reserve only when a real
    // native password dialog exists, immediately before authorizing entry.
    if (!reserveSmartCardPinSubmission()) {
      status = 'limit-reached';
      cancel();
      return;
    }
    authorized = true;
    status = 'submitted';
    child.stdin?.write('submit\n');
  });
  child.unref();
  return { get status() { return status; }, cancel };
}
