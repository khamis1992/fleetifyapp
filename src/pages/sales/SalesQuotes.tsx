import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSalesQuotes, useCreateSalesQuote, useUpdateSalesQuote, useDeleteSalesQuote, useGenerateQuoteNumber, type SalesQuote } from "@/hooks/useSalesQuotes";
import { useQuotePDFGenerator } from "@/hooks/useQuotePDFGenerator";
import { useQuoteToContract } from "@/hooks/useQuoteToContract";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Search, Edit, Trash2, Eye, Send, CheckCircle, XCircle, Clock, Download, FileCheck } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const SalesQuotes = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<SalesQuote | null>(null);

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

  // Form state
  const [formData, setFormData] = useState({
    quote_number: "",
    items: [] as any[],
    subtotal: 0,
    tax: 0,
    total: 0,
    valid_until: "",
    status: "draft",
    notes: "",
    is_active: true,
  });

  const filteredQuotes = quotes?.filter(quote => {
    const matchesStatus = selectedStatus === "all" || quote.status === selectedStatus;
    const matchesTab = activeTab === "all" || quote.status === activeTab;
    return matchesStatus && matchesTab;
  }) || [];

  const handleCreateQuote = async () => {
    try {
      await createQuote.mutateAsync({
        ...formData,
        quote_number: nextQuoteNumber || formData.quote_number,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating quote:", error);
    }
  };

  const handleUpdateQuote = async () => {
    if (!selectedQuote) return;
    try {
      await updateQuote.mutateAsync({
        id: selectedQuote.id,
        data: formData,
      });
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating quote:", error);
    }
  };

  const handleDeleteQuote = async (quote: SalesQuote) => {
    try {
      await deleteQuote.mutateAsync(quote.id);
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  };

  const handleEditQuote = (quote: SalesQuote) => {
    setSelectedQuote(quote);
    setFormData({
      quote_number: quote.quote_number,
      items: quote.items || [],
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      valid_until: quote.valid_until || "",
      status: quote.status,
      notes: quote.notes || "",
      is_active: quote.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (quote: SalesQuote) => {
    setSelectedQuote(quote);
    setIsDetailsDialogOpen(true);
  };

  const handleConvertToContract = async (quote: SalesQuote) => {
    // Check if quote can be converted
    const { canConvert, reason } = canConvertToContract(quote);
    if (!canConvert) {
      toast({
        title: 'غير ممكن',
        description: reason,
        variant: 'destructive',
      });
      return;
    }

    // For now, we'll need to prompt user to select a vehicle
    // In a real implementation, this would open a dialog to select vehicle and rental options
    // For demo purposes, we'll show a message
    toast({
      title: 'تحويل لعقد',
      description: 'يرجى اختيار المركبة وتفاصيل الإيجار. سيتم إضافة نافذة حوارية للتحويل.',
    });

    // TODO: Open dialog to select vehicle and rental options
    // const result = await convertQuoteToContract(quote.id, vehicleId, rentalOptions);
    // if (result.success) {
    //   // Navigate to contract page
    //   window.location.href = `/contracts/${result.contractId}`;
    // }
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'viewed':
        return 'default';
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      default:
        return 'outline';
    }
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
  const pendingValue = quotes?.filter(q => ['sent', 'viewed'].includes(q.status)).reduce((sum, quote) => sum + (quote.total || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sales/pipeline">المبيعات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>عروض الأسعار</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">عروض الأسعار</h1>
            <p className="text-muted-foreground">إدارة ومتابعة عروض الأسعار</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              عرض سعر جديد
            </Button>
          </DialogTrigger>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيمة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">جميع العروض</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عروض مقبولة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(acceptedValue)}</div>
            <p className="text-xs text-muted-foreground">{statusCounts.accepted} عرض</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingValue)}</div>
            <p className="text-xs text-muted-foreground">
              {statusCounts.sent + statusCounts.viewed} عرض
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العروض</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.all}</div>
            <p className="text-xs text-muted-foreground">عرض نشط</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة عروض الأسعار</CardTitle>
              <CardDescription>عرض وإدارة جميع عروض الأسعار</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">الكل ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="draft">مسودة ({statusCounts.draft})</TabsTrigger>
              <TabsTrigger value="sent">مرسل ({statusCounts.sent})</TabsTrigger>
              <TabsTrigger value="viewed">مشاهد ({statusCounts.viewed})</TabsTrigger>
              <TabsTrigger value="accepted">مقبول ({statusCounts.accepted})</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن عرض سعر (رقم العرض)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[200px]">
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

            {/* Table */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد عروض أسعار
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم العرض</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>صالح حتى</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(quote)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(quote.status)}
                            {quote.quote_number}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(quote.total || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(quote.status)}>
                            {getStatusLabel(quote.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {quote.valid_until
                            ? new Date(quote.valid_until).toLocaleDateString('en-US')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString('en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(quote)}
                              title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateQuotePDF(quote.id)}
                              disabled={isGenerating}
                              title="تنزيل PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {quote.status === 'accepted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConvertToContract(quote)}
                                disabled={isConverting}
                                title="تحويل لعقد"
                                className="text-green-600 hover:text-green-700"
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuote(quote)}
                              title="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
                    <Badge variant={getStatusBadgeVariant(selectedQuote.status)}>
                      {getStatusLabel(selectedQuote.status)}
                    </Badge>
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
                    {new Date(selectedQuote.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">البنود</h3>
                {selectedQuote.items && selectedQuote.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصنف</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>سعر الوحدة</TableHead>
                        <TableHead>المجموع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuote.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name || 'صنف'}</TableCell>
                          <TableCell>{item.quantity || 0}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                          <TableCell>{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بنود</p>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">المجموع الفرعي</span>
                  <span className="font-medium">{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">الضريبة (15%)</span>
                  <span className="font-medium">{formatCurrency(selectedQuote.tax)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">الإجمالي</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(selectedQuote.total)}</span>
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
    </div>
  );
};

export default SalesQuotes;
