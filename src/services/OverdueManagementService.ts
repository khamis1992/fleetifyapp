/**
 * Overdue Management Service
 * 
 * إدارة نظام المتأخرات:
 * - إرسال تذكيرات تلقائية (7 يوم، 15 يوم، 30 يوم)
 * - إدارة SOPs للتعامل مع المتأخرات
 * - تتبع استجابة العملاء
 * - تصعيد التذكيرات حسب الاستجابة
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { notificationService } from './NotificationService';
import { lateFeeCalculator } from './lateFeeCalculator';

export interface OverdueReminderRule {
  id?: string;
  companyId: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  
  // قواعد التذكير
  reminderDays: number; // عدد الأيام قبل تاريخ الاستحقاق
  escalationRule: 'single' | 'escalate' | 'stop_reminders'; // ماذاذا يحدث عند استمرار المتأخرة
  
  // القنوات
  channels: Array<'whatsapp' | 'sms' | 'email' | 'in_app'>;
  
  // الـ SOP المرتبط
  sopId?: string; // المرجع إلى Standard Operating Procedure
  
  // الإعدادات
  enabled: boolean;
  priority: number; // ترتيب الأولوية (قواعد ذات أولوية أعلى تُنفذ أولاً)
  
  created_at: string;
  updated_at: string;
}

export interface OverdueContract {
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  vehicleNumber?: string;
  monthlyAmount: number;
  dueDate: string;
  daysOverdue: number;
  totalPaid: number;
  remainingBalance: number;
  overdueAmount: number; // متضمن رسوم التأخير
  lastPaymentDate: string | null;
  
  // التذكير
  remindersSent: {
    days7: boolean;
    days15: boolean;
    days30: boolean;
  };
  
  // الإجراءات
  actions: Array<{
    action: string;
    actionDate: string;
    performedBy: string;
    notes?: string;
  }>;
  
  // الاستجابة
  customerResponse: {
    lastContactDate: string | null;
    contactMethod: string | null; // whatsapp, call, email
    response: string | null; // promised_payment, disputed, no_response
    notes: string | null;
  };
  
  status: 'active' | 'warning' | 'critical' | 'suspended' | 'resolved' | 'written_off';
  escalatedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface OverdueSummary {
  companyId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // الإحصائيات
  totalContracts: number;
  totalOverdue: number;
  totalValueOverdue: number;
  
  // التفصيل
  statusBreakdown: {
    active: number;
    warning: number;
    critical: number;
    suspended: number;
  };
  
  // الإجراءات المطبقة
  actionsTaken: {
    remindersSent7Days: number;
    remindersSent15Days: number;
    remindersSent30Days: number;
    remindersEscalated: number;
    contractsEscalated: number;
    contractsSuspended: number;
  };
  
  // التوقعات
  estimatedCollectionRate: number; // نسبة التحصيل المتوقعة
  predictedCollectionAmount: number; // المبلغ المتوقع تحصيله
  
  calculatedAt: string;
}

export interface CustomerEscalationRule {
  customerId: string;
  escalationLevel: number; // 0: normal, 1: warning, 2: high, 3: critical
  lastEscalationDate: string;
  escalationCount: number;
  notes?: string;
}

export interface SOP {
  id: string;
  companyId: string;
  name: string;
  nameEn?: string;
  type: 'communication' | 'collection' | 'legal' | 'dispute';
  description: string;
  descriptionEn?: string;
  steps: Array<{
    step: number;
    description: string;
    descriptionEn?: string;
    actions: string[];
  }>;
  requiredActions: string[]; // required escalation steps
  escalationCondition?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

class OverdueManagementService {
  /**
   * حساب المتأخرات للعقود
   */
  async calculateOverdueContracts(
    companyId: string,
    options: {
      asOfDate?: string;
      minDaysOverdue?: number;
      includeInactiveContracts?: boolean;
    } = {}
  ): Promise<{
    contracts: OverdueContract[];
    summary: {
      totalOverdue: number;
      totalValueOverdue: number;
      statusBreakdown: any;
    };
  }> {
    try {
      logger.info('Calculating overdue contracts', { companyId, options });

      const asOfDate = options.asOfDate || new Date().toISOString();

      // جلب العقود مع المدفوعات
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          c.*,
          customers!contracts_customer_id_fkey (
            id as customer_id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone
          ),
          vehicles!contracts_vehicles_fkey (
            plate_number
          ),
          (
            SELECT 
              MAX(p.payment_date) as last_payment_date,
              SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount ELSE 0 END) as total_paid
            FROM payments p
            WHERE p.contract_id = c.id
              AND p.payment_date <= DATE(:as_of_date)
          ) as payments
        `)
        .eq('c.company_id', companyId)
        .in('c.status', ['active', 'under_review', 'suspended'] || options.includeInactiveContracts !== false ? ['active', 'under_review', 'suspended', 'cancelled'] : ['active', 'under_review', 'suspended'])
        .order('c.start_date', { ascending: false })
        .range(0, 500); // أقصى 500 عقد

      if (!contracts || contracts.length === 0) {
        return {
          contracts: [],
          summary: {
            totalOverdue: 0,
            totalValueOverdue: 0,
            statusBreakdown: {
              active: 0,
              warning: 0,
              critical: 0,
              suspended: 0
            }
          }
        };
      }

      // حساب المتأخرات
      const overdueContracts: OverdueContract[] = [];
      let totalOverdue = 0;
      let totalValueOverdue = 0;

      for (const contract of contracts) {
        const lastPaymentDate = contract.payments?.last_payment_date;
        const totalPaid = contract.payments?.total_paid || 0;

        // التحقق من تاريخ الاستحقاق
        if (!contract.end_date) {
          continue;
        }

        const today = new Date();
        const dueDate = new Date(contract.end_date);
        
        // حساب الأيام المتأخرة
        let daysOverdue = 0;
        
        // إذا لم يوجد مدفوعات، استخدم تاريخ اليوم
        const referenceDate = lastPaymentDate ? new Date(lastPaymentDate) : today;
        
        // حساب الأيام من تاريخ الاستحقاق
        if (dueDate < referenceDate) {
          const diffTime = referenceDate.getTime() - dueDate.getTime();
          daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // العقد لم يُحن بعد تاريخ الاستحقاق (أقل من شهر مثلاً)
          // نحتاج لمنطق أكثر تعقيداً
          daysOverdue = 0;
        }

        // تطبيق فلتر الحد الأدنى
        if (options.minDaysOverdue && daysOverdue < options.minDaysOverdue) {
          continue;
        }

        const remainingBalance = contract.contract_amount - totalPaid;
        const overdueAmount = daysOverdue > 0 ? remainingBalance : 0;

        // تحديد الحالة
        let status: any;
        if (daysOverdue === 0) {
          status = 'active';
        } else if (daysOverdue <= 7) {
          status = 'warning';
        } else if (daysOverdue <= 15) {
          status = 'warning';
        } else if (daysOverdue <= 30) {
          status = 'critical';
        } else {
          status = 'critical'; // over 30 days is also critical
        }

        const overdueContract: OverdueContract = {
          contractId: contract.id,
          contractNumber: contract.contract_number,
          customerId: contract.customers.customer_id,
          customerName: contract.customers.company_name_ar || contract.customers.company_name ||
            `${contract.customers.first_name_ar || contract.customers.first_name} ${contract.customers.last_name_ar || contract.customers.last_name}`,
          customerPhone: contract.customers.phone,
          vehicleNumber: contract.vehicles?.plate_number,
          monthlyAmount: contract.monthly_amount,
          dueDate: contract.end_date,
          daysOverdue,
          totalPaid,
          remainingBalance,
          overdueAmount,
          lastPaymentDate: lastPaymentDate || null,
          remindersSent: {
            days7: false,
            days15: false,
            days30: false
          },
          actions: [],
          customerResponse: {
            lastContactDate: null,
            contactMethod: null,
            response: null,
            notes: null
          },
          status,
          escalatedAt: null,
          resolvedAt: null,
          resolvedBy: null,
          createdAt: contract.created_at,
          updatedAt: contract.updated_at
        };

        if (daysOverdue >= (options.minDaysOverdue || 0)) {
          overdueContracts.push(overdueContract);
          totalOverdue++;
          totalValueOverdue += overdueAmount;
        }
      }

      // حساب تفصيل الحالات
      const statusBreakdown = {
        active: overdueContracts.filter(c => c.status === 'active').length,
        warning: overdueContracts.filter(c => c.status === 'warning').length,
        critical: overdueContracts.filter(c => c.status === 'critical').length,
        suspended: contracts.filter(c => c.status === 'suspended').length
      };

      const summary = {
        totalOverdue,
        totalValueOverdue,
        statusBreakdown
      };

      logger.info('Overdue contracts calculated', {
        companyId,
        overdueCount: overdueContracts.length,
        totalOverdue,
        totalValueOverdue
      });

      return {
        contracts: overdueContracts,
        summary
      };
    } catch (error) {
      logger.error('Failed to calculate overdue contracts', { companyId, error });
      return {
        contracts: [],
        summary: {
          totalOverdue: 0,
          totalValueOverdue: 0,
          statusBreakdown: {
            active: 0,
            warning: 0,
            critical: 0,
            suspended: 0
          }
        }
      };
    }
  }

  /**
   * إرسال تذكيرات المتأخرات
   */
  async sendOverdueReminders(
    companyId: string,
    options: {
      contracts?: string[];
      channels?: Array<'whatsapp' | 'sms' | 'email'>;
      force?: boolean; // إرسال فوري حتى لو لم يحين الأوان
    } = {}
  ): Promise<{
    sentCount: number;
    errors: string[];
  }> {
    try {
      logger.info('Sending overdue reminders', { companyId, options });

      // الحصول على العقود المتأخرة إذا لم يتم تحديدها
      let overdueContracts: OverdueContract[];
      
      if (options.contracts && options.contracts.length > 0) {
        // جلب العقود المحددة
        const { data: contracts } = await supabase
          .from('contracts')
          .select(`
            c.*,
            customers!contracts_customer_id_fkey (
              id as customer_id,
              first_name,
              last_name,
              first_name_ar,
              last_name_ar,
              company_name,
              company_name_ar,
              phone
            ),
            vehicles!contracts_vehicles_fkey (
              plate_number
            )
          `)
          .in('c.id', options.contracts);

        if (!contracts || contracts.length === 0) {
          return {
            sentCount: 0,
            errors: ['لا توجد عقود محددة']
          };
        }

        // تحويل بياناتهم
        overdueContracts = contracts.map(c => ({
          ...c,
          customerId: c.customers.customer_id,
          customerName: c.customers.company_name_ar || c.customers.company_name ||
            `${c.customers.first_name_ar || c.customers.first_name} ${c.customers.last_name_ar || c.customers.last_name}`,
          customerPhone: c.customers.phone,
          vehicleNumber: c.vehicles?.plate_number
        }));

      } else {
        // استخدام البيانات المحسوبة مسبقاً
        const calculated = await this.calculateOverdueContracts(companyId, { asOfDate: new Date().toISOString() });
        overdueContracts = calculated.contracts;
      }

      const channelsToUse = options.channels || ['whatsapp', 'in_app'];

      let sentCount = 0;
      const errors: string[] = [];

      // الحصول على قواعد التذكير النشطة
      const reminderRules = await this.getActiveReminderRules(companyId);

      // إرسال التذكيرات
      for (const contract of overdueContracts) {
        const applicableRule = this.findApplicableReminderRule(reminderRules, contract.daysOverdue);

        if (!applicableRule) {
          logger.warn('No applicable reminder rule', { contractId: contract.contractId, daysOverdue: contract.daysOverdue });
          continue;
        }

        try {
          // إرسال عبر كل قناة
          for (const channel of channelsToUse) {
            if (!applicableRule.channels.includes(channel)) {
              continue;
            }

            const reminderSent = await notificationService.sendPaymentReceipt(
              contractId,
              companyId,
              {
                channels: [channel],
                autoSend: false
              }
            );

            if (reminderSent.success) {
              sentCount++;
              
              // تسجيل إرسال التذكير
              await this.recordReminderSent(contractId, channel, contract.daysOverdue);

              logger.info('Overdue reminder sent', {
                contractId: contract.contractNumber,
                channel,
                daysOverdue: contract.daysOverdue
              });
            } else {
              errors.push(`فشل إرسال ${channel} للعقد ${contract.contractNumber}: ${reminderSent.errors.join(', ')}`);
            }
          }

          // تحديث عدد التذكيرات المرسلة
          if (sentCount > 0) {
            await this.updateReminderCounts(contractId, {
              days7: contract.daysOverdue >= 7,
              days15: contract.daysOverdue >= 15,
              days30: contract.daysOverdue >= 30
            });
          }

        } catch (contractError) {
          errors.push(`خطأ في عقد ${contract.contractNumber}: ${contractError instanceof Error ? contractError.message : 'خطأ غير معروف'}`);
        }
      }

      logger.info('Overdue reminders completed', {
        companyId,
        contractsProcessed: overdueContracts.length,
        sentCount,
        errorsCount: errors.length
      });

      return {
        sentCount,
        errors
      };
    } catch (error) {
      logger.error('Failed to send overdue reminders', { companyId, error });
      return {
        sentCount: 0,
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف']
      };
    }
  }

  /**
   * الحصول على قواعد التذكير النشطة
   */
  private async getActiveReminderRules(companyId: string): Promise<OverdueReminderRule[]> {
    const { data: rules } = await supabase
      .from('overdue_reminder_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('enabled', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    return rules || [];
  }

  /**
   * البحث عن قاعدة تذكير مناسبة
   */
  private findApplicableReminderRule(
    rules: OverdueReminderRule[],
    daysOverdue: number
  ): OverdueReminderRule | null {
    // البحث عن أول قاعدة تطابق
    for (const rule of rules) {
      if (daysOverdue >= rule.reminderDays) {
        return rule;
      }
    }

    return null;
  }

  /**
   * تسجيل إرسال تذكير
   */
  private async recordReminderSent(
    contractId: string,
    channel: 'whatsapp' | 'sms' | 'email',
    daysOverdue: number
  ): Promise<boolean> {
    try {
      await supabase.from('overdue_reminders').insert({
        company_id: await this.getCompanyId(contractId),
        contract_id: contractId,
        channel,
        days_overdue: daysOverdue,
        sent_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Failed to record reminder', { contractId, channel, error });
      return false;
    }
  }

  /**
   * تحديث أعداد التذكيرات
   */
  private async updateReminderCounts(
    contractId: string,
    counts: {
      days7?: boolean;
      days15?: boolean;
      days30?: boolean;
    }
  ): Promise<boolean> {
    try {
      await supabase
        .from('overdue_contracts')
        .update({
          reminders_sent_7_days: counts.days7 || false,
          reminders_sent_15_days: counts.days15 || false,
          reminders_sent_30_days: counts.days30 || false
        })
        .eq('id', contractId);

      return true;
    } catch (error) {
      logger.error('Failed to update reminder counts', { contractId, error });
      return false;
    }
  }

  /**
   * تصعيد العقد المتأخر
   */
  async escalateContract(
    contractId: string,
    escalationNotes: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Escalating overdue contract', { contractId, escalationNotes });

      const now = new Date().toISOString();

      // تحديث حالة العقد
      await supabase
        .from('overdue_contracts')
        .update({
          status: 'critical',
          escalated_at: now,
          escalated_by: userId,
          resolution_notes: escalationNotes,
          updated_at: now
        })
        .eq('id', contractId);

      // إرسال إشعار داخلي
      await notificationService.sendStaffNotification(
        await this.getCompanyId(contractId),
        {
          type: 'overdue_alert',
          title: 'تصعيد عقد متأخر',
          message: `تم تصعيد العقد ${contractId} - ${escalationNotes}`,
          priority: 'high',
          data: {
            contractId,
            escalationNotes,
            userId
          }
        },
        {
          channels: ['in_app']
        }
      );

      logger.info('Contract escalated', { contractId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to escalate contract', { contractId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * تسجيل استجابة العميل
   */
  async recordCustomerResponse(
    contractId: string,
    response: {
      contactMethod?: 'whatsapp' | 'call' | 'email';
      responseText?: string;
      promisedPaymentDate?: string;
      disputeReason?: string;
    },
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Recording customer response', { contractId, response });

      const now = new Date().toISOString();
      const customerId = await this.getCustomerId(contractId);

      // تحديث العقد
      await supabase
        .from('overdue_contracts')
        .update({
          customer_response: {
            last_contact_date: now,
            contact_method: response.contactMethod,
            response: response.responseText || response.promisedPaymentDate || response.disputeReason,
            notes: response.promisedPaymentDate ? `وعد دفع ${response.promisedPaymentDate}` :
                     response.disputeReason ? `سبب النزاع: ${response.disputeReason}` :
                     response.responseText
          },
          updated_at: now
        })
        .eq('id', contractId);

      // تسجيل في escalation log
      await supabase.from('customer_escalations').insert({
        company_id: await this.getCompanyId(contractId),
        customer_id: customerId,
        escalation_level: response.contactMethod && response.disputeReason ? 2 : 1, // warning if dispute, else normal
        last_escalation_date: now,
        escalation_count: 1, // increment
        notes: response.promisedPaymentDate || response.disputeReason || response.responseText,
        created_by: userId
      });

      logger.info('Customer response recorded', { contractId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to record customer response', { contractId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * إلغاء عقد متأخر (write-off)
   */
  async writeOffContract(
    contractId: string,
    writeOffReason: string,
    writeOffAmount?: number,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Writing off overdue contract', { contractId, writeOffReason });

      const now = new Date().toISOString();

      // تحديث العقد إلى حالة resolved
      await supabase
        .from('overdue_contracts')
        .update({
          status: 'resolved',
          resolved_at: now,
          resolved_by: userId,
          resolution_notes: `إلغاء العقد: ${writeOffReason}`,
          updated_at: now
        })
        .eq('id', contractId);

      // تسجيل في escalation log
      await supabase.from('customer_escalations').insert({
        company_id: await this.getCompanyId(contractId),
        customer_id: await this.getCustomerId(contractId),
        escalation_level: 3, // critical
        last_escalation_date: now,
        escalation_count: 1,
        notes: `إلغاء العقد: ${writeOffReason}${writeOffAmount ? ` - المبلغ: ${writeOffAmount}` : ''}`,
        created_by: userId
      });

      logger.info('Contract written off', { contractId, writeOffAmount });
      return { success: true };
    } catch (error) {
      logger.error('Failed to write off contract', { contractId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * الحصول على ملخص المتأخرات
   */
  async getOverdueSummary(
    companyId: string,
    options: {
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<OverdueSummary> {
    try {
      logger.info('Calculating overdue summary', { companyId, options });

      const calculated = await this.calculateOverdueContracts(companyId, options);

      const summary: OverdueSummary = {
        companyId,
        period: {
          startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: options.endDate || new Date().toISOString()
        },
        totalContracts: calculated.contracts.length,
        totalOverdue: calculated.summary.totalOverdue,
        totalValueOverdue: calculated.summary.totalValueOverdue,
        statusBreakdown: calculated.summary.statusBreakdown,
        actionsTaken: {
          remindersSent7Days: 0, // TODO: حساب من التاريخ
          remindersSent15Days: 0, // TODO: حساب من التاريخ
          remindersSent30Days: 0, // TODO: حساب من التاريخ
          remindersEscalated: 0, // TODO: حساب من التاريخ
          contractsEscalated: calculated.summary.statusBreakdown.critical || 0,
          contractsSuspended: calculated.summary.statusBreakdown.suspended || 0
        },
        estimatedCollectionRate: 0.75, // افتراضياً 75%
        predictedCollectionAmount: calculated.summary.totalValueOverdue * 0.75
      };

      logger.info('Overdue summary calculated', {
        companyId,
        ...summary
      });

      return summary;
    } catch (error) {
      logger.error('Failed to calculate overdue summary', { companyId, error });
      throw error;
    }
  }

  /**
   * Helper: الحصول على company_id من معاملة أو عقد
   */
  private async getCompanyId(contractId: string): Promise<string> {
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('company_id')
        .eq('id', contractId)
        .single();

      return contract?.company_id || '';
    } catch (error) {
      logger.error('Failed to get company_id from contract', { contractId, error });
      return '';
    }
  }

  /**
   * Helper: الحصول على customer_id من عقد
   */
  private async getCustomerId(contractId: string): Promise<string> {
    try {
      const { data: contract } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('id', contractId)
        .single();

      return contract?.customer_id || '';
    } catch (error) {
      logger.error('Failed to get customer_id from contract', { contractId, error });
      return '';
    }
  }
}

// Export singleton instance
export const overdueManagementService = new OverdueManagementService();
