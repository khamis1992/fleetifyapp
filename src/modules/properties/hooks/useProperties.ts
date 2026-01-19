import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property, PropertySearchFilters } from '../types';

export function useProperties(filters?: PropertySearchFilters) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select(`
          *,
          property_owners!fk_properties_owner (
            id,
            full_name,
            full_name_ar,
            phone,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(`property_name.ilike.%${filters.search}%,property_name_ar.ilike.%${filters.search}%,property_code.ilike.%${filters.search}%`);
      }

      if (filters?.property_type) {
        if (Array.isArray(filters.property_type)) {
          query = query.in('property_type', filters.property_type);
        } else {
          query = query.eq('property_type', filters.property_type);
        }
      }

      if (filters?.property_status) {
        if (Array.isArray(filters.property_status)) {
          query = query.in('property_status', filters.property_status);
        } else {
          query = query.eq('property_status', filters.property_status);
        }
      }

      if (filters?.area) {
        query = query.or(`address.ilike.%${filters.area}%,address_ar.ilike.%${filters.area}%`);
      }

      if (filters?.min_rent && filters?.max_rent) {
        query = query.gte('rental_price', filters.min_rent).lte('rental_price', filters.max_rent);
      } else if (filters?.min_rent) {
        query = query.gte('rental_price', filters.min_rent);
      } else if (filters?.max_rent) {
        query = query.lte('rental_price', filters.max_rent);
      }

      if (filters?.min_area && filters?.max_area) {
        query = query.gte('area_sqm', filters.min_area).lte('area_sqm', filters.max_area);
      } else if (filters?.min_area) {
        query = query.gte('area_sqm', filters.min_area);
      } else if (filters?.max_area) {
        query = query.lte('area_sqm', filters.max_area);
      }

      if (filters?.rooms_count) {
        query = query.eq('bedrooms', filters.rooms_count);
      }

      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters?.furnished !== undefined) {
        query = query.eq('furnished', filters.furnished);
      }

      if (filters?.has_parking !== undefined) {
        query = query.gt('parking_spaces', 0);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching properties:', error);
        throw error;
      }

      return data as Property[];
    },
    enabled: true,
  });
}

export function usePropertiesStats() {
  return useQuery({
    queryKey: ['properties-stats'],
    queryFn: async () => {
      // جلب إحصائيات العقارات
      const { data: properties, error } = await supabase
        .from('properties')
        .select('property_type, property_status, rental_price, area_sqm, address')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching properties stats:', error);
        throw error;
      }

      if (!properties) return null;

      // حساب الإحصائيات
      const total_properties = properties.length;
      const available_properties = properties.filter(p => p.property_status === 'available').length;
      const rented_properties = properties.filter(p => p.property_status === 'rented').length;
      const for_sale_properties = properties.filter(p => p.property_status === 'for_sale').length;
      const maintenance_properties = properties.filter(p => p.property_status === 'maintenance').length;

      const total_monthly_rent = properties
        .filter(p => p.property_status === 'rented' && p.rental_price)
        .reduce((sum, p) => sum + (p.rental_price || 0), 0);

      const total_yearly_rent = total_monthly_rent * 12;
      const occupancy_rate = total_properties > 0 ? (rented_properties / total_properties) * 100 : 0;

      const total_area = properties.reduce((sum, p) => sum + (p.area_sqm || 0), 0);
      const average_rent_per_sqm = total_area > 0 ? total_monthly_rent / total_area : 0;

      // إحصائيات حسب النوع
      const properties_by_type = properties.reduce((acc, property) => {
        acc[property.property_type] = (acc[property.property_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // إحصائيات حسب المنطقة
      const properties_by_area = properties.reduce((acc, property) => {
        const area = property.address || 'غير محدد';
        acc[area] = (acc[area] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_properties,
        available_properties,
        rented_properties,
        for_sale_properties,
        maintenance_properties,
        total_monthly_rent,
        total_yearly_rent,
        occupancy_rate,
        average_rent_per_sqm,
        properties_by_type,
        properties_by_area,
      };
    },
    enabled: true,
  });
}