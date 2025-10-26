/**
 * Reminder Templates & Automation Service
 * 
 * Manages reminder templates, variable substitution, and automated sending
 */

import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isWeekend, parseISO } from 'date-fns';
import { determineReminderStage, shouldSendReminder, type ReminderStage } from './paymentCollections';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ReminderChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'letter';
export type TemplateTone = 'friendly' | 'professional' | 'firm' | 'urgent';
export type TemplateStatus = 'active' | 'draft' | 'archived';

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
  
  // A/B Testing
  variant: 'A' | 'B' | null;
  
  // Statistics
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  response_count: number;
  conversion_rate: number; // percentage
  
  // Settings
  send_time_preference: string; // "09:00", "14:00", etc.
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
  
  // Engagement tracking
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

/**
 * Available template variables for dynamic content
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Customer variables
  { key: 'customer.name', label: 'Customer Name', example: 'John Smith', category: 'customer' },
  { key: 'customer.email', label: 'Customer Email', example: 'john@example.com', category: 'customer' },
  { key: 'customer.phone', label: 'Customer Phone', example: '+1234567890', category: 'customer' },
  { key: 'customer.company', label: 'Customer Company', example: 'ACME Corp', category: 'customer' },
  
  // Invoice variables
  { key: 'invoice.number', label: 'Invoice Number', example: 'INV-001', category: 'invoice' },
  { key: 'invoice.amount', label: 'Invoice Amount', example: '$1,250.00', category: 'invoice' },
  { key: 'invoice.due_date', label: 'Due Date', example: 'Jan 15, 2025', category: 'invoice' },
  { key: 'invoice.days_overdue', label: 'Days Overdue', example: '5', category: 'invoice' },
  { key: 'invoice.amount_due', label: 'Amount Due', example: '$1,250.00', category: 'invoice' },
  { key: 'invoice.amount_paid', label: 'Amount Paid', example: '$0.00', category: 'invoice' },
  
  // Payment variables
  { key: 'payment.due_date', label: 'Payment Due Date', example: 'Jan 15, 2025', category: 'payment' },
  { key: 'payment.link', label: 'Payment Link', example: 'https://pay.example.com/...', category: 'payment' },
  { key: 'payment.methods', label: 'Payment Methods', example: 'Bank Transfer, Card', category: 'payment' },
  
  // Company variables
  { key: 'company.name', label: 'Company Name', example: 'My Company Ltd', category: 'company' },
  { key: 'company.email', label: 'Company Email', example: 'billing@company.com', category: 'company' },
  { key: 'company.phone', label: 'Company Phone', example: '+1234567890', category: 'company' },
  { key: 'company.website', label: 'Company Website', example: 'www.company.com', category: 'company' },
];

/**
 * Replace template variables with actual values
 */
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
  
  // Customer variables
  result = result.replace(/\{customer\.name\}/g, data.customer?.name || '[Customer Name]');
  result = result.replace(/\{customer\.email\}/g, data.customer?.email || '[Customer Email]');
  result = result.replace(/\{customer\.phone\}/g, data.customer?.phone || '[Customer Phone]');
  result = result.replace(/\{customer\.company\}/g, data.customer?.company_name || '[Customer Company]');
  
  // Invoice variables
  result = result.replace(/\{invoice\.number\}/g, data.invoice?.invoice_number || '[Invoice Number]');
  result = result.replace(/\{invoice\.amount\}/g, formatCurrency(data.invoice?.total_amount || 0));
  result = result.replace(/\{invoice\.due_date\}/g, data.invoice?.due_date ? format(parseISO(data.invoice.due_date), 'MMM d, yyyy') : '[Due Date]');
  result = result.replace(/\{invoice\.days_overdue\}/g, calculateDaysOverdue(data.invoice?.due_date).toString());
  result = result.replace(/\{invoice\.amount_due\}/g, formatCurrency((data.invoice?.total_amount || 0) - (data.invoice?.paid_amount || 0)));
  result = result.replace(/\{invoice\.amount_paid\}/g, formatCurrency(data.invoice?.paid_amount || 0));
  
  // Payment variables
  result = result.replace(/\{payment\.due_date\}/g, data.invoice?.due_date ? format(parseISO(data.invoice.due_date), 'MMMM d, yyyy') : '[Due Date]');
  result = result.replace(/\{payment\.link\}/g, data.paymentLink || '[Payment Link]');
  result = result.replace(/\{payment\.methods\}/g, 'Bank Transfer, Credit Card, Cash');
  
  // Company variables
  result = result.replace(/\{company\.name\}/g, data.company?.name || '[Company Name]');
  result = result.replace(/\{company\.email\}/g, data.company?.email || '[Company Email]');
  result = result.replace(/\{company\.phone\}/g, data.company?.phone || '[Company Phone]');
  result = result.replace(/\{company\.website\}/g, data.company?.website || '[Company Website]');
  
  return result;
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
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Get all reminder templates for a company
 */
export async function getReminderTemplates(
  companyId: string,
  filters?: {
    stage?: ReminderStage;
    channel?: ReminderChannel;
    status?: TemplateStatus;
  }
): Promise<ReminderTemplate[]> {
  let query = supabase
    .from('reminder_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('stage', { ascending: true })
    .order('created_at', { ascending: false });
  
  if (filters?.stage) {
    query = query.eq('stage', filters.stage);
  }
  
  if (filters?.channel) {
    query = query.eq('channel', filters.channel);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    // Default: only active templates
    query = query.eq('status', 'active');
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as ReminderTemplate[];
}

/**
 * Create a new reminder template
 */
export async function createReminderTemplate(
  template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at' | 'sent_count' | 'opened_count' | 'clicked_count' | 'response_count' | 'conversion_rate'>
): Promise<ReminderTemplate> {
  const { data, error } = await supabase
    .from('reminder_templates')
    .insert({
      ...template,
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
      response_count: 0,
      conversion_rate: 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as ReminderTemplate;
}

/**
 * Update an existing reminder template
 */
export async function updateReminderTemplate(
  templateId: string,
  updates: Partial<ReminderTemplate>
): Promise<ReminderTemplate> {
  const { data, error } = await supabase
    .from('reminder_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
  
  if (error) throw error;
  return data as ReminderTemplate;
}

/**
 * Delete a reminder template (soft delete - archive)
 */
export async function archiveReminderTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('reminder_templates')
    .update({ status: 'archived' })
    .eq('id', templateId);
  
  if (error) throw error;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

/**
 * Get default reminder templates for each stage
 */
export function getDefaultTemplates(companyName: string): Omit<ReminderTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by' | 'sent_count' | 'opened_count' | 'clicked_count' | 'response_count' | 'conversion_rate'>[] {
  return [
    // Initial Reminder
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
    
    // First Reminder
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
    
    // Second Reminder
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
    
    // Final Notice
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
    
    // Legal Notice
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
// REMINDER SCHEDULING
// ============================================================================

/**
 * Schedule reminders for overdue invoices
 */
export async function scheduleAutomatedReminders(
  companyId: string
): Promise<{ scheduled: number; skipped: number; }> {
  let scheduled = 0;
  let skipped = 0;
  
  try {
    // Get all overdue invoices that need reminders
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('company_id', companyId)
      .lt('due_date', format(new Date(), 'yyyy-MM-dd'))
      .neq('status', 'paid')
      .neq('status', 'cancelled');
    
    if (!invoices) return { scheduled: 0, skipped: 0 };
    
    for (const invoice of invoices) {
      const daysOverdue = calculateDaysOverdue(invoice.due_date);
      const stage = determineReminderStage(daysOverdue);
      
      if (!stage) {
        skipped++;
        continue;
      }
      
      // Check if reminder already sent today for this stage
      const { data: existingReminder } = await supabase
        .from('payment_reminders')
        .select('id')
        .eq('invoice_id', invoice.id)
        .eq('reminder_stage', stage)
        .gte('sent_date', format(new Date(), 'yyyy-MM-dd'))
        .single();
      
      if (existingReminder) {
        skipped++;
        continue;
      }
      
      // Get template for this stage
      const { data: template } = await supabase
        .from('reminder_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('stage', stage)
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (!template) {
        skipped++;
        continue;
      }
      
      // Calculate send time
      const sendDate = new Date();
      const [hours, minutes] = template.send_time_preference.split(':');
      sendDate.setHours(parseInt(hours), parseInt(minutes), 0);
      
      // Check if should send (weekend/holiday logic)
      if (!shouldSendReminder(sendDate, {
        doNotDisturb: false,
      })) {
        // Schedule for next business day
        const nextBusinessDay = getNextBusinessDay(sendDate);
        sendDate.setTime(nextBusinessDay.getTime());
      }
      
      // Create schedule entry
      await supabase
        .from('reminder_schedules')
        .insert({
          company_id: companyId,
          customer_id: invoice.customer_id,
          invoice_id: invoice.id,
          template_id: template.id,
          scheduled_date: format(sendDate, 'yyyy-MM-dd'),
          scheduled_time: format(sendDate, 'HH:mm'),
          status: 'pending',
        });
      
      scheduled++;
    }
    
    return { scheduled, skipped };
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    throw error;
  }
}

function getNextBusinessDay(date: Date): Date {
  let nextDay = addDays(date, 1);
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
}

// ============================================================================
// REMINDER HISTORY & ANALYTICS
// ============================================================================

/**
 * Get reminder history with filters
 */
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
  let query = supabase
    .from('payment_reminders')
    .select('*')
    .eq('company_id', companyId)
    .order('sent_date', { ascending: false });
  
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  
  if (filters?.invoiceId) {
    query = query.eq('invoice_id', filters.invoiceId);
  }
  
  if (filters?.stage) {
    query = query.eq('reminder_stage', filters.stage);
  }
  
  if (filters?.channel) {
    query = query.eq('send_method', filters.channel);
  }
  
  if (filters?.startDate) {
    query = query.gte('sent_date', filters.startDate);
  }
  
  if (filters?.endDate) {
    query = query.lte('sent_date', filters.endDate);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as ReminderHistory[];
}

/**
 * Get template effectiveness analytics
 */
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
  averageResponseTime: number; // hours
}[]> {
  const { data: templates } = await supabase
    .from('reminder_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active');
  
  if (!templates) return [];
  
  const analytics = [];
  
  for (const template of templates) {
    if (templateId && template.id !== templateId) continue;
    
    const { data: reminders } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('template_id', template.id);
    
    if (!reminders || reminders.length === 0) continue;
    
    const totalSent = reminders.length;
    const opened = reminders.filter(r => r.opened_at).length;
    const clicked = reminders.filter(r => r.clicked_at).length;
    const responded = reminders.filter(r => r.responded_at).length;
    const converted = reminders.filter(r => r.response_type === 'paid').length;
    
    // Calculate average response time
    const responseTimes = reminders
      .filter(r => r.sent_date && r.responded_at)
      .map(r => {
        const sent = new Date(r.sent_date);
        const responded = new Date(r.responded_at!);
        return (responded.getTime() - sent.getTime()) / (1000 * 60 * 60); // hours
      });
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    analytics.push({
      templateId: template.id,
      templateName: template.name,
      totalSent,
      openRate: (opened / totalSent) * 100,
      clickRate: (clicked / totalSent) * 100,
      responseRate: (responded / totalSent) * 100,
      conversionRate: (converted / totalSent) * 100,
      averageResponseTime: Math.round(averageResponseTime),
    });
  }
  
  return analytics;
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
};
