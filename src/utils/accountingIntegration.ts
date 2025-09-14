/**
 * نظام التكامل المحاسبي - Accounting Integration System
 * نظام شامل لإنشاء القيود المحاسبية وتكاملها مع نظام المدفوعات
 */

import { supabase } from '@/integrations/supabase/client';
import { PaymentData, ContractData, InvoiceData } from './professionalPaymentLinking';
import { PaymentAllocation } from './paymentAllocationEngine';

// ===============================
// أنواع النظام المحاسبي
// ===============================

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_number?: string;
  total_debit: number;
  total_credit: number;
  entry_status: 'draft' | 'posted' | 'reversed' | 'cancelled';
  entry_type: 'payment' | 'receipt' | 'invoice' | 'adjustment' | 'reversal';
  source_type: 'payment' | 'invoice' | 'contract' | 'manual';
  source_id?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  reference?: string;
  line_number: number;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_name_ar: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_subtype: string;
  parent_account_id?: string;
  is_header: boolean;
  is_active: boolean;
  can_link_customers: boolean;
  can_link_vendors: boolean;
  can_link_employees: boolean;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface AccountingTemplate {
  id: string;
  name: string;
  description: string;
  template_type: 'payment_receipt' | 'payment_made' | 'invoice_sales' | 'invoice_purchase' | 'contract_revenue';
  conditions: TemplateCondition[];
  entries: TemplateEntry[];
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface TemplateEntry {
  account_type: 'debit' | 'credit';
  account_selector: AccountSelector;
  amount_selector: AmountSelector;
  description_template: string;
  reference_template?: string;
  line_number: number;
}

export interface AccountSelector {
  type: 'fixed_account' | 'linked_account' | 'customer_account' | 'vendor_account' | 'bank_account';
  account_code?: string;
  account_id?: string;
  fallback_account_code?: string;
}

export interface AmountSelector {
  type: 'full_amount' | 'percentage' | 'fixed_amount' | 'calculated';
  value?: number;
  calculation?: string;
}

export interface AccountingResult {
  journalEntry: JournalEntry;
  entries: JournalEntryLine[];
  success: boolean;
  errors: string[];
  warnings: string[];
}

// ===============================
// نظام التكامل المحاسبي
// ===============================

export class AccountingIntegrationSystem {
  private companyId: string;
  private templates: AccountingTemplate[];

  constructor(companyId: string) {
    this.companyId = companyId;
    this.templates = [];
  }

  /**
   * إنشاء قيد محاسبي للمدفوعة
   */
  async createJournalEntryForPayment(
    payment: PaymentData,
    allocations: PaymentAllocation[],
    options: {
      autoPost?: boolean;
      templateId?: string;
      customDescription?: string;
    } = {}
  ): Promise<AccountingResult> {
    const { autoPost = false, templateId, customDescription } = options;

    try {
      // 1. العثور على القالب المناسب
      const template = templateId 
        ? this.templates.find(t => t.id === templateId)
        : await this.findMatchingTemplate(payment, allocations);

      if (!template) {
        return {
          journalEntry: {} as JournalEntry,
          entries: [],
          success: false,
          errors: ['لم يتم العثور على قالب محاسبي مناسب'],
          warnings: []
        };
      }

      // 2. إنشاء القيد المحاسبي
      const journalEntry = await this.createJournalEntry(payment, customDescription);

      // 3. إنشاء بنود القيد
      const entries = await this.createJournalEntryLines(journalEntry, template, payment, allocations);

      // 4. التحقق من توازن القيد
      const balanceCheck = this.validateJournalEntryBalance(entries);
      if (!balanceCheck.balanced) {
        return {
          journalEntry,
          entries,
          success: false,
          errors: [`القيد غير متوازن: ${balanceCheck.message}`],
          warnings: []
        };
      }

      // 5. حفظ القيد في قاعدة البيانات
      await this.saveJournalEntry(journalEntry, entries);

      // 6. ترحيل القيد إذا كان مطلوباً
      if (autoPost) {
        await this.postJournalEntry(journalEntry.id);
      }

      // 7. تحديث المدفوعة برقم القيد
      await this.updatePaymentWithJournalEntry(payment.id!, journalEntry.id);

      console.log('✅ تم إنشاء القيد المحاسبي بنجاح:', journalEntry);

      return {
        journalEntry,
        entries,
        success: true,
        errors: [],
        warnings: balanceCheck.warnings || []
      };

    } catch (error) {
      console.error('❌ خطأ في إنشاء القيد المحاسبي:', error);
      return {
        journalEntry: {} as JournalEntry,
        entries: [],
        success: false,
        errors: [`خطأ في إنشاء القيد المحاسبي: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * العثور على القالب المناسب
   */
  private async findMatchingTemplate(
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): Promise<AccountingTemplate | null> {
    for (const template of this.templates) {
      if (!template.enabled) continue;

      // التحقق من شروط القالب
      const matches = template.conditions.every(condition => 
        this.evaluateTemplateCondition(condition, payment, allocations)
      );

      if (matches) {
        return template;
      }
    }

    return null;
  }

  /**
   * تقييم شرط القالب
   */
  private evaluateTemplateCondition(
    condition: TemplateCondition,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, payment, allocations);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * الحصول على قيمة الحقل
   */
  private getFieldValue(field: string, payment: PaymentData, allocations: PaymentAllocation[]): any {
    const fieldMap: Record<string, any> = {
      'payment_type': payment.payment_type,
      'payment_method': payment.payment_method,
      'amount': payment.amount,
      'customer_id': payment.customer_id,
      'contract_id': payment.contract_id,
      'allocation_types': allocations.map(a => a.allocation_type),
      'total_allocations': allocations.length,
      'has_contract_allocation': allocations.some(a => a.allocation_type === 'contract'),
      'has_invoice_allocation': allocations.some(a => a.allocation_type === 'invoice')
    };

    return fieldMap[field];
  }

  /**
   * إنشاء القيد المحاسبي
   */
  private async createJournalEntry(payment: PaymentData, customDescription?: string): Promise<JournalEntry> {
    const entryNumber = await this.generateJournalEntryNumber();
    
    const description = customDescription || this.generateJournalEntryDescription(payment);

    return {
      id: crypto.randomUUID(),
      company_id: this.companyId,
      entry_number: entryNumber,
      entry_date: payment.payment_date,
      description,
      reference_number: payment.reference_number,
      total_debit: 0, // سيتم حسابها لاحقاً
      total_credit: 0, // سيتم حسابها لاحقاً
      entry_status: 'draft',
      entry_type: payment.payment_type === 'receipt' ? 'receipt' : 'payment',
      source_type: 'payment',
      source_id: payment.id,
      created_by: payment.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * إنشاء بنود القيد المحاسبي
   */
  private async createJournalEntryLines(
    journalEntry: JournalEntry,
    template: AccountingTemplate,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): Promise<JournalEntryLine[]> {
    const entries: JournalEntryLine[] = [];

    for (const templateEntry of template.entries) {
      try {
        // حساب المبلغ
        const amount = this.calculateEntryAmount(templateEntry.amount_selector, payment, allocations);
        
        if (amount <= 0) continue;

        // العثور على الحساب
        const accountId = await this.findAccountForEntry(templateEntry.account_selector, payment, allocations);
        
        if (!accountId) {
          console.warn(`⚠️ لم يتم العثور على حساب للبند: ${templateEntry.description_template}`);
          continue;
        }

        // إنشاء البند
        const entry: JournalEntryLine = {
          id: crypto.randomUUID(),
          journal_entry_id: journalEntry.id,
          account_id: accountId,
          debit_amount: templateEntry.account_type === 'debit' ? amount : 0,
          credit_amount: templateEntry.account_type === 'credit' ? amount : 0,
          description: this.generateEntryDescription(templateEntry.description_template, payment, allocations),
          reference: this.generateEntryReference(templateEntry.reference_template, payment, allocations),
          line_number: templateEntry.line_number,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        entries.push(entry);

        // تحديث إجمالي القيد
        journalEntry.total_debit += entry.debit_amount;
        journalEntry.total_credit += entry.credit_amount;

      } catch (error) {
        console.error(`❌ خطأ في إنشاء البند ${templateEntry.line_number}:`, error);
      }
    }

    return entries;
  }

  /**
   * حساب مبلغ البند
   */
  private calculateEntryAmount(
    amountSelector: AmountSelector,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): number {
    switch (amountSelector.type) {
      case 'full_amount':
        return payment.amount;
      
      case 'percentage':
        return (payment.amount * (amountSelector.value || 0)) / 100;
      
      case 'fixed_amount':
        return amountSelector.value || 0;
      
      case 'calculated':
        return this.calculateComplexAmount(amountSelector.calculation || '', payment, allocations);
      
      default:
        return 0;
    }
  }

  /**
   * حساب مبلغ معقد
   */
  private calculateComplexAmount(
    calculation: string,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): number {
    try {
      // استبدال المتغيرات في المعادلة
      let formula = calculation
        .replace(/\{payment_amount\}/g, payment.amount.toString())
        .replace(/\{contract_allocations\}/g, 
          allocations.filter(a => a.allocation_type === 'contract')
            .reduce((sum, a) => sum + a.amount, 0).toString())
        .replace(/\{invoice_allocations\}/g,
          allocations.filter(a => a.allocation_type === 'invoice')
            .reduce((sum, a) => sum + a.amount, 0).toString())
        .replace(/\{late_fee_allocations\}/g,
          allocations.filter(a => a.allocation_type === 'late_fee')
            .reduce((sum, a) => sum + a.amount, 0).toString());

      // تنفيذ الحساب
      return eval(formula);
    } catch (error) {
      console.error('❌ خطأ في حساب المبلغ المعقد:', error);
      return 0;
    }
  }

  /**
   * العثور على الحساب للبند
   */
  private async findAccountForEntry(
    accountSelector: AccountSelector,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): Promise<string | null> {
    try {
      switch (accountSelector.type) {
        case 'fixed_account':
          if (accountSelector.account_code) {
            return await this.findAccountByCode(accountSelector.account_code);
          } else if (accountSelector.account_id) {
            return accountSelector.account_id;
          }
          break;

        case 'linked_account':
          // البحث عن حساب مرتبط بالعميل أو المورد
          if (payment.customer_id) {
            const customerAccount = await this.findCustomerAccount(payment.customer_id);
            if (customerAccount) return customerAccount;
          }
          if (payment.vendor_id) {
            const vendorAccount = await this.findVendorAccount(payment.vendor_id);
            if (vendorAccount) return vendorAccount;
          }
          break;

        case 'customer_account':
          if (payment.customer_id) {
            return await this.findCustomerAccount(payment.customer_id);
          }
          break;

        case 'vendor_account':
          if (payment.vendor_id) {
            return await this.findVendorAccount(payment.vendor_id);
          }
          break;

        case 'bank_account':
          return await this.findBankAccount(payment.payment_method);
      }

      // استخدام الحساب الاحتياطي
      if (accountSelector.fallback_account_code) {
        return await this.findAccountByCode(accountSelector.fallback_account_code);
      }

      return null;

    } catch (error) {
      console.error('❌ خطأ في العثور على الحساب:', error);
      return null;
    }
  }

  /**
   * البحث عن حساب برمز الحساب
   */
  private async findAccountByCode(accountCode: string): Promise<string | null> {
    try {
      const { data: account, error } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', accountCode)
        .eq('company_id', this.companyId)
        .eq('is_active', true)
        .single();

      if (error || !account) return null;
      return account.id;

    } catch (error) {
      console.error('❌ خطأ في البحث عن الحساب:', error);
      return null;
    }
  }

  /**
   * البحث عن حساب العميل
   */
  private async findCustomerAccount(customerId: string): Promise<string | null> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('linked_account_id')
        .eq('id', customerId)
        .eq('company_id', this.companyId)
        .single();

      if (error || !customer || !customer.linked_account_id) return null;
      return customer.linked_account_id;

    } catch (error) {
      console.error('❌ خطأ في البحث عن حساب العميل:', error);
      return null;
    }
  }

  /**
   * البحث عن حساب المورد
   */
  private async findVendorAccount(vendorId: string): Promise<string | null> {
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('linked_account_id')
        .eq('id', vendorId)
        .eq('company_id', this.companyId)
        .single();

      if (error || !vendor || !vendor.linked_account_id) return null;
      return vendor.linked_account_id;

    } catch (error) {
      console.error('❌ خطأ في البحث عن حساب المورد:', error);
      return null;
    }
  }

  /**
   * البحث عن حساب البنك
   */
  private async findBankAccount(paymentMethod: string): Promise<string | null> {
    try {
      // البحث عن حساب البنك المناسب لطريقة الدفع
      const bankAccountMapping: Record<string, string> = {
        'cash': 'CASH-001', // حساب النقدية
        'check': 'BANK-CHK', // حساب الشيكات
        'bank_transfer': 'BANK-TRF', // حساب التحويل البنكي
        'credit_card': 'BANK-CC', // حساب بطاقة الائتمان
        'debit_card': 'BANK-DC' // حساب بطاقة الخصم
      };

      const accountCode = bankAccountMapping[paymentMethod];
      if (!accountCode) return null;

      return await this.findAccountByCode(accountCode);

    } catch (error) {
      console.error('❌ خطأ في البحث عن حساب البنك:', error);
      return null;
    }
  }

  /**
   * إنشاء وصف البند
   */
  private generateEntryDescription(
    template: string,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): string {
    return template
      .replace(/\{payment_number\}/g, payment.payment_number)
      .replace(/\{payment_date\}/g, payment.payment_date)
      .replace(/\{amount\}/g, payment.amount.toString())
      .replace(/\{customer_name\}/g, 'العميل') // سيتم تحسينه لاحقاً
      .replace(/\{contract_number\}/g, 'العقد') // سيتم تحسينه لاحقاً
      .replace(/\{reference_number\}/g, payment.reference_number || '');
  }

  /**
   * إنشاء مرجع البند
   */
  private generateEntryReference(
    template: string | undefined,
    payment: PaymentData,
    allocations: PaymentAllocation[]
  ): string | undefined {
    if (!template) return payment.reference_number;
    
    return template
      .replace(/\{payment_number\}/g, payment.payment_number)
      .replace(/\{reference_number\}/g, payment.reference_number || '')
      .replace(/\{contract_numbers\}/g, 
        allocations
          .filter(a => a.allocation_type === 'contract')
          .map(a => a.target_id)
          .join(', '));
  }

  /**
   * التحقق من توازن القيد
   */
  private validateJournalEntryBalance(entries: JournalEntryLine[]): {
    balanced: boolean;
    message: string;
    warnings?: string[];
  } {
    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01; // تسامح صغير للأخطاء العشرية

    return {
      balanced: isBalanced,
      message: isBalanced 
        ? 'القيد متوازن' 
        : `القيد غير متوازن - الفرق: ${difference}`,
      warnings: difference > 0.01 ? [`فرق صغير في التوازن: ${difference}`] : undefined
    };
  }

  /**
   * حفظ القيد في قاعدة البيانات
   */
  private async saveJournalEntry(journalEntry: JournalEntry, entries: JournalEntryLine[]): Promise<void> {
    try {
      // حفظ القيد الرئيسي
      const { error: entryError } = await supabase
        .from('journal_entries')
        .insert(journalEntry);

      if (entryError) throw entryError;

      // حفظ بنود القيد
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(entries);

      if (linesError) throw linesError;

      console.log('✅ تم حفظ القيد المحاسبي بنجاح');

    } catch (error) {
      console.error('❌ خطأ في حفظ القيد المحاسبي:', error);
      throw error;
    }
  }

  /**
   * ترحيل القيد
   */
  private async postJournalEntry(journalEntryId: string): Promise<void> {
    try {
      await supabase
        .from('journal_entries')
        .update({
          entry_status: 'posted',
          updated_at: new Date().toISOString()
        })
        .eq('id', journalEntryId);

      // تحديث أرصدة الحسابات
      await this.updateAccountBalances(journalEntryId);

      console.log('✅ تم ترحيل القيد بنجاح');

    } catch (error) {
      console.error('❌ خطأ في ترحيل القيد:', error);
      throw error;
    }
  }

  /**
   * تحديث أرصدة الحسابات
   */
  private async updateAccountBalances(journalEntryId: string): Promise<void> {
    try {
      // جلب بنود القيد
      const { data: entries, error } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', journalEntryId);

      if (error || !entries) return;

      // تحديث أرصدة الحسابات
      for (const entry of entries) {
        const balanceChange = entry.debit_amount - entry.credit_amount;
        
        await supabase
          .from('chart_of_accounts')
          .update({
            current_balance: supabase.raw(`current_balance + ${balanceChange}`),
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.account_id);
      }

    } catch (error) {
      console.error('❌ خطأ في تحديث أرصدة الحسابات:', error);
    }
  }

  /**
   * تحديث المدفوعة برقم القيد
   */
  private async updatePaymentWithJournalEntry(paymentId: string, journalEntryId: string): Promise<void> {
    try {
      await supabase
        .from('payments')
        .update({
          journal_entry_id: journalEntryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

    } catch (error) {
      console.error('❌ خطأ في تحديث المدفوعة:', error);
    }
  }

  /**
   * إنشاء رقم القيد
   */
  private async generateJournalEntryNumber(): Promise<string> {
    try {
      const { data: lastEntry, error } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('company_id', this.companyId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !lastEntry || lastEntry.length === 0) {
        return 'JE-0001';
      }

      const lastNumber = parseInt(lastEntry[0].entry_number.split('-')[1] || '0');
      const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
      
      return `JE-${nextNumber}`;

    } catch (error) {
      console.error('❌ خطأ في إنشاء رقم القيد:', error);
      return `JE-${Date.now()}`;
    }
  }

  /**
   * إنشاء وصف القيد
   */
  private generateJournalEntryDescription(payment: PaymentData): string {
    return `قيد مدفوعة رقم ${payment.payment_number} - ${payment.payment_type === 'receipt' ? 'قبض' : 'صرف'} بمبلغ ${payment.amount}`;
  }

  /**
   * تحميل القوالب المحاسبية
   */
  async loadAccountingTemplates(): Promise<AccountingTemplate[]> {
    try {
      const { data: templates, error } = await supabase
        .from('accounting_templates')
        .select('*')
        .eq('company_id', this.companyId)
        .eq('enabled', true)
        .order('priority');

      if (error) throw error;

      this.templates = templates || [];
      return this.templates;

    } catch (error) {
      console.error('❌ خطأ في تحميل القوالب المحاسبية:', error);
      return [];
    }
  }

  /**
   * إنشاء قالب محاسبي جديد
   */
  async createAccountingTemplate(template: Omit<AccountingTemplate, 'id'>): Promise<AccountingTemplate> {
    try {
      const newTemplate: AccountingTemplate = {
        id: crypto.randomUUID(),
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('accounting_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) throw error;

      this.templates.push(data);
      return data;

    } catch (error) {
      console.error('❌ خطأ في إنشاء القالب المحاسبي:', error);
      throw error;
    }
  }
}

// ===============================
// تصدير الدوال الرئيسية
// ===============================

export const createAccountingIntegrationSystem = (companyId: string): AccountingIntegrationSystem => {
  return new AccountingIntegrationSystem(companyId);
};
