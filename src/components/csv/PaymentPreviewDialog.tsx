import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Info, DollarSign, FileText, CreditCard } from "lucide-react";
import { formatNumber } from "@/utils/numberFormatter";

interface PaymentPreviewItem {
  rowNumber: number;
  data: any;
  paidAmount: number;
  totalAmount?: number;
  balance?: number;
  hasBalance: boolean;
  isZeroPayment: boolean;
  warnings: string[];
  lateFineAmount?: number;
  lateFineStatus?: 'none' | 'paid' | 'waived' | 'pending';
  lateFineType?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  lateFineWaiverReason?: string;
  contractInfo?: {
    contract_id: string;
    contract_number: string;
    contract_amount: number;
    balance_due: number;
    payment_status: string;
    days_overdue?: number;
    late_fine_amount?: number;
  };
}

interface PaymentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PaymentPreviewItem[];
  onConfirm: (selectedItems: PaymentPreviewItem[], balanceHandling: 'ignore' | 'record_debt' | 'create_invoice') => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function PaymentPreviewDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  onCancel,
  isProcessing
}: PaymentPreviewDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(items.filter(item => !item.isZeroPayment).map((_, index) => index))
  );
  const [filterZeroPayments, setFilterZeroPayments] = useState(true);
  const [balanceHandling, setBalanceHandling] = useState<'ignore' | 'record_debt' | 'create_invoice'>('ignore');

  // Show diagnostic information if no valid items
  React.useEffect(() => {
    if (items.length === 0) {
      console.log('⚠️ لا توجد عناصر في معاينة المدفوعات');
    } else {
      const validItems = items.filter(item => !item.isZeroPayment);
      console.log(`✅ عناصر صحيحة: ${validItems.length} من أصل ${items.length}`);
      
      if (validItems.length === 0) {
        console.log('❌ جميع العناصر لها مبالغ صفرية أو غير صحيحة');
      }
    }
  }, [items]);

  const filteredItems = filterZeroPayments 
    ? items.filter(item => !item.isZeroPayment)
    : items;

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((_, index) => index)));
    }
  };

  const handleConfirm = () => {
    const selected = filteredItems.filter((_, index) => selectedItems.has(index));
    onConfirm(selected, balanceHandling);
  };

  const totalSelected = selectedItems.size;
  const totalPaidAmount = filteredItems
    .filter((_, index) => selectedItems.has(index))
    .reduce((sum, item) => sum + item.paidAmount, 0);
  const totalLateFines = filteredItems
    .filter((_, index) => selectedItems.has(index))
    .reduce((sum, item) => sum + (item.lateFineAmount || 0), 0);

  const itemsWithBalance = filteredItems.filter(item => item.hasBalance).length;
  const totalRemainingBalance = filteredItems
    .filter((_, index) => selectedItems.has(index))
    .reduce((sum, item) => sum + (item.balance || 0), 0);
  const itemsWithFines = filteredItems.filter(item => item.lateFineAmount && item.lateFineAmount > 0).length;
  const zeroPayments = items.filter(item => item.isZeroPayment).length;
  const contractsLinked = filteredItems.filter(item => item.contractInfo).length;
  const overdueContracts = filteredItems.filter(item => 
    item.contractInfo?.payment_status === 'overdue' || 
    (item.contractInfo?.days_overdue && item.contractInfo.days_overdue > 0)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            معاينة بيانات المدفوعات
          </DialogTitle>
          <DialogDescription>
            راجع البيانات قبل الرفع النهائي
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error State - No Valid Data */}
          {items.length === 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  لا توجد بيانات صحيحة للمعاينة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-red-700">
                    لم يتم العثور على أي بيانات صحيحة في الملف المرفوع. تأكد من:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    <li>وجود عمود "payment_date" أو "تاريخ_الدفع" مع تواريخ صحيحة</li>
                    <li>وجود عمود "amount" أو "amount_paid" أو "مبلغ_الدفع" مع قيم أكبر من صفر</li>
                    <li>استخدام القالب الصحيح المحمل من النظام</li>
                    <li>تنسيق التواريخ بشكل صحيح (مثل: 2025-01-15)</li>
                  </ul>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                      رجوع
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      إعادة تحميل الصفحة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Zero Payments Warning */}
          {items.length > 0 && filteredItems.length === 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  جميع الدفعات لها مبالغ صفرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-yellow-700">
                    تم اكتشاف {items.length} صف ولكن جميعها تحتوي على مبالغ دفع = 0. 
                    تأكد من صحة البيانات في عمود المبلغ.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showZeroForced"
                      checked={!filterZeroPayments}
                      onCheckedChange={(checked) => setFilterZeroPayments(!checked)}
                    />
                    <label htmlFor="showZeroForced" className="text-sm text-yellow-700">
                      عرض الدفعات الصفرية للمراجعة
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{totalSelected}</div>
                <p className="text-xs text-muted-foreground">دفعات محددة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(totalPaidAmount)}
                </div>
                <p className="text-xs text-muted-foreground">إجمالي المبلغ المحدد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(totalLateFines)}
                </div>
                <p className="text-xs text-muted-foreground">إجمالي الغرامات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{contractsLinked}</div>
                <p className="text-xs text-muted-foreground">عقود مربوطة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{overdueContracts}</div>
                <p className="text-xs text-muted-foreground">عقود متأخرة</p>
              </CardContent>
            </Card>
          </div>

          {/* Balance Handling Options */}
          {itemsWithBalance > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  معالجة الأرصدة المتبقية - إجمالي: {formatNumber(totalRemainingBalance)} د.ك
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-sm text-orange-700">
                  يوجد {itemsWithBalance} عنصر يحتوي على رصيد متبقي لم يتم دفعه بإجمالي {formatNumber(totalRemainingBalance)} د.ك.
                  اختر طريقة المعالجة:
                </p>
                
                <RadioGroup 
                  value={balanceHandling} 
                  onValueChange={(value: 'ignore' | 'record_debt' | 'create_invoice') => setBalanceHandling(value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="ignore" id="ignore" />
                    <Label htmlFor="ignore" className="text-sm cursor-pointer flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      تجاهل الأرصدة المتبقية (الوضع الحالي)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="record_debt" id="record_debt" />
                    <Label htmlFor="record_debt" className="text-sm cursor-pointer flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      تسجيل الأرصدة كديون على العملاء
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="create_invoice" id="create_invoice" />
                    <Label htmlFor="create_invoice" className="text-sm cursor-pointer flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      إنشاء فواتير للأرصدة المتبقية
                    </Label>
                  </div>
                </RadioGroup>
                
                {balanceHandling === 'record_debt' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-700">
                      سيتم تحديث رصيد العقود بالأرصدة المتبقية وتسجيلها كديون على العملاء.
                    </p>
                  </div>
                )}
                
                {balanceHandling === 'create_invoice' && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-xs text-green-700">
                      سيتم إنشاء فواتير جديدة للأرصدة المتبقية مع ربطها بالعقود المناسبة.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {itemsWithFines > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  تنبيه: وجود غرامات تأخير
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-red-700">
                  يوجد {itemsWithFines} عنصر يحتوي على غرامات تأخير بإجمالي {formatNumber(totalLateFines)} د.ك. 
                  تأكد من طريقة معالجة الغرامات قبل الرفع.
                </p>
              </CardContent>
            </Card>
          )}

          {zeroPayments > 0 && (
            <Card className="border-gray-200 bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  دفعات بمبلغ صفر
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-gray-700">
                  يوجد {zeroPayments} صف يحتوي على مبلغ مدفوع = 0. 
                  هذه الصفوف مخفية افتراضياً.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showZero"
                    checked={!filterZeroPayments}
                    onCheckedChange={(checked) => setFilterZeroPayments(!checked)}
                  />
                  <label htmlFor="showZero" className="text-sm text-gray-700">
                    عرض الدفعات الصفرية
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">بيانات المدفوعات</CardTitle>
                  <CardDescription>
                    اختر الدفعات المطلوب رفعها
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedItems.size === filteredItems.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">اختيار</TableHead>
                    <TableHead>الصف</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المبلغ المدفوع</TableHead>
                    <TableHead>غرامة التأخير</TableHead>
                    <TableHead>معلومات العقد</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>تحذيرات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => (
                    <TableRow key={index} className={item.isZeroPayment ? "bg-gray-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(index)}
                          onCheckedChange={() => toggleItem(index)}
                          disabled={item.isZeroPayment}
                        />
                      </TableCell>
                      <TableCell>{item.rowNumber}</TableCell>
                      <TableCell>{item.data.customer_name || item.data.customer_phone || '-'}</TableCell>
                      <TableCell>
                        <span className={item.isZeroPayment ? "text-gray-500" : "font-medium"}>
                          {formatNumber(item.paidAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.lateFineAmount && item.lateFineAmount > 0 ? (
                          <div className="space-y-1">
                            <div className="font-medium text-orange-600">
                              {formatNumber(item.lateFineAmount)}
                            </div>
                            <div className="text-xs">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  item.lateFineType === 'included_with_payment' ? 'text-green-700 border-green-300' :
                                  item.lateFineType === 'separate_payment' ? 'text-orange-700 border-orange-300' :
                                  item.lateFineType === 'waived' ? 'text-blue-700 border-blue-300' :
                                  'text-gray-700 border-gray-300'
                                }`}
                              >
                                {item.lateFineType === 'included_with_payment' && 'مدمج مع الدفعة'}
                                {item.lateFineType === 'separate_payment' && 'دفعة منفصلة'}
                                {item.lateFineType === 'waived' && 'معفى'}
                                {item.lateFineType === 'none' && 'غير محدد'}
                              </Badge>
                            </div>
                            {item.lateFineStatus === 'waived' && item.lateFineWaiverReason && (
                              <div className="text-xs text-muted-foreground">
                                سبب الإعفاء: {item.lateFineWaiverReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.contractInfo ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-medium text-blue-600">
                              {item.contractInfo.contract_number}
                            </div>
                            <div className="text-muted-foreground">
                              رصيد: {formatNumber(item.contractInfo.balance_due)}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                item.contractInfo.payment_status === 'paid' ? 'text-green-700 border-green-300' :
                                item.contractInfo.payment_status === 'overdue' ? 'text-red-700 border-red-300' :
                                item.contractInfo.payment_status === 'partial' ? 'text-orange-700 border-orange-300' :
                                'text-gray-700 border-gray-300'
                              }`}
                            >
                              {item.contractInfo.payment_status === 'paid' ? 'مسدد' :
                               item.contractInfo.payment_status === 'overdue' ? 'متأخر' :
                               item.contractInfo.payment_status === 'partial' ? 'جزئي' : 'غير مسدد'}
                            </Badge>
                            {item.contractInfo.days_overdue && item.contractInfo.days_overdue > 0 && (
                              <div className="text-xs text-red-600">
                                متأخر {item.contractInfo.days_overdue} يوم
                              </div>
                            )}
                          </div>
                        ) : item.data.contract_number ? (
                          <div className="text-xs text-red-600">
                            العقد غير موجود: {item.data.contract_number}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{item.data.payment_type || item.data.payment_method || '-'}</TableCell>
                       <TableCell>
                         <div className="space-y-1">
                           {item.data.payment_date && (
                             <div className="text-sm font-medium">
                               {new Date(item.data.payment_date).toLocaleDateString('ar-SA')}
                             </div>
                           )}
                           {item.data.original_due_date && (
                             <div className="text-xs text-muted-foreground">
                               استحقاق: {new Date(item.data.original_due_date).toLocaleDateString('ar-SA')}
                             </div>
                           )}
                           {!item.data.payment_date && !item.data.original_due_date && '-'}
                         </div>
                       </TableCell>
                      <TableCell>
                        {item.warnings.length > 0 && (
                          <div className="space-y-1">
                            {item.warnings.map((warning, i) => (
                              <Badge key={i} variant="outline" className="text-xs text-orange-600">
                                {warning}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              إلغاء
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing || selectedItems.size === 0}
            >
              {isProcessing ? 'جاري الرفع...' : `رفع ${selectedItems.size} دفعة`}
              {itemsWithBalance > 0 && balanceHandling !== 'ignore' && (
                <span className="mr-2">
                  + معالجة {itemsWithBalance} رصيد
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}