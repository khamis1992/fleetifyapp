import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Printer, 
  Filter, 
  Car, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { TrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface TrafficViolationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: TrafficViolation[];
}

interface ReportFilters {
  onlyLinkedToVehicles: boolean;
  startDate: string;
  endDate: string;
  paymentStatus: 'all' | 'paid' | 'unpaid' | 'partially_paid';
  status: 'all' | 'pending' | 'confirmed' | 'cancelled';
}

export const TrafficViolationReportDialog: React.FC<TrafficViolationReportDialogProps> = ({
  open,
  onOpenChange,
  violations,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  const [filters, setFilters] = useState<ReportFilters>({
    onlyLinkedToVehicles: true,
    startDate: '',
    endDate: '',
    paymentStatus: 'all',
    status: 'all',
  });

  // تصفية المخالفات بناءً على الخيارات المحددة
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      // فلتر المخالفات المرتبطة بمركبات فقط
      if (filters.onlyLinkedToVehicles && !v.vehicle_id && !v.vehicles) {
        return false;
      }

      // فلتر التاريخ
      if (filters.startDate && v.penalty_date < filters.startDate) {
        return false;
      }
      if (filters.endDate && v.penalty_date > filters.endDate) {
        return false;
      }

      // فلتر حالة الدفع
      if (filters.paymentStatus !== 'all' && v.payment_status !== filters.paymentStatus) {
        return false;
      }

      // فلتر الحالة
      if (filters.status !== 'all' && v.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [violations, filters]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const total = filteredViolations.length;
    const totalAmount = filteredViolations.reduce((sum, v) => sum + (v.amount || 0), 0);
    const paidCount = filteredViolations.filter(v => v.payment_status === 'paid').length;
    const paidAmount = filteredViolations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const unpaidCount = filteredViolations.filter(v => v.payment_status === 'unpaid').length;
    const unpaidAmount = filteredViolations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const withVehicles = filteredViolations.filter(v => v.vehicle_id || v.vehicles).length;
    const withoutVehicles = filteredViolations.filter(v => !v.vehicle_id && !v.vehicles).length;

    return { total, totalAmount, paidCount, paidAmount, unpaidCount, unpaidAmount, withVehicles, withoutVehicles };
  }, [filteredViolations]);

  // توليد تقرير HTML
  const generateHTMLReport = () => {
    const currentDate = new Date().toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dateRangeText = filters.startDate || filters.endDate
      ? `الفترة: ${filters.startDate || 'البداية'} إلى ${filters.endDate || 'الآن'}`
      : 'جميع الفترات';

    const filterDescription = [
      filters.onlyLinkedToVehicles ? 'المخالفات المرتبطة بمركبات فقط' : 'جميع المخالفات',
      filters.paymentStatus !== 'all' ? `حالة الدفع: ${filters.paymentStatus === 'paid' ? 'مسددة' : filters.paymentStatus === 'unpaid' ? 'غير مسددة' : 'مسددة جزئياً'}` : '',
      filters.status !== 'all' ? `الحالة: ${filters.status === 'confirmed' ? 'مؤكدة' : filters.status === 'pending' ? 'قيد المراجعة' : 'ملغاة'}` : '',
    ].filter(Boolean).join(' | ');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير المخالفات المرورية</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            color: #1a1a2e;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .company-logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        
        .report-title {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .report-meta {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .filter-info {
            background: #fff7ed;
            border-right: 4px solid #f97316;
            padding: 15px 25px;
            margin: 20px 30px;
            border-radius: 8px;
            font-size: 14px;
            color: #9a3412;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            padding: 20px 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e5e5e5;
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-value {
            font-size: 26px;
            font-weight: 700;
            color: #f97316;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #666;
            font-weight: 500;
        }
        
        .stat-card.success .stat-value { color: #16a34a; }
        .stat-card.danger .stat-value { color: #dc2626; }
        .stat-card.info .stat-value { color: #2563eb; }
        
        .table-container {
            padding: 20px 30px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        thead {
            background: linear-gradient(135deg, #1a1a2e 0%, #16162e 100%);
            color: white;
        }
        
        th {
            padding: 14px 12px;
            text-align: right;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            vertical-align: middle;
        }
        
        tr:nth-child(even) {
            background: #fafafa;
        }
        
        tr:hover {
            background: #fff7ed;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .badge-success {
            background: #dcfce7;
            color: #166534;
        }
        
        .badge-danger {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .amount {
            font-weight: 700;
            color: #f97316;
        }
        
        .vehicle-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .vehicle-plate {
            font-weight: 600;
            color: #1a1a2e;
        }
        
        .vehicle-details {
            font-size: 11px;
            color: #666;
        }
        
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #64748b;
        }
        
        .controls {
            padding: 20px 30px;
            text-align: center;
            border-bottom: 1px solid #eee;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 0 8px;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .controls {
                display: none;
            }
            
            .header {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            thead {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .stat-card {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .badge {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        @page {
            size: A4 landscape;
            margin: 1cm;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <button class="btn btn-primary" onclick="window.print()">
                🖨️ طباعة التقرير
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
                ✖️ إغلاق
            </button>
        </div>
        
        <div class="header">
            <div class="company-logo">🚗 شركة العراف لتأجير السيارات</div>
            <div class="report-title">تقرير المخالفات المرورية</div>
            <div class="report-meta">${currentDate} | ${dateRangeText}</div>
        </div>
        
        <div class="filter-info">
            <strong>🔍 معايير التصفية:</strong> ${filterDescription || 'بدون تصفية'}
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">إجمالي المخالفات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatCurrency(stats.totalAmount)}</div>
                <div class="stat-label">إجمالي المبالغ</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${stats.paidCount}</div>
                <div class="stat-label">مخالفات مسددة</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${stats.unpaidCount}</div>
                <div class="stat-label">مخالفات غير مسددة</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${formatCurrency(stats.paidAmount)}</div>
                <div class="stat-label">المبالغ المسددة</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${formatCurrency(stats.unpaidAmount)}</div>
                <div class="stat-label">المبالغ المستحقة</div>
            </div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>رقم المخالفة</th>
                        <th>التاريخ</th>
                        <th>المركبة</th>
                        <th>نوع المخالفة</th>
                        <th>الموقع</th>
                        <th>المبلغ</th>
                        <th>حالة الدفع</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredViolations.map((v, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${v.penalty_number || '-'}</strong></td>
                            <td>${v.penalty_date ? format(new Date(v.penalty_date), 'dd/MM/yyyy') : '-'}</td>
                            <td>
                                <div class="vehicle-info">
                                    <span class="vehicle-plate">${v.vehicles?.plate_number || v.vehicle_plate || '-'}</span>
                                    ${v.vehicles ? `<span class="vehicle-details">${v.vehicles.make || ''} ${v.vehicles.model || ''}</span>` : ''}
                                </div>
                            </td>
                            <td>${v.violation_type || v.reason || '-'}</td>
                            <td>${v.location || '-'}</td>
                            <td class="amount">${formatCurrency(v.amount || 0)}</td>
                            <td>
                                <span class="badge ${v.payment_status === 'paid' ? 'badge-success' : v.payment_status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}">
                                    ${v.payment_status === 'paid' ? 'مسددة' : v.payment_status === 'partially_paid' ? 'جزئي' : 'غير مسددة'}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${v.status === 'confirmed' ? 'badge-info' : v.status === 'pending' ? 'badge-warning' : 'badge-secondary'}">
                                    ${v.status === 'confirmed' ? 'مؤكدة' : v.status === 'pending' ? 'قيد المراجعة' : 'ملغاة'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام Fleetify</p>
            <p>© ${new Date().getFullYear()} شركة العراف لتأجير السيارات. جميع الحقوق محفوظة.</p>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            window.focus();
        };
        
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      // Fallback for popup blockers
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_المخالفات_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-coral-500" />
            تخصيص تقرير المخالفات المرورية
          </DialogTitle>
          <DialogDescription>
            اختر معايير التصفية لإنشاء تقرير مخصص
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* فلتر المركبات */}
          <div className="flex items-start gap-3 p-4 bg-coral-50 rounded-xl border border-coral-100">
            <Checkbox
              id="onlyLinkedToVehicles"
              checked={filters.onlyLinkedToVehicles}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, onlyLinkedToVehicles: checked as boolean }))
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="onlyLinkedToVehicles" className="font-semibold cursor-pointer flex items-center gap-2">
                <Car className="w-4 h-4 text-coral-600" />
                المخالفات المرتبطة بمركبات فقط
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                عند التفعيل، سيتم استبعاد المخالفات غير المربوطة بمركبات من النظام
              </p>
            </div>
          </div>

          {/* فلتر التاريخ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                من تاريخ
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                إلى تاريخ
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* فلتر حالة الدفع */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              حالة الدفع
            </Label>
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value as any }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مسددة</SelectItem>
                <SelectItem value="unpaid">غير مسددة</SelectItem>
                <SelectItem value="partially_paid">مسددة جزئياً</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* فلتر الحالة */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500" />
              حالة المخالفة
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ملخص الإحصائيات */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <h4 className="font-semibold text-sm text-neutral-700 mb-3 flex items-center gap-2">
              📊 ملخص التقرير
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-coral-600">{stats.total}</div>
                <div className="text-xs text-neutral-500">عدد المخالفات</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-lg font-bold text-green-600">{formatCurrency(stats.paidAmount)}</div>
                <div className="text-xs text-neutral-500">المسددة</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-lg font-bold text-red-600">{formatCurrency(stats.unpaidAmount)}</div>
                <div className="text-xs text-neutral-500">المستحقة</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Car className="w-3 h-3" />
                مربوطة بمركبات: {stats.withVehicles}
              </Badge>
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                <AlertCircle className="w-3 h-3" />
                غير مربوطة: {stats.withoutVehicles}
              </Badge>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={generateHTMLReport}
            disabled={stats.total === 0}
            className="flex-1 gap-2 bg-gradient-to-r from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            إنشاء التقرير ({stats.total} مخالفة)
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

