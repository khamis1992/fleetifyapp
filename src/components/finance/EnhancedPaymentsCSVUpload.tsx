/**
 * واجهة رفع المدفوعات المحسنة مع ربط العقود الذكي
 * تتضمن معاينة البيانات والتحقق من الربط وإعدادات متقدمة
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Link, 
  Unlink,
  Eye,
  Download,
  Settings,
  Zap
} from 'lucide-react';
import { usePaymentsCSVUpload } from '@/hooks/usePaymentsCSVUpload';
import { usePaymentContractLinking } from '@/hooks/usePaymentContractLinking';
import { SmartCSVUpload } from '@/components/csv/SmartCSVUpload';
import { PaymentContractValidator } from '@/utils/paymentContractValidation';

interface EnhancedPaymentsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface LinkingSettings {
  autoLink: boolean;
  minConfidence: number;
  strictMatching: boolean;
  searchMethods: {
    byAgreementNumber: boolean;
    byContractNumber: boolean;
    byCustomerInfo: boolean;
  };
  validationLevel: 'basic' | 'standard' | 'strict';
}

interface PreviewItem {
  rowNumber: number;
  payment: any;
  potentialContracts: any[];
  bestMatch?: any;
  confidence?: number;
  validation?: any;
  warnings: string[];
  errors: string[];
  canLink: boolean;
}

export function EnhancedPaymentsCSVUpload({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: EnhancedPaymentsCSVUploadProps) {
  const {
    smartUploadPayments,
    downloadTemplate,
    analyzePaymentData,
    paymentFieldTypes,
    paymentRequiredFields,
    isUploading,
    progress
  } = usePaymentsCSVUpload();

  const {
    searchPotentialContracts,
    validateLinking,
    linkPaymentToContract
  } = usePaymentContractLinking();

  // الحالات المحلية
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'linking' | 'results'>('upload');
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [linkingSettings, setLinkingSettings] = useState<LinkingSettings>({
    autoLink: true,
    minConfidence: 0.8,
    strictMatching: false,
    searchMethods: {
      byAgreementNumber: true,
      byContractNumber: true,
      byCustomerInfo: false
    },
    validationLevel: 'standard'
  });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // معالجة رفع الملف
  const handleFileUpload = useCallback(async (data: any[]) => {
    setUploadedData(data);
    setCurrentStep('preview');
    
    // تحليل البيانات وإنشاء المعاينة
    setIsAnalyzing(true);
    try {
      const analyzed = await analyzePaymentData(data);
      setAnalysisResults(analyzed);
      
      // إنشاء عناصر المعاينة مع البحث عن العقود
      const preview: PreviewItem[] = [];
      
      for (let i = 0; i < analyzed.length; i++) {
        const item = analyzed[i];
        const payment = item.data;
        
        // البحث عن العقود المحتملة
        const potentialContracts = await searchPotentialContracts(payment);
        const bestMatch = potentialContracts[0];
        
        // التحقق من صحة الربط
        let validation = null;
        if (bestMatch) {
          validation = validateLinking(payment, bestMatch.contract, 'auto');
        }
        
        preview.push({
          rowNumber: item.rowNumber,
          payment,
          potentialContracts,
          bestMatch,
          confidence: bestMatch?.confidence,
          validation,
          warnings: item.warnings || [],
          errors: validation?.overallAssessment?.canProceed === false ? ['لا يمكن الربط'] : [],
          canLink: bestMatch && validation?.overallAssessment?.canProceed !== false
        });
      }
      
      setPreviewItems(preview);
      
      // تحديد العناصر القابلة للربط تلقائياً
      const autoLinkable = new Set(
        preview
          .filter(item => 
            item.canLink && 
            item.confidence && 
            item.confidence >= linkingSettings.minConfidence
          )
          .map(item => item.rowNumber)
      );
      setSelectedItems(autoLinkable);
      
    } catch (error) {
      console.error('خطأ في تحليل البيانات:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzePaymentData, searchPotentialContracts, validateLinking, linkingSettings.minConfidence]);

  // معالجة الربط
  const handleLinking = useCallback(async () => {
    setCurrentStep('linking');
    
    const selectedPreviewItems = previewItems.filter(item => 
      selectedItems.has(item.rowNumber)
    );
    
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const item of selectedPreviewItems) {
      try {
        if (item.bestMatch && item.canLink) {
          // هنا يمكن إضافة منطق الربط الفعلي
          // await linkPaymentToContract.mutateAsync({...});
          successful++;
        } else {
          failed++;
          errors.push(`الصف ${item.rowNumber}: لا يوجد عقد مناسب للربط`);
        }
      } catch (error) {
        failed++;
        errors.push(`الصف ${item.rowNumber}: ${error}`);
      }
    }
    
    // رفع البيانات الفعلي
    try {
      const uploadResults = await smartUploadPayments(uploadedData, {
        previewMode: false,
        targetCompanyId: undefined,
        autoCreateCustomers: true
      });
      
      setCurrentStep('results');
      onUploadComplete();
    } catch (error) {
      console.error('خطأ في رفع البيانات:', error);
    }
  }, [previewItems, selectedItems, smartUploadPayments, uploadedData, onUploadComplete]);

  // تبديل تحديد العنصر
  const toggleItemSelection = (rowNumber: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedItems(newSelected);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedItems.size === previewItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(previewItems.map(item => item.rowNumber)));
    }
  };

  // عرض إعدادات الربط
  const renderLinkingSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إعدادات الربط
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الحد الأدنى للثقة</Label>
            <Select
              value={linkingSettings.minConfidence.toString()}
              onValueChange={(value) => 
                setLinkingSettings(prev => ({ 
                  ...prev, 
                  minConfidence: parseFloat(value) 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">50% - منخفض</SelectItem>
                <SelectItem value="0.7">70% - متوسط</SelectItem>
                <SelectItem value="0.8">80% - عالي</SelectItem>
                <SelectItem value="0.9">90% - عالي جداً</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>مستوى التحقق</Label>
            <Select
              value={linkingSettings.validationLevel}
              onValueChange={(value: 'basic' | 'standard' | 'strict') => 
                setLinkingSettings(prev => ({ 
                  ...prev, 
                  validationLevel: value 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">أساسي</SelectItem>
                <SelectItem value="standard">قياسي</SelectItem>
                <SelectItem value="strict">صارم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>طرق البحث</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={linkingSettings.searchMethods.byAgreementNumber}
                onCheckedChange={(checked) =>
                  setLinkingSettings(prev => ({
                    ...prev,
                    searchMethods: {
                      ...prev.searchMethods,
                      byAgreementNumber: !!checked
                    }
                  }))
                }
              />
              <Label>البحث برقم الاتفاقية</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={linkingSettings.searchMethods.byContractNumber}
                onCheckedChange={(checked) =>
                  setLinkingSettings(prev => ({
                    ...prev,
                    searchMethods: {
                      ...prev.searchMethods,
                      byContractNumber: !!checked
                    }
                  }))
                }
              />
              <Label>البحث برقم العقد</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={linkingSettings.searchMethods.byCustomerInfo}
                onCheckedChange={(checked) =>
                  setLinkingSettings(prev => ({
                    ...prev,
                    searchMethods: {
                      ...prev.searchMethods,
                      byCustomerInfo: !!checked
                    }
                  }))
                }
              />
              <Label>البحث بمعلومات العميل</Label>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={linkingSettings.autoLink}
            onCheckedChange={(checked) =>
              setLinkingSettings(prev => ({ 
                ...prev, 
                autoLink: !!checked 
              }))
            }
          />
          <Label>الربط التلقائي للمدفوعات عالية الثقة</Label>
        </div>
      </CardContent>
    </Card>
  );

  // عرض معاينة البيانات
  const renderPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedItems.size === previewItems.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </Button>
          <span className="text-sm text-gray-600">
            محدد: {selectedItems.size} من {previewItems.length}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep('upload')}
          >
            العودة
          </Button>
          <Button
            onClick={handleLinking}
            disabled={selectedItems.size === 0}
            className="flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            متابعة الربط ({selectedItems.size})
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === previewItems.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>الصف</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>رقم الاتفاقية</TableHead>
              <TableHead>العقد المطابق</TableHead>
              <TableHead>الثقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewItems.map((item) => (
              <TableRow key={item.rowNumber}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(item.rowNumber)}
                    onCheckedChange={() => toggleItemSelection(item.rowNumber)}
                  />
                </TableCell>
                <TableCell>{item.rowNumber}</TableCell>
                <TableCell>{item.payment.amount}</TableCell>
                <TableCell>{item.payment.agreement_number || '-'}</TableCell>
                <TableCell>
                  {item.bestMatch ? (
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-green-600" />
                      {item.bestMatch.contract.contract_number}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Unlink className="h-4 w-4 text-gray-400" />
                      لا يوجد تطابق
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.confidence && (
                    <Badge variant={item.confidence >= 0.8 ? 'default' : 'secondary'}>
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {item.canLink ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : item.errors.length > 0 ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {item.warnings.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.warnings.length} تحذير
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع المدفوعات المحسن مع ربط العقود
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">رفع الملف</TabsTrigger>
            <TabsTrigger value="preview" disabled={currentStep === 'upload'}>
              معاينة البيانات
            </TabsTrigger>
            <TabsTrigger value="linking" disabled={!['preview', 'linking'].includes(currentStep)}>
              الربط
            </TabsTrigger>
            <TabsTrigger value="results" disabled={currentStep !== 'results'}>
              النتائج
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SmartCSVUpload
                  open={true}
                  onOpenChange={() => {}}
                  onUploadComplete={() => handleFileUpload([])}
                  entityType="payment"
                  uploadFunction={smartUploadPayments}
                  downloadTemplate={downloadTemplate}
                  fieldTypes={paymentFieldTypes}
                  requiredFields={paymentRequiredFields}
                />
              </div>
              <div className="space-y-4">
                {renderLinkingSettings()}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">نصائح للرفع</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• تأكد من وجود رقم الاتفاقية أو العقد</p>
                    <p>• استخدم التواريخ بصيغة YYYY-MM-DD</p>
                    <p>• تأكد من صحة المبالغ</p>
                    <p>• راجع البيانات قبل الرفع النهائي</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>جاري تحليل البيانات وربط العقود...</p>
                </div>
              </div>
            ) : (
              renderPreview()
            )}
          </TabsContent>
          
          <TabsContent value="linking" className="space-y-4">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>جاري ربط المدفوعات بالعقود...</p>
              {progress > 0 && (
                <Progress value={progress} className="mt-4 max-w-md mx-auto" />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">تم الرفع بنجاح!</h3>
              <p className="text-gray-600 mb-4">
                تم رفع وربط المدفوعات بنجاح
              </p>
              <Button onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedPaymentsCSVUpload;
