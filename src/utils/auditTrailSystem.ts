/**
 * نظام التتبع والمراجعة - Audit Trail System
 * نظام شامل لتتبع جميع العمليات والمراجعة في نظام المدفوعات
 */

import { supabase } from '@/integrations/supabase/client';

// ===============================
// أنواع التتبع والمراجعة
// ===============================

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action_type: 'create' | 'update' | 'delete' | 'link' | 'allocate' | 'approve' | 'reverse';
  entity_type: 'payment' | 'contract' | 'invoice' | 'allocation' | 'journal_entry' | 'customer' | 'vendor';
  entity_id: string;
  entity_name: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context?: Record<string, any>;
  related_entities?: RelatedEntity[];
}

export interface RelatedEntity {
  entity_type: string;
  entity_id: string;
  relationship: string;
}

export interface AuditQuery {
  company_id: string;
  user_id?: string;
  action_type?: string;
  entity_type?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_user: Record<string, number>;
  actions_by_entity: Record<string, number>;
  actions_by_severity: Record<string, number>;
  recent_activities: AuditLog[];
  critical_events: AuditLog[];
}

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  name: string;
  description: string;
  entity_type: 'payment' | 'journal_entry' | 'invoice' | 'contract';
  conditions: WorkflowCondition[];
  steps: WorkflowStep[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowStep {
  id: string;
  step_number: number;
  step_name: string;
  approver_role: string;
  approver_user_id?: string;
  required: boolean;
  auto_approve_conditions?: WorkflowCondition[];
  escalation_timeout?: number; // بالدقائق
  escalation_approver_role?: string;
}

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  entity_id: string;
  entity_type: string;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  escalation_reason?: string;
  step_history: ApprovalStepHistory[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalStepHistory {
  step_number: number;
  step_name: string;
  approver_user_id?: string;
  approver_role: string;
  action: 'assigned' | 'approved' | 'rejected' | 'escalated';
  timestamp: string;
  notes?: string;
  rejection_reason?: string;
}

// ===============================
// نظام التتبع والمراجعة
// ===============================

export class AuditTrailSystem {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * تسجيل عملية في سجل المراجعة
   */
  async logAction(
    action: Omit<AuditLog, 'id' | 'company_id' | 'timestamp'>,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: crypto.randomUUID(),
        company_id: this.companyId,
        timestamp: new Date().toISOString(),
        context,
        ...action
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditLog);

      if (error) {
        console.error('❌ خطأ في تسجيل العملية:', error);
        throw error;
      }

      console.log('✅ تم تسجيل العملية بنجاح:', action.action_type);

    } catch (error) {
      console.error('❌ خطأ في تسجيل العملية:', error);
      throw error;
    }
  }

  /**
   * تسجيل إنشاء مدفوعة
   */
  async logPaymentCreation(
    payment: any,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<void> {
    await this.logAction({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action_type: 'create',
      entity_type: 'payment',
      entity_id: payment.id,
      entity_name: payment.payment_number,
      new_values: {
        payment_number: payment.payment_number,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        customer_id: payment.customer_id,
        contract_id: payment.contract_id
      },
      severity: 'info',
      message: `تم إنشاء مدفوعة جديدة رقم ${payment.payment_number} بمبلغ ${payment.amount}`
    });
  }

  /**
   * تسجيل تحديث مدفوعة
   */
  async logPaymentUpdate(
    paymentId: string,
    paymentNumber: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<void> {
    const changes = this.calculateChanges(oldValues, newValues);
    
    await this.logAction({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action_type: 'update',
      entity_type: 'payment',
      entity_id: paymentId,
      entity_name: paymentNumber,
      old_values: oldValues,
      new_values: newValues,
      changes,
      severity: 'info',
      message: `تم تحديث مدفوعة رقم ${paymentNumber}`
    });
  }

  /**
   * تسجيل ربط مدفوعة بعقد
   */
  async logPaymentLinking(
    paymentId: string,
    paymentNumber: string,
    contractId: string,
    contractNumber: string,
    confidence: number,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<void> {
    await this.logAction({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action_type: 'link',
      entity_type: 'payment',
      entity_id: paymentId,
      entity_name: paymentNumber,
      new_values: {
        contract_id: contractId,
        contract_number: contractNumber,
        linking_confidence: confidence
      },
      severity: confidence >= 0.8 ? 'info' : 'warning',
      message: `تم ربط مدفوعة ${paymentNumber} بعقد ${contractNumber} (ثقة: ${Math.round(confidence * 100)}%)`,
      related_entities: [
        {
          entity_type: 'contract',
          entity_id: contractId,
          relationship: 'linked_to'
        }
      ]
    });
  }

  /**
   * تسجيل توزيع مدفوعة
   */
  async logPaymentAllocation(
    paymentId: string,
    paymentNumber: string,
    allocations: any[],
    userId: string,
    userName: string,
    userRole: string
  ): Promise<void> {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    
    await this.logAction({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action_type: 'allocate',
      entity_type: 'payment',
      entity_id: paymentId,
      entity_name: paymentNumber,
      new_values: {
        total_allocated: totalAllocated,
        allocation_count: allocations.length,
        allocations: allocations.map(a => ({
          type: a.allocation_type,
          target_id: a.target_id,
          amount: a.amount
        }))
      },
      severity: 'info',
      message: `تم توزيع مدفوعة ${paymentNumber} على ${allocations.length} هدف بمبلغ إجمالي ${totalAllocated}`,
      related_entities: allocations.map(alloc => ({
        entity_type: alloc.allocation_type,
        entity_id: alloc.target_id,
        relationship: 'allocated_to'
      }))
    });
  }

  /**
   * تسجيل إنشاء قيد محاسبي
   */
  async logJournalEntryCreation(
    journalEntry: any,
    userId: string,
    userName: string,
    userRole: string
  ): Promise<void> {
    await this.logAction({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action_type: 'create',
      entity_type: 'journal_entry',
      entity_id: journalEntry.id,
      entity_name: journalEntry.entry_number,
      new_values: {
        entry_number: journalEntry.entry_number,
        entry_type: journalEntry.entry_type,
        total_debit: journalEntry.total_debit,
        total_credit: journalEntry.total_credit,
        source_type: journalEntry.source_type,
        source_id: journalEntry.source_id
      },
      severity: 'info',
      message: `تم إنشاء قيد محاسبي رقم ${journalEntry.entry_number}`
    });
  }

  /**
   * تسجيل موافقة
   */
  async logApproval(
    entityId: string,
    entityType: string,
    entityName: string,
    action: 'approved' | 'rejected',
    approverUserId: string,
    approverUserName: string,
    approverRole: string,
    reason?: string
  ): Promise<void> {
    await this.logAction({
      user_id: approverUserId,
      user_name: approverUserName,
      user_role: approverRole,
      action_type: 'approve',
      entity_type: entityType as any,
      entity_id: entityId,
      entity_name: entityName,
      new_values: {
        approval_status: action,
        approval_reason: reason,
        approved_at: new Date().toISOString()
      },
      severity: action === 'approved' ? 'info' : 'warning',
      message: `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} ${entityType} ${entityName}${reason ? ` - السبب: ${reason}` : ''}`
    });
  }

  /**
   * البحث في سجل المراجعة
   */
  async searchAuditLogs(query: AuditQuery): Promise<AuditLog[]> {
    try {
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', query.company_id);

      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
      }

      if (query.action_type) {
        supabaseQuery = supabaseQuery.eq('action_type', query.action_type);
      }

      if (query.entity_type) {
        supabaseQuery = supabaseQuery.eq('entity_type', query.entity_type);
      }

      if (query.entity_id) {
        supabaseQuery = supabaseQuery.eq('entity_id', query.entity_id);
      }

      if (query.date_from) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.date_from);
      }

      if (query.date_to) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.date_to);
      }

      if (query.severity) {
        supabaseQuery = supabaseQuery.eq('severity', query.severity);
      }

      supabaseQuery = supabaseQuery
        .order('timestamp', { ascending: false })
        .limit(query.limit || 100)
        .range(query.offset || 0, (query.offset || 0) + (query.limit || 100) - 1);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('❌ خطأ في البحث في سجل المراجعة:', error);
      return [];
    }
  }

  /**
   * الحصول على ملخص المراجعة
   */
  async getAuditSummary(dateFrom?: string, dateTo?: string): Promise<AuditSummary> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', this.companyId);

      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }

      if (dateTo) {
        query = query.lte('timestamp', dateTo);
      }

      const { data: logs, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;

      const summary: AuditSummary = {
        total_actions: logs?.length || 0,
        actions_by_type: {},
        actions_by_user: {},
        actions_by_entity: {},
        actions_by_severity: {},
        recent_activities: (logs || []).slice(0, 10),
        critical_events: (logs || []).filter(log => log.severity === 'critical' || log.severity === 'error').slice(0, 5)
      };

      // تحليل البيانات
      (logs || []).forEach(log => {
        // حسب نوع العملية
        summary.actions_by_type[log.action_type] = (summary.actions_by_type[log.action_type] || 0) + 1;
        
        // حسب المستخدم
        summary.actions_by_user[log.user_name] = (summary.actions_by_user[log.user_name] || 0) + 1;
        
        // حسب نوع الكيان
        summary.actions_by_entity[log.entity_type] = (summary.actions_by_entity[log.entity_type] || 0) + 1;
        
        // حسب مستوى الخطورة
        summary.actions_by_severity[log.severity] = (summary.actions_by_severity[log.severity] || 0) + 1;
      });

      return summary;

    } catch (error) {
      console.error('❌ خطأ في الحصول على ملخص المراجعة:', error);
      return {
        total_actions: 0,
        actions_by_type: {},
        actions_by_user: {},
        actions_by_entity: {},
        actions_by_severity: {},
        recent_activities: [],
        critical_events: []
      };
    }
  }

  /**
   * حساب التغييرات بين القيم القديمة والجديدة
   */
  private calculateChanges(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach(key => {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (oldValue !== newValue) {
        changes[key] = { old: oldValue, new: newValue };
      }
    });

    return changes;
  }

  /**
   * تصدير سجل المراجعة
   */
  async exportAuditLogs(
    query: AuditQuery,
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<string> {
    try {
      const logs = await this.searchAuditLogs(query);

      switch (format) {
        case 'csv':
          return this.exportToCSV(logs);
        case 'json':
          return JSON.stringify(logs, null, 2);
        case 'excel':
          return this.exportToExcel(logs);
        default:
          throw new Error('تنسيق التصدير غير مدعوم');
      }

    } catch (error) {
      console.error('❌ خطأ في تصدير سجل المراجعة:', error);
      throw error;
    }
  }

  /**
   * تصدير إلى CSV
   */
  private exportToCSV(logs: AuditLog[]): string {
    const headers = [
      'التاريخ',
      'المستخدم',
      'الدور',
      'نوع العملية',
      'نوع الكيان',
      'اسم الكيان',
      'الرسالة',
      'مستوى الخطورة',
      'عنوان IP'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.user_name,
      log.user_role,
      log.action_type,
      log.entity_type,
      log.entity_name,
      log.message,
      log.severity,
      log.ip_address || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * تصدير إلى Excel (مبسط)
   */
  private exportToExcel(logs: AuditLog[]): string {
    // يمكن تحسين هذا لاحقاً باستخدام مكتبة Excel
    return this.exportToCSV(logs);
  }
}

// ===============================
// نظام الموافقات
// ===============================

export class ApprovalWorkflowSystem {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * إنشاء طلب موافقة
   */
  async createApprovalRequest(
    workflowId: string,
    entityId: string,
    entityType: string,
    requestedBy: string
  ): Promise<ApprovalRequest> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('سير العمل غير موجود');
      }

      const approvalRequest: ApprovalRequest = {
        id: crypto.randomUUID(),
        workflow_id: workflowId,
        entity_id: entityId,
        entity_type: entityType,
        current_step: 1,
        status: 'pending',
        requested_by: requestedBy,
        requested_at: new Date().toISOString(),
        step_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // إضافة أول خطوة في التاريخ
      const firstStep = workflow.steps.find(s => s.step_number === 1);
      if (firstStep) {
        approvalRequest.step_history.push({
          step_number: 1,
          step_name: firstStep.step_name,
          approver_role: firstStep.approver_role,
          action: 'assigned',
          timestamp: new Date().toISOString()
        });
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .insert(approvalRequest)
        .select()
        .single();

      if (error) throw error;

      return data;

    } catch (error) {
      console.error('❌ خطأ في إنشاء طلب الموافقة:', error);
      throw error;
    }
  }

  /**
   * معالجة الموافقة
   */
  async processApproval(
    requestId: string,
    action: 'approve' | 'reject',
    approverUserId: string,
    reason?: string
  ): Promise<void> {
    try {
      const request = await this.getApprovalRequest(requestId);
      if (!request) {
        throw new Error('طلب الموافقة غير موجود');
      }

      const workflow = await this.getWorkflow(request.workflow_id);
      if (!workflow) {
        throw new Error('سير العمل غير موجود');
      }

      const currentStep = workflow.steps.find(s => s.step_number === request.current_step);
      if (!currentStep) {
        throw new Error('خطوة العمل الحالية غير موجودة');
      }

      // إضافة العملية إلى التاريخ
      const historyEntry: ApprovalStepHistory = {
        step_number: request.current_step,
        step_name: currentStep.step_name,
        approver_user_id: approverUserId,
        approver_role: currentStep.approver_role,
        action,
        timestamp: new Date().toISOString(),
        notes: reason,
        rejection_reason: action === 'reject' ? reason : undefined
      };

      request.step_history.push(historyEntry);

      if (action === 'approve') {
        // التحقق من وجود خطوات أخرى
        const nextStep = workflow.steps.find(s => s.step_number === request.current_step + 1);
        
        if (nextStep) {
          // الانتقال للخطوة التالية
          request.current_step += 1;
          request.step_history.push({
            step_number: request.current_step,
            step_name: nextStep.step_name,
            approver_role: nextStep.approver_role,
            action: 'assigned',
            timestamp: new Date().toISOString()
          });
        } else {
          // اكتمال جميع الخطوات
          request.status = 'approved';
          request.approved_by = approverUserId;
          request.approved_at = new Date().toISOString();
        }
      } else {
        // رفض الطلب
        request.status = 'rejected';
        request.rejection_reason = reason;
      }

      request.updated_at = new Date().toISOString();

      // حفظ التحديثات
      const { error } = await supabase
        .from('approval_requests')
        .update(request)
        .eq('id', requestId);

      if (error) throw error;

      console.log('✅ تم معالجة الموافقة بنجاح');

    } catch (error) {
      console.error('❌ خطأ في معالجة الموافقة:', error);
      throw error;
    }
  }

  /**
   * الحصول على سير العمل
   */
  private async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('company_id', this.companyId)
        .single();

      if (error) return null;
      return data;

    } catch (error) {
      console.error('❌ خطأ في الحصول على سير العمل:', error);
      return null;
    }
  }

  /**
   * الحصول على طلب الموافقة
   */
  private async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .eq('company_id', this.companyId)
        .single();

      if (error) return null;
      return data;

    } catch (error) {
      console.error('❌ خطأ في الحصول على طلب الموافقة:', error);
      return null;
    }
  }
}

// ===============================
// تصدير الدوال الرئيسية
// ===============================

export const createAuditTrailSystem = (companyId: string): AuditTrailSystem => {
  return new AuditTrailSystem(companyId);
};

export const createApprovalWorkflowSystem = (companyId: string): ApprovalWorkflowSystem => {
  return new ApprovalWorkflowSystem(companyId);
};
