import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Users, DollarSign, UserCheck, UserX, Building2, CalendarDays, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedEmployeeDialog } from '@/components/hr/UnifiedEmployeeDialog';
import DeleteEmployeeConfirmDialog from '@/components/hr/DeleteEmployeeConfirmDialog';
import AccountCreatedDialog from '@/components/hr/AccountCreatedDialog';
import EmployeePayrollDetails from '@/components/hr/EmployeePayrollDetails';
import { EmployeeFormData } from '@/components/hr/EmployeeForm';
import { AttendancePermissionsPanel } from '@/components/hr/AttendancePermissionsPanel';
import { useCreatePayroll, CreatePayrollData } from '@/hooks/usePayroll';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';
import { PageHelp } from "@/components/help";
import { EmployeesPageHelpContent } from "@/components/help/content";
import { useAuditLog } from '@/hooks/useAuditLog';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { PageEmpty, PageLoading, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

interface Employee {
  id: string;
  company_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email?: string;
  phone?: string;
  position?: string;
  position_ar?: string;
  department?: string;
  department_ar?: string;
  hire_date: string;
  basic_salary: number;
  allowances: number;
  is_active: boolean;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function Employees() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showAdvancedfilters, setShowAdvancedFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterContractType, setFilterContractType] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const { hasPermission } = useRolePermissions();

  const canEdit = hasPermission('edit_employees' as any);
  const canDelete = hasPermission('delete_employees' as any);
  const [accountData, setAccountData] = useState<any>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: _user } = useAuth();
  const { logAudit } = useAuditLog();

  const { formatCurrency } = useCurrencyFormatter();

  // Company scope filter
  const companyFilter = useCompanyFilter();

  // Payroll mutations
  const createPayrollMutation = useCreatePayroll();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', companyFilter?.company_id ?? 'all'],
    queryFn: async () => {
      if (!companyFilter?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .match(companyFilter as Record<string, string>)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!companyFilter?.company_id,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      // Get current user company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const companyId = companyFilter?.company_id;
      if (!companyId) throw new Error('Company not found in current context');

      // Check for duplicate employee number among active employees
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
         .eq('company_id', companyId)
        .eq('employee_number', employeeData.employee_number)
        .eq('is_active', true)
        .single();

      if (existingEmployee) {
        throw new Error('رقم الموظف موجود مسبقاً لدى موظف نشط');
      }

      // Use account email or regular email for employee
      const employeeEmail = employeeData.createAccount ? employeeData.accountEmail : employeeData.email;

      // Check for duplicate email among active employees (if email is provided)
      if (employeeEmail && employeeEmail.trim()) {
        const { data: existingEmailEmployee } = await supabase
          .from('employees')
          .select('id')
           .eq('company_id', companyId)
          .eq('email', employeeEmail.trim())
          .eq('is_active', true)
          .single();

        if (existingEmailEmployee) {
          throw new Error('البريد الإلكتروني موجود مسبقاً لدى موظف نشط');
        }
      }

      // Insert new employee
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          employee_number: employeeData.employee_number,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          first_name_ar: employeeData.first_name_ar,
          last_name_ar: employeeData.last_name_ar,
          email: employeeEmail,
          phone: employeeData.phone,
          position: employeeData.position,
          position_ar: employeeData.position_ar,
          department: employeeData.department,
          department_ar: employeeData.department_ar,
          hire_date: employeeData.hire_date.toISOString().split('T')[0],
          basic_salary: employeeData.basic_salary,
          allowances: employeeData.allowances || 0,
          national_id: employeeData.national_id,
          address: employeeData.address,
          address_ar: employeeData.address_ar,
          emergency_contact_name: employeeData.emergency_contact_name,
          emergency_contact_phone: employeeData.emergency_contact_phone,
          bank_account: employeeData.bank_account,
          iban: employeeData.iban,
          notes: employeeData.notes,
          company_id: companyId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return { employee, employeeData };
    },
    onSuccess: async ({ employee, employeeData }) => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyFilter?.company_id ?? 'all'] });

      // Log audit trail
      await logAudit({
        action: 'CREATE',
        resource_type: 'employee',
        resource_id: employee.id,
        entity_name: `${employee.first_name} ${employee.last_name}`,
        changes_summary: `Created new employee: ${employee.employee_number}`,
        new_values: {
          employee_number: employee.employee_number,
          position: employee.position,
          department: employee.department,
          basic_salary: employee.basic_salary,
        },
        metadata: {
          employee_number: employee.employee_number,
          position: employee.position,
          department: employee.department,
          create_account: employeeData.createAccount || false,
        },
        severity: 'medium',
      });

      // If account creation is requested, create account after employee is added
      if (employeeData.createAccount && employeeData.accountEmail && employeeData.accountRoles) {
        setIsCreatingAccount(true);
        await createUserAccount(employee, employeeData);
      } else {
        setIsDialogOpen(false);
        toast({
          title: 'تم إضافة الموظف بنجاح',
          description: 'تم حفظ بيانات الموظف الجديد في النظام',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في إضافة الموظف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createUserAccount = async (employee: any, employeeData: EmployeeFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (employeeData.creationMethod === 'direct') {
        // Direct account creation
          const { data: result, error } = await supabase.functions.invoke('create-user-account', {
            body: {
              employee_id: employee.id,
              first_name: employee.first_name,
              last_name: employee.last_name,
              email: employeeData.accountEmail,
              roles: employeeData.accountRoles,
              temporary_password: employeeData.accountSetPassword ? employeeData.accountPassword : undefined,
              requester_name: user.email || 'مدير النظام',
              notes: employeeData.accountNotes,
              user_id: user.id,
              company_id: employee.company_id
            }
          });

        if (error) throw error;
        if (!result?.success) throw new Error(result?.error || 'فشل في إنشاء الحساب');

        setAccountData({
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_email: employeeData.accountEmail,
          temporary_password: result.temporary_password || employeeData.accountPassword,
          password_expires_at: result.password_expires_at,
          employee_phone: employee.phone,
          employee_id: employee.id,
        });
        setShowAccountDialog(true);
        setIsDialogOpen(false);

        // Log audit trail for account creation
        await logAudit({
          action: 'CREATE',
          resource_type: 'user_account' as any,
          resource_id: result.user_id || employee.id,
          entity_name: employeeData.accountEmail,
          changes_summary: `Created user account for ${employee.first_name} ${employee.last_name}`,
          new_values: {
            email: employeeData.accountEmail,
            roles: employeeData.accountRoles,
            employee_id: employee.id,
          },
          metadata: {
            employee_name: `${employee.first_name} ${employee.last_name}`,
            roles: employeeData.accountRoles?.join(', '),
            creation_method: 'direct',
          },
          severity: 'critical',
        });

        toast({
          title: 'تم إضافة الموظف وإنشاء الحساب بنجاح',
          description: 'تم إنشاء حساب النظام بكلمة مرور مؤقتة',
        });
      } else {
        // Email invitation method
        const { error: requestError } = await supabase
          .from('account_creation_requests')
          .insert({
            employee_id: employee.id,
            company_id: employee.company_id,
            requested_by: user.id,
            requested_roles: employeeData.accountRoles,
            notes: employeeData.accountNotes,
            direct_creation: false
          });

        if (requestError) throw requestError;

        // Update employee account status
        await supabase
          .from('employees')
          .update({ account_status: 'pending' })
          .eq('id', employee.id);

        setIsDialogOpen(false);
        toast({
          title: 'تم إضافة الموظف وطلب إنشاء الحساب',
          description: 'تم إنشاء طلب حساب مستخدم للموظف',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء حساب المستخدم';
      toast({
        variant: 'destructive',
        title: 'تم إضافة الموظف لكن فشل إنشاء الحساب',
        description: errorMessage,
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      if (!selectedEmployee) throw new Error('No employee selected');

      // Get current user company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

       const companyId = selectedEmployee.company_id;
       if (!companyId) throw new Error('Company not found');

      // Check for duplicate employee number among active employees (excluding current employee)
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
         .eq('company_id', companyId)
        .eq('employee_number', employeeData.employee_number)
        .eq('is_active', true)
        .neq('id', selectedEmployee.id)
        .single();

      if (existingEmployee) {
        throw new Error('رقم الموظف موجود مسبقاً لدى موظف نشط آخر');
      }

      // Check for duplicate email among active employees (if email is provided, excluding current employee)
      if (employeeData.email && employeeData.email.trim()) {
        const { data: existingEmailEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', companyId)
          .eq('email', employeeData.email.trim())
          .eq('is_active', true)
          .neq('id', selectedEmployee.id)
          .single();

        if (existingEmailEmployee) {
          throw new Error('البريد الإلكتروني موجود مسبقاً لدى موظف نشط آخر');
        }
      }

      const { data, error } = await supabase
        .from('employees')
        .update({
          employee_number: employeeData.employee_number,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          first_name_ar: employeeData.first_name_ar,
          last_name_ar: employeeData.last_name_ar,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          position_ar: employeeData.position_ar,
          department: employeeData.department,
          department_ar: employeeData.department_ar,
          hire_date: employeeData.hire_date.toISOString().split('T')[0],
          basic_salary: employeeData.basic_salary,
          allowances: employeeData.allowances || 0,
          national_id: employeeData.national_id,
          address: employeeData.address,
          address_ar: employeeData.address_ar,
          emergency_contact_name: employeeData.emergency_contact_name,
          emergency_contact_phone: employeeData.emergency_contact_phone,
          bank_account: employeeData.bank_account,
          iban: employeeData.iban,
          notes: employeeData.notes,
        })
        .eq('id', selectedEmployee.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyFilter?.company_id ?? 'all'] });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: 'تم تحديث بيانات الموظف بنجاح',
        description: 'تم حفظ التغييرات في النظام',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في تحديث بيانات الموظف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete employee mutation (soft delete)
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyFilter?.company_id ?? 'all'] });

      // Log audit trail
      await logAudit({
        action: 'DELETE',
        resource_type: 'employee',
        resource_id: data.id,
        entity_name: `${data.first_name} ${data.last_name}`,
        changes_summary: `Deactivated employee: ${data.employee_number}`,
        metadata: {
          employee_number: data.employee_number,
          position: data.position,
          department: data.department,
        },
        severity: 'high',
      });

      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: 'تم حذف الموظف بنجاح',
        description: 'تم إلغاء تفعيل الموظف من النظام',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في حذف الموظف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddEmployee = (employeeData: EmployeeFormData) => {
    addEmployeeMutation.mutate(employeeData);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = (employeeData: EmployeeFormData) => {
    updateEmployeeMutation.mutate(employeeData);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedEmployee) {
      deleteEmployeeMutation.mutate(selectedEmployee.id);
    }
  };

  const handleViewPayroll = (employee: Employee) => {
    setSelectedEmployeeForPayroll(employee);
    setShowPayrollDialog(true);
  };

  const handleCreatePayroll = (data: CreatePayrollData) => {
    createPayrollMutation.mutate(data);
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (employees || []).filter(employee => {
      const matchesSearch = !term ||
        employee.first_name.toLowerCase().includes(term) ||
        employee.last_name.toLowerCase().includes(term) ||
        employee.employee_number.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term);

      const matchesDepartment = !filterDepartment || employee.department === filterDepartment || employee.department_ar === filterDepartment;
      // "on_leave" and "terminated" both map to inactive employees, matching the legacy filters.
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' ? employee.is_active : !employee.is_active);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, filterDepartment, statusFilter]);

  const departments = [...new Set(employees?.map(e => e.department).filter(Boolean) || [])];

  const departmentRows = departments
    .map(dept => ({ label: dept || 'غير محدد', value: employees?.filter(e => e.department === dept).length || 0 }))
    .sort((a, b) => b.value - a.value)
    .map(row => ({ ...row, percent: employees?.length ? (row.value / employees.length) * 100 : 0 }));

  const stats = {
    total: employees?.length || 0,
    active: employees?.filter(e => e.is_active).length || 0,
    inactive: employees?.filter(e => !e.is_active).length || 0,
    departments: departments.length,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      setRefreshedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const visibleEmployees = filteredEmployees.slice(0, 12);

  const metrics = [
    { label: 'إجمالي الموظفين', value: stats.total, hint: 'ملفات الموظفين النشطة', icon: Users, accent: true },
    { label: 'نشط', value: stats.active, hint: 'على رأس العمل حالياً', icon: UserCheck, accent: false },
    { label: 'غير نشط', value: stats.inactive, hint: 'موقوفون أو منتهية خدماتهم', icon: UserX, accent: false },
    { label: 'الأقسام', value: stats.departments, hint: 'أقسام مفعلة في الهيكل', icon: Building2, accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> الموارد البشرية <span>/</span> الموظفون
            </div>
            <h1>إدارة الموظفين</h1>
            <p>ملف موحد للموظفين يشمل البيانات الأساسية، الرواتب، الصلاحيات، وحالة العمل.</p>
          </div>
          <div className="dw-header-tools">
            <button
              className="dw-icon-button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="تحديث بيانات الموظفين"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarDays size={17} />
            <span>{new Date().toLocaleDateString('ar-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="dw-primary-actions">
            <button className="dw-button dw-button-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus size={17} />
              إضافة موظف جديد
            </button>
          </div>
        </div>

        <section className="dw-metrics" aria-label="مؤشرات الموظفين">
          {metrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
                <metric.icon size={19} />
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel number="01" title="توزيع الأقسام" subtitle="حجم كل قسم من إجمالي القوى العاملة" className="wk-panel-side">
            {isLoading ? (
              <PageLoading />
            ) : departmentRows.length === 0 ? (
              <PageEmpty icon={Building2} message="لم تُسجل أقسام بعد" />
            ) : (
              <div className="wk-legend">
                {departmentRows.map(row => (
                  <div key={row.label} className="wk-legend-row">
                    <i style={{ background: '#7c9e65' }} />
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <small>{Math.round(row.percent)}%</small>
                  </div>
                ))}
              </div>
            )}
            <div className="dw-panel-foot">
              <Users size={14} />
              <span>اختر موظفاً من السجل لعرض ملفه الكامل ورواتبَه وصلاحياته.</span>
            </div>
          </PagePanel>

          <PagePanel
            number="02"
            title="سجل الموظفين"
            subtitle="بحث وتصفية وفتح ملف أي موظف"
            className="wk-panel-main"
          >
            <div className="wk-toolbar">
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 200 }}
                    placeholder="ابحث بالاسم أو الرقم أو البريد…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="بحث في الموظفين"
                  />
                </div>
                <button
                  className="dw-button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedfilters)}
                  aria-expanded={showAdvancedfilters}
                >
                  <Filter size={15} />
                  فلاتر متقدمة
                  {showAdvancedfilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              <div className="dw-filters" role="group" aria-label="تصفية حالة الموظف">
                {([
                  { value: 'all', label: 'الكل' },
                  { value: 'active', label: 'نشط' },
                  { value: 'inactive', label: 'غير نشط' },
                ] as const).map(chip => (
                  <button key={chip.value} aria-pressed={statusFilter === chip.value} onClick={() => setStatusFilter(chip.value)}>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            {showAdvancedfilters && (
              <div className="wk-toolbar" style={{ borderBottom: 'none', paddingBottom: 0, paddingTop: 12 }}>
                <div className="wk-toolbar-group" style={{ flex: 1 }}>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="wk-field" style={{ minWidth: 170 }} aria-label="تصفية بالقسم">
                      <SelectValue placeholder="جميع الأقسام" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع الأقسام</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterContractType} onValueChange={setFilterContractType}>
                    <SelectTrigger className="wk-field" style={{ minWidth: 170 }} aria-label="تصفية بنوع العقد">
                      <SelectValue placeholder="جميع العقود" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع العقود</SelectItem>
                      <SelectItem value="full_time">دوام كامل</SelectItem>
                      <SelectItem value="part_time">دوام جزئي</SelectItem>
                      <SelectItem value="contract">عقد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {isLoading ? (
              <PageLoading />
            ) : visibleEmployees.length === 0 ? (
              <PageEmpty icon={Users} message={employees?.length ? 'لا يوجد موظفون مطابقون لبحثك' : 'لا يوجد موظفون مسجلون'}>
                {!employees?.length && (
                  <button className="dw-button" onClick={() => setIsDialogOpen(true)}>
                    <Plus size={16} />
                    إضافة أول موظف
                  </button>
                )}
              </PageEmpty>
            ) : (
              <>
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">سجل الموظفين</caption>
                    <thead>
                      <tr>
                        <th scope="col">الموظف</th>
                        <th scope="col">المنصب / القسم</th>
                        <th scope="col">الراتب الأساسي</th>
                        <th scope="col">البدلات</th>
                        <th scope="col">الحالة</th>
                        <th scope="col"><span className="sr-only">إجراءات</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/hr/employees/${employee.id}`)}
                        >
                          <td>
                            <strong>
                              <bdi>{employee.first_name} {employee.last_name}</bdi>
                            </strong>
                            <span>رقم الموظف: {employee.employee_number}</span>
                          </td>
                          <td>
                            {employee.position || 'غير محدد'}
                            <span>{employee.department || 'غير محدد'}</span>
                          </td>
                          <td>{formatCurrency(employee.basic_salary)}</td>
                          <td>{formatCurrency(employee.allowances)}</td>
                          <td>
                            <span className={`wk-badge ${employee.is_active ? 'is-ok' : 'is-neutral'}`}>
                              {employee.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                          <td>
                            <div className="wk-actions">
                              <button
                                type="button"
                                className="wk-action"
                                title="عرض الرواتب"
                                aria-label={`عرض رواتب ${employee.first_name} ${employee.last_name}`}
                                onClick={(e) => { e.stopPropagation(); handleViewPayroll(employee); }}
                              >
                                <DollarSign size={15} />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="wk-action"
                                  title="تعديل البيانات"
                                  aria-label={`تعديل بيانات ${employee.first_name} ${employee.last_name}`}
                                  disabled={updateEmployeeMutation.isPending}
                                  onClick={(e) => { e.stopPropagation(); handleEditEmployee(employee); }}
                                >
                                  <Edit size={15} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="wk-action"
                                  title="حذف الموظف"
                                  aria-label={`حذف ${employee.first_name} ${employee.last_name}`}
                                  disabled={deleteEmployeeMutation.isPending}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(employee); }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEmployees.length > visibleEmployees.length && (
                  <p className="wk-more-note">+{filteredEmployees.length - visibleEmployees.length} موظف آخر — استخدم البحث أو الفلاتر لتضييق النتائج</p>
                )}
              </>
            )}
          </PagePanel>

          <PagePanel
            number="03"
            title="صلاحيات تسجيل الحضور"
            subtitle="التحكم بصلاحيات تسجيل الحضور والانصراف للموظفين"
            className="wk-panel-full"
          >
            <div style={{ padding: '0 24px 20px' }}>
              <AttendancePermissionsPanel />
            </div>
          </PagePanel>
        </div>

        <section className="dw-shortcuts" aria-labelledby="hr-employees-shortcuts-title">
          <div className="dw-shortcut-heading">
            <div className="dw-eyebrow">مساحات العمل</div>
            <h2 id="hr-employees-shortcuts-title">انتقل إلى التفاصيل</h2>
            <p>أدوات الموارد البشرية اليومية، في مكان واحد.</p>
          </div>
          <div className="dw-shortcut-grid">
            {[
              { label: 'الحضور والانصراف', detail: 'متابعة يومية للحضور والتأخير', icon: UserCheck, path: '/hr/attendance' },
              { label: 'الرواتب', detail: 'سجلات الرواتب والمراجعات', icon: DollarSign, path: '/hr/payroll' },
              { label: 'الإجازات', detail: 'طلبات الإجازات والموافقات', icon: CalendarDays, path: '/hr/leave' },
              { label: 'إدارة المهام', detail: 'تنسيق العمل وتوزيع المسؤوليات', icon: Users, path: '/tasks' },
            ].map((item) => (
              <Link key={item.path} to={item.path}>
                <item.icon size={23} />
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> إدارة الموظفين
          </span>
          <span role="status">
            {refreshing ? 'جاري تحديث البيانات…' : `آخر تحديث ${new Date(refreshedAt).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </footer>
      </div>

      {/* نموذج إضافة موظف جديد - الموحد */}
      <UnifiedEmployeeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddEmployee}
        isLoading={addEmployeeMutation.isPending || isCreatingAccount}
        mode="create"
      />

      {/* نموذج تعديل موظف - الموحد */}
      <UnifiedEmployeeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdateEmployee}
        isLoading={updateEmployeeMutation.isPending}
        mode="edit"
        employee={selectedEmployee}
      />

      <DeleteEmployeeConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteEmployeeMutation.isPending}
        employeeName={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
      />

      <AccountCreatedDialog
        open={showAccountDialog}
        onOpenChange={setShowAccountDialog}
        accountData={accountData}
      />

      {selectedEmployeeForPayroll && (
        <EmployeePayrollDetails
          employee={selectedEmployeeForPayroll}
          open={showPayrollDialog}
          onOpenChange={setShowPayrollDialog}
          onCreatePayroll={handleCreatePayroll}
          isCreatingPayroll={createPayrollMutation.isPending}
        />
      )}
    <PageHelp title="مساعدة" description="إدارة الموظفين">
      <EmployeesPageHelpContent />
    </PageHelp>

    </div>
  );
}
