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

  const { data: violationsData, isLoading: violationsLoading } = useTrafficViolationsReport(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: paymentsData, isLoading: paymentsLoading } = useTrafficViolationPaymentsReport(
    dateRange.startDate,
    dateRange.endDate
  );

  const generateViolationsReportHTML = () => {
    if (!violationsData || violationsData.length === 0) {
      return;
    }

    const totalAmount = violationsData.reduce((sum, item) => sum + item.amount, 0);
    const paidViolations = violationsData.filter(v => v.payment_status === 'paid');
    const unpaidViolations = violationsData.filter(v => v.payment_status === 'unpaid');
    const confirmedViolations = violationsData.filter(v => v.status === 'confirmed');

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${violationsData.length}</div>
          <div class="stat-label">Total Violations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${confirmedViolations.length}</div>
          <div class="stat-label">Confirmed Violations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${totalAmount.toFixed(3)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${paidViolations.length}</div>
          <div class="stat-label">Paid Violations</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Penalty Number</th>
            <th>Date</th>
            <th>Vehicle Plate</th>
            <th>Amount (KWD)</th>
            <th>Status</th>
            <th>Payment Status</th>
            <th>Reason</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${violationsData.map(item => `
            <tr>
              <td>${item.penalty_number}</td>
              <td>${format(new Date(item.penalty_date), 'dd/MM/yyyy')}</td>
              <td>${item.vehicle?.plate_number || item.vehicle_id || '-'}</td>
              <td>${item.amount.toFixed(3)}</td>
              <td>${item.status}</td>
              <td>${item.payment_status}</td>
              <td>${item.reason}</td>
              <td>${item.location || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const title = `Traffic Violations Report${dateRange.startDate ? ` (${dateRange.startDate} to ${dateRange.endDate || 'Present'})` : ''}`;
    exportTrafficViolationReportToHTML(content, title, 'Fleet Management System');
  };

  const generatePaymentsReportHTML = () => {
    if (!paymentsData || paymentsData.length === 0) {
      return;
    }

    const totalAmount = paymentsData.reduce((sum, item) => sum + item.amount, 0);
    const completedPayments = paymentsData.filter(p => p.status === 'completed');
    const cashPayments = paymentsData.filter(p => p.payment_method === 'cash');
    const bankTransfers = paymentsData.filter(p => p.payment_method === 'bank_transfer');

    const content = `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${paymentsData.length}</div>
          <div class="stat-label">Total Payments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${completedPayments.length}</div>
          <div class="stat-label">Completed Payments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">KWD ${totalAmount.toFixed(3)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${cashPayments.length}</div>
          <div class="stat-label">Cash Payments</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Payment Number</th>
            <th>Penalty Number</th>
            <th>Date</th>
            <th>Amount (KWD)</th>
            <th>Method</th>
            <th>Type</th>
            <th>Status</th>
            <th>Reference</th>
            <th>Vehicle Plate</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsData.map(item => `
            <tr>
              <td>${item.payment_number}</td>
              <td>${item.penalty_number}</td>
              <td>${format(new Date(item.payment_date), 'dd/MM/yyyy')}</td>
              <td>${item.amount.toFixed(3)}</td>
              <td>${item.payment_method.replace('_', ' ')}</td>
              <td>${item.payment_type}</td>
              <td>${item.status}</td>
              <td>${item.reference_number || '-'}</td>
              <td>${item.penalty?.vehicle?.plate_number || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const title = `Traffic Violation Payments Report${dateRange.startDate ? ` (${dateRange.startDate} to ${dateRange.endDate || 'Present'})` : ''}`;
    exportTrafficViolationReportToHTML(content, title, 'Fleet Management System');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Date Range Filter */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
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
            Traffic Violations Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive report of all traffic violations including status, amounts, and payment information.
          </p>
          
          {violationsData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Violations</div>
                <div className="text-lg text-primary">{violationsData.length}</div>
              </div>
              <div>
                <div className="font-medium">Total Amount</div>
                <div className="text-lg text-primary">KWD {violationsData.reduce((sum, item) => sum + item.amount, 0).toFixed(3)}</div>
              </div>
            </div>
          )}

          <Button 
            onClick={generateViolationsReportHTML}
            disabled={violationsLoading || !violationsData || violationsData.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Violations Report
          </Button>
        </CardContent>
      </Card>

      {/* Traffic Violation Payments Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payments Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a detailed report of all traffic violation payments including payment methods and transaction details.
          </p>
          
          {paymentsData && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Payments</div>
                <div className="text-lg text-primary">{paymentsData.length}</div>
              </div>
              <div>
                <div className="font-medium">Total Amount</div>
                <div className="text-lg text-primary">KWD {paymentsData.reduce((sum, item) => sum + item.amount, 0).toFixed(3)}</div>
              </div>
            </div>
          )}

          <Button 
            onClick={generatePaymentsReportHTML}
            disabled={paymentsLoading || !paymentsData || paymentsData.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Payments Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};