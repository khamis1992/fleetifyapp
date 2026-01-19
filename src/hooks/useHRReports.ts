import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"


// Types for HR Reports
export interface AttendanceReportData {
  employee_id: string
  employee_number: string
  employee_name: string
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  total_hours: number
  overtime_hours: number
  attendance_rate: number
}

export interface EmployeeReportData {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  first_name_ar?: string
  last_name_ar?: string
  position?: string
  department?: string
  hire_date: string
  basic_salary: number
  allowances: number
  is_active: boolean
  has_system_access: boolean
}

export interface PayrollReportData {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  basic_salary: number
  allowances: number
  overtime_amount: number
  deductions: number
  tax_amount: number
  net_amount: number
  payroll_date: string
  status: string
}

export interface HRStatistics {
  total_employees: number
  active_employees: number
  attendance_rate: number
  total_payroll: number
  pending_payrolls: number
}

// Hook for Monthly Attendance Report
export const useAttendanceReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["attendance-report", startDate, endDate],
    queryFn: async () => {
      // Get company_id from current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (!profile) throw new Error('لم يتم العثور على بيانات المستخدم');

      // Get attendance records for the period
      let attendanceQuery = supabase
        .from("attendance_records")
        .select("*")

      if (startDate) attendanceQuery = attendanceQuery.gte("attendance_date", startDate)
      if (endDate) attendanceQuery = attendanceQuery.lte("attendance_date", endDate)

      const { data: attendanceData, error: attendanceError } = await attendanceQuery

      if (attendanceError) throw attendanceError

      // Get employee details separately
      const employeeIds = [...new Set(attendanceData?.map(record => record.employee_id) || [])]
      
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar
        `)
        .eq("company_id", profile.company_id)
        .in("id", employeeIds)

      if (employeesError) throw employeesError

      // Create employee lookup map
      const employeeMap = new Map(
        (employeesData || []).map(emp => [emp.id, emp])
      )

      // Process attendance data by employee
      const employeeAttendance = new Map<string, any>()

      attendanceData?.forEach(record => {
        const employeeId = record.employee_id
        const employee = employeeMap.get(employeeId)
        
        if (!employeeAttendance.has(employeeId)) {
          employeeAttendance.set(employeeId, {
            employee_id: employeeId,
            employee_number: employee?.employee_number || '',
            employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
            employee_name_ar: `${employee?.first_name_ar || ''} ${employee?.last_name_ar || ''}`.trim(),
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            total_hours: 0,
            overtime_hours: 0,
          })
        }

        const emp = employeeAttendance.get(employeeId)
        emp.total_days++
        
        if (record.status === 'present') {
          emp.present_days++
          emp.total_hours += Number(record.total_hours || 0)
          emp.overtime_hours += Number(record.overtime_hours || 0)
          
          if (Number(record.late_hours || 0) > 0) {
            emp.late_days++
          }
        } else if (record.status === 'absent') {
          emp.absent_days++
        }
      })

      // Calculate attendance rates
      const reportData: AttendanceReportData[] = Array.from(employeeAttendance.values()).map(emp => ({
        ...emp,
        attendance_rate: emp.total_days > 0 ? (emp.present_days / emp.total_days) * 100 : 0
      }))

      return reportData
    }
  })
}

// Hook for Employee Report
export const useEmployeeReport = () => {
  return useQuery({
    queryKey: ["employee-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          position,
          department,
          hire_date,
          basic_salary,
          allowances,
          is_active,
          has_system_access
        `)
        .order('employee_number')

      if (error) throw error

      return data as EmployeeReportData[]
    }
  })
}

// Hook for Payroll Report
export const usePayrollReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["payroll-report", startDate, endDate],
    queryFn: async () => {
      let payrollQuery = supabase
        .from("payroll")
        .select("*")

      if (startDate) payrollQuery = payrollQuery.gte("payroll_date", startDate)
      if (endDate) payrollQuery = payrollQuery.lte("payroll_date", endDate)

      const { data: payrollData, error: payrollError } = await payrollQuery.order('payroll_date', { ascending: false })

      if (payrollError) throw payrollError

      // Get employee details separately
      const employeeIds = [...new Set(payrollData?.map(record => record.employee_id) || [])]
      
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar
        `)
        .in("id", employeeIds)

      if (employeesError) throw employeesError

      // Create employee lookup map
      const employeeMap = new Map(
        (employeesData || []).map(emp => [emp.id, emp])
      )

      const reportData: PayrollReportData[] = (payrollData || []).map(payroll => {
        const employee = employeeMap.get(payroll.employee_id)
        
        return {
          id: payroll.id,
          employee_id: payroll.employee_id,
          employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
          employee_number: employee?.employee_number || '',
          basic_salary: Number(payroll.basic_salary),
          allowances: Number(payroll.allowances || 0),
          overtime_amount: Number(payroll.overtime_amount || 0),
          deductions: Number(payroll.deductions || 0),
          tax_amount: Number(payroll.tax_amount || 0),
          net_amount: Number(payroll.net_amount),
          payroll_date: payroll.payroll_date,
          status: payroll.status
        }
      })

      return reportData
    }
  })
}

// Hook for Leave Report (placeholder - assuming leaves will be implemented)
export const useLeaveReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["leave-report", startDate, endDate],
    queryFn: async () => {
      // For now, return empty data as leaves table doesn't exist yet
      return []
    }
  })
}

// Hook for HR Statistics
export const useHRStatistics = () => {
  return useQuery({
    queryKey: ["hr-statistics"],
    queryFn: async () => {
      // Get total employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, is_active")

      if (empError) throw empError

      const total_employees = employees?.length || 0
      const active_employees = employees?.filter(emp => emp.is_active).length || 0

      // Get attendance rate for current month
      const currentMonth = new Date()
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data: attendance, error: attError } = await supabase
        .from("attendance_records")
        .select("status")
        .gte("attendance_date", firstDay.toISOString().split('T')[0])
        .lte("attendance_date", lastDay.toISOString().split('T')[0])

      if (attError) throw attError

      const totalAttendanceRecords = attendance?.length || 0
      const presentRecords = attendance?.filter(att => att.status === 'present').length || 0
      const attendance_rate = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0

      // Get payroll statistics for current month
      const { data: payrolls, error: payError } = await supabase
        .from("payroll")
        .select("net_amount, status")
        .gte("payroll_date", firstDay.toISOString().split('T')[0])
        .lte("payroll_date", lastDay.toISOString().split('T')[0])

      if (payError) throw payError

      const total_payroll = payrolls?.reduce((sum, p) => sum + Number(p.net_amount), 0) || 0
      const pending_payrolls = payrolls?.filter(p => p.status === 'draft').length || 0

      const statistics: HRStatistics = {
        total_employees,
        active_employees,
        attendance_rate: Math.round(attendance_rate),
        total_payroll,
        pending_payrolls
      }

      return statistics
    }
  })
}

// HTML Export utility for HR reports
export const exportHRReportToHTML = (content: string, title: string, companyName?: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }
            
            @media print {
                body { 
                    margin: 0; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print { display: none; }
                .page-break { page-break-before: always; }
                table { 
                    page-break-inside: avoid;
                    font-size: 12px;
                }
                th, td { 
                    padding: 6px;
                    border: 1px solid #000 !important;
                }
                th {
                    background-color: #f5f5f5 !important;
                }
            }
            
            body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                margin: 20px;
                direction: rtl;
                text-align: right;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            
            .company-name {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #1a1a1a;
            }
            
            .report-title {
                font-size: 22px;
                color: #444;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .report-date {
                color: #666;
                font-size: 14px;
                font-weight: normal;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
                border: 1px solid #ddd;
            }
            
            th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: right;
                vertical-align: top;
            }
            
            th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #2c3e50;
                border-bottom: 2px solid #dee2e6;
            }
            
            .total-row {
                background-color: #f1f3f4;
                font-weight: bold;
                border-top: 2px solid #dee2e6;
            }
            
            .positive {
                color: #22c55e;
                font-weight: 600;
            }
            
            .negative {
                color: #ef4444;
                font-weight: 600;
            }
            
            .footer {
                margin-top: 50px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            
            .action-buttons {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                gap: 10px;
            }
            
            .btn {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 12px 20px;
                cursor: pointer;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .btn:hover {
                background-color: #0056b3;
            }
            
            .btn-secondary {
                background-color: #6c757d;
            }
            
            .btn-secondary:hover {
                background-color: #545b62;
            }
            
            .content {
                min-height: 400px;
            }
            
            .text-center {
                text-align: center;
            }

            .status-active {
                color: #22c55e;
                font-weight: 600;
            }
            
            .status-inactive {
                color: #ef4444;
                font-weight: 600;
            }
        </style>
        <script>
            function printReport() {
                window.print();
            }
            
            function closeWindow() {
                window.close();
            }
            
            window.onload = function() {
                document.body.focus();
            }
        </script>
    </head>
    <body>
        <div class="action-buttons no-print">
            <button class="btn" onclick="printReport()">🖨️ طباعة التقرير</button>
            <button class="btn btn-secondary" onclick="closeWindow()">✕ إغلاق</button>
        </div>
        
        <div class="header">
            <div class="company-name">${companyName || 'اسم الشركة'}</div>
            <div class="report-title">${title}</div>
            <div class="report-date">تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <p>تم إنشاء هذا التقرير بواسطة نظام الموارد البشرية - ${new Date().toLocaleString('en-GB')}</p>
        </div>
    </body>
    </html>
  `

  // Open HTML content in new tab
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(htmlContent)
    newWindow.document.close()
    newWindow.focus()
  } else {
    alert('يرجى السماح للنوافذ المنبثقة لعرض التقرير')
  }
}