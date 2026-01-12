import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  DollarSign, 
  Edit, 
  Trash2, 
  Clock,
  CreditCard,
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { UnifiedEmployeeDialog } from '@/components/hr/UnifiedEmployeeDialog';
import DeleteEmployeeConfirmDialog from '@/components/hr/DeleteEmployeeConfirmDialog';
import EmployeePayrollDetails from '@/components/hr/EmployeePayrollDetails';
import { useCreatePayroll, CreatePayrollData } from '@/hooks/usePayroll';
import { useCompanyFilter } from '@/hooks/useUnifiedCompanyAccess';

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
  national_id?: string;
  address?: string;
  address_ar?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account?: string;
  iban?: string;
  notes?: string;
  created_at?: string;
}

export default function EmployeeDetails() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const { hasPermission } = useRolePermissions();
  const companyFilter = useCompanyFilter();
  const createPayrollMutation = useCreatePayroll();

  const canEdit = hasPermission('edit_employees');
  const canDelete = hasPermission('delete_employees');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);

  // Fetch employee details
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error) throw error;
      return data as Employee;
    },
    enabled: !!employeeId,
  });

  // Fetch attendance records
  const { data: attendanceRecords } = useQuery({
    queryKey: ['employee-attendance', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('attendance_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  // Delete mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error('Employee ID is required');
      
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'تم حذف الموظف بنجاح',
        description: 'تم إلغاء تفعيل الموظف من النظام',
      });
      navigate('/hr/employees');
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ في حذف الموظف',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreatePayroll = (data: CreatePayrollData) => {
    createPayrollMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6" dir="rtl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded-3xl"></div>
          <div className="h-48 bg-muted rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6" dir="rtl">
        <Card className="bg-white/80 backdrop-blur-xl border border-red-200 rounded-3xl">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">لم يتم العثور على الموظف</h2>
            <p className="text-slate-600 mb-4">الموظف المطلوب غير موجود أو تم حذفه</p>
            <Button onClick={() => navigate('/hr/employees')} className="bg-gradient-to-r from-teal-500 to-teal-600">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = employee.first_name_ar && employee.last_name_ar 
    ? `${employee.first_name_ar} ${employee.last_name_ar}`
    : `${employee.first_name} ${employee.last_name}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/hr/employees')}
            className="rounded-xl hover:bg-slate-100"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {employee.employee_number}
                </Badge>
                <Badge 
                  variant={employee.is_active ? "default" : "secondary"}
                  className={employee.is_active ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white" : ""}
                >
                  {employee.is_active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPayrollDialog(true)}
            className="border-slate-200/50 hover:border-teal-500/30"
          >
            <DollarSign className="w-4 h-4 ml-2" />
            الرواتب
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="border-slate-200/50 hover:border-teal-500/30"
            >
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-1">
          <TabsTrigger value="info" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
            <User className="w-4 h-4 ml-2" />
            المعلومات الأساسية
          </TabsTrigger>
          <TabsTrigger value="salary" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
            <DollarSign className="w-4 h-4 ml-2" />
            الراتب والبدلات
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
            <Clock className="w-4 h-4 ml-2" />
            الحضور
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4 ml-2" />
            المستندات
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-teal-600" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="الاسم الكامل" value={fullName} />
                <InfoRow label="الاسم بالإنجليزية" value={`${employee.first_name} ${employee.last_name}`} />
                <InfoRow label="رقم الموظف" value={employee.employee_number} />
                <InfoRow label="الرقم الوطني" value={employee.national_id || 'غير محدد'} />
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="w-5 h-5 text-teal-600" />
                  معلومات الاتصال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow 
                  label="البريد الإلكتروني" 
                  value={employee.email || 'غير محدد'} 
                  icon={<Mail className="w-4 h-4" />}
                />
                <InfoRow 
                  label="رقم الهاتف" 
                  value={employee.phone || 'غير محدد'} 
                  icon={<Phone className="w-4 h-4" />}
                />
                <InfoRow label="العنوان" value={employee.address_ar || employee.address || 'غير محدد'} />
                <InfoRow label="جهة اتصال الطوارئ" value={employee.emergency_contact_name || 'غير محدد'} />
                <InfoRow label="هاتف الطوارئ" value={employee.emergency_contact_phone || 'غير محدد'} />
              </CardContent>
            </Card>

            {/* Work Info */}
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  معلومات العمل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="المنصب" value={employee.position_ar || employee.position || 'غير محدد'} />
                <InfoRow label="القسم" value={employee.department_ar || employee.department || 'غير محدد'} />
                <InfoRow 
                  label="تاريخ التعيين" 
                  value={employee.hire_date ? format(new Date(employee.hire_date), 'PPP', { locale: ar }) : 'غير محدد'} 
                  icon={<Calendar className="w-4 h-4" />}
                />
              </CardContent>
            </Card>

            {/* Bank Info */}
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  المعلومات البنكية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="رقم الحساب البنكي" value={employee.bank_account || 'غير محدد'} />
                <InfoRow label="رقم IBAN" value={employee.iban || 'غير محدد'} />
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {employee.notes && (
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-teal-600" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{employee.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-3xl">
              <CardContent className="p-6">
                <p className="text-teal-100 text-sm">الراتب الأساسي</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(employee.basic_salary)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl">
              <CardContent className="p-6">
                <p className="text-blue-100 text-sm">البدلات</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(employee.allowances)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-3xl">
              <CardContent className="p-6">
                <p className="text-emerald-100 text-sm">إجمالي الراتب</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(employee.basic_salary + employee.allowances)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
            <CardContent className="p-6">
              <Button 
                onClick={() => setShowPayrollDialog(true)}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                <DollarSign className="w-4 h-4 ml-2" />
                عرض تفاصيل الرواتب والمستحقات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-teal-600" />
                سجل الحضور الأخير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {attendanceRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {format(new Date(record.attendance_date), 'EEEE, d MMMM yyyy', { locale: ar })}
                          </p>
                          <p className="text-sm text-slate-600">
                            الحضور: {record.check_in_time || '--:--'} | الانصراف: {record.check_out_time || '--:--'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                        {record.status === 'present' ? 'حاضر' : record.status === 'absent' ? 'غائب' : record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">لا توجد سجلات حضور</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">لا توجد مستندات مرفقة</p>
              <Button variant="outline" className="mt-4">
                إضافة مستند
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UnifiedEmployeeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={(data) => {
          // Handle update through mutation
          queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          setIsEditDialogOpen(false);
        }}
        isLoading={false}
        mode="edit"
        employee={employee}
      />

      <DeleteEmployeeConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => deleteEmployeeMutation.mutate()}
        isLoading={deleteEmployeeMutation.isPending}
        employeeName={fullName}
      />

      {employee && (
        <EmployeePayrollDetails
          employee={employee}
          open={showPayrollDialog}
          onOpenChange={setShowPayrollDialog}
          onCreatePayroll={handleCreatePayroll}
          isCreatingPayroll={createPayrollMutation.isPending}
        />
      )}
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
