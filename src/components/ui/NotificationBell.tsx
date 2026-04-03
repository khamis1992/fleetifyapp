import { useState } from 'react';
import { Bell, FileText, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceAlert {
  id: string;
  invoice_number: string;
  total_amount: number;
  created_at: string;
}

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: invoiceAlerts } = useQuery({
    queryKey: ['invoice-alerts', user?.profile?.company_id],
    queryFn: async (): Promise<InvoiceAlert[]> => {
      const companyId = user?.profile?.company_id;
      if (!companyId) return [];
      
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount, created_at')
        .eq('company_id', companyId)
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: false })
        .limit(5);
      
      return (data || []).map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        created_at: invoice.created_at,
      }));
    },
    enabled: !!user?.profile?.company_id,
  });

  const notificationCount = invoiceAlerts?.length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-QA', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'منذ دقائق';
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-QA');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
        title="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl border border-neutral-200 shadow-xl z-50">
            <div className="p-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900">الإشعارات</h3>
              {notificationCount > 0 && (
                <p className="text-xs text-neutral-500 mt-1">{notificationCount} إشعارات جديدة</p>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {invoiceAlerts && invoiceAlerts.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {invoiceAlerts.map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            فاتورة غير مدفوعة
                          </p>
                          <p className="text-xs text-neutral-600 mt-0.5">
                            {alert.invoice_number}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm font-bold text-amber-600">
                              {formatCurrency(alert.total_amount)}
                            </span>
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(alert.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-500">لا توجد إشعارات جديدة</p>
                </div>
              )}
            </div>
            
            {invoiceAlerts && invoiceAlerts.length > 0 && (
              <div className="p-3 border-t border-neutral-100 bg-neutral-50">
                <button 
                  className="w-full py-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  عرض جميع الإشعارات
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};