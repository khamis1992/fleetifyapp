import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface OptimizedActivity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  amount?: number;
  status?: string;
}

export const useOptimizedRecentActivities = () => {
  const { companyId, getQueryKey, isSystemLevel, isBrowsingMode } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['optimized-recent-activities']),
    queryFn: async (): Promise<OptimizedActivity[]> => {
      try {
        // التسجيل التشخيصي لتتبع المشكلة
        console.log('🔍 [ACTIVITIES] Fetching activities with context:', {
          companyId,
          isSystemLevel,
          isBrowsingMode,
          timestamp: new Date().toISOString()
        });

        if (!companyId && !isSystemLevel) {
          console.warn('⚠️ [ACTIVITIES] No company ID available and not system level - returning empty array');
          return [];
        }

        // Optimized query - fetch only last 10 activities, no complex joins
        // Build query with proper null handling
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Start with base query
        let query = supabase
          .from('system_logs')
          .select('id, category, action, message, level, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(10);

        // Filter by company_id based on context
        if (companyId) {
          query = query.eq('company_id', companyId);
        } else if (isSystemLevel) {
          // For system-level users without companyId, show all activities with company_id
          query = query.not('company_id', 'is', null);
        }
        // Note: If no companyId and not system level, we already return early above

        const { data: activities, error } = await query;

        if (error) {
          // Log detailed error information for debugging
          const errorDetails = {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            companyId,
            isSystemLevel,
            timestamp: new Date().toISOString()
          };
          
          console.error('❌ [ACTIVITIES] Error fetching activities:', errorDetails);
          console.error('❌ [ACTIVITIES] Full error object:', error);
          
          // Handle specific error types gracefully
          if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
            console.warn('⚠️ [ACTIVITIES] RLS policy or permission issue - returning empty array');
            return [];
          }
          
          if (error.code === '42P01') {
            console.error('❌ [ACTIVITIES] Table system_logs does not exist');
            return [];
          }
          
          // Handle PostgREST filter syntax errors
          if (error.code === 'PGRST100' || error.message?.includes('syntax error') || error.message?.includes('invalid')) {
            console.error('❌ [ACTIVITIES] Query syntax error - check filter syntax');
            return [];
          }
          
          // For other errors, return empty array to prevent UI breaking
          return [];
        }

        // Simple filtering without fetching additional data
        const filteredActivities = activities?.filter(activity => 
          !isUnimportantActivity(activity)
        ) || [];

        // Convert to display format without async operations
        const enhancedActivities = filteredActivities.map((activity) => ({
          id: activity.id,
          type: getCategoryDisplayName(activity.category),
          description: cleanTechnicalMessage(activity.message || getActivityDescription(activity)),
          time: getRelativeTime(activity.created_at),
          icon: getCategoryIcon(activity.category),
          color: getCategoryColor(activity.category, activity.level),
          priority: getPriorityFromLevel(activity.level),
          created_at: activity.created_at,
          status: activity.action
        }));

        return enhancedActivities;
      } catch (err) {
        // Catch any unexpected errors during processing
        console.error('❌ [ACTIVITIES] Unexpected error in queryFn:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          companyId,
          timestamp: new Date().toISOString()
        });
        return [];
      }
    },
    enabled: !!companyId || isSystemLevel, // Enable for company-scoped users or system-level users
    staleTime: 10 * 60 * 1000, // 10 minutes - تخزين مؤقت لمدة أطول
    gcTime: 30 * 60 * 1000, // 30 minutes - الاحتفاظ بالذاكرة المؤقتة
    refetchOnMount: false, // لا تحمل مرة أخرى عند التحميل
    refetchOnWindowFocus: false, // لا تحمل عند العودة للنافذة
    placeholderData: [], // عرض فوري للبيانات القديمة
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });
};

// Helper function to check if an activity is unimportant (technical queries, etc.)
function isUnimportantActivity(activity: any): boolean {
  const unimportantActions = [
    'fetch_available_for_contracts',
    'query',
    'search',
    'view',
    'list',
    'get'
  ];
  
  // تصفية الاستعلامات التقنية
  if (unimportantActions.includes(activity.action)) {
    return true;
  }
  
  // تصفية الرسائل التي تحتوي على معرفات شركة فقط
  if (activity.message && activity.message.match(/^[^a-zA-Z\u0600-\u06FF]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[^a-zA-Z\u0600-\u06FF]*$/)) {
    return true;
  }
  
  return false;
}

// Comprehensive activity message enhancement function
async function enhanceActivityMessage(originalMessage: string, activity: any): Promise<string> {
  // تنظيف الرسالة من معرفات الشركة والمعلومات التقنية
  let cleanMessage = cleanTechnicalMessage(originalMessage);
  
  // إذا كانت الرسالة قصيرة جداً أو تقنية، أنشئ رسالة جديدة
  if (cleanMessage.length < 3 || isTechnicalMessage(cleanMessage)) {
    cleanMessage = await generateMeaningfulMessage(activity);
  }
  
  // ترجمة الرسائل الإنجليزية إلى العربية
  cleanMessage = translateToArabic(cleanMessage);
  
  return cleanMessage;
}

// Clean technical jargon from messages
function cleanTechnicalMessage(message: string): string {
  return message
    // إزالة معرفات الشركة (UUIDs)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    // إزالة عبارات تقنية
    .replace(/للشركة\s*/g, '')
    .replace(/company\s*/gi, '')
    .replace(/\bfor\s+company\b/gi, '')
    .replace(/\bid:\s*/gi, '')
    // تنظيف المسافات الزائدة
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if message is still technical after cleaning
function isTechnicalMessage(message: string): boolean {
  const technicalPatterns = [
    /^استعلام/,
    /^query/i,
    /^fetch/i,
    /^get/i,
    /record/i,
    /database/i,
    /table/i
  ];
  
  return technicalPatterns.some(pattern => pattern.test(message)) || message.length < 3;
}

// Generate meaningful messages based on activity context
async function generateMeaningfulMessage(activity: any): Promise<string> {
  const actionMessages: Record<string, Record<string, string>> = {
    'contracts': {
      'create': 'تم إنشاء عقد جديد',
      'update': 'تم تحديث عقد',
      'delete': 'تم حذف عقد',
      'default': 'نشاط في العقود'
    },
    'customers': {
      'create': 'تم تسجيل عميل جديد',
      'update': 'تم تحديث بيانات عميل',
      'delete': 'تم حذف عميل',
      'default': 'نشاط في العملاء'
    },
    'fleet': {
      'create': 'تم إضافة مركبة جديدة',
      'update': 'تم تحديث بيانات مركبة',
      'delete': 'تم حذف مركبة',
      'search': 'تم البحث في أسطول المركبات',
      'fetch_available_for_contracts': 'تم البحث عن المركبات المتاحة',
      'default': 'نشاط في أسطول المركبات'
    },
    'hr': {
      'create': 'تم إضافة موظف جديد',
      'update': 'تم تحديث بيانات موظف',
      'delete': 'تم حذف موظف',
      'default': 'نشاط في الموارد البشرية'
    },
    'finance': {
      'create': 'تم تسجيل عملية مالية جديدة',
      'update': 'تم تحديث عملية مالية',
      'delete': 'تم حذف عملية مالية',
      'default': 'نشاط مالي'
    }
  };
  
  const categoryMessages = actionMessages[activity.category] || {};
  const message = categoryMessages[activity.action] || categoryMessages['default'] || 'نشاط جديد في النظام';
  
  // إضافة تفاصيل إضافية إذا كان متاحاً معرف المورد
  if (activity.resource_id && activity.category === 'fleet') {
    const vehicleInfo = await getVehicleInfo(activity.resource_id);
    if (vehicleInfo) {
      return `${message} - ${vehicleInfo.make || ''} ${vehicleInfo.model || ''} (${vehicleInfo.plate_number || 'غير محددة'})`.trim();
    }
  }
  
  return message;
}

// Translate common English phrases to Arabic
function translateToArabic(message: string): string {
  const translations: Record<string, string> = {
    'New contracts record created': 'تم إنشاء عقد جديد',
    'New customers record created': 'تم إنشاء عميل جديد',
    'New vehicles record created': 'تم إنشاء مركبة جديدة',
    'New employees record created': 'تم إنشاء موظف جديد',
    'New payments record created': 'تم تسجيل دفعة مالية جديدة',
    'contracts record updated': 'تم تحديث عقد',
    'customers record updated': 'تم تحديث بيانات عميل',
    'vehicles record updated': 'تم تحديث بيانات مركبة',
    'employees record updated': 'تم تحديث بيانات موظف',
    'record created': 'تم إنشاء سجل جديد',
    'record updated': 'تم تحديث سجل',
    'record deleted': 'تم حذف سجل'
  };
  
  // البحث عن الترجمات الكاملة أولاً
  for (const [english, arabic] of Object.entries(translations)) {
    if (message.toLowerCase().includes(english.toLowerCase())) {
      return arabic;
    }
  }
  
  // استبدال كلمات فردية
  return message
    .replace(/\bcreated\b/gi, 'تم إنشاء')
    .replace(/\bupdated\b/gi, 'تم تحديث')
    .replace(/\bdeleted\b/gi, 'تم حذف')
    .replace(/\bcontract\b/gi, 'عقد')
    .replace(/\bcustomer\b/gi, 'عميل')
    .replace(/\bvehicle\b/gi, 'مركبة')
    .replace(/\bemployee\b/gi, 'موظف')
    .replace(/\bpayment\b/gi, 'دفعة')
    .replace(/\brecord\b/gi, 'سجل')
    .replace(/\bnew\b/gi, 'جديد');
}

function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'contracts': 'عقد',
    'customers': 'عميل',
    'fleet': 'مركبة',
    'hr': 'موظف',
    'finance': 'مالية',
    'system': 'نظام'
  };
  return categoryMap[category] || category;
}

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'contracts': 'FileText',
    'customers': 'Users',
    'fleet': 'Car',
    'hr': 'UserPlus',
    'finance': 'DollarSign',
    'system': 'Settings'
  };
  return iconMap[category] || 'Activity';
}

function getCategoryColor(category: string, level: string): string {
  if (level === 'error') return 'text-red-600 bg-red-100';
  if (level === 'warning') return 'text-orange-600 bg-orange-100';
  
  const colorMap: Record<string, string> = {
    'contracts': 'text-green-600 bg-green-100',
    'customers': 'text-blue-600 bg-blue-100',
    'fleet': 'text-purple-600 bg-purple-100',
    'hr': 'text-indigo-600 bg-indigo-100',
    'finance': 'text-emerald-600 bg-emerald-100',
    'system': 'text-slate-600 bg-slate-100'
  };
  return colorMap[category] || 'text-slate-600 bg-slate-100';
}

function getPriorityFromLevel(level: string): 'high' | 'medium' | 'low' {
  if (level === 'error') return 'high';
  if (level === 'warning') return 'medium';
  return 'low';
}

// Helper function to fetch vehicle information
async function getVehicleInfo(vehicleId: string) {
  try {
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model, year')
      .eq('id', vehicleId)
      .single();

    if (error || !vehicle) return null;
    return vehicle;
  } catch (error) {
    console.error('Error fetching vehicle info:', error);
    return null;
  }
}

// Helper function to enhance vehicle messages with specific vehicle information
function enhanceVehicleMessage(originalMessage: string, vehicleInfo: any, action: string): string {
  const actionMap: Record<string, string> = {
    'create': 'تم إضافة',
    'update': 'تم تحديث',
    'delete': 'تم حذف',
    'view': 'تم استعلام',
    'search': 'تم البحث عن'
  };
  
  const actionText = actionMap[action] || 'تم التعامل مع';
  const vehicleDisplay = `${vehicleInfo.make || ''} ${vehicleInfo.model || ''} - لوحة: ${vehicleInfo.plate_number || 'غير محددة'}`.trim();
  
  // إزالة أي company IDs من الرسالة وتنظيفها
  let cleanMessage = originalMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '') // إزالة UUIDs
    .replace(/للشركة\s*/g, '') // إزالة كلمة "للشركة"
    .replace(/\s+/g, ' ') // تنظيف المسافات الزائدة
    .trim();
  
  // إذا كانت الرسالة تحتوي على معرفات شركة أو كانت عامة، استبدلها بمعلومات المركبة
  if (cleanMessage.length < 5 || cleanMessage.includes('مركبة') || cleanMessage.includes('vehicle') || cleanMessage.includes('fleet')) {
    return `${actionText} المركبة ${vehicleDisplay}`;
  }
  
  return cleanMessage;
}

function getActivityDescription(activity: any): string {
  if (activity.message) return activity.message;
  
  const actionMap: Record<string, string> = {
    'create': 'تم إنشاء',
    'update': 'تم تحديث',
    'delete': 'تم حذف'
  };
  
  const action = actionMap[activity.action] || activity.action;
  const resourceType = getCategoryDisplayName(activity.category);
  
  return `${action} ${resourceType}`;
}

function getTableDisplayName(tableName: string): string {
  const tableMap: Record<string, string> = {
    'contracts': 'عقد جديد',
    'customers': 'عميل جديد',
    'vehicles': 'مركبة جديدة',
    'employees': 'موظف جديد',
    'payments': 'دفعة مالية',
    'vehicle_maintenance': 'صيانة'
  };
  return tableMap[tableName] || tableName;
}

function getTableIcon(tableName: string): string {
  const iconMap: Record<string, string> = {
    'contracts': 'FileText',
    'customers': 'Users',
    'vehicles': 'Car',
    'employees': 'UserPlus',
    'payments': 'DollarSign',
    'vehicle_maintenance': 'Wrench'
  };
  return iconMap[tableName] || 'Activity';
}

function getTableColor(tableName: string): string {
  const colorMap: Record<string, string> = {
    'contracts': 'text-green-600 bg-green-100',
    'customers': 'text-blue-600 bg-blue-100',
    'vehicles': 'text-purple-600 bg-purple-100',
    'employees': 'text-indigo-600 bg-indigo-100',
    'payments': 'text-emerald-600 bg-emerald-100',
    'vehicle_maintenance': 'text-orange-600 bg-orange-100'
  };
  return colorMap[tableName] || 'text-slate-600 bg-slate-100';
}

function generateDescription(item: unknown): string {
  // Generate description based on table and data
  switch (item.table_name) {
    case 'contracts':
      return `تم إنشاء عقد #${item.contract_number || item.record_id}`;
    case 'customers':
      return `تم تسجيل العميل ${item.first_name || 'جديد'}`;
    case 'vehicles':
      return `تم إضافة المركبة ${item.plate_number || 'جديدة'}`;
    case 'employees':
      return `تم إضافة الموظف ${item.first_name || 'جديد'}`;
    case 'payments':
      return `تم ${item.payment_type === 'receipt' ? 'استلام' : 'دفع'} مبلغ ${item.amount || 0}`;
    case 'vehicle_maintenance':
      return `طلب صيانة للمركبة ${item.plate_number || ''}`;
    default:
      return `نشاط جديد في ${getTableDisplayName(item.table_name)}`;
  }
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `منذ ${diffInDays} يوم`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `منذ ${diffInMonths} شهر`;
}