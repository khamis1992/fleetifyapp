/**
 * Payment Event Handlers
 * 
 * Handles all payment-related events.
 */

import { eventBus } from '../EventBus';
import { EventType } from '../types';
import type { Payment } from '@/types/payment';
import { logger } from '@/lib/logger';
import { paymentTransactionService } from '@/services/PaymentTransactionService';

/**
 * Register all payment event handlers
 */
export function registerPaymentEventHandlers() {
  logger.info('Registering payment event handlers');

    // Payment Received
    eventBus.subscribe<Payment>(EventType.PAYMENT_RECEIVED, async (event) => {
      logger.info('💰 Payment received event', { paymentId: event.data.id });

      try {
        // Use centralized PaymentTransactionService for complete payment processing
        await paymentTransactionService.createPaymentTransaction(
          event.data.id,
          event.data.company_id,
          event.data.created_by
        );

        logger.info('✅ Payment received event processed', {
          paymentId: event.data.id,
          status: 'processing_completed'
        });

      } catch (error) {
        logger.error('❌ Payment event processing failed', error);

        // Log failed processing for retry
        // TODO: Add to failed transactions queue
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

