import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Printer,
  Mail,
  Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ContractExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContractExportDialog: React.FC<ContractExportDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { user } = useAuth();
  const [exportType, setExportType] = React.useState('pdf');
  const [dateRange, setDateRange] = React.useState('all');
  const { formatCurrency, currency } = useCurrencyFormatter();
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  const [contractStatus, setContractStatus] = React.useState('all');
  const [contractType, setContractType] = React.useState('all');
  const [includeCustomer, setIncludeCustomer] = React.useState(true);
  const [includeFinancial, setIncludeFinancial] = React.useState(true);
  const [includeVehicle, setIncludeVehicle] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  // Fetch contracts for export
  const { data: contracts, error, isLoading } = useQuery({
    queryKey: ['contracts-export', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      
      let query = supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(first_name, last_name, company_name, customer_type, phone, email),
          vehicle:vehicles(plate_number, make, model, year),
          cost_center:cost_centers(center_name, center_code)
        `)
        .eq('company_id', user.profile.company_id);

      // Apply filters
      if (contractStatus !== 'all') {
        query = query.eq('status', contractStatus);
      }
      
      if (contractType !== 'all') {
        query = query.eq('contract_type', contractType);
      }

      // Apply date range filter
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        query = query.gte('contract_date', customStartDate).lte('contract_date', customEndDate);
      } else if (dateRange === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        query = query.gte('contract_date', startOfMonth.toISOString().split('T')[0]);
      } else if (dateRange === 'year') {
        const startOfYear = new Date();
        startOfYear.setMonth(0, 1);
        query = query.gte('contract_date', startOfYear.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('contract_date', { ascending: false });
      
      if (error) {
        console.error('Contract export query error:', error);
        throw error;
      }
      
      console.log('Fetched contracts for export:', data?.length || 0);
      return data || [];
    },
    enabled: !!user?.profile?.company_id && open
  });

  // Error handling for contract fetching
  React.useEffect(() => {
    if (error) {
      console.error('Contract export error:', error);
      toast.error('حدث خطأ أثناء جلب بيانات العقود: ' + error.message);
    }
  }, [error]);

  const generatePDF = () => {
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير العقود</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير العقود</h1>
            <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</p>
            <p>عدد العقود: ${contracts.length}</p>
          </div>
          
          <div class="summary">
            <h3>ملخص العقود</h3>
            <p>العقود النشطة: ${contracts.filter(c => c.status === 'active').length}</p>
            <p>العقود المنتهية: ${contracts.filter(c => c.status === 'expired').length}</p>
            <p>إجمالي القيمة: ${formatCurrency(contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0), { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>رقم العقد</th>
                <th>نوع العقد</th>
                <th>الحالة</th>
                ${includeCustomer ? '<th>العميل</th>' : ''}
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                ${includeFinancial ? `<th>المبلغ (${currency})</th>` : ''}
                ${includeVehicle ? '<th>المركبة</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${contracts.map(contract => `
                <tr>
                  <td>${contract.contract_number || 'غير محدد'}</td>
                  <td>${contract.contract_type === 'rental' ? 'إيجار' : 
                       contract.contract_type === 'service' ? 'خدمة' : 
                       contract.contract_type === 'maintenance' ? 'صيانة' : 'مبيعات'}</td>
                  <td>${contract.status === 'active' ? 'نشط' :
                       contract.status === 'draft' ? 'مسودة' :
                       contract.status === 'expired' ? 'منتهي' :
                       contract.status === 'suspended' ? 'معلق' :
                       contract.status === 'cancelled' ? 'ملغي' : contract.status}</td>
                  ${includeCustomer ? `<td>${(contract.customer as any)?.customer_type === 'individual' 
                    ? `${(contract.customer as any)?.first_name || ''} ${(contract.customer as any)?.last_name || ''}`.trim() || (contract.customer as any)?.company_name || 'غير محدد'
                    : (contract.customer as any)?.company_name || 'غير محدد'}</td>` : ''}
                  <td>${contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : 'غير محدد'}</td>
                  <td>${contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB') : 'غير محدد'}</td>
                  ${includeFinancial ? `<td>${formatCurrency(contract.contract_amount || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>` : ''}
                  ${includeVehicle ? `<td>${(contract.vehicle as any)?.plate_number || 'لا يوجد'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Create and download PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير PDF');
    }
  };

  const generateExcel = () => {
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    try {
      // Create CSV data
      const headers = [
        'رقم العقد',
        'نوع العقد', 
        'الحالة',
        ...(includeCustomer ? ['العميل'] : []),
        'تاريخ البداية',
        'تاريخ النهاية',
        ...(includeFinancial ? [`المبلغ (${currency})`, `المبلغ الشهري (${currency})`] : []),
        ...(includeVehicle ? ['رقم اللوحة'] : [])
      ];

      const csvData = contracts.map(contract => [
        contract.contract_number || 'غير محدد',
        contract.contract_type === 'rental' ? 'إيجار' : 
        contract.contract_type === 'service' ? 'خدمة' : 
        contract.contract_type === 'maintenance' ? 'صيانة' : 'مبيعات',
        contract.status === 'active' ? 'نشط' :
        contract.status === 'draft' ? 'مسودة' :
        contract.status === 'expired' ? 'منتهي' :
        contract.status === 'suspended' ? 'معلق' :
        contract.status === 'cancelled' ? 'ملغي' : contract.status,
        ...(includeCustomer ? [
          (contract.customer as any)?.customer_type === 'individual' 
            ? `${(contract.customer as any)?.first_name || ''} ${(contract.customer as any)?.last_name || ''}`.trim() || (contract.customer as any)?.company_name || 'غير محدد'
            : (contract.customer as any)?.company_name || 'غير محدد'
        ] : []),
        contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : 'غير محدد',
        contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB') : 'غير محدد',
        ...(includeFinancial ? [
          formatCurrency(contract.contract_amount || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
          formatCurrency(contract.monthly_amount || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
        ] : []),
        ...(includeVehicle ? [(contract.vehicle as any)?.plate_number || 'لا يوجد'] : [])
      ]);

      // Create CSV content
      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Add BOM for Arabic support in Excel
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contracts_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Excel generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير Excel');
    }
  };

  const handleExport = async () => {
    if (isLoading) {
      toast.error('جاري تحميل البيانات...');
      return;
    }
    
    if (error) {
      toast.error('حدث خطأ في تحميل البيانات');
      return;
    }
    
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    setIsExporting(true);
    
    try {
      if (exportType === 'pdf') {
        generatePDF();
      } else if (exportType === 'excel') {
        generateExcel();
      }
      
      toast.success('تم تصدير التقرير بنجاح');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير تقرير العقود
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نوع التصدير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer ${exportType === 'pdf' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                  onClick={() => setExportType('pdf')}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6" />
                    <div>
                      <p className="font-medium">PDF</p>
                      <p className="text-sm text-muted-foreground">تقرير قابل للطباعة</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer ${exportType === 'excel' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                  onClick={() => setExportType('excel')}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6" />
                    <div>
                      <p className="font-medium">Excel/CSV</p>
                      <p className="text-sm text-muted-foreground">جدول بيانات</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">فلاتر التصدير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نطاق التاريخ</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع التواريخ</SelectItem>
                      <SelectItem value="month">هذا الشهر</SelectItem>
                      <SelectItem value="year">هذا العام</SelectItem>
                      <SelectItem value="custom">تاريخ مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حالة العقد</Label>
                  <Select value={contractStatus} onValueChange={setContractStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="expired">منتهي</SelectItem>
                      <SelectItem value="suspended">معلق</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>من تاريخ</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>إلى تاريخ</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>نوع العقد</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="rental">إيجار</SelectItem>
                    <SelectItem value="service">خدمة</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="sales">مبيعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Include Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">البيانات المضمنة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCustomer"
                    checked={includeCustomer}
                    onCheckedChange={(checked) => setIncludeCustomer(checked === true)}
                  />
                  <Label htmlFor="includeCustomer" className="mr-2">معلومات العميل</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeFinancial"
                    checked={includeFinancial}
                    onCheckedChange={(checked) => setIncludeFinancial(checked === true)}
                  />
                  <Label htmlFor="includeFinancial" className="mr-2">البيانات المالية</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeVehicle"
                    checked={includeVehicle}
                    onCheckedChange={(checked) => setIncludeVehicle(checked === true)}
                  />
                  <Label htmlFor="includeVehicle" className="mr-2">معلومات المركبة</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {contracts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص التصدير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">عدد العقود:</span>
                    <span className="font-medium mr-2">{contracts.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">إجمالي القيمة:</span>
                    <span className="font-medium mr-2">
                      {formatCurrency(contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0), { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-4">
                <p className="text-destructive text-sm">
                  حدث خطأ أثناء تحميل البيانات: {error.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || isLoading || !contracts?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'جاري التصدير...' : isLoading ? 'جاري التحميل...' : 'تصدير'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};