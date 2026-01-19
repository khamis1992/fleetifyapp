/**
 * Payment State Machine
 * 
 * Machine state لإدارة حالات الدفعة:
 * - pending → processing → completed | failed | voided
 * - مع حماية من الانتقالات الخاطئة
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { auditTrailSystem } from '@/utils/auditTrailSystem';

/**
 * حالات الدفعة الممكنة
 */
export enum PaymentState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VOIDED = 'voided',
  REVERSED = 'reversed'
}

/**
 * الأحداث التي يمكن أن تُثر في حالة الدفعة
 */
export enum PaymentEvent {
  START_PROCESSING = 'start_processing',
  COMPLETE = 'complete',
  FAIL = 'fail',
  VOID = 'void',
  REVERSE = 'reverse',
  RETRY = 'retry'
}

/**
 * معلومات الانتقال بين الحالات
 */
export interface StateTransition {
  fromState: PaymentState;
  toState: PaymentState;
  event: PaymentEvent;
  timestamp: string;
  paymentId: string;
  userId?: string;
  reason?: string;
}

/**
 * تكوين الـ State Machine
 */
interface StateMachineConfig {
  enableAutoRetry: boolean;
  maxRetries: number;
  retryDelayMs: number;
  enableAutoVoidOnOverpayment: boolean;
  maxOverpaymentThreshold: number; // percentage (e.g., 110 = 110%)
}

const DEFAULT_CONFIG: StateMachineConfig = {
  enableAutoRetry: true,
  maxRetries: 3,
  retryDelayMs: 5000, // 5 ثواني
  enableAutoVoidOnOverpayment: true,
  maxOverpaymentThreshold: 110
};

class PaymentStateMachine {
  private transitions: Map<string, PaymentState> = new Map();
  private retryCount: Map<string, number> = new Map();
  private config: StateMachineConfig;
  private transitionHistory: Map<string, StateTransition[]> = new Map();

  constructor(config?: Partial<StateMachineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMachine();
  }

  /**
   * تهيئة الـ State Machine
   */
  private initializeMachine(): void {
    // تعريف الانتقالات المسموحة
    this.transitions.set(`${PaymentState.PENDING}:${PaymentEvent.START_PROCESSING}`, PaymentState.PROCESSING);
    this.transitions.set(`${PaymentState.PROCESSING}:${PaymentEvent.COMPLETE}`, PaymentState.COMPLETED);
    this.transitions.set(`${PaymentState.PROCESSING}:${PaymentEvent.FAIL}`, PaymentState.FAILED);
    this.transitions.set(`${PaymentState.COMPLETED}:${PaymentEvent.VOID}`, PaymentState.VOIDED);
    this.transitions.set(`${PaymentState.COMPLETED}:${PaymentEvent.REVERSE}`, PaymentState.REVERSED);
    
    // محاولة إعادة من الفشل
    this.transitions.set(`${PaymentState.FAILED}:${PaymentEvent.RETRY}`, PaymentState.PROCESSING);
    this.transitions.set(`${PaymentState.FAILED}:${PaymentEvent.VOID}`, PaymentState.VOIDED);

    logger.info('PaymentStateMachine initialized', { config: this.config });
  }

  /**
   * تنفيذ انتقال حالة
   */
  async transition(
    paymentId: string,
    event: PaymentEvent,
    options: {
      userId?: string;
      reason?: string;
      skipValidation?: boolean;
      force?: boolean;
    } = {}
  ): Promise<{ success: boolean; newState?: PaymentState; error?: string }> {
    try {
      // 1. جلب الدفعة الحالية
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) {
        return {
          success: false,
          error: 'الدفعة غير موجودة'
        };
      }

      const currentState = payment.processing_status as PaymentState || PaymentState.PENDING;

      // 2. التحقق من الانتقال
      if (!options.skipValidation && !options.force) {
        const validationResult = this.validateTransition(currentState, event, payment);
        if (!validationResult.isValid) {
          return {
            success: false,
            error: validationResult.error
          };
        }

        // التحقق من overpayment للدفعات المكتملة
        if (currentState === PaymentState.COMPLETED && event === PaymentEvent.VOID) {
          if (this.config.enableAutoVoidOnOverpayment) {
            const overpaymentCheck = await this.checkOverpayment(payment);
            if (overpaymentCheck.isOverpayment && !options.force) {
              return {
                success: false,
                error: `الدفعة تتجاوز الحد المسموح (${overpaymentCheck.percentage}% من الحد الأقصى ${this.config.maxOverpaymentThreshold}%)`
              };
            }
          }
        }
      }

      // 3. تنفيذ الانتقال
      const newState = this.transitions.get(`${currentState}:${event}`);

      if (!newState || newState === currentState) {
        return {
          success: false,
          error: `انتقال غير مسموح من ${currentState} إلى ${newState || currentState}`
        };
      }

      // 4. إعادة محاولات الفشل
      if (event === PaymentEvent.RETRY) {
        const currentRetries = this.retryCount.get(paymentId) || 0;
        if (currentRetries >= this.config.maxRetries) {
          return {
            success: false,
            error: `تجاوز عدد المحاولات المسموح (${this.config.maxRetries})`
          };
        }
        this.retryCount.set(paymentId, currentRetries + 1);
        logger.info(`Retrying payment (${currentRetries + 1}/${this.config.maxRetries})`, { paymentId });
      } else if (event === PaymentEvent.COMPLETE || event === PaymentEvent.VOID || event === PaymentEvent.REVERSE) {
        // إعادة تعيين عداد المحاولات عند النجاح
        this.retryCount.set(paymentId, 0);
      }

      // 5. تحديث الدفعة في قاعدة البيانات
      const updateData: any = {
        processing_status: newState,
        processing_notes: this.buildProcessingNote(currentState, newState, options.reason)
      };

      // إضافة معلومات إضافية حسب الحالة
      if (newState === PaymentState.PROCESSING) {
        updateData.processing_started_at = new Date().toISOString();
      } else if (newState === PaymentState.COMPLETED) {
        updateData.processing_completed_at = new Date().toISOString();
        updateData.payment_status = 'completed';
        updateData.allocation_status = payment.allocation_status || 'fully_allocated';
        updateData.reconciliation_status = payment.reconciliation_status || 'matched';
      } else if (newState === PaymentState.FAILED) {
        updateData.processing_failed_at = new Date().toISOString();
        updateData.payment_status = 'failed';
        updateData.allocation_status = null;
        updateData.reconciliation_status = null;
      } else if (newState === PaymentState.VOIDED) {
        updateData.payment_status = 'voided';
        updateData.allocation_status = null;
        updateData.reconciliation_status = null;
      } else if (newState === PaymentState.REVERSED) {
        updateData.payment_status = 'cancelled';
        updateData.allocation_status = null;
        updateData.reconciliation_status = null;
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (updateError) {
        logger.error('Failed to update payment state', { updateError, paymentId });
        throw updateError;
      }

      // 6. تسجل الانتقال
      const transition: StateTransition = {
        fromState: currentState,
        toState: newState,
        event,
        timestamp: new Date().toISOString(),
        paymentId,
        userId: options.userId,
        reason: options.reason
      };

      this.recordTransition(transition);

      // سجل تدقيق
      auditTrailSystem.logPaymentAction(
        `state_transition_${event}`,
        paymentId,
        options.userId || payment.created_by || 'system',
        payment.company_id,
        undefined,
        {
          fromState: currentState,
          toState: newState,
          event,
          reason: options.reason
        }
      );

      // 7. إشعارات بناءً على الحالة الجديدة
      this.handleStateChangeNotification(payment, currentState, newState, options.userId);

      logger.info('Payment state transition completed', {
        paymentId,
        fromState: currentState,
        toState: newState,
        event,
        reason: options.reason
      });

      return {
        success: true,
        newState
      };

    } catch (error) {
      logger.error('Payment state transition failed', { error, paymentId, event });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل في تغيير حالة الدفعة'
      };
    }
  }

  /**
   * التحقق من صحة الانتقال
   */
  private validateTransition(
    currentState: PaymentState,
    event: PaymentEvent,
    payment: any
  ): { isValid: boolean; error?: string } {
    const allowedTransition = this.transitions.get(`${currentState}:${event}`);
    
    if (!allowedTransition) {
      return {
        isValid: false,
        error: `انتقال غير مسموح: ${currentState} --${event}-->${allowedTransition || currentState}`
      };
    }

    // التحقق من الشروط الإضافية
    if (currentState === PaymentState.COMPLETED) {
      if (event === PaymentEvent.VOID) {
        // السماح بـ void فقط إذا كان الدفعة قبل فترة قصيرة (7 أيام)
        const completedDate = new Date(payment.processing_completed_at || payment.updated_at);
        const daysSinceCompletion = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCompletion > 7) {
          return {
            isValid: false,
            error: 'لا يمكن فك دفعة مكتملة بعد 7 أيام'
          };
        }
      }
      
      if (event === PaymentEvent.REVERSE) {
        // التحقق من أن القيد المحاسبي لم يتم مرحله بعد
        if (payment.journal_entry_id) {
          const { data: journalEntry } = await supabase
            .from('journal_entries')
            .select('status')
            .eq('id', payment.journal_entry_id)
            .single();

          if (journalEntry?.status === 'posted') {
            return {
              isValid: false,
              error: 'لا يمكن فك دفعة ذات قيد محاسبي مرحل'
            };
          }
        }
      }
    }

    return { isValid: true };
  }

  /**
   * التحقق من overpayment
   */
  private async checkOverpayment(
    payment: any
  ): Promise<{ isOverpayment: boolean; percentage: number }> {
    try {
      // التحقق من الفاتورة المرتبطة
      if (payment.invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('total_amount', 'paid_amount')
          .eq('id', payment.invoice_id)
          .single();

        if (invoice) {
          const totalPaid = (invoice.paid_amount || 0) + payment.amount;
          const percentage = (totalPaid / invoice.total_amount) * 100;
          
          return {
            isOverpayment: percentage > this.config.maxOverpaymentThreshold,
            percentage
          };
        }
      }

      // التحقق من العقد المرتبط
      if (payment.contract_id) {
        const { data: contract } = await supabase
          .from('contracts')
          .select('contract_amount', 'total_paid')
          .eq('id', payment.contract_id)
          .single();

        if (contract) {
          const totalPaid = (contract.total_paid || 0) + payment.amount;
          const percentage = (totalPaid / contract.contract_amount) * 100;
          
          return {
            isOverpayment: percentage > this.config.maxOverpaymentThreshold,
            percentage
          };
        }
      }

      return { isOverpayment: false, percentage: 0 };
    } catch (error) {
      logger.error('Failed to check overpayment', { error, paymentId: payment.id });
      return { isOverpayment: false, percentage: 0 };
    }
  }

  /**
   * بناء ملاحظة المعالجة
   */
  private buildProcessingNote(
    fromState: PaymentState,
    toState: PaymentState,
    reason?: string
  ): string {
    const stateNames: Record<PaymentState, string> = {
      [PaymentState.PENDING]: 'معلق',
      [PaymentState.PROCESSING]: 'جاري المعالجة',
      [PaymentState.COMPLETED]: 'مكتمل',
      [PaymentState.FAILED]: 'فشل',
      [PaymentState.VOIDED]: 'ملغي',
      [PaymentState.REVERSED]: 'مرجوع'
    };

    let note = `انتقال: ${stateNames[fromState]} → ${stateNames[toState]}`;
    
    if (reason) {
      note += `. السب: ${reason}`;
    }

    return note;
  }

  /**
   * تسجل الانتقال في التاريخ
   */
  private recordTransition(transition: StateTransition): void {
    const history = this.transitionHistory.get(transition.paymentId) || [];
    history.push(transition);
    this.transitionHistory.set(transition.paymentId, history);
    
    logger.debug('Transition recorded', {
      paymentId: transition.paymentId,
      transition: `${transition.fromState} → ${transition.toState}`,
      event: transition.event
    });
  }

  /**
   * الحصول على تاريخ انتقالات دفعة
   */
  getTransitionHistory(paymentId: string): StateTransition[] {
    return this.transitionHistory.get(paymentId) || [];
  }

  /**
   * مسح تاريخ الانتقالات (للاختبار)
   */
  clearTransitionHistory(paymentId?: string): void {
    if (paymentId) {
      this.transitionHistory.delete(paymentId);
      this.retryCount.delete(paymentId);
    } else {
      this.transitionHistory.clear();
      this.retryCount.clear();
    }
    
    logger.debug('Transition history cleared', { paymentId });
  }

  /**
   * الحصول على الحالة الحالية
   */
  async getCurrentState(paymentId: string): Promise<PaymentState | null> {
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('processing_status')
        .eq('id', paymentId)
        .single();

      return (payment?.processing_status as PaymentState) || null;
    } catch (error) {
      logger.error('Failed to get payment state', { error, paymentId });
      return null;
    }
  }

  /**
   * البحث عن المدفوعات في حالة معينة
   */
  async findPaymentsByState(
    companyId: string,
    state: PaymentState,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .eq('processing_status', state)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to find payments by state', { error, companyId, state });
      return [];
    }
  }

  /**
   * معالجة إشعارات تغيير الحالة
   */
  private handleStateChangeNotification(
    payment: any,
    fromState: PaymentState,
    toState: PaymentState,
    userId?: string
  ): void {
    // حالياً فقط log - يمكن توسيع لإرسال notifications فعلية
    logger.info('State change notification', {
      paymentId: payment.id,
      paymentNumber: payment.payment_number,
      from: fromState,
      to: toState,
      userId
    });

    // TODO: إرسال إشعارات فعلية:
    // - لكل من الفشل/void/reverse
    // - رسائل WhatsApp/Email للعملاء
    // - إشعارات داخل النظام للموظفين
  }

  /**
   * الحصول على إحصائيات الحالات
   */
  async getStateStatistics(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Record<PaymentState, number>> {
    try {
      let query = supabase
        .from('payments')
        .select('processing_status')
        .eq('company_id', companyId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: Record<PaymentState, number> = {
        [PaymentState.PENDING]: 0,
        [PaymentState.PROCESSING]: 0,
        [PaymentState.COMPLETED]: 0,
        [PaymentState.FAILED]: 0,
        [PaymentState.VOIDED]: 0,
        [PaymentState.REVERSED]: 0
      };

      (data || []).forEach(payment => {
        const state = payment.processing_status as PaymentState;
        if (state && stats[state] !== undefined) {
          stats[state]++;
        }
      });

      logger.info('Payment state statistics computed', { companyId, stats });

      return stats;
    } catch (error) {
      logger.error('Failed to compute state statistics', { error, companyId });
      return {
        [PaymentState.PENDING]: 0,
        [PaymentState.PROCESSING]: 0,
        [PaymentState.COMPLETED]: 0,
        [PaymentState.FAILED]: 0,
        [PaymentState.VOIDED]: 0,
        [PaymentState.REVERSED]: 0
      };
    }
  }

  /**
   * إعادة محاولة دفعة فاشلة
   */
  async retryPayment(
    paymentId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Retrying payment', { paymentId });

    const result = await this.transition(paymentId, PaymentEvent.RETRY, {
      userId,
      reason: 'إعادة محاولة تلقائية'
    });

    return result;
  }

  /**
   * فك دفعة مكتملة
   */
  async voidPayment(
    paymentId: string,
    userId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Voiding payment', { paymentId, reason });

    const result = await this.transition(paymentId, PaymentEvent.VOID, {
      userId,
      reason: reason || 'إلغاء الدفعة من قبل المستخدم'
    });

    return result;
  }

  /**
   * مرجعة دفعة مكتملة
   */
  async reversePayment(
    paymentId: string,
    userId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Reversing payment', { paymentId, reason });

    const result = await this.transition(paymentId, PaymentEvent.REVERSE, {
      userId,
      reason: reason || 'إلغاء الدفعة وإنشاء قيد عكسي'
    });

    // TODO: إنشاء قيد محاسبي عكسي
    // 1. الحصول على القيد الأصلي
    // 2. إنشاء قيد عكسي (debits become credits)
    // 3. ربط القيد العكسي بالدفعة

    return result;
  }

  /**
   * بدء معالجة دفعة
   */
  async startProcessing(
    paymentId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.transition(paymentId, PaymentEvent.START_PROCESSING, {
      userId,
      reason: 'بدء معالجة الدفعة'
    });
  }

  /**
   * إكمال معالجة دفعة
   */
  async completePayment(
    paymentId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.transition(paymentId, PaymentEvent.COMPLETE, {
      userId,
      reason: 'إكمال معالجة الدفعة بنجاح'
    });
  }

  /**
   * فشل معالجة دفعة
   */
  async failPayment(
    paymentId: string,
    userId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.transition(paymentId, PaymentEvent.FAIL, {
      userId,
      reason: reason || 'فشل في معالجة الدفعة'
    });
  }

  /**
   * مسح إعدادات الـ retry
   */
  clearRetryCount(paymentId: string): void {
    this.retryCount.delete(paymentId);
  }
}

// Export singleton instance with default config
export const paymentStateMachine = new PaymentStateMachine();

// Export factory for custom config
export function createPaymentStateMachine(config?: Partial<StateMachineConfig>): PaymentStateMachine {
  return new PaymentStateMachine(config);
}
