/**
 * Payment Event Handlers
 * 
 * Handles all payment-related events.
 */

import { eventBus } from '../EventBus';
import { EventType } from '../types';
import type { Payment } from '@/types/payment';
import { logger } from '@/lib/logger';

/**
 * Register all payment event handlers
 */
export function registerPaymentEventHandlers() {
  logger.info('Registering payment event handlers');

    // Payment Received
    eventBus.subscribe<Payment>(EventType.PAYMENT_RECEIVED, async (event) => {
      logger.info('💰 Payment received event', { paymentId: event.data.id });

      try {
        // Payment processing is now handled directly by the payment creation flow
        // No separate transaction service needed - logic consolidated
        logger.info('✅ Payment received event processed', {
          paymentId: event.data.id,
          status: 'processing_completed'
        });

      } catch (error) {
        logger.error('❌ Payment event processing failed', error);
      }
    }, 100); // High priority

  // Payment Matched
  eventBus.subscribe<{ payment: Payment; invoice_id: string }>(
    EventType.PAYMENT_MATCHED,
    async (event) => {
      logger.info('🔗 Payment matched event', {
        paymentId: event.data.payment.id,
        invoiceId: event.data.invoice_id
      });

      logger.info('✅ Payment matched event processed');
    }
  );

  // Payment Updated
  eventBus.subscribe<Payment>(EventType.PAYMENT_UPDATED, async (event) => {
    logger.info('📝 Payment updated event', { paymentId: event.data.id });

    logger.info('✅ Payment updated event processed');
  });

  logger.info('✅ Payment event handlers registered');
}
