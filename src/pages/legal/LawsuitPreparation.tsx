/**
 * صفحة تجهيز الدعوى
 * لتجهيز جميع البيانات والمستندات المطلوبة لرفع دعوى في تقاضي
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { 
  Gavel, 
  FileText, 
  Download,
  Copy,
  Check,
  ExternalLink,
  User,
  Car,
  DollarSign,
  Calendar,
  Building2,
  ClipboardList,
  FileCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { 
  lawsuitService, 
  LawsuitPreparation,
  CompanyLegalDocument,
  DOCUMENT_TYPE_NAMES,
  LegalDocumentType,
} from '@/services/LawsuitService';

// واجهة بيانات تقاضي
interface TaqadiData {
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
}

export default function LawsuitPreparationPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  
  // الحالات
  const [taqadiData, setTaqadiData] = useState<TaqadiData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // جلب بيانات العقد
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract-details', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers(id, first_name, last_name, national_id, phone, email),
          vehicles(make, model, year, plate_number, color)
        `)
        .eq('id', contractId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contractId,
  });

  // جلب الفواتير المتأخرة
  const { data: overdueInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['overdue-invoices', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contractId)
        .lt('due_date', new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      return (data || []).filter(inv => (inv.total_amount || 0) - (inv.paid_amount || 0) > 0);
    },
    enabled: !!contractId,
  });

  // جلب مستندات الشركة
  const { data: legalDocs = [] } = useQuery({
    queryKey: ['company-legal-documents', companyId],
    queryFn: () => lawsuitService.getCompanyLegalDocuments(companyId!),
    enabled: !!companyId,
  });

  // حساب المبالغ
  const calculations = React.useMemo(() => {
    const overdueRent = overdueInvoices.reduce(
      (sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 
      0
    );
    const lateFees = Math.round(overdueRent * 0.05); // 5% غرامة تأخير
    const otherFees = 500; // رسوم إدارية
    const total = overdueRent + lateFees + otherFees;
    
    return {
      overdueRent,
      lateFees,
      otherFees,
      total,
      amountInWords: lawsuitService.convertAmountToWords(total),
    };
  }, [overdueInvoices]);

  // توليد بيانات تقاضي
  useEffect(() => {
    if (contract && calculations.total > 0) {
      const customer = contract.customers as any;
      const vehicle = contract.vehicles as any;
      const vehicleInfo = `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`;
      
      // تجميع اسم العميل
      const customerFullName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
        : 'غير معروف';
      
      setTaqadiData({
        caseTitle: lawsuitService.generateCaseTitle(customerFullName),
        facts: lawsuitService.generateFactsText(
          customerFullName,
          contract.start_date,
          vehicleInfo,
          calculations.total
        ),
        claims: lawsuitService.generateClaimsText(calculations.total),
        amount: calculations.total,
        amountInWords: calculations.amountInWords,
      });
    }
  }, [contract, calculations]);

  // نسخ نص
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('تم النسخ!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('فشل النسخ');
    }
  }, []);

  // نسخ جميع البيانات
  const copyAllData = useCallback(async () => {
    if (!taqadiData) return;
    
    const allText = `عنوان الدعوى:
${taqadiData.caseTitle}

الوقائع:
${taqadiData.facts}

الطلبات:
${taqadiData.claims}

المبلغ: ${taqadiData.amount.toLocaleString('ar-QA')} ريال قطري
المبلغ كتابة: ${taqadiData.amountInWords}`;
    
    await copyToClipboard(allText, 'all');
  }, [taqadiData, copyToClipboard]);

  // فتح تقاضي
  const openTaqadi = () => {
    window.open('https://taqadi.sjc.gov.qa/itc/f/caseinfoext/create', '_blank');
  };

  // إرسال البيانات للإضافة
  const sendToExtension = useCallback(() => {
    if (!taqadiData || !contract) {
      toast.error('لا توجد بيانات للإرسال');
      return;
    }

    // حساب اسم العميل داخل الدالة لتجنب مشكلة الترتيب
    const customer = (contract as any).customers;
    const defendantName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';

    const extensionData = {
      caseTitle: taqadiData.caseTitle,
      facts: taqadiData.facts,
      claims: taqadiData.claims,
      amount: taqadiData.amount,
      amountInWords: taqadiData.amountInWords,
      defendantName: defendantName,
      contractNumber: contract.contract_number,
      savedAt: new Date().toISOString(),
    };

    // حفظ في localStorage للإضافة
    localStorage.setItem('alarafLawsuitData', JSON.stringify(extensionData));
    
    // محاولة إرسال للإضافة مباشرة (إذا كانت مثبتة)
    try {
      // @ts-ignore - Chrome extension API
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Extension ID - يجب تحديثه بعد تثبيت الإضافة
        const extensionId = localStorage.getItem('alarafExtensionId');
        if (extensionId) {
          // @ts-ignore
          chrome.runtime.sendMessage(extensionId, {
            action: 'saveLawsuitData',
            data: extensionData
          });
        }
      }
    } catch (e) {
      // الإضافة غير مثبتة - لا مشكلة
    }

    toast.success('تم حفظ البيانات! افتح موقع تقاضي واضغط "تعبئة من العراف"');
  }, [taqadiData, contract]);

  // الحصول على مستند حسب النوع
  const getDocByType = (type: LegalDocumentType): CompanyLegalDocument | undefined => {
    return legalDocs.find(doc => doc.document_type === type);
  };

  // التحقق من اكتمال المستندات
  const requiredDocs: LegalDocumentType[] = ['commercial_register', 'iban_certificate', 'representative_id'];
  const missingDocs = requiredDocs.filter(type => !getDocByType(type));
  const allDocsReady = missingDocs.length === 0;

  if (companyLoading || contractLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لم يتم العثور على العقد</AlertDescription>
        </Alert>
      </div>
    );
  }

  const customer = contract.customers as any;
  const vehicle = contract.vehicles as any;
  
  // تجميع اسم العميل الكامل
  const customerFullName = customer 
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
    : 'غير معروف';

  return (
    <div className="container mx-auto p-4 max-w-6xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Gavel className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تجهيز دعوى قضائية</h1>
            <p className="text-muted-foreground">
              تجهيز البيانات والمستندات لرفع دعوى في نظام تقاضي
            </p>
          </div>
        </div>
      </motion.div>

      {/* معلومات المدعى عليه */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 mb-6"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              بيانات المدعى عليه
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاسم:</span>
              <span className="font-medium">{customerFullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهوية:</span>
              <span className="font-medium">{customer?.national_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الهاتف:</span>
              <span className="font-medium">{customer?.phone || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              بيانات السيارة والعقد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">السيارة:</span>
              <span className="font-medium">
                {vehicle?.make} {vehicle?.model} {vehicle?.year}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">اللوحة:</span>
              <span className="font-medium">{vehicle?.plate_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم العقد:</span>
              <Badge variant="outline">{contract.contract_number}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ملخص المطالبة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              ملخص المطالبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">الإيجار المتأخر</p>
                <p className="text-xl font-bold">{calculations.overdueRent.toLocaleString('ar-QA')} ر.ق</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">غرامة التأخير</p>
                <p className="text-xl font-bold">{calculations.lateFees.toLocaleString('ar-QA')} ر.ق</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">رسوم إدارية</p>
                <p className="text-xl font-bold">{calculations.otherFees.toLocaleString('ar-QA')} ر.ق</p>
              </div>
              <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
                <p className="text-sm opacity-90">الإجمالي</p>
                <p className="text-2xl font-bold">{calculations.total.toLocaleString('ar-QA')} ر.ق</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-background rounded-lg text-center">
              <p className="text-sm text-muted-foreground">المبلغ كتابةً</p>
              <p className="font-medium text-lg">{calculations.amountInWords}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* بيانات تقاضي */}
      {taqadiData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  بيانات تقاضي (جاهزة للنسخ)
                </CardTitle>
                <Button variant="outline" onClick={copyAllData}>
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ الكل
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* عنوان الدعوى */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>عنوان الدعوى (50 حرف كحد أقصى)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(taqadiData.caseTitle, 'title')}
                  >
                    {copiedField === 'title' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Input value={taqadiData.caseTitle} readOnly className="bg-muted" />
              </div>

              {/* الوقائع */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الوقائع</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(taqadiData.facts, 'facts')}
                  >
                    {copiedField === 'facts' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Textarea value={taqadiData.facts} readOnly className="bg-muted min-h-[150px]" />
              </div>

              {/* الطلبات */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>الطلبات</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(taqadiData.claims, 'claims')}
                  >
                    {copiedField === 'claims' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Textarea value={taqadiData.claims} readOnly className="bg-muted min-h-[120px]" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* المبلغ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>المبلغ</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(taqadiData.amount.toString(), 'amount')}
                    >
                      {copiedField === 'amount' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input value={taqadiData.amount.toString()} readOnly className="bg-muted" />
                </div>

                {/* المبلغ كتابة */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>المبلغ كتابةً</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(taqadiData.amountInWords, 'amountWords')}
                    >
                      {copiedField === 'amountWords' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input value={taqadiData.amountInWords} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* المستندات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              المستندات (جاهزة للتحميل)
            </CardTitle>
            <CardDescription>
              حمّل هذه المستندات وارفعها في تقاضي
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!allDocsReady && (
              <Alert className="mb-4 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  بعض المستندات غير مرفوعة: {missingDocs.map(t => DOCUMENT_TYPE_NAMES[t]).join(', ')}
                  <Button 
                    variant="link" 
                    className="p-0 mr-2 h-auto"
                    onClick={() => navigate('/legal/documents')}
                  >
                    رفع المستندات
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              {/* مذكرة شارحة - يتم توليدها */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">مذكرة شارحة</p>
                    <p className="text-sm text-muted-foreground">يتم توليدها بالذكاء الاصطناعي</p>
                  </div>
                </div>
                <Badge variant="secondary">قريباً</Badge>
              </div>

              {/* كشف المطالبات */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="font-medium">كشف المطالبات</p>
                    <p className="text-sm text-muted-foreground">{overdueInvoices.length} فاتورة متأخرة</p>
                  </div>
                </div>
                <Badge variant="secondary">قريباً</Badge>
              </div>

              {/* مستندات الشركة */}
              {requiredDocs.map(type => {
                const doc = getDocByType(type);
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{DOCUMENT_TYPE_NAMES[type]}</p>
                        {doc ? (
                          <p className="text-sm text-green-600">✓ مرفوع</p>
                        ) : (
                          <p className="text-sm text-destructive">✗ غير مرفوع</p>
                        )}
                      </div>
                    </div>
                    {doc ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                        <Download className="h-4 w-4 ml-2" />
                        تحميل
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => navigate('/legal/documents')}>
                        رفع
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* عقد الإيجار */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="font-medium">عقد الإيجار</p>
                    <p className="text-sm text-muted-foreground">رقم {contract.contract_number}</p>
                  </div>
                </div>
                <Badge variant="secondary">قريباً</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* أزرار الإجراءات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-bold">الخطوة التالية</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                استخدم إضافة المتصفح للتعبئة التلقائية أو انسخ البيانات يدوياً
              </p>
              
              {/* زر إرسال للإضافة - الطريقة الموصى بها */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-3">✨ للتعبئة التلقائية (موصى به):</p>
                <Button size="lg" onClick={sendToExtension} className="w-full sm:w-auto">
                  <Sparkles className="h-5 w-5 ml-2" />
                  إرسال للإضافة
                </Button>
              </div>

              {/* الطريقة اليدوية */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">أو استخدم الطريقة اليدوية:</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button size="lg" variant="outline" onClick={openTaqadi}>
                    <ExternalLink className="h-5 w-5 ml-2" />
                    فتح موقع تقاضي
                  </Button>
                  <Button size="lg" variant="outline" onClick={copyAllData}>
                    <Copy className="h-5 w-5 ml-2" />
                    نسخ جميع البيانات
                  </Button>
                </div>
              </div>

              <div className="pt-4 text-sm text-muted-foreground">
                <p>💡 نصيحة: اختر "عقود الخدمات التجارية" ← "عقود إيجار السيارات وخدمات الليموزين"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

