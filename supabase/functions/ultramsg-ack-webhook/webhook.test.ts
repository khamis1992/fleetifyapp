import { describe, expect, it } from 'vitest';
import { parseUltramsgAcknowledgement } from './webhook.ts';

describe('Ultramsg acknowledgement webhook parsing', () => {
  it('reads a nested delivered acknowledgement and Unix timestamp', () => {
    expect(parseUltramsgAcknowledgement({
      event_type: 'message_ack',
      data: {
        message_id: 'msg-123',
        ack: 'delivered',
        timestamp: '1787821200',
      },
    })).toEqual({
      messageId: 'msg-123',
      status: 'delivered',
      eventAt: new Date(1787821200 * 1000).toISOString(),
    });
  });

  it('prefers a nested message id over an unrelated root event id', () => {
    const result = parseUltramsgAcknowledgement({
      id: 'event-999',
      event: 'ack',
      data: { messageId: 'message-456', status: 'viewed' },
    });
    expect(result?.messageId).toBe('message-456');
    expect(result?.status).toBe('read');
  });

  it('ignores unrelated webhook events', () => {
    expect(parseUltramsgAcknowledgement({
      data: { message_id: 'msg-123', status: 'queued' },
    })).toBeNull();
  });

  it('treats a device acknowledgement as delivered but not a server ack', () => {
    expect(parseUltramsgAcknowledgement({
      data: { id: 'msg-device', ack: 'device' },
    })?.status).toBe('delivered');
    expect(parseUltramsgAcknowledgement({
      data: { id: 'msg-server', ack: 'server' },
    })).toBeNull();
  });
});
