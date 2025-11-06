/**
 * سكريبت لملء جدول system_logs ببيانات تجريبية
 * هذا السكريبت يُستخدم لإنشاء نشاطات تجريبية لعرضها في الصفحة الرئيسية
 */

import { supabase } from '@/integrations/supabase/client';

interface SampleActivity {
  level: 'info' | 'warning' | 'error' | 'debug';
  category: string;
  action: string;
  message: string;
  hoursAgo: number;
}

const sampleActivities: SampleActivity[] = [
  // نشاطات العقود
  { level: 'info', category: 'contracts', action: 'create', message: 'تم إنشاء عقد جديد برقم #2025-001', hoursAgo: 0.5 },
  { level: 'info', category: 'contracts', action: 'update', message: 'تم تحديث بيانات عقد #2024-999', hoursAgo: 1 },
  { level: 'warning', category: 'contracts', action: 'expiry_alert', message: 'تنبيه: عقد #2024-955 سينتهي خلال 7 أيام', hoursAgo: 2 },
  
  // نشاطات العملاء
  { level: 'info', category: 'customers', action: 'create', message: 'تم تسجيل عميل جديد: أحمد محمد', hoursAgo: 3 },
  { level: 'info', category: 'customers', action: 'update', message: 'تم تحديث بيانات العميل: فاطمة علي', hoursAgo: 4 },
  
  // نشاطات المركبات
  { level: 'info', category: 'fleet', action: 'create', message: 'تم إضافة مركبة جديدة: تويوتا كامري 2024 - أ ب ج 1234', hoursAgo: 5 },
  { level: 'warning', category: 'fleet', action: 'maintenance_due', message: 'تنبيه: صيانة مستحقة للمركبة هـ و ز 5678', hoursAgo: 6 },
  { level: 'info', category: 'fleet', action: 'update', message: 'تم تحديث بيانات مركبة: نيسان سنترا - س ع د 9012', hoursAgo: 8 },
  
  // نشاطات مالية
  { level: 'info', category: 'finance', action: 'create', message: 'تم تسجيل دفعة مالية جديدة بقيمة 5,000 ريال', hoursAgo: 10 },
  { level: 'warning', category: 'finance', action: 'overdue', message: 'تحذير: دفعة متأخرة للعميل محمد خالد - 2,500 ريال', hoursAgo: 12 },
  { level: 'info', category: 'finance', action: 'payment_received', message: 'تم استلام دفعة بقيمة 7,500 ريال من العميل سارة أحمد', hoursAgo: 15 },
  
  // نشاطات الموارد البشرية
  { level: 'info', category: 'hr', action: 'create', message: 'تم إضافة موظف جديد: خالد عبدالله - مندوب مبيعات', hoursAgo: 24 },
  { level: 'info', category: 'hr', action: 'update', message: 'تم تحديث بيانات الموظف: نورة سعيد', hoursAgo: 36 },
  
  // نشاطات النظام
  { level: 'info', category: 'system', action: 'login', message: 'تم تسجيل دخول مستخدم جديد', hoursAgo: 0.25 },
  { level: 'info', category: 'system', action: 'export', message: 'تم تصدير تقرير العقود الشهري', hoursAgo: 48 },
  { level: 'error', category: 'system', action: 'backup', message: 'فشل النسخ الاحتياطي التلقائي', hoursAgo: 72 },
  { level: 'info', category: 'system', action: 'backup', message: 'تم إتمام النسخ الاحتياطي بنجاح', hoursAgo: 96 },
];

/**
 * دالة لملء جدول system_logs ببيانات تجريبية
 */
export async function populateSystemLogs(companyId: string): Promise<void> {
  try {
    console.log('🔄 بدء ملء جدول system_logs ببيانات تجريبية...');
    
    // الحصول على معرف المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ لا يوجد مستخدم مسجل دخول');
      return;
    }

    // إنشاء السجلات
    const logs = sampleActivities.map(activity => ({
      company_id: companyId,
      user_id: user.id,
      level: activity.level,
      category: activity.category,
      action: activity.action,
      message: activity.message,
      created_at: new Date(Date.now() - activity.hoursAgo * 60 * 60 * 1000).toISOString(),
    }));

    // إدراج البيانات في قاعدة البيانات
    const { data, error } = await supabase
      .from('system_logs')
      .insert(logs)
      .select();

    if (error) {
      console.error('❌ خطأ في إدراج البيانات:', error);
      throw error;
    }

    console.log(`✅ تم إنشاء ${data?.length || 0} نشاط تجريبي بنجاح`);
    console.log('📊 البيانات:', data);
    
  } catch (error) {
    console.error('❌ خطأ في ملء البيانات التجريبية:', error);
    throw error;
  }
}

/**
 * دالة لحذف جميع البيانات التجريبية
 */
export async function clearSystemLogs(companyId: string): Promise<void> {
  try {
    console.log('🗑️ بدء حذف البيانات التجريبية...');
    
    const { error } = await supabase
      .from('system_logs')
      .delete()
      .eq('company_id', companyId);

    if (error) {
      console.error('❌ خطأ في حذف البيانات:', error);
      throw error;
    }

    console.log('✅ تم حذف البيانات التجريبية بنجاح');
    
  } catch (error) {
    console.error('❌ خطأ في حذف البيانات:', error);
    throw error;
  }
}

/**
 * دالة للتحقق من وجود بيانات في جدول system_logs
 */
export async function checkSystemLogsCount(companyId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) {
      console.error('❌ خطأ في حساب البيانات:', error);
      return 0;
    }

    console.log(`📊 عدد النشاطات الموجودة: ${count || 0}`);
    return count || 0;
    
  } catch (error) {
    console.error('❌ خطأ في التحقق من البيانات:', error);
    return 0;
  }
}

// تصدير الدوال للاستخدام في Console المتصفح
if (typeof window !== 'undefined') {
  (window as any).populateSystemLogs = populateSystemLogs;
  (window as any).clearSystemLogs = clearSystemLogs;
  (window as any).checkSystemLogsCount = checkSystemLogsCount;
}




