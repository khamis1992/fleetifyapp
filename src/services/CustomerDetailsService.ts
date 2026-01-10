/**
 * Customer Details Service
 * 
 * Service موحد للوصول إلى تفاصيل العملاء
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CustomerDetails {
  id: string;
  companyId: string;
  customerType: 'individual' | 'company';
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  companyName?: string;
  companyNameAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  preferredContactMethod: 'phone' | 'whatsapp' | 'email';
}

class CustomerDetailsService {
  async getCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          id,
          company_id,
          customer_type,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_name,
          company_name_ar,
          phone,
          phone_2,
          email,
          preferred_contact_method
        `)
        .eq('id', customerId)
        .single();

      if (!customer) return null;

      return {
        id: customer.id,
        companyId: customer.company_id,
        customerType: customer.customer_type,
        firstName: customer.first_name_ar || customer.first_name || '',
        lastName: customer.last_name_ar || customer.last_name || '',
        firstNameAr: customer.first_name_ar,
        lastNameAr: customer.last_name_ar,
        companyName: customer.company_name_ar || customer.company_name || '',
        companyNameAr: customer.company_name_ar,
        phone: customer.phone,
        phone2: customer.phone_2,
        email: customer.email,
        preferredContactMethod: customer.preferred_contact_method
      };
    } catch (error) {
      logger.error('Failed to fetch customer details', { customerId, error });
      return null;
    }
  }

  async updateCustomerDetails(
    customerId: string,
    updates: Partial<Omit<CustomerDetails, 'id' | 'companyId' | 'customerType'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      logger.error('Failed to update customer details', { customerId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  async logCustomerContact(
    customerId: string,
    action: string,
    method: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase
        .from('customer_contact_log')
        .insert({
          customer_id: customerId,
          action,
          method,
          sent_at: new Date().toISOString(),
          successful: true
        });

      return { success: true };
    } catch (error) {
      logger.error('Failed to log customer contact', { customerId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }
}

export const customerDetailsService = new CustomerDetailsService();
