/**
 * صفحة تجهيز الدعوى - تصميم جديد (Task List)
 * قائمة مهام لتجهيز جميع المستندات المطلوبة لرفع دعوى في تقاضي
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Building2,
  ClipboardList,
  FileCheck,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Upload,
  FolderDown,
  FolderOpen,
  ArrowLeft,
  FileWarning,
  FileStack,
  Send,
  FileType,
  File,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateDelinquencyAmounts,
  DAILY_LATE_FEE,
  DAMAGES_FEE,
} from '@/utils/calculateDelinquencyAmounts';
import {
  lawsuitService,
  CompanyLegalDocument,
  DOCUMENT_TYPE_NAMES,
  LegalDocumentType,
} from '@/services/LawsuitService';
import {
  generateDocumentsListHtml,
  generateClaimsStatementHtml,
  generateDocumentPortfolioHtml,
  generateCriminalComplaintHtml,
  generateViolationsTransferHtml,
  openLetterForPrint,
} from '@/utils/official-letter-generator';
import { SendReportTaskDialog } from '@/components/legal/SendReportTaskDialog';
import { generateLegalComplaintHTML, type LegalDocumentData } from '@/utils/legal-document-generator';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { downloadHtmlAsPdf, downloadHtmlAsDocx } from '@/utils/document-export';

// واجهة المستند
interface DocumentItem {
  id: string;
  name: string;
  description: string;
  status: 'ready' | 'pending' | 'generating' | 'missing';
  type: 'mandatory' | 'optional';
  category: 'generated' | 'company' | 'contract' | 'violations';
  url?: string | null;
  onGenerate?: () => void;
  onDownload?: () => void;
  onUpload?: (file: File) => void;
  isGenerating?: boolean;
  // خيارات تحميل المذكرة الشارحة
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
  isDownloadingPdf?: boolean;
  isDownloadingDocx?: boolean;
}

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
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  const { user } = useAuth();

  // Hooks
  const convertToCase = useConvertToLegalCase();

  // الحالات
  const [taqadiData, setTaqadiData] = useState<TaqadiData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAutomating, setIsAutomating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [showTaqadiData, setShowTaqadiData] = useState(false);

  // حالات المستندات
  const [memoUrl, setMemoUrl] = useState<string | null>(null);
  const memoUrlRef = useRef<string | null>(null);
  const memoHtmlRef = useRef<string | null>(null); // محتوى HTML للمذكرة
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [docsListUrl, setDocsListUrl] = useState<string | null>(null);
  const [isGeneratingDocsList, setIsGeneratingDocsList] = useState(false);
  const [claimsStatementUrl, setClaimsStatementUrl] = useState<string | null>(null);
  const claimsStatementUrlRef = useRef<string | null>(null);
  const claimsHtmlRef = useRef<string | null>(null); // محتوى HTML لكشف المطالبات
  const [isGeneratingClaims, setIsGeneratingClaims] = useState(false);
  const [violationsListUrl, setViolationsListUrl] = useState<string | null>(null);
  const [isGeneratingViolations, setIsGeneratingViolations] = useState(false);
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [existingContractDoc, setExistingContractDoc] = useState<{ file_path: string; document_name: string } | null>(null);
  const [isGeneratingPortfolio, setIsGeneratingPortfolio] = useState(false);
  
  // المستندات الداعمة الجديدة
  const [criminalComplaintUrl, setCriminalComplaintUrl] = useState<string | null>(null);
  const [criminalComplaintHtmlContent, setCriminalComplaintHtmlContent] = useState<string | null>(null);
  const [isGeneratingComplaint, setIsGeneratingComplaint] = useState(false);
  const [violationsTransferUrl, setViolationsTransferUrl] = useState<string | null>(null);
  const [violationsTransferHtmlContent, setViolationsTransferHtmlContent] = useState<string | null>(null);
  const [isGeneratingTransfer, setIsGeneratingTransfer] = useState(false);
  
  // خيارات المستندات الداعمة (اختياري) - للحافظة
  const [includeCriminalComplaint, setIncludeCriminalComplaint] = useState(false);
  const [includeViolationsTransfer, setIncludeViolationsTransfer] = useState(false);
  
  // نافذة إرسال مهمة فتح بلاغ
  const [sendReportDialogOpen, setSendReportDialogOpen] = useState(false);
  
  // حالات تحميل المذكرة الشارحة
  const [isDownloadingMemoPdf, setIsDownloadingMemoPdf] = useState(false);
  const [isDownloadingMemoDocx, setIsDownloadingMemoDocx] = useState(false);
  
  // حالة إرسال إلى بيانات تقاضي
  const [isSendingToLawsuitData, setIsSendingToLawsuitData] = useState(false);

  // جلب بيانات العقد
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['contract-details', contractId],
    queryFn: async () => {
      const { data: contractData, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();
      
      if (error) throw error;
      if (!contractData) throw new Error('لم يتم العثور على العقد');

      let customerData = null;
      if (contractData.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, first_name, first_name_ar, last_name, last_name_ar, national_id, nationality, phone, email, mobile, address, country')
          .eq('id', contractData.customer_id)
          .single();
        customerData = customer;
      }

      let vehicleData = null;
      if (contractData.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('make, model, year, plate_number, color, vin')
          .eq('id', contractData.vehicle_id)
          .single();
        vehicleData = vehicle;
      }

      return { ...contractData, customers: customerData, vehicles: vehicleData };
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

  // جلب المخالفات المرورية
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

  // جلب ملف العقد الموقع من جدول contract_documents
  const { data: contractDocument } = useQuery({
    queryKey: ['contract-document', contractId, companyId],
    queryFn: async () => {
      if (!contractId || !companyId) return null;
      
      const { data, error } = await supabase
        .from('contract_documents')
        .select('id, file_path, document_name, document_type, mime_type')
        .eq('contract_id', contractId)
        .eq('company_id', companyId)
        .eq('document_type', 'signed_contract')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contract document:', error);
        return null;
      }

      if (data?.file_path) {
        // الحصول على الرابط العام للملف
        const { data: urlData } = supabase.storage
          .from('contract-documents')
          .getPublicUrl(data.file_path);
        
        return {
          ...data,
          publicUrl: urlData?.publicUrl || null
        };
      }

      return data;
    },
    enabled: !!contractId && !!companyId,
  });

  // تحديث رابط العقد عند وجود مستند محفوظ
  useEffect(() => {
    if (contractDocument?.publicUrl && !contractFileUrl) {
      setContractFileUrl(contractDocument.publicUrl);
      setExistingContractDoc({
        file_path: contractDocument.file_path,
        document_name: contractDocument.document_name || 'العقد الموقع'
      });
    }
  }, [contractDocument, contractFileUrl]);

  // تحديث الـ refs عند تغيير القيم
  useEffect(() => {
    claimsStatementUrlRef.current = claimsStatementUrl;
  }, [claimsStatementUrl]);

  useEffect(() => {
    memoUrlRef.current = memoUrl;
  }, [memoUrl]);

  // حساب المبالغ - باستخدام الدالة الموحدة
  // غرامة التأخير: 120 ر.ق × أيام التأخير لكل فاتورة
  // رسوم الأضرار: 10,000 ر.ق (عند رفع دعوى)
  const calculations = useMemo(() => {
    const result = calculateDelinquencyAmounts(
      overdueInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        due_date: inv.due_date,
        total_amount: inv.total_amount || 0,
        paid_amount: inv.paid_amount || 0,
      })),
      trafficViolations.map(v => ({
        id: v.id,
        violation_number: v.violation_number,
        fine_amount: v.fine_amount,
        total_amount: v.total_amount,
        status: v.status,
      })),
      { includeDamagesFee: true } // رسوم الأضرار عند رفع دعوى
    );
    
    return {
      overdueRent: result.overdueRent,
      lateFees: result.lateFees,
      damagesFee: result.damagesFee,
      violationsFines: result.violationsFines,
      violationsCount: result.violationsCount,
      total: result.total,
      invoiceLateFees: result.invoiceLateFees,
      overdueInvoicesCount: result.overdueInvoicesCount,
      avgDaysOverdue: result.avgDaysOverdue,
      amountInWords: lawsuitService.convertAmountToWords(result.total),
    };
  }, [overdueInvoices, trafficViolations]);

  // توليد بيانات تقاضي
  useEffect(() => {
    if (contract) {
      const customer = contract.customers as any;
      const vehicle = contract.vehicles as any;
      const vehicleInfo = `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`;
      const customerFullName = formatCustomerName(customer);
      
      let factsText = lawsuitService.generateFactsText(
        customerFullName,
        contract.start_date,
        vehicleInfo,
        calculations.total
      );
      
      if (calculations.violationsCount > 0) {
        factsText += `\n\nبالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${calculations.violationsCount}) مخالفة بإجمالي مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري.`;
      }
      
      let claimsText = lawsuitService.generateClaimsText(calculations.total);
      
      if (calculations.violationsCount > 0) {
        claimsText = `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.overdueRent.toLocaleString('ar-QA')}) ريال قطري قيمة الإيجارات المتأخرة.
2. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${calculations.violationsFines.toLocaleString('ar-QA')}) ريال قطري قيمة المخالفات المرورية.
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

  // الحصول على مستند حسب النوع
  const getDocByType = (type: LegalDocumentType): CompanyLegalDocument | undefined => {
    return legalDocs.find(doc => doc.document_type === type);
  };

  // نسخ نص
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('تم النسخ!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  }, []);

  // رفع ملف العقد
  const uploadContractFile = useCallback(async (file: File) => {
    if (!companyId || !contractId) return;
    
    setIsUploadingContract(true);
    try {
      const fileName = `contracts/${companyId}/${contractId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(fileName);

      setContractFileUrl(urlData.publicUrl);
      toast.success('✅ تم رفع العقد بنجاح!');
    } catch (error: any) {
      toast.error('فشل رفع الملف: ' + error.message);
    } finally {
      setIsUploadingContract(false);
    }
  }, [companyId, contractId]);

  // توليد المذكرة الشارحة
  const generateExplanatoryMemo = useCallback(() => {
    if (!contract) {
      toast.error('جاري تحميل بيانات العقد...');
      return;
    }

    setIsGeneratingMemo(true);
    try {
      const customer = (contract as any).customers;
      const vehicle = (contract as any).vehicles;
      const damagesAmount = Math.round(calculations.total * 0.3);

      const documentData: LegalDocumentData = {
        customer: {
          customer_name: formatCustomerName(customer),
          customer_code: customer?.id || '',
          id_number: customer?.national_id || '',
          phone: customer?.phone || '',
          email: customer?.email || '',
          contract_number: contract.contract_number,
          contract_start_date: contract.start_date,
          vehicle_plate: vehicle?.plate_number || (contract as any).license_plate || '',
          monthly_rent: Number(contract.monthly_amount) || 0,
          months_unpaid: overdueInvoices.length,
          overdue_amount: calculations.overdueRent,
          late_penalty: calculations.lateFees,
          days_overdue: Math.floor((new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)),
          violations_count: calculations.violationsCount,
          violations_amount: calculations.violationsFines,
          total_debt: calculations.total,
        } as any,
        companyInfo: {
          name_ar: 'شركة العراف لتأجير السيارات',
          name_en: 'Al-Araf Car Rental',
          address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
          cr_number: '146832',
        },
        vehicleInfo: {
          plate: vehicle?.plate_number || (contract as any).license_plate || 'غير محدد',
          make: vehicle?.make || '',
          model: vehicle?.model || '',
          year: vehicle?.year || 0,
        },
        contractInfo: {
          contract_number: contract.contract_number,
          start_date: contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-QA') : '',
          monthly_rent: Number(contract.monthly_amount) || 0,
        },
        damages: damagesAmount,
      };

      const memoHtml = generateLegalComplaintHTML(documentData);
      openLetterForPrint(memoHtml);
      
      const blob = new Blob([memoHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      // تحديث الـ refs مباشرة لضمان توفر القيم فوراً
      memoUrlRef.current = blobUrl;
      memoHtmlRef.current = memoHtml; // حفظ محتوى HTML
      setMemoUrl(blobUrl);
      
      // حفظ المستند في قاعدة البيانات
      if (companyId && contractId) {
        supabase
          .from('lawsuit_documents')
          .upsert({
            company_id: companyId,
            contract_id: contractId,
            document_type: 'explanatory_memo',
            document_name: 'المذكرة الشارحة',
            html_content: memoHtml,
            created_by: user?.id,
          }, {
            onConflict: 'contract_id,document_type'
          })
          .then(({ error }) => {
            if (error) console.error('Error saving document:', error);
          });
      }
      
      toast.success('✅ تم توليد المذكرة الشارحة!');
    } catch (error: any) {
      toast.error('حدث خطأ أثناء توليد المذكرة');
    } finally {
      setIsGeneratingMemo(false);
    }
  }, [contract, calculations, overdueInvoices, companyId, contractId, user]);

  // تحميل المذكرة الشارحة كـ PDF
  const downloadMemoAsPdf = useCallback(async () => {
    if (!memoHtmlRef.current) {
      toast.error('يرجى توليد المذكرة الشارحة أولاً');
      return;
    }

    setIsDownloadingMemoPdf(true);
    try {
      const customerName = formatCustomerName((contract as any)?.customers);
      const filename = `المذكرة_الشارحة_${customerName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await downloadHtmlAsPdf(memoHtmlRef.current, filename);
      toast.success('✅ تم تحميل المذكرة الشارحة بصيغة PDF');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('حدث خطأ أثناء تحميل الملف');
    } finally {
      setIsDownloadingMemoPdf(false);
    }
  }, [contract]);

  // تحميل المذكرة الشارحة كـ Word
  const downloadMemoAsDocx = useCallback(async () => {
    if (!memoHtmlRef.current) {
      toast.error('يرجى توليد المذكرة الشارحة أولاً');
      return;
    }

    setIsDownloadingMemoDocx(true);
    try {
      const customerName = formatCustomerName((contract as any)?.customers);
      const filename = `المذكرة_الشارحة_${customerName}_${new Date().toISOString().split('T')[0]}.docx`;
      
      await downloadHtmlAsDocx(memoHtmlRef.current, filename);
      toast.success('✅ تم تحميل المذكرة الشارحة بصيغة Word');
    } catch (error: any) {
      console.error('Error downloading DOCX:', error);
      toast.error('حدث خطأ أثناء تحميل الملف');
    } finally {
      setIsDownloadingMemoDocx(false);
    }
  }, [contract]);

  // توليد كشف المستندات
  const generateDocumentsList = useCallback(() => {
    if (!contract || !taqadiData) return;

    setIsGeneratingDocsList(true);
    const customer = (contract as any)?.customers;
    const customerName = formatCustomerName(customer);

    // بناء قائمة المستندات ديناميكياً من جميع المستندات المرفوعة
    const documents: { name: string; status: 'مرفق' | 'غير مرفق'; url?: string; type?: string }[] = [];

    // إضافة المذكرة الشارحة - استخدام الـ ref للحصول على أحدث قيمة
    const currentMemoUrl = memoUrlRef.current || memoUrl;
    const currentMemoHtml = memoHtmlRef.current;
    if (currentMemoUrl) {
      documents.push({
        name: 'المذكرة الشارحة',
        status: 'مرفق',
        url: currentMemoUrl,
        type: 'html',
        htmlContent: currentMemoHtml || undefined,
      });
    }

    // إضافة كشف المطالبات المالية - استخدام الـ ref للحصول على أحدث قيمة
    const currentClaimsUrl = claimsStatementUrlRef.current || claimsStatementUrl;
    const currentClaimsHtml = claimsHtmlRef.current;
    if (currentClaimsUrl) {
      documents.push({
        name: 'كشف المطالبات المالية',
        status: 'مرفق',
        url: currentClaimsUrl,
        type: 'html',
        htmlContent: currentClaimsHtml || undefined,
      });
    }

    // إضافة صورة العقد
    if (contractFileUrl) {
      documents.push({
        name: 'صورة من العقد',
        status: 'مرفق',
        url: contractFileUrl,
        type: 'image',
      });
    }

    // إضافة جميع مستندات الشركة القانونية المرفوعة
    const fixedDocTypes: LegalDocumentType[] = [
      'commercial_register',
      'establishment_record',
      'iban_certificate',
      'representative_id',
      'authorization_letter',
    ];

    for (const docType of fixedDocTypes) {
      const doc = getDocByType(docType);
      if (doc) {
        documents.push({
          name: DOCUMENT_TYPE_NAMES[docType],
          status: 'مرفق',
          url: doc.file_url,
          type: 'pdf',
        });
      } else {
        documents.push({
          name: DOCUMENT_TYPE_NAMES[docType],
          status: 'غير مرفق',
        });
      }
    }

    const docsListHtml = generateDocumentsListHtml({
      caseTitle: taqadiData.caseTitle,
      customerName,
      amount: taqadiData.amount,
      documents,
    });

    openLetterForPrint(docsListHtml);
    setDocsListUrl('generated');
    setIsGeneratingDocsList(false);
    toast.success('✅ تم توليد كشف المستندات!');
  }, [taqadiData, contract, legalDocs, memoUrl, contractFileUrl, claimsStatementUrl]);

  // توليد كشف المطالبات
  const generateClaimsStatement = useCallback(() => {
    if (!contract || !overdueInvoices.length && !trafficViolations.length) return;

    setIsGeneratingClaims(true);
    const customer = (contract as any)?.customers;
    const customerName = formatCustomerName(customer);

    const invoicesData = overdueInvoices.map((inv) => {
      const daysLate = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
      // حساب الغرامة: 120 ر.ق لكل يوم بحد أقصى 3000 ر.ق
      const penalty = remaining > 0 ? Math.min(daysLate * 120, 3000) : 0;
      return {
        invoiceNumber: inv.invoice_number || '-',
        dueDate: inv.due_date,
        totalAmount: inv.total_amount || 0,
        paidAmount: inv.paid_amount || 0,
        daysLate,
        penalty,
      };
    });

    const violationsData = trafficViolations.map((v) => ({
      violationNumber: v.violation_number || '-',
      violationDate: v.violation_date || '',
      violationType: v.violation_type || 'غير محدد',
      location: v.location || '-',
      fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
    }));

    const totalPenalties = invoicesData.reduce((sum, inv) => sum + (inv.penalty || 0), 0);
    const claimsHtml = generateClaimsStatementHtml({
      customerName,
      nationalId: customer?.national_id || '-',
      phone: customer?.phone || customer?.mobile || '',
      contractNumber: contract?.contract_number || '-',
      contractStartDate: contract?.start_date || '',
      contractEndDate: contract?.end_date || '',
      invoices: invoicesData,
      violations: violationsData,
      totalOverdue: calculations.overdueRent + calculations.violationsFines + totalPenalties,
      amountInWords: calculations.amountInWords,
      caseTitle: taqadiData?.caseTitle,
    });

    openLetterForPrint(claimsHtml);

    // حفظ كشف المطالبات كـ blob URL
    const blob = new Blob([claimsHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    // تحديث الـ refs مباشرة لضمان توفر القيم فوراً
    claimsStatementUrlRef.current = blobUrl;
    claimsHtmlRef.current = claimsHtml; // حفظ محتوى HTML
    setClaimsStatementUrl(blobUrl);
    setIsGeneratingClaims(false);
    
    // حفظ المستند في قاعدة البيانات
    if (companyId && contractId) {
      supabase
        .from('lawsuit_documents')
        .upsert({
          company_id: companyId,
          contract_id: contractId,
          document_type: 'claims_statement',
          document_name: 'كشف المطالبات المالية',
          html_content: claimsHtml,
          created_by: user?.id,
        }, {
          onConflict: 'contract_id,document_type'
        })
        .then(({ error }) => {
          if (error) console.error('Error saving document:', error);
        });
    }
    
    toast.success('✅ تم توليد كشف المطالبات!');
  }, [overdueInvoices, trafficViolations, contract, calculations, taqadiData, companyId, contractId, user]);

  // توليد كشف المخالفات المرورية
  const generateViolationsList = useCallback(() => {
    if (!contract || !trafficViolations.length) {
      toast.error('لا توجد مخالفات مرورية');
      return;
    }

    setIsGeneratingViolations(true);
    const customer = (contract as any)?.customers;
    const customerName = formatCustomerName(customer);
    const vehicle = (contract as any)?.vehicles;

    const violationsData = trafficViolations.map((v) => ({
      violationNumber: v.violation_number || '-',
      violationDate: v.violation_date || '',
      violationType: v.violation_type || 'غير محدد',
      location: v.location || '-',
      fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
    }));

    // استخدام نفس التنسيق مع الفواتير فارغة
    const violationsHtml = generateClaimsStatementHtml({
      customerName,
      nationalId: customer?.national_id || '-',
      phone: customer?.phone || customer?.mobile || '',
      contractNumber: contract?.contract_number || '-',
      contractStartDate: contract?.start_date || '',
      contractEndDate: contract?.end_date || '',
      invoices: [],
      violations: violationsData,
      totalOverdue: calculations.violationsFines,
      amountInWords: lawsuitService.convertAmountToWords(calculations.violationsFines),
      caseTitle: `كشف المخالفات المرورية - ${customerName}`,
    });

    openLetterForPrint(violationsHtml);
    setViolationsListUrl('generated');
    setIsGeneratingViolations(false);
    toast.success('✅ تم توليد كشف المخالفات المرورية!');
  }, [trafficViolations, contract, calculations]);

  // توليد بلاغ سرقة المركبة
  const generateCriminalComplaint = useCallback(() => {
    if (!contract) {
      toast.error('جاري تحميل بيانات العقد...');
      return;
    }

    setIsGeneratingComplaint(true);
    const customer = (contract as any)?.customers;
    const vehicle = (contract as any)?.vehicles;
    const customerName = formatCustomerName(customer);

    const complaintHtml = generateCriminalComplaintHtml({
      customerName,
      customerNationality: customer?.nationality || '',
      customerId: customer?.national_id || '-',
      customerMobile: customer?.phone || customer?.mobile || '',
      contractDate: contract?.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA') 
        : '-',
      contractEndDate: contract?.end_date 
        ? new Date(contract.end_date).toLocaleDateString('ar-QA') 
        : '-',
      vehicleType: vehicle 
        ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() 
        : '-',
      plateNumber: vehicle?.plate_number || '-',
      plateType: 'خصوصي',
      manufactureYear: vehicle?.year?.toString() || '',
      chassisNumber: vehicle?.vin || '',
    });

    openLetterForPrint(complaintHtml);
    setCriminalComplaintUrl('generated');
    setCriminalComplaintHtmlContent(complaintHtml); // حفظ المحتوى للإرسال عبر واتساب
    setIsGeneratingComplaint(false);
    setIncludeCriminalComplaint(true); // تفعيل التضمين في الحافظة تلقائياً
    
    // حفظ المستند في قاعدة البيانات
    if (companyId && contractId) {
      supabase
        .from('lawsuit_documents')
        .upsert({
          company_id: companyId,
          contract_id: contractId,
          document_type: 'criminal_complaint',
          document_name: 'بلاغ سرقة المركبة',
          html_content: complaintHtml,
          created_by: user?.id,
        }, {
          onConflict: 'contract_id,document_type'
        })
        .then(({ error }) => {
          if (error) console.error('Error saving document:', error);
        });
    }
    
    toast.success('✅ تم توليد بلاغ سرقة المركبة!');
  }, [contract, companyId, contractId, user]);

  // توليد طلب تحويل المخالفات
  const generateViolationsTransfer = useCallback(() => {
    if (!contract || !trafficViolations?.length) {
      toast.error('لا توجد مخالفات مرورية');
      return;
    }

    setIsGeneratingTransfer(true);
    const customer = (contract as any)?.customers;
    const vehicle = (contract as any)?.vehicles;
    const customerName = formatCustomerName(customer);

    const transferHtml = generateViolationsTransferHtml({
      customerName,
      customerId: customer?.national_id || '-',
      customerMobile: customer?.phone || customer?.mobile || '',
      contractNumber: contract?.contract_number || '-',
      contractDate: contract?.start_date 
        ? new Date(contract.start_date).toLocaleDateString('ar-QA') 
        : '-',
      contractEndDate: contract?.end_date 
        ? new Date(contract.end_date).toLocaleDateString('ar-QA') 
        : '-',
      vehicleType: vehicle 
        ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() 
        : '-',
      plateNumber: vehicle?.plate_number || '-',
      violations: trafficViolations.map(v => ({
        violationNumber: v.violation_number || '-',
        violationDate: v.violation_date 
          ? new Date(v.violation_date).toLocaleDateString('ar-QA') 
          : '-',
        violationType: v.violation_type || 'مخالفة مرورية',
        location: v.location || '',
        fineAmount: v.fine_amount || 0,
      })),
      totalFines: trafficViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0),
    });

    openLetterForPrint(transferHtml);
    setViolationsTransferUrl('generated');
    setViolationsTransferHtmlContent(transferHtml); // حفظ المحتوى للإرسال عبر واتساب
    setIsGeneratingTransfer(false);
    setIncludeViolationsTransfer(true); // تفعيل التضمين في الحافظة تلقائياً
    
    // حفظ المستند في قاعدة البيانات
    if (companyId && contractId) {
      supabase
        .from('lawsuit_documents')
        .upsert({
          company_id: companyId,
          contract_id: contractId,
          document_type: 'violations_transfer',
          document_name: 'طلب تحويل المخالفات',
          html_content: transferHtml,
          created_by: user?.id,
        }, {
          onConflict: 'contract_id,document_type'
        })
        .then(({ error }) => {
          if (error) console.error('Error saving document:', error);
        });
    }
    
    toast.success('✅ تم توليد طلب تحويل المخالفات!');
  }, [contract, trafficViolations, companyId, contractId, user]);

  // توليد حافظة المستندات الموحدة - ملف HTML واحد
  const generateDocumentPortfolio = useCallback(async () => {
    if (!contract) {
      toast.error('جاري تحميل بيانات العقد...');
      return;
    }

    // التحقق من وجود كشف المطالبات المالية
    if (!claimsStatementUrl) {
      toast.error('يرجى توليد كشف المطالبات المالية أولاً');
      return;
    }

    setIsGeneratingPortfolio(true);
    
    try {
      const customer = (contract as any)?.customers;
      const vehicle = (contract as any)?.vehicles;
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
        : 'غير معروف';

      // جلب محتوى كشف المطالبات من الـ blob URL
      let claimsHtml = '';
      try {
        const response = await fetch(claimsStatementUrl);
        if (!response.ok) throw new Error('Failed to fetch claims');
        claimsHtml = await response.text();
        console.log('✅ تم جلب كشف المطالبات، الحجم:', claimsHtml.length, 'حرف');
      } catch (err) {
        console.error('❌ خطأ في جلب كشف المطالبات:', err);
        toast.error('تعذر جلب كشف المطالبات المالية');
        setIsGeneratingPortfolio(false);
        return;
      }

      // توليد بلاغ سرقة المركبة (اختياري)
      let criminalComplaintHtml: string | undefined;
      if (includeCriminalComplaint) {
        criminalComplaintHtml = generateCriminalComplaintHtml({
          customerName,
          customerNationality: customer?.nationality || '',
          customerId: customer?.national_id || '-',
          customerMobile: customer?.phone || customer?.mobile || '',
          contractDate: contract?.start_date 
            ? new Date(contract.start_date).toLocaleDateString('ar-QA') 
            : '-',
          contractEndDate: contract?.end_date 
            ? new Date(contract.end_date).toLocaleDateString('ar-QA') 
            : '-',
          vehicleType: vehicle 
            ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() 
            : '-',
          plateNumber: vehicle?.plate_number || '-',
          plateType: 'خصوصي',
          manufactureYear: vehicle?.year?.toString() || '',
          chassisNumber: vehicle?.vin || '',
        });
      }

      // توليد طلب تحويل المخالفات (اختياري - إذا كانت هناك مخالفات)
      let violationsTransferHtml: string | undefined;
      if (includeViolationsTransfer && trafficViolations && trafficViolations.length > 0) {
        violationsTransferHtml = generateViolationsTransferHtml({
          customerName,
          customerId: customer?.national_id || '-',
          customerMobile: customer?.phone || customer?.mobile || '',
          contractNumber: contract?.contract_number || '-',
          contractDate: contract?.start_date 
            ? new Date(contract.start_date).toLocaleDateString('ar-QA') 
            : '-',
          contractEndDate: contract?.end_date 
            ? new Date(contract.end_date).toLocaleDateString('ar-QA') 
            : '-',
          vehicleType: vehicle 
            ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() 
            : '-',
          plateNumber: vehicle?.plate_number || '-',
          violations: trafficViolations.map(v => ({
            violationNumber: v.violation_number || '-',
            violationDate: v.violation_date 
              ? new Date(v.violation_date).toLocaleDateString('ar-QA') 
              : '-',
            violationType: v.violation_type || 'مخالفة مرورية',
            location: v.location || '',
            fineAmount: v.fine_amount || 0,
          })),
          totalFines: trafficViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0),
        });
      }

      // جلب روابط المستندات
      const ibanCert = getDocByType('iban_certificate');
      const commercialReg = getDocByType('commercial_register');

      console.log('📄 المستندات المتاحة:', {
        عقد_الإيجار: !!contractFileUrl,
        كشف_المطالبات: !!claimsHtml,
        بلاغ_السرقة: !!criminalComplaintHtml,
        طلب_تحويل_المخالفات: !!violationsTransferHtml,
        شهادة_IBAN: !!ibanCert?.file_url,
        السجل_التجاري: !!commercialReg?.file_url
      });

      // توليد الحافظة
      const portfolioHtml = generateDocumentPortfolioHtml({
        caseTitle: taqadiData?.caseTitle || `قضية مطالبة مالية ضد ${customerName}`,
        customerName,
        contractNumber: contract?.contract_number || '-',
        totalAmount: calculations.overdueRent + calculations.violationsFines + calculations.lateFees,
        // المستندات
        contractImageUrl: contractFileUrl || undefined,
        claimsStatementHtml: claimsHtml,
        criminalComplaintHtml: criminalComplaintHtml,
        violationsTransferHtml: violationsTransferHtml,
        ibanImageUrl: ibanCert?.file_url || undefined,
        commercialRegisterUrl: commercialReg?.file_url || undefined,
      });

      openLetterForPrint(portfolioHtml);
      toast.success('✅ تم توليد حافظة المستندات!');
    } catch (error) {
      console.error('Error generating portfolio:', error);
      toast.error('حدث خطأ أثناء توليد حافظة المستندات');
    } finally {
      setIsGeneratingPortfolio(false);
    }
  }, [contract, taqadiData, calculations, claimsStatementUrl, contractFileUrl, getDocByType, trafficViolations, includeCriminalComplaint, includeViolationsTransfer]);

  // بدء الأتمتة
  const startAutomation = useCallback(async () => {
    if (!taqadiData || !contract) return;

    setIsAutomating(true);
    const customer = (contract as any).customers;
    const vehicle = (contract as any).vehicles;

    const lawsuitData = {
      defendant: {
        name: formatCustomerName(customer),
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
      amounts: calculations,
      vehicle: {
        model: vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : '',
        plate: vehicle?.plate_number || '',
        contractNumber: contract.contract_number
      },
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem('alarafLawsuitDataFull', JSON.stringify(lawsuitData));
    toast.info('📋 تم حفظ البيانات! بعد تسجيل الدخول في تقاضي، اضغط على الـ Bookmarklet', { duration: 6000 });
    window.open('https://taqadi.sjc.gov.qa/itc/', '_blank');
    setIsAutomating(false);
  }, [taqadiData, contract, calculations]);

  // توليد جميع المستندات
  const generateAllDocuments = useCallback(async () => {
    if (!contract) {
      toast.error('جاري تحميل بيانات العقد...');
      return;
    }

    setIsGeneratingAll(true);

    try {
      const documentsToGenerate: Array<{
        name: string;
        isReady: boolean;
        generate: () => void;
      }> = [
        {
          name: 'المذكرة الشارحة',
          isReady: !!memoUrl,
          generate: () => {
            if (!memoUrl) generateExplanatoryMemo();
          },
        },
        {
          name: 'كشف المطالبات المالية',
          isReady: !!claimsStatementUrl,
          generate: () => {
            if (!claimsStatementUrl) generateClaimsStatement();
          },
        },
        {
          name: 'كشف المستندات المرفوعة',
          isReady: !!docsListUrl,
          generate: () => {
            if (!docsListUrl) generateDocumentsList();
          },
        },
      ];

      // Add violations list if there are violations
      if (trafficViolations.length > 0) {
        documentsToGenerate.push({
          name: 'كشف المخالفات المرورية',
          isReady: !!violationsListUrl,
          generate: () => {
            if (!violationsListUrl) generateViolationsList();
          },
        });
      }

      let generatedCount = 0;
      for (const doc of documentsToGenerate) {
        if (!doc.isReady) {
          toast.info(`جاري توليد ${doc.name}...`);
          doc.generate();
          // Wait for the document to be generated
          await new Promise(resolve => setTimeout(resolve, 800));
          generatedCount++;
        }
      }

      if (generatedCount > 0) {
        toast.success(`✅ تم توليد ${generatedCount} مستند بنجاح!`);
      } else {
        toast.info('جميع المستندات جاهزة بالفعل');
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء توليد المستندات');
    } finally {
      setIsGeneratingAll(false);
    }
  }, [
    contract,
    memoUrl,
    claimsStatementUrl,
    docsListUrl,
    violationsListUrl,
    trafficViolations,
    generateExplanatoryMemo,
    generateClaimsStatement,
    generateDocumentsList,
    generateViolationsList,
  ]);

  // حساب قائمة المستندات
  const documentsList: DocumentItem[] = useMemo(() => {
    const commercialReg = getDocByType('commercial_register');
    const ibanCert = getDocByType('iban_certificate');
    const repId = getDocByType('representative_id');

    return [
      // المستندات المولدة (إلزامية)
      {
        id: 'memo',
        name: 'المذكرة الشارحة',
        description: memoUrl ? '✅ جاهزة للتحميل (PDF / Word)' : 'توليد تلقائي',
        status: memoUrl ? 'ready' : 'pending',
        type: 'mandatory',
        category: 'generated',
        url: memoUrl,
        onGenerate: generateExplanatoryMemo,
        isGenerating: isGeneratingMemo,
        onDownloadPdf: downloadMemoAsPdf,
        onDownloadDocx: downloadMemoAsDocx,
        isDownloadingPdf: isDownloadingMemoPdf,
        isDownloadingDocx: isDownloadingMemoDocx,
      },
      {
        id: 'claims',
        name: 'كشف المطالبات المالية',
        description: claimsStatementUrl ? '✅ جاهز للتحميل' : `${overdueInvoices.length} فاتورة متأخرة`,
        status: claimsStatementUrl ? 'ready' : 'pending',
        type: 'mandatory',
        category: 'generated',
        url: claimsStatementUrl,
        onGenerate: generateClaimsStatement,
        isGenerating: isGeneratingClaims,
      },
      {
        id: 'docs-list',
        name: 'كشف المستندات المرفوعة',
        description: docsListUrl ? '✅ جاهز للتحميل' : 'قائمة بجميع المستندات',
        status: docsListUrl ? 'ready' : 'pending',
        type: 'mandatory',
        category: 'generated',
        url: docsListUrl,
        onGenerate: generateDocumentsList,
        isGenerating: isGeneratingDocsList,
      },
      // مستندات الشركة (إلزامية)
      {
        id: 'commercial_register',
        name: 'السجل التجاري',
        description: commercialReg ? '✅ مرفوع' : '✗ غير مرفوع',
        status: commercialReg ? 'ready' : 'missing',
        type: 'mandatory',
        category: 'company',
        url: commercialReg?.file_url,
      },
      {
        id: 'iban_certificate',
        name: 'شهادة IBAN',
        description: ibanCert ? '✅ مرفوع' : '✗ غير مرفوع',
        status: ibanCert ? 'ready' : 'missing',
        type: 'mandatory',
        category: 'company',
        url: ibanCert?.file_url,
      },
      {
        id: 'representative_id',
        name: 'البطاقة الشخصية للممثل',
        description: repId ? '✅ مرفوع' : '✗ غير مرفوع',
        status: repId ? 'ready' : 'missing',
        type: 'mandatory',
        category: 'company',
        url: repId?.file_url,
      },
      // عقد الإيجار (إلزامي) - يتم جلبه تلقائياً من تفاصيل العقد إذا كان موجوداً
      {
        id: 'contract',
        name: 'عقد الإيجار',
        description: contractFileUrl 
          ? (existingContractDoc ? `✅ ${existingContractDoc.document_name || 'موجود في النظام'}` : '✅ مرفوع')
          : `رقم ${contract?.contract_number || '-'} - يرجى رفع نسخة`,
        status: contractFileUrl ? 'ready' : 'pending',
        type: 'mandatory',
        category: 'contract',
        url: contractFileUrl,
        onUpload: existingContractDoc ? undefined : uploadContractFile, // لا تظهر خيار الرفع إذا كان موجوداً
        isGenerating: isUploadingContract,
      },
      // المخالفات المرورية (اختياري)
      ...(calculations.violationsCount > 0 ? [{
        id: 'violations',
        name: 'كشف المخالفات المرورية',
        description: violationsListUrl ? '✅ جاهز' : `${calculations.violationsCount} مخالفة`,
        status: violationsListUrl ? 'ready' : 'pending',
        type: 'optional' as const,
        category: 'violations' as const,
        url: violationsListUrl,
        onGenerate: generateViolationsList,
        isGenerating: isGeneratingViolations,
      }] : []),
      // بلاغ سرقة المركبة (اختياري)
      {
        id: 'criminal-complaint',
        name: 'بلاغ سرقة المركبة',
        description: criminalComplaintUrl ? '✅ جاهز' : 'بلاغ جنائي للنيابة العامة',
        status: criminalComplaintUrl ? 'ready' : 'pending',
        type: 'optional' as const,
        category: 'generated' as const,
        url: criminalComplaintUrl,
        onGenerate: generateCriminalComplaint,
        isGenerating: isGeneratingComplaint,
      },
      // طلب تحويل المخالفات (اختياري - إذا توجد مخالفات)
      ...(calculations.violationsCount > 0 ? [{
        id: 'violations-transfer',
        name: 'طلب تحويل المخالفات',
        description: violationsTransferUrl ? '✅ جاهز' : `طلب لإدارة المرور (${calculations.violationsCount} مخالفة)`,
        status: violationsTransferUrl ? 'ready' : 'pending',
        type: 'optional' as const,
        category: 'generated' as const,
        url: violationsTransferUrl,
        onGenerate: generateViolationsTransfer,
        isGenerating: isGeneratingTransfer,
      }] : []),
    ];
  }, [
    memoUrl, claimsStatementUrl, docsListUrl, violationsListUrl, contractFileUrl,
    criminalComplaintUrl, violationsTransferUrl,
    legalDocs, calculations, contract, overdueInvoices,
    isGeneratingMemo, isGeneratingClaims, isGeneratingDocsList, isUploadingContract,
    isGeneratingViolations, generateViolationsList, 
    isGeneratingComplaint, generateCriminalComplaint,
    isGeneratingTransfer, generateViolationsTransfer,
    existingContractDoc, uploadContractFile,
    downloadMemoAsPdf, downloadMemoAsDocx, isDownloadingMemoPdf, isDownloadingMemoDocx,
  ]);

  // حساب التقدم
  const progressData = useMemo(() => {
    // Only count generated documents (documents that need to be generated for each case)
    const generatedDocs = documentsList.filter(d => d.category === 'generated');
    const readyDocs = generatedDocs.filter(d => d.status === 'ready');
    const percentage = generatedDocs.length > 0 ? Math.round((readyDocs.length / generatedDocs.length) * 100) : 0;
    return { total: generatedDocs.length, ready: readyDocs.length, percentage };
  }, [documentsList]);

  // Helper function to upload HTML content as a document
  const uploadHtmlDocument = useCallback(async (htmlContent: string, fileName: string): Promise<string | null> => {
    if (!companyId || !contractId) return null;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const filePath = `lawsuits/${companyId}/${contractId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error(`Failed to upload ${fileName}:`, error);
      return null;
    }
  }, [companyId, contractId]);

  // تسجيل القضية في النظام
  const registerCaseInSystem = useCallback(async () => {
    if (!contract || !companyId || !user?.id) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    // Check if generated documents are ready (only generated documents are required)
    const generatedDocs = documentsList.filter(d => d.category === 'generated');
    const readyDocs = generatedDocs.filter(d => d.status === 'ready');

    if (readyDocs.length < generatedDocs.length) {
      toast.error(`يجب تجهيز جميع المستندات المولدة (${readyDocs.length}/${generatedDocs.length})`);
      return;
    }

    setIsRegistering(true);
    toast.info('جاري تسجيل القضية في النظام...');

    try {
      const customer = (contract as any).customers;
      const vehicle = (contract as any).vehicles;

      // Create delinquent customer object for the hook
      const delinquentCustomer = {
        customer_id: customer?.id || '',
        customer_name: formatCustomerName(customer),
        customer_code: customer?.id || '',
        contract_id: contractId,
        contract_number: contract.contract_number,
        vehicle_id: contract.vehicle_id,
        vehicle_plate: vehicle?.plate_number || (contract as any).license_plate,
        phone: customer?.phone || '',
        email: customer?.email || '',
        total_debt: calculations.total,
        overdue_amount: calculations.overdueRent,
        late_penalty: calculations.lateFees,
        violations_amount: calculations.violationsFines,
        violations_count: calculations.violationsCount,
        days_overdue: Math.floor((new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)),
        months_unpaid: overdueInvoices.length,
        risk_score: calculations.total > 10000 ? 85 : calculations.total > 5000 ? 70 : 60,
        risk_level: calculations.total > 10000 ? 'CRITICAL' : calculations.total > 5000 ? 'HIGH' : 'MEDIUM',
        has_previous_legal_cases: false,
        previous_legal_cases_count: 0,
        is_blacklisted: false,
        last_payment_date: null,
        last_payment_amount: 0,
        recommended_action: { label: 'رفع دعوى' },
      };

      // Create the legal case
      const result = await convertToCase.mutateAsync({
        delinquentCustomer,
        additionalNotes: `عنوان الدعوى: ${taqadiData?.caseTitle}\nالمطالبة: ${taqadiData?.claims}`,
      });

      // Get the created case ID
      const { data: createdCase } = await supabase
        .from('legal_cases')
        .select('id, case_number')
        .eq('company_id', companyId)
        .eq('client_id', customer?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!createdCase) {
        throw new Error('فشل في الحصول على بيانات القضية');
      }

      // Upload generated documents to the case
      const documentUploads = [];

      // Upload memo
      if (memoUrl) {
        try {
          const memoHtml = await fetch(memoUrl).then(r => r.text());
          const filePath = await uploadHtmlDocument(memoHtml, 'المذكرة_الشارحة.html');
          if (filePath) {
            documentUploads.push({
              case_id: createdCase.id,
              company_id: companyId,
              document_type: 'explanatory_memo',
              document_title: 'المذكرة الشارحة',
              document_title_ar: 'المذكرة الشارحة',
              file_path: filePath,
              file_name: 'المذكرة_الشارحة.html',
              file_type: 'html',
              file_size: new Blob([memoHtml]).size,
              description: 'مذكرة شارحة للدعوى',
              is_confidential: false,
              created_by: user.id,
            });
          }
        } catch (e) {
          console.error('Failed to upload memo:', e);
        }
      }

      // Upload claims statement
      if (claimsStatementUrl) {
        try {
          const claimsHtml = await fetch(claimsStatementUrl).then(r => r.text());
          const filePath = await uploadHtmlDocument(claimsHtml, 'كشف_المطالبات.html');
          if (filePath) {
            documentUploads.push({
              case_id: createdCase.id,
              company_id: companyId,
              document_type: 'claims_statement',
              document_title: 'كشف المطالبات المالية',
              document_title_ar: 'كشف المطالبات المالية',
              file_path: filePath,
              file_name: 'كشف_المطالبات.html',
              file_type: 'html',
              file_size: new Blob([claimsHtml]).size,
              description: 'كشف بالمطالبات المالية والفواتير المتأخرة',
              is_confidential: false,
              created_by: user.id,
            });
          }
        } catch (e) {
          console.error('Failed to upload claims statement:', e);
        }
      }

      // Upload documents list
      if (docsListUrl) {
        try {
          const docsHtml = await fetch(docsListUrl).then(r => r.text());
          const filePath = await uploadHtmlDocument(docsHtml, 'كشف_المستندات.html');
          if (filePath) {
            documentUploads.push({
              case_id: createdCase.id,
              company_id: companyId,
              document_type: 'documents_list',
              document_title: 'كشف المستندات المرفوعة',
              document_title_ar: 'كشف المستندات المرفوعة',
              file_path: filePath,
              file_name: 'كشف_المستندات.html',
              file_type: 'html',
              file_size: new Blob([docsHtml]).size,
              description: 'قائمة بجميع المستندات المرفوعة للقضية',
              is_confidential: false,
              created_by: user.id,
            });
          }
        } catch (e) {
          console.error('Failed to upload documents list:', e);
        }
      }

      // Upload violations list if exists
      if (violationsListUrl) {
        try {
          const violationsHtml = await fetch(violationsListUrl).then(r => r.text());
          const filePath = await uploadHtmlDocument(violationsHtml, 'كشف_المخالفات.html');
          if (filePath) {
            documentUploads.push({
              case_id: createdCase.id,
              company_id: companyId,
              document_type: 'traffic_violations',
              document_title: 'كشف المخالفات المرورية',
              document_title_ar: 'كشف المخالفات المرورية',
              file_path: filePath,
              file_name: 'كشف_المخالفات.html',
              file_type: 'html',
              file_size: new Blob([violationsHtml]).size,
              description: 'كشف بالمخالفات المرورية غير المسددة',
              is_confidential: false,
              created_by: user.id,
            });
          }
        } catch (e) {
          console.error('Failed to upload violations list:', e);
        }
      }

      // Insert all documents
      if (documentUploads.length > 0) {
        const { error: docsError } = await supabase
          .from('legal_case_documents')
          .insert(documentUploads);

        if (docsError) {
          console.error('Failed to insert documents:', docsError);
        }
      }

      toast.success(`✅ تم تسجيل القضية ${createdCase.case_number} في النظام بنجاح!`, { duration: 4000 });

      // Navigate to cases page
      setTimeout(() => {
        navigate('/legal/cases?view=cases');
      }, 1500);

    } catch (error: any) {
      console.error('Error registering case:', error);
      toast.error(`فشل تسجيل القضية: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsRegistering(false);
    }
  }, [
    contract,
    companyId,
    user,
    calculations,
    taqadiData,
    overdueInvoices,
    convertToCase,
    documentsList,
    memoUrl,
    claimsStatementUrl,
    docsListUrl,
    violationsListUrl,
    uploadHtmlDocument,
    contractId,
    navigate,
  ]);

  // إرسال البيانات إلى جدول بيانات تقاضي
  const sendToLawsuitData = useCallback(async () => {
    if (!contract || !companyId || !taqadiData) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    setIsSendingToLawsuitData(true);
    
    try {
      const customer = (contract as any).customers;
      
      // تقسيم اسم العميل إلى أجزاء
      const fullName = formatCustomerName(customer);
      const nameParts = fullName.split(' ');
      
      const firstName = nameParts[0] || '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // إعداد بيانات القضية
      const lawsuitRecord = {
        company_id: companyId,
        case_title: taqadiData.caseTitle,
        facts: taqadiData.facts,
        requests: taqadiData.claims,
        claim_amount: taqadiData.amount,
        claim_amount_words: taqadiData.amountInWords,
        defendant_first_name: firstName,
        defendant_middle_name: middleName || null,
        defendant_last_name: lastName,
        defendant_nationality: customer?.nationality || customer?.country || null,
        defendant_id_number: customer?.national_id || null,
        defendant_address: customer?.address || null,
        defendant_phone: customer?.phone || customer?.mobile || null,
        defendant_email: customer?.email || null,
        contract_id: contractId || null,
        customer_id: customer?.id || null,
      };

      // إدراج البيانات في الجدول
      const { error } = await supabase
        .from('lawsuit_templates')
        .insert([lawsuitRecord]);

      if (error) {
        throw error;
      }

      toast.success('✅ تم إرسال البيانات إلى بيانات تقاضي بنجاح!');
      
      // عرض خيار الانتقال إلى الصفحة
      toast.info(
        <div className="flex items-center gap-2">
          <span>هل تريد الانتقال إلى صفحة بيانات تقاضي؟</span>
          <Button size="sm" variant="outline" onClick={() => navigate('/legal/lawsuit-data')}>
            انتقال
          </Button>
        </div>,
        { duration: 5000 }
      );

    } catch (error: any) {
      console.error('Error sending to lawsuit data:', error);
      toast.error(`فشل إرسال البيانات: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSendingToLawsuitData(false);
    }
  }, [contract, companyId, taqadiData, contractId, navigate]);

  // حالة التحميل
  if (companyLoading || contractLoading || invoicesLoading || violationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <span className="mr-2 text-muted-foreground">جاري تحميل البيانات...</span>
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
  const customerFullName = formatCustomerName(customer);

  return (
    <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
      {/* زر الرجوع */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 ml-2" />
        رجوع
      </Button>

      {/* Header - شريط ملخص الدعوى */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0 shadow-lg shadow-teal-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Gavel className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">تجهيز الدعوى</h1>
                  <p className="text-sm text-white/70">
                    {customerFullName} | العقد: {contract.contract_number}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">
                  {calculations.total.toLocaleString('ar-QA')} ر.ق
                </div>
                <p className="text-xs text-white/60">إجمالي المطالبة</p>
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>التقدم في تجهيز المستندات</span>
                <span className="font-bold">{progressData.ready}/{progressData.total} مستند</span>
              </div>
              <Progress value={progressData.percentage} className="h-3 bg-white/20" />
              <p className="text-xs text-white/60 text-center">
                {progressData.percentage === 100
                  ? '✅ جميع المستندات جاهزة!'
                  : `${progressData.percentage}% مكتمل`}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* معلومات سريعة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <User className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">المدعى عليه</p>
          <p className="font-medium text-sm truncate">{customerFullName}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Car className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">السيارة</p>
          <p className="font-medium text-sm truncate">{vehicle?.make} {vehicle?.model}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">الفواتير المتأخرة</p>
          <p className="font-medium text-sm">{overdueInvoices.length} فاتورة</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <FileWarning className="h-5 w-5 mx-auto mb-1 text-red-500" />
          <p className="text-xs text-muted-foreground">المخالفات</p>
          <p className="font-medium text-sm">{calculations.violationsCount} مخالفة</p>
        </div>
      </motion.div>

      {/* قائمة المستندات الإلزامية */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                المستندات الإلزامية
                <Badge variant="secondary" className="mr-2">
                  {progressData.ready}/{progressData.total}
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement download all as ZIP
                  toast.info('قريباً: تحميل جميع المستندات كملف ZIP');
                }}
                disabled={progressData.percentage < 100}
              >
                <FolderDown className="h-4 w-4 ml-2" />
                تحميل الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentsList
              .filter(doc => doc.type === 'mandatory')
              .map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    doc.status === 'ready' 
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' 
                      : doc.status === 'missing'
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                      : 'bg-muted/30 border-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {doc.status === 'ready' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : doc.status === 'missing' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {doc.status === 'ready' && doc.url && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.url!, '_blank')}
                          title="معاينة"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* أزرار تحميل PDF و Word للمذكرة الشارحة */}
                        {doc.id === 'memo' && doc.onDownloadPdf && doc.onDownloadDocx ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={doc.onDownloadPdf}
                              disabled={doc.isDownloadingPdf}
                              title="تحميل PDF"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {doc.isDownloadingPdf ? (
                                <LoadingSpinner className="h-4 w-4" />
                              ) : (
                                <>
                                  <File className="h-4 w-4 ml-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={doc.onDownloadDocx}
                              disabled={doc.isDownloadingDocx}
                              title="تحميل Word"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              {doc.isDownloadingDocx ? (
                                <LoadingSpinner className="h-4 w-4" />
                              ) : (
                                <>
                                  <FileType className="h-4 w-4 ml-1" />
                                  Word
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (doc.url?.startsWith('blob:')) {
                                // Properly download blob URL
                                const a = document.createElement('a');
                                a.href = doc.url;
                                a.download = `${doc.name}.html`;
                                a.style.display = 'none';
                                document.body.appendChild(a);
                                a.click();
                                // Clean up after a short delay
                                setTimeout(() => {
                                  document.body.removeChild(a);
                                }, 100);
                              } else {
                                window.open(doc.url!, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    
                    {doc.onGenerate && (
                      <Button
                        size="sm"
                        variant={doc.status === 'ready' ? 'ghost' : 'default'}
                        onClick={doc.onGenerate}
                        disabled={doc.isGenerating}
                      >
                        {doc.isGenerating ? (
                          <LoadingSpinner className="h-4 w-4" />
                        ) : doc.status === 'ready' ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 ml-1" />
                            توليد
                          </>
                        )}
                      </Button>
                    )}
                    
                    {doc.onUpload && (
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) doc.onUpload!(file);
                          }}
                          disabled={doc.isGenerating}
                        />
                        <Button size="sm" variant={doc.status === 'ready' ? 'ghost' : 'default'} disabled={doc.isGenerating}>
                          {doc.isGenerating ? (
                            <LoadingSpinner className="h-4 w-4" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 ml-1" />
                              {doc.status === 'ready' ? 'تغيير' : 'رفع'}
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* إذا كان عقد وموجود من النظام - عرض تسمية توضيحية */}
                    {doc.id === 'contract' && doc.status === 'ready' && !doc.onUpload && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 ml-1" />
                        محفوظ في النظام
                      </Badge>
                    )}
                    
                    {doc.status === 'missing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/legal/documents')}
                      >
                        رفع
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* المستندات الاختيارية */}
      {documentsList.some(d => d.type === 'optional') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                مستندات داعمة (اختياري)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documentsList
                .filter(doc => doc.type === 'optional')
                .map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      doc.status === 'ready' 
                        ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20' 
                        : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {doc.status === 'ready' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.status === 'ready' && doc.url && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.url!, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (doc.url?.startsWith('blob:')) {
                                // Properly download blob URL
                                const a = document.createElement('a');
                                a.href = doc.url;
                                a.download = `${doc.name}.html`;
                                a.style.display = 'none';
                                document.body.appendChild(a);
                                a.click();
                                // Clean up after a short delay
                                setTimeout(() => {
                                  document.body.removeChild(a);
                                }, 100);
                              } else {
                                window.open(doc.url!, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {doc.onGenerate && (
                        <Button 
                          size="sm" 
                          variant={doc.status === 'ready' ? 'ghost' : 'default'}
                          onClick={doc.onGenerate}
                          disabled={doc.isGenerating}
                        >
                          {doc.isGenerating ? (
                            <LoadingSpinner className="h-4 w-4" />
                          ) : doc.status === 'ready' ? (
                            <RefreshCw className="h-4 w-4" />
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 ml-1" />
                              توليد
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              
              {/* خيارات تضمين في الحافظة */}
              <Separator className="my-4" />
              
              {/* زر إرسال مهمة لموظف */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSendReportDialogOpen(true)}
                  className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                >
                  <Send className="h-4 w-4" />
                  إرسال مهمة فتح بلاغ لموظف
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  إرسال ملف PDF لموظف لفتح بلاغ سرقة أو تحويل مخالفات
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">تضمين في حافظة المستندات:</p>
                <div className="flex flex-col gap-2">
                  <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    criminalComplaintUrl ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeCriminalComplaint}
                      onChange={(e) => setIncludeCriminalComplaint(e.target.checked)}
                      disabled={!criminalComplaintUrl}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium">بلاغ سرقة المركبة</span>
                      <p className="text-xs text-muted-foreground">
                        {criminalComplaintUrl ? '✅ جاهز للتضمين' : '⏳ يجب توليده أولاً'}
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    violationsTransferUrl ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeViolationsTransfer}
                      onChange={(e) => setIncludeViolationsTransfer(e.target.checked)}
                      disabled={!violationsTransferUrl}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium">طلب تحويل المخالفات</span>
                      <p className="text-xs text-muted-foreground">
                        {violationsTransferUrl 
                          ? '✅ جاهز للتضمين' 
                          : trafficViolations && trafficViolations.length > 0 
                            ? '⏳ يجب توليده أولاً'
                            : 'لا توجد مخالفات مرورية'
                        }
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* بيانات تقاضي (قابلة للطي) */}
      {taqadiData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <Collapsible open={showTaqadiData} onOpenChange={setShowTaqadiData}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      بيانات تقاضي (للنسخ)
                    </CardTitle>
                    {showTaqadiData ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* عنوان الدعوى */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">عنوان الدعوى</p>
                      <p className="font-medium text-sm">{taqadiData.caseTitle}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(taqadiData.caseTitle, 'title')}
                    >
                      {copiedField === 'title' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* الوقائع */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">الوقائع</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(taqadiData.facts, 'facts')}
                      >
                        {copiedField === 'facts' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{taqadiData.facts}</p>
                  </div>

                  {/* الطلبات */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">الطلبات</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(taqadiData.claims, 'claims')}
                      >
                        {copiedField === 'claims' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{taqadiData.claims}</p>
                  </div>

                  {/* المبلغ */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ</p>
                        <p className="font-bold">{taqadiData.amount.toLocaleString('ar-QA')}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(taqadiData.amount.toString(), 'amount')}
                      >
                        {copiedField === 'amount' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">كتابةً</p>
                        <p className="text-sm">{taqadiData.amountInWords}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(taqadiData.amountInWords, 'words')}
                      >
                        {copiedField === 'words' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      {/* أزرار الإجراءات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="sticky bottom-4"
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* توليد جميع المستندات */}
              <Button
                size="lg"
                onClick={generateAllDocuments}
                disabled={isGeneratingAll || isGeneratingMemo || isGeneratingClaims || isGeneratingDocsList || isGeneratingViolations}
                variant="outline"
                className="w-full sm:w-auto border-amber-500 text-amber-700 hover:bg-amber-50 hover:border-amber-600"
              >
                {isGeneratingAll ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <FileStack className="h-5 w-5 ml-2" />
                    توليد جميع المستندات
                  </>
                )}
              </Button>

              <Button
                size="lg"
                onClick={registerCaseInSystem}
                disabled={isRegistering || progressData.percentage < 100}
                className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
              >
                {isRegistering ? (
                  <>
                    <LoadingSpinner className="h-5 w-5 ml-2" />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <Gavel className="h-5 w-5 ml-2" />
                    تسجيل القضية في النظام
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={sendToLawsuitData}
                disabled={isSendingToLawsuitData || !taqadiData}
                className="w-full sm:w-auto border-purple-500 text-purple-700 hover:bg-purple-50 hover:border-purple-600"
              >
                {isSendingToLawsuitData ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 ml-2" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 ml-2" />
                    إرسال إلى بيانات تقاضي
                  </>
                )}
              </Button>

            </div>

            {progressData.percentage < 100 && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                ⚠️ يجب تجهيز جميع المستندات المولدة ({progressData.ready}/{progressData.total}) قبل رفع الدعوى
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* نافذة إرسال مهمة فتح بلاغ */}
      <SendReportTaskDialog
        open={sendReportDialogOpen}
        onOpenChange={(open) => {
          setSendReportDialogOpen(open);
          // توليد المستند تلقائياً عند فتح النافذة إذا لم يكن موجوداً
          if (open) {
            if (!criminalComplaintHtmlContent && contract) {
              console.log('[SEND REPORT] Auto-generating criminal complaint HTML...');
              const customer = (contract as any)?.customers;
              const vehicle = (contract as any)?.vehicles;
              const customerName = formatCustomerName(customer);

              const complaintHtml = generateCriminalComplaintHtml({
                customerName,
                customerNationality: customer?.nationality || '',
                customerId: customer?.national_id || '-',
                customerMobile: customer?.phone || customer?.mobile || '',
                contractDate: contract?.start_date
                  ? new Date(contract.start_date).toLocaleDateString('ar-QA')
                  : '-',
                contractEndDate: contract?.end_date
                  ? new Date(contract.end_date).toLocaleDateString('ar-QA')
                  : '-',
                vehicleType: vehicle
                  ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
                  : '-',
                plateNumber: vehicle?.plate_number || '-',
                plateType: 'خصوصي',
                manufactureYear: vehicle?.year?.toString() || '',
                chassisNumber: vehicle?.vin || '',
              });
              setCriminalComplaintHtmlContent(complaintHtml);
              setCriminalComplaintUrl('generated');
              console.log('[SEND REPORT] Criminal complaint HTML generated, length:', complaintHtml.length);
            }
          }
        }}
        contractId={contractId}
        contractNumber={contract?.contract_number}
        customerName={customerFullName}
        customerPhone={customer?.phone || customer?.mobile || ''}
        customerNationalId={customer?.national_id || ''}
        vehiclePlate={vehicle?.plate_number || (contract as any)?.license_plate}
        criminalComplaintHtml={criminalComplaintHtmlContent}
        violationsTransferHtml={violationsTransferHtmlContent}
      />
    </div>
  );
}
