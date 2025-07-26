import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EmployeeDialog from '@/components/hr/EmployeeDialog';
import EditEmployeeDialog from '@/components/hr/EditEmployeeDialog';
import DeleteEmployeeConfirmDialog from '@/components/hr/DeleteEmployeeConfirmDialog';
import AccountCreatedDialog from '@/components/hr/AccountCreatedDialog';
import EmployeePayrollDetails from '@/components/hr/EmployeePayrollDetails';
import { EmployeeFormData } from '@/components/hr/EmployeeForm';
import { AttendancePermissionsPanel } from '@/components/hr/AttendancePermissionsPanel';
import { useCreatePayroll, CreatePayrollData } from '@/hooks/usePayroll';

interface Employee {
  id: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Payroll mutations
  const createPayrollMutation = useCreatePayroll();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Employee[];
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      // Get current user company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Check for duplicate employee number among active employees
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', profile.company_id)
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
          .eq('company_id', profile.company_id)
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
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return { employee, employeeData };
    },
    onSuccess: async ({ employee, employeeData }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
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
            employee_name: `${employee.first_name} ${employee.last_name}`,
            employee_email: employeeData.accountEmail,
            roles: employeeData.accountRoles,
            requester_name: user.email || 'مدير النظام',
            notes: employeeData.accountNotes,
            user_id: user.id,
            company_id: employee.company_id
          }
        });

        if (error) throw error;
        if (!result?.success) throw new Error(result?.error || 'فشل في إنشاء الحساب');

        // Show account details dialog
        setAccountData({
          employee_name: `${employee.first_name} ${employee.last_name}`,
          employee_email: employeeData.accountEmail,
          temporary_password: result.temporary_password,
          password_expires_at: result.password_expires_at
        });
        setShowAccountDialog(true);
        setIsDialogOpen(false);

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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'تم إضافة الموظف لكن فشل إنشاء الحساب',
        description: error.message || 'حدث خطأ أثناء إنشاء حساب المستخدم',
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Check for duplicate employee number among active employees (excluding current employee)
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', profile.company_id)
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
          .eq('company_id', profile.company_id)
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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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

  const filteredEmployees = employees?.filter(employee =>
    employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الموظفين</h1>
            <p className="text-muted-foreground">إدارة بيانات الموظفين والمناصب</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة موظف جديد
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Attendance Permissions Panel */}
      <AttendancePermissionsPanel />

      <div className="grid gap-4">
        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد موظفين مسجلين</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة أول موظف
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-muted-foreground">رقم الموظف: {employee.employee_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {employee.position || 'غير محدد'}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {employee.department || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                      <p className="font-semibold">
                        {formatCurrency(employee.basic_salary)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">البدلات</p>
                      <p className="font-semibold">
                        {formatCurrency(employee.allowances)}
                      </p>
                    </div>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPayroll(employee)}
                        title="عرض الرواتب"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                        disabled={updateEmployeeMutation.isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee)}
                        disabled={deleteEmployeeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EmployeeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddEmployee}
        isLoading={addEmployeeMutation.isPending || isCreatingAccount}
      />

      <EditEmployeeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdateEmployee}
        isLoading={updateEmployeeMutation.isPending}
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
    </div>
  );
}