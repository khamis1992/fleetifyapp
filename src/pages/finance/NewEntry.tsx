import React, { useState } from 'react';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowRight,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

const NewEntry = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: '1', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
  ]);

  const addLine = () => {
    const newLine: JournalEntryLine = {
      id: Date.now().toString(),
      accountCode: '',
      accountName: '',
      description: '',
      debit: 0,
      credit: 0
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof JournalEntryLine, value: any) => {
    setLines(lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <FinanceErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
      title="خطأ في إنشاء القيد"
      context="صفحة إنشاء قيد جديد"
    >
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold">إنشاء قيد محاسبي جديد</h1>
              <p className="text-muted-foreground">إضافة قيد يومي جديد إلى دفتر الأستاذ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/finance/journal-entries">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للقيود
              </Link>
            </Button>
          </div>
        </div>

        {/* Entry Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              تفاصيل القيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate" className="text-right">تاريخ القيد</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="text-right"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-right">المرجع</Label>
                <Input
                  id="reference"
                  placeholder="رقم المرجع أو الوثيقة"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="text-right"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-right">البيان العام</Label>
                <Textarea
                  id="description"
                  placeholder="وصف القيد المحاسبي"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-right min-h-[60px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journal Entry Lines */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-right">
                تفاصيل القيد المحاسبي
              </CardTitle>
              <Button onClick={addLine} variant="outline" size="sm">
                <Plus className="h-4 w-4 ml-2" />
                إضافة سطر
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-right font-semibold">رمز الحساب</TableHead>
                  <TableHead className="text-right font-semibold">اسم الحساب</TableHead>
                  <TableHead className="text-right font-semibold">البيان</TableHead>
                  <TableHead className="text-center font-semibold text-green-700">مدين</TableHead>
                  <TableHead className="text-center font-semibold text-red-700">دائن</TableHead>
                  <TableHead className="text-center font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select 
                        value={line.accountCode} 
                        onValueChange={(value) => {
                          updateLine(line.id, 'accountCode', value);
                          // Update account name based on selection
                          const accountNames: Record<string, string> = {
                            '11101': 'النقدية',
                            '11102': 'البنك - الحساب الجاري',
                            '12101': 'حسابات المدينين',
                            '41101': 'إيرادات تأجير - شركات',
                            '51101': 'مصروفات التشغيل'
                          };
                          updateLine(line.id, 'accountName', accountNames[value] || '');
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="11101">11101</SelectItem>
                          <SelectItem value="11102">11102</SelectItem>
                          <SelectItem value="12101">12101</SelectItem>
                          <SelectItem value="41101">41101</SelectItem>
                          <SelectItem value="51101">51101</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-right font-medium">
                        {line.accountName || 'اختر الحساب'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="وصف العملية"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        className="text-right text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={line.debit || ''}
                        onChange={(e) => {
                          updateLine(line.id, 'debit', parseFloat(e.target.value) || 0);
                          if (parseFloat(e.target.value) > 0) {
                            updateLine(line.id, 'credit', 0);
                          }
                        }}
                        className="text-center font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={line.credit || ''}
                        onChange={(e) => {
                          updateLine(line.id, 'credit', parseFloat(e.target.value) || 0);
                          if (parseFloat(e.target.value) > 0) {
                            updateLine(line.id, 'debit', 0);
                          }
                        }}
                        className="text-center font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 2}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Totals */}
            <div className="bg-muted/20 border-t p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="col-span-3 text-right">
                  <span className="font-bold">المجموع:</span>
                </div>
                <div className="text-center">
                  <span className="font-mono font-bold text-green-700">
                    {formatCurrency(totalDebit, { minimumFractionDigits: 3 })}
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-mono font-bold text-red-700">
                    {formatCurrency(totalCredit, { minimumFractionDigits: 3 })}
                  </span>
                </div>
                <div className="text-center">
                  {!isBalanced && totalDebit !== totalCredit && (
                    <div className="flex items-center justify-center text-destructive">
                      <AlertCircle className="h-4 w-4 ml-1" />
                      <span className="text-xs">غير متوازن</span>
                    </div>
                  )}
                  {isBalanced && (
                    <div className="flex items-center justify-center text-green-600">
                      <Calculator className="h-4 w-4 ml-1" />
                      <span className="text-xs">متوازن</span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isBalanced && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      فرق التوازن: {formatCurrency(Math.abs(totalDebit - totalCredit), { minimumFractionDigits: 3 })}
                      {totalDebit > totalCredit ? ' (زيادة في المدين)' : ' (زيادة في الدائن)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                disabled={!isBalanced}
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Save className="h-5 w-5 ml-2" />
                حفظ القيد
              </Button>
              
              <Button variant="outline" size="lg">
                <Save className="h-5 w-5 ml-2" />
                حفظ كمسودة
              </Button>
              
              <Button variant="outline" size="lg" asChild>
                <Link to="/finance/journal-entries">
                  إلغاء
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceErrorBoundary>
  );
};

export default NewEntry;