import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Calendar } from 'lucide-react';
import { 
  useTrafficViolationsReport, 
  useTrafficViolationPaymentsReport,
  exportTrafficViolationReportToHTML 
} from '@/hooks/useTrafficViolationReportsExport';
import { format } from 'date-fns';

export const TrafficViolationReports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const { data: violationsData, isLoading: violationsLoading, error: violationsError } = useTrafficViolationsReport(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useTrafficViolationPaymentsReport(
    dateRange.startDate,
    dateRange.endDate
  );

  // Debug logging
  console.log("Violations data:", violationsData);
  console.log("Payments data:", paymentsData);
  console.log("Violations error:", violationsError);
  console.log("Payments error:", paymentsError);

  const generateViolationsReportHTML = () => {
    console.log("Generating violations report...", violationsData);
    
    // Create demo data if no real data exists
    const demoData = !violationsData || violationsData.length === 0 ? [
      {
        penalty_number: 'PEN-DEMO-001',
        penalty_date: '2024-07-01',
        vehicle: { plate_number: 'KWT-123' },
        vehicle_id: 'KWT-123',
        amount: 50.000,
        status: 'confirmed',
        payment_status: 'paid',
        reason: 'تجاوز السرعة المحددة',
        location: 'شارع الخليج العربي'
      },
      {
        penalty_number: 'PEN-DEMO-002',
        penalty_date: '2024-07-15',
        vehicle: { plate_number: 'KWT-456' },
        vehicle_id: 'KWT-456',
        amount: 25.000,
        status: 'confirmed',
        payment_status: 'unpaid',
        reason: 'وقوف مخالف للقانون',
        location: 'شارع السالم'
      }
    ] : violationsData;
    
    const dataToUse = demoData;

    const totalAmount = dataToUse.reduce((sum, item) => sum + item.amount, 0);
    const paidViolations = dataToUse.filter(v => v.payment_status === 'paid');
    const unpaidViolations = dataToUse.filter(v => v.payment_status === 'unpaid');
    const confirmedViolations = dataToUse.filter(v => v.status === 'confirmed');

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${dataToUse.length}</div>
          <div class="stat-label">إجمالي المخالفات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${confirmedViolations.length}</div>
          <div class="stat-label">المخالفات المؤكدة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${totalAmount.toFixed(3)}</div>
          <div class="stat-label">إجمالي المبلغ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${paidViolations.length}</div>
          <div class="stat-label">المخالفات المدفوعة</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم المخالفة</th>
            <th>التاريخ</th>
            <th>لوحة المركبة</th>
            <th>المبلغ (د.ك)</th>
            <th>الحالة</th>
            <th>حالة الدفع</th>
            <th>السبب</th>
            <th>الموقع</th>
          </tr>
        </thead>
        <tbody>
          ${dataToUse.map(item => `
            <tr>
              <td>${item.penalty_number}</td>
              <td>${format(new Date(item.penalty_date), 'dd/MM/yyyy')}</td>
              <td>${item.vehicle?.plate_number || item.vehicle_id || '-'}</td>
              <td>${item.amount.toFixed(3)}</td>
              <td>${item.status === 'confirmed' ? 'مؤكدة' : item.status === 'pending' ? 'معلقة' : item.status}</td>
              <td>${item.payment_status === 'paid' ? 'مدفوعة' : item.payment_status === 'unpaid' ? 'غير مدفوعة' : item.payment_status}</td>
              <td>${item.reason}</td>
              <td>${item.location || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const title = `تقرير المخالفات المرورية${dateRange.startDate ? ` (${dateRange.startDate} إلى ${dateRange.endDate || 'الحالي'})` : ''}${(!violationsData || violationsData.length === 0) ? ' - بيانات تجريبية' : ''}`;
    exportTrafficViolationReportToHTML(content, title, 'Fleetify');
  };

  const generatePaymentsReportHTML = () => {
    console.log("Generating payments report...", paymentsData);
    
    // Create demo data if no real data exists
    const demoData = !paymentsData || paymentsData.length === 0 ? [
      {
        payment_number: 'PAY-DEMO-001',
        penalty_number: 'PEN-DEMO-001',
        payment_date: '2024-07-02',
        amount: 50.000,
        payment_method: 'cash',
        payment_type: 'full',
        status: 'completed',
        reference_number: 'CASH-001',
        penalty: { vehicle: { plate_number: 'KWT-123' } }
      },
      {
        payment_number: 'PAY-DEMO-002',
        penalty_number: 'PEN-DEMO-002',
        payment_date: '2024-07-16',
        amount: 25.000,
        payment_method: 'bank_transfer',
        payment_type: 'full',
        status: 'completed',
        reference_number: 'TRF-002',
        penalty: { vehicle: { plate_number: 'KWT-456' } }
      }
    ] : paymentsData;
    
    const dataToUse = demoData;

    const totalAmount = dataToUse.reduce((sum, item) => sum + item.amount, 0);
    const completedPayments = dataToUse.filter(p => p.status === 'completed');
    const cashPayments = dataToUse.filter(p => p.payment_method === 'cash');
    const bankTransfers = dataToUse.filter(p => p.payment_method === 'bank_transfer');

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${dataToUse.length}</div>
          <div class="stat-label">إجمالي المدفوعات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${completedPayments.length}</div>
          <div class="stat-label">المدفوعات المكتملة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${totalAmount.toFixed(3)}</div>
          <div class="stat-label">إجمالي المبلغ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${cashPayments.length}</div>
          <div class="stat-label">المدفوعات النقدية</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم الدفع</th>
            <th>رقم المخالفة</th>
            <th>التاريخ</th>
            <th>المبلغ (د.ك)</th>
            <th>الطريقة</th>
            <th>النوع</th>
            <th>الحالة</th>
            <th>المرجع</th>
            <th>لوحة المركبة</th>
          </tr>
        </thead>
        <tbody>
          ${dataToUse.map(item => `
            <tr>
              <td>${item.payment_number}</td>
              <td>${item.penalty_number}</td>
              <td>${format(new Date(item.payment_date), 'dd/MM/yyyy')}</td>
              <td>${item.amount.toFixed(3)}</td>
              <td>${item.payment_method === 'cash' ? 'نقدي' : item.payment_method === 'bank_transfer' ? 'تحويل بنكي' : item.payment_method}</td>
              <td>${item.payment_type}</td>
              <td>${item.status === 'completed' ? 'مكتملة' : item.status === 'pending' ? 'معلقة' : item.status}</td>
              <td>${item.reference_number || '-'}</td>
              <td>${item.penalty?.vehicle?.plate_number || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const title = `تقرير مدفوعات المخالفات المرورية${dateRange.startDate ? ` (${dateRange.startDate} إلى ${dateRange.endDate || 'الحالي'})` : ''}${(!paymentsData || paymentsData.length === 0) ? ' - بيانات تجريبية' : ''}`;
    exportTrafficViolationReportToHTML(content, title, 'Fleetify');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Date Range Filter */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            مرشحات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">تاريخ البداية</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">تاريخ النهاية</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traffic Violations Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقرير المخالفات المرورية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            إنشاء تقرير شامل عن جميع المخالفات المرورية بما في ذلك الحالة والمبالغ ومعلومات الدفع
          </p>
          
          {violationsData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">إجمالي المخالفات</div>
                <div className="text-lg text-primary">{violationsData.length}</div>
              </div>
              <div>
                <div className="font-medium">إجمالي المبلغ</div>
                <div className="text-lg text-primary">KWD {violationsData.reduce((sum, item) => sum + item.amount, 0).toFixed(3)}</div>
              </div>
            </div>
          )}

          <Button 
            onClick={generateViolationsReportHTML}
            disabled={violationsLoading}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            تصدير تقرير المخالفات
            {(!violationsData || violationsData.length === 0) && 
              <span className="text-xs mr-2">(لا توجد بيانات)</span>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Traffic Violation Payments Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقرير المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            إنشاء تقرير مفصل عن جميع مدفوعات المخالفات المرورية بما في ذلك طرق الدفع وتفاصيل المعاملات
          </p>
          
          {paymentsData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">إجمالي المدفوعات</div>
                <div className="text-lg text-primary">{paymentsData.length}</div>
              </div>
              <div>
                <div className="font-medium">إجمالي المبلغ</div>
                <div className="text-lg text-primary">KWD {paymentsData.reduce((sum, item) => sum + item.amount, 0).toFixed(3)}</div>
              </div>
            </div>
          )}

          <Button 
            onClick={generatePaymentsReportHTML}
            disabled={paymentsLoading}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            تصدير تقرير المدفوعات
            {(!paymentsData || paymentsData.length === 0) && 
              <span className="text-xs mr-2">(لا توجد بيانات)</span>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};