/**
 * Events Index
 * 
 * Central export point for event system.
 */

// Core
export { EventBus, eventBus, createEvent } from './EventBus';
export * from './types';

// Handlers
export { registerContractEventHandlers } from './handlers/ContractEventHandlers';
export { registerPaymentEventHandlers } from './handlers/PaymentEventHandlers';

// Initialize all event handlers
import { registerContractEventHandlers } from './handlers/ContractEventHandlers';
import { registerPaymentEventHandlers } from './handlers/PaymentEventHandlers';

/**
 * Initialize event system
 * Call this once in your app initialization
 */
export function initializeEventSystem() {
  registerContractEventHandlers();
  registerPaymentEventHandlers();
}

/**
 * Usage Example:
 * 
 * // In main.tsx or App.tsx
 * import { initializeEventSystem } from '@/events';
 * initializeEventSystem();
 * 
 * // In your service
 * import { eventBus, createEvent, EventType } from '@/events';
 * 
 * const event = createEvent(
 *   EventType.CONTRACT_CREATED,
 *   contract,
 *   companyId,
 *   userId
 * );
 * 
 * await eventBus.publish(event);
 */

