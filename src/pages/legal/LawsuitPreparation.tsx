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
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationSession, setAutomationSession] = useState<{ sessionId: string; liveUrl: string } | null>(null);
  
  // حالات المستندات الجديدة
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [memoUrl, setMemoUrl] = useState<string | null>(null);
  const [isGeneratingDocsList, setIsGeneratingDocsList] = useState(false);
  const [docsListUrl, setDocsListUrl] = useState<string | null>(null);
  const [isGeneratingClaims, setIsGeneratingClaims] = useState(false);
  const [claimsStatementUrl, setClaimsStatementUrl] = useState<string | null>(null);

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

  // تحميل ملف البيانات للأتمتة
  const downloadDataFile = useCallback(() => {
    if (!taqadiData || !contract) {
      toast.error('لا توجد بيانات للتحميل');
      return;
    }

    const customer = (contract as any).customers;
    const vehicle = (contract as any).vehicles;
    
    const fileData = {
      caseTitle: taqadiData.caseTitle,
      facts: taqadiData.facts,
      claims: taqadiData.claims,
      amount: taqadiData.amount,
      amountInWords: taqadiData.amountInWords,
      defendantName: customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
        : 'غير معروف',
      defendantIdNumber: customer?.national_id || '',
      defendantPhone: customer?.phone || '',
      contractNumber: contract.contract_number,
      vehicleInfo: vehicle 
        ? `${vehicle.make} ${vehicle.model} ${vehicle.year} - ${vehicle.plate_number}`
        : `${contract.make || ''} ${contract.model || ''} ${contract.year || ''} - ${contract.license_plate || ''}`,
      contractStartDate: contract.start_date,
      contractEndDate: contract.end_date,
      documents: {
        contract: 'documents/contract.pdf',
        commercialRegister: 'documents/commercial-register.pdf',
        ibanCertificate: 'documents/iban-certificate.pdf',
        representativeId: 'documents/representative-id.pdf'
      },
      generatedAt: new Date().toISOString(),
    };

    // إنشاء وتحميل الملف
    const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lawsuit-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('✅ تم تحميل ملف البيانات! ضعه في مجلد taqadi-automation');
  }, [taqadiData, contract]);

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
    
    // إرسال رسالة للإضافة عبر postMessage
    window.postMessage({
      type: 'ALARAF_LAWSUIT_DATA',
      data: extensionData
    }, '*');
    
    // محاولة إرسال للإضافة مباشرة (إذا كانت مثبتة)
    try {
      // @ts-ignore - Chrome extension API
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // @ts-ignore
        chrome.storage.local.set({ alarafLawsuitData: extensionData }, () => {
          console.log('[العراف] تم حفظ البيانات في تخزين الإضافة');
        });
      }
    } catch (e) {
      // الإضافة غير مثبتة أو غير متاحة - لا مشكلة
      console.log('[العراف] الإضافة غير مثبتة، البيانات محفوظة في localStorage');
    }

    toast.success('تم حفظ البيانات! افتح موقع تقاضي واضغط على أيقونة الإضافة 🚗');
  }, [taqadiData, contract]);

  // بدء الأتمتة عبر Browserbase
  const startAutomation = useCallback(async () => {
    if (!taqadiData || !contract) {
      toast.error('لا توجد بيانات للدعوى');
      return;
    }

    setIsAutomating(true);

    try {
      const customer = (contract as any).customers;
      const vehicle = (contract as any).vehicles;
      
      // جمع روابط المستندات
      const getDocUrl = (type: string) => {
        const doc = legalDocs.find(d => d.document_type === type);
        return doc?.file_url;
      };

      const lawsuitData = {
        caseTitle: taqadiData.caseTitle,
        facts: taqadiData.facts,
        claims: taqadiData.claims,
        amount: taqadiData.amount,
        amountInWords: taqadiData.amountInWords,
        defendantName: customer 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
          : 'غير معروف',
        defendantIdNumber: customer?.national_id || '',
        defendantPhone: customer?.phone || '',
        contractNumber: contract.contract_number,
        vehicleInfo: vehicle 
          ? `${vehicle.make} ${vehicle.model} ${vehicle.year} - ${vehicle.plate_number}`
          : `${contract.make || ''} ${contract.model || ''} ${contract.year || ''} - ${contract.license_plate || ''}`,
        contractStartDate: contract.start_date,
        contractEndDate: contract.end_date,
        // إضافة روابط المستندات للرفع التلقائي
        documents: {
          commercialRegisterUrl: getDocUrl('commercial_register'),
          establishmentRecordUrl: getDocUrl('establishment_record'),
          ibanCertificateUrl: getDocUrl('iban_certificate'),
          representativeIdUrl: getDocUrl('representative_id'),
          contractUrl: contractFileUrl || undefined,
          explanatoryMemoUrl: memoUrl || undefined,
        },
      };

      // استدعاء Edge Function
      const response = await supabase.functions.invoke('taqadi-automation', {
        body: {
          action: 'start',
          lawsuitData,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.success) {
        setAutomationSession({
          sessionId: result.sessionId,
          liveUrl: result.liveUrl,
        });

        // فتح المتصفح السحابي في نافذة جديدة
        window.open(result.liveUrl, '_blank', 'width=1400,height=900');
        
        toast.success('🚀 تم فتح المتصفح السحابي! سجّل الدخول عبر توثيق.');
      } else {
        throw new Error(result.error || 'فشل في بدء الأتمتة');
      }
    } catch (error: any) {
      console.error('Automation error:', error);
      toast.error(`فشل بدء الأتمتة: ${error.message}`);
    } finally {
      setIsAutomating(false);
    }
  }, [taqadiData, contract]);

  // إلغاء جلسة الأتمتة
  const cancelAutomation = useCallback(async () => {
    if (!automationSession) return;

    try {
      await supabase.functions.invoke('taqadi-automation', {
        body: {
          action: 'cancel',
          sessionId: automationSession.sessionId,
        },
      });
      setAutomationSession(null);
      toast.success('تم إلغاء جلسة الأتمتة');
    } catch (error) {
      console.error('Cancel error:', error);
    }
  }, [automationSession]);

  // رفع عقد الإيجار
  const uploadContractFile = useCallback(async (file: File) => {
    if (!companyId || !contractId) return;
    
    setIsUploadingContract(true);
    try {
      const fileName = `contracts/${companyId}/${contractId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(fileName);
      
      setContractFileUrl(urlData.publicUrl);
      setContractFile(file);
      toast.success('✅ تم رفع عقد الإيجار بنجاح!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`فشل رفع العقد: ${error.message}`);
    } finally {
      setIsUploadingContract(false);
    }
  }, [companyId, contractId]);

  // توليد المذكرة الشارحة بالذكاء الاصطناعي
  const generateExplanatoryMemo = useCallback(async () => {
    if (!taqadiData || !contract) {
      toast.error('لا توجد بيانات كافية لتوليد المذكرة');
      return;
    }

    setIsGeneratingMemo(true);
    try {
      const customer = (contract as any).customers;
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
        : 'غير معروف';

      // استدعاء Edge Function لتوليد المذكرة
      const { data, error } = await supabase.functions.invoke('generate-legal-memo', {
        body: {
          type: 'explanatory_memo',
          lawsuitData: {
            caseTitle: taqadiData.caseTitle,
            facts: taqadiData.facts,
            claims: taqadiData.claims,
            amount: taqadiData.amount,
            amountInWords: taqadiData.amountInWords,
            defendantName: customerName,
            contractNumber: contract.contract_number,
            contractStartDate: contract.start_date,
            contractEndDate: contract.end_date,
          },
        },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        setMemoUrl(data.pdfUrl);
        toast.success('✅ تم توليد المذكرة الشارحة بنجاح!');
        window.open(data.pdfUrl, '_blank');
      } else if (data?.htmlContent) {
        const blob = new Blob([data.htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setMemoUrl(url);
        window.open(url, '_blank');
        toast.success('✅ تم توليد المذكرة الشارحة!');
      } else {
        // Fallback محلي
        generateMemoLocally();
      }
    } catch (error: any) {
      console.error('Memo generation error:', error);
      toast.info('جاري التوليد المحلي...');
      generateMemoLocally();
    } finally {
      setIsGeneratingMemo(false);
    }
  }, [taqadiData, contract, generateMemoLocally]);

  // توليد المذكرة محلياً (fallback)
  const generateMemoLocally = useCallback(() => {
    if (!taqadiData || !contract) return;
    
    const customer = (contract as any).customers;
    const customerName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';
    
    const today = new Date().toLocaleDateString('ar-QA', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const memoHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>مذكرة شارحة</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Traditional Arabic', 'Arial', sans-serif; font-size: 14pt; line-height: 2; color: #000; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; }
    .logo { max-width: 150px; margin-bottom: 10px; }
    h1 { color: #1e3a5f; font-size: 24pt; margin: 10px 0; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; color: #1e3a5f; font-size: 16pt; margin-bottom: 10px; }
    .content { text-align: justify; }
    .footer { margin-top: 50px; text-align: center; }
    .signature { margin-top: 80px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/company-assets/alaraf-logo.png" class="logo" alt="شركة العراف" onerror="this.style.display='none'">
    <h1>مذكرة شارحة</h1>
    <p>مقدمة من: شركة العراف للخدمات</p>
    <p>التاريخ: ${today}</p>
  </div>

  <div class="section">
    <div class="section-title">أولاً: موضوع الدعوى</div>
    <div class="content">
      <p>${taqadiData.caseTitle}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">ثانياً: الوقائع</div>
    <div class="content">
      <p>${taqadiData.facts.replace(/\n/g, '<br>')}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">ثالثاً: الأسانيد القانونية</div>
    <div class="content">
      <p>استناداً إلى أحكام القانون المدني القطري، وعلى وجه الخصوص المواد المتعلقة بعقود الإيجار والالتزامات التعاقدية، فإن المدعى عليه ملزم بسداد المبالغ المستحقة.</p>
      <p>كما أن الامتناع عن الوفاء بالالتزامات التعاقدية يعد إخلالاً جسيماً بالعقد يستوجب التعويض.</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">رابعاً: الطلبات</div>
    <div class="content">
      <p>${taqadiData.claims.replace(/\n/g, '<br>')}</p>
    </div>
  </div>

  <div class="footer">
    <p>والله ولي التوفيق</p>
    <div class="signature">
      <p>مقدمه</p>
      <p><strong>أسامة أحمد البشري</strong></p>
      <p>المخول بالتوقيع - شركة العراف للخدمات</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([memoHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    toast.success('✅ تم توليد المذكرة الشارحة!');
  }, [taqadiData, contract]);

  // توليد كشف المستندات المرفوعة
  const generateDocumentsList = useCallback(() => {
    const today = new Date().toLocaleDateString('ar-QA', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const customer = (contract as any)?.customers;
    const customerName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';

    // تجميع قائمة المستندات
    const documents = [
      { name: 'المذكرة الشارحة', status: memoUrl ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من البطاقة الشخصية للممثل', status: legalDocs.find(d => d.document_type === 'representative_id') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من السجل التجاري', status: legalDocs.find(d => d.document_type === 'commercial_register') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من قيد المنشأة', status: legalDocs.find(d => d.document_type === 'establishment_record') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من العقد', status: contractFileUrl ? 'مرفق' : 'غير مرفق' },
      { name: 'شهادة IBAN', status: legalDocs.find(d => d.document_type === 'iban_certificate') ? 'مرفق' : 'غير مرفق' },
    ];

    const docsListHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف بالمستندات المرفوعة</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Traditional Arabic', 'Arial', sans-serif; font-size: 14pt; line-height: 1.8; color: #000; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; }
    h1 { color: #1e3a5f; font-size: 22pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #333; padding: 12px; text-align: right; }
    th { background: #1e3a5f; color: white; }
    .attached { color: green; font-weight: bold; }
    .not-attached { color: red; }
    .footer { margin-top: 40px; text-align: center; }
    .case-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>كشف بالمستندات المرفوعة</h1>
    <p>شركة العراف للخدمات</p>
    <p>التاريخ: ${today}</p>
  </div>

  <div class="case-info">
    <p><strong>عنوان الدعوى:</strong> ${taqadiData?.caseTitle || '-'}</p>
    <p><strong>المدعى عليه:</strong> ${customerName}</p>
    <p><strong>المبلغ المطالب به:</strong> ${taqadiData?.amount?.toLocaleString('ar-QA')} ريال قطري</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم المستند</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${documents.map((doc, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${doc.name}</td>
          <td class="${doc.status === 'مرفق' ? 'attached' : 'not-attached'}">${doc.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>إجمالي المستندات:</strong> ${documents.length}</p>
    <p><strong>المستندات المرفقة:</strong> ${documents.filter(d => d.status === 'مرفق').length}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([docsListHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setDocsListUrl(url);
    toast.success('✅ تم توليد كشف المستندات!');
  }, [taqadiData, contract, legalDocs, memoUrl, contractFileUrl]);

  // توليد كشف المطالبات (الفواتير المتأخرة)
  const generateClaimsStatement = useCallback(() => {
    if (!overdueInvoices.length) {
      toast.error('لا توجد فواتير متأخرة');
      return;
    }

    setIsGeneratingClaims(true);

    const today = new Date().toLocaleDateString('ar-QA', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const customer = (contract as any)?.customers;
    const customerName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';

    // حساب إجمالي المبالغ
    const totalOverdue = overdueInvoices.reduce(
      (sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 
      0
    );

    const claimsHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف المطالبات - ${contract?.contract_number || ''}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Traditional Arabic', 'Arial', sans-serif; font-size: 12pt; line-height: 1.6; color: #000; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 15px; }
    h1 { color: #1e3a5f; font-size: 20pt; margin: 10px 0; }
    h2 { color: #1e3a5f; font-size: 16pt; margin: 15px 0 10px; }
    .info-box { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-label { font-weight: bold; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt; }
    th, td { border: 1px solid #333; padding: 10px 8px; text-align: right; }
    th { background: #1e3a5f; color: white; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .amount { font-weight: bold; color: #d32f2f; }
    .total-row { background: #1e3a5f !important; color: white; font-weight: bold; }
    .total-row td { border-color: #1e3a5f; }
    .summary { margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; border-radius: 8px; }
    .summary h3 { margin: 0 0 15px; font-size: 16pt; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .summary-item { text-align: center; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; }
    .summary-value { font-size: 18pt; font-weight: bold; }
    .summary-label { font-size: 10pt; opacity: 0.9; }
    .footer { margin-top: 40px; text-align: center; font-size: 10pt; color: #666; }
    .stamp { margin-top: 50px; text-align: left; }
    .days-late { color: #d32f2f; font-weight: bold; }
    @media print {
      .summary { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/company-assets/alaraf-logo.png" 
         style="max-width: 120px; margin-bottom: 10px;" 
         alt="شركة العراف" 
         onerror="this.style.display='none'">
    <h1>كشف المطالبات المالية</h1>
    <p style="color: #666;">تاريخ الإصدار: ${today}</p>
  </div>

  <div class="info-box">
    <div class="info-row">
      <span class="info-label">المدعى عليه:</span>
      <span>${customerName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">رقم الهوية:</span>
      <span>${customer?.national_id || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">رقم العقد:</span>
      <span>${contract?.contract_number || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">فترة العقد:</span>
      <span>${contract?.start_date ? new Date(contract.start_date).toLocaleDateString('ar-QA') : '-'} إلى ${contract?.end_date ? new Date(contract.end_date).toLocaleDateString('ar-QA') : '-'}</span>
    </div>
  </div>

  <h2>تفصيل الفواتير المتأخرة</h2>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>رقم الفاتورة</th>
        <th>تاريخ الاستحقاق</th>
        <th>أيام التأخير</th>
        <th>المبلغ الكلي</th>
        <th>المدفوع</th>
        <th>المتبقي</th>
      </tr>
    </thead>
    <tbody>
      ${overdueInvoices.map((inv, i) => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${inv.invoice_number || '-'}</td>
            <td>${new Date(inv.due_date).toLocaleDateString('ar-QA')}</td>
            <td class="days-late">${daysLate} يوم</td>
            <td>${(inv.total_amount || 0).toLocaleString('ar-QA')} ر.ق</td>
            <td>${(inv.paid_amount || 0).toLocaleString('ar-QA')} ر.ق</td>
            <td class="amount">${remaining.toLocaleString('ar-QA')} ر.ق</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="4">الإجمالي</td>
        <td>${overdueInvoices.reduce((s, i) => s + (i.total_amount || 0), 0).toLocaleString('ar-QA')} ر.ق</td>
        <td>${overdueInvoices.reduce((s, i) => s + (i.paid_amount || 0), 0).toLocaleString('ar-QA')} ر.ق</td>
        <td class="amount">${totalOverdue.toLocaleString('ar-QA')} ر.ق</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <h3>ملخص المطالبة</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${overdueInvoices.length}</div>
        <div class="summary-label">عدد الفواتير المتأخرة</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${totalOverdue.toLocaleString('ar-QA')}</div>
        <div class="summary-label">إجمالي المبالغ المستحقة (ر.ق)</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${calculations.amountInWords.split(' ').slice(0, 3).join(' ')}</div>
        <div class="summary-label">المبلغ كتابةً</div>
      </div>
    </div>
  </div>

  <div class="stamp">
    <p>___________________________</p>
    <p><strong>التوقيع والختم</strong></p>
    <p>شركة العراف للخدمات</p>
  </div>

  <div class="footer">
    <p>هذا الكشف صادر من نظام العراف لإدارة الأساطيل | ${today}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([claimsHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setClaimsStatementUrl(url);
    setIsGeneratingClaims(false);
    toast.success('✅ تم توليد كشف المطالبات!');
  }, [overdueInvoices, contract, calculations]);

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
              {/* مذكرة شارحة - توليد بالذكاء الاصطناعي */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">مذكرة شارحة</p>
                    <p className="text-sm text-muted-foreground">
                      {memoUrl ? '✅ تم التوليد' : 'توليد بالذكاء الاصطناعي'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {memoUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(memoUrl, '_blank')}>
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={generateExplanatoryMemo}
                    disabled={isGeneratingMemo || !taqadiData}
                    className="bg-primary text-primary-foreground"
                  >
                    {isGeneratingMemo ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 ml-2" />
                        جاري التوليد...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 ml-2" />
                        {memoUrl ? 'إعادة التوليد' : 'توليد المذكرة'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* كشف المستندات المرفوعة */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5" />
                  <div>
                    <p className="font-medium">كشف بالمستندات المرفوعة</p>
                    <p className="text-sm text-muted-foreground">
                      {docsListUrl ? '✅ تم التوليد' : 'قائمة بجميع المستندات'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {docsListUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(docsListUrl, '_blank')}>
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateDocumentsList}
                  >
                    <FileCheck className="h-4 w-4 ml-2" />
                    {docsListUrl ? 'إعادة التوليد' : 'توليد الكشف'}
                  </Button>
                </div>
              </div>

              {/* كشف المطالبات (الفواتير المتأخرة) */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">كشف المطالبات</p>
                    <p className="text-sm text-muted-foreground">
                      {claimsStatementUrl ? '✅ تم التوليد - ' : ''}{overdueInvoices.length} فاتورة متأخرة
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {claimsStatementUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(claimsStatementUrl, '_blank')}>
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={generateClaimsStatement}
                    disabled={isGeneratingClaims || overdueInvoices.length === 0}
                    variant={claimsStatementUrl ? "outline" : "default"}
                    className={!claimsStatementUrl ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                  >
                    {isGeneratingClaims ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 ml-2" />
                        جاري التوليد...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 ml-2" />
                        {claimsStatementUrl ? 'إعادة التوليد' : 'توليد الكشف'}
                      </>
                    )}
                  </Button>
                </div>
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

              {/* عقد الإيجار - رفع ملف */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">عقد الإيجار</p>
                    <p className="text-sm text-muted-foreground">
                      {contractFileUrl ? '✅ تم الرفع' : `رقم ${contract.contract_number} - يرجى رفع صورة العقد`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {contractFileUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(contractFileUrl, '_blank')}>
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadContractFile(file);
                      }}
                      disabled={isUploadingContract}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isUploadingContract}
                    >
                      {isUploadingContract ? (
                        <>
                          <LoadingSpinner className="h-4 w-4 ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4 ml-2" />
                          {contractFileUrl ? 'تغيير العقد' : 'رفع العقد'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
              
              {/* زر الأتمتة الرئيسي */}
              <div className="mb-4">
                <Button 
                  size="lg" 
                  onClick={startAutomation}
                  disabled={isAutomating || !taqadiData}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg shadow-lg"
                >
                  {isAutomating ? (
                    <>
                      <LoadingSpinner className="h-5 w-5 ml-2" />
                      جاري التجهيز...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-6 w-6 ml-2" />
                      🚀 رفع دعوى تلقائي (Browserbase)
                    </>
                  )}
                </Button>
              </div>

              {/* حالة الأتمتة */}
              {automationSession && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">✅ المتصفح السحابي جاهز!</p>
                      <p className="text-sm text-green-600">سجّل الدخول عبر توثيق، ثم ستتم التعبئة تلقائياً</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(automationSession.liveUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 ml-1" />
                        فتح المتصفح
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={cancelAutomation}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* الأزرار البديلة */}
              <div className="flex justify-center gap-3 flex-wrap">
                <Button size="lg" variant="outline" onClick={sendToExtension}>
                  <Sparkles className="h-5 w-5 ml-2" />
                  حفظ للإضافة
                </Button>
                <Button size="lg" variant="outline" onClick={downloadDataFile}>
                  <Download className="h-5 w-5 ml-2" />
                  تحميل JSON
                </Button>
                <Button size="lg" variant="outline" onClick={openTaqadi}>
                  <ExternalLink className="h-5 w-5 ml-2" />
                  فتح تقاضي
                </Button>
                <Button size="lg" variant="outline" onClick={copyAllData}>
                  <Copy className="h-5 w-5 ml-2" />
                  نسخ الكل
                </Button>
              </div>

              {/* تعليمات */}
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-right space-y-2">
                <p className="font-medium">📋 طريقة الاستخدام (أداة الأتمتة):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>اضغط <strong>"تحميل ملف البيانات"</strong> لتحميل ملف JSON</li>
                  <li>ضع الملف في مجلد <code className="bg-muted px-1 rounded">taqadi-automation</code></li>
                  <li>شغّل الأداة: <code className="bg-muted px-1 rounded">npm start</code></li>
                  <li>سجّل الدخول عبر توثيق، ثم ستتم التعبئة تلقائياً</li>
                </ol>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>💡 اختر "عقود الخدمات التجارية" ← "عقود إيجار السيارات وخدمات الليموزين"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

