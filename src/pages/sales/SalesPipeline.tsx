import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSalesOpportunities, useUpdateOpportunityStage, useSalesPipelineMetrics, type SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { Plus, TrendingUp, DollarSign, Target, Award } from "lucide-react";
import { AddOpportunityForm } from "@/components/sales/AddOpportunityForm";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const STAGES = [
  { id: 'lead', name: 'عميل محتمل', tone: 'is-neutral' },
  { id: 'qualified', name: 'مؤهل', tone: 'is-info' },
  { id: 'proposal', name: 'عرض سعر', tone: 'is-warn' },
  { id: 'negotiation', name: 'تفاوض', tone: 'is-warn' },
  { id: 'won', name: 'مغلق - ناجح', tone: 'is-ok' },
  { id: 'lost', name: 'مغلق - فاشل', tone: 'is-risk' },
];

const SalesPipeline = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: opportunities, isLoading } = useSalesOpportunities({ is_active: true });
  const { data: metrics } = useSalesPipelineMetrics();
  const updateStage = useUpdateOpportunityStage();

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities?.filter(opp => opp.stage === stage) || [];
  };

  const handleDragStart = (e: React.DragEvent, opportunity: SalesOpportunity) => {
    e.dataTransfer.setData('opportunityId', opportunity.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const opportunityId = e.dataTransfer.getData('opportunityId');

    if (opportunityId) {
      await updateStage.mutateAsync({ id: opportunityId, stage: targetStage });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  const dwMetrics = [
    { label: 'إجمالي القيمة', value: formatCurrency(metrics?.total_pipeline_value || 0), hint: 'قيمة جميع الفرص النشطة', accent: true },
    { label: 'الفرص النشطة', value: opportunities?.length || 0, hint: 'فرصة بيعية نشطة', accent: false },
    { label: 'صفقات ناجحة', value: metrics?.won_count || 0, hint: formatCurrency(metrics?.won_value || 0), accent: false },
    { label: 'متوسط القيمة', value: formatCurrency(metrics?.avg_opportunity_value || 0), hint: 'متوسط قيمة الفرصة', accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> خط الأنابيب
            </div>
            <h1>خط أنابيب المبيعات</h1>
            <p>متابعة الفرص البيعية ومراحلها من التأهيل إلى الإغلاق.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsDialogOpen(true)}>
              <Plus size={17} />
              فرصة جديدة
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات المبيعات">
          {dwMetrics.map((metric) => (
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
            title="مراحل خط الأنابيب"
            subtitle="اسحب الفرصة وأفلتها لنقلها بين المراحل"
            className="wk-panel-full"
          >
            {isLoading ? (
              <PageLoading label="جاري تحميل الفرص…" />
            ) : !opportunities?.length ? (
              <PageEmpty icon={Target} message="لا توجد فرص بيعية بعد">
                <button type="button" className="dw-button" onClick={() => setIsDialogOpen(true)}>
                  <Plus size={16} />
                  إضافة فرصة جديدة
                </button>
              </PageEmpty>
            ) : (
              <div className="sp-pipeline-grid">
                {STAGES.map((stage) => {
                  const stageOpportunities = getOpportunitiesByStage(stage.id);
                  const stageValue = stageOpportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

                  return (
                    <div
                      key={stage.id}
                      className="sp-pipeline-column"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage.id)}
                    >
                      <div className="sp-pipeline-column-head">
                        <div className="sp-pipeline-column-title">
                          <h3>{stage.name}</h3>
                          <span className={`wk-badge ${stage.tone}`}>{stageOpportunities.length}</span>
                        </div>
                        <small>{formatCurrency(stageValue)}</small>
                      </div>
                      <div className="sp-pipeline-cards">
                        {stageOpportunities.map((opportunity) => (
                          <button
                            key={opportunity.id}
                            type="button"
                            draggable
                            onDragStart={(e) => handleDragStart(e, opportunity)}
                            className="sp-pipeline-card"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            <strong><bdi>{opportunity.opportunity_name}</bdi></strong>
                            {opportunity.opportunity_name_ar && <span>{opportunity.opportunity_name_ar}</span>}
                            <div className="sp-pipeline-card-meta">
                              <b>{formatCurrency(opportunity.estimated_value || 0)}</b>
                              <span className="wk-badge is-neutral">{opportunity.probability}%</span>
                            </div>
                            {opportunity.expected_close_date && (
                              <small>الإغلاق المتوقع: {new Date(opportunity.expected_close_date).toLocaleDateString('en-GB')}</small>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="dw-panel-foot">
              <TrendingUp size={14} />
              <span>الفرص النشطة فقط تظهر هنا — الفرص المعلّقة تُدار من قائمة الفرص.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة فرصة بيعية جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات الفرصة البيعية الجديدة
            </DialogDescription>
          </DialogHeader>
          <AddOpportunityForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPipeline;