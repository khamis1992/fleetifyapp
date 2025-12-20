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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';

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
      year: 'numeric', 
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-l from-red-50 to-orange-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl mb-1">تفاصيل التأخير</DialogTitle>
              <DialogDescription className="text-base font-medium text-neutral-700">
                {customer.customer_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Customer & Contract Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-xl border">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-neutral-500">العميل:</span>
              <span className="font-semibold truncate">{customer.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="text-neutral-500">العقد:</span>
              <span className="font-mono font-semibold">{customer.contract_number}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Car className="w-4 h-4 text-green-500" />
              <span className="text-neutral-500">المركبة:</span>
              <span className="font-mono font-semibold">{customer.vehicle_plate || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-orange-500" />
              <span className="text-neutral-500">الهاتف:</span>
              <span className="font-mono font-semibold" dir="ltr">{customer.phone || '-'}</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-xl border-2 border-red-100 text-center">
              <div className="text-sm text-red-600 mb-2 font-medium">الإيجار المتأخر</div>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(totalRent)}</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-100 text-center">
              <div className="text-sm text-orange-600 mb-2 font-medium">الغرامات المتراكمة</div>
              <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalPenalties)}</div>
            </div>
            <div className="p-4 bg-neutral-100 rounded-xl border-2 border-neutral-200 text-center">
              <div className="text-sm text-neutral-600 mb-2 font-medium">الإجمالي المستحق</div>
              <div className="text-2xl font-bold text-neutral-900">{formatCurrency(grandTotal)}</div>
            </div>
          </div>

          {/* Overdue Invoices Table */}
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-neutral-800 text-white px-4 py-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                الفواتير المتأخرة ({invoices.length} فاتورة)
              </h4>
            </div>
            
            <ScrollArea className="max-h-[350px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  لا توجد فواتير متأخرة
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-center w-12">#</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead className="text-center">التأخير</TableHead>
                      <TableHead className="text-left">الإيجار</TableHead>
                      <TableHead className="text-left">الغرامة</TableHead>
                      <TableHead className="text-left font-bold">المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => {
                      const balance = invoice.total_amount - invoice.paid_amount;
                      const total = balance + invoice.penalty;
                      const monthsOverdue = getMonthsOverdue(invoice.days_overdue);
                      
                      return (
                        <TableRow 
                          key={invoice.id}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                        >
                          <TableCell className="text-center font-bold text-neutral-400">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="font-medium">{formatShortDate(invoice.due_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                              {invoice.invoice_number}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={invoice.days_overdue > 90 ? "destructive" : invoice.days_overdue > 30 ? "default" : "secondary"}
                              className="gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              {invoice.days_overdue} يوم
                              <span className="opacity-70">({monthsOverdue} ش)</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="font-semibold text-red-600">
                              {formatCurrency(balance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="font-semibold text-orange-600">
                              {formatCurrency(invoice.penalty)}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="font-bold text-lg">
                              {formatCurrency(total)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-neutral-800 text-white hover:bg-neutral-800">
                      <TableCell colSpan={4} className="font-bold text-base">
                        المجموع الكلي
                      </TableCell>
                      <TableCell className="text-left font-bold text-red-300">
                        {formatCurrency(totalRent)}
                      </TableCell>
                      <TableCell className="text-left font-bold text-orange-300">
                        {formatCurrency(totalPenalties)}
                      </TableCell>
                      <TableCell className="text-left font-bold text-xl text-white">
                        {formatCurrency(grandTotal)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </ScrollArea>
          </div>

          {/* Penalty Calculation Note */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                <strong className="block mb-1">طريقة حساب الغرامة:</strong>
                <span>120 ر.ق لكل يوم تأخير بحد أقصى 3,000 ر.ق شهرياً لكل فاتورة.</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelinquentDetailsDialog;
