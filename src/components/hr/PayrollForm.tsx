import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, Calculator, Settings } from 'lucide-react';
import { CreatePayrollData } from '@/hooks/usePayroll';
import { useHRSettings } from '@/hooks/useHRSettings';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  position?: string;
  department?: string;
  basic_salary: number;
  allowances: number;
  bank_account?: string;
  iban?: string;
}

interface PayrollFormProps {
  employees: Employee[];
  onSubmit: (data: CreatePayrollData) => void;
  isLoading?: boolean;
  selectedEmployeeId?: string;
  initialData?: CreatePayrollData;
}

export default function PayrollForm({ 
  employees, 
  onSubmit, 
  isLoading, 
  selectedEmployeeId,
  initialData 
}: PayrollFormProps) {
const { settings: hrSettings } = useHRSettings();
  
   const { formatCurrency } = useCurrencyFormatter();
  
  const [formData, setFormData] = useState<CreatePayrollData>(
    initialData || {
      employee_id: selectedEmployeeId || '',
      pay_period_start: '',
      pay_period_end: '',
      basic_salary: 0,
      allowances: 0,
      overtime_hours: 0,
      overtime_rate: 0,
      deductions: 0,
      tax_amount: 0,
      payment_method: 'bank_transfer',
      bank_account: '',
      notes: '',
    }
  );

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find(emp => emp.id === selectedEmployeeId);
      if (employee) {
        setSelectedEmployee(employee);
        setFormData(prev => ({
          ...prev,
          employee_id: employee.id,
          basic_salary: employee.basic_salary,
          allowances: employee.allowances || 0,
          bank_account: employee.iban || employee.bank_account || '',
        }));
      }
    }
  }, [selectedEmployeeId, employees]);

  // Update overtime rate and calculate tax when HR settings change
  useEffect(() => {
    if (hrSettings && !initialData) {
      setFormData(prev => ({
        ...prev,
        overtime_rate: calculateOvertimeRate(prev.basic_salary, hrSettings.overtime_rate_percentage || 150),
      }));
    }
  }, [hrSettings, initialData]);

  // Calculate overtime rate based on HR settings
  const calculateOvertimeRate = (basicSalary: number, overtimePercentage: number) => {
    if (!hrSettings || !basicSalary) return 0;
    const dailyRate = basicSalary / (hrSettings.working_days_per_week * 4.33); // Monthly to daily
    const hourlyRate = dailyRate / hrSettings.daily_working_hours;
    return hourlyRate * (overtimePercentage / 100);
  };

  // Auto-calculate tax and social security
  const calculateTaxAndDeductions = (grossAmount: number) => {
    if (!hrSettings) return { tax: 0, socialSecurity: 0 };
    
    const taxAmount = grossAmount * (hrSettings.tax_rate / 100);
    const socialSecurityAmount = grossAmount * (hrSettings.social_security_rate / 100);
    
    return {
      tax: taxAmount,
      socialSecurity: socialSecurityAmount
    };
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      const newOvertimeRate = calculateOvertimeRate(employee.basic_salary, hrSettings?.overtime_rate_percentage || 150);
      setFormData(prev => ({
        ...prev,
        employee_id: employee.id,
        basic_salary: employee.basic_salary,
        allowances: employee.allowances || 0,
        bank_account: employee.iban || employee.bank_account || '',
        overtime_rate: newOvertimeRate,
      }));
    }
  };

  const calculateTotals = () => {
    const overtime_amount = (formData.overtime_hours || 0) * (formData.overtime_rate || 0);
    const gross_amount = formData.basic_salary + (formData.allowances || 0) + overtime_amount;
    
    // Auto-calculate tax and social security if HR settings exist
    const { tax, socialSecurity } = calculateTaxAndDeductions(gross_amount);
    const auto_tax = hrSettings?.tax_rate ? tax : (formData.tax_amount || 0);
    const auto_social_security = hrSettings?.social_security_rate ? socialSecurity : 0;
    
    const total_deductions = (formData.deductions || 0) + auto_tax + auto_social_security;
    const net_amount = gross_amount - total_deductions;

    return {
      overtime_amount,
      gross_amount,
      total_deductions,
      net_amount,
      auto_tax,
      auto_social_security,
    };
  };

  const { overtime_amount, gross_amount, total_deductions, net_amount, auto_tax, auto_social_security } = calculateTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            معلومات الموظف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="employee_id">الموظف *</Label>
            <Select 
              value={formData.employee_id} 
              onValueChange={handleEmployeeChange}
              disabled={!!selectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الموظف" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} - {employee.employee_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployee && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">تفاصيل الموظف:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>المنصب: {selectedEmployee.position || 'غير محدد'}</div>
                <div>القسم: {selectedEmployee.department || 'غير محدد'}</div>
                <div>الراتب الأساسي: {formatCurrency(selectedEmployee.basic_salary)}</div>
                <div>البدلات: {formatCurrency(selectedEmployee.allowances || 0)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            فترة الراتب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pay_period_start">بداية الفترة *</Label>
              <Input
                id="pay_period_start"
                type="date"
                value={formData.pay_period_start}
                onChange={(e) => setFormData(prev => ({ ...prev, pay_period_start: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="pay_period_end">نهاية الفترة *</Label>
              <Input
                id="pay_period_end"
                type="date"
                value={formData.pay_period_end}
                onChange={(e) => setFormData(prev => ({ ...prev, pay_period_end: e.target.value }))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            تفاصيل الراتب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basic_salary">الراتب الأساسي *</Label>
              <Input
                id="basic_salary"
                type="number"
                step="0.001"
                min="0"
                value={formData.basic_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, basic_salary: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="allowances">البدلات</Label>
              <Input
                id="allowances"
                type="number"
                step="0.001"
                min="0"
                value={formData.allowances}
                onChange={(e) => setFormData(prev => ({ ...prev, allowances: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="overtime_hours">ساعات إضافية</Label>
              <Input
                id="overtime_hours"
                type="number"
                step="0.1"
                min="0"
                value={formData.overtime_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, overtime_hours: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="overtime_rate" className="flex items-center gap-2">
                سعر الساعة الإضافية
                {hrSettings?.overtime_rate_percentage && (
                  <span className="text-xs text-muted-foreground">
                    (تلقائي: {hrSettings.overtime_rate_percentage}%)
                  </span>
                )}
              </Label>
              <Input
                id="overtime_rate"
                type="number"
                step="0.001"
                min="0"
                value={formData.overtime_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, overtime_rate: parseFloat(e.target.value) || 0 }))}
                placeholder={hrSettings ? 'محسوب تلقائياً' : 'أدخل سعر الساعة'}
              />
            </div>
            <div>
              <Label htmlFor="deductions">الخصومات</Label>
              <Input
                id="deductions"
                type="number"
                step="0.001"
                min="0"
                value={formData.deductions}
                onChange={(e) => setFormData(prev => ({ ...prev, deductions: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="tax_amount" className="flex items-center gap-2">
                الضريبة
                {hrSettings?.tax_rate && (
                  <span className="text-xs text-muted-foreground">
                    (معدل: {hrSettings.tax_rate}%)
                  </span>
                )}
              </Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.001"
                min="0"
                value={hrSettings?.tax_rate ? auto_tax : formData.tax_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: parseFloat(e.target.value) || 0 }))}
                disabled={!!hrSettings?.tax_rate}
                placeholder={hrSettings?.tax_rate ? 'محسوب تلقائياً' : 'أدخل مبلغ الضريبة'}
              />
            </div>
          </div>

          {/* HR Settings Integration Info */}
          {hrSettings && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                <Settings className="h-4 w-4" />
                إعدادات الموارد البشرية المطبقة
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
                <div>معدل الوقت الإضافي: {hrSettings.overtime_rate_percentage}%</div>
                <div>معدل الضريبة: {hrSettings.tax_rate}%</div>
                <div>معدل التأمينات: {hrSettings.social_security_rate}%</div>
                <div>تكرار الراتب: {hrSettings.payroll_frequency === 'monthly' ? 'شهري' : hrSettings.payroll_frequency}</div>
              </div>
            </div>
          )}

          {/* Calculations Summary */}
          <div className="bg-primary/5 p-4 rounded-lg border">
            <h4 className="font-medium mb-3">ملخص الحسابات:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>الراتب الأساسي:</span>
                <span>{formatCurrency(formData.basic_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span>البدلات:</span>
                <span>{formatCurrency(formData.allowances || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>الساعات الإضافية:</span>
                <span>{formatCurrency(overtime_amount)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>إجمالي المستحقات:</span>
                <span className="text-green-600">{formatCurrency(gross_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>الخصومات:</span>
                <span className="text-red-600">-{formatCurrency(formData.deductions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>الضريبة:</span>
                <span className="text-red-600">-{formatCurrency(hrSettings?.tax_rate ? auto_tax : (formData.tax_amount || 0))}</span>
              </div>
              {hrSettings?.social_security_rate && auto_social_security > 0 && (
                <div className="flex justify-between">
                  <span>التأمينات الاجتماعية:</span>
                  <span className="text-red-600">-{formatCurrency(auto_social_security)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 text-lg">
                <span>صافي الراتب:</span>
                <span className="text-primary">{formatCurrency(net_amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الدفع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment_method">طريقة الدفع *</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_method === 'bank_transfer' && (
            <div>
              <Label htmlFor="bank_account">الحساب البنكي</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                placeholder="رقم الحساب أو IBAN"
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات إضافية..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.employee_id || !formData.pay_period_start || !formData.pay_period_end}
          className="flex-1"
        >
          {isLoading ? 'جارٍ الحفظ...' : 'حفظ الراتب'}
        </Button>
      </div>
    </form>
  );
}