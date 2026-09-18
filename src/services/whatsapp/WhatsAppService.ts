/**
 * Retired browser provider client.
 *
 * Provider tokens must never be loaded into a browser. Text delivery now goes
 * through the audited Edge command client in `utils/whatsappWebSender.ts`.
 * These compatibility methods fail closed so legacy callers cannot bypass it.
 */
import type {
  MessageStatus,
  UltramsgConfig,
  UltramsgResponse,
  WhatsAppRecipient,
} from './types';

const retired = (): UltramsgResponse => ({
  sent: false,
  error: 'Legacy browser WhatsApp provider client is retired',
});

class WhatsAppService {
  initialize(_config: UltramsgConfig): void {
    // Deliberately ignore browser-supplied provider credentials.
  }

  isInitialized(): boolean {
    return false;
  }

  async sendTextMessage(_phone: string, _message: string): Promise<UltramsgResponse> {
    return retired();
  }

  async sendImageMessage(
    _phone: string,
    _imageUrl: string,
    _caption?: string,
  ): Promise<UltramsgResponse> {
    return retired();
  }

  async sendDocumentMessage(
    _phone: string,
    _documentUrl: string,
    _filename: string,
    _caption?: string,
  ): Promise<UltramsgResponse> {
    return retired();
  }

  async sendBulkMessage(
    recipients: WhatsAppRecipient[],
    _message: string,
  ): Promise<Map<string, UltramsgResponse>> {
    return new Map(recipients.map((recipient) => [recipient.id, retired()]));
  }

  async checkNumberStatus(_phone: string): Promise<{ valid: boolean; registered: boolean }> {
    return { valid: false, registered: false };
  }

  async getConnectionStatus(): Promise<{ connected: boolean; phone?: string }> {
    return { connected: false };
  }

  async sendTestMessage(_phone: string): Promise<UltramsgResponse> {
    return retired();
  }

  async getMessageStatus(_messageId: string): Promise<MessageStatus | null> {
    return null;
  }
}

export const whatsAppService = new WhatsAppService();
export default WhatsAppService;
