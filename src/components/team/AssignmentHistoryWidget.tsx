/**
 * Assignment History Widget
 * عرض سجل التعيينات الأخيرة
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { History, UserCheck, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AssignmentHistoryWidgetProps {
  limit?: number;
  showAll?: boolean;
}

export const AssignmentHistoryWidget: React.FC<AssignmentHistoryWidgetProps> = ({
  limit = 10,
  showAll = false,
}) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id || user?.company?.id;

  const { data: history, isLoading } = useQuery({
    queryKey: ['assignment-history', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      // Get recent assignments by checking contracts with assigned_at
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          assigned_at,
          assigned_to_profile_id,
          assigned_by_profile_id,
          assignment_notes,
          customers:customer_id (
            first_name_ar,
            last_name_ar,
            company_name_ar
          ),
          assigned_to:assigned_to_profile_id (
            first_name_ar,
            last_name_ar,
            email
          ),
          assigned_by:assigned_by_profile_id (
            first_name_ar,
            last_name_ar
          )
        `)
        .eq('company_id', companyId)
        .not('assigned_at', 'is', null)
        .order('assigned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const getCustomerName = (contract: any) => {
    const customer = contract?.customers;
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  const getEmployeeName = (employee: any) => {
    if (!employee) return 'غير محدد';
    return `${employee.first_name_ar || ''} ${employee.last_name_ar || ''}`.trim() || employee.email || 'غير محدد';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500 mt-3">جاري التحميل...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">لا يوجد سجل تعيينات</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <History className="w-5 h-5 text-teal-600" />
          سجل التعيينات
        </h3>
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
          {history.length} تعيين
        </Badge>
      </div>

      {/* History List */}
      <ScrollArea className={cn(showAll ? 'h-[600px]' : 'h-[400px]')}>
        <div className="space-y-3">
          {history.map((item: any, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-white rounded-xl border border-neutral-100 hover:border-teal-200 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        عقد #{item.contract_number}
                      </p>
                      <p className="text-xs text-neutral-600 truncate">
                        {getCustomerName(item)}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs flex-shrink-0">
                      معيّن
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-neutral-600">
                      <span className="font-medium">إلى:</span> {getEmployeeName(item.assigned_to)}
                    </p>
                    {item.assigned_by && (
                      <p className="text-xs text-neutral-500">
                        <span className="font-medium">بواسطة:</span> {getEmployeeName(item.assigned_by)}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(item.assigned_at)}
                    </p>
                  </div>

                  {item.assignment_notes && (
                    <p className="text-xs text-neutral-500 mt-2 p-2 bg-neutral-50 rounded-lg">
                      {item.assignment_notes}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
