/**
 * Event Bus
 * 
 * Central event dispatcher for event-driven architecture.
 * Implements publish-subscribe pattern.
 */

import { logger } from '@/lib/logger';
import type { Event, EventHandler, EventSubscription, EventType } from './types';

/**
 * Event Bus - Singleton
 */
export class EventBus {
  private static instance: EventBus;
  private subscriptions: Map<EventType, EventSubscription[]> = new Map();
  private eventLog: Event[] = [];
  private maxLogSize = 1000;

  private constructor() {
    logger.info('EventBus initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = any>(
    eventType: EventType,
    handler: EventHandler<T>,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      priority
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscriptions = this.subscriptions.get(eventType)!;
    subscriptions.push(subscription);

    // Sort by priority (higher priority first)
    subscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    logger.debug(`Subscribed to ${eventType}`, { subscriptionId, priority });
    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        logger.debug(`Unsubscribed from ${eventType}`, { subscriptionId });
        return;
      }
    }
  }

  /**
   * Publish an event
   */
  async publish<T = any>(event: Event<T>): Promise<void> {
    try {
      // Add to event log
      this.addToLog(event);

      logger.info(`📢 Event published: ${event.type}`, {
        eventId: event.id,
        companyId: event.companyId
      });

      // Get subscribers for this event type
      const subscriptions = this.subscriptions.get(event.type) || [];

      if (subscriptions.length === 0) {
        logger.debug(`No subscribers for ${event.type}`);
        return;
      }

      // Execute handlers
      const promises = subscriptions.map(async (subscription) => {
        try {
          await subscription.handler(event);
          logger.debug(`✅ Handler executed for ${event.type}`, {
            subscriptionId: subscription.id
          });
        } catch (error) {
          logger.error(`❌ Handler failed for ${event.type}`, {
            subscriptionId: subscription.id,
            error
          });
          // Don't throw - continue with other handlers
        }
      });

      // Wait for all handlers to complete
      await Promise.all(promises);

      logger.info(`✅ Event processing completed: ${event.type}`);
    } catch (error) {
      logger.error(`Failed to publish event: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Publish event without waiting for handlers (fire and forget)
   */
  publishAsync<T = any>(event: Event<T>): void {
    this.publish(event).catch(error => {
      logger.error(`Async event publish failed: ${event.type}`, error);
    });
  }

  /**
   * Get event log
   */
  getEventLog(eventType?: EventType, limit: number = 100): Event[] {
    let events = [...this.eventLog];

    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }

    return events.slice(-limit);
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
    logger.info('Event log cleared');
  }

  /**
   * Get subscription count for an event type
   */
  getSubscriptionCount(eventType: EventType): number {
    return this.subscriptions.get(eventType)?.length || 0;
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): Map<EventType, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  // ============ Helper Methods ============

  private generateSubscriptionId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToLog(event: Event): void {
    this.eventLog.push(event);

    // Keep log size manageable
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
  }
}

/**
 * Create an event
 */
export function createEvent<T = any>(
  type: EventType,
  data: T,
  companyId: string,
  userId?: string,
  metadata?: Record<string, any>
): Event<T> {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    userId,
    companyId,
    timestamp: new Date().toISOString(),
    metadata
  };
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

