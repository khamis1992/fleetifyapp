/**
 * Employee Workspace Report Export Utility
 * وظيفة تصدير تقرير شامل لمساحة عمل الموظف
 */

import { exportMultiSheetExcel, generateFilename, ExcelSheetData } from './excelExport';
import { 
  EmployeePerformance, 
  EmployeeTask, 
  EmployeePerformanceGrade,
  PERFORMANCE_GRADES
} from '@/types/employee-workspace.types';

interface EmployeeReportData {
  employeeName: string;
  contracts: any[];
  tasks: EmployeeTask[];
  performance: EmployeePerformance | null;
  performanceGrade: EmployeePerformanceGrade | null;
  collections: any[];
  stats: {
    contractStats: { totalContracts: number; activeContracts: number; totalBalanceDue: number };
    taskStats: { todayTasks: number; completionRate: number; totalTasks: number };
    collectionStats: { totalDue: number; totalCollected: number; collectionRate: number; totalPending: number };
  };
}

/**
 * Export comprehensive employee workspace report
 */
export const exportEmployeeWorkspaceReport = async (data: EmployeeReportData) => {
  try {
    const { 
      employeeName, 
      contracts, 
      tasks, 
      performance, 
      performanceGrade, 
      collections, 
      stats 
    } = data;

    // Validate data
    if (!employeeName) {
      throw new Error('اسم الموظف مطلوب');
    }

    const sheets: ExcelSheetData[] = [];

  // 1. Summary Sheet (ملخص الأداء)
  const summaryData = [
    { metric: 'اسم الموظف', value: employeeName },
    { metric: 'تاريخ التقرير', value: new Date().toLocaleDateString('ar-EG') },
    { metric: '', value: '' }, // Spacer
    
    // Performance Section
    { metric: '--- مؤشرات الأداء ---', value: '' },
    { metric: 'نقاط الأداء', value: performance ? Math.round(performance.performance_score) : 0 },
    { metric: 'التقييم العام', value: performanceGrade?.label_ar || 'غير محدد' },
    { metric: 'نسبة التحصيل', value: `${performance ? Math.round(performance.collection_rate) : 0}%` },
    { metric: 'نسبة إنجاز المهام', value: `${performance ? Math.round(performance.followup_completion_rate) : 0}%` },
    { metric: '', value: '' }, // Spacer

    // Contracts Stats
    { metric: '--- إحصائيات العقود ---', value: '' },
    { metric: 'إجمالي العقود', value: stats.contractStats.totalContracts },
    { metric: 'العقود النشطة', value: stats.contractStats.activeContracts },
    { metric: 'إجمالي المبالغ المستحقة', value: stats.contractStats.totalBalanceDue },
    { metric: '', value: '' }, // Spacer

    // Tasks Stats
    { metric: '--- إحصائيات المهام ---', value: '' },
    { metric: 'إجمالي المهام', value: stats.taskStats.totalTasks },
    { metric: 'مهام اليوم', value: stats.taskStats.todayTasks },
    { metric: 'نسبة الإنجاز', value: `${stats.taskStats.completionRate}%` },
    { metric: '', value: '' }, // Spacer

    // Collections Stats
    { metric: '--- إحصائيات التحصيل الشهري ---', value: '' },
    { metric: 'المستهدف هذا الشهر', value: stats.collectionStats.totalDue },
    { metric: 'تم تحصيله', value: stats.collectionStats.totalCollected },
    { metric: 'المتبقي', value: stats.collectionStats.totalPending },
    { metric: 'نسبة التحصيل الشهرية', value: `${Math.round(stats.collectionStats.collectionRate)}%` },
  ];

  sheets.push({
    sheetName: 'ملخص الأداء',
    data: summaryData,
    columns: [
      { header: 'المؤشر', key: 'metric', width: 30 },
      { header: 'القيمة', key: 'value', width: 30 },
    ],
    options: {
      includeHeaders: true,
      headerStyle: {
        bold: true,
        backgroundColor: 'FF10B981', // Emerald
        textColor: 'FFFFFFFF',
        fontSize: 12,
      }
    }
  });

  // 2. Contracts Sheet (العقود)
  const contractsData = (contracts || []).map(contract => ({
    contract_number: contract.contract_number,
    customer_name: contract.customers?.first_name_ar || contract.customers?.company_name_ar || 'غير محدد',
    customer_phone: contract.customers?.phone || '',
    status: translateStatus(contract.status),
    monthly_amount: contract.monthly_amount || 0,
    balance_due: contract.balance_due || 0,
    start_date: contract.start_date || '',
    end_date: contract.end_date || '',
    last_payment: contract.last_payment_date || 'لا يوجد',
    payment_status: (contract.balance_due || 0) > 0 ? 'مستحق' : 'مدفوع',
  }));

  // Only add contracts sheet if there's data
  if (contractsData.length > 0) {
    sheets.push({
      sheetName: 'العقود',
      data: contractsData,
    columns: [
      { header: 'رقم العقد', key: 'contract_number', width: 15 },
      { header: 'اسم العميل', key: 'customer_name', width: 30 },
      { header: 'رقم الهاتف', key: 'customer_phone', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'القيمة الشهرية', key: 'monthly_amount', width: 15 },
      { header: 'الرصيد المستحق', key: 'balance_due', width: 15 },
      { header: 'تاريخ البدء', key: 'start_date', width: 15 },
      { header: 'تاريخ الانتهاء', key: 'end_date', width: 15 },
      { header: 'آخر دفعة', key: 'last_payment', width: 15 },
      { header: 'حالة الدفع', key: 'payment_status', width: 15 },
    ],
    options: {
      headerStyle: {
        bold: true,
        backgroundColor: 'FF3B82F6', // Blue
        textColor: 'FFFFFFFF',
      }
    }
    });
  }

  // 3. Tasks Sheet (المهام)
  const tasksData = (tasks || []).map(task => ({
    title: task.title_ar || task.title,
    type: translateTaskType(task.type),
    status: translateTaskStatus(task.status),
    priority: translatePriority(task.priority),
    scheduled_date: task.scheduled_date,
    scheduled_time: task.scheduled_time || '',
    customer_name: task.customer_name,
    contract_number: task.contract_number,
    outcome: task.outcome || '',
    notes: task.outcome_notes || '',
  }));

  // Only add tasks sheet if there's data
  if (tasksData.length > 0) {
    sheets.push({
      sheetName: 'المهام',
      data: tasksData,
    columns: [
      { header: 'عنوان المهمة', key: 'title', width: 30 },
      { header: 'النوع', key: 'type', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'الأولوية', key: 'priority', width: 12 },
      { header: 'التاريخ', key: 'scheduled_date', width: 15 },
      { header: 'الوقت', key: 'scheduled_time', width: 10 },
      { header: 'العميل', key: 'customer_name', width: 25 },
      { header: 'رقم العقد', key: 'contract_number', width: 15 },
      { header: 'النتيجة', key: 'outcome', width: 20 },
      { header: 'ملاحظات', key: 'notes', width: 30 },
    ],
    options: {
      headerStyle: {
        bold: true,
        backgroundColor: 'FFF59E0B', // Amber
        textColor: 'FFFFFFFF',
      }
    }
    });
  }

  // 4. Collections Sheet (التحصيل)
  const collectionsData = (collections || []).map(item => ({
    customer_name: item.customer_name,
    contract_number: item.contract_number,
    invoice_number: item.invoice_number,
    amount: item.amount,
    due_date: new Date(item.due_date).toLocaleDateString('ar-EG'),
    status: item.status === 'paid' ? 'مدفوع' : 'غير مدفوع',
    days_overdue: item.days_overdue || 0,
  }));

  // Only add collections sheet if there's data
  if (collectionsData.length > 0) {
    sheets.push({
      sheetName: 'التحصيل الشهري',
      data: collectionsData,
    columns: [
      { header: 'اسم العميل', key: 'customer_name', width: 30 },
      { header: 'رقم العقد', key: 'contract_number', width: 15 },
      { header: 'رقم الفاتورة', key: 'invoice_number', width: 15 },
      { header: 'المبلغ', key: 'amount', width: 15 },
      { header: 'تاريخ الاستحقاق', key: 'due_date', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'أيام التأخير', key: 'days_overdue', width: 12 },
    ],
    options: {
      headerStyle: {
        bold: true,
        backgroundColor: 'FF8B5CF6', // Purple
        textColor: 'FFFFFFFF',
      }
    }
    });
  }

    // Ensure we have at least the summary sheet
    if (sheets.length === 0) {
      throw new Error('لا توجد بيانات كافية للتصدير');
    }

    const filename = generateFilename(`تقرير_الموظف_${employeeName.replace(/\s+/g, '_')}`);
    await exportMultiSheetExcel(sheets, filename);
  } catch (error) {
    console.error('Error exporting employee workspace report:', error);
    throw new Error('فشل تصدير التقرير. يرجى المحاولة مرة أخرى.');
  }
};

// Helper functions for translation
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'active': 'نشط',
    'closed': 'مغلق',
    'pending': 'قيد الانتظار',
    'cancelled': 'ملغى',
    'under_legal_procedure': 'تحت الإجراء القانوني',
  };
  return map[status] || status;
}

function translateTaskType(type: string): string {
  const map: Record<string, string> = {
    'followup': 'متابعة',
    'payment_collection': 'تحصيل دفعة',
    'contract_renewal': 'تجديد عقد',
    'violation_check': 'فحص مخالفات',
    'customer_contact': 'تواصل مع عميل',
    'task': 'مهمة عامة',
  };
  return map[type] || type;
}

function translateTaskStatus(status: string): string {
  const map: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'in_progress': 'جاري العمل',
    'completed': 'مكتمل',
    'cancelled': 'ملغى',
    'overdue': 'متأخر',
    'rescheduled': 'معاد جدولتها',
  };
  return map[status] || status;
}

function translatePriority(priority: string): string {
  const map: Record<string, string> = {
    'low': 'منخفض',
    'normal': 'عادي',
    'high': 'مرتفع',
    'urgent': 'عاجل',
    'critical': 'حرج',
  };
  return map[priority] || priority;
}
