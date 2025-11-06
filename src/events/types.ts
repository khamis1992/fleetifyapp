/**
 * Event System Types
 * 
 * Type definitions for the event-driven architecture.
 */

export enum EventType {
  // Contract Events
  CONTRACT_CREATED = 'contract.created',
  CONTRACT_UPDATED = 'contract.updated',
  CONTRACT_DELETED = 'contract.deleted',
  CONTRACT_ACTIVATED = 'contract.activated',
  CONTRACT_EXPIRED = 'contract.expired',
  CONTRACT_CANCELLED = 'contract.cancelled',
  
  // Payment Events
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_MATCHED = 'payment.matched',
  PAYMENT_UPDATED = 'payment.updated',
  PAYMENT_CANCELLED = 'payment.cancelled',
  
  // Invoice Events
  INVOICE_GENERATED = 'invoice.generated',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PARTIALLY_PAID = 'invoice.partially_paid',
  INVOICE_OVERDUE = 'invoice.overdue',
  INVOICE_CANCELLED = 'invoice.cancelled',
  
  // Approval Events
  APPROVAL_REQUESTED = 'approval.requested',
  APPROVAL_GRANTED = 'approval.granted',
  APPROVAL_REJECTED = 'approval.rejected',
  APPROVAL_CANCELLED = 'approval.cancelled',
  
  // System Events
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  COMPANY_SWITCHED = 'company.switched',
  
  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  EMAIL_SENT = 'email.sent',
  SMS_SENT = 'sms.sent'
}

export interface Event<T = any> {
  id: string;
  type: EventType;
  data: T;
  userId?: string;
  companyId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type EventHandler<T = any> = (event: Event<T>) => Promise<void> | void;

export interface EventSubscription {
  id: string;
  eventType: EventType;
  handler: EventHandler;
  priority?: number;
}

