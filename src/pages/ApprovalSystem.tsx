import React, { useState } from 'react';
import { Settings, CheckSquare, BarChart3, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowManager } from '@/components/approval/WorkflowManager';
import { WorkflowForm } from '@/components/approval/WorkflowForm';
import { ApprovalRequestsList } from '@/components/approval/ApprovalRequestsList';
import { useApprovalRequests } from '@/hooks/useApprovalWorkflows';

export default function ApprovalSystem() {
  const [activeTab, setActiveTab] = useState('requests');
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  
  // جلب إحصائيات سريعة
  const { data: pendingRequests } = useApprovalRequests({ status: 'pending' });
  const { data: allRequests } = useApprovalRequests();

  const stats = [
    {
      title: 'الطلبات المعلقة',
      value: pendingRequests?.length || 0,
      description: 'طلبات تحتاج موافقة',
      icon: CheckSquare,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'إجمالي الطلبات',
      value: allRequests?.length || 0,
      description: 'جميع الطلبات هذا الشهر',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'متوسط وقت الموافقة',
      value: '2.5',
      description: 'أيام',
      icon: Settings,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setIsWorkflowDialogOpen(true);
  };

  const handleEditWorkflow = (workflowId: string) => {
    setSelectedWorkflow({ id: workflowId });
    setIsWorkflowDialogOpen(true);
  };

  const handleViewRequest = (requestId: string) => {
    console.log('View request:', requestId);
  };

  const handleWorkflowSuccess = () => {
    setIsWorkflowDialogOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">نظام الموافقات</h1>
          <p className="text-muted-foreground">
            إدارة شاملة لجميع عمليات الموافقة في المؤسسة
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 ml-1" />
            الإعدادات العامة
          </Button>
          <Button size="sm" onClick={handleCreateWorkflow}>
            <Plus className="h-4 w-4 ml-1" />
            إنشاء سير عمل
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            طلبات الموافقة
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <Settings className="h-4 w-4" />
            سير العمل
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            التقارير والتحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <ApprovalRequestsList onViewRequest={handleViewRequest} />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <WorkflowManager 
            onCreateWorkflow={handleCreateWorkflow}
            onEditWorkflow={handleEditWorkflow}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>التقارير والتحليلات</CardTitle>
              <CardDescription>
                تحليل أداء نظام الموافقات والإحصائيات التفصيلية
              </CardDescription>
            </CardHeader>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">قريباً: لوحة التحليلات</h3>
                  <p className="text-muted-foreground">
                    ستتوفر تقارير مفصلة عن أداء نظام الموافقات وإحصائيات الاستخدام
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Form Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow ? 'تعديل سير العمل' : 'إنشاء سير عمل جديد'}
            </DialogTitle>
          </DialogHeader>
          <WorkflowForm
            workflow={selectedWorkflow}
            onSuccess={handleWorkflowSuccess}
            onCancel={() => setIsWorkflowDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}