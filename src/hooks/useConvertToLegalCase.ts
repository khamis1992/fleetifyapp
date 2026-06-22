import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

export interface ConvertToCaseData {
  delinquentCustomer: DelinquentCustomer;
  additionalNotes?: string;
  attachments?: string[];
}

// Helper function to get managers to notify
async function getManagersToNotify(companyId: string): Promise<{ userId: string; role: string }[]> {
  const { data: managers } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('company_id', companyId)
    .in('role', ['company_admin', 'manager', 'accountant', 'fleet_manager']);
  
  return managers?.map(m => ({ userId: m.user_id, role: m.role })) || [];
}

export const useConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConvertToCaseData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { delinquentCustomer, additionalNotes, attachments } = data;

      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('فشل في جلب بيانات المستخدم');
      }

      if (!profile?.company_id) {
        console.error('No company_id in profile for user:', user.id);
        throw new Error('لم يتم تحديد الشركة للمستخدم');
      }

      // Generate case number (will be done by RPC function or sequence)
      const caseNumberPrefix = 'LC';
      const timestamp = Date.now().toString().slice(-6);
      const caseNumber = `${caseNumberPrefix}-${new Date().getFullYear()}-${timestamp}`;

      // Determine case priority based on risk score
      let priority: string;
      if (delinquentCustomer.risk_score >= 85) {
        priority = 'urgent';
      } else if (delinquentCustomer.risk_score >= 70) {
        priority = 'high';
      } else if (delinquentCustomer.risk_score >= 60) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Generate auto description
      const autoDescription = `
قضية تحصيل إيجارات متأخرة

معلومات العميل:
- الاسم: ${delinquentCustomer.customer_name}
- رقم العميل: ${delinquentCustomer.customer_code}
- رقم العقد: ${delinquentCustomer.contract_number}
- المركبة: ${delinquentCustomer.vehicle_plate || 'غير محدد'}
- الهاتف: ${delinquentCustomer.phone || 'غير محدد'}
- البريد: ${delinquentCustomer.email || 'غير محدد'}

تفاصيل المديونية:
- عدد الأشهر المتأخرة: ${delinquentCustomer.months_unpaid} شهر
- إجمالي الإيجارات المستحقة: ${delinquentCustomer.overdue_amount.toLocaleString('ar-KW')} د.ك
- غرامات التأخير: ${delinquentCustomer.late_penalty.toLocaleString('ar-KW')} د.ك
- المخالفات المرورية: ${delinquentCustomer.violations_amount.toLocaleString('ar-KW')} د.ك (${delinquentCustomer.violations_count} مخالفة)
- الإجمالي الكلي: ${delinquentCustomer.total_debt.toLocaleString('ar-KW')} د.ك

معلومات التأخير:
- عدد الأيام المتأخرة: ${delinquentCustomer.days_overdue} يوم
- درجة المخاطر: ${delinquentCustomer.risk_score} (${delinquentCustomer.risk_level})
- آخر دفعة: ${delinquentCustomer.last_payment_date ? new Date(delinquentCustomer.last_payment_date).toLocaleDateString('ar-KW') : 'لا يوجد'}
- مبلغ آخر دفعة: ${delinquentCustomer.last_payment_amount.toLocaleString('ar-KW')} د.ك

سجل قانوني:
- قضايا سابقة: ${delinquentCustomer.has_previous_legal_cases ? `نعم (${delinquentCustomer.previous_legal_cases_count} قضية)` : 'لا'}
- في القائمة السوداء: ${delinquentCustomer.is_blacklisted ? 'نعم' : 'لا'}

الإجراء الموصى به: ${delinquentCustomer.recommended_action.label}

${additionalNotes ? `\nملاحظات إضافية:\n${additionalNotes}` : ''}
      `.trim();

      // Create legal case
      const { data: legalCase, error: caseError } = await supabase
        .from('legal_cases')
        .insert({
          company_id: profile.company_id,
          case_number: caseNumber,
          case_title: `تحصيل إيجارات متأخرة من ${delinquentCustomer.customer_name}`,
          case_title_ar: `تحصيل إيجارات متأخرة من ${delinquentCustomer.customer_name}`,
          case_type: 'rental', // or 'civil'
          case_status: 'active',
          priority,
          client_id: delinquentCustomer.customer_id,
          client_name: delinquentCustomer.customer_name,
          client_phone: delinquentCustomer.phone,
          client_email: delinquentCustomer.email,
          description: autoDescription,
          case_value: delinquentCustomer.total_debt,
          legal_fees: delinquentCustomer.total_debt * 0.10, // 10% legal fees
          court_fees: delinquentCustomer.total_debt * 0.01, // 1% court fees
          other_expenses: 200, // Fixed amount
          total_costs: (delinquentCustomer.total_debt * 0.11) + 200,
          billing_status: 'pending',
          tags: ['تحصيل_ديون', 'عميل_متعثر', 'إيجارات_متأخرة'],
          notes: `تم الإنشاء تلقائياً من نظام تتبع العملاء المتأخرين\nدرجة المخاطر: ${delinquentCustomer.risk_score}\nأيام التأخير: ${delinquentCustomer.days_overdue}`,
          is_confidential: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Update contract legal_status to "under_legal_action" (without changing the original status)
      if (delinquentCustomer.contract_id) {
        const { error: contractUpdateError } = await supabase
          .from('contracts')
          .update({ 
            legal_status: 'under_legal_action',
            updated_at: new Date().toISOString()
          })
          .eq('id', delinquentCustomer.contract_id);

        if (contractUpdateError) {
          console.error('Error updating contract legal status:', contractUpdateError);
          // Don't throw - the legal case was created successfully
        }
      }

      // ===== 1. تحديث حالة المركبة وإضافة تنبيه الاسترداد =====
      if (delinquentCustomer.vehicle_id) {
        try {
          // تم إيقاف تحديث حالة المركبة بناءً على طلب المستخدم (يجب أن تبقى الحالة كما هي حتى إلغاء العقد)
          /*
          await supabase
            .from('vehicles')
            .update({
              status: 'out_of_service',
              notes: `🚨 مطلوب استرداد - قضية قانونية: ${caseNumber}\nالعميل: ${delinquentCustomer.customer_name}\nالمبلغ المستحق: ${delinquentCustomer.total_debt.toLocaleString()} QAR`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', delinquentCustomer.vehicle_id);
          */

          // إنشاء تنبيه استرداد المركبة
          await supabase.from('vehicle_alerts').insert({
            company_id: profile.company_id,
            vehicle_id: delinquentCustomer.vehicle_id,
            alert_type: 'recovery_required',
            alert_title: `🚨 مطلوب استرداد المركبة - ${delinquentCustomer.vehicle_plate}`,
            alert_message: `المركبة ${delinquentCustomer.vehicle_plate} مطلوب استردادها بشكل عاجل.\nالعميل: ${delinquentCustomer.customer_name}\nالمبلغ المستحق: ${delinquentCustomer.total_debt.toLocaleString()} QAR\nأيام التأخير: ${delinquentCustomer.days_overdue} يوم\nرقم القضية: ${caseNumber}`,
            priority: 'urgent',
            auto_generated: true,
            due_date: new Date().toISOString(),
          });
          
          console.log('✅ تم تحديث حالة المركبة وإنشاء تنبيه الاسترداد');
        } catch (vehicleError) {
          console.error('⚠️ خطأ في تحديث المركبة:', vehicleError);
        }
      }

      // ===== 2. وضع العميل في القائمة السوداء =====
      try {
        await supabase
          .from('customers')
          .update({
            is_blacklisted: true,
            blacklist_reason: `تحويل للشؤون القانونية بتاريخ ${new Date().toLocaleDateString('en-US')}\nرقم القضية: ${caseNumber}\nالمبلغ المستحق: ${delinquentCustomer.total_debt.toLocaleString()} QAR\nأيام التأخير: ${delinquentCustomer.days_overdue} يوم`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', delinquentCustomer.customer_id);
        
        console.log('✅ تم وضع العميل في القائمة السوداء');
      } catch (blacklistError) {
        console.error('⚠️ خطأ في إضافة العميل للقائمة السوداء:', blacklistError);
      }

      // ===== 3. ربط الفواتير غير المدفوعة بالقضية =====
      try {
        // جلب جميع الفواتير غير المدفوعة للعقد
        const { data: unpaidInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, balance_due')
          .eq('contract_id', delinquentCustomer.contract_id)
          .in('payment_status', ['unpaid', 'partial']);

        if (unpaidInvoices && unpaidInvoices.length > 0) {
          // إنشاء مستند يربط الفواتير بالقضية
          await supabase.from('legal_case_documents').insert({
            case_id: legalCase.id,
            company_id: profile.company_id,
            document_type: 'invoice_statement',
            document_title: `كشف فواتير العميل ${delinquentCustomer.customer_name}`,
            document_title_ar: `كشف فواتير العميل ${delinquentCustomer.customer_name}`,
            description: `عدد الفواتير: ${unpaidInvoices.length}\nإجمالي المستحق: ${unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0).toLocaleString()} QAR\n\nأرقام الفواتير:\n${unpaidInvoices.map(inv => `- ${inv.invoice_number}: ${inv.balance_due?.toLocaleString()} QAR`).join('\n')}`,
            created_by: user.id,
          });
          
          console.log(`✅ تم ربط ${unpaidInvoices.length} فاتورة بالقضية`);
        }
      } catch (invoiceError) {
        console.error('⚠️ خطأ في ربط الفواتير:', invoiceError);
      }

      // ===== 4. إرسال إشعارات للمديرين المعنيين =====
      try {
        const managers = await getManagersToNotify(profile.company_id);
        
        const roleLabels: Record<string, string> = {
          company_admin: 'مدير الشركة',
          manager: 'مدير',
          accountant: 'محاسب',
          fleet_manager: 'مدير الأسطول',
        };

        const notifications = managers.map(m => ({
          company_id: profile.company_id,
          user_id: m.userId,
          notification_type: 'legal_case_created',
          title: `🔔 قضية قانونية جديدة: ${caseNumber}`,
          message: `تم تحويل العميل "${delinquentCustomer.customer_name}" للشؤون القانونية.\n\nالمبلغ المستحق: ${delinquentCustomer.total_debt.toLocaleString()} QAR\nأيام التأخير: ${delinquentCustomer.days_overdue} يوم\nدرجة المخاطر: ${delinquentCustomer.risk_score}\n\nالإجراء المطلوب: ${roleLabels[m.role] || m.role}`,
          is_read: false,
          related_type: 'legal_case',
          related_id: legalCase.id,
        }));

        if (notifications.length > 0) {
          await supabase.from('user_notifications').insert(notifications);
          console.log(`✅ تم إرسال ${notifications.length} إشعار للمديرين`);
        }
      } catch (notificationError) {
        console.error('⚠️ خطأ في إرسال الإشعارات:', notificationError);
      }

      // ===== إنشاء القيد المحاسبي لنقل الذمم للتحصيل القانوني =====
      try {
        // حساب نسبة المخصص بناءً على أيام التأخير
        let provisionRate = 0.25; // 25% افتراضي
        if (delinquentCustomer.days_overdue > 365) {
          provisionRate = 1.0; // 100%
        } else if (delinquentCustomer.days_overdue > 270) {
          provisionRate = 0.75; // 75%
        } else if (delinquentCustomer.days_overdue > 180) {
          provisionRate = 0.50; // 50%
        }
        
        const provisionAmount = delinquentCustomer.total_debt * provisionRate;
        const today = new Date().toISOString().split('T')[0];
        const journalNumber = `JV-LEGAL-${Date.now().toString().slice(-8)}`;

        // 1. إنشاء قيد نقل الذمم للتحصيل القانوني
        const { data: transferEntry, error: transferError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: profile.company_id,
            journal_number: journalNumber,
            entry_date: today,
            description: `نقل ذمم للتحصيل القانوني - ${delinquentCustomer.customer_name} - عقد ${delinquentCustomer.contract_number}`,
            total_debit: delinquentCustomer.total_debt,
            total_credit: delinquentCustomer.total_debt,
            status: 'posted',
            source: 'legal',
            reference_type: 'legal_case',
            reference_id: legalCase.id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!transferError && transferEntry) {
          // سطور القيد: من ذمم التحصيل القانوني إلى ذمم العملاء
          await supabase.from('journal_entry_lines').insert([
            {
              journal_entry_id: transferEntry.id,
              account_id: '1203', // TODO: look up UUID from chart_of_accounts by account_code
              line_description: `نقل ذمم ${delinquentCustomer.customer_name} للتحصيل القانوني`,
              debit_amount: delinquentCustomer.total_debt,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: transferEntry.id,
              account_id: '1200', // TODO: look up UUID from chart_of_accounts by account_code
              line_description: `نقل ذمم ${delinquentCustomer.customer_name} للتحصيل القانوني`,
              debit_amount: 0,
              credit_amount: delinquentCustomer.total_debt,
              line_number: 2,
            },
          ]);
        }

        // 2. إنشاء قيد المخصص
        const provisionJournalNumber = `JV-PROV-${Date.now().toString().slice(-8)}`;
        const { data: provisionEntry, error: provisionError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: profile.company_id,
            journal_number: provisionJournalNumber,
            entry_date: today,
            description: `مخصص ديون مشكوك فيها (${Math.round(provisionRate * 100)}%) - ${delinquentCustomer.customer_name}`,
            total_debit: provisionAmount,
            total_credit: provisionAmount,
            status: 'posted',
            source: 'legal',
            reference_type: 'legal_case',
            reference_id: legalCase.id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!provisionError && provisionEntry) {
          await supabase.from('journal_entry_lines').insert([
            {
              journal_entry_id: provisionEntry.id,
              account_id: '5401', // TODO: look up UUID from chart_of_accounts by account_code
              line_description: `مخصص ديون ${delinquentCustomer.customer_name} (${Math.round(provisionRate * 100)}%)`,
              debit_amount: provisionAmount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: provisionEntry.id,
              account_id: '1204', // TODO: look up UUID from chart_of_accounts by account_code
              line_description: `مخصص ديون ${delinquentCustomer.customer_name} (${Math.round(provisionRate * 100)}%)`,
              debit_amount: 0,
              credit_amount: provisionAmount,
              line_number: 2,
            },
          ]);
        }

        console.log('✅ تم إنشاء القيود المحاسبية بنجاح');
      } catch (journalError) {
        console.error('⚠️ خطأ في إنشاء القيود المحاسبية:', journalError);
        // لا نوقف العملية - القضية تم إنشاؤها بنجاح
      }

      // ===== 5. إنشاء ملف قانوني إلكتروني شامل =====
      try {
        // إنشاء مستند ملخص القضية
        await supabase.from('legal_case_documents').insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          document_type: 'case_summary',
          document_title: `ملف القضية الشامل - ${caseNumber}`,
          document_title_ar: `ملف القضية الشامل - ${caseNumber}`,
          description: autoDescription,
          is_original: true,
          access_level: 'internal',
          created_by: user.id,
        });

        // إنشاء مستند بيانات العميل
        await supabase.from('legal_case_documents').insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          document_type: 'customer_profile',
          document_title: `بيانات العميل - ${delinquentCustomer.customer_name}`,
          document_title_ar: `بيانات العميل - ${delinquentCustomer.customer_name}`,
          description: `
الاسم: ${delinquentCustomer.customer_name}
رمز العميل: ${delinquentCustomer.customer_code}
رقم الهوية/الجواز: ${delinquentCustomer.id_number || 'غير متوفر'}
الهاتف: ${delinquentCustomer.phone || 'غير متوفر'}
البريد: ${delinquentCustomer.email || 'غير متوفر'}
نوع العميل: ${delinquentCustomer.customer_type === 'individual' ? 'فرد' : 'شركة'}
الحد الائتماني: ${delinquentCustomer.credit_limit?.toLocaleString()} QAR
في القائمة السوداء: نعم (تم إضافته تلقائياً)
          `.trim(),
          is_original: true,
          access_level: 'confidential',
          created_by: user.id,
        });

        // إنشاء مستند بيانات العقد والمركبة
        await supabase.from('legal_case_documents').insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          document_type: 'contract_details',
          document_title: `تفاصيل العقد - ${delinquentCustomer.contract_number}`,
          document_title_ar: `تفاصيل العقد - ${delinquentCustomer.contract_number}`,
          description: `
رقم العقد: ${delinquentCustomer.contract_number}
تاريخ البداية: ${new Date(delinquentCustomer.contract_start_date).toLocaleDateString('en-US')}
الإيجار الشهري: ${delinquentCustomer.monthly_rent?.toLocaleString()} QAR
الحالة القانونية: تحت الإجراء القانوني

المركبة:
- رقم اللوحة: ${delinquentCustomer.vehicle_plate || 'غير محدد'}
- معرف المركبة: ${delinquentCustomer.vehicle_id || 'غير متوفر'}

تفاصيل المديونية:
- أشهر غير مدفوعة: ${delinquentCustomer.months_unpaid} شهر
- المبلغ المتأخر: ${delinquentCustomer.overdue_amount?.toLocaleString()} QAR
- غرامات التأخير: ${delinquentCustomer.late_penalty?.toLocaleString()} QAR
- مخالفات مرورية: ${delinquentCustomer.violations_amount?.toLocaleString()} QAR (${delinquentCustomer.violations_count} مخالفة)
- إجمالي المديونية: ${delinquentCustomer.total_debt?.toLocaleString()} QAR
          `.trim(),
          is_original: true,
          access_level: 'internal',
          created_by: user.id,
        });

        console.log('✅ تم إنشاء الملف القانوني الإلكتروني');
      } catch (legalFileError) {
        console.error('⚠️ خطأ في إنشاء الملف القانوني:', legalFileError);
      }
      
      // Create comprehensive activity logs for the legal case
      const activities = [
        {
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'case_created',
          activity_title: '📋 تم إنشاء القضية القانونية',
          activity_description: `تم إنشاء القضية تلقائياً للعميل: ${delinquentCustomer.customer_name}\nالمبلغ الإجمالي: ${delinquentCustomer.total_debt.toLocaleString('en-US')} QAR`,
          created_by: user.id,
        },
        {
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'contract_updated',
          activity_title: '📝 تحديث الحالة القانونية للعقد',
          activity_description: `تم إضافة الحالة القانونية "تحت الإجراء القانوني" للعقد ${delinquentCustomer.contract_number} (الحالة الأصلية محفوظة)`,
          created_by: user.id,
        },
        {
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'customer_blacklisted',
          activity_title: '⚠️ إضافة العميل للقائمة السوداء',
          activity_description: `تم إضافة العميل ${delinquentCustomer.customer_name} للقائمة السوداء تلقائياً`,
          created_by: user.id,
        },
        {
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'accounting_entries_created',
          activity_title: '💰 إنشاء القيود المحاسبية',
          activity_description: `تم إنشاء قيود نقل الذمم للتحصيل القانوني وتكوين المخصصات`,
          created_by: user.id,
        },
      ];

      // Add vehicle recovery activity if vehicle exists
      if (delinquentCustomer.vehicle_id) {
        activities.push({
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'vehicle_recovery_alert',
          activity_title: '🚗 تنبيه استرداد المركبة',
          activity_description: `تم إنشاء تنبيه لاسترداد المركبة ${delinquentCustomer.vehicle_plate}`,
          created_by: user.id,
        });
      }

      // Add legal file creation activity
      activities.push({
        case_id: legalCase.id,
        company_id: profile.company_id,
        activity_type: 'legal_file_created',
        activity_title: '📁 إنشاء الملف القانوني',
        activity_description: `تم إنشاء ملف قانوني إلكتروني شامل يتضمن بيانات العميل والعقد والفواتير`,
        created_by: user.id,
      });

      // Add notification sent activity
      activities.push({
        case_id: legalCase.id,
        company_id: profile.company_id,
        activity_type: 'notifications_sent',
        activity_title: '🔔 إرسال الإشعارات',
        activity_description: `تم إرسال إشعارات للمديرين المعنيين (القانوني، المالي، التشغيل)`,
        created_by: user.id,
      });

      await supabase.from('legal_case_activities').insert(activities);

      // ===== 6. إنشاء متابعة مجدولة تلقائياً =====
      try {
        // جدولة اتصال خلال 24 ساعة
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const scheduledDate = tomorrow.toISOString().split('T')[0];
        
        await supabase.from('scheduled_followups').insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          contract_id: delinquentCustomer.contract_id,
          legal_case_id: legalCase.id,
          followup_type: 'call',
          scheduled_date: scheduledDate,
          scheduled_time: '10:00:00',
          status: 'pending',
          priority: 'urgent',
          title: `📞 اتصال تحصيل عاجل - ${delinquentCustomer.customer_name}`,
          description: `متابعة تحصيل للعميل المحول للشؤون القانونية.\n\nالمبلغ المستحق: ${delinquentCustomer.total_debt.toLocaleString()} QAR\nأيام التأخير: ${delinquentCustomer.days_overdue} يوم\nرقم القضية: ${caseNumber}\n\nالهدف: محاولة التسوية الودية قبل اتخاذ إجراءات قانونية`,
          source: 'legal_case',
          source_reference: caseNumber,
          created_by: user.id,
        });

        // جدولة متابعة ثانية بعد 3 أيام
        const threeDaysLater = new Date();
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        const secondScheduledDate = threeDaysLater.toISOString().split('T')[0];
        
        await supabase.from('scheduled_followups').insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          contract_id: delinquentCustomer.contract_id,
          legal_case_id: legalCase.id,
          followup_type: 'call',
          scheduled_date: secondScheduledDate,
          scheduled_time: '11:00:00',
          status: 'pending',
          priority: 'high',
          title: `📞 متابعة تحصيل - ${delinquentCustomer.customer_name}`,
          description: `متابعة ثانية للتحصيل.\nفي حال عدم الرد أو التسوية، سيتم تصعيد الإجراءات القانونية.`,
          source: 'legal_case',
          source_reference: caseNumber,
          created_by: user.id,
        });

        // إضافة نشاط إنشاء المتابعة
        await supabase.from('legal_case_activities').insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'followup_scheduled',
          activity_title: '📅 جدولة متابعات تلقائية',
          activity_description: `تم جدولة اتصالين تلقائياً:\n1. ${scheduledDate} الساعة 10:00 صباحاً (عاجل)\n2. ${secondScheduledDate} الساعة 11:00 صباحاً (متابعة)`,
          created_by: user.id,
        });

        console.log('✅ تم إنشاء المتابعات المجدولة بنجاح');
      } catch (followupError) {
        console.error('⚠️ خطأ في إنشاء المتابعات:', followupError);
        // لا نوقف العملية - القضية تم إنشاؤها بنجاح
      }

      return legalCase;
    },
    onSuccess: (data) => {
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-collection-report'] });
      queryClient.invalidateQueries({ queryKey: ['legal-collection-stats'] });
      queryClient.invalidateQueries({ queryKey: ['delinquency-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-followups'] });
      queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
      
      toast.success('✅ تم إنشاء القضية القانونية بنجاح', {
        description: `رقم القضية: ${data.case_number}\nتم إضافة الحالة القانونية للعقد (الحالة الأصلية محفوظة)\nتم تحديث حالة المركبة وإضافة العميل للقائمة السوداء\n📅 تم جدولة متابعتين تلقائياً`,
        duration: 7000,
      });
    },
    onError: (error) => {
      console.error('Error converting to legal case:', error);
      toast.error('حدث خطأ أثناء إنشاء القضية القانونية', {
        description: 'يرجى المحاولة مرة أخرى',
      });
    },
  });
};

// Hook for batch conversion (multiple customers at once)
export const useBulkConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delinquentCustomers: DelinquentCustomer[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const results = [];
      const errors = [];

      for (const customer of delinquentCustomers) {
        try {
          const convertHook = useConvertToLegalCase();
          const result = await convertHook.mutateAsync({
            delinquentCustomer: customer,
          });
          results.push(result);
        } catch (error) {
          errors.push({ customer: customer.customer_name, error });
        }
      }

      return { results, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['delinquency-stats'] });

      toast.success(`تم إنشاء ${data.results.length} قضية قانونية بنجاح`, {
        description: data.errors.length > 0 ? `فشل إنشاء ${data.errors.length} قضية` : undefined,
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error('Error in bulk conversion:', error);
      toast.error('حدث خطأ أثناء العملية الجماعية');
    },
  });
};
