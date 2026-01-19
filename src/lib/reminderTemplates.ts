/**
 * Reminder Templates & Automation Service
 * 
 * Manages reminder templates, variable substitution, and automated sending.
 * NOTE: This is a utility-only module. Database operations will be added
 * once the Payment Collections migration is deployed.
 */

import { format, addDays, isWeekend, parseISO } from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ReminderChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'letter';
export type TemplateTone = 'friendly' | 'professional' | 'firm' | 'urgent';
export type TemplateStatus = 'active' | 'draft' | 'archived';
export type ReminderStage = 'initial' | 'first_reminder' | 'second_reminder' | 'final_notice' | 'legal_notice';

export interface ReminderTemplate {
  id: string;
  company_id: string;
  name: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  subject: string;
  body: string;
  tone: TemplateTone;
  status: TemplateStatus;
  variant: 'A' | 'B' | null;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  response_count: number;
  conversion_rate: number;
  send_time_preference: string;
  avoid_weekends: boolean;
  avoid_holidays: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
  category: 'customer' | 'invoice' | 'company' | 'payment';
}

export interface ReminderSchedule {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id: string;
  template_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ReminderHistory {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id: string;
  template_id: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  subject: string;
  message_body: string;
  sent_date: string;
  sent_method: string;
  opened_at: string | null;
  clicked_at: string | null;
  responded_at: string | null;
  response_type: 'paid' | 'promised' | 'disputed' | 'ignored' | null;
  sent_by: string;
  created_at: string;
}

// ============================================================================
// TEMPLATE VARIABLES SYSTEM
// ============================================================================

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'customer.name', label: 'Customer Name', example: 'John Smith', category: 'customer' },
  { key: 'customer.email', label: 'Customer Email', example: 'john@example.com', category: 'customer' },
  { key: 'customer.phone', label: 'Customer Phone', example: '+1234567890', category: 'customer' },
  { key: 'customer.company', label: 'Customer Company', example: 'ACME Corp', category: 'customer' },
  { key: 'invoice.number', label: 'Invoice Number', example: 'INV-001', category: 'invoice' },
  { key: 'invoice.amount', label: 'Invoice Amount', example: '$1,250.00', category: 'invoice' },
  { key: 'invoice.due_date', label: 'Due Date', example: 'Jan 15, 2025', category: 'invoice' },
  { key: 'invoice.days_overdue', label: 'Days Overdue', example: '5', category: 'invoice' },
  { key: 'invoice.amount_due', label: 'Amount Due', example: '$1,250.00', category: 'invoice' },
  { key: 'invoice.amount_paid', label: 'Amount Paid', example: '$0.00', category: 'invoice' },
  { key: 'payment.due_date', label: 'Payment Due Date', example: 'Jan 15, 2025', category: 'payment' },
  { key: 'payment.link', label: 'Payment Link', example: 'https://pay.example.com/...', category: 'payment' },
  { key: 'payment.methods', label: 'Payment Methods', example: 'Bank Transfer, Card', category: 'payment' },
  { key: 'company.name', label: 'Company Name', example: 'My Company Ltd', category: 'company' },
  { key: 'company.email', label: 'Company Email', example: 'billing@company.com', category: 'company' },
  { key: 'company.phone', label: 'Company Phone', example: '+1234567890', category: 'company' },
  { key: 'company.website', label: 'Company Website', example: 'www.company.com', category: 'company' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function replaceTemplateVariables(
  template: string,
  data: {
    customer: any;
    invoice: any;
    company: any;
    paymentLink?: string;
  }
): string {
  let result = template;

  result = result.replace(/\{customer\.name\}/g, data.customer?.name || '[Customer Name]');
  result = result.replace(/\{customer\.email\}/g, data.customer?.email || '[Customer Email]');
  result = result.replace(/\{customer\.phone\}/g, data.customer?.phone || '[Customer Phone]');
  result = result.replace(/\{customer\.company\}/g, data.customer?.company_name || '[Customer Company]');

  result = result.replace(/\{invoice\.number\}/g, data.invoice?.invoice_number || '[Invoice Number]');
  result = result.replace(/\{invoice\.amount\}/g, formatCurrency(data.invoice?.total_amount || 0));
  result = result.replace(/\{invoice\.due_date\}/g, data.invoice?.due_date ? format(parseISO(data.invoice.due_date), 'MMM d, yyyy') : '[Due Date]');
  result = result.replace(/\{invoice\.days_overdue\}/g, calculateDaysOverdue(data.invoice?.due_date).toString());
  result = result.replace(/\{invoice\.amount_due\}/g, formatCurrency((data.invoice?.total_amount || 0) - (data.invoice?.paid_amount || 0)));
  result = result.replace(/\{invoice\.amount_paid\}/g, formatCurrency(data.invoice?.paid_amount || 0));

  result = result.replace(/\{payment\.due_date\}/g, data.invoice?.due_date ? format(parseISO(data.invoice.due_date), 'MMMM d, yyyy') : '[Due Date]');
  result = result.replace(/\{payment\.link\}/g, data.paymentLink || '[Payment Link]');
  result = result.replace(/\{payment\.methods\}/g, 'Bank Transfer, Credit Card, Cash');

  result = result.replace(/\{company\.name\}/g, data.company?.name || '[Company Name]');
  result = result.replace(/\{company\.email\}/g, data.company?.email || '[Company Email]');
  result = result.replace(/\{company\.phone\}/g, data.company?.phone || '[Company Phone]');
  result = result.replace(/\{company\.website\}/g, data.company?.website || '[Company Website]');

  return result;
}

// Dynamic currency formatting based on locale
export function formatCurrencyByLocale(amount: number, locale: string = 'en-US', currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    // Fallback if invalid locale/currency
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function calculateDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const today = new Date();
  const due = parseISO(dueDate);
  const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ============================================================================
// REMINDER STAGE DETERMINATION
// ============================================================================

export function determineReminderStage(daysOverdue: number): ReminderStage | null {
  if (daysOverdue === 0) return 'initial';
  if (daysOverdue <= 7) return 'first_reminder';
  if (daysOverdue <= 14) return 'second_reminder';
  if (daysOverdue <= 30) return 'final_notice';
  return 'legal_notice';
}

export function shouldSendReminder(date: Date, options?: { doNotDisturb?: boolean }): boolean {
  if (options?.doNotDisturb) return false;
  return true;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

export interface DefaultTemplateInput {
  name: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  tone: TemplateTone;
  status: TemplateStatus;
  variant: 'A' | 'B' | null;
  subject: string;
  body: string;
  send_time_preference: string;
  avoid_weekends: boolean;
  avoid_holidays: boolean;
}

export function getDefaultTemplates(companyName: string): DefaultTemplateInput[] {
  return [
    {
      name: 'Initial Payment Reminder',
      stage: 'initial',
      channel: 'email',
      tone: 'friendly',
      status: 'active',
      variant: null,
      subject: 'Payment Due: Invoice {invoice.number}',
      body: `Dear {customer.name},

This is a friendly reminder that invoice {invoice.number} for {invoice.amount} is due on {payment.due_date}.

Invoice Details:
- Invoice Number: {invoice.number}
- Amount Due: {invoice.amount_due}
- Due Date: {payment.due_date}

You can make a payment using the following link:
{payment.link}

If you have already made this payment, please disregard this message.

Thank you for your business!

Best regards,
{company.name}
{company.email}
{company.phone}`,
      send_time_preference: '09:00',
      avoid_weekends: true,
      avoid_holidays: true,
    },
    {
      name: 'First Overdue Reminder',
      stage: 'first_reminder',
      channel: 'email',
      tone: 'professional',
      status: 'active',
      variant: null,
      subject: 'Overdue Payment Notice: Invoice {invoice.number}',
      body: `Dear {customer.name},

We noticed that invoice {invoice.number} is now {invoice.days_overdue} days overdue.

Payment Details:
- Invoice Number: {invoice.number}
- Amount Due: {invoice.amount_due}
- Original Due Date: {invoice.due_date}
- Days Overdue: {invoice.days_overdue}

Please arrange payment at your earliest convenience using:
{payment.link}

If there are any issues or questions regarding this invoice, please contact us immediately at {company.email} or {company.phone}.

We appreciate your prompt attention to this matter.

Kind regards,
{company.name}`,
      send_time_preference: '10:00',
      avoid_weekends: true,
      avoid_holidays: true,
    },
    {
      name: 'Second Overdue Notice',
      stage: 'second_reminder',
      channel: 'email',
      tone: 'firm',
      status: 'active',
      variant: null,
      subject: 'URGENT: Overdue Payment - Invoice {invoice.number}',
      body: `Dear {customer.name},

URGENT: Invoice {invoice.number} is now significantly overdue ({invoice.days_overdue} days).

Outstanding Balance: {invoice.amount_due}
Original Due Date: {invoice.due_date}

Immediate payment is required to avoid:
- Late payment fees
- Service interruption
- Collection proceedings

Please pay immediately via: {payment.link}

Or contact us urgently to arrange a payment plan:
Email: {company.email}
Phone: {company.phone}

This is your final notice before escalation.

{company.name}`,
      send_time_preference: '14:00',
      avoid_weekends: true,
      avoid_holidays: false,
    },
    {
      name: 'Final Notice Before Legal Action',
      stage: 'final_notice',
      channel: 'email',
      tone: 'urgent',
      status: 'active',
      variant: null,
      subject: 'FINAL NOTICE: Invoice {invoice.number} - Legal Action Pending',
      body: `FINAL NOTICE

Attention: {customer.name}

This is your FINAL NOTICE regarding unpaid invoice {invoice.number}.

Account Status: SERIOUSLY OVERDUE
Amount Due: {invoice.amount_due}
Days Overdue: {invoice.days_overdue}

IMMEDIATE ACTION REQUIRED

Failure to remit payment within 5 business days will result in:
1. Referral to collection agency
2. Additional collection fees
3. Negative credit reporting
4. Possible legal proceedings

PAY NOW: {payment.link}

To discuss payment arrangements, contact us IMMEDIATELY:
{company.phone}
{company.email}

This is your last opportunity to resolve this matter directly.

{company.name}
Collections Department`,
      send_time_preference: '09:00',
      avoid_weekends: false,
      avoid_holidays: false,
    },
    {
      name: 'Legal Notice',
      stage: 'legal_notice',
      channel: 'letter',
      tone: 'urgent',
      status: 'active',
      variant: null,
      subject: 'LEGAL NOTICE: Demand for Payment - Invoice {invoice.number}',
      body: `LEGAL NOTICE - DEMAND FOR PAYMENT

TO: {customer.name}
    {customer.company}

FROM: {company.name}

RE: Outstanding Invoice {invoice.number}

AMOUNT DUE: {invoice.amount_due}
DAYS OVERDUE: {invoice.days_overdue}

This letter serves as formal notice that the above-referenced invoice remains unpaid despite multiple previous attempts to collect.

DEMAND FOR IMMEDIATE PAYMENT

You are hereby demanded to remit full payment of {invoice.amount_due} within 7 days of receipt of this notice.

CONSEQUENCES OF NON-PAYMENT

Failure to comply will result in:
- Initiation of legal proceedings
- Additional legal fees and court costs
- Adverse credit reporting
- Potential judgment and asset liens

PAYMENT INSTRUCTIONS

Pay via: {payment.link}
Or contact: {company.phone}

This is a legal communication. Consult legal counsel if needed.

{company.name}
Legal Department
{company.email}
{company.phone}`,
      send_time_preference: '09:00',
      avoid_weekends: false,
      avoid_holidays: false,
    },
  ];
}

// ============================================================================
// DATABASE OPERATIONS (STUBS - IMPLEMENT AFTER MIGRATION)
// ============================================================================

export async function getReminderTemplates(
  companyId: string,
  filters?: {
    stage?: ReminderStage;
    channel?: ReminderChannel;
    status?: TemplateStatus;
  }
): Promise<ReminderTemplate[]> {
  console.warn('getReminderTemplates: Database not yet implemented. Migration needed.');
  return [];
}

export interface CreateReminderTemplateInput {
  company_id: string;
  name: string;
  stage: ReminderStage;
  channel: ReminderChannel;
  subject: string;
  body: string;
  tone: TemplateTone;
  status: TemplateStatus;
  variant: 'A' | 'B' | null;
  send_time_preference: string;
  avoid_weekends: boolean;
  avoid_holidays: boolean;
  created_by: string;
}

export async function createReminderTemplate(template: CreateReminderTemplateInput): Promise<ReminderTemplate> {
  throw new Error('createReminderTemplate: Database operation not yet implemented');
}

export async function updateReminderTemplate(
  templateId: string,
  updates: Partial<ReminderTemplate>
): Promise<ReminderTemplate> {
  throw new Error('updateReminderTemplate: Database operation not yet implemented');
}

export async function archiveReminderTemplate(templateId: string): Promise<void> {
  throw new Error('archiveReminderTemplate: Database operation not yet implemented');
}

export async function scheduleAutomatedReminders(companyId: string): Promise<{ scheduled: number; skipped: number }> {
  console.warn('scheduleAutomatedReminders: Database not yet implemented. Migration needed.');
  return { scheduled: 0, skipped: 0 };
}

export async function getReminderHistory(
  companyId: string,
  filters?: {
    customerId?: string;
    invoiceId?: string;
    stage?: ReminderStage;
    channel?: ReminderChannel;
    startDate?: string;
    endDate?: string;
  }
): Promise<ReminderHistory[]> {
  console.warn('getReminderHistory: Database not yet implemented. Migration needed.');
  return [];
}

export async function getTemplateAnalytics(
  companyId: string,
  templateId?: string
): Promise<{
  templateId: string;
  templateName: string;
  totalSent: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  conversionRate: number;
  averageResponseTime: number;
}[]> {
  console.warn('getTemplateAnalytics: Database not yet implemented. Migration needed.');
  return [];
}

export default {
  TEMPLATE_VARIABLES,
  replaceTemplateVariables,
  getReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  archiveReminderTemplate,
  getDefaultTemplates,
  scheduleAutomatedReminders,
  getReminderHistory,
  getTemplateAnalytics,
  determineReminderStage,
  shouldSendReminder,
};
