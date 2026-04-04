import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Users, DollarSign, UserCheck, UserX, Building2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterContractType, setFilterContractType] = useState<string>('');
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

        // Show account details dialog
        console.log('[ACCOUNT_CREATED_WHATSAPP] accountData (Employees createUserAccount):', {
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_email: employeeData.accountEmail,
          temporary_password: result.temporary_password || employeeData.accountPassword,
          password_expires_at: result.password_expires_at,
          employee_phone: employee.phone,
          employee_id: employee.id,
        });
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

  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !filterDepartment || employee.department === filterDepartment || employee.department_ar === filterDepartment;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && employee.is_active) ||
      (filterStatus === 'on_leave' && !employee.is_active) ||
      (filterStatus === 'terminated' && !employee.is_active);
    
    return matchesSearch && matchesDepartment && matchesStatus;
  }) || [];

  const departments = [...new Set(employees?.map(e => e.department).filter(Boolean) || [])];
  
  const stats = {
    total: employees?.length || 0,
    active: employees?.filter(e => e.is_active).length || 0,
    onLeave: employees?.filter(e => !e.is_active).length || 0,
    departments: departments.length,
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة الموظفين</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">إدارة بيانات الموظفين والمناصب</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto min-h-[44px] bg-teal-500 hover:bg-teal-600 text-white shadow-sm">
          <Plus className="h-4 w-4 ml-2" />
          إضافة موظف جديد
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">إجمالي الموظفين</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">نشط</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <UserX className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">إجازة</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.onLeave}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">الأقسام</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.departments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedfilters)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">الفلاتر المتقدمة</span>
          </div>
          {showAdvancedfilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showAdvancedfilters && (
          <div className="p-4 pt-0 border-t border-slate-200 dark:border-slate-700 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">القسم</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="min-h-[44px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="جميع الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الأقسام</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">الحالة</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="min-h-[44px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="on_leave">في إجازة</SelectItem>
                  <SelectItem value="terminated">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">نوع العقد</label>
              <Select value={filterContractType} onValueChange={setFilterContractType}>
                <SelectTrigger className="min-h-[44px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
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
      </Card>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>
      </div>

      {/* Attendance Permissions Panel */}
      <AttendancePermissionsPanel />

      <div className="grid gap-4">
        {filteredEmployees.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">لا توجد موظفين مسجلين</p>
                <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white shadow-sm" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة أول موظف
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card 
              key={employee.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/hr/employees/${employee.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">رقم الموظف: {employee.employee_number}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {employee.position || 'غير محدد'}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">•</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {employee.department || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-right sm:text-left flex-1 sm:flex-initial">
                        <p className="text-sm text-slate-600 dark:text-slate-400">الراتب الأساسي</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(employee.basic_salary)}
                        </p>
                      </div>
                      <div className="text-right sm:text-left flex-1 sm:flex-initial">
                        <p className="text-sm text-slate-600 dark:text-slate-400">البدلات</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(employee.allowances)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Badge variant={employee.is_active ? "default" : "secondary"} className={employee.is_active ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}>
                        {employee.is_active ? "نشط" : "غير نشط"}
                      </Badge>
                      <div className="flex gap-2 mr-auto sm:mr-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleViewPayroll(employee); }}
                          title="عرض الرواتب"
                          className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500/50 dark:hover:border-teal-500/50"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleEditEmployee(employee); }}
                            disabled={updateEmployeeMutation.isPending}
                            className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500/50 dark:hover:border-teal-500/50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(employee); }}
                            disabled={deleteEmployeeMutation.isPending}
                            className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-red-500/30 dark:hover:border-red-500/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
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