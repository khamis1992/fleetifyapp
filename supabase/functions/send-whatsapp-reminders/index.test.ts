import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/send-whatsapp-reminders/index.ts'),
  'utf8',
);

describe('send-whatsapp-reminders security', () => {
  it('loads provider credentials from function secrets', () => {
    expect(source).toContain('Deno.env.get("ULTRAMSG_INSTANCE_ID")');
    expect(source).toContain('Deno.env.get("ULTRAMSG_TOKEN")');
    expect(source).not.toMatch(/providerToken\s*=\s*['"][^'"]+['"]/);
    expect(source).not.toMatch(/instanceId\s*=\s*['"]instance[^'"]+['"]/);
  });

  it('separates the service adapter from audited interactive commands', () => {
    expect(source).toContain('isServiceRoleRequest(req)');
    expect(source).toContain('authorizePrivilegedCompanyActor');
    expect(source).toContain('purposePolicy');
    expect(source).toContain('assertEntityOwnership');
    expect(source).toContain('outbound_whatsapp_commands');
    expect(source).toContain('dedupeKey');
    expect(source).toContain('.eq("status", "pending")');
    expect(source).toContain('Leaving it pending activates the partial unique index');
    expect(source).toMatch(/catch \(error\) \{[\s\S]{0,500}throw error;\s*\}\s*const providerPayload/);
    expect(source).not.toContain('console.log(phone');
    expect(source).not.toContain('console.log(message');
  });

  it('disables the legacy bulk path in favor of the idempotent reminder worker', () => {
    expect(source).toContain('Legacy bulk sender disabled; use process-payment-reminders');
    expect(source).toContain('}, 410)');
  });
});
