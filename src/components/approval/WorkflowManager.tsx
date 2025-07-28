import React, { useState } from 'react';
import { Plus, Settings, Play, Pause, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useApprovalWorkflows, RequestSource } from '@/hooks/useApprovalWorkflows';
import { toast } from '@/hooks/use-toast';

const REQUEST_SOURCE_LABELS: Record<RequestSource, { ar: string; en: string }> = {
  payroll: { ar: 'الرواتب', en: 'Payroll' },
  contract: { ar: 'العقود', en: 'Contracts' },
  payment: { ar: 'المدفوعات', en: 'Payments' },
  expense: { ar: 'المصروفات', en: 'Expenses' },
  purchase: { ar: 'المشتريات', en: 'Purchases' },
  leave_request: { ar: 'طلبات الإجازة', en: 'Leave Requests' },
  vehicle_maintenance: { ar: 'صيانة المركبات', en: 'Vehicle Maintenance' },
  budget: { ar: 'الميزانية', en: 'Budget' },
  other: { ar: 'أخرى', en: 'Other' },
};

interface WorkflowManagerProps {
  onCreateWorkflow?: () => void;
  onEditWorkflow?: (workflowId: string) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  onCreateWorkflow,
  onEditWorkflow,
}) => {
  const [selectedSourceType, setSelectedSourceType] = useState<RequestSource | undefined>();
  const { data: workflows, isLoading } = useApprovalWorkflows(selectedSourceType);

  const handleToggleWorkflow = async (workflowId: string, currentStatus: boolean) => {
    try {
      // TODO: Implement toggle workflow status
      toast({
        title: currentStatus ? "تم إيقاف سير العمل" : "تم تفعيل سير العمل",
        description: "تم تحديث حالة سير العمل بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في تحديث سير العمل",
        description: "حدث خطأ أثناء تحديث حالة سير العمل",
        variant: "destructive",
      });
    }
  };

  const getStepsCount = (workflow: any) => {
    if (!workflow.steps || !Array.isArray(workflow.steps)) return 0;
    return workflow.steps.length;
  };

  const getStepsSummary = (workflow: any) => {
    if (!workflow.steps || !Array.isArray(workflow.steps)) return 'لا توجد خطوات';
    
    const stepTypes = workflow.steps.map((step: any) => {
      if (step.approver_type === 'role') return 'دور';
      if (step.approver_type === 'user') return 'مستخدم';
      return 'أي دور';
    });
    
    return stepTypes.join(' ← ');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة سير العمل</h2>
          <p className="text-muted-foreground">
            إنشاء وإدارة قوالب سير الموافقات للعمليات المختلفة
          </p>
        </div>
        <Button onClick={onCreateWorkflow} className="gap-2">
          <Plus className="h-4 w-4" />
          إنشاء سير عمل جديد
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedSourceType === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSourceType(undefined)}
        >
          الكل
        </Button>
        {Object.entries(REQUEST_SOURCE_LABELS).map(([key, label]) => (
          <Button
            key={key}
            variant={selectedSourceType === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSourceType(key as RequestSource)}
          >
            {label.ar}
          </Button>
        ))}
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows?.map((workflow) => (
          <Card key={workflow.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {workflow.workflow_name}
                  </CardTitle>
                  {workflow.workflow_name_ar && (
                    <CardDescription className="text-sm text-muted-foreground">
                      {workflow.workflow_name_ar}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={(checked) => 
                      handleToggleWorkflow(workflow.id, !checked)
                    }
                  />
                  <Badge variant={workflow.is_active ? "default" : "secondary"}>
                    {workflow.is_active ? "نشط" : "معطل"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Source Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">نوع العملية:</span>
                <Badge variant="outline">
                  {REQUEST_SOURCE_LABELS[workflow.source_type]?.ar || workflow.source_type}
                </Badge>
              </div>

              {/* Steps Count */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">عدد الخطوات:</span>
                <span className="font-medium">{getStepsCount(workflow)}</span>
              </div>

              {/* Steps Summary */}
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">مسار الموافقة:</span>
                <p className="text-xs bg-muted p-2 rounded text-center">
                  {getStepsSummary(workflow)}
                </p>
              </div>

              {/* Description */}
              {workflow.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workflow.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onEditWorkflow?.(workflow.id)}
                >
                  <Edit className="h-3 w-3 ml-1" />
                  تحرير
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-3 w-3 ml-1" />
                  إعدادات
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {workflows?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">لا توجد قوالب سير عمل</h3>
              <p className="text-muted-foreground">
                ابدأ بإنشاء أول قالب سير عمل لإدارة عمليات الموافقة
              </p>
            </div>
            <Button onClick={onCreateWorkflow} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء أول سير عمل
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};