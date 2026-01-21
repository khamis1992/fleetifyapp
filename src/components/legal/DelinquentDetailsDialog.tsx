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
      className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-teal-200 transition-all duration-200"
    >
      {/* Header - تاريخ الاستحقاق */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 rounded-lg">
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">تاريخ الاستحقاق</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-xs text-slate-500">الإجمالي</p>
          <p className="text-lg font-bold text-teal-700">{formatCurrency(total)}</p>
        </div>
      </div>
      
      {/* Amounts Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-lg p-3 border border-rose-100">
          <p className="text-xs text-rose-600 mb-1">مبلغ الإيجار</p>
          <p className="text-base font-bold text-rose-700">{formatCurrency(balance)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-100">
          <p className="text-xs text-amber-600 mb-1">غرامة التأخير</p>
          <p className="text-base font-bold text-amber-700">{formatCurrency(invoice.penalty)}</p>
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
        <title>كشف حساب - ${customer.customer_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 12mm 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            background: #fff;
            color: #1a1a2e;
            line-height: 1.5;
            font-size: 11pt;
          }
          
          /* Header with Logo Area */
          .letterhead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #0f766e;
            margin-bottom: 24px;
          }
          .company-info {
            text-align: right;
          }
          .company-name {
            font-size: 20pt;
            font-weight: 700;
            color: #0f766e;
            margin-bottom: 4px;
          }
          .company-tagline {
            font-size: 9pt;
            color: #64748b;
          }
          .document-info {
            text-align: left;
          }
          .document-title {
            font-size: 14pt;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 6px;
          }
          .document-date {
            font-size: 9pt;
            color: #64748b;
          }
          .document-number {
            font-size: 9pt;
            color: #0f766e;
            font-weight: 600;
            margin-top: 4px;
          }
          
          /* Customer Section */
          .customer-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 10pt;
            font-weight: 600;
            color: #0f766e;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .info-item label {
            display: block;
            font-size: 8pt;
            color: #64748b;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .info-item span {
            font-weight: 600;
            font-size: 11pt;
            color: #1a1a2e;
          }
          
          /* Summary Cards */
          .summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .summary-box {
            padding: 16px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-box.rent {
            background: #fef2f2;
            border: 1px solid #fecaca;
          }
          .summary-box.penalty {
            background: #fffbeb;
            border: 1px solid #fde68a;
          }
          .summary-box.total {
            background: #0f766e;
            border: 1px solid #0f766e;
          }
          .summary-box label {
            display: block;
            font-size: 9pt;
            margin-bottom: 6px;
          }
          .summary-box.rent label { color: #991b1b; }
          .summary-box.penalty label { color: #92400e; }
          .summary-box.total label { color: rgba(255,255,255,0.85); }
          .summary-box .amount {
            font-size: 16pt;
            font-weight: 700;
          }
          .summary-box.rent .amount { color: #dc2626; }
          .summary-box.penalty .amount { color: #d97706; }
          .summary-box.total .amount { color: #fff; }
          
          /* Table */
          .table-container {
            margin-bottom: 20px;
          }
          .table-title {
            font-size: 10pt;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }
          thead th {
            background: #0f766e;
            color: white;
            padding: 12px 10px;
            text-align: center;
            font-weight: 600;
            font-size: 9pt;
          }
          thead th:first-child { border-radius: 0 6px 0 0; }
          thead th:last-child { border-radius: 6px 0 0 0; }
          tbody td {
            padding: 10px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody td.amount {
            font-weight: 600;
            font-family: 'Courier New', monospace;
          }
          tbody td.rent-col { color: #dc2626; }
          tbody td.penalty-col { color: #d97706; }
          tbody td.total-col { color: #0f766e; font-weight: 700; }
          
          tfoot td {
            background: #1a1a2e;
            color: white;
            padding: 12px 10px;
            font-weight: 700;
            font-size: 10pt;
          }
          tfoot td:first-child { border-radius: 0 0 6px 0; }
          tfoot td:last-child { border-radius: 0 0 0 6px; }
          
          /* Footer */
          .footer-section {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #1a1a2e;
            margin-top: 50px;
            padding-top: 8px;
            font-size: 9pt;
            color: #64748b;
          }
          .print-info {
            text-align: center;
            margin-top: 20px;
            font-size: 8pt;
            color: #94a3b8;
          }
          
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- Letterhead -->
        <div class="letterhead">
          <div class="company-info">
            <div class="company-name">شركة العراف لتأجير السيارات</div>
            <div class="company-tagline">AL-ARRAF CAR RENTAL</div>
          </div>
          <div class="document-info">
            <div class="document-title">كشف حساب العميل</div>
            <div class="document-date">${new Date().toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="document-number">رقم المرجع: ${customer.contract_number || 'N/A'}</div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="customer-section">
          <div class="section-title">بيانات العميل</div>
          <div class="customer-grid">
            <div class="info-item">
              <label>اسم العميل</label>
              <span>${customer.customer_name}</span>
            </div>
            <div class="info-item">
              <label>رقم العقد</label>
              <span>${customer.contract_number || '-'}</span>
            </div>
            <div class="info-item">
              <label>رقم الهاتف</label>
              <span dir="ltr">${customer.phone || '-'}</span>
            </div>
            <div class="info-item">
              <label>لوحة المركبة</label>
              <span>${customer.vehicle_plate || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="summary-row">
          <div class="summary-box rent">
            <label>إجمالي الإيجار المستحق</label>
            <div class="amount">${formatCurrency(totalRent)}</div>
          </div>
          <div class="summary-box penalty">
            <label>غرامات التأخير</label>
            <div class="amount">${formatCurrency(totalPenalties)}</div>
          </div>
          <div class="summary-box total">
            <label>المبلغ الإجمالي المستحق</label>
            <div class="amount">${formatCurrency(grandTotal)}</div>
          </div>
        </div>

        <!-- Invoices Table -->
        <div class="table-container">
          <div class="table-title">تفاصيل المستحقات (${invoices.length} فاتورة)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 8%">#</th>
                <th style="width: 25%">تاريخ الاستحقاق</th>
                <th style="width: 22%">مبلغ الإيجار</th>
                <th style="width: 22%">الغرامة</th>
                <th style="width: 23%">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map((inv, idx) => {
                const balance = inv.total_amount - inv.paid_amount;
                const total = balance + inv.penalty;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${formatDate(inv.due_date)}</td>
                    <td class="amount rent-col">${formatCurrency(balance)}</td>
                    <td class="amount penalty-col">${formatCurrency(inv.penalty)}</td>
                    <td class="amount total-col">${formatCurrency(total)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">المجموع</td>
                <td>${formatCurrency(totalRent)}</td>
                <td>${formatCurrency(totalPenalties)}</td>
                <td>${formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line">توقيع المسؤول المالي</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">ختم الشركة</div>
            </div>
          </div>
          
          <div class="print-info">
            تم إنشاء هذا الكشف إلكترونياً بتاريخ ${new Date().toLocaleDateString('ar-QA')} الساعة ${new Date().toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}
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
              <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg shadow-teal-500/25">
                <Receipt className="w-6 h-6 text-white" />
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
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Receipt className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-base font-semibold text-slate-700">
                  تفاصيل المستحقات
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
                  className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50 hover:border-teal-300"
                >
                  <Printer className="w-4 h-4" />
                  طباعة كشف الحساب
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
              <div className="px-5 py-4 bg-gradient-to-l from-teal-600 to-teal-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium text-white/90">المبلغ الإجمالي المستحق</span>
                  <span className="text-xs text-white/70 bg-white/15 px-3 py-1 rounded-full">
                    {invoices.length} فاتورة
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelinquentDetailsDialog;
