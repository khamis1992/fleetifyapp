import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('WhatsApp browser security boundary', () => {
  it('does not invoke the internal provider adapter from browser code', () => {
    const monitor = readSource('src/components/whatsapp/WhatsAppMonitor.tsx');
    const notifications = readSource('src/services/NotificationService.ts');

    expect(monitor).not.toContain("functions.invoke('send-whatsapp-reminders'");
    expect(notifications).not.toContain("functions.invoke('send-whatsapp-reminders'");
    expect(monitor).toContain('الإرسال اليدوي المباشر معطل أمنياً');
    expect(notifications).toContain('إرسال إيصالات واتساب من المتصفح معطل');
  });
});
