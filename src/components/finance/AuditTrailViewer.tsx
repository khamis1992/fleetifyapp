import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Search, 
  Filter,
  Eye,
  RefreshCw,
  Download,
  FileText,
  Plus,
  Edit,
  Trash2,
  Clock
} from "lucide-react";
import { useAuditTrail, getTableNameAr, getActionNameAr, getActionColor, type AuditTrailEntry } from "@/hooks/useAuditTrail";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function AuditTrailViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  
  const { data, isLoading, refetch } = useAuditTrail({
    tableName: filterTable !== 'all' ? filterTable : undefined,
    action: filterAction !== 'all' ? filterAction : undefined,
    searchTerm: searchTerm || undefined
  }, 200);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">لا توجد بيانات متاحة</p>
        </CardContent>
      </Card>
    );
  }

  const { entries, stats } = data;

  const getActionIcon = (action: string) => {
    if (action === 'INSERT') return Plus;
    if (action === 'UPDATE') return Edit;
    if (action === 'DELETE') return Trash2;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                سجل التدقيق الشامل (Audit Trail)
              </CardTitle>
              <CardDescription>
                تتبع كامل لجميع التعديلات المحاسبية في النظام
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">إجمالي السجلات</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalEntries}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">إضافة</span>
            </div>
            <div className="text-3xl font-bold">{stats.insertCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-5 w-5" />
              <span className="text-sm font-medium">تعديل</span>
            </div>
            <div className="text-3xl font-bold">{stats.updateCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-5 w-5" />
              <span className="text-sm font-medium">حذف</span>
            </div>
            <div className="text-3xl font-bold">{stats.deleteCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">المستخدمين</span>
            </div>
            <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">الجداول</span>
            </div>
            <div className="text-3xl font-bold">{stats.tablesAffected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالمستخدم، الوصف، أو المعرف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[200px]">
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
              <SelectTrigger className="w-[150px]">
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>الجدول</TableHead>
                <TableHead>المعرف</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الحقول المعدلة</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    لا توجد سجلات مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const Icon = getActionIcon(entry.action);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(entry.action)}>
                          <Icon className="h-3 w-3 mr-1" />
                          {getActionNameAr(entry.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{getTableNameAr(entry.table_name)}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{entry.table_name}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.record_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{entry.user_name || '-'}</TableCell>
                      <TableCell className="text-sm">{entry.user_email || '-'}</TableCell>
                      <TableCell>
                        {entry.changed_fields && entry.changed_fields.length > 0 ? (
                          <Badge variant="secondary">
                            {entry.changed_fields.length} حقل
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {entry.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
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
        </CardContent>
      </Card>

      {/* Export Button */}
      <Card>
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير سجل التدقيق (PDF)
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير (Excel)
          </Button>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل سجل التدقيق</DialogTitle>
            <DialogDescription>
              معلومات تفصيلية عن التعديل الذي تم
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">الإجراء</p>
                  <Badge className={getActionColor(selectedEntry.action)}>
                    {getActionNameAr(selectedEntry.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الجدول</p>
                  <p className="font-medium">{getTableNameAr(selectedEntry.table_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الوقت</p>
                  <p className="font-medium">
                    {format(new Date(selectedEntry.changed_at), 'dd MMMM yyyy - HH:mm:ss', { locale: ar })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستخدم</p>
                  <p className="font-medium">{selectedEntry.user_name || 'غير محدد'}</p>
                  <p className="text-xs text-muted-foreground">{selectedEntry.user_email}</p>
                </div>
              </div>

              {/* Changed Fields */}
              {selectedEntry.changed_fields && selectedEntry.changed_fields.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">الحقول المعدلة:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.changed_fields.map((field, index) => (
                      <Badge key={index} variant="secondary">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Values Comparison */}
              {selectedEntry.action === 'UPDATE' && selectedEntry.old_values && selectedEntry.new_values && (
                <div className="space-y-2">
                  <h3 className="font-semibold">مقارنة القيم</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium mb-2 text-red-800">القيم القديمة</p>
                      <pre className="text-xs overflow-auto max-h-[300px]">
                        {JSON.stringify(selectedEntry.old_values, null, 2)}
                      </pre>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium mb-2 text-green-800">القيم الجديدة</p>
                      <pre className="text-xs overflow-auto max-h-[300px]">
                        {JSON.stringify(selectedEntry.new_values, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Insert Values */}
              {selectedEntry.action === 'INSERT' && selectedEntry.new_values && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium mb-2 text-green-800">القيم المضافة</p>
                  <pre className="text-xs overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedEntry.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {/* Delete Values */}
              {selectedEntry.action === 'DELETE' && selectedEntry.old_values && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium mb-2 text-red-800">القيم المحذوفة</p>
                  <pre className="text-xs overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedEntry.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {/* Description */}
              {selectedEntry.description && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                  <p className="text-sm">{selectedEntry.description}</p>
                </div>
              )}

              {/* Record ID */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">معرف السجل</p>
                <p className="text-xs font-mono">{selectedEntry.record_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

