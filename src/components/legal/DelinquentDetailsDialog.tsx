import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  FileText,
  Car,
  User,
  Phone
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-QA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-QA', { month: 'long', year: 'numeric' });
  };

  const totalRent = invoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
  const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty, 0);
  const grandTotal = totalRent + totalPenalties;

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg">تفاصيل التأخير</div>
              <div className="text-sm font-normal text-muted-foreground">
                {customer.customer_name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Customer & Contract Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg mb-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-600">العميل:</span>
            <span className="font-medium">{customer.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-600">العقد:</span>
            <span className="font-medium">{customer.contract_number}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Car className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-600">المركبة:</span>
            <span className="font-medium font-mono">{customer.vehicle_plate || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-neutral-500" />
            <span className="text-neutral-600">الهاتف:</span>
            <span className="font-medium" dir="ltr">{customer.phone || '-'}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-xs text-red-600 mb-1">الإيجار المتأخر</div>
            <div className="text-lg font-bold text-red-700">{formatCurrency(totalRent)}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="text-xs text-orange-600 mb-1">الغرامات المتراكمة</div>
            <div className="text-lg font-bold text-orange-700">{formatCurrency(totalPenalties)}</div>
          </div>
          <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-200">
            <div className="text-xs text-neutral-600 mb-1">الإجمالي المستحق</div>
            <div className="text-lg font-bold text-neutral-900">{formatCurrency(grandTotal)}</div>
          </div>
        </div>

        {/* Overdue Invoices List */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-neutral-100 px-4 py-2 border-b">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              الفواتير المتأخرة ({invoices.length} فاتورة)
            </h4>
          </div>
          
          <ScrollArea className="max-h-[300px]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد فواتير متأخرة
              </div>
            ) : (
              <div className="divide-y">
                {invoices.map((invoice, index) => (
                  <div 
                    key={invoice.id} 
                    className="p-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Invoice Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{getMonthName(invoice.due_date)}</span>
                          <Badge 
                            variant={invoice.days_overdue > 90 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            <Clock className="w-3 h-3 ml-1" />
                            {invoice.days_overdue} يوم
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          تاريخ الاستحقاق: {formatDate(invoice.due_date)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          رقم الفاتورة: {invoice.invoice_number}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-muted-foreground">الإيجار:</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-muted-foreground">الغرامة:</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(invoice.penalty)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 justify-end border-t pt-1">
                          <span className="text-xs text-muted-foreground">المجموع:</span>
                          <span className="font-bold">
                            {formatCurrency((invoice.total_amount - invoice.paid_amount) + invoice.penalty)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Penalty Calculation Note */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>طريقة حساب الغرامة:</strong> 120 ر.ق لكل يوم تأخير بحد أقصى 3,000 ر.ق شهرياً لكل فاتورة.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelinquentDetailsDialog;

