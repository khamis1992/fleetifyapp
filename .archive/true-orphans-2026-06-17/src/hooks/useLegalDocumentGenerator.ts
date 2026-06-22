// ============================================================================
// Legal Document Generator Hook
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LegalDocumentTemplate, TemplateVariableData, MissingField, TemplateVariable } from '@/types/legal-cases';

export interface UseLegalDocumentGeneratorOptions {
  customerId?: string;
  companyId?: string;
  vehicleId?: string;
  contractId?: string;
}

/**
 * Hook for legal document templates and generation
 */
export function useLegalDocumentGenerator(options: UseLegalDocumentGeneratorOptions = {}) {
  const { customerId, companyId, vehicleId, contractId } = options;
  const queryClient = useQueryClient();

  // Fetch templates by keys
  const useTemplates = (templateKeys: string[]) => {
    return useQuery({
      queryKey: ['legal-templates', templateKeys],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('legal_document_templates')
          .select('*')
          .in('template_key', templateKeys)
          .eq('is_active', true);

        if (error) throw error;
        return data as LegalDocumentTemplate[];
      },
      enabled: templateKeys.length > 0,
    });
  };

  // Helper to fetch and resolve variables
  const fetchAndResolveVariables = async (
    variables: TemplateVariable[],
    overrides: TemplateVariableData = {}
  ): Promise<TemplateVariableData> => {
    const resolvedData: TemplateVariableData = { ...overrides };

    // Group variables by source to minimize DB calls
    const sources = {
      customer: variables.filter(v => v.source === 'customer'),
      vehicle: variables.filter(v => v.source === 'vehicle'),
      contract: variables.filter(v => v.source === 'contract'),
      company: variables.filter(v => v.source === 'company'),
      user: variables.filter(v => v.source === 'user'),
    };

    // Fetch Customer Data
    if (sources.customer.length > 0 && customerId) {
      // NOTE: Using available columns: national_id (for QID), country (for nationality)
      const { data } = await supabase
        .from('customers')
        .select('first_name_ar, last_name_ar, first_name, last_name, country, national_id, phone, address, city')
        .eq('id', customerId)
        .single();

      if (data) {
        const fullName = `${data.first_name_ar || data.first_name || ''} ${data.last_name_ar || data.last_name || ''}`.trim();
        resolvedData['customer_name'] = fullName;
        resolvedData['person_name'] = fullName;
        resolvedData['nationality'] = data.country || ''; // Map country to nationality
        resolvedData['id_number'] = data.national_id || ''; // Map national_id to id_number
        resolvedData['phone_number'] = data.phone || '';
        resolvedData['customer_address'] = `${data.city || ''} ${data.address || ''}`.trim();
      }
    }

    // Fetch Vehicle Data
    if (sources.vehicle.length > 0 && vehicleId) {
      // Use only existing columns
      const { data } = await supabase
        .from('vehicles')
        .select('make, model, year, plate_number, color, vin')
        .eq('id', vehicleId)
        .single();

      if (data) {
        resolvedData['vehicle_type'] = `${data.make} ${data.model}`;
        resolvedData['plate_number'] = data.plate_number;
        resolvedData['plate_type'] = 'خصوصي'; // Default
        resolvedData['manufacture_year'] = data.year;
        resolvedData['chassis_number'] = data.vin; // Map VIN to chassis number
        resolvedData['vehicle_color'] = data.color;
      }
    }

    // Fetch Contract Data
    if (sources.contract.length > 0 && contractId) {
      const { data } = await supabase
        .from('contracts')
        .select('start_date, end_date, contract_number')
        .eq('id', contractId)
        .single();

      if (data) {
        resolvedData['contract_date'] = data.start_date;
        resolvedData['return_date'] = data.end_date;
        resolvedData['contract_number'] = data.contract_number;
      }
    }

    // Company Data (Defaults or DB)
    if (sources.company.length > 0 && companyId) {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      
      if (data) {
          resolvedData['company_name'] = data.name_ar || data.name || 'شركة العراف لتأجير السيارات';
          resolvedData['commercial_register'] = data.cr_number || '179973';
          resolvedData['company_address'] = data.address || 'أم صلال محمد – الشارع التجاري – مبنى 79 – الطابق الأول – مكتب (2)';
          resolvedData['company_phone'] = data.phone || '31411919';
      }
    }
    
    // User Data (Signatory) - For now using defaults if available or overrides
    // ...

    // Apply defaults for missing values
    variables.forEach(variable => {
      if (resolvedData[variable.name] === undefined && variable.default) {
        if (variable.default === 'today') {
          resolvedData[variable.name] = new Date().toISOString().split('T')[0];
        } else {
          resolvedData[variable.name] = variable.default;
        }
      }
    });

    return resolvedData;
  };

  // Replace variables in text
  const replaceVariables = (text: string, variables: TemplateVariableData): string => {
    let result = text || '';
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
    return result;
  };

  // Validate required fields for a template
  const useValidateFields = (template: LegalDocumentTemplate) => {
    return useQuery({
      queryKey: ['legal-validation', template?.id, customerId, vehicleId, contractId, companyId],
      queryFn: async (): Promise<MissingField[]> => {
        if (!template) return [];
        
        const resolvedData = await fetchAndResolveVariables(template.variables);
        const missing: MissingField[] = [];

        for (const variable of template.variables) {
          if (!variable.required) continue;
          
          const value = resolvedData[variable.name];

          // Check if value is missing
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            missing.push({
              field: variable.name,
              label: variable.label,
              source: variable.source || 'customer',
              requiredFor: [template.name_ar],
            });
          }
        }

        return missing;
      },
      enabled: !!template?.id && !!companyId,
    });
  };

  // Generate document
  const generateDocument = useMutation({
    mutationFn: async ({
      template,
      variables,
    }: {
      template: LegalDocumentTemplate;
      variables: TemplateVariableData;
    }) => {
      if (!companyId) throw new Error('Company ID is required');

      // 1. Fetch and resolve all variables
      const resolvedVariables = await fetchAndResolveVariables(template.variables, variables);

      // 2. Generate content (replace placeholders)
      // Prioritize body_ar if available, otherwise body_template
      const templateBody = (template as any).body_ar || template.body_template;
      const subject = replaceVariables(template.subject_template || '', resolvedVariables);
      const body = replaceVariables(templateBody || '', resolvedVariables);

      // 3. Generate document number
      const { data: docNumberData } = await supabase
        .rpc('generate_document_number', {
          p_company_id: companyId,
          p_type: template.template_key,
        });

      const documentNumber = docNumberData;

      // 4. Create generation record
      const { data, error } = await supabase
        .from('legal_document_generations')
        .insert({
          template_id: template.id,
          company_id: companyId,
          document_type: template.template_key,
          document_number: documentNumber,
          subject: subject,
          body: body,
          content: body, // Populate required 'content' field
          variables_data: resolvedVariables,
          status: 'generated',
          approval_status: 'pending',
          related_customer_id: customerId,
          related_vehicle_id: vehicleId,
          related_contract_id: contractId,
          // file_type: 'pdf', // Removed as it doesn't exist in schema
        })
        .select('*, template:legal_document_templates(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-generations'] });
    },
  });

  // Fetch customer contracts with vehicles (all contracts, regardless of status)
  const useCustomerContracts = (customerId: string) => {
    return useQuery({
      queryKey: ['customer-contracts-with-vehicles', customerId, companyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            contract_number,
            start_date,
            end_date,
            status,
            vehicle:vehicles!vehicle_id(
              id,
              make,
              model,
              year,
              plate_number,
              color
            )
          `)
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!customerId && !!companyId,
    });
  };

  return {
    useTemplates,
    useValidateFields,
    generateDocument,
    useCustomerContracts,
  };
}
