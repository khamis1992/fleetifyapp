import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyMaintenance, PropertyMaintenanceFilters } from '../types';
import { toast } from 'sonner';

export function usePropertyMaintenance(filters?: PropertyMaintenanceFilters) {
  return useQuery({
    queryKey: ['property-maintenance', filters],
    queryFn: async () => {
      let query = supabase
        .from('property_maintenance')
        .select(`
          *,
          properties:property_id (
            id,
            property_name,
            property_name_ar,
            property_code,
            address,
            address_ar,
            property_type
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,title_ar.ilike.%${filters.search}%,maintenance_number.ilike.%${filters.search}%`);
      }

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.maintenance_type) {
        if (Array.isArray(filters.maintenance_type)) {
          query = query.in('maintenance_type', filters.maintenance_type);
        } else {
          query = query.eq('maintenance_type', filters.maintenance_type);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.date_from && filters?.date_to) {
        query = query.gte('requested_date', filters.date_from).lte('requested_date', filters.date_to);
      }

      if (filters?.cost_min && filters?.cost_max) {
        query = query.gte('estimated_cost', filters.cost_min).lte('estimated_cost', filters.cost_max);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching property maintenance:', error);
        throw error;
      }

      return data as PropertyMaintenance[];
    },
    enabled: true,
  });
}

export function usePropertyMaintenanceStats() {
  return useQuery({
    queryKey: ['property-maintenance-stats'],
    queryFn: async () => {
      const { data: maintenance, error } = await supabase
        .from('property_maintenance')
        .select('status, maintenance_type, priority, estimated_cost, actual_cost, property_id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching maintenance stats:', error);
        throw error;
      }

      if (!maintenance) return null;

      const total_maintenance = maintenance.length;
      const pending_maintenance = maintenance.filter(m => m.status === 'pending').length;
      const in_progress_maintenance = maintenance.filter(m => m.status === 'in_progress').length;
      const completed_maintenance = maintenance.filter(m => m.status === 'completed').length;
      const cancelled_maintenance = maintenance.filter(m => m.status === 'cancelled').length;

      const properties_under_maintenance = new Set(
        maintenance.filter(m => m.status === 'in_progress').map(m => m.property_id)
      ).size;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthly_costs = maintenance
        .filter(m => {
          const date = new Date(m.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0);

      const total_cost = maintenance.reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0);
      const average_cost = total_maintenance > 0 ? total_cost / total_maintenance : 0;

      // إحصائيات حسب النوع
      const maintenance_by_type = maintenance.reduce((acc, m) => {
        acc[m.maintenance_type] = (acc[m.maintenance_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // إحصائيات حسب الأولوية
      const maintenance_by_priority = maintenance.reduce((acc, m) => {
        acc[m.priority] = (acc[m.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_maintenance,
        pending_maintenance,
        in_progress_maintenance,
        completed_maintenance,
        cancelled_maintenance,
        properties_under_maintenance,
        total_monthly_cost: monthly_costs,
        average_cost_per_maintenance: average_cost,
        maintenance_by_type,
        maintenance_by_priority,
      };
    },
    enabled: true,
  });
}

export function useCreatePropertyMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenanceData: Partial<PropertyMaintenance>) => {
      // إنشاء رقم الصيانة
      const maintenanceNumber = `MAIN-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('property_maintenance')
        .insert({
          ...maintenanceData,
          maintenance_number: maintenanceNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['property-maintenance-stats'] });
      toast.success('تم إنشاء طلب الصيانة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating maintenance:', error);
      toast.error('فشل في إنشاء طلب الصيانة');
    },
  });
}

export function useUpdatePropertyMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<PropertyMaintenance>) => {
      const { data, error } = await supabase
        .from('property_maintenance')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['property-maintenance-stats'] });
      toast.success('تم تحديث طلب الصيانة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating maintenance:', error);
      toast.error('فشل في تحديث طلب الصيانة');
    },
  });
}

export function useMaintenanceProperties() {
  return useQuery({
    queryKey: ['maintenance-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_maintenance!inner (
            id,
            status,
            maintenance_type,
            priority,
            scheduled_date
          )
        `)
        .eq('property_maintenance.status', 'in_progress')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching maintenance properties:', error);
        throw error;
      }

      return data;
    },
    enabled: true,
  });
}