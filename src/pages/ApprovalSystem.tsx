import { useState } from 'react';
import { Settings, CheckSquare, BarChart3, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkflowManager } from '@/components/approval/WorkflowManager';
import { WorkflowForm } from '@/components/approval/WorkflowForm';
import { ApprovalRequestsList } from '@/components/approval/ApprovalRequestsList';
import { useApprovalRequests } from '@/hooks/useApprovalWorkflows';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

export default function ApprovalSystem() {
  const [activeTab, setActiveTab] = useState('requests');
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  const { data: pendingRequests } = useApprovalRequests({ status: 'pending' });
  const { data: allRequests } = useApprovalRequests();

  const { data: analyticsData } = useQuery({
    queryKey: ['approval-analytics'],
    queryFn: async () => {
      const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
        supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
      ]);

      return {
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        rejected: rejectedResult.count || 0
      };
    }
  });

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setIsWorkflowDialogOpen(true);
  };

  const handleEditWorkflow = (workflowId: string) => {
    setSelectedWorkflow({ id: workflowId });
    setIsWorkflowDialogOpen(true);
  };

  const handleViewRequest = (requestId: string) => {
    // TODO: Implement view request functionality
  };

  const handleWorkflowSuccess = () => {
    setIsWorkflowDialogOpen(false);
    setSelectedWorkflow(null);
  };

  const tabs = [
    { value: 'requests', label: 'طلبات الموافقة', count: pendingRequests?.length || 0 },
    { value: 'workflows', label: 'سير العمل' },
    { value: 'analytics', label: 'التقارير والتحليلات' },
  ];

  const metrics = [
    { label: 'الطلبات المعلقة', value: pendingRequests?.length || 0, hint: 'طلبات تحتاج موافقة', accent: true },
    { label: 'إجمالي الطلبات', value: allRequests?.length || 0, hint: 'جميع الطلبات المسجلة', accent: false },
    { label: 'طلبات موافق عليها', value: analyticsData?.approved || 0, hint: 'أُقرت بنجاح', accent: false },
    { label: 'طلبات مرفوضة', value: analyticsData?.rejected || 0, hint: 'لم تُقبل', accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> نظام الموافقات
            </div>
            <h1>نظام الموافقات</h1>
            <p>إدارة شاملة لعمليات الموافقة وسير العمل في المؤسسة.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button" onClick={handleCreateWorkflow}>
              <Settings size={17} />
              الإعدادات
            </button>
            <button type="button" className="dw-button dw-button-primary" onClick={handleCreateWorkflow}>
              <Plus size={17} />
              إنشاء سير عمل
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات الموافقات">
          {metrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="نظام الموافقات"
            subtitle="طلبات الموافقة وسير العمل والتحليلات في مكان واحد"
            className="wk-panel-full"
            action={
              <div className="dw-filters" role="group" aria-label="أقسام الموافقات">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={activeTab === tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                    {tab.count !== undefined && <span>{tab.count}</span>}
                  </button>
                ))}
              </div>
            }
          >
            {activeTab === 'requests' && <ApprovalRequestsList onViewRequest={handleViewRequest} />}

            {activeTab === 'workflows' && (
              <WorkflowManager
                onCreateWorkflow={handleCreateWorkflow}
                onEditWorkflow={handleEditWorkflow}
              />
            )}

            {activeTab === 'analytics' && (
              <div className="wk-summary-grid" style={{ padding: 24 }}>
                <div className="wk-summary-tile is-warn">
                  <small>طلبات معلقة</small>
                  <strong>{analyticsData?.pending || 0}</strong>
                </div>
                <div className="wk-summary-tile is-ok">
                  <small>طلبات موافق عليها</small>
                  <strong>{analyticsData?.approved || 0}</strong>
                </div>
                <div className="wk-summary-tile is-risk">
                  <small>طلبات مرفوضة</small>
                  <strong>{analyticsData?.rejected || 0}</strong>
                </div>
              </div>
            )}
            <div className="dw-panel-foot">
              <CheckSquare size={14} />
              <span>راجع الطلبات المعلقة أولاً — هي الأكثر حسماً لاستمرار العمليات.</span>
            </div>
          </PagePanel>
        </div>
      </div>

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