/**
 * Document Templates Hook
 * Hook for managing legal document templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentTemplate,
  DocumentCategory,
  TemplatesResponse,
} from '@/types/legal-document-generator';

// ============================================================================
// Query Keys
// ============================================================================

export const documentTemplateKeys = {
  all: ['document-templates'] as const,
  lists: () => [...documentTemplateKeys.all, 'list'] as const,
  list: (category?: DocumentCategory) =>
    [...documentTemplateKeys.lists(), category] as const,
  details: () => [...documentTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentTemplateKeys.details(), id] as const,
};

// ============================================================================
// Fetch Templates
// ============================================================================

/**
 * Fetch all active document templates
 */
export async function fetchDocumentTemplates(category?: DocumentCategory): Promise<DocumentTemplate[]> {
  let query = supabase
    .from('legal_document_templates')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name_ar', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  // Parse variables JSON
  return (data || []).map((template) => ({
    ...template,
    variables: template.variables || [],
  }));
}

/**
 * Fetch a single template by ID
 */
export async function fetchDocumentTemplate(id: string): Promise<DocumentTemplate> {
  const { data, error } = await supabase
    .from('legal_document_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return {
    ...data,
    variables: data.variables || [],
  };
}

/**
 * Fetch a template by key
 */
export async function fetchDocumentTemplateByKey(key: string): Promise<DocumentTemplate> {
  const { data, error } = await supabase
    .from('legal_document_templates')
    .select('*')
    .eq('template_key', key)
    .eq('is_active', true)
    .single();

  if (error) {
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return {
    ...data,
    variables: data.variables || [],
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for fetching document templates
 */
export function useDocumentTemplates(category?: DocumentCategory) {
  return useQuery({
    queryKey: documentTemplateKeys.list(category),
    queryFn: () => fetchDocumentTemplates(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single template
 */
export function useDocumentTemplate(id: string) {
  return useQuery({
    queryKey: documentTemplateKeys.detail(id),
    queryFn: () => fetchDocumentTemplate(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching a template by key
 */
export function useDocumentTemplateByKey(key: string) {
  return useQuery({
    queryKey: ['document-template', 'key', key],
    queryFn: () => fetchDocumentTemplateByKey(key),
    enabled: !!key,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for fetching templates by category
 */
export function useTemplatesByCategory() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['document-templates', 'by-category'],
    queryFn: async () => {
      const categories: DocumentCategory[] = ['insurance', 'traffic', 'general', 'customer'];
      const result: Record<DocumentCategory, DocumentTemplate[]> = {} as any;

      for (const category of categories) {
        const templates = await fetchDocumentTemplates(category);
        result[category] = templates;
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutations (Admin Only)
// ============================================================================

/**
 * Create a new template (admin only)
 */
export async function createDocumentTemplate(
  template: Partial<DocumentTemplate>
): Promise<DocumentTemplate> {
  const { data, error } = await supabase
    .from('legal_document_templates')
    .insert({
      template_key: template.template_key,
      name_ar: template.name_ar,
      name_en: template.name_en || null,
      category: template.category,
      description_ar: template.description_ar || null,
      description_en: template.description_en || null,
      subject_template: template.subject_template || null,
      body_template: template.body_template,
      footer_template: template.footer_template || null,
      variables: template.variables || [],
      is_active: template.is_active ?? true,
      requires_approval: template.requires_approval ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return data;
}

/**
 * Update a template (admin only)
 */
export async function updateDocumentTemplate(
  id: string,
  updates: Partial<DocumentTemplate>
): Promise<DocumentTemplate> {
  const { data, error } = await supabase
    .from('legal_document_templates')
    .update({
      ...(updates.template_key && { template_key: updates.template_key }),
      ...(updates.name_ar && { name_ar: updates.name_ar }),
      ...(updates.name_en !== undefined && { name_en: updates.name_en }),
      ...(updates.category && { category: updates.category }),
      ...(updates.description_ar !== undefined && { description_ar: updates.description_ar }),
      ...(updates.description_en !== undefined && { description_en: updates.description_en }),
      ...(updates.subject_template !== undefined && { subject_template: updates.subject_template }),
      ...(updates.body_template && { body_template: updates.body_template }),
      ...(updates.footer_template !== undefined && { footer_template: updates.footer_template }),
      ...(updates.variables && { variables: updates.variables }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      ...(updates.requires_approval !== undefined && { requires_approval: updates.requires_approval }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data;
}

/**
 * Delete a template (admin only)
 */
export async function deleteDocumentTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('legal_document_templates')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for creating a template
 */
export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocumentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() });
    },
  });
}

/**
 * Hook for updating a template
 */
export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DocumentTemplate> }) =>
      updateDocumentTemplate(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentTemplateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a template
 */
export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocumentTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentTemplateKeys.lists() });
    },
  });
}
