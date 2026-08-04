import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/send-whatsapp-reminders/index.ts'),
  'utf8',
);

describe('send-whatsapp-reminders security', () => {
  it('loads provider credentials from function secrets', () => {
    expect(source).toContain("Deno.env.get('ULTRAMSG_INSTANCE_ID')");
    expect(source).toContain("Deno.env.get('ULTRAMSG_TOKEN')");
    expect(source).not.toMatch(/const ULTRAMSG_TOKEN = '[^']+'/);
    expect(source).not.toMatch(/const ULTRAMSG_INSTANCE_ID = 'instance[^']+'/);
  });

  it('allows only an internal service or configured agent secret', () => {
    expect(source).toContain('authorizeInternalWhatsAppRequest(req)');
    expect(source).toContain("req.method !== 'POST'");
    expect(source).toContain('authorization === `Bearer ${serviceRoleKey}`');
    expect(source).toContain('agentSecret === configuredSecret');
  });

  it('disables the legacy bulk path in favor of the idempotent reminder worker', () => {
    expect(source).toContain('Legacy bulk sender disabled; use process-payment-reminders');
    expect(source).toContain('status: 410');
  });
});
