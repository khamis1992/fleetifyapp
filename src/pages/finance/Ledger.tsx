import React, { useState } from 'react';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  CalendarDays,
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Ledger = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');

  // Sample data to demonstrate proper formatting
  const sampleJournalEntries = [
    {
      id: 'JE-20250902-0001',
      date: '2025-09-02',
      description: 'Contract Revenue - CNT-25-0002',
      reference: 'contract',
      status: 'مؤكد',
      entries: [
        {
          accountCode: '11101',
          accountName: 'النقدية',
          accountNameEn: 'Accounts Receivable - CNT-25-0002',
          debit: 3000.000,
          credit: 0
        },
        {
          accountCode: '41101',
          accountName: 'إيرادات تأجير - شركات',
          accountNameEn: 'Contract Revenue - CNT-25-0002',
          debit: 0,
          credit: 3000.000
        }
      ]
    }
  ];

  return (
    <FinanceErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
      title="خطأ في دفتر الأستاذ"
      context="صفحة دفتر الأستاذ"
    >
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
              <p className="text-muted-foreground">إنشاء وإدارة القيود المحاسبية والحركات المالية</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="lg" className="bg-gradient-primary hover:bg-gradient-primary/90">
              <Link to="/finance/new-entry" className="flex items-center">
                <Plus className="h-5 w-5 ml-2" />
                إنشاء قيد جديد
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/finance/chart-of-accounts">
                <FileText className="h-4 w-4 ml-2" />
                دليل الحسابات
              </Link>
            </Button>
          </div>
        </div>


        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <Filter className="h-5 w-5" />
              البحث والفلتر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث في القيود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
              
              <Input
                type="date"
                placeholder="من تاريخ"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-right"
              />
              
              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-right"
              />

              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  <SelectItem value="11101">11101 - النقدية</SelectItem>
                  <SelectItem value="41101">41101 - إيرادات تأجير</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 ml-2" />
                تطبيق الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries */}
        <div className="space-y-4">
          {sampleJournalEntries.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex justify-between items-center">
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        سند قيد رقم {entry.id}
                      </h3>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        التاريخ: {new Date(entry.date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                      </span>
                      <span>المرجع: {entry.reference}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="bg-blue-50 px-6 py-3 border-b">
                  <p className="text-sm text-right font-medium text-blue-800">
                    البيان: {entry.description}
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-right font-semibold">رمز الحساب</TableHead>
                      <TableHead className="text-right font-semibold">اسم الحساب</TableHead>
                      <TableHead className="text-center font-semibold">البيان</TableHead>
                      <TableHead className="text-center font-semibold text-green-700">مدين</TableHead>
                      <TableHead className="text-center font-semibold text-red-700">دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.entries.map((line, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-center font-medium">
                          {line.accountCode}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-medium">{line.accountName}</div>
                            <div className="text-xs text-muted-foreground">{line.accountNameEn}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {line.accountNameEn}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {line.debit > 0 ? (
                            <span className="text-green-700 font-semibold">
                              {formatCurrency(line.debit, { minimumFractionDigits: 3 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {line.credit > 0 ? (
                            <span className="text-red-700 font-semibold">
                              {formatCurrency(line.credit, { minimumFractionDigits: 3 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Totals */}
                <div className="bg-muted/20 border-t">
                  <Table>
                    <TableBody>
                      <TableRow className="border-0">
                        <TableCell className="font-bold text-right" colSpan={3}>
                          المجموع
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-green-700">
                          {formatCurrency(
                            entry.entries.reduce((sum, line) => sum + line.debit, 0),
                            { minimumFractionDigits: 3 }
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-red-700">
                          {formatCurrency(
                            entry.entries.reduce((sum, line) => sum + line.credit, 0),
                            { minimumFractionDigits: 3 }
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link to="/finance/chart-of-accounts">
                    <FileText className="h-4 w-4 ml-2" />
                    دليل الحسابات
                  </Link>
                </Button>
                
                <Button variant="outline" asChild>
                  <Link to="/finance/dashboard">
                    الوحة المالية
                  </Link>
                </Button>
              </div>
              
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 ml-2" />
                  تصدير إلى Excel
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 ml-2" />
                  استيراد قيود
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceErrorBoundary>
  );
};

export default Ledger;