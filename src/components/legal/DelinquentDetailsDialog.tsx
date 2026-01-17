import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  AlertTriangle,
  FileText,
  Car,
  Phone,
  Receipt,
  TrendingUp,
  X,
  Banknote,
  Timer,
  ExternalLink,
  Printer,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { calculatePenalty } from '@/utils/delinquency-calculations';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

interface DelinquentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: DelinquentCustomer | null;
}

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  days_overdue: number;
  penalty: number;
}

const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color,
  loading = false,
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  color: 'coral' | 'amber' | 'slate';
  loading?: boolean;
}) => {
  const colors = {
    coral: {
      bg: 'bg-gradient-to-br from-coral-50 to-rose-50',
      border: 'border-coral-100',
      icon: 'bg-coral-500',
      text: 'text-coral-700',
      label: 'text-coral-600',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      border: 'border-amber-100',
      icon: 'bg-amber-500',
      text: 'text-amber-700',
      label: 'text-amber-600',
    },
    slate: {
      bg: 'bg-gradient-to-br from-slate-50 to-neutral-50',
      border: 'border-slate-200',
      icon: 'bg-slate-600',
      text: 'text-slate-800',
      label: 'text-slate-500',
    },
  };

  const style = colors[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-4 border',
        style.bg,
        style.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg shadow-sm', style.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-medium mb-1', style.label)}>{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <p className={cn('text-xl font-bold tracking-tight truncate', style.text)}>
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const InvoiceCard = ({ 
  invoice, 
  index 
}: { 
  invoice: OverdueInvoice; 
  index: number;
}) => {
  const balance = invoice.total_amount - invoice.paid_amount;
  const total = balance + invoice.penalty;
  
  const getSeverity = (days: number) => {
    if (days > 90) return { color: 'bg-red-500', label: 'حرج', ring: 'ring-red-200' };
    if (days > 60) return { color: 'bg-orange-500', label: 'عالي', ring: 'ring-orange-200' };
    if (days > 30) return { color: 'bg-amber-500', label: 'متوسط', ring: 'ring-amber-200' };
    return { color: 'bg-slate-400', label: 'منخفض', ring: 'ring-slate-200' };
  };
  
  const severity = getSeverity(invoice.days_overdue);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-QA', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        'group relative bg-white rounded-xl border border-slate-100 p-4',
        'hover:shadow-md hover:border-slate-200 transition-all duration-200',
        'ring-2 ring-transparent hover:ring-2',
        severity.ring
      )}
    >
      {/* Severity indicator */}
      <div className={cn('absolute top-0 right-0 w-1.5 h-full rounded-r-xl', severity.color)} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pr-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {formatDate(invoice.due_date)}
          </span>
        </div>
        <Badge 
          className={cn(
            'text-xs px-2.5 py-1 font-medium border-0',
            invoice.days_overdue > 90 ? 'bg-red-100 text-red-700' :
            invoice.days_overdue > 60 ? 'bg-orange-100 text-orange-700' :
            invoice.days_overdue > 30 ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          )}
        >
          <Timer className="w-3.5 h-3.5 ml-1" />
          {invoice.days_overdue} يوم
        </Badge>
      </div>
      
      {/* Amounts Grid */}
      <div className="grid grid-cols-3 gap-3 pr-3">
        <div className="bg-coral-50/70 rounded-lg p-3 text-center">
          <p className="text-xs text-coral-600 mb-1">الإيجار</p>
          <p className="text-sm font-bold text-coral-700">{formatCurrency(balance)}</p>
        </div>
        <div className="bg-amber-50/70 rounded-lg p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">الغرامة</p>
          <p className="text-sm font-bold text-amber-700">{formatCurrency(invoice.penalty)}</p>
        </div>
        <div className="bg-slate-100/80 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">الإجمالي</p>
          <p className="text-sm font-bold text-slate-800">{formatCurrency(total)}</p>
        </div>
      </div>
    </motion.div>
  );
};

export const DelinquentDetailsDialog: React.FC<DelinquentDetailsDialogProps> = ({
  open,
  onOpenChange,
  customer,
}) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && customer) {
      setInvoices([]);
      setLoading(true);
      fetchOverdueInvoices();
    }
  }, [open, customer?.contract_id, customer?.contract_number]);

  const fetchOverdueInvoices = async () => {
    const contractId = customer?.contract_id;
    const contractNumber = customer?.contract_number;
    
    if (!contractId && !contractNumber) {
      setLoading(false);
      return;
    }
    
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let query = supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total_amount, paid_amount, payment_status');
      
      if (contractId) {
        query = query.eq('contract_id', contractId);
      } else if (contractNumber) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id')
          .eq('contract_number', contractNumber)
          .single();
        
        if (contractData?.id) {
          query = query.eq('contract_id', contractData.id);
        } else {
          setLoading(false);
          return;
        }
      }
      
      const { data, error } = await query
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const processedInvoices: OverdueInvoice[] = (data || []).map(inv => {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
        
        const actualDaysOverdue = balance > 0 ? daysOverdue : 0;
        const penalty = balance > 0 ? calculatePenalty(balance, actualDaysOverdue) : 0;

        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          total_amount: inv.total_amount,
          paid_amount: inv.paid_amount || 0,
          payment_status: inv.payment_status,
          days_overdue: actualDaysOverdue,
          penalty,
        };
      }).filter(inv => inv.days_overdue > 0);

      setInvoices(processedInvoices);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRent = invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
  const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty, 0);
  const grandTotal = totalRent + totalPenalties;
  const avgDaysOverdue = invoices.length > 0 
    ? Math.round(invoices.reduce((sum, inv) => sum + inv.days_overdue, 0) / invoices.length)
    : 0;

  const handlePrint = useCallback(() => {
    if (!customer || invoices.length === 0) return;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-QA', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    };

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير المستحقات المالية - ${customer.customer_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4; 
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            background: #fff;
            color: #1e293b;
            line-height: 1.6;
            font-size: 12pt;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 3px solid #ef4444;
            margin-bottom: 25px;
          }
          .header h1 {
            font-size: 22pt;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 11pt;
            color: #64748b;
          }
          .customer-info {
            background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
          }
          .customer-info h2 {
            font-size: 16pt;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .customer-info h2::before {
            content: "👤";
          }
          .customer-details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          .customer-details .item {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .customer-details .item label {
            display: block;
            font-size: 9pt;
            color: #64748b;
            margin-bottom: 4px;
          }
          .customer-details .item span {
            font-weight: 600;
            font-size: 11pt;
            color: #1e293b;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }
          .summary-card.rent {
            background: linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%);
            border: 1px solid #fecaca;
          }
          .summary-card.penalty {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border: 1px solid #fde68a;
          }
          .summary-card.total {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
          }
          .summary-card label {
            display: block;
            font-size: 10pt;
            color: #64748b;
            margin-bottom: 8px;
          }
          .summary-card .value {
            font-size: 18pt;
            font-weight: 700;
          }
          .summary-card.rent .value { color: #dc2626; }
          .summary-card.penalty .value { color: #d97706; }
          .summary-card.total .value { color: #1e293b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10pt;
          }
          thead {
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          }
          thead th {
            color: white;
            padding: 14px 12px;
            text-align: center;
            font-weight: 600;
            font-size: 10pt;
          }
          thead th:first-child {
            border-radius: 0 8px 0 0;
          }
          thead th:last-child {
            border-radius: 8px 0 0 0;
          }
          tbody tr {
            border-bottom: 1px solid #e2e8f0;
          }
          tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          tbody tr:hover {
            background: #fef2f2;
          }
          tbody td {
            padding: 12px;
            text-align: center;
          }
          tbody td.amount {
            font-weight: 600;
            font-family: 'Courier New', monospace;
          }
          tbody td.rent { color: #dc2626; }
          tbody td.penalty { color: #d97706; }
          tbody td.total-cell { 
            color: #1e293b;
            font-weight: 700;
          }
          .severity-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 9pt;
            font-weight: 600;
          }
          .severity-critical { background: #fee2e2; color: #dc2626; }
          .severity-high { background: #ffedd5; color: #ea580c; }
          .severity-medium { background: #fef3c7; color: #d97706; }
          .severity-low { background: #f1f5f9; color: #64748b; }
          tfoot {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          }
          tfoot td {
            color: white;
            padding: 14px 12px;
            font-weight: 700;
            font-size: 11pt;
          }
          tfoot td:first-child {
            border-radius: 0 0 8px 0;
          }
          tfoot td:last-child {
            border-radius: 0 0 0 8px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .footer-note {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 10pt;
            color: #92400e;
            margin-bottom: 20px;
          }
          .footer-info {
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            color: #64748b;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📄 تقرير المستحقات المالية</h1>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-QA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="customer-info">
          <h2>${customer.customer_name}</h2>
          <div class="customer-details">
            <div class="item">
              <label>رقم العقد</label>
              <span>${customer.contract_number || '-'}</span>
            </div>
            <div class="item">
              <label>رقم الهاتف</label>
              <span dir="ltr">${customer.phone || '-'}</span>
            </div>
            <div class="item">
              <label>لوحة المركبة</label>
              <span>${customer.vehicle_plate || '-'}</span>
            </div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card rent">
            <label>إجمالي الإيجار المتأخر</label>
            <div class="value">${formatCurrency(totalRent)}</div>
          </div>
          <div class="summary-card penalty">
            <label>إجمالي غرامات التأخير</label>
            <div class="value">${formatCurrency(totalPenalties)}</div>
          </div>
          <div class="summary-card total">
            <label>المجموع الكلي</label>
            <div class="value">${formatCurrency(grandTotal)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>تاريخ الاستحقاق</th>
              <th>أيام التأخير</th>
              <th>الحالة</th>
              <th>مبلغ الإيجار</th>
              <th>الغرامة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map((inv, idx) => {
              const balance = inv.total_amount - inv.paid_amount;
              const total = balance + inv.penalty;
              const severityClass = inv.days_overdue > 90 ? 'severity-critical' :
                                    inv.days_overdue > 60 ? 'severity-high' :
                                    inv.days_overdue > 30 ? 'severity-medium' : 'severity-low';
              const severityLabel = inv.days_overdue > 90 ? 'حرج' :
                                    inv.days_overdue > 60 ? 'عالي' :
                                    inv.days_overdue > 30 ? 'متوسط' : 'منخفض';
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${formatDate(inv.due_date)}</td>
                  <td>${inv.days_overdue} يوم</td>
                  <td><span class="severity-badge ${severityClass}">${severityLabel}</span></td>
                  <td class="amount rent">${formatCurrency(balance)}</td>
                  <td class="amount penalty">${formatCurrency(inv.penalty)}</td>
                  <td class="amount total-cell">${formatCurrency(total)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4">المجموع (${invoices.length} فاتورة)</td>
              <td>${formatCurrency(totalRent)}</td>
              <td>${formatCurrency(totalPenalties)}</td>
              <td>${formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div class="footer-note">
            <strong>⚠️ ملاحظة:</strong> يتم احتساب غرامة التأخير بمعدل 120 ر.ق لكل يوم تأخير، بحد أقصى 3,000 ر.ق لكل فاتورة.
          </div>
          <div class="footer-info">
            <span>متوسط أيام التأخير: ${avgDaysOverdue} يوم</span>
            <span>شركة العراف لتأجير السيارات</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [customer, invoices, totalRent, totalPenalties, grandTotal, avgDaysOverdue]);

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-gradient-to-b from-white to-slate-50/50 border-0 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 flex-shrink-0">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-coral-500/5 via-transparent to-amber-500/5" />
          
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute left-0 top-0 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {/* Customer Info */}
            <div className="flex items-start gap-4 pr-2">
              <div className="p-3 bg-gradient-to-br from-coral-500 to-rose-500 rounded-xl shadow-lg shadow-coral-500/25">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-800 mb-2 truncate">
                  {customer.customer_name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (customer.contract_number) {
                        onOpenChange(false);
                        navigate(`/contracts/${customer.contract_number}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-coral-50 hover:border-coral-200 hover:text-coral-600 transition-all cursor-pointer group"
                  >
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-coral-500" />
                    <span className="font-mono">{customer.contract_number}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {customer.vehicle_plate && (
                    <span className="inline-flex items-center gap-1.5 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                      <Car className="w-4 h-4 text-emerald-500" />
                      {customer.vehicle_plate}
                    </span>
                  )}
                  {customer.phone && (
                    <a 
                      href={`tel:${customer.phone}`}
                      className="inline-flex items-center gap-1.5 text-sm bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-all"
                    >
                      <Phone className="w-4 h-4 text-amber-500" />
                      <span dir="ltr">{customer.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 grid grid-cols-3 gap-4 flex-shrink-0">
          <StatCard
            label="الإيجار المتأخر"
            value={formatCurrency(totalRent)}
            icon={Banknote}
            color="coral"
            loading={loading}
          />
          <StatCard
            label="غرامات التأخير"
            value={formatCurrency(totalPenalties)}
            icon={TrendingUp}
            color="amber"
            loading={loading}
          />
          <StatCard
            label="الإجمالي"
            value={formatCurrency(grandTotal)}
            icon={Receipt}
            color="slate"
            loading={loading}
          />
        </div>

        {/* Invoices Section - Scrollable */}
        <div className="px-6 pt-5 pb-6 flex-1 min-h-0 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
            {/* Section Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-l from-slate-50 to-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-coral-100 rounded-lg">
                  <Receipt className="w-4 h-4 text-coral-600" />
                </div>
                <span className="text-base font-semibold text-slate-700">
                  الفواتير المتأخرة
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 text-sm">
                  {loading ? '...' : `${invoices.length} فاتورة`}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrint}
                  disabled={loading || invoices.length === 0}
                  className="gap-2 text-coral-600 border-coral-200 hover:bg-coral-50 hover:border-coral-300"
                >
                  <Printer className="w-4 h-4" />
                  طباعة التقرير
                </Button>
              </div>
            </div>

            {/* Invoices List - Native Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="p-5 space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-base text-slate-500">لا توجد فواتير متأخرة</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {invoices.map((invoice, index) => (
                    <InvoiceCard 
                      key={invoice.id} 
                      invoice={invoice} 
                      index={index} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Total Footer */}
            {!loading && invoices.length > 0 && (
              <div className="px-5 py-4 bg-gradient-to-l from-coral-600 to-rose-600 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium text-white/90">المجموع الكلي</span>
                  <span className="text-xs text-white/70 bg-white/15 px-3 py-1 rounded-full">
                    {invoices.length} فاتورة • {avgDaysOverdue} يوم متوسط
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            )}
          </div>

          {/* Info Note */}
          {!loading && invoices.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-100 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>طريقة حساب الغرامة:</strong> 120 ر.ق لكل يوم تأخير • حد أقصى 3,000 ر.ق لكل فاتورة
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelinquentDetailsDialog;
