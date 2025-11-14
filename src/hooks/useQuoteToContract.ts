import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SalesQuote } from '@/hooks/useSalesQuotes';
import { addDays, addMonths } from 'date-fns';

/**
 * Hook for converting sales quotes to rental contracts
 * Automatically creates a contract from an accepted quote
 */
export const useQuoteToContract = () => {
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  /**
   * Convert a sales quote to a rental contract
   * @param quoteId - The ID of the quote to convert
   * @param vehicleId - The vehicle ID for the rental
   * @param rentalOptions - Additional rental options
   */
  const convertQuoteToContract = async (
    quoteId: string,
    vehicleId: string,
    rentalOptions?: {
      start_date?: string;
      rental_type?: 'daily' | 'weekly' | 'monthly';
      duration?: number;
      insurance_type?: string;
      include_driver?: boolean;
      include_gps?: boolean;
      delivery_required?: boolean;
      delivery_address?: string;
    }
  ): Promise<{ success: boolean; contractId?: string; error?: string }> => {
    try {
      setIsConverting(true);

      // 1. Fetch quote details
      const { data: quote, error: quoteError } = await supabase
        .from('sales_quotes')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      // Validate quote status
      if (quote.status !== 'accepted') {
        throw new Error('Only accepted quotes can be converted to contracts');
      }

      // Validate customer
      if (!quote.customer_id) {
        throw new Error('Quote must have a customer to create a contract');
      }

      // 2. Fetch vehicle details
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (vehicleError) throw vehicleError;
      if (!vehicle) throw new Error('Vehicle not found');

      // Check vehicle availability
      if (vehicle.status !== 'available') {
        throw new Error('Vehicle is not available for rental');
      }

      // 3. Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('User not authenticated');

      // 4. Calculate contract dates and amounts
      const startDate = rentalOptions?.start_date || new Date().toISOString().split('T')[0];
      const rentalType = rentalOptions?.rental_type || 'monthly';
      const duration = rentalOptions?.duration || 1;

      let endDate: string;
      switch (rentalType) {
        case 'daily':
          endDate = addDays(new Date(startDate), duration).toISOString().split('T')[0];
          break;
        case 'weekly':
          endDate = addDays(new Date(startDate), duration * 7).toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          endDate = addMonths(new Date(startDate), duration).toISOString().split('T')[0];
          break;
      }

      // Use quote total as base amount
      const baseAmount = quote.total || 0;
      
      // Calculate additional costs
      let additionalCosts = 0;
      if (rentalOptions?.include_driver) additionalCosts += 500; // Example driver cost
      if (rentalOptions?.include_gps) additionalCosts += 100; // Example GPS cost
      if (rentalOptions?.delivery_required) additionalCosts += 200; // Example delivery cost

      const totalAmount = baseAmount + additionalCosts;
      const securityDeposit = totalAmount * 0.2; // 20% security deposit

      // 5. Generate contract number
      const { data: contractNumber, error: numberError } = await supabase
        .rpc('generate_contract_number', { company_uuid: quote.company_id });

      if (numberError) throw numberError;

      // 6. Create contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: quote.company_id,
          contract_number: contractNumber,
          customer_id: quote.customer_id,
          vehicle_id: vehicleId,
          
          // Contract dates
          start_date: startDate,
          end_date: endDate,
          
          // Rental details
          rental_type: rentalType,
          rental_duration: duration,
          
          // Financial
          total_amount: totalAmount,
          amount_paid: 0,
          amount_remaining: totalAmount,
          security_deposit: securityDeposit,
          security_deposit_paid: 0,
          
          // Status
          status: 'pending_payment',
          
          // Additional services
          insurance_type: rentalOptions?.insurance_type || 'basic',
          include_driver: rentalOptions?.include_driver || false,
          include_gps: rentalOptions?.include_gps || false,
          delivery_required: rentalOptions?.delivery_required || false,
          delivery_address: rentalOptions?.delivery_address,
          
          // Metadata
          notes: `Created from Quote ${quote.quote_number}\n\n${quote.notes || ''}`,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 7. Update vehicle status
      const { error: vehicleUpdateError } = await supabase
        .from('vehicles')
        .update({ status: 'reserved' })
        .eq('id', vehicleId);

      if (vehicleUpdateError) throw vehicleUpdateError;

      // 8. Update quote status
      const { error: quoteUpdateError } = await supabase
        .from('sales_quotes')
        .update({ 
          status: 'accepted',
          notes: `${quote.notes || ''}\n\nConverted to Contract: ${contractNumber}`
        })
        .eq('id', quoteId);

      if (quoteUpdateError) throw quoteUpdateError;

      // 9. Create activity log (if table exists)
      try {
        await supabase
          .from('contract_activities')
          .insert({
            contract_id: contract.id,
            company_id: quote.company_id,
            activity_type: 'contract_created',
            activity_title: 'Contract Created from Quote',
            activity_description: `Contract ${contractNumber} was created from Quote ${quote.quote_number}`,
            created_by: userData.user.id,
          });
      } catch (activityError) {
        // Activity logging is optional, don't fail the whole operation
        console.warn('Could not create activity log:', activityError);
      }

      toast({
        title: 'تم التحويل بنجاح',
        description: `تم إنشاء العقد ${contractNumber} من العرض ${quote.quote_number}`,
      });

      return {
        success: true,
        contractId: contract.id,
      };
    } catch (err: any) {
      console.error('Error converting quote to contract:', err);
      
      const errorMessage = err.message || 'فشل تحويل العرض إلى عقد';
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsConverting(false);
    }
  };

  /**
   * Check if a quote can be converted to a contract
   * @param quote - The quote to check
   */
  const canConvertToContract = (quote: SalesQuote): { canConvert: boolean; reason?: string } => {
    if (quote.status !== 'accepted') {
      return {
        canConvert: false,
        reason: 'Only accepted quotes can be converted',
      };
    }

    if (!quote.customer_id) {
      return {
        canConvert: false,
        reason: 'Quote must have a customer',
      };
    }

    if (!quote.total || quote.total <= 0) {
      return {
        canConvert: false,
        reason: 'Quote must have a valid total amount',
      };
    }

    return { canConvert: true };
  };

  return {
    convertQuoteToContract,
    canConvertToContract,
    isConverting,
  };
};
