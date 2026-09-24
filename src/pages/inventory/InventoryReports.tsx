import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useInventoryValuationReport,
  useInventoryAgingReport,
  useInventoryTurnoverReport,
  useStockLevelAlerts,
  useInventoryValuationSummary,
  useInventoryAgingSummary,
  useInventoryTurnoverSummary,
  useStockAlertSummary,
} from "@/hooks/useInventoryReports";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Clock } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#2f7966', '#8ba674', '#d5ad69', '#b86d50', '#4a707c'];

const alertTones: Record<string, string> = {
  "نفذ المخزون": "is-risk",
  "أقل من الحد الأدنى": "is-warn",
  "نقطة إعادة الطلب": "is-warn",
  "تخزين زائد": "is-info",
};

const turnoverTones: Record<string, string> = {
  "سريع الحركة": "is-ok",
  "متوسط الحركة": "is-info",
  "راكد": "is-neutral",
};

const agingTones = (category: string) => {
  if (category.includes("راكد جداً")) return "is-risk";
  if (category.includes("راكد")) return "is-warn";
  if (category.includes("بطيء")) return "is-warn";
  return "is-ok";
};

const InventoryReports = () => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("valuation");

  const { data: warehouses } = useInventoryWarehouses();
  const { data: categories } = useInventoryCategories({ is_active: true });

  // Reports data
  const { data: valuationReport, isLoading: valuationLoading } = useInventoryValuationReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: agingReport, isLoading: agingLoading } = useInventoryAgingReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: turnoverReport, isLoading: turnoverLoading } = useInventoryTurnoverReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: stockAlerts, isLoading: alertsLoading } = useStockLevelAlerts(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );

  // Summary data
  const { data: valuationSummary } = useInventoryValuationSummary();
  const { data: agingSummary } = useInventoryAgingSummary();
  const { data: turnoverSummary } = useInventoryTurnoverSummary();
  const { data: alertSummary } = useStockAlertSummary();

  const tabs = [
    { value: 'valuation', label: 'تقرير التقييم' },
    { value: 'turnover', label: 'دوران المخزون' },
    { value: 'aging', label: 'تقرير التقادم' },
    { value: 'alerts', label: 'تنبيهات المخزون' },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المخزون <span>/</span> التقارير
            </div>
            <h1>تقارير المخزون</h1>
            <p>تحليلات شاملة للمخزون والتكلفة والحركة.</p>
          </div>
          <div className="dw-header-tools">
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="wk-field" style={{ width: 170 }}>
                <SelectValue placeholder="جميع المستودعات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستودعات</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="wk-field" style={{ width: 170 }}>
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {activeTab === 'valuation' && (
          <section className="dw-metrics" aria-label="ملخص التقييم">
            <div className="dw-metric dw-metric-accent">
              <div className="dw-metric-top"><span>إجمالي الأصناف</span><Package size={19} /></div>
              <strong>{valuationSummary?.total_items || 0}</strong>
              <div className="dw-metric-bottom"><small>صنف في المخزون</small></div>
            </div>
            <div className="dw-metric">
              <div className="dw-metric-top"><span>قيمة التكلفة</span><DollarSign size={19} /></div>
              <strong>{(valuationSummary?.total_cost_value || 0).toFixed(2)}</strong>
              <div className="dw-metric-bottom"><small>ريال قطري</small></div>
            </div>
            <div className="dw-metric">
              <div className="dw-metric-top"><span>قيمة البيع</span><DollarSign size={19} /></div>
              <strong>{(valuationSummary?.total_selling_value || 0).toFixed(2)}</strong>
              <div className="dw-metric-bottom"><small>ريال قطري</small></div>
            </div>
            <div className="dw-metric">
              <div className="dw-metric-top"><span>الربح المتوقع</span><TrendingUp size={19} /></div>
              <strong>{(valuationSummary?.potential_profit || 0).toFixed(2)}</strong>
              <div className="dw-metric-bottom"><small>هامش {(valuationSummary?.profit_margin || 0).toFixed(1)}%</small></div>
            </div>
          </section>
        )}

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="تقارير المخزون"
            subtitle="اختر التقرير المناسب من الأعلى"
            className="wk-panel-full"
            action={
              <div className="dw-filters" role="group" aria-label="أنواع التقارير">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={activeTab === tab.value}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          >
            {/* Valuation Report Tab */}
            {activeTab === 'valuation' && (
              <>
                {valuationLoading ? (
                  <PageLoading label="جاري تحميل تقرير التقييم…" />
                ) : valuationReport && valuationReport.length > 0 ? (
                  <>
                    <div className="wk-table-wrap">
                      <table>
                        <caption className="sr-only">تفاصيل التقييم</caption>
                        <thead>
                          <tr>
                            <th scope="col">المستودع</th>
                            <th scope="col">التصنيف</th>
                            <th scope="col">عدد الأصناف</th>
                            <th scope="col">الكمية</th>
                            <th scope="col">قيمة التكلفة</th>
                            <th scope="col">قيمة البيع</th>
                            <th scope="col">الربح المتوقع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valuationReport.map((row, index) => (
                            <tr key={index}>
                              <td><strong><bdi>{row.warehouse_name}</bdi></strong></td>
                              <td>{row.category_name}</td>
                              <td>{row.total_items}</td>
                              <td>{row.total_quantity}</td>
                              <td>{row.total_cost_value.toFixed(2)} ريال</td>
                              <td>{row.total_selling_value.toFixed(2)} ريال</td>
                              <td>
                                <span className="wk-badge is-ok">{row.potential_profit.toFixed(2)} ريال</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <PageEmpty icon={BarChart3} message="لا توجد بيانات للعرض" />
                )}
              </>
            )}

            {/* Turnover Report Tab */}
            {activeTab === 'turnover' && (
              <>
                {turnoverSummary && turnoverSummary.length > 0 && (
                  <div className="wk-legend" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {turnoverSummary.map((item, index) => (
                      <div key={index} className="wk-legend-row" style={{ border: '1px solid #eef1e7', borderRadius: 9, padding: 12 }}>
                        <i style={{ background: COLORS[index % COLORS.length] }} />
                        <span>{item.category}</span>
                        <strong>{item.item_count}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {turnoverLoading ? (
                  <PageLoading label="جاري تحميل تحليل الدوران…" />
                ) : turnoverReport && turnoverReport.length > 0 ? (
                  <div className="wk-table-wrap">
                    <table>
                      <caption className="sr-only">تفاصيل دوران المخزون</caption>
                      <thead>
                        <tr>
                          <th scope="col">الصنف</th>
                          <th scope="col">المستودع</th>
                          <th scope="col">المخزون الحالي</th>
                          <th scope="col">عدد الحركات</th>
                          <th scope="col">كمية المبيعات</th>
                          <th scope="col">معدل الدوران</th>
                          <th scope="col">التصنيف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turnoverReport.slice(0, 20).map((row, index) => (
                          <tr key={index}>
                            <td><strong><bdi>{row.item_name}</bdi></strong></td>
                            <td>{row.warehouse_name}</td>
                            <td>{row.current_stock}</td>
                            <td>{row.movements_last_90_days}</td>
                            <td>{row.sales_quantity_last_90_days}</td>
                            <td>{row.turnover_ratio}</td>
                            <td>
                              <span className={`wk-badge ${turnoverTones[row.turnover_category] ?? 'is-neutral'}`}>
                                {row.turnover_category}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <PageEmpty icon={TrendingUp} message="لا توجد بيانات للعرض" />
                )}
              </>
            )}

            {/* Aging Report Tab */}
            {activeTab === 'aging' && (
              <>
                {agingSummary && agingSummary.length > 0 && (
                  <div className="wk-legend" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {agingSummary.map((item, index) => (
                      <div key={index} className="wk-legend-row" style={{ border: '1px solid #eef1e7', borderRadius: 9, padding: 12 }}>
                        <i style={{ background: COLORS[index % COLORS.length] }} />
                        <span>{item.category}</span>
                        <strong>{item.tied_up_value.toFixed(2)} ريال</strong>
                      </div>
                    ))}
                  </div>
                )}
                {agingLoading ? (
                  <PageLoading label="جاري تحميل تقرير التقادم…" />
                ) : agingReport && agingReport.length > 0 ? (
                  <div className="wk-table-wrap">
                    <table>
                      <caption className="sr-only">تفاصيل تقادم المخزون</caption>
                      <thead>
                        <tr>
                          <th scope="col">الصنف</th>
                          <th scope="col">المستودع</th>
                          <th scope="col">الكمية</th>
                          <th scope="col">أيام بدون حركة</th>
                          <th scope="col">الفئة</th>
                          <th scope="col">القيمة المربوطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agingReport.slice(0, 20).map((row, index) => (
                          <tr key={index}>
                            <td><strong><bdi>{row.item_name}</bdi></strong></td>
                            <td>{row.warehouse_name}</td>
                            <td>{row.quantity_on_hand}</td>
                            <td>
                              <span className="wk-badge is-neutral">
                                <Clock size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                                {row.days_since_last_movement} يوم
                              </span>
                            </td>
                            <td>
                              <span className={`wk-badge ${agingTones(row.aging_category)}`}>
                                {row.aging_category}
                              </span>
                            </td>
                            <td>{row.tied_up_value.toFixed(2)} ريال</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <PageEmpty icon={Clock} message="لا توجد بيانات للعرض" />
                )}
              </>
            )}

            {/* Stock Alerts Tab */}
            {activeTab === 'alerts' && (
              <>
                {alertSummary && alertSummary.length > 0 && (
                  <div className="wk-summary-grid">
                    {alertSummary.map((item, index) => (
                      <div key={index} className="wk-summary-tile is-warn">
                        <small>{item.alert_type}</small>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {alertsLoading ? (
                  <PageLoading label="جاري تحميل التنبيهات…" />
                ) : stockAlerts && stockAlerts.length > 0 ? (
                  <div className="wk-table-wrap">
                    <table>
                      <caption className="sr-only">تنبيهات مستويات المخزون</caption>
                      <thead>
                        <tr>
                          <th scope="col">الصنف</th>
                          <th scope="col">المستودع</th>
                          <th scope="col">الكمية المتاحة</th>
                          <th scope="col">الحد الأدنى</th>
                          <th scope="col">النقص</th>
                          <th scope="col">الكمية المقترحة</th>
                          <th scope="col">نوع التنبيه</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockAlerts.map((alert, index) => (
                          <tr key={index}>
                            <td><strong><bdi>{alert.item_name}</bdi></strong></td>
                            <td>{alert.warehouse_name}</td>
                            <td>
                              <span className={`wk-badge ${alert.quantity_available === 0 ? 'is-risk' : 'is-warn'}`}>
                                {alert.quantity_available}
                              </span>
                            </td>
                            <td>{alert.min_stock_level}</td>
                            <td>
                              {alert.shortage_quantity > 0 ? (
                                <span className="wk-badge is-risk">-{alert.shortage_quantity}</span>
                              ) : "-"}
                            </td>
                            <td>
                              <span className="wk-badge is-info">{alert.suggested_order_quantity}</span>
                            </td>
                            <td>
                              <span className={`wk-badge ${alertTones[alert.alert_type] ?? 'is-neutral'}`}>
                                <AlertTriangle size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                                {alert.alert_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <PageEmpty icon={Package} message="لا توجد تنبيهات — جميع مستويات المخزون طبيعية" />
                )}
              </>
            )}
            <div className="dw-panel-foot">
              <BarChart3 size={14} />
              <span>حدّث المستودع أو التصنيف من الأعلى لتصفية كل التقارير.</span>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;