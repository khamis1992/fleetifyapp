import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Link as LinkIcon, 
  Unlink, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Search,
  Download,
  Eye,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { useInvoiceJournalLinking, useInvoiceJournalDetails, type InvoiceJournalLink } from "@/hooks/useInvoiceJournalLinking";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function InvoiceJournalLinkingReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceJournalLink | null>(null);
  
  const { formatCurrency } = useCurrencyFormatter();
  const { data, isLoading, refetch } = useInvoiceJournalLinking();
  const { data: journalDetails, isLoading: loadingDetails } = useInvoiceJournalDetails(selectedInvoice?.journal_entry_id || null);

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

  const { links, stats } = data;

  // Filter links
  const filteredLinks = links.filter(link => {
    // Status filter
    if (filterStatus === 'linked' && !link.is_linked) return false;
    if (filterStatus === 'unlinked' && link.is_linked) return false;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        link.invoice_number.toLowerCase().includes(searchLower) ||
        link.customer_name.toLowerCase().includes(searchLower) ||
        link.journal_entry_number?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                تقرير ربط الفواتير بالقيود المحاسبية
              </CardTitle>
              <CardDescription>
                عرض شامل لجميع الفواتير وقيودها المحاسبية المرتبطة
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">إجمالي الفواتير</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">فواتير مربوطة</span>
            </div>
            <div className="text-3xl font-bold">{stats.linkedInvoices}</div>
            <div className="text-sm mt-1">
              {stats.linkingPercentage.toFixed(1)}% من الإجمالي
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">فواتير غير مربوطة</span>
            </div>
            <div className="text-3xl font-bold">{stats.unlinkedInvoices}</div>
            <div className="text-sm mt-1">
              {((stats.unlinkedInvoices / stats.totalInvoices) * 100).toFixed(1)}% من الإجمالي
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">ربط تلقائي</span>
            </div>
            <div className="text-3xl font-bold">{stats.automaticLinks}</div>
            <div className="text-sm mt-1">
              {stats.manualLinks} ربط يدوي
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة، العميل، أو رقم القيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                الكل ({stats.totalInvoices})
              </Button>
              <Button
                variant={filterStatus === 'linked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('linked')}
              >
                مربوطة ({stats.linkedInvoices})
              </Button>
              <Button
                variant={filterStatus === 'unlinked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('unlinked')}
              >
                غير مربوطة ({stats.unlinkedInvoices})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead>حالة الربط</TableHead>
                <TableHead>نوع الربط</TableHead>
                <TableHead>رقم القيد</TableHead>
                <TableHead>حالة القيد</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    لا توجد فواتير مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredLinks.map((link) => (
                  <TableRow key={link.invoice_id}>
                    <TableCell className="font-medium">
                      {link.invoice_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(link.invoice_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>{link.customer_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(link.total_amount)}
                    </TableCell>
                    <TableCell>
                      {link.is_linked ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          مربوطة
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Unlink className="h-3 w-3 mr-1" />
                          غير مربوطة
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.link_type === 'automatic' && (
                        <Badge variant="default" className="bg-blue-600">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          تلقائي
                        </Badge>
                      )}
                      {link.link_type === 'manual' && (
                        <Badge variant="secondary">
                          يدوي
                        </Badge>
                      )}
                      {link.link_type === 'none' && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.journal_entry_number || (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.journal_entry_status ? (
                        <Badge
                          variant={
                            link.journal_entry_status === 'posted' ? 'default' :
                            link.journal_entry_status === 'approved' ? 'default' :
                            'secondary'
                          }
                        >
                          {link.journal_entry_status === 'draft' && 'مسودة'}
                          {link.journal_entry_status === 'under_review' && 'قيد المراجعة'}
                          {link.journal_entry_status === 'approved' && 'معتمد'}
                          {link.journal_entry_status === 'posted' && 'مرحل'}
                          {link.journal_entry_status === 'reversed' && 'معكوس'}
                          {link.journal_entry_status === 'cancelled' && 'ملغى'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.is_linked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(link)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
            تصدير التقرير (PDF)
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير (Excel)
          </Button>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل القيد المحاسبي</DialogTitle>
            <DialogDescription>
              القيد المرتبط بالفاتورة رقم {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : journalDetails ? (
            <div className="space-y-4">
              {/* Journal Entry Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">رقم القيد</p>
                  <p className="font-medium">{journalDetails.entry_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">
                    {format(new Date(journalDetails.entry_date), 'dd/MM/yyyy', { locale: ar })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge>
                    {journalDetails.status === 'draft' && 'مسودة'}
                    {journalDetails.status === 'under_review' && 'قيد المراجعة'}
                    {journalDetails.status === 'approved' && 'معتمد'}
                    {journalDetails.status === 'posted' && 'مرحل'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="font-medium">{formatCurrency(Number(journalDetails.total_debit || 0))}</p>
                </div>
              </div>

              {/* Description */}
              {journalDetails.description && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                  <p className="text-sm">{journalDetails.description}</p>
                </div>
              )}

              {/* Journal Entry Lines */}
              <div>
                <h3 className="font-semibold mb-2">سطور القيد</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحساب</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead className="text-right">مدين</TableHead>
                      <TableHead className="text-right">دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalDetails.journal_entry_lines?.map((line: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {line.chart_of_accounts?.account_code || line.account_code}
                        </TableCell>
                        <TableCell>
                          {line.chart_of_accounts?.account_name || 'غير محدد'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {line.debit_amount > 0 ? formatCurrency(Number(line.debit_amount)) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {line.credit_amount > 0 ? formatCurrency(Number(line.credit_amount)) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={2}>الإجمالي</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(journalDetails.total_debit || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(journalDetails.total_credit || 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لم يتم العثور على تفاصيل القيد
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

