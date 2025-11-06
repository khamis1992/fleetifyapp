/**
 * Payment Event Handlers
 * 
 * Handles all payment-related events.
 */

import { eventBus } from '../EventBus';
import { EventType } from '../types';
import type { Event } from '../types';
import type { Payment } from '@/types/payment';
import { logger } from '@/lib/logger';
import { paymentService } from '@/services';

/**
 * Register all payment event handlers
 */
export function registerPaymentEventHandlers() {
  logger.info('Registering payment event handlers');

  // Payment Received
  eventBus.subscribe<Payment>(EventType.PAYMENT_RECEIVED, async (event) => {
    logger.info('💰 Payment received event', { paymentId: event.data.id });

    try {
      // Attempt automatic matching
      const suggestions = await paymentService.findMatchingSuggestions(event.data);
      
      if (suggestions.length > 0 && suggestions[0].confidence >= 85) {
        // Auto-match with high confidence
        await paymentService.matchPayment(
          event.data.id, 
          'invoice', 
          suggestions[0].invoice_id
        );

        logger.info('✅ Payment auto-matched', {
          paymentId: event.data.id,
          invoiceId: suggestions[0].invoice_id,
          confidence: suggestions[0].confidence
        });
      } else {
        logger.info('⚠️ Payment requires manual matching', {
          paymentId: event.data.id,
          suggestionsCount: suggestions.length
        });
      }

      // TODO: Send receipt to customer
      // TODO: Update account balance
      // TODO: Create journal entry

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

      // TODO: Update invoice status
      // TODO: Send confirmation
      // TODO: Update statistics

      logger.info('✅ Payment matched event processed');
    }
  );

  // Payment Updated
  eventBus.subscribe<Payment>(EventType.PAYMENT_UPDATED, async (event) => {
    logger.info('📝 Payment updated event', { paymentId: event.data.id });

    // TODO: Update related records
    // TODO: Audit log

    logger.info('✅ Payment updated event processed');
  });

  logger.info('✅ Payment event handlers registered');
}

