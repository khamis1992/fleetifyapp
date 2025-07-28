import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyScope } from '@/hooks/useCompanyScope';
import { toast } from '@/hooks/use-toast';

export type RequestSource = 
  | 'payroll' 
  | 'contract' 
  | 'payment' 
  | 'expense' 
  | 'purchase'
  | 'leave_request' 
  | 'vehicle_maintenance' 
  | 'budget' 
  | 'other';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  workflow_name: string;
  workflow_name_ar?: string;
  description?: string;
  source_type: RequestSource;
  conditions: any;
  steps: any;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStep {
  order: number;
  approver_type: 'role' | 'user' | 'any_role';
  approver_value: string;
  required: boolean;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  workflow_id: string;
  request_number: string;
  title: string;
  description?: string;
  source_type: RequestSource;
  source_id?: string;
  requested_by: string;
  total_amount: number;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  current_step_order: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  workflow?: any;
  requester?: any;
}

export interface WorkflowConfiguration {
  id: string;
  company_id: string;
  source_type: RequestSource;
  default_workflow_id?: string;
  auto_assign_enabled: boolean;
  notification_settings: Record<string, any>;
  escalation_rules: Record<string, any>;
}

// Hook لجلب قوالب سير العمل
export const useApprovalWorkflows = (sourceType?: RequestSource) => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['approval-workflows', companyId, sourceType],
    queryFn: async () => {
      let query = supabase
        .from('approval_workflows')
        .select('*')
        .eq('company_id', companyId)
        .order('workflow_name');

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching approval workflows:', error);
        throw error;
      }

      return data as ApprovalWorkflow[];
    },
    enabled: !!companyId,
  });
};

// Hook لجلب طلبات الموافقة
export const useApprovalRequests = (filters?: {
  status?: ApprovalStatus;
  source_type?: RequestSource;
  requested_by?: string;
}) => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['approval-requests', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          workflow:approval_workflows(workflow_name, workflow_name_ar),
          requester:profiles!approval_requests_requested_by_fkey(
            user_id,
            full_name,
            email
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.source_type) {
        query = query.eq('source_type', filters.source_type);
      }
      if (filters?.requested_by) {
        query = query.eq('requested_by', filters.requested_by);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching approval requests:', error);
        throw error;
      }

      return data as ApprovalRequest[];
    },
    enabled: !!companyId,
  });
};

// Hook لإنشاء قالب سير عمل جديد
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompanyScope();

  return useMutation({
    mutationFn: async (workflow: Omit<ApprovalWorkflow, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('approval_workflows')
        .insert({
          ...workflow,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast({
        title: "تم إنشاء قالب سير العمل",
        description: "تم إنشاء قالب سير العمل بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error creating workflow:', error);
      toast({
        title: "خطأ في إنشاء قالب سير العمل",
        description: "حدث خطأ أثناء إنشاء قالب سير العمل",
        variant: "destructive",
      });
    },
  });
};

// Hook لتحديث قالب سير عمل
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...workflow }: Partial<ApprovalWorkflow> & { id: string }) => {
      const { data, error } = await supabase
        .from('approval_workflows')
        .update(workflow)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast({
        title: "تم تحديث قالب سير العمل",
        description: "تم تحديث قالب سير العمل بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error updating workflow:', error);
      toast({
        title: "خطأ في تحديث قالب سير العمل",
        description: "حدث خطأ أثناء تحديث قالب سير العمل",
        variant: "destructive",
      });
    },
  });
};

// Hook لإنشاء طلب موافقة جديد
export const useCreateApprovalRequest = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompanyScope();

  return useMutation({
    mutationFn: async (request: {
      workflow_id: string;
      title: string;
      description?: string;
      source_type: RequestSource;
      source_id?: string;
      total_amount?: number;
      priority?: ApprovalPriority;
      metadata?: Record<string, any>;
    }) => {
      // أولاً، الحصول على رقم الطلب
      const { data: requestNumber, error: numberError } = await supabase
        .rpc('generate_approval_request_number', { company_id_param: companyId });

      if (numberError) throw numberError;

      // إنشاء طلب الموافقة
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          ...request,
          company_id: companyId,
          request_number: requestNumber,
          requested_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // الحصول على قالب سير العمل لإنشاء الخطوات
      const { data: workflow, error: workflowError } = await supabase
        .from('approval_workflows')
        .select('steps')
        .eq('id', request.workflow_id)
        .single();

      if (workflowError) throw workflowError;

      // إنشاء خطوات الموافقة
      const workflowSteps = workflow.steps as any[];
      const steps = workflowSteps.map((step, index) => ({
        request_id: data.id,
        step_order: index + 1,
        approver_type: step.approver_type,
        approver_value: step.approver_value,
      }));

      const { error: stepsError } = await supabase
        .from('approval_steps')
        .insert(steps);

      if (stepsError) throw stepsError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast({
        title: "تم إنشاء طلب الموافقة",
        description: "تم إنشاء طلب الموافقة بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error creating approval request:', error);
      toast({
        title: "خطأ في إنشاء طلب الموافقة",
        description: "حدث خطأ أثناء إنشاء طلب الموافقة",
        variant: "destructive",
      });
    },
  });
};

// Hook لجلب إعدادات سير العمل
export const useWorkflowConfigurations = () => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['workflow-configurations', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_configurations')
        .select(`
          *,
          default_workflow:approval_workflows(workflow_name, workflow_name_ar)
        `)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching workflow configurations:', error);
        throw error;
      }

      return data as WorkflowConfiguration[];
    },
    enabled: !!companyId,
  });
};