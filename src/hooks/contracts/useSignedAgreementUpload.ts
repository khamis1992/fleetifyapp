import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface MatchData {
  contractId?: string;
  contractNumber?: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  confidence?: number;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface MatchResult {
  success: boolean;
  matchData?: MatchData;
  error?: string;
}

/**
 * Custom hook for uploading and matching signed agreement PDFs
 *
 * Features:
 * - Upload PDF files to Supabase storage
 * - Create contract_documents records
 * - AI-powered matching to contracts/customers/vehicles
 * - Manual re-matching capability
 * - Delete uploaded files
 */
export function useSignedAgreementUpload() {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  /**
   * Upload signed agreement PDF to Supabase storage
   * and create contract_documents record
   */
  const uploadSignedAgreementMutation = useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }): Promise<UploadResult> => {
      if (!user || !companyId) {
        return {
          success: false,
          error: 'المستخدم غير مسجل أو لم يتم اختيار شركة',
        };
      }

      if (file.type !== 'application/pdf') {
        return {
          success: false,
          error: 'يُسمح فقط بملفات PDF',
        };
      }

      try {
        // Step 1: Upload file to Supabase storage
        onProgress?.(10);

        // Use timestamp + random string for storage path (Supabase doesn't support Arabic in paths)
        // Original filename is preserved in the database record
        const fileExtension = file.name.split('.').pop() || 'pdf';
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const fileName = `signed-agreements/${companyId}/${uniqueId}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from('contract-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          return {
            success: false,
            error: `فشل في رفع الملف: ${uploadError.message}`,
          };
        }

        onProgress?.(60);

        // Step 2: Create contract_documents record
        const { data: document, error: dbError } = await supabase
          .from('contract_documents')
          .insert({
            company_id: companyId,
            contract_id: null, // Will be linked after matching
            document_type: 'signed_contract',
            document_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: 'application/pdf',
            uploaded_by: user.id,
            is_required: false,
            notes: 'Uploaded via signed agreement upload page',
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);

          // Rollback: Delete uploaded file
          await supabase.storage.from('contract-documents').remove([fileName]);

          return {
            success: false,
            error: `فشل في إنشاء سجل المستند: ${dbError.message}`,
          };
        }

        onProgress?.(100);

        return {
          success: true,
          documentId: document.id,
        };

      } catch (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'فشل في رفع الملف',
        };
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
    },
  });

  /**
   * Match uploaded agreement to contract/customer/vehicle using AI
   */
  const matchAgreementMutation = useMutation({
    mutationFn: async ({
      documentId,
      fileName,
      onProgress,
    }: {
      documentId: string;
      fileName: string;
      onProgress?: (progress: number) => void;
    }): Promise<MatchResult> => {
      if (!companyId) {
        return {
          success: false,
          error: 'لم يتم اختيار شركة',
        };
      }

      try {
        onProgress?.(10);

        // Extract potential identifiers from filename
        // Format examples:
        // - "CONTRACT-123-Ahmed Ali.pdf"
        // - "Ahmed Ali CONTRACT-123.pdf"
        // - "12345 Toyota Camry.pdf" (plate number)
        const filenameAnalysis = analyzeFilename(fileName);

        onProgress?.(30);

        // Search for matching contract
        let contractMatch: MatchData | null = null;

        if (filenameAnalysis.contractNumber) {
          // Search by contract number
          const { data: contract } = await supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              customer_id,
              customer:customers!inner(
                id,
                first_name_ar,
                first_name,
                last_name_ar,
                last_name,
                company_name_ar,
                company_name
              ),
              vehicle_id,
              vehicle:vehicles!inner(
                id,
                plate_number
              )
            `)
            .eq('company_id', companyId)
            .eq('contract_number', filenameAnalysis.contractNumber)
            .single();

          if (contract) {
            contractMatch = {
              contractId: contract.id,
              contractNumber: contract.contract_number,
              customerId: contract.customer_id,
              customerName: getCustomerName(contract.customer),
              vehicleId: contract.vehicle_id,
              vehiclePlate: contract.vehicle?.plate_number,
              confidence: 0.95,
            };
          }
        }

        onProgress?.(60);

        // If no contract match, try searching by customer name using AI fuzzy matching
        if (!contractMatch && filenameAnalysis.customerName) {
          // Use PostgreSQL fuzzy matching function with Arabic normalization
          const { data: fuzzyResults } = await supabase.rpc('find_customer_by_name_fuzzy', {
            p_company_id: companyId,
            p_search_name: filenameAnalysis.customerName,
            p_min_similarity: 0.4, // 40% minimum similarity threshold
          });

          const customers = fuzzyResults?.map((r: { customer_id: string; customer_name: string; similarity_score: number }) => ({
            id: r.customer_id,
            name: r.customer_name,
            confidence: r.similarity_score,
          })) || [];

          if (customers && customers.length > 0) {
            const bestMatch = customers[0];
            
            // Get contracts for this customer
            const { data: customerContracts } = await supabase
              .from('contracts')
              .select(`
                id,
                contract_number,
                vehicle_id,
                vehicle:vehicles!inner(id, plate_number)
              `)
              .eq('customer_id', bestMatch.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1);

            if (customerContracts && customerContracts.length > 0) {
              contractMatch = {
                contractId: customerContracts[0].id,
                contractNumber: customerContracts[0].contract_number,
                customerId: bestMatch.id,
                customerName: bestMatch.name,
                vehicleId: customerContracts[0].vehicle_id,
                vehiclePlate: customerContracts[0].vehicle?.plate_number,
                confidence: bestMatch.confidence, // Use actual AI similarity score
              };
            } else {
              // Customer found but no active contract - still return customer match
              contractMatch = {
                customerId: bestMatch.id,
                customerName: bestMatch.name,
                confidence: bestMatch.confidence,
              };
            }
          }
        }

        onProgress?.(80);

        // If still no match, try searching by vehicle plate
        if (!contractMatch && filenameAnalysis.plateNumber) {
          const { data: vehicleContracts } = await supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              customer_id,
              customer:customers!inner(
                id,
                first_name_ar,
                first_name,
                last_name_ar,
                last_name,
                company_name_ar,
                company_name
              ),
              vehicle_id,
              vehicle:vehicles!inner(id, plate_number)
            `)
            .eq('company_id', companyId)
            .eq('vehicles.plate_number', filenameAnalysis.plateNumber)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

          if (vehicleContracts && vehicleContracts.length > 0) {
            contractMatch = {
              contractId: vehicleContracts[0].id,
              contractNumber: vehicleContracts[0].contract_number,
              customerId: vehicleContracts[0].customer_id,
              customerName: getCustomerName(vehicleContracts[0].customer),
              vehicleId: vehicleContracts[0].vehicle_id,
              vehiclePlate: vehicleContracts[0].vehicle?.plate_number,
              confidence: 0.85,
            };
          }
        }

        onProgress?.(90);

        // Update document with match data if found
        if (contractMatch && contractMatch.contractId) {
          const { error: updateError } = await supabase
            .from('contract_documents')
            .update({
              contract_id: contractMatch.contractId,
              notes: `Matched via AI with confidence: ${contractMatch.confidence}`,
            })
            .eq('id', documentId);

          if (updateError) {
            console.error('Error updating document:', updateError);
          }
        }

        onProgress?.(100);

        return {
          success: true,
          matchData: contractMatch || undefined,
        };

      } catch (error) {
        console.error('Match error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'فشل في مطابقة العقد',
        };
      }
    },
  });

  /**
   * Delete uploaded agreement
   */
  const deleteAgreement = useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      // Get document info
      const { data: document } = await supabase
        .from('contract_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      // Delete file from storage
      if (document?.file_path) {
        await supabase.storage.from('contract-documents').remove([document.file_path]);
      }

      // Delete database record
      const { error } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['contract-documents'] });
    },
  });

  // Wrapper functions for easier API
  const uploadSignedAgreement = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    return uploadSignedAgreementMutation.mutateAsync({ file, onProgress });
  };

  const matchAgreement = async (
    documentId: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<MatchResult> => {
    return matchAgreementMutation.mutateAsync({ documentId, fileName, onProgress });
  };

  return {
    uploadSignedAgreement,
    isUploading: uploadSignedAgreementMutation.isPending,
    matchAgreement,
    isMatching: matchAgreementMutation.isPending,
    deleteAgreement: deleteAgreement.mutateAsync,
    isDeleting: deleteAgreement.isPending,
  };
}

/**
 * Analyze filename to extract potential identifiers
 */
function analyzeFilename(fileName: string): {
  contractNumber?: string;
  customerName?: string;
  plateNumber?: string;
} {
  const result: {
    contractNumber?: string;
    customerName?: string;
    plateNumber?: string;
  } = {};

  // Remove extension and normalize
  const name = fileName.replace(/\.pdf$/i, '').trim();

  // Extract contract number (e.g., CONTRACT-123, C123, 12345)
  const contractMatch = name.match(/(?:contract|عقد|c)?[^\w]?\d{3,}/i);
  if (contractMatch) {
    result.contractNumber = contractMatch[0].replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  }

  // Extract potential customer name (Arabic or English words)
  // Look for patterns like "Ahmed Ali", "محمد أحمد", etc.
  const words = name.split(/[\s_-]+/).filter(w => w.length > 2);
  const nameWords = words.filter(w =>
    /^[\u0600-\u06FFa-zA-Z]+$/.test(w) && // Only letters
    !/\d/.test(w) && // No numbers
    !w.match(/^contract$/i) &&
    !w.match(/^عقد$/)
  );

  if (nameWords.length >= 1 && nameWords.length <= 4) {
    result.customerName = nameWords.join(' ');
  }

  // Extract Qatari plate number (e.g., 1234567)
  const plateMatch = name.match(/\b\d{5,7}\b/);
  if (plateMatch) {
    result.plateNumber = plateMatch[0];
  }

  return result;
}

/**
 * Get customer name from customer object
 */
function getCustomerName(customer: {
  first_name_ar?: string | null;
  first_name?: string | null;
  last_name_ar?: string | null;
  last_name?: string | null;
  company_name_ar?: string | null;
  company_name?: string | null;
  customer_type?: string | null;
}): string {
  if (customer.customer_type === 'company') {
    return customer.company_name_ar || customer.company_name || 'شركة غير محددة';
  }

  const firstName = customer.first_name_ar || customer.first_name || '';
  const lastName = customer.last_name_ar || customer.last_name || '';

  return `${firstName} ${lastName}`.trim() || 'عميل غير محدد';
}

