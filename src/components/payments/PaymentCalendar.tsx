/**
 * Payment Calendar View Component
 * 
 * Interactive monthly calendar showing payment due dates with color coding
 * Features: Multi-month view, promise scheduling, invoice drill-down
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  differenceInDays,
  isToday,
  isPast,
  isFuture,
} from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentCalendarProps {
  companyId: string;
}

interface CalendarInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  days_overdue: number;
}

interface PaymentPromiseFormData {
  invoiceId: string;
  promiseDate: string;
  promisedAmount: number;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'sms' | 'in_person';
  notes: string;
}

export const PaymentCalendar: React.FC<PaymentCalendarProps> = ({
  companyId,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CalendarInvoice | null>(null);
  const [showPromiseDialog, setShowPromiseDialog] = useState(false);
  const [promiseFormData, setPromiseFormData] = useState<PaymentPromiseFormData>({
    invoiceId: '',
    promiseDate: '',
    promisedAmount: 0,
    contactMethod: 'phone',
    notes: '',
  });

  // Fetch invoices for current month and adjacent months
  const startDate = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['calendar-invoices', companyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_id,
          due_date,
          total_amount,
          paid_amount,
          status,
          customers!inner(
            id,
            customer_name
          )
        `)
        .eq('company_id', companyId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      return (data || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number || 'N/A',
        customer_id: inv.customer_id,
        customer_name: inv.customers?.name || 'Unknown',
        due_date: inv.due_date || '',
        total_amount: inv.total_amount || 0,
        paid_amount: inv.paid_amount || 0,
        status: inv.status || 'pending',
        days_overdue: inv.due_date ? differenceInDays(today, parseISO(inv.due_date)) : 0,
      })) as CalendarInvoice[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Create payment promise mutation
  const createPromiseMutation = useMutation({
    mutationFn: async (data: PaymentPromiseFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('payment_promises')
        .insert({
          company_id: companyId,
          customer_id: selectedInvoice?.customer_id,
          invoice_id: data.invoiceId,
          promise_date: data.promiseDate,
          promised_amount: data.promisedAmount,
          contact_method: data.contactMethod,
          notes: data.notes,
          status: 'pending',
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-invoices'] });
      toast({
        title: "Promise Recorded",
        description: "Payment promise has been successfully recorded.",
      });
      setShowPromiseDialog(false);
      resetPromiseForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record promise: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  // Group invoices by date
  const invoicesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarInvoice[]>();
    
    invoices?.forEach(invoice => {
      const dateKey = invoice.due_date;
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, invoice]);
    });

    return grouped;
  }, [invoices]);

  // Get day status and color
  const getDayStatus = (date: Date): {
    status: 'paid' | 'due-today' | 'upcoming' | 'overdue' | 'empty';
    color: string;
    count: number;
    totalAmount: number;
  } => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayInvoices = invoicesByDate.get(dateKey) || [];

    if (dayInvoices.length === 0) {
      return { status: 'empty', color: '', count: 0, totalAmount: 0 };
    }

    const totalAmount = dayInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
    const allPaid = dayInvoices.every(inv => inv.status === 'paid');
    
    if (allPaid) {
      return { status: 'paid', color: 'bg-green-100 border-green-300', count: dayInvoices.length, totalAmount };
    }
    
    if (isToday(date)) {
      return { status: 'due-today', color: 'bg-orange-100 border-orange-300', count: dayInvoices.length, totalAmount };
    }
    
    if (isPast(date)) {
      return { status: 'overdue', color: 'bg-red-100 border-red-300', count: dayInvoices.length, totalAmount };
    }
    
    return { status: 'upcoming', color: 'bg-yellow-100 border-yellow-300', count: dayInvoices.length, totalAmount };
  };

  const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleInvoiceClick = (invoice: CalendarInvoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCreatePromise = (invoice: CalendarInvoice) => {
    setSelectedInvoice(invoice);
    setPromiseFormData({
      invoiceId: invoice.id,
      promiseDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), // Default 7 days from now
      promisedAmount: invoice.total_amount - invoice.paid_amount,
      contactMethod: 'phone',
      notes: '',
    });
    setShowPromiseDialog(true);
  };

  const resetPromiseForm = () => {
    setPromiseFormData({
      invoiceId: '',
      promiseDate: '',
      promisedAmount: 0,
      contactMethod: 'phone',
      notes: '',
    });
    setSelectedInvoice(null);
  };

  const handlePromiseSubmit = () => {
    if (!promiseFormData.promiseDate || !promiseFormData.promisedAmount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createPromiseMutation.mutate(promiseFormData);
  };

  const selectedDateInvoices = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return invoicesByDate.get(dateKey) || [];
  }, [selectedDate, invoicesByDate]);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Payment Calendar
              </CardTitle>
              <CardDescription>
                Track payment due dates and schedule promises
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold ml-4">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Legend */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-sm">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
              <span className="text-sm">Due Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
              <span className="text-sm">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-sm">Paid</span>
            </div>
          </div>

          {/* Calendar Grid */}
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm p-2 bg-muted">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayStatus = getDayStatus(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <CalendarDay
                    key={index}
                    date={day}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={!!isSelected}
                    status={dayStatus}
                    onClick={() => handleDayClick(day)}
                    formatCurrency={formatCurrency}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && selectedDateInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices Due on {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
            <CardDescription>
              {selectedDateInvoices.length} invoice(s) · Total: {formatCurrency(
                selectedDateInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0)
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDateInvoices.map(invoice => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  formatCurrency={formatCurrency}
                  onCreatePromise={() => handleCreatePromise(invoice)}
                  onClick={() => handleInvoiceClick(invoice)}
                  isSelected={selectedInvoice?.id === invoice.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Promise Dialog */}
      <Dialog open={showPromiseDialog} onOpenChange={setShowPromiseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Record Payment Promise
            </DialogTitle>
            <DialogDescription>
              Schedule a payment promise for {selectedInvoice?.customer_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedInvoice && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-semibold">Invoice: {selectedInvoice.invoice_number}</div>
                <div className="text-sm text-muted-foreground">
                  Amount Due: {formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="promise-date">Promise Date *</Label>
              <Input
                id="promise-date"
                type="date"
                value={promiseFormData.promiseDate}
                onChange={(e) => setPromiseFormData({ ...promiseFormData, promiseDate: e.target.value })}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promised-amount">Promised Amount *</Label>
              <Input
                id="promised-amount"
                type="number"
                step="0.01"
                value={promiseFormData.promisedAmount}
                onChange={(e) => setPromiseFormData({ ...promiseFormData, promisedAmount: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-method">Contact Method *</Label>
              <Select
                value={promiseFormData.contactMethod}
                onValueChange={(value: any) => setPromiseFormData({ ...promiseFormData, contactMethod: value })}
              >
                <SelectTrigger id="contact-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={promiseFormData.notes}
                onChange={(e) => setPromiseFormData({ ...promiseFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromiseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePromiseSubmit} disabled={createPromiseMutation.isPending}>
              {createPromiseMutation.isPending ? 'Saving...' : 'Record Promise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  status: {
    status: string;
    color: string;
    count: number;
    totalAmount: number;
  };
  onClick: () => void;
  formatCurrency: (amount: number) => string;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  isCurrentMonth,
  isSelected,
  status,
  onClick,
  formatCurrency,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "min-h-[100px] border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md",
        isCurrentMonth ? "opacity-100" : "opacity-40",
        isSelected ? "ring-2 ring-primary" : "",
        status.color || "bg-white border-gray-200",
        status.count > 0 ? "hover:scale-105" : ""
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <span className={cn(
          "text-sm font-semibold",
          isToday(date) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""
        )}>
          {format(date, 'd')}
        </span>
        {status.count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {status.count}
          </Badge>
        )}
      </div>
      
      {status.count > 0 && (
        <div className="text-xs font-semibold mt-2">
          {formatCurrency(status.totalAmount)}
        </div>
      )}
    </div>
  );
};

interface InvoiceCardProps {
  invoice: CalendarInvoice;
  formatCurrency: (amount: number) => string;
  onCreatePromise: () => void;
  onClick: () => void;
  isSelected: boolean;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  formatCurrency,
  onCreatePromise,
  onClick,
  isSelected,
}) => {
  const getStatusBadge = () => {
    if (invoice.status === 'paid') {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    }
    if (invoice.days_overdue > 0) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{invoice.days_overdue}d Overdue</Badge>;
    }
    if (invoice.days_overdue === 0) {
      return <Badge className="bg-orange-600"><Clock className="h-3 w-3 mr-1" />Due Today</Badge>;
    }
    return <Badge className="bg-blue-600"><Calendar className="h-3 w-3 mr-1" />Upcoming</Badge>;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors",
        isSelected ? "bg-accent border-primary" : ""
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-semibold">{invoice.customer_name}</div>
          <div className="text-sm text-muted-foreground">
            Invoice #{invoice.invoice_number}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Amount Due</div>
          <div className="text-lg font-bold">
            {formatCurrency(invoice.total_amount - invoice.paid_amount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Amount</div>
          <div className="text-lg font-bold">
            {formatCurrency(invoice.total_amount)}
          </div>
        </div>
      </div>

      {invoice.status !== 'paid' && (
        <div className="flex items-center gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePromise();
            }}
          >
            <CalendarClock className="h-4 w-4 mr-1" />
            Record Promise
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-1" />
            SMS
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentCalendar;
