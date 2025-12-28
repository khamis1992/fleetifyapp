import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  AlertTriangle,
  FileText,
  Car,
  User,
  Phone,
  Receipt
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

export const DelinquentDetailsDialog: React.FC<DelinquentDetailsDialogProps> = ({
  open,
  onOpenChange,
  customer,
}) => {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && customer?.contract_id) {
      fetchOverdueInvoices();
    }
  }, [open, customer?.contract_id]);

  const fetchOverdueInvoices = async () => {
    if (!customer?.contract_id) return;
    
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total_amount, paid_amount, payment_status')
        .eq('contract_id', customer.contract_id)
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Calculate days overdue and penalty for each invoice
      const processedInvoices: OverdueInvoice[] = (data || []).map(inv => {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
        
        // Only count as overdue if there's remaining balance
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
      }).filter(inv => inv.days_overdue > 0); // Only show unpaid overdue invoices

      setInvoices(processedInvoices);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-QA', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getMonthsOverdue = (days: number) => {
    return Math.ceil(days / 30);
  };

  const totalRent = invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
  const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty, 0);
  const grandTotal = totalRent + totalPenalties;

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        {/* Header - مضغوط */}
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-l from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">تفاصيل التأخير</DialogTitle>
              <DialogDescription className="text-sm font-medium text-neutral-700 truncate">
                {customer.customer_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-80px)]">
          <div className="p-4 space-y-4">
            {/* معلومات مختصرة */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded">
                <FileText className="w-3 h-3 text-purple-500" />
                <span className="font-mono">{customer.contract_number}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded">
                <Car className="w-3 h-3 text-green-500" />
                <span>{customer.vehicle_plate || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded">
                <Phone className="w-3 h-3 text-orange-500" />
                <span dir="ltr">{customer.phone || '-'}</span>
              </div>
            </div>

            {/* بطاقات الملخص - أصغر */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-red-50 rounded-lg border border-red-100 text-center">
                <div className="text-[10px] text-red-600 mb-0.5">الإيجار</div>
                <div className="text-sm font-bold text-red-700">{formatCurrency(totalRent)}</div>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 text-center">
                <div className="text-[10px] text-orange-600 mb-0.5">الغرامات</div>
                <div className="text-sm font-bold text-orange-700">{formatCurrency(totalPenalties)}</div>
              </div>
              <div className="p-2 bg-neutral-100 rounded-lg border border-neutral-200 text-center">
                <div className="text-[10px] text-neutral-600 mb-0.5">الإجمالي</div>
                <div className="text-sm font-bold text-neutral-900">{formatCurrency(grandTotal)}</div>
              </div>
            </div>

            {/* قائمة الفواتير - تصميم بطاقات بدلاً من جدول */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-l from-coral-500 to-orange-500 text-white px-3 py-2 text-sm font-medium flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                الفواتير المتأخرة ({invoices.length})
              </div>
              
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  لا توجد فواتير متأخرة
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 max-h-[280px] overflow-y-auto">
                  {invoices.map((invoice, index) => {
                    const balance = invoice.total_amount - invoice.paid_amount;
                    const total = balance + invoice.penalty;
                    const monthsOverdue = getMonthsOverdue(invoice.days_overdue);
                    
                    return (
                      <div 
                        key={invoice.id}
                        className={`p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                      >
                        {/* صف علوي: التاريخ + التأخير */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="text-sm font-medium">{formatShortDate(invoice.due_date)}</span>
                          </div>
                          <Badge 
                            variant={invoice.days_overdue > 90 ? "destructive" : invoice.days_overdue > 30 ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {invoice.days_overdue} يوم ({monthsOverdue} ش)
                          </Badge>
                        </div>
                        
                        {/* صف سفلي: المبالغ */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-3">
                            <span className="text-red-600">
                              إيجار: <strong>{formatCurrency(balance)}</strong>
                            </span>
                            <span className="text-orange-600">
                              غرامة: <strong>{formatCurrency(invoice.penalty)}</strong>
                            </span>
                          </div>
                          <span className="font-bold text-sm">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* صف المجموع */}
              {invoices.length > 0 && (
                <div className="bg-gradient-to-l from-coral-600 to-orange-600 text-white px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">المجموع الكلي</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/80">
                      <span className="opacity-70">إيجار:</span> {formatCurrency(totalRent)}
                    </span>
                    <span className="text-white/80">
                      <span className="opacity-70">غرامة:</span> {formatCurrency(totalPenalties)}
                    </span>
                    <span className="font-bold text-sm text-white bg-white/20 px-2 py-0.5 rounded">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ملاحظة - أصغر */}
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
              <span>
                <strong>الغرامة:</strong> 120 ر.ق/يوم (حد أقصى 3,000 ر.ق/شهر)
              </span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DelinquentDetailsDialog;
