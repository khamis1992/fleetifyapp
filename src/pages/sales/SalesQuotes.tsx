import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSalesQuotes, useCreateSalesQuote, useUpdateSalesQuote, useDeleteSalesQuote, useGenerateQuoteNumber, type SalesQuote } from "@/hooks/useSalesQuotes";
import { useQuotePDFGenerator } from "@/hooks/useQuotePDFGenerator";
import { useQuoteToContract } from "@/hooks/useQuoteToContract";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Edit, Trash2, Eye, Send, CheckCircle, XCircle, Clock, Download, FileCheck, RefreshCw } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import type { Json } from "@/integrations/supabase/types";

const statusTones: Record<string, string> = {
  draft: 'is-neutral',
  sent: 'is-info',
  viewed: 'is-warn',
  accepted: 'is-ok',
  rejected: 'is-risk',
  expired: 'is-neutral',
};

type QuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

const isJsonRecord = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: Json | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const normalizeQuoteItems = (items: Json | null): QuoteItem[] => {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item, index) => {
    if (!isJsonRecord(item)) return [];

    const quantity = toFiniteNumber(item.quantity);
    const unitPrice = toFiniteNumber(item.unit_price);
    const storedTotal = toFiniteNumber(item.total);
    const description = typeof item.description === "string"
      ? item.description
      : typeof item.name === "string"
        ? item.name
        : "";

    return [{
      id: typeof item.id === "string" ? item.id : `item-${index}`,
      description,
      quantity,
      unit_price: unitPrice,
      total: storedTotal || quantity * unitPrice,
    }];
  });
};

const SalesQuotes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<SalesQuote | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [rentalOptions, setRentalOptions] = useState({
    start_date: new Date().toISOString().split('T')[0],
    rental_type: 'monthly' as 'daily' | 'weekly' | 'monthly',
    duration: 1,
    include_driver: false,
    include_gps: false,
    delivery_required: false,
    delivery_address: '',
  });
  const [formData, setFormData] = useState({
    quote_number: "",
    items: [] as QuoteItem[],
    subtotal: 0,
    tax: 0,
    total: 0,
    valid_until: "",
    status: "draft",
    notes: "",
    is_active: true,
  });

  const { data: quotes, isLoading } = useSalesQuotes({
    search: searchTerm,
    is_active: true,
  });
  const { data: nextQuoteNumber } = useGenerateQuoteNumber();
  const createQuote = useCreateSalesQuote();
  const updateQuote = useUpdateSalesQuote();
  const deleteQuote = useDeleteSalesQuote();
  const { generateQuotePDF, isGenerating } = useQuotePDFGenerator();
  const { convertQuoteToContract, canConvertToContract, isConverting } = useQuoteToContract();
  const { data: vehicles } = useVehicles({ status: 'available' });
  const availableVehicles = (vehicles || []).filter((vehicle) => vehicle.status === 'available');
  const selectedQuoteItems = normalizeQuoteItems(selectedQuote?.items ?? null);

  const filteredQuotes = (quotes || []).filter((quote) => {
    const matchesTab = activeTab === 'all' || quote.status === activeTab;
    const matchesStatus = selectedStatus === 'all' || quote.status === selectedStatus;
    return matchesTab && matchesStatus;
  });

  const handleCreateQuote = async () => {
    await createQuote.mutateAsync({
      ...formData,
      quote_number: nextQuoteNumber || formData.quote_number,
    });
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleViewDetails = (quote: SalesQuote) => {
    setSelectedQuote(quote);
    setIsDetailsDialogOpen(true);
  };

  const handleEditQuote = (quote: SalesQuote) => {
    setSelectedQuote(quote);
    setFormData({
      quote_number: quote.quote_number,
      items: normalizeQuoteItems(quote.items),
      subtotal: quote.subtotal || 0,
      tax: quote.tax || 0,
      total: quote.total || 0,
      valid_until: quote.valid_until || '',
      status: quote.status ?? 'draft',
      notes: quote.notes || '',
      is_active: quote.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;
    await updateQuote.mutateAsync({ id: selectedQuote.id, data: formData });
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDeleteQuote = async (quote: SalesQuote) => {
    await deleteQuote.mutateAsync(quote.id);
  };

  const handleConvertToContractSubmit = async () => {
    if (!selectedQuote || !selectedVehicleId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار مركبة متاحة',
        variant: 'destructive',
      });
      return;
    }

    const result = await convertQuoteToContract(selectedQuote.id, selectedVehicleId, rentalOptions);
    
    if (result.success && result.contractId) {
      setConvertDialogOpen(false);
      navigate(`/contracts/${result.contractId}`);
    }
  };

  const handleOpenConvertDialog = (quote: SalesQuote) => {
    const { canConvert, reason } = canConvertToContract(quote);
    if (!canConvert) {
      toast({
        title: 'غير ممكن',
        description: reason,
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedQuote(quote);
    setSelectedVehicleId("");
    setRentalOptions({
      start_date: new Date().toISOString().split('T')[0],
      rental_type: 'monthly',
      duration: 1,
      include_driver: false,
      include_gps: false,
      delivery_required: false,
      delivery_address: '',
    });
    setConvertDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      quote_number: "",
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      valid_until: "",
      status: "draft",
      notes: "",
      is_active: true,
    });
    setSelectedQuote(null);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'مسودة',
      sent: 'تم الإرسال',
      viewed: 'تمت المشاهدة',
      accepted: 'مقبول',
      rejected: 'مرفوض',
      expired: 'منتهي',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'viewed':
        return <Eye className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  const statusCounts = {
    all: quotes?.length || 0,
    draft: quotes?.filter(q => q.status === 'draft').length || 0,
    sent: quotes?.filter(q => q.status === 'sent').length || 0,
    viewed: quotes?.filter(q => q.status === 'viewed').length || 0,
    accepted: quotes?.filter(q => q.status === 'accepted').length || 0,
  };

  const totalValue = quotes?.reduce((sum, quote) => sum + (quote.total || 0), 0) || 0;
  const acceptedValue = quotes?.filter(q => q.status === 'accepted').reduce((sum, quote) => sum + (quote.total || 0), 0) || 0;
  const pendingValue = quotes?.filter(q => ['sent', 'viewed'].includes(q.status ?? '')).reduce((sum, quote) => sum + (quote.total || 0), 0) || 0;

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> عروض الأسعار
            </div>
            <h1>عروض الأسعار</h1>
            <p>إدارة ومتابعة عروض الأسعار من المسودة حتى القبول.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              عرض سعر جديد
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات العروض">
          <div className="dw-metric dw-metric-accent">
            <div className="dw-metric-top"><span>إجمالي القيمة</span><FileText size={19} /></div>
            <strong>{formatCurrency(totalValue)}</strong>
            <div className="dw-metric-bottom"><small>جميع العروض</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>عروض مقبولة</span><CheckCircle size={19} /></div>
            <strong>{formatCurrency(acceptedValue)}</strong>
            <div className="dw-metric-bottom"><small>{statusCounts.accepted} عرض</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>قيد الانتظار</span><Clock size={19} /></div>
            <strong>{formatCurrency(pendingValue)}</strong>
            <div className="dw-metric-bottom"><small>{statusCounts.sent + statusCounts.viewed} عرض</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>إجمالي العروض</span><FileText size={19} /></div>
            <strong>{statusCounts.all}</strong>
            <div className="dw-metric-bottom"><small>عرض نشط</small></div>
          </div>
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="قائمة عروض الأسعار"
            subtitle="عرض وإدارة جميع عروض الأسعار وتصفيتها"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث برقم العرض…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في العروض"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="sent">تم الإرسال</SelectItem>
                    <SelectItem value="viewed">تمت المشاهدة</SelectItem>
                    <SelectItem value="accepted">مقبول</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="تصفية بالحالة">
                {([
                  { value: 'all', label: 'الكل', count: statusCounts.all },
                  { value: 'draft', label: 'مسودة', count: statusCounts.draft },
                  { value: 'sent', label: 'مرسل', count: statusCounts.sent },
                  { value: 'viewed', label: 'مشاهد', count: statusCounts.viewed },
                  { value: 'accepted', label: 'مقبول', count: statusCounts.accepted },
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
              <PageLoading label="جاري تحميل العروض…" />
            ) : filteredQuotes.length === 0 ? (
              <PageEmpty icon={FileText} message="لا توجد عروض أسعار مطابقة">
                <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} />
                  إنشاء عرض سعر
                </button>
              </PageEmpty>
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">عروض الأسعار</caption>
                  <thead>
                    <tr>
                      <th scope="col">رقم العرض</th>
                      <th scope="col">الإجمالي</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">صالح حتى</th>
                      <th scope="col">تاريخ الإنشاء</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote) => (
                      <tr key={quote.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(quote)}>
                        <td>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getStatusIcon(quote.status ?? '')}
                            <bdi>{quote.quote_number}</bdi>
                          </strong>
                        </td>
                        <td>{formatCurrency(quote.total || 0)}</td>
                        <td>
                          <span className={`wk-badge ${statusTones[quote.status ?? ''] ?? 'is-neutral'}`}>
                            {getStatusLabel(quote.status ?? '')}
                          </span>
                        </td>
                        <td>
                          {quote.valid_until
                            ? new Date(quote.valid_until).toLocaleDateString('en-GB')
                            : '-'}
                        </td>
                        <td>{quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-GB') : '-'}</td>
                        <td>
                          <div className="wk-actions" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="wk-action" title="عرض التفاصيل" aria-label={`عرض ${quote.quote_number}`} onClick={() => handleViewDetails(quote)}>
                              <Eye size={15} />
                            </button>
                            <button type="button" className="wk-action" title="تنزيل PDF" aria-label={`تنزيل ${quote.quote_number}`} onClick={() => generateQuotePDF(quote.id)} disabled={isGenerating}>
                              <Download size={15} />
                            </button>
                            {quote.status === 'accepted' && (
                              <button type="button" className="wk-action is-primary" title="تحويل لعقد" aria-label={`تحويل ${quote.quote_number} لعقد`} onClick={() => handleOpenConvertDialog(quote)} disabled={isConverting}>
                                <FileCheck size={15} />
                              </button>
                            )}
                            <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${quote.quote_number}`} onClick={() => handleEditQuote(quote)}>
                              <Edit size={15} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${quote.quote_number}`}>
                                  <Trash2 size={15} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف عرض السعر "{quote.quote_number}". هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteQuote(quote)}
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
              <FileText size={14} />
              <span>{filteredQuotes.length} عرض معروض بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء عرض سعر جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات عرض السعر الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quote_number">رقم عرض السعر</Label>
                <Input
                  id="quote_number"
                  value={nextQuoteNumber || formData.quote_number}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valid_until">صالح حتى</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">البنود</h3>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>إضافة البنود من المخزون</p>
                <Button className="mt-4" variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة بند
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subtotal">المجموع الفرعي</Label>
                <Input
                  id="subtotal"
                  type="number"
                  value={formData.subtotal}
                  onChange={(e) => {
                    const subtotal = parseFloat(e.target.value) || 0;
                    const tax = subtotal * 0.15; // 15% VAT
                    const total = subtotal + tax;
                    setFormData({ ...formData, subtotal, tax, total });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tax">الضريبة (15%)</Label>
                <Input
                  id="tax"
                  type="number"
                  value={formData.tax}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total">الإجمالي</Label>
                <Input
                  id="total"
                  type="number"
                  value={formData.total}
                  disabled
                  className="bg-muted font-bold"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateQuote}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل عرض السعر</DialogTitle>
            <DialogDescription>
              تحديث بيانات عرض السعر
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>رقم عرض السعر</Label>
                <Input value={formData.quote_number} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_valid_until">صالح حتى</Label>
                <Input
                  id="edit_valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_status">الحالة</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">تم الإرسال</SelectItem>
                  <SelectItem value="viewed">تمت المشاهدة</SelectItem>
                  <SelectItem value="accepted">مقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_subtotal">المجموع الفرعي</Label>
                <Input
                  id="edit_subtotal"
                  type="number"
                  value={formData.subtotal}
                  onChange={(e) => {
                    const subtotal = parseFloat(e.target.value) || 0;
                    const tax = subtotal * 0.15;
                    const total = subtotal + tax;
                    setFormData({ ...formData, subtotal, tax, total });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>الضريبة (15%)</Label>
                <Input value={formData.tax} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>الإجمالي</Label>
                <Input value={formData.total} disabled className="bg-muted font-bold" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_notes">ملاحظات</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateQuote}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل عرض السعر</DialogTitle>
            <DialogDescription>
              {selectedQuote?.quote_number}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">رقم العرض</Label>
                  <p className="font-medium">{selectedQuote.quote_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الحالة</Label>
                  <div className="mt-1">
                    <span className={`wk-badge ${statusTones[selectedQuote.status ?? ''] ?? 'is-neutral'}`}>
                      {getStatusLabel(selectedQuote.status ?? '')}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">صالح حتى</Label>
                  <p className="font-medium">
                    {selectedQuote.valid_until
                      ? new Date(selectedQuote.valid_until).toLocaleDateString('en-US')
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                  <p className="font-medium">
                    {selectedQuote.created_at ? new Date(selectedQuote.created_at).toLocaleDateString('en-US') : '-'}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">البنود</h3>
                {selectedQuoteItems.length > 0 ? (
                  <div className="wk-table-wrap" style={{ paddingBottom: 0 }}>
                    <table>
                      <caption className="sr-only">بنود العرض</caption>
                      <thead>
                        <tr>
                          <th scope="col">الصنف</th>
                          <th scope="col">الكمية</th>
                          <th scope="col">سعر الوحدة</th>
                          <th scope="col">المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuoteItems.map((item) => (
                          <tr key={item.id}>
                            <td><strong><bdi>{item.description || 'صنف'}</bdi></strong></td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بنود</p>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(selectedQuote.subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الضريبة (15%)</span>
                  <span className="font-medium">{formatCurrency(selectedQuote.tax ?? 0)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(selectedQuote.total ?? 0)}</span>
                </div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <Label className="text-muted-foreground">ملاحظات</Label>
                  <p className="mt-1 text-sm">{selectedQuote.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              إغلاق
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              طباعة
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              if (selectedQuote) handleEditQuote(selectedQuote);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Contract Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تحويل العرض إلى عقد</DialogTitle>
            <DialogDescription>
              اختر المركبة وتفاصيل الإيجار لتحويل العرض {selectedQuote?.quote_number} إلى عقد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المركبة المتاحة</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركبة" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} - {vehicle.plate_number}
                      </SelectItem>
                    ))}
                  {availableVehicles.length === 0 && (
                    <SelectItem value="_none" disabled>
                      لا توجد مركبات متاحة
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={rentalOptions.start_date}
                  onChange={(e) => setRentalOptions({ ...rentalOptions, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الإيجار</Label>
                <Select
                  value={rentalOptions.rental_type}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                    setRentalOptions({ ...rentalOptions, rental_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>المدة ({rentalOptions.rental_type === 'daily' ? 'أيام' : rentalOptions.rental_type === 'weekly' ? 'أسابيع' : 'أشهر'})</Label>
              <Input
                type="number"
                min={1}
                value={rentalOptions.duration}
                onChange={(e) => setRentalOptions({ ...rentalOptions, duration: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_driver"
                  checked={rentalOptions.include_driver}
                  onChange={(e) => setRentalOptions({ ...rentalOptions, include_driver: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="include_driver">إضافة سائق</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_gps"
                  checked={rentalOptions.include_gps}
                  onChange={(e) => setRentalOptions({ ...rentalOptions, include_gps: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="include_gps">إضافة GPS</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="delivery_required"
                  checked={rentalOptions.delivery_required}
                  onChange={(e) => setRentalOptions({ ...rentalOptions, delivery_required: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="delivery_required">توصيل للموقع</Label>
              </div>
              {rentalOptions.delivery_required && (
                <div className="space-y-2">
                  <Label>عنوان التوصيل</Label>
                  <Textarea
                    value={rentalOptions.delivery_address}
                    onChange={(e) => setRentalOptions({ ...rentalOptions, delivery_address: e.target.value })}
                    placeholder="أدخل عنوان التوصيل..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConvertToContractSubmit} disabled={!selectedVehicleId || isConverting}>
              {isConverting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  جاري التحويل...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  تحويل إلى عقد
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesQuotes;
