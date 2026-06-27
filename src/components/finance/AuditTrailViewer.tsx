import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AuditTrailEntry,
  getActionNameAr,
  getTableNameAr,
  useAuditTrail,
} from "@/hooks/useAuditTrail";

interface AuditTrailViewerProps {
  compactHeader?: boolean;
}

const actionTone = (action: string) => {
  if (action === "INSERT") return { bg: "#E8FBF6", text: "#0F9F82", label: "إضافة", icon: Plus };
  if (action === "UPDATE") return { bg: "#EAF8FE", text: "#0284C7", label: "تعديل", icon: Edit };
  if (action === "DELETE") return { bg: "#FFF0F2", text: "#FB6B7A", label: "حذف", icon: Trash2 };
  return { bg: "#F6F8FB", text: "#64748B", label: getActionNameAr(action), icon: FileText };
};

const fieldClassName =
  "h-11 rounded-xl border-slate-200 bg-[#F6F8FB] text-[#020617] shadow-none focus-visible:ring-[#22C7A1]";

export function AuditTrailViewer({ compactHeader = false }: AuditTrailViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);

  const { data, isLoading, refetch } = useAuditTrail(
    {
      tableName: filterTable !== "all" ? filterTable : undefined,
      action: filterAction !== "all" ? filterAction : undefined,
      searchTerm: searchTerm || undefined,
    },
    200
  );

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="flex h-56 items-center justify-center p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 text-center font-bold text-[#94A3B8]">
          لا توجد بيانات متاحة
        </CardContent>
      </Card>
    );
  }

  const { entries, stats } = data;

  const metrics = [
    { label: "إجمالي السجلات", value: stats.totalEntries, icon: Shield, color: "#38BDF8", bg: "#EAF8FE" },
    { label: "إضافة", value: stats.insertCount, icon: Plus, color: "#22C7A1", bg: "#E8FBF6" },
    { label: "تعديل", value: stats.updateCount, icon: Edit, color: "#7C83F6", bg: "#ECEEFE" },
    { label: "حذف", value: stats.deleteCount, icon: Trash2, color: "#FB6B7A", bg: "#FFF0F2" },
    { label: "المستخدمين", value: stats.uniqueUsers, icon: Users, color: "#020617", bg: "#F6F8FB" },
    { label: "الجداول", value: stats.tablesAffected, icon: FileText, color: "#94A3B8", bg: "#F6F8FB" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {!compactHeader && (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#020617]">
                  <Shield className="h-5 w-5 text-[#38BDF8]" />
                  سجل التدقيق الشامل
                </CardTitle>
                <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                  تتبع كامل للتعديلات المحاسبية: من قام بالتغيير، ماذا تغير، ومتى حدث.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="h-11 gap-2 rounded-xl border-slate-200 text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8]">{metric.label}</p>
                    <p className="mt-2 text-2xl font-black text-[#020617]">{metric.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: metric.bg, color: metric.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                placeholder="بحث بالمستخدم، الوصف، البريد أو معرف السجل..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`${fieldClassName} pr-9`}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className={fieldClassName}>
                  <Filter className="ml-2 h-4 w-4 text-[#94A3B8]" />
                  <SelectValue placeholder="اختر الجدول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الجداول</SelectItem>
                  <SelectItem value="journal_entries">القيود المحاسبية</SelectItem>
                  <SelectItem value="journal_entry_lines">سطور القيود</SelectItem>
                  <SelectItem value="chart_of_accounts">دليل الحسابات</SelectItem>
                  <SelectItem value="invoices">الفواتير</SelectItem>
                  <SelectItem value="payments">المدفوعات</SelectItem>
                  <SelectItem value="contracts">العقود</SelectItem>
                  <SelectItem value="customers">العملاء</SelectItem>
                  <SelectItem value="cost_centers">مراكز التكلفة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className={fieldClassName}>
                  <SelectValue placeholder="نوع الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإجراءات</SelectItem>
                  <SelectItem value="INSERT">إضافة</SelectItem>
                  <SelectItem value="UPDATE">تعديل</SelectItem>
                  <SelectItem value="DELETE">حذف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-2xl">
            <Table className="min-w-[1050px]" aria-label="جدول سجل التدقيق">
              <TableHeader className="bg-[#F6F8FB]">
                <TableRow>
                  <TableHead className="text-[#64748B]">الوقت</TableHead>
                  <TableHead className="text-[#64748B]">الإجراء</TableHead>
                  <TableHead className="text-[#64748B]">الجدول</TableHead>
                  <TableHead className="text-[#64748B]">المعرف</TableHead>
                  <TableHead className="text-[#64748B]">المستخدم</TableHead>
                  <TableHead className="text-[#64748B]">الحقول</TableHead>
                  <TableHead className="text-[#64748B]">الوصف</TableHead>
                  <TableHead className="text-[#64748B]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center font-bold text-[#94A3B8]">
                      لا توجد سجلات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const tone = actionTone(entry.action);
                    const Icon = tone.icon;
                    return (
                      <TableRow key={entry.id} className="hover:bg-[#F6F8FB]/70">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-bold text-[#020617]">
                            <Clock className="h-4 w-4 text-[#94A3B8]" />
                            {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="rounded-full border-transparent px-3 py-1 font-black"
                            style={{ backgroundColor: tone.bg, color: tone.text }}
                          >
                            <Icon className="ml-1 h-3 w-3" />
                            {tone.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-black text-[#020617]">{getTableNameAr(entry.table_name)}</p>
                          <p className="mt-1 text-xs font-bold text-[#94A3B8]">{entry.table_name}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#64748B]">
                          {entry.record_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-[#020617]">{entry.user_name || "-"}</p>
                          <p className="mt-1 text-xs text-[#94A3B8]">{entry.user_email || "-"}</p>
                        </TableCell>
                        <TableCell>
                          {entry.changed_fields && entry.changed_fields.length > 0 ? (
                            <Badge variant="outline" className="rounded-full border-[#7C83F6]/25 bg-[#ECEEFE] text-[#5B62D8]">
                              {entry.changed_fields.length} حقل
                            </Badge>
                          ) : (
                            <span className="text-sm text-[#94A3B8]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-sm text-[#64748B]">
                          {entry.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEntry(entry)}
                            className="h-9 w-9 rounded-xl text-[#38BDF8] hover:bg-[#EAF8FE]"
                            aria-label="عرض التفاصيل"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#94A3B8]">تصدير السجل الحالي لاستخدامه في المراجعة الداخلية أو الخارجية.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200">
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-h-[82vh] max-w-4xl overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#020617]">تفاصيل سجل التدقيق</DialogTitle>
            <DialogDescription>معلومات تفصيلية عن التغيير والقيم المرتبطة به.</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الإجراء</p>
                  <Badge
                    variant="outline"
                    className="mt-2 rounded-full border-transparent px-3 py-1 font-black"
                    style={{ backgroundColor: actionTone(selectedEntry.action).bg, color: actionTone(selectedEntry.action).text }}
                  >
                    {getActionNameAr(selectedEntry.action)}
                  </Badge>
                </div>
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الجدول</p>
                  <p className="mt-1 font-black text-[#020617]">{getTableNameAr(selectedEntry.table_name)}</p>
                </div>
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الوقت</p>
                  <p className="mt-1 font-black text-[#020617]">
                    {format(new Date(selectedEntry.changed_at), "dd MMMM yyyy - HH:mm:ss", { locale: ar })}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">المستخدم</p>
                  <p className="mt-1 font-black text-[#020617]">{selectedEntry.user_name || "غير محدد"}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{selectedEntry.user_email}</p>
                </div>
              </div>

              {selectedEntry.changed_fields && selectedEntry.changed_fields.length > 0 && (
                <div className="rounded-2xl border border-[#7C83F6]/20 bg-[#ECEEFE] p-4">
                  <p className="mb-2 text-sm font-black text-[#020617]">الحقول المعدلة</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.changed_fields.map((field, index) => (
                      <Badge key={index} variant="outline" className="rounded-full bg-white text-[#5B62D8]">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.action === "UPDATE" && selectedEntry.old_values && selectedEntry.new_values && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#FB6B7A]/20 bg-[#FFF0F2] p-4">
                    <p className="mb-2 text-sm font-black text-[#FB6B7A]">القيم القديمة</p>
                    <pre className="max-h-[300px] overflow-auto text-xs text-[#020617]">
                      {JSON.stringify(selectedEntry.old_values, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-[#22C7A1]/20 bg-[#E8FBF6] p-4">
                    <p className="mb-2 text-sm font-black text-[#0F9F82]">القيم الجديدة</p>
                    <pre className="max-h-[300px] overflow-auto text-xs text-[#020617]">
                      {JSON.stringify(selectedEntry.new_values, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedEntry.action === "INSERT" && selectedEntry.new_values && (
                <div className="rounded-2xl border border-[#22C7A1]/20 bg-[#E8FBF6] p-4">
                  <p className="mb-2 text-sm font-black text-[#0F9F82]">القيم المضافة</p>
                  <pre className="max-h-[300px] overflow-auto text-xs text-[#020617]">
                    {JSON.stringify(selectedEntry.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.action === "DELETE" && selectedEntry.old_values && (
                <div className="rounded-2xl border border-[#FB6B7A]/20 bg-[#FFF0F2] p-4">
                  <p className="mb-2 text-sm font-black text-[#FB6B7A]">القيم المحذوفة</p>
                  <pre className="max-h-[300px] overflow-auto text-xs text-[#020617]">
                    {JSON.stringify(selectedEntry.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.description && (
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الوصف</p>
                  <p className="mt-2 text-sm leading-6 text-[#020617]">{selectedEntry.description}</p>
                </div>
              )}

              <div className="rounded-2xl bg-[#F6F8FB] p-4">
                <p className="text-xs font-bold text-[#94A3B8]">معرف السجل</p>
                <p className="mt-1 font-mono text-xs text-[#020617]">{selectedEntry.record_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
