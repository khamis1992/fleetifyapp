/**
 * Export to Excel Utility
 * دوال مساعدة لتصدير البيانات إلى Excel
 */

import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  sheetName?: string;
  data: any[];
  columns?: { header: string; key: string }[];
}

/**
 * Export data to Excel file
 */
export const exportToExcel = ({ filename, sheetName = 'Sheet1', data, columns }: ExportOptions) => {
  try {
    // Prepare data
    let exportData = data;

    // If columns are specified, map data to match columns
    if (columns && columns.length > 0) {
      exportData = data.map(row => {
        const newRow: any = {};
        columns.forEach(col => {
          newRow[col.header] = row[col.key] ?? '';
        });
        return newRow;
      });
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error };
  }
};

/**
 * Export employee contracts to Excel
 */
export const exportEmployeeContracts = (contracts: any[], employeeName: string) => {
  const data = contracts.map(contract => ({
    'رقم العقد': contract.contract_number,
    'اسم العميل': contract.customer_name,
    'الحالة': contract.status,
    'المبلغ الشهري': contract.monthly_amount,
    'الرصيد المستحق': contract.balance_due,
    'تاريخ البدء': contract.start_date,
    'تاريخ الانتهاء': contract.end_date,
    'آخر دفعة': contract.last_payment_date || 'لا يوجد',
  }));

  return exportToExcel({
    filename: `عقود_${employeeName}`,
    sheetName: 'العقود',
    data,
  });
};

/**
 * Export team performance to Excel
 */
export const exportTeamPerformance = (employees: any[]) => {
  const data = employees.map(emp => ({
    'الموظف': emp.employee_name,
    'البريد الإلكتروني': emp.employee_email,
    'عدد العقود': emp.total_contracts,
    'العقود النشطة': emp.active_contracts,
    'نقاط الأداء': Math.round(emp.performance_score),
    'التقييم': emp.grade,
    'نسبة التحصيل': `${Math.round(emp.collection_rate)}%`,
    'إنجاز المهام': `${Math.round(emp.followup_completion_rate)}%`,
    'المبلغ المحصّل': emp.total_collected,
    'الرصيد المستحق': emp.total_balance_due,
  }));

  return exportToExcel({
    filename: 'أداء_الفريق',
    sheetName: 'الأداء',
    data,
  });
};

/**
 * Export employee tasks to Excel
 */
export const exportEmployeeTasks = (tasks: any[], employeeName: string) => {
  const data = tasks.map(task => ({
    'العنوان': task.title_ar || task.title,
    'النوع': task.followup_type,
    'الحالة': task.status,
    'التاريخ المجدول': task.scheduled_date,
    'الوقت': task.scheduled_time || '',
    'الأولوية': task.priority,
    'اسم العميل': task.customer_name,
    'رقم العقد': task.contract_number,
    'الملاحظات': task.notes || '',
  }));

  return exportToExcel({
    filename: `مهام_${employeeName}`,
    sheetName: 'المهام',
    data,
  });
};

/**
 * Export communications log to Excel
 */
export const exportCommunications = (communications: any[], contractNumber: string) => {
  const data = communications.map(comm => ({
    'التاريخ': new Date(comm.communication_date).toLocaleDateString('ar-EG'),
    'النوع': comm.communication_type,
    'الملاحظات': comm.notes,
    'الموظف': comm.contacted_by_name || 'غير محدد',
  }));

  return exportToExcel({
    filename: `تواصل_عقد_${contractNumber}`,
    sheetName: 'التواصل',
    data,
  });
};
