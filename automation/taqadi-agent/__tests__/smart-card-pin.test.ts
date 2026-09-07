import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmSmartCardAuthenticationSucceeded,
  reserveSmartCardPinSubmission,
  startWindowsSmartCardPinHelper,
} from '../smart-card-pin';

vi.mock('node:child_process', () => {
  const spawn = vi.fn();
  return { spawn, default: { spawn } };
});

describe('smart-card submission coordination', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  const child = () => Object.assign(new EventEmitter(), {
    stdin: Object.assign(new PassThrough(), { write: vi.fn(), end: vi.fn() }),
    stdout: new PassThrough(),
    kill: vi.fn(),
    unref: vi.fn(),
  });
  let native: ReturnType<typeof child>;

  beforeEach(() => {
    confirmSmartCardAuthenticationSucceeded();
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    vi.stubEnv('VITEST', '');
    native = child();
    vi.mocked(spawn).mockReturnValue(native as unknown as ReturnType<typeof spawn>);
  });
  afterEach(() => {
    Object.defineProperty(process, 'platform', platform);
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('does not spend a PIN attempt when the helper finds no native dialog', () => {
    const helper = startWindowsSmartCardPinHelper('fixture-pin')!;
    native.emit('exit', 2);
    expect(helper.status).toBe('not-applicable');
    expect(reserveSmartCardPinSubmission()).toBe(true);
    expect(reserveSmartCardPinSubmission()).toBe(true);
    expect(reserveSmartCardPinSubmission()).toBe(false);
    expect(native.stdin.write).not.toHaveBeenCalled();
  });

  it('cancels the native writer before the web form submits, even with a late dialog', () => {
    const helper = startWindowsSmartCardPinHelper('fixture-pin')!;
    expect(helper.cancel()).toBe(false);
    native.stdout.emit('data', Buffer.from('pin-ready\n'));
    expect(native.stdin.write).not.toHaveBeenCalled();
    expect(reserveSmartCardPinSubmission()).toBe(true);
    expect(reserveSmartCardPinSubmission()).toBe(true);
  });

  it('authorizes one native submission and tells the web writer to stand down', () => {
    const helper = startWindowsSmartCardPinHelper('fixture-pin')!;
    native.stdout.emit('data', Buffer.from('pin-'));
    native.stdout.emit('data', Buffer.from('ready\r\n'));
    native.stdout.emit('data', Buffer.from('pin-ready\n'));
    expect(helper.status).toBe('submitted');
    expect(helper.cancel()).toBe(true);
    expect(native.stdin.write).toHaveBeenCalledExactlyOnceWith('submit\n');
    expect(reserveSmartCardPinSubmission()).toBe(true);
    expect(reserveSmartCardPinSubmission()).toBe(false);
  });

  it('blocks the third unconfirmed submission and never sends the PIN permission', () => {
    reserveSmartCardPinSubmission();
    reserveSmartCardPinSubmission();
    const helper = startWindowsSmartCardPinHelper('fixture-pin')!;
    expect(helper.status).toBe('watching');
    native.stdout.emit('data', Buffer.from('pin-ready\n'));
    expect(helper.status).toBe('limit-reached');
    expect(native.stdin.write).not.toHaveBeenCalled();
    expect(native.kill).toHaveBeenCalled();
  });

  it('allows subsequent logins only after a successful authentication is confirmed', () => {
    reserveSmartCardPinSubmission();
    reserveSmartCardPinSubmission();
    expect(reserveSmartCardPinSubmission()).toBe(false);
    confirmSmartCardAuthenticationSucceeded();
    expect(reserveSmartCardPinSubmission()).toBe(true);
  });
});
