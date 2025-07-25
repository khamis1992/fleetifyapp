import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { BookOpen, Search, Filter, Download, Eye, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useJournalEntries, useJournalEntryLines } from "@/hooks/useFinance";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Ledger() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  const { data: journalEntries, isLoading: entriesLoading, error: entriesError } = useJournalEntries({ status: statusFilter === "all" ? undefined : statusFilter });
  const { data: entryLines, isLoading: linesLoading } = useJournalEntryLines(selectedEntryId || undefined);

  const filteredEntries = journalEntries?.filter(entry =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'posted':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'reversed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted':
        return 'مرحل';
      case 'draft':
        return 'مسودة';
      case 'reversed':
        return 'ملغي';
      default:
        return status;
    }
  };

  if (entriesLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  if (entriesError) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>دفتر الأستاذ العام</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">دفتر الأستاذ العام</h1>
          <p className="text-muted-foreground">
            عرض وإدارة جميع القيود المحاسبية والمعاملات المالية
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            تقرير
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيود</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journalEntries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              قيد محاسبي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيود المرحلة</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {journalEntries?.filter(e => e.status === 'posted').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              قيد مرحل
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المسودات</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {journalEntries?.filter(e => e.status === 'draft').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              مسودة قيد
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيود الملغية</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {journalEntries?.filter(e => e.status === 'reversed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              قيد ملغي
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>القيود المحاسبية</CardTitle>
              <CardDescription>قائمة جميع القيود المحاسبية في النظام</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في القيود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="تصفية بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="posted">مرحل</SelectItem>
                  <SelectItem value="reversed">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم القيد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>إجمالي المدين</TableHead>
                <TableHead>إجمالي الدائن</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries?.map((entry) => (
                <TableRow 
                  key={entry.id}
                  className={selectedEntryId === entry.id ? "bg-muted/50" : ""}
                >
                  <TableCell className="font-medium">{entry.entry_number}</TableCell>
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {entry.total_debit.toFixed(3)} د.ك
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {entry.total_credit.toFixed(3)} د.ك
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(entry.status)}>
                      {getStatusLabel(entry.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEntries?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد قيود محاسبية
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Details */}
      {selectedEntryId && (
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل القيد المحاسبي</CardTitle>
            <CardDescription>
              تفاصيل بنود القيد المحاسبي المحدد
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linesLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم البند</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entryLines?.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.line_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{line.account?.account_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {line.account?.account_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{line.line_description || '-'}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {line.debit_amount > 0 ? `${line.debit_amount.toFixed(3)} د.ك` : '-'}
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {line.credit_amount > 0 ? `${line.credit_amount.toFixed(3)} د.ك` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}