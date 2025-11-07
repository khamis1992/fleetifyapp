import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Receipt,
  FileText,
  Calculator,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'payment' | 'invoice' | 'journal_entry' | 'report';
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  status?: string;
  icon: React.ElementType;
  iconBg: string;
  action?: () => void;
}

export const ActivityTimeline: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!user?.id) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profileData?.company_id) return;

        const companyId = profileData.company_id;
        const recentActivities: Activity[] = [];

        // Fetch recent payments
        const { data: payments } = await supabase
          .from('payments')
          .select('id, payment_number, amount, payment_date, payment_method, customers(name)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(3);

        payments?.forEach(payment => {
          recentActivities.push({
            id: payment.id,
            type: 'payment',
            title: 'استلام دفعة',
            description: `${payment.amount.toLocaleString()} QAR من ${payment.customers?.name || 'عميل'}`,
            amount: payment.amount,
            timestamp: new Date(payment.payment_date),
            icon: Receipt,
            iconBg: 'bg-green-100 text-green-600',
          });
        });

        // Fetch recent invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, amount, status, created_at, customers(name)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(3);

        invoices?.forEach(invoice => {
          recentActivities.push({
            id: invoice.id,
            type: 'invoice',
            title: 'فاتورة جديدة',
            description: `${invoice.invoice_number} - ${invoice.customers?.name || 'عميل'}`,
            amount: invoice.amount,
            timestamp: new Date(invoice.created_at),
            status: invoice.status,
            icon: FileText,
            iconBg: 'bg-blue-100 text-blue-600',
          });
        });

        // Fetch recent journal entries
        const { data: journalEntries } = await supabase
          .from('journal_entries')
          .select('id, journal_entry_number, description, total_amount, entry_date, status')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(2);

        journalEntries?.forEach(entry => {
          recentActivities.push({
            id: entry.id,
            type: 'journal_entry',
            title: 'قيد محاسبي',
            description: entry.description,
            amount: entry.total_amount,
            timestamp: new Date(entry.entry_date),
            status: entry.status,
            icon: Calculator,
            iconBg: 'bg-orange-100 text-orange-600',
          });
        });

        // Sort by timestamp
        recentActivities.sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );

        setActivities(recentActivities.slice(0, 10));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivities();

    // Refresh every minute
    const interval = setInterval(fetchRecentActivities, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">النشاط الأخير</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">النشاط الأخير</h3>
        <Button variant="ghost" size="sm">
          عرض الكل
          <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد أنشطة حديثة</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-4 pb-4',
                index !== activities.length - 1 && 'border-b'
              )}
            >
              {/* Icon */}
              <div className={cn('p-2.5 rounded-lg', activity.iconBg)}>
                <activity.icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{activity.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    {activity.amount && (
                      <p className="text-sm font-semibold">
                        {activity.amount.toLocaleString()} QAR
                      </p>
                    )}
                    {activity.status && (
                      <Badge
                        variant={
                          activity.status === 'paid' || activity.status === 'posted'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs mt-1"
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                      locale: ar,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

