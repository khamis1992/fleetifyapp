/**
 * Overdue Management Service
 * 
 * Service for managing overdue contracts and payments:
 * - Calculate overdue amounts
 * - Track overdue days
 * - Send overdue reminders (escalation: 7, 15, 30 days)
 * - Generate overdue reports
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { lateFeeCalculator, OverdueContractInfo } from './lateFeeCalculator';

/**
 * Overdue Contract
 * Contract that is past due date
 */
export interface OverdueContract {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerNameAr: string;
  customerPhone: string;
  contractNumber: string;
  vehiclePlateNumber?: string;
  
  // Dates
  contractDate: string;
  dueDate: string;
  daysOverdue: number;
  
  // Amounts
  monthlyAmount: number;
  paidAmount: number;
  overdueAmount: number;
  lateFeeAmount: number;
  totalDue: number;
  
  // Payment status
  paymentStatus: string;
  lastPaymentDate?: string;
  paymentsCount: number;
  
  // Risk level
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Reminder status
  lastReminderSentAt?: string;
  reminderCount: number;
  reminderLevel: 'none' | 'level1' | 'level2' | 'level3'; // 7, 15, 30 days
  
  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Overdue Reminder
 * Sent reminder to customer
 */
export interface OverdueReminder {
  id: string;
  companyId: string;
  customerId: string;
  contractId: string;
  
  // Reminder details
  reminderLevel: 'level1' | 'level2' | 'level3';
  daysOverdue: number;
  sentAt: string;
  sentBy?: string;
  
  // Channel
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  failedReason?: string;
  
  // Content
  message: string;
  messageAr: string;
  
  // Response
  responseReceivedAt?: string;
  customerAction?: string;
  
  // Metadata
  notes?: string;
  createdAt: string;
}

/**
 * Overdue Statistics
 * Aggregate overdue metrics
 */
export interface OverdueStatistics {
  companyId: string;
  
  // Contract counts
  totalContracts: number;
  overdueContracts: number;
  overduePercentage: number;
  
  // Amount breakdown
  totalOverdueAmount: number;
  totalLateFees: number;
  totalDue: number;
  
  // Risk breakdown
  criticalContracts: number; // 30+ days overdue
  highRiskContracts: number;  // 15-30 days overdue
  mediumRiskContracts: number; // 7-15 days overdue
  lowRiskContracts: number; // 1-7 days overdue
  
  // Average metrics
  averageDaysOverdue: number;
  averageAmountPerContract: number;
  
  // Reminders
  remindersSent: number;
  remindersDelivered: number;
  remindersRead: number;
  
  // Trends
  overdueTrend: 'increasing' | 'decreasing' | 'stable';
  changeFromLastMonth: number; // Percentage change
  
  calculatedAt: string;
}

/**
 * Escalation Level
 * Reminder escalation levels
 */
export interface EscalationLevel {
  level: 'level1' | 'level2' | 'level3';
  daysOverdue: number;
  description: string;
  descriptionAr: string;
  
  // Channels
  channels: Array<'whatsapp' | 'sms' | 'email'>;
  primaryChannel: 'whatsapp' | 'sms' | 'email';
  
  // Priority
  priority: 'high' | 'medium' | 'low';
}

/**
 * Reminder Options
 * Configuration for sending reminders
 */
export interface ReminderOptions {
  companyId: string;
  contractIds?: string[]; // Specific contracts to remind
  daysOverdueThreshold?: number; // Minimum days overdue to remind
  maxReminders?: number; // Maximum reminders per contract (default: 3)
  skipWeekends?: boolean; // Don't send on weekends (default: false)
  includeLowPriority?: boolean; // Include low-risk contracts (default: false)
  userId?: string;
  dryRun?: boolean; // Preview without sending
}

/**
 * Overdue Management Service
 * Main service class
 */
export class OverdueManagementService {
  
  // Escalation levels configuration
  private escalationLevels: EscalationLevel[] = [
    {
      level: 'level1',
      daysOverdue: 7,
      description: '7 days overdue - First reminder',
      descriptionAr: '7 أيام متأخيرة - التذكير الأول',
      channels: ['whatsapp', 'sms', 'email'],
      primaryChannel: 'whatsapp',
      priority: 'medium'
    },
    {
      level: 'level2',
      daysOverdue: 15,
      description: '15 days overdue - Second reminder (escalation)',
      descriptionAr: '15 أيام متأخيرة - التذكير الثاني (تصعيد)',
      channels: ['whatsapp', 'sms', 'email'],
      primaryChannel: 'whatsapp',
      priority: 'high'
    },
    {
      level: 'level3',
      daysOverdue: 30,
      description: '30 days overdue - Final warning (critical)',
      descriptionAr: '30 أيام متأخيرة - تحذير نهائي (حرج)',
      channels: ['whatsapp', 'sms', 'email'],
      primaryChannel: 'whatsapp',
      priority: 'high'
    }
  ];

  /**
   * Get overdue contracts
   */
  async getOverdueContracts(
    companyId: string,
    options?: {
      minDaysOverdue?: number;
      maxDaysOverdue?: number;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<OverdueContract[]> {
    try {
      logger.info('Fetching overdue contracts', {
        companyId,
        options
      });

      let query = supabase
        .from('contracts')
        .select(`
          id,
          company_id,
          customer_id,
          customers!contracts_customer_id_fkey (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone
          ),
          contract_number,
          vehicles!contracts_vehicles_fkey (
            plate_number
          ),
          contract_date,
          monthly_amount,
          start_date,
          end_date,
          status,
          total_paid,
          balance_due,
          last_payment_date,
          payment_status,
          days_overdue,
          late_fine_amount
        `)
        .eq('company_id', companyId);

      // Filter by status
      if (!options?.includeInactive) {
        query = query.in('status', ['active', 'expiring_soon']);
      }

      // Apply date filter for overdue
      query = query.gt('days_overdue', 0);

      // Filter by days overdue range
      if (options?.minDaysOverdue) {
        query = query.gte('days_overdue', options.minDaysOverdue);
      }

      if (options?.maxDaysOverdue) {
        query = query.lte('days_overdue', options.maxDaysOverdue);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      // Order by risk level (most critical first)
      query = query.order('days_overdue', { ascending: false });

      // Execute query
      const { data: contracts, error } = await query;

      if (error) {
        logger.error('Failed to fetch overdue contracts', {
          companyId,
          error
        });
        throw error;
      }

      if (!contracts || contracts.length === 0) {
        logger.info('No overdue contracts found', { companyId });
        return [];
      }

      // Enrich with calculated data
      const enrichedContracts: OverdueContract[] = [];

      for (const contract of contracts) {
        // Calculate risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (contract.days_overdue >= 30) {
          riskLevel = 'critical';
        } else if (contract.days_overdue >= 15) {
          riskLevel = 'high';
        } else if (contract.days_overdue >= 7) {
          riskLevel = 'medium';
        }

        // Get reminder level
        const escalation = this.escalationLevels.find(e => contract.days_overdue >= e.daysOverdue);
        const reminderLevel = escalation?.level || 'none';

        // Get last reminder
        const { data: lastReminder } = await supabase
          .from('overdue_reminders')
          .select('*')
          .eq('contract_id', contract.id)
          .eq('customer_id', contract.customer_id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get reminder count
        const { count: reminderCount } = await supabase
          .from('overdue_reminders')
          .select('*', { count: 'exact', head: false })
          .eq('contract_id', contract.id)
          .eq('customer_id', contract.customer_id);

        // Calculate totals
        const overdueAmount = contract.balance_due || contract.monthly_amount - (contract.total_paid || 0);
        const totalDue = overdueAmount + (contract.late_fine_amount || 0);

        enrichedContracts.push({
          id: contract.id,
          companyId: contract.company_id,
          customerId: contract.customer_id,
          customerName: contract.customers?.company_name || contract.customers?.company_name_ar || 
                         `${contract.customers?.first_name_ar || contract.customers?.first_name} ${contract.customers?.last_name_ar || contract.customers?.last_name}` ||
                         `${contract.customers?.first_name || ''} ${contract.customers?.last_name || ''}`,
          customerNameAr: contract.customers?.company_name_ar || 
                         `${contract.customers?.first_name_ar || ''} ${contract.customers?.last_name_ar || ''}`,
          customerPhone: contract.customers?.phone || '',
          contractNumber: contract.contract_number,
          vehiclePlateNumber: contract.vehicles?.plate_number,
          
          contractDate: contract.contract_date,
          dueDate: contract.contract_date,
          daysOverdue: contract.days_overdue || 0,
          
          monthlyAmount: contract.monthly_amount || 0,
          paidAmount: contract.total_paid || 0,
          overdueAmount,
          lateFeeAmount: contract.late_fine_amount || 0,
          totalDue,
          
          paymentStatus: contract.payment_status || 'pending',
          lastPaymentDate: contract.last_payment_date,
          paymentsCount: reminderCount || 0,
          
          riskLevel,
          reminderLevel,
          lastReminderSentAt: lastReminder?.sent_at,
          reminderCount: reminderCount || 0,
          
          notes: contract.notes,
          createdAt: contract.contract_date,
          updatedAt: contract.updated_at
        });
      }

      logger.info('Overdue contracts fetched', {
        companyId,
        count: enrichedContracts.length,
        criticalCount: enrichedContracts.filter(c => c.riskLevel === 'critical').length,
        highRiskCount: enrichedContracts.filter(c => c.riskLevel === 'high').length
      });

      return enrichedContracts;

    } catch (error) {
      logger.error('Exception fetching overdue contracts', {
        companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Send overdue reminders
   */
  async sendOverdueReminders(
    options: ReminderOptions
  ): Promise<{
    sent: number;
    failed: number;
    skipped: number;
    details: Array<{
      contractId: string;
      customerName: string;
      daysOverdue: number;
      level: string;
      channel: string;
      status: 'sent' | 'failed' | 'skipped';
      error?: string;
    }>;
  }> {
    try {
      logger.info('Starting overdue reminders campaign', {
        companyId: options.companyId,
        contractIds: options.contractIds
      });

      // Get overdue contracts
      let overdueContracts: OverdueContract[] = [];
      
      if (options.contractIds && options.contractIds.length > 0) {
        // Specific contracts
        for (const contractId of options.contractIds) {
          const contracts = await this.getOverdueContracts(options.companyId, {
            limit: 1,
            offset: undefined // We'll query each contract separately
          });
          overdueContracts.push(...contracts);
        }
      } else {
        // All contracts meeting threshold
        overdueContracts = await this.getOverdueContracts(options.companyId, {
          minDaysOverdue: options.daysOverdueThreshold || 1,
          includeInactive: false
        });
      }

      // Filter by risk level
      const filteredContracts = options.includeLowPriority 
        ? overdueContracts
        : overdueContracts.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');

      if (filteredContracts.length === 0) {
        logger.info('No contracts eligible for reminders', {
          companyId: options.companyId
        });
        return {
          sent: 0,
          failed: 0,
          skipped: 0,
          details: []
        };
      }

      // Send reminders
      const results: Array<{
        contractId: string;
        customerName: string;
        daysOverdue: number;
        level: string;
        channel: string;
        status: 'sent' | 'failed' | 'skipped';
        error?: string;
      }> = [];

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const contract of filteredContracts) {
        // Check max reminders
        if (options.maxReminders && contract.reminderCount >= options.maxReminders) {
          results.push({
            contractId: contract.id,
            customerName: contract.customerNameAr,
            daysOverdue: contract.daysOverdue,
            level: 'maxed',
            channel: 'none',
            status: 'skipped',
            error: `Maximum ${options.maxReminders} reminders already sent`
          });
          skippedCount++;
          continue;
        }

        // Check if already reminded at this level
        const escalation = this.escalationLevels.find(e => e.daysOverdue <= contract.daysOverdue);
        if (!escalation) {
          continue;
        }

        // Skip weekends if configured
        if (options.skipWeekends) {
          const today = new Date();
          const dayOfWeek = today.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
            results.push({
              contractId: contract.id,
              customerName: contract.customerNameAr,
              daysOverdue: contract.daysOverdue,
              level: escalation.level,
              channel: escalation.primaryChannel,
              status: 'skipped',
              error: 'Weekend - sending on next business day'
            });
            skippedCount++;
            continue;
          }
        }

        // Get customer phone
        if (!contract.customerPhone) {
          results.push({
            contractId: contract.id,
            customerName: contract.customerNameAr,
            daysOverdue: contract.daysOverdue,
            level: escalation.level,
            channel: escalation.primaryChannel,
            status: 'failed',
            error: 'No customer phone number'
          });
          failedCount++;
          continue;
        }

        // Prepare message
        const message = this.prepareReminderMessage(contract, escalation);
        const messageAr = this.prepareReminderMessageAr(contract, escalation);

        // Dry run mode - don't actually send
        if (options.dryRun) {
          results.push({
            contractId: contract.id,
            customerName: contract.customerNameAr,
            daysOverdue: contract.daysOverdue,
            level: escalation.level,
            channel: escalation.primaryChannel,
            status: 'skipped',
            error: 'Dry run mode - not sent'
          });
          skippedCount++;
          continue;
        }

        // Send reminder (mock for now - TODO: integrate with actual notification service)
        try {
          const sentAt = new Date().toISOString();

          // Create reminder record
          const { error: insertError } = await supabase
            .from('overdue_reminders')
            .insert({
              company_id: contract.companyId,
              customer_id: contract.customerId,
              contract_id: contract.id,
              
              reminder_level: escalation.level,
              days_overdue: contract.daysOverdue,
              
              channel: escalation.primaryChannel,
              status: 'sent',
              
              message,
              message_ar: messageAr,
              
              sent_at: sentAt,
              sent_by: options.userId,
              
              created_at: sentAt
            });

          if (insertError) {
            throw insertError;
          }

          // Update contract reminder count
          await supabase
            .from('contracts')
            .update({
              last_reminder_sent_at: sentAt,
              reminder_count: contract.reminderCount + 1
            })
            .eq('id', contract.id);

          results.push({
            contractId: contract.id,
            customerName: contract.customerNameAr,
            daysOverdue: contract.daysOverdue,
            level: escalation.level,
            channel: escalation.primaryChannel,
            status: 'sent'
          });

          sentCount++;

          logger.info('Overdue reminder sent', {
            contractId: contract.id,
            customerPhone: contract.customerPhone,
            daysOverdue: contract.daysOverdue,
            level: escalation.level,
            channel: escalation.primaryChannel
          });

        } catch (error) {
          results.push({
            contractId: contract.id,
            customerName: contract.customerNameAr,
            daysOverdue: contract.daysOverdue,
            level: escalation.level,
            channel: escalation.primaryChannel,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
          failedCount++;
        }
      }

      logger.info('Overdue reminders campaign completed', {
        companyId: options.companyId,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount
      });

      return {
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        details: results
      };

    } catch (error) {
      logger.error('Exception sending overdue reminders', {
        companyId: options.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Prepare reminder message
   */
  private prepareReminderMessage(contract: OverdueContract, escalation: EscalationLevel): string {
    const customerName = contract.customerName;
    const contractNumber = contract.contractNumber;
    const daysOverdue = contract.daysOverdue;
    const overdueAmount = contract.totalDue.toFixed(2);
    const lateFee = contract.lateFeeAmount.toFixed(2);

    return `
Dear ${customerName},

This is a friendly reminder that your payment for contract #${contractNumber} is ${daysOverdue} days overdue.

Payment Details:
- Outstanding Amount: QAR ${overdueAmount}
- Days Overdue: ${daysOverdue}
- Late Fees: QAR ${lateFee}
- Total Due: QAR ${contract.totalDue.toFixed(2)}

${escalation.priority === 'high' ? '⚠️ IMPORTANT: Please settle this payment immediately to avoid further late fees and account restrictions.' : ''}

${escalation.priority === 'high' && escalation.level === 'level3' ? 'URGENT: Your account may be suspended if payment is not received within 3 days.' : ''}

Please contact us at your earliest convenience to arrange payment.

Thank you for your understanding.
Best regards,
Al-Araf Car Rental
`.trim();
  }

  /**
   * Prepare Arabic reminder message
   */
  private prepareReminderMessageAr(contract: OverdueContract, escalation: EscalationLevel): string {
    const customerName = contract.customerNameAr;
    const contractNumber = contract.contractNumber;
    const daysOverdue = contract.daysOverdue;
    const overdueAmount = contract.totalDue.toFixed(2);
    const lateFee = contract.lateFeeAmount.toFixed(2);

    return `
عميل ${customerName} الكريم،

هذه رسالة تذكير وديعة بأن دفعة عقد رقم #${contractNumber} متأخيرة بمقدار ${daysOverdue} يوم.

تفاصيل الدفعة:
- المبلغ المتبقي: ${overdueAmount} ريال قطري
- الأيام المتأخيرة: ${daysOverdue} يوم
- غرامة التأخير: ${lateFee} ريال قطري
- الإجمالي المستحق: ${contract.totalDue.toFixed(2)} ريال قطري

${escalation.priority === 'high' ? '⚠️ هام: يرجى تسوية الدفعة فوراً لتجنب رسوم إضافية وحساب حسابك.' : ''}

${escalation.priority === 'high' && escalation.level === 'level3' ? 'عاجل: قد يتم تعليق حسابك إذا لم يتم استلام الدفعة خلال 3 أيام.' : ''}

يرجى التواصل معنا في أقرب وقت ممكن لترتيب الدفع.

شكراً لتفهمكم.
مع تحيات،
شركة العراف لتأجير السيارات
`.trim();
  }

  /**
   * Get overdue statistics
   */
  async getOverdueStatistics(
    companyId: string
  ): Promise<OverdueStatistics> {
    try {
      logger.info('Calculating overdue statistics', { companyId });

      // Get all contracts
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, company_id, days_overdue, monthly_amount, total_paid, balance_due, late_fine_amount, status, contract_date')
        .eq('company_id', companyId)
        .in('status', ['active', 'expiring_soon']);

      if (error) {
        logger.error('Failed to fetch contracts for statistics', {
          companyId,
          error
        });
        throw error;
      }

      const totalContracts = contracts.length;
      
      // Get overdue contracts
      const overdueContracts = contracts.filter(c => (c.days_overdue || 0) > 0);
      const overdueContractsCount = overdueContracts.length;
      const overduePercentage = totalContracts > 0 
        ? (overdueContractsCount / totalContracts) * 100 
        : 0;

      // Calculate amounts
      const totalOverdueAmount = overdueContracts.reduce((sum, c) => sum + (c.balance_due || c.monthly_amount - (c.total_paid || 0)), 0);
      const totalLateFees = overdueContracts.reduce((sum, c) => sum + (c.late_fine_amount || 0), 0);
      const totalDue = totalOverdueAmount + totalLateFees;

      // Risk breakdown
      const criticalContracts = overdueContracts.filter(c => c.days_overdue >= 30).length;
      const highRiskContracts = overdueContracts.filter(c => c.days_overdue >= 15 && c.days_overdue < 30).length;
      const mediumRiskContracts = overdueContracts.filter(c => c.days_overdue >= 7 && c.days_overdue < 15).length;
      const lowRiskContracts = overdueContracts.filter(c => c.days_overdue > 0 && c.days_overdue < 7).length;

      // Average metrics
      const totalDaysOverdue = overdueContracts.reduce((sum, c) => sum + (c.days_overdue || 0), 0);
      const averageDaysOverdue = overdueContractsCount > 0 
        ? totalDaysOverdue / overdueContractsCount 
        : 0;
      
      const totalAmount = contracts.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
      const averageAmountPerContract = totalContracts > 0 ? totalAmount / totalContracts : 0;

      // Reminders sent
      const { count: remindersSent } = await supabase
        .from('overdue_reminders')
        .select('*', { count: 'exact', head: false })
        .eq('company_id', companyId);

      // Trend calculation (compare with last month)
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      
      const currentMonthOverdue = overdueContracts.filter(c => 
        new Date(c.contract_date) >= new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1)
      ).length;
      
      const lastMonthOverdue = overdueContracts.filter(c => {
        const contractDate = new Date(c.contract_date);
        return contractDate.getFullYear() === lastMonthDate.getFullYear() &&
               contractDate.getMonth() === lastMonthDate.getMonth();
      }).length;

      const overdueTrend = currentMonthOverdue > lastMonthOverdue ? 'increasing' 
                        : currentMonthOverdue < lastMonthOverdue ? 'decreasing' 
                        : 'stable';

      const changeFromLastMonth = lastMonthOverdue > 0
        ? ((currentMonthOverdue - lastMonthOverdue) / lastMonthOverdue) * 100
        : 0;

      const stats: OverdueStatistics = {
        companyId,
        
        totalContracts,
        overdueContracts: overdueContractsCount,
        overduePercentage: Math.round(overduePercentage * 10) / 10, // Round to 1 decimal
        
        totalOverdueAmount,
        totalLateFees,
        totalDue,
        
        criticalContracts,
        highRiskContracts,
        mediumRiskContracts,
        lowRiskContracts,
        
        averageDaysOverdue: Math.round(averageDaysOverdue * 10) / 10,
        averageAmountPerContract: Math.round(averageAmountPerContract * 100) / 100,
        
        remindersSent: remindersSent || 0,
        remindersDelivered: 0, // TODO: Track actual delivery
        remindersRead: 0, // TODO: Track actual reads
        
        overdueTrend,
        changeFromLastMonth,
        
        calculatedAt: new Date().toISOString()
      };

      logger.info('Overdue statistics calculated', {
        companyId,
        totalContracts,
        overdueContracts: overdueContractsCount,
        overduePercentage
      });

      return stats;

    } catch (error) {
      logger.error('Exception calculating overdue statistics', {
        companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Apply late fees to overdue contracts
   */
  async applyLateFeesToOverduePayments(
    companyId: string,
    options?: {
      dryRun?: boolean;
      userId?: string;
    }
  ): Promise<{
    processed: number;
    applied: number;
    skipped: number;
    failed: number;
    totalLateFeesApplied: number;
  }> {
    try {
      logger.info('Applying late fees to overdue contracts', {
        companyId,
        dryRun: options?.dryRun
      });

      // Get overdue contracts
      const overdueContracts = await this.getOverdueContracts(companyId, {
        minDaysOverdue: 1,
        includeInactive: false
      });

      if (!overdueContracts || overdueContracts.length === 0) {
        logger.info('No overdue contracts found', { companyId });
        return {
          processed: 0,
          applied: 0,
          skipped: 0,
          failed: 0,
          totalLateFeesApplied: 0
        };
      }

      let processedCount = 0;
      let appliedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let totalLateFeesApplied = 0;

      for (const contract of overdueContracts) {
        processedCount++;

        // Check if already has late fee applied recently
        const lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);

        const { data: existingLateFees } = await supabase
          .from('late_fees')
          .select('id, created_at')
          .eq('contract_id', contract.id)
          .gte('created_at', lastWeekDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingLateFees && existingLateFees.length > 0) {
          // Already has late fee applied this week, skip
          skippedCount++;
          continue;
        }

        // Get company late fee rule (simplified - using existing late_fees table structure)
        // For now, we'll use a simple calculation
        const daysOverdue = contract.daysOverdue || 0;
        const monthlyAmount = contract.monthlyAmount || 0;
        
        // Calculate late fee: 1% per month for payments over 7 days
        let lateFeeAmount = 0;
        if (daysOverdue > 7) {
          const monthsOverdue = Math.floor(daysOverdue / 30);
          lateFeeAmount = monthlyAmount * 0.01 * monthsOverdue; // 1% per month
          
          // Cap at 500
          if (lateFeeAmount > 500) {
            lateFeeAmount = 500;
          }
        }

        if (lateFeeAmount <= 0) {
          skippedCount++;
          continue;
        }

        // Dry run mode
        if (options?.dryRun) {
          continue;
        }

        // Apply late fee
        try {
          const { error: insertError } = await supabase
            .from('late_fees')
            .insert({
              company_id: contract.companyId,
              customer_id: contract.customerId,
              contract_id: contract.id,
              payment_id: null, // Late fees don't have payment yet
              
              original_amount: monthlyAmount,
              due_date: contract.dueDate,
              payment_date: null, // Not yet paid
              days_late: daysOverdue,
              
              base_fee: lateFeeAmount,
              penalty_amount: 0,
              total_late_fee: lateFeeAmount,
              
              breakdown: JSON.stringify({
                calculation_method: 'percentage',
                rate: 0.01,
                months_overdue: Math.floor(daysOverdue / 30)
              }),
              
              rule_id: 'default-rule', // Will reference actual rule ID
              rule_name: 'Standard Late Fee Rule',
              status: 'pending',
              
              created_by: options.userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            throw insertError;
          }

          // Update contract late fee amount
          await supabase
            .from('contracts')
            .update({
              late_fine_amount: (contract.late_fine_amount || 0) + lateFeeAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', contract.id);

          appliedCount++;
          totalLateFeesApplied += lateFeeAmount;

          logger.debug('Late fee applied', {
            contractId: contract.id,
            daysOverdue,
            lateFeeAmount
          });

        } catch (error) {
          failedCount++;
          logger.error('Failed to apply late fee', {
            contractId: contract.id,
            error
          });
        }
      }

      logger.info('Late fees applied to overdue contracts', {
        companyId,
        processed: processedCount,
        applied: appliedCount,
        skipped: skippedCount,
        failed: failedCount,
        totalLateFeesApplied
      });

      return {
        processed: processedCount,
        applied: appliedCount,
        skipped: skippedCount,
        failed: failedCount,
        totalLateFeesApplied
      };

    } catch (error) {
      logger.error('Exception applying late fees', {
        companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Get overdue customers report
   */
  async getOverdueCustomersReport(
    companyId: string,
    options?: {
      minDaysOverdue?: number;
      includeDetails?: boolean;
    }
  ): Promise<{
    totalCustomers: number;
    overdueCustomers: number;
    customers: Array<{
      customerId: string;
      customerName: string;
      customerNameAr: string;
      customerPhone: string;
      overdueAmount: number;
      overdueContractsCount: number;
      totalLateFees: number;
      daysSinceLastPayment?: number;
    }>;
  }> {
    try {
      logger.info('Generating overdue customers report', {
        companyId,
        options
      });

      // Get overdue contracts
      const overdueContracts = await this.getOverdueContracts(companyId, {
        minDaysOverdue: options?.minDaysOverdue || 1,
        includeInactive: false
      });

      if (!overdueContracts || overdueContracts.length === 0) {
        return {
          totalCustomers: 0,
          overdueCustomers: 0,
          customers: []
        };
      }

      // Group by customer
      const customerMap = new Map<string, {
        customerId: string;
        customerName: string;
        customerNameAr: string;
        customerPhone: string;
        overdueAmount: number;
        overdueContractsCount: number;
        totalLateFees: number;
        daysSinceLastPayment?: number;
      }>();

      for (const contract of overdueContracts) {
        const existing = customerMap.get(contract.customerId);
        
        if (existing) {
          existing.overdueAmount += contract.totalDue;
          existing.overdueContractsCount += 1;
          existing.totalLateFees += contract.lateFeeAmount;
        } else {
          customerMap.set(contract.customerId, {
            customerId: contract.customerId,
            customerName: contract.customerName,
            customerNameAr: contract.customerNameAr,
            customerPhone: contract.customerPhone,
            overdueAmount: contract.totalDue,
            overdueContractsCount: 1,
            totalLateFees: contract.lateFeeAmount,
            daysSinceLastPayment: contract.lastPaymentDate 
              ? Math.floor((new Date().getTime() - new Date(contract.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
              : undefined
          });
        }
      }

      // Convert to array and sort by amount (highest first)
      const customers = Array.from(customerMap.values())
        .sort((a, b) => b.overdueAmount - a.overdueAmount);

      logger.info('Overdue customers report generated', {
        companyId,
        totalCustomers: customers.length,
        overdueCustomers: customers.filter(c => c.overdueContractsCount > 0).length
      });

      return {
        totalCustomers: customers.length,
        overdueCustomers: customers.filter(c => c.overdueContractsCount > 0).length,
        customers
      };

    } catch (error) {
      logger.error('Exception generating overdue customers report', {
        companyId,
        error
      });
      throw error;
    }
  }
}

// Export singleton instance
export const overdueManagementService = new OverdueManagementService();
