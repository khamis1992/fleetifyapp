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
import {
  generateExplanatoryMemoHtml,
  generateDocumentsListHtml,
  generateClaimsStatementHtml,
  openLetterForPrint,
} from '@/utils/official-letter-generator';

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
  const { data: contract, isLoading: contractLoading, error: contractError } = useQuery({
    queryKey: ['contract-details', contractId],
    queryFn: async () => {
      // جلب بيانات العقد أولاً
      const { data: contractData, error: contractErr } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      
      if (contractErr) throw contractErr;
      if (!contractData) throw new Error('لم يتم العثور على العقد');

      // جلب بيانات العميل
      let customerData = null;
      if (contractData.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, first_name, last_name, national_id, phone, email')
          .eq('id', contractData.customer_id)
          .single();
        customerData = customer;
      }

      // جلب بيانات السيارة
      let vehicleData = null;
      if (contractData.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('make, model, year, plate_number, color')
          .eq('id', contractData.vehicle_id)
          .single();
        vehicleData = vehicle;
      }

      // دمج البيانات
      return {
        ...contractData,
        customers: customerData,
        vehicles: vehicleData,
      };
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

  // جلب المخالفات المرورية المرتبطة بالعقد
  const { data: trafficViolations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ['contract-traffic-violations', contractId, companyId],
    queryFn: async () => {
      if (!contractId || !companyId) return [];
      
      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .neq('status', 'paid')
        .order('violation_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contractId && !!companyId,
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
    
    // حساب إجمالي المخالفات المرورية غير المدفوعة
    const violationsFines = trafficViolations.reduce(
      (sum, v) => sum + (Number(v.total_amount) || Number(v.fine_amount) || 0),
      0
    );
    
    const total = overdueRent + lateFees + otherFees + violationsFines;
    
    return {
      overdueRent,
      lateFees,
      otherFees,
      violationsFines,
      violationsCount: trafficViolations.length,
      total,
      amountInWords: lawsuitService.convertAmountToWords(total),
    };
  }, [overdueInvoices, trafficViolations]);

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
      
      // توليد نص الوقائع مع المخالفات المرورية
      let factsText = lawsuitService.generateFactsText(
        customerFullName,
        contract.start_date,
        vehicleInfo,
        calculations.total
      );
      
      // إضافة المخالفات المرورية إلى الوقائع إن وجدت
      if (calculations.violationsCount > 0) {
        factsText += `\n\nبالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${calculations.violationsCount}) مخالفة بإجمالي مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري، والتي لم يقم بسدادها حتى تاريخه.`;
      }
      
      // توليد نص الطلبات مع المخالفات المرورية
      let claimsText = lawsuitService.generateClaimsText(calculations.total);
      
      // تعديل الطلبات لتشمل المخالفات المرورية إن وجدت
      if (calculations.violationsCount > 0) {
        claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.overdueRent.toLocaleString('ar-QA')}) ريال قطري قيمة الإيجارات المتأخرة.

2. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري قيمة المخالفات المرورية غير المسددة (عدد ${calculations.violationsCount} مخالفة).

3. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد.

4. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`;
      }
      
      setTaqadiData({
        caseTitle: lawsuitService.generateCaseTitle(customerFullName),
        facts: factsText,
        claims: claimsText,
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

  // بدء الأتمتة المحلية (في متصفح المستخدم)
  const startLocalAutomation = useCallback(async () => {
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
        defendant: {
          name: customer 
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
            : 'غير معروف',
          nationalId: customer?.national_id || '',
          phone: customer?.phone || ''
        },
        texts: {
          title: taqadiData.caseTitle,
          facts: taqadiData.facts,
          claims: taqadiData.claims,
          amount: taqadiData.amount,
          amountInWords: taqadiData.amountInWords
        },
        amounts: {
          overdueRent: calculations.overdueRent,
          lateFees: calculations.lateFees,
          violations: calculations.violationsFines,
          otherFees: calculations.otherFees,
          total: calculations.total,
          totalInWords: calculations.amountInWords
        },
        vehicle: {
          model: vehicle 
            ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
            : `${contract.make || ''} ${contract.model || ''} ${contract.year || ''}`,
          plate: vehicle?.plate_number || contract.license_plate || '',
          contractNumber: contract.contract_number
        },
        documents: {
          commercialRegister: getDocUrl('commercial_register'),
          establishmentRecord: getDocUrl('establishment_record'),
          iban: getDocUrl('iban_certificate'),
          idCard: getDocUrl('representative_id'),
          memo: memoUrl,
          contract: contractFileUrl,
          documentsList: docsListUrl,
          claimsStatement: claimsStatementUrl
        },
        extractedAt: new Date().toISOString(),
        pageUrl: window.location.href
      };

      // حفظ في localStorage للإضافة
      localStorage.setItem('alarafLawsuitDataFull', JSON.stringify(lawsuitData));

      // إرسال للإضافة مباشرة
      // @ts-ignore - Chrome extension API
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // @ts-ignore
        chrome.runtime.sendMessage({
          action: 'saveLawsuitData',
          data: lawsuitData
        }, (response: any) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome extension error:', chrome.runtime.lastError);
            toast.error('تأكد من تثبيت الإضافة المحدثة');
            setIsAutomating(false);
            return;
          }

          if (response && response.success) {
            toast.success('✅ تم حفظ البيانات! جاري فتح تقاضي...');

            // @ts-ignore
            chrome.runtime.sendMessage({
              action: 'autoFill',
              data: lawsuitData
            }, (result: any) => {
              if (chrome.runtime.lastError) {
                console.error('خطأ في بدء الأتمتة:', chrome.runtime.lastError);
                toast.error('فشل بدء الأتمتة، حاول مرة أخرى');
                setIsAutomating(false);
                return;
              }

              console.log('[العراف] نتيجة بدء الأتمتة:', result);

              if (result && result.success) {
                toast.success('🚀 تم فتح تقاضي! سيتم ملء البيانات ورفع الملفات تلقائياً');
              } else {
                toast.error('فشل بدء الأتمتة، حاول مرة أخرى');
              }
              setIsAutomating(false);
            });
          } else {
            toast.error('فشل حفظ البيانات');
            setIsAutomating(false);
          }
        });
      } else {
        // الإضافة غير مثبتة - فتح تقاضي يدوياً
        toast.info('⚠️ الإضافة غير مثبتة. سيتم فتح تقاضي يدوياً');
        window.open('https://taqadi.sjc.gov.qa/itc/', '_blank');
        setIsAutomating(false);
      }

    } catch (error: any) {
      console.error('Automation error:', error);
      toast.error(`فشل بدء الأتمتة: ${error.message}`);
      setIsAutomating(false);
    }
  }, [taqadiData, contract, legalDocs, contractFileUrl, memoUrl, calculations]);

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

  // توليد المذكرة الشارحة بالتنسيق الموحد
  const generateExplanatoryMemo = useCallback(() => {
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

      // استخدام التنسيق الموحد للكتب الرسمية
      const memoHtml = generateExplanatoryMemoHtml({
        caseTitle: taqadiData.caseTitle,
        facts: taqadiData.facts,
        claims: taqadiData.claims,
        amount: taqadiData.amount,
        amountInWords: taqadiData.amountInWords,
        defendantName: customerName,
        contractNumber: contract.contract_number,
        hasViolations: calculations.violationsCount > 0,
      });

      // فتح المستند في نافذة جديدة
      openLetterForPrint(memoHtml);
      
      // حفظ URL للتحميل لاحقاً
      const blob = new Blob([memoHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setMemoUrl(url);
      
      toast.success('✅ تم توليد المذكرة الشارحة!');
    } catch (error: any) {
      console.error('Memo generation error:', error);
      toast.error('حدث خطأ أثناء توليد المذكرة');
    } finally {
      setIsGeneratingMemo(false);
    }
  }, [taqadiData, contract, calculations]);

  // توليد كشف المستندات المرفوعة
  const generateDocumentsList = useCallback(() => {
    const customer = (contract as any)?.customers;
    const customerName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';

    // تجميع قائمة المستندات
    const documents: { name: string; status: 'مرفق' | 'غير مرفق' }[] = [
      { name: 'المذكرة الشارحة', status: memoUrl ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من البطاقة الشخصية للممثل', status: legalDocs.find(d => d.document_type === 'representative_id') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من السجل التجاري', status: legalDocs.find(d => d.document_type === 'commercial_register') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من قيد المنشأة', status: legalDocs.find(d => d.document_type === 'establishment_record') ? 'مرفق' : 'غير مرفق' },
      { name: 'صورة من العقد', status: contractFileUrl ? 'مرفق' : 'غير مرفق' },
      { name: 'شهادة IBAN', status: legalDocs.find(d => d.document_type === 'iban_certificate') ? 'مرفق' : 'غير مرفق' },
    ];

    // استخدام التنسيق الموحد للكتب الرسمية
    const docsListHtml = generateDocumentsListHtml({
      caseTitle: taqadiData?.caseTitle || '-',
      customerName,
      amount: taqadiData?.amount || 0,
      documents,
    });

    openLetterForPrint(docsListHtml);
    setDocsListUrl('generated');
    toast.success('✅ تم توليد كشف المستندات!');
  }, [taqadiData, contract, legalDocs, memoUrl, contractFileUrl]);

  // توليد كشف المطالبات (الفواتير المتأخرة + المخالفات المرورية)
  const generateClaimsStatement = useCallback(() => {
    if (!overdueInvoices.length && !trafficViolations.length) {
      toast.error('لا توجد فواتير متأخرة أو مخالفات مرورية');
      return;
    }

    setIsGeneratingClaims(true);

    const customer = (contract as any)?.customers;
    const customerName = customer 
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
      : 'غير معروف';

    // حساب إجمالي المبالغ من الفواتير
    const totalOverdueInvoices = overdueInvoices.reduce(
      (sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 
      0
    );

    // حساب إجمالي المخالفات المرورية
    const totalViolationsFines = trafficViolations.reduce(
      (sum, v) => sum + (Number(v.total_amount) || Number(v.fine_amount) || 0),
      0
    );

    const totalOverdue = totalOverdueInvoices + totalViolationsFines;

    // تحضير بيانات الفواتير
    const invoicesData = overdueInvoices.map((inv) => {
      const dueDate = new Date(inv.due_date);
      const today = new Date();
      const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        invoiceNumber: inv.invoice_number || '-',
        dueDate: inv.due_date,
        totalAmount: inv.total_amount || 0,
        paidAmount: inv.paid_amount || 0,
        daysLate,
      };
    });

    // تحضير بيانات المخالفات المرورية
    const violationsData = trafficViolations.map((v) => ({
      violationNumber: v.violation_number || '-',
      violationDate: v.violation_date || '',
      violationType: v.violation_type || 'غير محدد',
      location: v.location || '-',
      fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
    }));

    // استخدام التنسيق الموحد للكتب الرسمية
    const claimsHtml = generateClaimsStatementHtml({
      customerName,
      nationalId: customer?.national_id || '-',
      contractNumber: contract?.contract_number || '-',
      contractStartDate: contract?.start_date || '',
      contractEndDate: contract?.end_date || '',
      invoices: invoicesData,
      violations: violationsData,
      totalOverdue,
      amountInWords: calculations.amountInWords,
      caseTitle: taqadiData?.caseTitle,
    });

    openLetterForPrint(claimsHtml);
    setClaimsStatementUrl('generated');
    setIsGeneratingClaims(false);
    toast.success('✅ تم توليد كشف المطالبات!');
  }, [overdueInvoices, trafficViolations, contract, calculations, taqadiData]);

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
            <div className="grid md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">الإيجار المتأخر</p>
                <p className="text-xl font-bold">{calculations.overdueRent.toLocaleString('ar-QA')} ر.ق</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">غرامة التأخير</p>
                <p className="text-xl font-bold">{calculations.lateFees.toLocaleString('ar-QA')} ر.ق</p>
              </div>
              {calculations.violationsFines > 0 && (
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">مخالفات مرورية ({calculations.violationsCount})</p>
                  <p className="text-xl font-bold text-red-600">{calculations.violationsFines.toLocaleString('ar-QA')} ر.ق</p>
                </div>
              )}
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

      {/* زر الأتمتة - زر واحد فقط */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={startLocalAutomation}
          disabled={isAutomating || !taqadiData}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-12 py-6 text-lg shadow-xl"
        >
          {isAutomating ? (
            <>
              <LoadingSpinner className="h-5 w-5 ml-2" />
              جاري فتح تقاضي...
            </>
          ) : (
            <>
              <Sparkles className="h-6 w-6 ml-2" />
              🚀 رفع تلقائي إلى تقاضي
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

