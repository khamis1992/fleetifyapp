import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReportFiltersProps {
  moduleType: string;
  filters: {
    startDate: string;
    endDate: string;
    companyId: string;
    moduleType: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ReportFilters({ moduleType, filters, onFiltersChange }: ReportFiltersProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      onFiltersChange({
        ...filters,
        startDate: date ? format(date, 'yyyy-MM-dd') : ''
      });
    } else {
      setEndDate(date);
      onFiltersChange({
        ...filters,
        endDate: date ? format(date, 'yyyy-MM-dd') : ''
      });
    }
  };

  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFiltersChange({
      startDate: '',
      endDate: '',
      companyId: '',
      moduleType: moduleType
    });
  };

  const getModuleSpecificFilters = () => {
    switch (moduleType) {
      case 'finance':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-type">نوع الحساب</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assets">الأصول</SelectItem>
                  <SelectItem value="liabilities">الخصوم</SelectItem>
                  <SelectItem value="equity">حقوق الملكية</SelectItem>
                  <SelectItem value="revenue">الإيرادات</SelectItem>
                  <SelectItem value="expenses">المصروفات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost-center">مركز التكلفة</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">المبيعات</SelectItem>
                  <SelectItem value="admin">الإدارة</SelectItem>
                  <SelectItem value="operations">العمليات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'hr':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="department">القسم</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">الموارد البشرية</SelectItem>
                  <SelectItem value="finance">المالية</SelectItem>
                  <SelectItem value="operations">العمليات</SelectItem>
                  <SelectItem value="sales">المبيعات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee-type">نوع الموظف</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الموظف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">دوام كامل</SelectItem>
                  <SelectItem value="part_time">دوام جزئي</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'fleet':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="vehicle-type">نوع المركبة</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">سيدان</SelectItem>
                  <SelectItem value="suv">دفع رباعي</SelectItem>
                  <SelectItem value="truck">شاحنة</SelectItem>
                  <SelectItem value="bus">حافلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="vehicle-status">حالة المركبة</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة المركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">متاحة</SelectItem>
                  <SelectItem value="rented">مؤجرة</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                  <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-type">نوع العميل</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع العميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فردي</SelectItem>
                  <SelectItem value="corporate">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customer-status">حالة العميل</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة العميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="blacklisted">محظور</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="case-type">نوع القضية</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع القضية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civil">مدنية</SelectItem>
                  <SelectItem value="commercial">تجارية</SelectItem>
                  <SelectItem value="labor">عمالية</SelectItem>
                  <SelectItem value="administrative">إدارية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="case-status">حالة القضية</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة القضية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">جارية</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                  <SelectItem value="suspended">معلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية التقارير
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 ml-2" />
            إعادة تعيين
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-4">
          <Label className="text-base font-medium">الفترة الزمنية</Label>
          
          <div className="space-y-2">
            <Label htmlFor="start-date">من تاريخ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => handleDateChange('start', date)}
                  disabled={(date) => date > new Date() || (endDate && date > endDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">إلى تاريخ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => handleDateChange('end', date)}
                  disabled={(date) => date > new Date() || (startDate && date < startDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quick Date Ranges */}
        <div className="space-y-2">
          <Label className="text-base font-medium">فترات سريعة</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                handleDateChange('start', today);
                handleDateChange('end', today);
              }}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                handleDateChange('start', weekAgo);
                handleDateChange('end', today);
              }}
            >
              آخر أسبوع
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                handleDateChange('start', monthAgo);
                handleDateChange('end', today);
              }}
            >
              آخر شهر
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                handleDateChange('start', yearAgo);
                handleDateChange('end', today);
              }}
            >
              آخر سنة
            </Button>
          </div>
        </div>

        {/* Module Specific Filters */}
        {getModuleSpecificFilters()}

        {/* Apply Filters Button */}
        <Button className="w-full">
          تطبيق الفلاتر
        </Button>
      </CardContent>
    </Card>
  );
}