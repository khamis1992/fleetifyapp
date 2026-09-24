import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesOpportunities, useSalesPipelineMetrics } from "@/hooks/useSalesOpportunities";
import { useSalesLeads } from "@/hooks/useSalesLeads";
import { useSalesQuotes } from "@/hooks/useSalesQuotes";
import { useSalesOrders } from "@/hooks/useSalesOrders";
import { BarChart3, TrendingUp, DollarSign, Users, Target, FileText, ShoppingCart, ArrowUp, ArrowDown } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const SalesAnalytics = () => {
  const [dateRange, setDateRange] = useState("30");

  const { data: opportunities, isLoading: opportunitiesLoading } = useSalesOpportunities({ is_active: true });
  const { data: pipelineMetrics } = useSalesPipelineMetrics();
  const { data: leads, isLoading: leadsLoading } = useSalesLeads({ is_active: true });
  const { data: quotes, isLoading: quotesLoading } = useSalesQuotes({ is_active: true });
  const { data: orders, isLoading: ordersLoading } = useSalesOrders({ is_active: true });

  const isLoading = opportunitiesLoading || leadsLoading || quotesLoading || ordersLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  // Calculate metrics
  const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
  const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  const leadConversionRate = leads && opportunities
    ? ((opportunities.length / (leads.length || 1)) * 100).toFixed(1)
    : "0.0";

  const quoteAcceptanceRate = quotes
    ? ((quotes.filter(q => q.status === 'accepted').length / (quotes.length || 1)) * 100).toFixed(1)
    : "0.0";

  const avgDealSize = opportunities?.length
    ? (opportunities.reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) / opportunities.length)
    : 0;

  const wonOpportunities = opportunities?.filter(o => o.stage === 'won') || [];
  const winRate = opportunities?.length
    ? ((wonOpportunities.length / opportunities.length) * 100).toFixed(1)
    : "0.0";

  // Sales by stage
  const stageData = [
    { stage: 'عميل محتمل', count: opportunities?.filter(o => o.stage === 'lead').length || 0, value: opportunities?.filter(o => o.stage === 'lead').reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) || 0 },
    { stage: 'مؤهل', count: opportunities?.filter(o => o.stage === 'qualified').length || 0, value: opportunities?.filter(o => o.stage === 'qualified').reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) || 0 },
    { stage: 'عرض', count: opportunities?.filter(o => o.stage === 'proposal').length || 0, value: opportunities?.filter(o => o.stage === 'proposal').reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) || 0 },
    { stage: 'تفاوض', count: opportunities?.filter(o => o.stage === 'negotiation').length || 0, value: opportunities?.filter(o => o.stage === 'negotiation').reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) || 0 },
    { stage: 'ناجح', count: wonOpportunities.length, value: wonOpportunities.reduce((sum, opp) => sum + (opp.estimated_value ?? 0), 0) },
  ];

  const maxValue = Math.max(...stageData.map(s => s.value), 1);

  const dwMetrics = [
    { label: 'إجمالي الإيرادات', value: formatCurrency(deliveredRevenue), hint: 'طلبيات مسلّمة', accent: true },
    { label: 'معدل الفوز', value: `${winRate}%`, hint: 'فرص ناجحة من الإجمالي', accent: false },
    { label: 'متوسط حجم الصفقة', value: formatCurrency(avgDealSize), hint: 'قيمة الفرصة المتوسطة', accent: false },
    { label: 'معدل قبول العروض', value: `${quoteAcceptanceRate}%`, hint: 'عروض قُبلت', accent: false },
  ];

  const conversionRows = [
    { label: 'عميل محتمل → فرصة', value: leadConversionRate },
    {
      label: 'فرصة → عرض سعر',
      value: quotes?.length && opportunities?.length
        ? ((quotes.length / opportunities.length) * 100).toFixed(1)
        : "0.0",
    },
    {
      label: 'عرض سعر → طلبية',
      value: orders?.length && quotes?.length
        ? ((orders.length / quotes.length) * 100).toFixed(1)
        : "0.0",
    },
    { label: 'معدل الفوز الإجمالي', value: winRate },
  ];

  const summaryCards = [
    {
      title: 'العملاء المحتملون',
      icon: Users,
      total: leads?.length || 0,
      rows: [
        { label: 'جديد', count: leads?.filter(l => l.status === 'new').length || 0, tone: 'is-info' },
        { label: 'مؤهل', count: leads?.filter(l => l.status === 'qualified').length || 0, tone: 'is-ok' },
        { label: 'تم التحويل', count: leads?.filter(l => l.status === 'converted').length || 0, tone: 'is-neutral' },
      ],
    },
    {
      title: 'عروض الأسعار',
      icon: FileText,
      total: quotes?.length || 0,
      rows: [
        { label: 'مسودة', count: quotes?.filter(q => q.status === 'draft').length || 0, tone: 'is-neutral' },
        { label: 'مرسل', count: quotes?.filter(q => q.status === 'sent').length || 0, tone: 'is-info' },
        { label: 'مقبول', count: quotes?.filter(q => q.status === 'accepted').length || 0, tone: 'is-ok' },
      ],
    },
    {
      title: 'الطلبيات',
      icon: ShoppingCart,
      total: orders?.length || 0,
      rows: [
        { label: 'قيد المعالجة', count: orders?.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status ?? '')).length || 0, tone: 'is-warn' },
        { label: 'تم الشحن', count: orders?.filter(o => o.status === 'shipped').length || 0, tone: 'is-info' },
        { label: 'تم التسليم', count: orders?.filter(o => o.status === 'delivered').length || 0, tone: 'is-ok' },
      ],
    },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> التحليلات
            </div>
            <h1>تحليلات المبيعات</h1>
            <p>مؤشرات الأداء ومعدلات التحويل وتوزيع الفرص.</p>
          </div>
          <div className="dw-header-tools">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="wk-field" style={{ width: 150 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {isLoading ? (
          <PageLoading label="جاري تحميل التحليلات…" />
        ) : (
          <>
            <section className="dw-metrics" aria-label="مؤشرات الأداء">
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
              <PagePanel number="01" title="قمع المبيعات" subtitle="توزيع الفرص حسب المراحل" className="wk-panel-main">
                <div className="wk-metric-rows">
                  {stageData.map((stage) => (
                    <div key={stage.stage} className="wk-metric-row">
                      <div>
                        <span>{stage.stage}</span>
                        <strong>{formatCurrency(stage.value)}</strong>
                      </div>
                      <span className="wk-badge is-neutral">{stage.count} فرصة</span>
                      <div className="dw-forecast-track" style={{ marginInlineStart: 12, flex: 1 }}>
                        <i
                          style={{
                            display: 'block',
                            height: '100%',
                            borderRadius: 5,
                            background: 'var(--dw-green)',
                            width: `${(stage.value / maxValue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </PagePanel>

              <PagePanel number="02" title="معدلات التحويل" subtitle="أداء عملية المبيعات خطوة بخطوة" className="wk-panel-side">
                <div className="wk-metric-rows">
                  {conversionRows.map((row) => (
                    <div key={row.label} className="wk-metric-row">
                      <div>
                        <span>{row.label}</span>
                        <strong>{row.value}%</strong>
                      </div>
                      <div className="dw-forecast-track" style={{ marginInlineStart: 12, flex: 1 }}>
                        <i
                          style={{
                            display: 'block',
                            height: '100%',
                            borderRadius: 5,
                            background: 'var(--dw-green)',
                            width: `${Math.min(parseFloat(String(row.value)), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </PagePanel>

              {summaryCards.map((card, index) => (
                <PagePanel
                  key={card.title}
                  number={`0${index + 3}`}
                  title={card.title}
                  subtitle={`إجمالي: ${card.total}`}
                  className="wk-panel-side"
                >
                  <div className="wk-legend">
                    {card.rows.map(row => (
                      <div key={row.label} className="wk-legend-row">
                        <span>{row.label}</span>
                        <strong>{row.count}</strong>
                        <small>{card.total ? Math.round((row.count / card.total) * 100) : 0}%</small>
                      </div>
                    ))}
                  </div>
                </PagePanel>
              ))}

              <PagePanel number="06" title="أعلى الفرص قيمة" subtitle="أكبر 5 فرص بيعية حسب القيمة المتوقعة" className="wk-panel-full">
                {!opportunities || opportunities.length === 0 ? (
                  <PageEmpty icon={Target} message="لا توجد فرص بيعية لعرضها" />
                ) : (
                  <div className="wk-metric-rows">
                    {[...opportunities]
                      .sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
                      .slice(0, 5)
                      .map((opp, index) => (
                        <div key={opp.id} className="wk-metric-row">
                          <div>
                            <span>
                              <bdi>{opp.opportunity_name_ar || opp.opportunity_name}</bdi>
                            </span>
                            <strong>{formatCurrency(opp.estimated_value ?? 0)}</strong>
                          </div>
                          <span className="wk-badge is-neutral">{index + 1}</span>
                          <span className="wk-badge is-info" style={{ marginInlineStart: 8 }}>احتمالية {opp.probability}%</span>
                        </div>
                      ))}
                  </div>
                )}
              </PagePanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;