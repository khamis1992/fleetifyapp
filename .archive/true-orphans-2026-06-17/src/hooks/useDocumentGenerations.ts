/**
 * Document Generations Hook
 * Hook for managing legal document generations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { renderTemplate } from '@/utils/legal-document-template-engine';
import type {
  DocumentGeneration,
  DocumentGenerationView,
  GeneratedDocument,
  DocumentStatus,
  ApprovalStatus,
  DocumentListItem,
  DocumentHistoryFilters,
  GenerateResponse,
  TemplateRenderContext,
} from '@/types/legal-document-generator';

// ============================================================================
// Query Keys
// ============================================================================

export const documentGenerationKeys = {
  all: ['document-generations'] as const,
  lists: () => [...documentGenerationKeys.all, 'list'] as const,
  list: (filters?: DocumentHistoryFilters) =>
    [...documentGenerationKeys.lists(), filters] as const,
  details: () => [...documentGenerationKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentGenerationKeys.details(), id] as const,
};

// ============================================================================
// Fetch Generations
// ============================================================================

/**
 * Fetch document generations with optional filters
 */
export async function fetchDocumentGenerations(
  filters?: DocumentHistoryFilters
): Promise<DocumentGenerationView[]> {
  let query = supabase
    .from('legal_document_generations_view')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString());
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString());
  }

  if (filters?.search) {
    query = query.or(`document_number.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,template_name_ar.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single document generation by ID
 */
export async function fetchDocumentGeneration(id: string): Promise<DocumentGeneration> {
  const { data, error } = await supabase
    .from('legal_document_generations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch generation: ${error.message}`);
  }

  return data;
}

/**
 * Fetch document generations list
 */
export async function fetchDocumentList(
  filters?: DocumentHistoryFilters
): Promise<DocumentListItem[]> {
  const generations = await fetchDocumentGenerations(filters);

  return generations.map((g) => ({
    id: g.id,
    document_number: g.document_number,
    document_type: g.document_type,
    template_name: g.template_name_ar || g.template_name_en || g.document_type,
    status: g.status,
    created_at: g.created_at,
    recipient_name: g.recipient_name,
  }));
}

// ============================================================================
// Generate Document
// ============================================================================

/**
 * Generate a new document
 */
export async function generateDocument(params: {
  templateId: string;
  companyId: string;
  variablesData: Record<string, any>;
  recipientName?: string;
  recipientEntity?: string;
  recipientAddress?: string;
  relatedVehicleId?: string;
  relatedContractId?: string;
  relatedCustomerId?: string;
  context?: TemplateRenderContext;
}): Promise<GenerateResponse> {
  // First, fetch the template
  const { data: template, error: templateError } = await supabase
    .from('legal_document_templates')
    .select('*')
    .eq('id', params.templateId)
    .single();

  if (templateError) {
    throw new Error(`Failed to fetch template: ${templateError.message}`);
  }

  // Render the document
  const renderResult = renderTemplate(
    {
      ...template,
      variables: template.variables || [],
    },
    params.variablesData,
    params.context
  );

  if (renderResult.errors.length > 0) {
    throw new Error(`Template validation failed: ${renderResult.errors.join(', ')}`);
  }

  // Generate document number
  const { data: numberData } = await supabase
    .rpc('generate_document_number', {
      p_company_id: params.companyId,
      p_type: template.template_key,
    });

  const documentNumber = numberData || null;

  // Create the generation record
  const { data: generation, error: generationError } = await supabase
    .from('legal_document_generations')
    .insert({
      template_id: params.templateId,
      company_id: params.companyId,
      document_type: template.template_key,
      document_number: documentNumber,
      subject: renderResult.subject,
      body: renderResult.body,
      variables_data: params.variablesData,
      status: template.requires_approval ? 'draft' : 'generated',
      approval_status: template.requires_approval ? 'pending' : 'approved',
      recipient_name: params.recipientName || null,
      recipient_entity: params.recipientEntity || null,
      recipient_address: params.recipientAddress || null,
      related_vehicle_id: params.relatedVehicleId || null,
      related_contract_id: params.relatedContractId || null,
      related_customer_id: params.relatedCustomerId || null,
    })
    .select(`
      *,
      template:legal_document_templates(*)
    `)
    .single();

  if (generationError) {
    throw new Error(`Failed to create generation: ${generationError.message}`);
  }

  return {
    generation,
    document: {
      subject: renderResult.subject,
      body: renderResult.body,
      documentNumber: documentNumber || undefined,
      previewHtml: renderResult.html,
    },
  };
}

// ============================================================================
// Update Document Status
// ============================================================================

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus
): Promise<DocumentGeneration> {
  const { data, error } = await supabase
    .from('legal_document_generations')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }

  return data;
}

/**
 * Approve a document
 */
export async function approveDocument(
  id: string
): Promise<DocumentGeneration> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('legal_document_generations')
    .update({
      approval_status: 'approved',
      status: 'generated',
      approved_by: userData.user?.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve document: ${error.message}`);
  }

  return data;
}

/**
 * Reject a document
 */
export async function rejectDocument(
  id: string,
  reason: string
): Promise<DocumentGeneration> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('legal_document_generations')
    .update({
      approval_status: 'rejected',
      status: 'rejected',
      approved_by: userData.user?.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reject document: ${error.message}`);
  }

  return data;
}

/**
 * Mark document as sent
 */
export async function markDocumentAsSent(id: string): Promise<DocumentGeneration> {
  return updateDocumentStatus(id, 'sent');
}

/**
 * Delete a document (draft only)
 */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('legal_document_generations')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for fetching document generations
 */
export function useDocumentGenerations(filters?: DocumentHistoryFilters) {
  return useQuery({
    queryKey: documentGenerationKeys.list(filters),
    queryFn: () => fetchDocumentGenerations(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching document list
 */
export function useDocumentList(filters?: DocumentHistoryFilters) {
  return useQuery({
    queryKey: ['document-list', filters],
    queryFn: () => fetchDocumentList(filters),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single generation
 */
export function useDocumentGeneration(id: string) {
  return useQuery({
    queryKey: documentGenerationKeys.detail(id),
    queryFn: () => fetchDocumentGeneration(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for generating a document
 */
export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}

/**
 * Hook for approving a document
 */
export function useApproveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveDocument,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}

/**
 * Hook for rejecting a document
 */
export function useRejectDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectDocument(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}

/**
 * Hook for marking document as sent
 */
export function useMarkDocumentAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markDocumentAsSent,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}

/**
 * Hook for updating document status
 */
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) =>
      updateDocumentStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentGenerationKeys.lists() });
    },
  });
}
