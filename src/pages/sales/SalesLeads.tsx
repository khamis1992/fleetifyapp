import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesLeads, useDeleteSalesLead, type SalesLead } from "@/hooks/useSalesLeads";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, TrendingUp } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AddLeadForm } from "@/components/sales/AddLeadForm";
import { useToast } from "@/hooks/use-toast";

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'default';
      case 'contacted':
        return 'secondary';
      case 'qualified':
        return 'success';
      case 'converted':
        return 'success';
      case 'unqualified':
        return 'warning';
      case 'lost':
        return 'destructive';
      default:
        return 'outline';
    }
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
            <BreadcrumbPage>العملاء المحتملون</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">العملاء المحتملون</h1>
            <p className="text-muted-foreground">إدارة ومتابعة العملاء المحتملين</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              عميل محتمل جديد
            </Button>
          </DialogTrigger>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <p className="text-xs text-muted-foreground">عميل محتمل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">جديد</CardTitle>
            <Plus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.new}</div>
            <p className="text-xs text-muted-foreground">عميل جديد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم التواصل</CardTitle>
            <Phone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statusCounts.contacted}</div>
            <p className="text-xs text-muted-foreground">بانتظار المتابعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مؤهل</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.qualified}</div>
            <p className="text-xs text-muted-foreground">جاهز للتحويل</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة العملاء المحتملين</CardTitle>
              <CardDescription>عرض وإدارة جميع العملاء المحتملين</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">الكل ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="new">جديد ({statusCounts.new})</TabsTrigger>
              <TabsTrigger value="contacted">تم التواصل ({statusCounts.contacted})</TabsTrigger>
              <TabsTrigger value="qualified">مؤهل ({statusCounts.qualified})</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن عميل محتمل (الاسم، البريد، الهاتف)..."
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
                  <SelectItem value="new">جديد</SelectItem>
                  <SelectItem value="contacted">تم التواصل</SelectItem>
                  <SelectItem value="qualified">مؤهل</SelectItem>
                  <SelectItem value="unqualified">غير مؤهل</SelectItem>
                  <SelectItem value="converted">تم التحويل</SelectItem>
                  <SelectItem value="lost">خسر</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[200px]">
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

            {/* Table */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد عملاء محتملون
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{lead.lead_name}</div>
                            {lead.lead_name_ar && (
                              <div className="text-xs text-muted-foreground">{lead.lead_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{lead.email}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{lead.phone}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getSourceLabel(lead.source)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(lead.status)}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString('en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLead(lead)}
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
    </div>
  );
};

export default SalesLeads;
