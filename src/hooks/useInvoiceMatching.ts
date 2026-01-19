import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedInvoiceData, InvoiceMatchResult } from '@/types/invoiceOCR';

export const useInvoiceMatching = () => {
  const [isMatching, setIsMatching] = useState(false);

  const findMatches = async (
    extractedData: ExtractedInvoiceData,
    companyId: string
  ): Promise<InvoiceMatchResult> => {
    setIsMatching(true);

    try {
      const matches: InvoiceMatchResult = {
        confidence: 0,
        match_reasons: [],
        alternatives: []
      };

      // 1. Try to match by contract number
      if (extractedData.contract_number) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, contract_number, customer_id, customers(id, first_name_ar, last_name_ar, company_name_ar)')
          .eq('company_id', companyId)
          .ilike('contract_number', `%${extractedData.contract_number}%`)
          .limit(5);

        if (contracts && contracts.length > 0) {
          const bestMatch = contracts[0];
          matches.contract_id = bestMatch.id;
          matches.contract_number = bestMatch.contract_number;
          matches.customer_id = bestMatch.customer_id;
          matches.customer_name = bestMatch.customers?.company_name_ar || 
            `${bestMatch.customers?.first_name_ar || ''} ${bestMatch.customers?.last_name_ar || ''}`.trim();
          matches.confidence = 90;
          matches.match_reasons.push('تطابق رقم العقد');

          // Add alternatives
          contracts.slice(1).forEach(contract => {
            matches.alternatives.push({
              contract_id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              customer_name: contract.customers?.company_name_ar || 
                `${contract.customers?.first_name_ar || ''} ${contract.customers?.last_name_ar || ''}`.trim(),
              confidence: 80,
              reason: 'رقم عقد مشابه'
            });
          });
        }
      }

      // 2. Try to match by customer name if no contract match
      if (matches.confidence < 50 && extractedData.customer_name) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, first_name_ar, last_name_ar, company_name_ar, phone')
          .eq('company_id', companyId)
          .or(`first_name_ar.ilike.%${extractedData.customer_name}%,last_name_ar.ilike.%${extractedData.customer_name}%,company_name_ar.ilike.%${extractedData.customer_name}%`)
          .limit(5);

        if (customers && customers.length > 0) {
          const bestMatch = customers[0];
          matches.customer_id = bestMatch.id;
          matches.customer_name = bestMatch.company_name_ar || 
            `${bestMatch.first_name_ar || ''} ${bestMatch.last_name_ar || ''}`.trim();
          matches.confidence = Math.max(matches.confidence, 70);
          matches.match_reasons.push('تطابق اسم العميل');

          // Try to find active contracts for this customer
          const { data: customerContracts } = await supabase
            .from('contracts')
            .select('id, contract_number')
            .eq('company_id', companyId)
            .eq('customer_id', bestMatch.id)
            .eq('status', 'active')
            .limit(3);

          if (customerContracts && customerContracts.length > 0) {
            customerContracts.forEach(contract => {
              matches.alternatives.push({
                customer_id: bestMatch.id,
                customer_name: matches.customer_name,
                contract_id: contract.id,
                contract_number: contract.contract_number,
                confidence: 75,
                reason: 'عقد نشط للعميل المطابق'
              });
            });
          }

          // Add other customer matches as alternatives
          customers.slice(1).forEach(customer => {
            matches.alternatives.push({
              customer_id: customer.id,
              customer_name: customer.company_name_ar || 
                `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim(),
              confidence: 60,
              reason: 'اسم عميل مشابه'
            });
          });
        }
      }

      // 3. Try to match by amount and date range
      if (matches.confidence < 50 && extractedData.total_amount && extractedData.invoice_date) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, contract_number, monthly_amount, customer_id, customers(id, first_name_ar, last_name_ar, company_name_ar)')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .gte('monthly_amount', extractedData.total_amount * 0.8)
          .lte('monthly_amount', extractedData.total_amount * 1.2)
          .limit(5);

        if (contracts && contracts.length > 0) {
          contracts.forEach((contract, index) => {
            const confidence = index === 0 ? 65 : 55;
            const matchData = {
              contract_id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              customer_name: contract.customers?.company_name_ar || 
                `${contract.customers?.first_name_ar || ''} ${contract.customers?.last_name_ar || ''}`.trim(),
              confidence,
              reason: 'مبلغ مشابه للقسط الشهري'
            };

            if (index === 0 && matches.confidence < confidence) {
              matches.contract_id = matchData.contract_id;
              matches.contract_number = matchData.contract_number;
              matches.customer_id = matchData.customer_id;
              matches.customer_name = matchData.customer_name;
              matches.confidence = confidence;
              matches.match_reasons.push(matchData.reason);
            } else {
              matches.alternatives.push(matchData);
            }
          });
        }
      }

      return matches;

    } catch (error) {
      console.error('Error finding matches:', error);
      return {
        confidence: 0,
        match_reasons: ['فشل البحث عن مطابقات'],
        alternatives: []
      };
    } finally {
      setIsMatching(false);
    }
  };

  return {
    findMatches,
    isMatching
  };
};
