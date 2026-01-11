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
      // إعادة المحاولة للحصول على companyId إذا لم يكن متاحاً
      let currentCompanyId = companyId;
      let currentUser = user;
      
      // انتظار قليل إذا لم تكن البيانات جاهزة
      if (!currentUser || !currentCompanyId) {
        console.log('⏳ Waiting for auth context...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // جلب الجلسة مباشرة من Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          currentUser = sessionData.session.user as any;
          // جلب companyId من profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', sessionData.session.user.id)
            .single();
          currentCompanyId = profile?.company_id || null;
        }
      }

      if (!currentUser || !currentCompanyId) {
        console.error('❌ Auth check failed:', { hasUser: !!currentUser, hasCompanyId: !!currentCompanyId });
        return {
          success: false,
          error: 'المستخدم غير مسجل أو لم يتم اختيار شركة',
        };
      }
      
      console.log('✅ Auth verified:', { userId: currentUser.id, companyId: currentCompanyId });

      if (file.type !== 'application/pdf') {
        return {
          success: false,
          error: 'يُسمح فقط بملفات PDF',
        };
      }

      try {
        // Step 1: Upload file to Supabase storage with progress tracking
        onProgress?.(5);

        // Use timestamp + random string for storage path (Supabase doesn't support Arabic in paths)
        // Original filename is preserved in the database record
        const fileExtension = file.name.split('.').pop() || 'pdf';
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const fileName = `signed-agreements/${currentCompanyId}/${uniqueId}.${fileExtension}`;

        // Helper function for upload with retry
        const uploadWithRetry = async (maxRetries = 3): Promise<{ success: boolean; error?: string }> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`📤 Upload attempt ${attempt}/${maxRetries} for ${file.name}`);
            
            // Get fresh session for each attempt
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            if (!accessToken) {
              return { success: false, error: 'جلسة المستخدم غير صالحة، يرجى إعادة تسجيل الدخول' };
            }

            const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/contract-documents/${fileName}`;
            
            const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
              const xhr = new XMLHttpRequest();
              
              xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  // Map upload progress from 5% to 55%
                  const uploadProgress = 5 + (event.loaded / event.total) * 50;
                  onProgress?.(Math.round(uploadProgress));
                }
              });

              xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve({ success: true });
                } else {
                  let errorMessage = 'فشل في رفع الملف';
                  try {
                    const response = JSON.parse(xhr.responseText);
                    errorMessage = response.error || response.message || errorMessage;
                  } catch {
                    // Ignore JSON parse error
                  }
                  resolve({ success: false, error: errorMessage });
                }
              });

              xhr.addEventListener('error', () => {
                resolve({ success: false, error: 'فشل الاتصال بالخادم' });
              });

              xhr.addEventListener('timeout', () => {
                resolve({ success: false, error: 'انتهت مهلة الرفع' });
              });

              xhr.open('POST', uploadUrl, true);
              xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
              xhr.setRequestHeader('x-upsert', 'false');
              xhr.setRequestHeader('Cache-Control', '3600');
              // 5 minutes timeout for large files
              xhr.timeout = 300000;
              xhr.send(file);
            });

            if (result.success) {
              return result;
            }

            // إذا فشل وليس آخر محاولة، انتظر ثم أعد المحاولة
            if (attempt < maxRetries) {
              console.warn(`⚠️ Retry ${attempt}/${maxRetries} failed: ${result.error}`);
              await new Promise(r => setTimeout(r, 2000 * attempt)); // تأخير متزايد
              onProgress?.(5); // إعادة ضبط التقدم
            } else {
              return result;
            }
          }
          return { success: false, error: 'فشلت جميع المحاولات' };
        };

        const uploadResult = await uploadWithRetry(3);

        if (!uploadResult.success) {
          console.error('Storage upload error after retries:', uploadResult.error);
          return {
            success: false,
            error: `فشل في رفع الملف: ${uploadResult.error}`,
          };
        }

        onProgress?.(60);

        // Step 2: Create contract_documents record
        const { data: document, error: dbError } = await supabase
          .from('contract_documents')
          .insert({
            company_id: currentCompanyId,
            contract_id: null, // Will be linked after matching
            document_type: 'signed_contract',
            document_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: 'application/pdf',
            uploaded_by: currentUser.id,
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
   * Match uploaded agreement to contract/customer/vehicle using GLM-4.6 AI
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
      // إعادة المحاولة للحصول على companyId إذا لم يكن متاحاً
      let currentCompanyId = companyId;
      
      if (!currentCompanyId) {
        console.log('⏳ [MATCH] Waiting for company context...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // جلب الجلسة مباشرة من Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', sessionData.session.user.id)
            .single();
          currentCompanyId = profile?.company_id || null;
        }
      }

      if (!currentCompanyId) {
        console.error('❌ [MATCH] Company ID not found');
        return {
          success: false,
          error: 'لم يتم اختيار شركة',
        };
      }

      console.log('✅ [MATCH] Company verified:', currentCompanyId);

      try {
        onProgress?.(10);

        // Use GLM-4.6 AI to analyze filename
        console.log('🤖 [MATCH] Starting AI-powered filename analysis...');
        const filenameAnalysis = await analyzeFilenameWithAI(fileName);
        console.log('🤖 [MATCH] AI analysis result:', filenameAnalysis);

        onProgress?.(30);

        // Search for matching contract
        let contractMatch: MatchData | null = null;

        // Strategy 1: Search by contract number (exact match)
        if (filenameAnalysis.contractNumber) {
          console.log('🔍 [MATCH] Searching by contract number:', filenameAnalysis.contractNumber);
          
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
            .eq('company_id', currentCompanyId)
            .eq('contract_number', filenameAnalysis.contractNumber)
            .single();

          if (contract) {
            console.log('✅ [MATCH] Found contract by number:', contract.contract_number);
            contractMatch = {
              contractId: contract.id,
              contractNumber: contract.contract_number,
              customerId: contract.customer_id,
              customerName: getCustomerName(contract.customer),
              vehicleId: contract.vehicle_id,
              vehiclePlate: contract.vehicle?.plate_number,
              confidence: filenameAnalysis.confidence,
            };
          }
        }

        // Strategy 2: Search by agreement number pattern in contract_number or description
        if (!contractMatch && filenameAnalysis.agreementNumber) {
          console.log('🔍 [MATCH] Searching by agreement number:', filenameAnalysis.agreementNumber);
          
          const { data: contracts } = await supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              description,
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
            .eq('company_id', currentCompanyId)
            .or(`contract_number.ilike.%${filenameAnalysis.agreementNumber}%,description.ilike.%${filenameAnalysis.agreementNumber}%`)
            .limit(1);

          if (contracts && contracts.length > 0) {
            const contract = contracts[0];
            console.log('✅ [MATCH] Found contract by agreement number:', contract.contract_number);
            contractMatch = {
              contractId: contract.id,
              contractNumber: contract.contract_number,
              customerId: contract.customer_id,
              customerName: getCustomerName(contract.customer),
              vehicleId: contract.vehicle_id,
              vehiclePlate: contract.vehicle?.plate_number,
              confidence: filenameAnalysis.confidence * 0.9,
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
            .eq('company_id', currentCompanyId)
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

// Z.AI API Configuration - Using GLM-4.6 Model (same as AI Chat Assistant)
const ZAI_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const ZAI_API_KEY = '136e9f29ddd445c0a5287440f6ab13e0.DSO2qKJ4AiP1SRrH';
const MODEL = 'glm-4.6';

/**
 * Use GLM-4.6 AI to analyze filename and extract identifiers
 */
async function analyzeFilenameWithAI(fileName: string): Promise<{
  contractNumber?: string;
  customerName?: string;
  plateNumber?: string;
  agreementNumber?: string;
  confidence: number;
}> {
  // ⚡ استخدام التحليل المحلي مباشرة بدون AI لتجنب التوقف
  // يمكن تفعيل AI لاحقاً عندما يكون API مستقر
  console.log('🔍 [LOCAL] Analyzing filename locally:', fileName);
  return analyzeFilenameFallback(fileName);

  /* --- AI DISABLED TEMPORARILY ---
  try {
    console.log('🤖 [AI] Analyzing filename with GLM-4.6:', fileName);
    
    const systemPrompt = `أنت نظام ذكي لتحليل أسماء ملفات العقود الموقعة في شركة تأجير سيارات.
مهمتك استخراج المعلومات التالية من اسم الملف:
1. رقم العقد (contract_number): عادة يكون رقم من 3-6 أرقام
2. رقم الاتفاقية (agreement_number): قد يكون بصيغة LTO أو AGR متبوع برقم
3. اسم العميل (customer_name): إذا كان موجوداً
4. رقم اللوحة (plate_number): رقم من 5-7 أرقام

أمثلة:
- "2767 - LTO202429.pdf" → contract_number: "2767", agreement_number: "LTO202429"
- "CONTRACT-123-Ahmed Ali.pdf" → contract_number: "123", customer_name: "Ahmed Ali"
- "12345 Toyota Camry.pdf" → plate_number: "12345"
- "محمد أحمد - عقد 456.pdf" → contract_number: "456", customer_name: "محمد أحمد"

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"contract_number": "...", "agreement_number": "...", "customer_name": "...", "plate_number": "...", "confidence": 0.0-1.0}
إذا لم تجد قيمة، اتركها null.`;

    // استخدام AbortController للتحكم في timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    try {
      const response = await fetch(ZAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `حلل اسم الملف التالي: "${fileName}"` }
          ],
          temperature: 0.1,
          max_tokens: 256,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('⚠️ [AI] API returned error:', response.status);
        return analyzeFilenameFallback(fileName);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn('⚠️ [AI] No content in response');
        return analyzeFilenameFallback(fileName);
      }

      console.log('🤖 [AI] Raw response:', content);

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ [AI] Parsed result:', parsed);
        
        return {
          contractNumber: parsed.contract_number || undefined,
          agreementNumber: parsed.agreement_number || undefined,
          customerName: parsed.customer_name || undefined,
          plateNumber: parsed.plate_number || undefined,
          confidence: parsed.confidence || 0.8,
        };
      }

      return analyzeFilenameFallback(fileName);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Error).name === 'AbortError') {
        console.warn('⚠️ [AI] Request timed out, using fallback');
      } else {
        console.warn('⚠️ [AI] Fetch error:', fetchError);
      }
      return analyzeFilenameFallback(fileName);
    }
  } catch (error) {
    console.error('❌ [AI] Error analyzing filename:', error);
    return analyzeFilenameFallback(fileName);
  }
  --- AI DISABLED TEMPORARILY --- */
}

/**
 * Fallback: Analyze filename without AI
 */
function analyzeFilenameFallback(fileName: string): {
  contractNumber?: string;
  customerName?: string;
  plateNumber?: string;
  agreementNumber?: string;
  confidence: number;
} {
  const result: {
    contractNumber?: string;
    customerName?: string;
    plateNumber?: string;
    agreementNumber?: string;
    confidence: number;
  } = { confidence: 0.5 };

  // Remove extension and normalize
  const name = fileName.replace(/\.pdf$/i, '').trim();

  // Extract agreement number (LTO, AGR patterns)
  const agreementMatch = name.match(/(?:LTO|AGR|AGMT)\d{4,}/i);
  if (agreementMatch) {
    result.agreementNumber = agreementMatch[0].toUpperCase();
  }

  // Extract contract number (e.g., CONTRACT-123, C123, 12345)
  const contractMatch = name.match(/(?:contract|عقد|c)?[^\w]?\d{3,6}(?!\d)/i);
  if (contractMatch) {
    const num = contractMatch[0].replace(/[^0-9]/g, '');
    if (num.length <= 6) {
      result.contractNumber = num;
    }
  }

  // Extract potential customer name (Arabic or English words)
  const words = name.split(/[\s_-]+/).filter(w => w.length > 2);
  const nameWords = words.filter(w =>
    /^[\u0600-\u06FFa-zA-Z]+$/.test(w) &&
    !/\d/.test(w) &&
    !w.match(/^(contract|lto|agr|agmt)$/i) &&
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

