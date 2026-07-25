/**
 * useEmployeeDetailedReport Hook
 * Hook لجلب تقرير أداء مفصل للموظف
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  customerCommunicationsClient,
  type CustomerCommunicationRow,
} from '@/integrations/supabase/customerCommunicationsClient';
import { useAuth } from '@/contexts/AuthContext';

export const useEmployeeDetailedReport = (employeeId: string, period: number = 30) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id || user?.company?.id;

  const { data: employeeIdentity, isLoading: identityLoading } = useQuery({
    queryKey: ['employee-report-identity', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, company_id')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!employeeId,
  });

  // Fetch unpaid invoices
  const { data: unpaidInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['employee-unpaid-invoices', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          balance_due,
          monthly_amount,
          last_payment_date,
          status,
          customers:customer_id (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type,
            phone
          )
        `)
        .eq('assigned_to_profile_id', employeeId)
        .eq('company_id', companyId)
        .in('status', ['active', 'under_legal_procedure'])
        .gt('balance_due', 0)
        .order('balance_due', { ascending: false });

      if (error) throw error;

      // Calculate days overdue and priority
      return data?.map(contract => {
        const daysOverdue = contract.last_payment_date 
          ? Math.floor((new Date().getTime() - new Date(contract.last_payment_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (daysOverdue > 30) priority = 'critical';
        else if (daysOverdue > 15) priority = 'high';
        else if (daysOverdue > 7) priority = 'medium';

        return {
          ...contract,
          days_overdue: daysOverdue,
          priority,
        };
      });
    },
    enabled: !!employeeIdentity && !!companyId,
  });

  // Fetch overdue tasks
  const { data: overdueTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['employee-overdue-tasks', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select(`
          id,
          title,
          scheduled_date,
          scheduled_time,
          priority,
          status,
          contracts:contract_id (
            contract_number,
            customers:customer_id (
              first_name,
              last_name,
              first_name_ar,
              last_name_ar,
              company_name,
              company_name_ar,
              customer_type
            )
          )
        `)
        .eq('assigned_to', employeeId)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      return data?.map(task => {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(task.scheduled_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...task,
          days_overdue: daysOverdue,
        };
      });
    },
    enabled: !!employeeIdentity && !!companyId,
  });

  // Fetch communication stats
  const { data: communicationStats, isLoading: commStatsLoading } = useQuery({
    queryKey: ['employee-communication-stats', companyId, employeeId, period],
    queryFn: async () => {
      if (!companyId || !employeeIdentity?.user_id) {
        throw new Error('Employee identity is required');
      }

      const periodStart = new Date();
      periodStart.setUTCDate(periodStart.getUTCDate() - period);

      const [contractsResult, communicationsResult] = await Promise.all([
        supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', employeeId)
        .in('status', ['active', 'under_legal_procedure']),
        customerCommunicationsClient
          .from('customer_communications')
          .select('communication_type, customer_id, duration_minutes, notes')
          .eq('company_id', companyId)
          .eq('employee_id', employeeIdentity.user_id)
          .gte('communication_date', periodStart.toISOString().slice(0, 10)),
      ]);

      if (contractsResult.error) throw contractsResult.error;
      if (communicationsResult.error) throw communicationsResult.error;

      const assignedCustomers = new Set(
        (contractsResult.data || []).map(contract => contract.customer_id)
      );
      const communications = (communicationsResult.data || []) as unknown as CustomerCommunicationRow[];
      const calls = communications.filter(item => item.communication_type === 'phone');
      const contactedCustomers = new Set(communications.map(item => item.customer_id));

      return {
        total_calls: calls.length,
        successful_calls: calls.filter(call =>
          Number(call.duration_minutes || 0) > 0 || call.notes.includes(' - answered')
        ).length,
        total_notes: communications.filter(item => item.communication_type === 'note').length,
        customers_contacted: contactedCustomers.size,
        total_customers: assignedCustomers.size,
        contact_coverage: assignedCustomers.size > 0
          ? (contactedCustomers.size / assignedCustomers.size) * 100
          : 0,
      };
    },
    enabled: !!employeeIdentity?.user_id && !!companyId,
  });

  // Fetch collection analysis
  const { data: collectionAnalysis, isLoading: collectionLoading } = useQuery({
    queryKey: ['employee-collection-analysis', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_amount, total_paid, balance_due')
        .eq('assigned_to_profile_id', employeeId)
        .eq('company_id', companyId)
        .in('status', ['active', 'under_legal_procedure', 'completed']);

      if (error) throw error;

      const totalDue = data?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0;
      const totalCollected = data?.reduce((sum, c) => sum + (c.total_paid || 0), 0) || 0;
      const totalBalance = data?.reduce((sum, c) => sum + (c.balance_due || 0), 0) || 0;
      const collectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 0;

      return {
        total_due: totalDue,
        total_collected: totalCollected,
        total_balance: totalBalance,
        collection_rate: collectionRate,
      };
    },
    enabled: !!employeeIdentity && !!companyId,
  });

  // Calculate recommendations
  const recommendations = React.useMemo(() => {
    const recs: Array<{ priority: string; text: string; action: string }> = [];

    // Unpaid invoices recommendations
    if (unpaidInvoices && unpaidInvoices.length > 0) {
      const criticalInvoices = unpaidInvoices.filter(i => i.priority === 'critical');
      if (criticalInvoices.length > 0) {
        recs.push({
          priority: 'critical',
          text: `${criticalInvoices.length} فواتير حرجة تحتاج تحصيل فوري`,
          action: 'focus_collection'
        });
      }
    }

    // Overdue tasks recommendations
    if (overdueTasks && overdueTasks.length > 0) {
      recs.push({
        priority: 'high',
        text: `${overdueTasks.length} مهام متأخرة تحتاج إكمال`,
        action: 'complete_tasks'
      });
    }

    // Collection rate recommendations
    if (collectionAnalysis && collectionAnalysis.collection_rate < 85) {
      recs.push({
        priority: 'medium',
        text: `نسبة التحصيل ${Math.round(collectionAnalysis.collection_rate)}% - الهدف 85%`,
        action: 'improve_collection'
      });
    }

    return recs;
  }, [unpaidInvoices, overdueTasks, collectionAnalysis]);

  const isLoading = identityLoading || invoicesLoading || tasksLoading || commStatsLoading || collectionLoading;

  return {
    unpaidInvoices,
    overdueTasks,
    communicationStats,
    collectionAnalysis,
    recommendations,
    isLoading,
    stats: {
      totalUnpaid: unpaidInvoices?.length || 0,
      totalUnpaidAmount: unpaidInvoices?.reduce((sum, i) => sum + (i.balance_due || 0), 0) || 0,
      totalOverdueTasks: overdueTasks?.length || 0,
      criticalIssues: (unpaidInvoices?.filter(i => i.priority === 'critical').length || 0) + 
                      (overdueTasks?.filter(t => t.days_overdue > 7).length || 0),
    },
  };
};
