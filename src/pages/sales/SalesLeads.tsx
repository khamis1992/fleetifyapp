import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesLeads, useDeleteSalesLead, type SalesLead } from "@/hooks/useSalesLeads";
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, TrendingUp } from "lucide-react";
import { AddLeadForm } from "@/components/sales/AddLeadForm";
import { useToast } from "@/hooks/use-toast";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const statusTones: Record<string, string> = {
  new: 'is-info',
  contacted: 'is-warn',
  qualified: 'is-ok',
  unqualified: 'is-neutral',
  converted: 'is-ok',
  lost: 'is-risk',
};

const SalesLeads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const { toast } = useToast();

  const { data: leads, isLoading } = useSalesLeads({
    search: searchTerm,
    is_active: true,
  });
  const deleteLead = useDeleteSalesLead();

  const filteredLeads = leads?.filter(lead => {
    const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
    const matchesSource = selectedSource === "all" || lead.source === selectedSource;
    const matchesTab = activeTab === "all" || lead.status === activeTab;
    return matchesStatus && matchesSource && matchesTab;
  }) || [];

  const handleDeleteLead = async (lead: SalesLead) => {
    try {
      await deleteLead.mutateAsync(lead.id);
    } catch (error) {
      console.error("Error deleting sales lead:", error);
    }
  };

  const handleEditLead = (lead: SalesLead) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'جديد',
      contacted: 'تم التواصل',
      qualified: 'مؤهل',
      unqualified: 'غير مؤهل',
      converted: 'تم التحويل',
      lost: 'خسر',
    };
    return labels[status] || status;
  };

  const getSourceLabel = (source?: string) => {
    if (!source) return '-';
    const labels: Record<string, string> = {
      website: 'موقع إلكتروني',
      referral: 'إحالة',
      cold_call: 'اتصال بارد',
      trade_show: 'معرض تجاري',
      social_media: 'وسائل التواصل',
      email: 'بريد إلكتروني',
      other: 'أخرى',
    };
    return labels[source] || source;
  };

  const statusCounts = {
    all: leads?.length || 0,
    new: leads?.filter(l => l.status === 'new').length || 0,
    contacted: leads?.filter(l => l.status === 'contacted').length || 0,
    qualified: leads?.filter(l => l.status === 'qualified').length || 0,
  };

  const dwMetrics = [
    { label: 'إجمالي العملاء', value: statusCounts.all, hint: 'عميل محتمل', accent: true },
    { label: 'جديد', value: statusCounts.new, hint: 'لم يُتواصل معه بعد', accent: false },
    { label: 'تم التواصل', value: statusCounts.contacted, hint: 'بانتظار المتابعة', accent: false },
    { label: 'مؤهل', value: statusCounts.qualified, hint: 'جاهز للتحويل', accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> العملاء المحتملون
            </div>
            <h1>العملاء المحتملون</h1>
            <p>إدارة ومتابعة العملاء المحتملين وتحويلهم إلى عملاء فعليين.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              عميل محتمل جديد
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات العملاء المحتملين">
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
            title="قائمة العملاء المحتملين"
            subtitle="عرض وإدارة جميع العملاء المحتملين وتصفيتها"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 240 }}
                    placeholder="ابحث بالاسم، البريد، الهاتف…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في العملاء المحتملين"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="new">جديد</SelectItem>
                    <SelectItem value="contacted">تم التواصل</SelectItem>
                    <SelectItem value="qualified">مؤهل</SelectItem>
                    <SelectItem value="unqualified">غير مؤهل</SelectItem>
                    <SelectItem value="converted">تم التحويل</SelectItem>
                    <SelectItem value="lost">خسر</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
                    <SelectValue placeholder="المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المصادر</SelectItem>
                    <SelectItem value="website">موقع إلكتروني</SelectItem>
                    <SelectItem value="referral">إحالة</SelectItem>
                    <SelectItem value="cold_call">اتصال بارد</SelectItem>
                    <SelectItem value="trade_show">معرض تجاري</SelectItem>
                    <SelectItem value="social_media">وسائل التواصل</SelectItem>
                    <SelectItem value="email">بريد إلكتروني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="تصفية بالحالة">
                {([
                  { value: 'all', label: 'الكل', count: statusCounts.all },
                  { value: 'new', label: 'جديد', count: statusCounts.new },
                  { value: 'contacted', label: 'تم التواصل', count: statusCounts.contacted },
                  { value: 'qualified', label: 'مؤهل', count: statusCounts.qualified },
                ] as const).map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    aria-pressed={activeTab === chip.value}
                    onClick={() => setActiveTab(chip.value)}
                  >
                    {chip.label}<span>{chip.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <PageLoading label="جاري تحميل العملاء المحتملين…" />
            ) : filteredLeads.length === 0 ? (
              <PageEmpty icon={Users} message="لا توجد عملاء محتملون">
                <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} />
                  إضافة عميل محتمل
                </button>
              </PageEmpty>
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">العملاء المحتملون</caption>
                  <thead>
                    <tr>
                      <th scope="col">العميل</th>
                      <th scope="col">التواصل</th>
                      <th scope="col">المصدر</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">تاريخ الإنشاء</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong><bdi>{lead.lead_name}</bdi></strong>
                          {lead.lead_name_ar && <span className="wk-sub">{lead.lead_name_ar}</span>}
                        </td>
                        <td>
                          {lead.email && (
                            <span className="wk-sub">
                              <Mail size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                              <bdi>{lead.email}</bdi>
                            </span>
                          )}
                          {lead.phone && (
                            <span className="wk-sub">
                              <Phone size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                              <bdi>{lead.phone}</bdi>
                            </span>
                          )}
                          {!lead.email && !lead.phone && <span className="wk-sub">-</span>}
                        </td>
                        <td>
                          <span className="wk-badge is-neutral">{getSourceLabel(lead.source ?? undefined)}</span>
                        </td>
                        <td>
                          <span className={`wk-badge ${statusTones[lead.status ?? ''] ?? 'is-neutral'}`}>
                            {getStatusLabel(lead.status ?? '')}
                          </span>
                        </td>
                        <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '-'}</td>
                        <td>
                          <div className="wk-actions">
                            <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${lead.lead_name}`} onClick={() => handleEditLead(lead)}>
                              <Edit size={15} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${lead.lead_name}`}>
                                  <Trash2 size={15} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف العميل المحتمل "{lead.lead_name}". هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLead(lead)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dw-panel-foot">
              <TrendingUp size={14} />
              <span>{filteredLeads.length} عميل محتمل معروض بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة عميل محتمل جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات العميل المحتمل الجديد. يمكنك تحويله إلى عميل مباشرة باستخدام زر "تحويل إلى عميل"
            </DialogDescription>
          </DialogHeader>
          <AddLeadForm
            onSuccess={() => setIsCreateDialogOpen(false)}
            onConvertToCustomer={() => {
              setIsCreateDialogOpen(false);
              toast({
                title: "تم التحويل بنجاح",
                description: "تم تحويل العميل المحتمل إلى عميل وإضافته إلى قائمة العملاء",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل المحتمل</DialogTitle>
            <DialogDescription>
              تحديث بيانات {selectedLead?.lead_name}
            </DialogDescription>
          </DialogHeader>
          <AddLeadForm
            onSuccess={() => setIsEditDialogOpen(false)}
            onConvertToCustomer={() => {
              setIsEditDialogOpen(false);
              toast({
                title: "تم التحويل بنجاح",
                description: "تم تحويل العميل المحتمل إلى عميل وإضافته إلى قائمة العملاء",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesLeads;