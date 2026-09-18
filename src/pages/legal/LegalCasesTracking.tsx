import { LegalCalendar } from '@/components/legal/workspace/LegalCalendar';
import { legalCaseCsv, downloadLegalCases } from '@/components/legal/workspace/legalCaseExport';
import { legalCaseTypeLabel, legalCaseStatusLabel } from '@/components/legal/workspace/legalLabels';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLegalCases, useLegalCaseStats, useUpdateLegalCase, LegalCase } from '@/hooks/useLegalCases';
import { JudgmentSettlementsView } from '@/components/legal/JudgmentSettlementsView';
import { LegalCaseWorkflowPanel } from '@/components/legal/LegalCaseWorkflowPanel';
import { useLegalDocuments, useCreateLegalDocument, useDeleteLegalDocument, useDownloadLegalDocument } from '@/hooks/useLegalDocuments';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { sendWhatsAppMessage } from '@/utils/whatsappWebSender';
import { 
  Scale, 
  Search, 
  Plus, 
  FileText, 
  AlertCircle,
  DollarSign,
  Clock,
  Users,
  Zap,
  LayoutDashboard,
  Folder,
  Settings,
  Download,
  Filter,
  CalendarDays,
  Car,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Printer,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  PlayCircle,
  XCircle,
  Upload,
  File,
  Image,
  MessageSquare,
  Send,
  X,
  FileIcon,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import LegalCaseCreationWizard from '@/components/legal/LegalCaseCreationWizard';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import EnhancedLegalNoticeGenerator from '@/components/legal/EnhancedLegalNoticeGenerator';
import { StatusBadge, TabButton } from './legal-cases';
import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
import { LegalDashboard } from '@/components/legal/workspace/LegalDashboard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { decodeDisplayText, decodeLegalTaskTitle } from '@/utils/arabicDisplayText';
import '@/styles/legal-system.css';
// DelinquentCustomersTab removed - use /legal/delinquency instead

const getLegalCaseTitle = (legalCase?: { case_title_ar?: string | null; case_title?: string | null } | null) =>
  decodeDisplayText(legalCase?.case_title_ar || legalCase?.case_title) || 'بدون عنوان';

const getLegalCaseCustomerName = (legalCase?: LegalCase | null) => {
  if (!legalCase) return 'غير محدد';

  const customer = legalCase.contract?.customer;
  if (customer) {
    return formatCustomerName(customer, {
      preferArabic: true,
      fallbackName: legalCase.client_name,
    });
  }

  return legalCase.client_name || 'غير محدد';
};

type CancelLegalCasesResult = {
  cancelled_cases?: number;
  already_terminal_cases?: number;
};

const TERMINAL_LEGAL_CASE_STATUSES = new Set(['closed', 'cancelled', 'canceled']);
const TERMINAL_LEGAL_WORKFLOW_STAGES = new Set(['closed', 'cancelled']);

const isCancellableLegalCase = (legalCase: LegalCase) =>
  !TERMINAL_LEGAL_CASE_STATUSES.has((legalCase.case_status || '').toLowerCase())
  && !TERMINAL_LEGAL_WORKFLOW_STAGES.has((legalCase.workflow_stage || '').toLowerCase());

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

// --- Main Component ---
export const LegalCasesTracking: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('view') || 'dashboard';
  const setActiveTab = (tab: string) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.set('view', tab);
    return next;
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('current');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  
  // Case details and editing states
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<LegalCase | null>(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState<LegalCase | null>(null);
  const [editFormData, setEditFormData] = useState({
    case_title: '',
    case_type: '',
    case_status: '',
    priority: '',
    description: '',
    case_value: 0,
    court_name: '',
    case_reference: '',
    judge_name: '',
    filing_date: '',
    hearing_date: '',
    notes: '',
    outcome_type: '' as LegalCase['outcome_type'] | '',
    outcome_amount: 0,
    outcome_date: '',
    outcome_notes: '',
  });

  // Document upload states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    document_title: '',
    document_type: 'court_document',
    description: '',
    is_confidential: false,
    is_original: true,
    access_level: 'company',
  });

  // Close case dialog states
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [caseToClose, setCaseToClose] = useState<LegalCase | null>(null);
  const [closeFormData, setCloseFormData] = useState({
    case_direction: 'filed_by_us' as 'filed_by_us' | 'filed_against_us',
    outcome_type: 'won' as 'won' | 'lost' | 'settled' | 'dismissed',
    outcome_amount: 0,
    outcome_amount_type: 'compensation' as 'fine' | 'compensation' | 'settlement' | 'court_fees' | 'other',
    payment_direction: 'receive' as 'receive' | 'pay',
    outcome_date: new Date().toISOString().split('T')[0],
    outcome_notes: '',
    create_journal_entry: false,
    debit_account_id: '',
    credit_account_id: '',
  });

  const { companyId, isAuthenticating, isInitializing } = useUnifiedCompanyAccess();
  const { data: selectedCasePenalties = [] } = useQuery({
    queryKey: ['legal-case-unpaid-penalties', selectedCase?.id, selectedCase?.contract_id, selectedCase?.client_id],
    queryFn: async () => {
      if (!companyId || (!selectedCase?.contract_id && !selectedCase?.client_id)) return [];
      let query = supabase
        .from('penalties')
        .select('id, penalty_number, amount, payment_status, case_follow_up, case_follow_up_at')
        .eq('company_id', companyId)
        .or('payment_status.is.null,payment_status.not.in.(paid,completed)');
      query = selectedCase.contract_id
        ? query.eq('contract_id', selectedCase.contract_id)
        : query.eq('customer_id', selectedCase.client_id!);
      const { data, error } = await query.order('penalty_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(showCaseDetails && companyId && selectedCase && (selectedCase.contract_id || selectedCase.client_id)),
  });
  const isLoadingCompany = isAuthenticating || isInitializing;
  const { user } = useAuth();
  
  // Preserve the legal audit trail by cancelling cases instead of deleting them.
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await supabase.rpc('cancel_legal_cases_v1', {
        p_actor_id: user?.id,
        p_case_ids: [caseId],
        p_company_id: companyId,
        p_reason: 'Cancelled from legal case tracking',
      });
      if (error) throw error;
      return (data || {}) as CancelLegalCasesResult;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['legal-cases'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['legal-case-stats'], type: 'active' }),
      ]);
      if ((result.cancelled_cases || 0) > 0) {
        toast.success('تم إلغاء القضية مع الاحتفاظ بسجلها');
      } else {
        toast.info('القضية مغلقة أو ملغاة بالفعل، ولم يتم تغيير سجلها');
      }
      setShowDeleteDialog(false);
      setCaseToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`فشل في إلغاء القضية: ${error.message}`);
    },
  });

  const bulkDeleteCasesMutation = useMutation({
    mutationFn: async (caseIds: string[]): Promise<CancelLegalCasesResult> => {
      if (caseIds.length === 0) return { cancelled_cases: 0, already_terminal_cases: 0 };
      if (!companyId) throw new Error('تعذر تحديد الشركة');

      const { data, error } = await supabase.rpc('cancel_legal_cases_v1', {
        p_actor_id: user?.id,
        p_case_ids: caseIds,
        p_company_id: companyId,
        p_reason: 'Bulk cancellation from legal case tracking',
      });

      if (error) throw error;
      return (data || {}) as CancelLegalCasesResult;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['legal-cases'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['legal-case-stats'], type: 'active' }),
      ]);
      const cancelledCount = result.cancelled_cases || 0;
      const terminalCount = result.already_terminal_cases || 0;
      if (cancelledCount > 0) {
        toast.success(`تم إلغاء ${cancelledCount} قضية مع الاحتفاظ بسجلاتها`);
      }
      if (terminalCount > 0) {
        toast.info(`تم تجاوز ${terminalCount} قضية لأنها مغلقة أو ملغاة بالفعل`);
      }
      setSelectedCaseIds([]);
      setShowBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(`فشل إلغاء القضايا المحددة: ${error.message}`);
    },
  });

  // Update case mutation
  const updateCaseMutation = useUpdateLegalCase();

  // Document mutations
  const createDocumentMutation = useCreateLegalDocument();
  const deleteDocumentMutation = useDeleteLegalDocument();
  const downloadDocumentMutation = useDownloadLegalDocument();

  // Fetch documents for selected case
  const { data: caseDocuments, isLoading: isLoadingDocuments } = useLegalDocuments(
    selectedCase ? { case_id: selectedCase.id } : undefined,
    !!selectedCase
  );

  // Handlers for case actions
  const handleViewDetails = useCallback((legalCase: LegalCase) => {
    setSelectedCase(legalCase);
    setShowCaseDetails(true);
  }, []);

  const handleViewCaseDetailsById = useCallback(async (caseId: string) => {
    if (!companyId) {
      toast.error('تعذر تحديد الشركة');
      return;
    }

    const { data, error } = await supabase
      .from('legal_cases')
      .select('*')
      .eq('id', caseId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error || !data) {
      toast.error('تعذر تحميل تفاصيل القضية');
      return;
    }

    handleViewDetails(data as LegalCase);
  }, [companyId, handleViewDetails]);

  const handleEditCase = useCallback((legalCase: LegalCase) => {
    setCaseToEdit(legalCase);
    setEditFormData({
      case_title: legalCase.case_title || '',
      case_type: legalCase.case_type || '',
      case_status: legalCase.case_status || '',
      priority: legalCase.priority || '',
      description: legalCase.description || '',
      case_value: legalCase.case_value || 0,
      court_name: legalCase.court_name || '',
      case_reference: legalCase.case_reference || '',
      judge_name: legalCase.judge_name || '',
      filing_date: legalCase.filing_date?.slice(0, 10) || '',
      hearing_date: toDateTimeLocalValue(legalCase.hearing_date),
      notes: legalCase.notes || '',
      outcome_type: legalCase.outcome_type || '',
      outcome_amount: legalCase.outcome_amount || 0,
      outcome_date: legalCase.outcome_date?.slice(0, 10) || '',
      outcome_notes: legalCase.outcome_notes || '',
    });
    setShowEditDialog(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!caseToEdit) return;
    
    try {
      const updatedCase = await updateCaseMutation.mutateAsync({
        id: caseToEdit.id,
        data: {
          case_title: editFormData.case_title,
          case_type: editFormData.case_type,
          priority: editFormData.priority,
          description: editFormData.description || null,
          case_value: editFormData.case_value,
          court_name: editFormData.court_name || null,
          case_reference: editFormData.case_reference || null,
          judge_name: editFormData.judge_name || null,
          filing_date: editFormData.filing_date || null,
          hearing_date: editFormData.hearing_date
            ? new Date(editFormData.hearing_date).toISOString()
            : null,
          notes: editFormData.notes || null,
          outcome_type: editFormData.outcome_type || null,
          outcome_amount: editFormData.outcome_amount,
          outcome_date: editFormData.outcome_date || null,
          outcome_notes: editFormData.outcome_notes || null,
        },
      });
      setSelectedCase(updatedCase as LegalCase);
      toast.success('تم تحديث القضية بنجاح');
      setShowEditDialog(false);
      setCaseToEdit(null);
    } catch (error: any) {
      toast.error(`فشل في تحديث القضية: ${error.message}`);
    }
  }, [caseToEdit, editFormData, updateCaseMutation]);

  // Document handlers
  const handleOpenUploadDialog = useCallback((caseId: string) => {
    setUploadCaseId(caseId);
    setUploadFile(null);
    setUploadFormData({
      document_title: '',
      document_type: 'court_document',
      description: '',
      is_confidential: false,
      is_original: true,
      access_level: 'company',
    });
    setShowUploadDialog(true);
  }, []);

  const handleOpenJudgmentUploadDialog = useCallback((caseId: string, caseNumber?: string) => {
    setUploadCaseId(caseId);
    setUploadFile(null);
    setUploadFormData({
      document_title: caseNumber ? `نسخة الحكم - ${caseNumber}` : 'نسخة الحكم',
      document_type: 'court_judgment',
      description: 'نسخة من حكم المحكمة مرفوعة من تبويب التحصيل القانوني',
      is_confidential: false,
      is_original: true,
      access_level: 'company',
    });
    setShowUploadDialog(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-fill title from filename if empty
      if (!uploadFormData.document_title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadFormData(prev => ({ ...prev, document_title: nameWithoutExt }));
      }
    }
  }, [uploadFormData.document_title]);

  const handleUploadDocument = useCallback(async () => {
    if (!uploadCaseId || !uploadFile) {
      toast.error('يرجى اختيار ملف');
      return;
    }
    if (!uploadFormData.document_title) {
      toast.error('يرجى إدخال عنوان المستند');
      return;
    }

    try {
      await createDocumentMutation.mutateAsync({
        case_id: uploadCaseId,
        document_title: uploadFormData.document_title,
        document_type: uploadFormData.document_type,
        description: uploadFormData.description,
        is_confidential: uploadFormData.is_confidential,
        is_original: uploadFormData.is_original,
        access_level: uploadFormData.access_level,
        file: uploadFile,
      });
      
      // إعادة تعيين الحالة بعد النجاح
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadFormData({
        document_title: '',
        document_type: 'court_document',
        description: '',
        is_confidential: false,
        is_original: true,
        access_level: 'company',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('فشل في رفع الملف: ' + (error.message || 'خطأ غير معروف'));
    }
  }, [uploadCaseId, uploadFile, uploadFormData, createDocumentMutation]);

  const handleDownloadDocument = useCallback((documentId: string) => {
    downloadDocumentMutation.mutate(documentId);
  }, [downloadDocumentMutation]);

  const handleDeleteDocument = useCallback((documentId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      deleteDocumentMutation.mutate(documentId);
    }
  }, [deleteDocumentMutation]);

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileIcon className="w-5 h-5 text-slate-400" />;
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteCase = useCallback((legalCase: LegalCase) => {
    setCaseToDelete(legalCase);
    setShowDeleteDialog(true);
  }, []);

  const handleSendCaseNotification = useCallback(async (legalCase: LegalCase) => {
    try {
      if (!legalCase.contract_id || !companyId) {
        toast.error('لا يوجد عقد مرتبط بهذه القضية');
        return;
      }
      // Get customer phone from contract
      const { data: contract } = await supabase
        .from('contracts')
        .select('customers(phone, first_name, last_name, first_name_ar, last_name_ar)')
        .eq('id', legalCase.contract_id)
        .eq('company_id', companyId)
        .single();

      const customerPhone = contract?.customers?.phone;
      if (!customerPhone) {
        toast.error('رقم هاتف العميل غير متوفر');
        return;
      }

      const customerName = contract?.customers?.first_name_ar && contract?.customers?.last_name_ar
        ? `${contract.customers.first_name_ar} ${contract.customers.last_name_ar}`
        : `${contract.customers?.first_name || ''} ${contract.customers?.last_name || ''}`.trim();

      // Generate message
      const message = `
━━━━━━━━━━━━━━━━━━━
⚖️ *إشعار قانوني مهم*
━━━━━━━━━━━━━━━━━━━

السيد/السيدة *${customerName}* المحترم/ة،

نود إعلامكم بأنه تم فتح قضية مدنية ضدكم لدى محكمة الاستثمار:

📋 *رقم القضية:* ${legalCase.case_number}
💰 *قيمة المطالبات:* ${(legalCase.case_value || 0).toLocaleString('en-US')} ر.ق
📅 *تاريخ الرفع:* ${legalCase.filing_date ? new Date(legalCase.filing_date).toLocaleDateString('ar-QA') : 'قيد التحديد'}

⚠️ *مهم جداً:*
يرجى مراجعة مكتب الشركة في أقرب وقت ممكن قبل اعتماد القضية وتحديد موعد الجلسة من قبل المحكمة.

🔴 *تنبيه:*
عند تحديد موعد الجلسة ودفع رسوم المحكمة، لن يتم التنازل عن القضية.

📞 *للتواصل:*
يرجى الاتصال بنا فوراً لتسوية الأمر ودياً.

━━━━━━━━━━━━━━━━━━━
🏢 *شركة العراف لتأجير السيارات*
      `.trim();

      // Send WhatsApp message using the same method as verification page
      await sendWhatsAppMessage({
        phone: customerPhone,
        message,
        customerName,
        companyId,
        purpose: 'legal_case_notice',
        entityType: 'legal_case',
        entityId: legalCase.id,
      });
      
      toast.success('تم إرسال الإشعار للعميل عبر واتساب');
    } catch (error) {
      console.error('Error sending case notification:', error);
      toast.error('فشل إرسال الإشعار. يرجى المحاولة مرة أخرى');
    }
  }, [companyId]);

  const confirmDelete = useCallback(() => {
    if (caseToDelete) {
      deleteCaseMutation.mutate(caseToDelete.id);
    }
  }, [caseToDelete, deleteCaseMutation]);

  // Close case handlers
  const handleOpenCloseDialog = useCallback((legalCase: LegalCase) => {
    setCaseToClose(legalCase);
    setCloseFormData({
      case_direction: legalCase.case_direction || 'filed_by_us',
      outcome_type: 'won',
      outcome_amount: legalCase.case_value || 0,
      outcome_amount_type: 'compensation',
      payment_direction: legalCase.case_direction === 'filed_against_us' ? 'pay' : 'receive',
      outcome_date: new Date().toISOString().split('T')[0],
      outcome_notes: '',
      create_journal_entry: false,
      debit_account_id: '',
      credit_account_id: '',
    });
    setShowCloseDialog(true);
  }, []);

  const handleCloseCaseLegacy = useCallback(async () => {
    if (!caseToClose || !companyId || !user?.id) return;

    try {
      let journalEntryId: string | null = caseToClose.outcome_journal_entry_id || null;

      if (journalEntryId) {
        const { data: existingEntry, error: existingEntryError } = await supabase
          .from('journal_entries')
          .select('id, status')
          .eq('id', journalEntryId)
          .eq('company_id', companyId)
          .single();
        if (existingEntryError) throw existingEntryError;
        if (existingEntry.status !== 'posted') {
          throw new Error('قيد نتيجة القضية موجود لكنه غير مرحل ويحتاج إلى مراجعة');
        }
      }

      // إنشاء قيد محاسبي إذا طُلب ذلك والمبلغ أكبر من صفر
      if (closeFormData.create_journal_entry && closeFormData.outcome_amount > 0 && !journalEntryId) {
        // تحديد الحسابات بناءً على اتجاه الدفع
        const isPayment = closeFormData.payment_direction === 'pay';
        
        const requiredAccountCodes = isPayment ? ['53101', '11151'] : ['11151', '44100'];
        const { data: postingAccounts, error: accountsError } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .eq('is_header', false)
          .in('account_code', requiredAccountCodes);

        if (accountsError) throw accountsError;
        const accountByCode = new Map(
          (postingAccounts || []).map(account => [account.account_code, account.id])
        );
        const bankAccountId = accountByCode.get('11151');
        const expenseAccountId = accountByCode.get('53101');
        const revenueAccountId = accountByCode.get('44100');
        const debitAccountId = isPayment ? expenseAccountId : bankAccountId;
        const creditAccountId = isPayment ? bankAccountId : revenueAccountId;
        if (!debitAccountId || !creditAccountId) {
          throw new Error(`الحسابات المحاسبية المطلوبة غير مكتملة: ${requiredAccountCodes.join('، ')}`);
        }
        
        // إنشاء القيد المحاسبي
        const entryNumber = `JE-LEGAL-${Date.now()}`;
        const { data: journalEntry, error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: companyId,
            entry_number: entryNumber,
            entry_date: closeFormData.outcome_date,
            description: `قيد ${isPayment ? 'مصروف' : 'إيراد'} نتيجة القضية ${caseToClose.case_number}`,
            total_debit: closeFormData.outcome_amount,
            total_credit: closeFormData.outcome_amount,
            status: 'draft',
            reference_type: 'legal_case',
            reference_id: caseToClose.id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (journalError) {
          console.error('Error creating journal entry:', journalError);
          toast.error('فشل في إنشاء القيد المحاسبي');
          return;
        }

        journalEntryId = journalEntry?.id || null;

        // إضافة سطور القيد المحاسبي
        if (journalEntryId) {
          const journalLines = isPayment ? [
            // قيد مصروف: مدين المصروفات، دائن البنك
            {
              journal_entry_id: journalEntryId,
              account_id: debitAccountId,
              line_description: `غرامة/تعويض - القضية ${caseToClose.case_number}`,
              debit_amount: closeFormData.outcome_amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: journalEntryId,
              account_id: creditAccountId,
              line_description: `سداد غرامة - القضية ${caseToClose.case_number}`,
              debit_amount: 0,
              credit_amount: closeFormData.outcome_amount,
              line_number: 2,
            },
          ] : [
            // قيد إيراد: مدين البنك، دائن الإيرادات
            {
              journal_entry_id: journalEntryId,
              account_id: debitAccountId,
              line_description: `استلام تعويض - القضية ${caseToClose.case_number}`,
              debit_amount: closeFormData.outcome_amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: journalEntryId,
              account_id: creditAccountId,
              line_description: `تعويض قضائي - القضية ${caseToClose.case_number}`,
              debit_amount: 0,
              credit_amount: closeFormData.outcome_amount,
              line_number: 2,
            },
          ];

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(journalLines);

          if (linesError) {
            console.error('Error creating journal entry lines:', linesError);
            // حذف القيد إذا فشل إنشاء السطور
            await supabase.from('journal_entries').delete().eq('id', journalEntryId).eq('company_id', companyId).eq('status', 'draft');
            toast.error('فشل في إنشاء سطور القيد المحاسبي');
            return;
          }

          const { error: caseLinkError } = await supabase
            .from('legal_cases')
            .update({ outcome_journal_entry_id: journalEntryId, updated_at: new Date().toISOString() })
            .eq('id', caseToClose.id)
            .eq('company_id', companyId)
            .is('outcome_journal_entry_id', null)
            .select('id')
            .single();

          if (caseLinkError) {
            await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', journalEntryId);
            await supabase.from('journal_entries').delete().eq('id', journalEntryId).eq('company_id', companyId).eq('status', 'draft');
            throw caseLinkError;
          }

          const { error: postError } = await supabase
            .from('journal_entries')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              posted_by: user.id,
            })
            .eq('id', journalEntryId)
            .eq('company_id', companyId)
            .eq('status', 'draft')
            .select('id')
            .single();

          if (postError) {
            await supabase
              .from('legal_cases')
              .update({ outcome_journal_entry_id: null })
              .eq('id', caseToClose.id)
              .eq('company_id', companyId)
              .eq('outcome_journal_entry_id', journalEntryId);
            await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', journalEntryId);
            await supabase.from('journal_entries').delete().eq('id', journalEntryId).eq('company_id', companyId).eq('status', 'draft');
            throw postError;
          }

          toast.success('تم إنشاء القيد المحاسبي بنجاح');
        }
      }

      // تحديث القضية
      let caseUpdate = supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          case_direction: closeFormData.case_direction,
          outcome_type: closeFormData.outcome_type,
          outcome_amount: closeFormData.outcome_amount,
          outcome_amount_type: closeFormData.outcome_amount_type,
          payment_direction: closeFormData.payment_direction,
          outcome_date: closeFormData.outcome_date,
          outcome_notes: closeFormData.outcome_notes,
          outcome_journal_entry_id: journalEntryId,
          outcome_payment_status: closeFormData.outcome_amount > 0 ? 'pending' : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseToClose.id)
        .eq('company_id', companyId);

      if (journalEntryId) {
        caseUpdate = caseUpdate.eq('outcome_journal_entry_id', journalEntryId);
      }

      const { error: updateError } = await caseUpdate.select('id').single();

      if (updateError) {
        console.error('Error updating case:', updateError);
        toast.error('فشل في إغلاق القضية');
        return;
      }

      // إنشاء سجل نشاط
      await supabase.from('legal_case_activities').insert({
        case_id: caseToClose.id,
        company_id: companyId,
        activity_type: 'case_closed',
        activity_title: 'تم إغلاق القضية',
        activity_description: `تم إغلاق القضية بنتيجة: ${
          closeFormData.outcome_type === 'won' ? 'ربح' :
          closeFormData.outcome_type === 'lost' ? 'خسارة' :
          closeFormData.outcome_type === 'settled' ? 'تسوية' : 'رفض'
        } - المبلغ: ${closeFormData.outcome_amount} ر.ق`,
        created_by: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      
      toast.success('تم إغلاق القضية بنجاح');
      setShowCloseDialog(false);
      setCaseToClose(null);
    } catch (error: any) {
      console.error('Error closing case:', error);
      toast.error(`فشل في إغلاق القضية: ${error.message}`);
    }
  }, [caseToClose, closeFormData, companyId, user?.id, queryClient]);

  void handleCloseCaseLegacy;
  const handleCloseCase = useCallback(async () => {
    if (!caseToClose || !companyId || !user?.id) return;
    try {
      const { error } = await supabase.rpc('close_legal_case_outcome_v1', {
        p_company_id: companyId,
        p_case_id: caseToClose.id,
        p_case_direction: closeFormData.case_direction,
        p_outcome_type: closeFormData.outcome_type,
        p_outcome_amount: Number(closeFormData.outcome_amount || 0),
        p_outcome_amount_type: closeFormData.outcome_amount_type,
        p_payment_direction: closeFormData.payment_direction,
        p_outcome_date: closeFormData.outcome_date,
        p_outcome_notes: closeFormData.outcome_notes || '',
        p_actor_id: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      toast.success('تم إغلاق القضية دون تسجيل حركة نقدية قبل الدفع الفعلي');
      setShowCloseDialog(false);
      setCaseToClose(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في إغلاق القضية');
    }
  }, [caseToClose, closeFormData, companyId, user?.id, queryClient]);

  const { data: casesResponse, isLoading, error } = useLegalCases(
    {
      contract_id: searchParams.get('contract_id') || undefined,
      case_status: !['all', 'current'].includes(statusFilter) ? statusFilter : undefined,
      exclude_cancelled: statusFilter === 'current',
      case_type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
      page: activeTab === 'cases' ? currentPage : 1,
      pageSize: activeTab === 'cases' ? pageSize : 1000,
    }
  );

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useLegalCaseStats();

  const cases = casesResponse?.data || [];
  const totalCases = casesResponse?.count || 0;
  const totalPages = Math.ceil(totalCases / pageSize);
  const cancellableVisibleCaseIds = useMemo(
    () => cases.filter(isCancellableLegalCase).map((legalCase) => legalCase.id),
    [cases]
  );
  const selectedCancellableCaseIds = useMemo(
    () => selectedCaseIds.filter((caseId) => cancellableVisibleCaseIds.includes(caseId)),
    [cancellableVisibleCaseIds, selectedCaseIds]
  );
  const allVisibleCasesSelected = cancellableVisibleCaseIds.length > 0
    && cancellableVisibleCaseIds.every((caseId) => selectedCaseIds.includes(caseId));

  useEffect(() => {
    setSelectedCaseIds([]);
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const handleToggleCaseSelection = useCallback((caseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(caseId)
        ? prev.filter((selectedId) => selectedId !== caseId)
        : [...prev, caseId]
    );
  }, []);

  const handleToggleAllVisibleCases = useCallback(() => {
    setSelectedCaseIds((prev) => {
      if (allVisibleCasesSelected) {
        return prev.filter((caseId) => !cancellableVisibleCaseIds.includes(caseId));
      }

      const next = new Set(prev);
      cancellableVisibleCaseIds.forEach((caseId) => next.add(caseId));
      return Array.from(next);
    });
  }, [allVisibleCasesSelected, cancellableVisibleCaseIds]);

  const confirmBulkDelete = useCallback(() => {
    if (selectedCancellableCaseIds.length === 0) return;
    bulkDeleteCasesMutation.mutate([...selectedCancellableCaseIds]);
  }, [bulkDeleteCasesMutation, selectedCancellableCaseIds]);

  // Generate upcoming hearings from real hearing_date in cases
  const upcomingHearings = useMemo(() => {
    if (!cases || cases.length === 0) return [];
    const today = new Date();
    
    return cases
      .filter(c => c.hearing_date && Number.isFinite(Date.parse(c.hearing_date))) // Valid saved hearing dates only
      .map(c => {
        const hearingDate = new Date(c.hearing_date!);
        const daysUntil = differenceInCalendarDays(hearingDate, today);
        return {
          id: c.id,
          date: format(hearingDate, 'yyyy-MM-dd'),
          displayDate: format(hearingDate, 'dd MMM yyyy', { locale: ar }),
          time: c.hearing_date?.includes('T') ? hearingDate.toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' }) : 'لم يحدد الوقت',
          caseId: c.case_number,
          title: (() => {
            const caseTitle = getLegalCaseTitle(c);
            return caseTitle === 'بدون عنوان' ? 'جلسة محكمة' : caseTitle;
          })(),
          location: c.court_name || 'غير محدد',
          daysUntil,
          status: c.case_status,
          caseRef: c.case_reference,
        };
      })
      .filter(h => h.daysUntil >= -7) // Include past 7 days and future
      .sort((a, b) => a.daysUntil - b.daysUntil); // Sort by nearest date
  }, [cases]);

  const handleCaseCreated = () => {
    setShowCaseWizard(false);
    toast.success('تم إنشاء القضية بنجاح');
  };

  const getTypeLabel = legalCaseTypeLabel;

  const getOutcomeLabel = (outcome?: LegalCase['outcome_type']): string => {
    const labels: Record<string, string> = {
      pending: 'قيد الحكم',
      won: 'ربح القضية',
      lost: 'خسارة القضية',
      settled: 'تسوية',
      dismissed: 'رفض الدعوى',
      withdrawn: 'سحب الدعوى',
    };
    return outcome ? labels[outcome] || outcome : 'غير محددة';
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      civil: 'bg-blue-100 text-blue-700 border-blue-200',
      criminal: 'bg-red-100 text-red-700 border-red-200',
      commercial: 'bg-purple-100 text-purple-700 border-purple-200',
      labor: 'bg-orange-100 text-orange-700 border-orange-200',
      administrative: 'bg-slate-100 text-slate-700 border-slate-200',
      rental_dispute: 'bg-amber-100 text-amber-700 border-amber-200',
      accident: 'bg-rose-100 text-rose-700 border-rose-200',
      theft: 'bg-red-200 text-red-800 border-red-300',
      traffic_violation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      payment_default: 'bg-red-100 text-red-700 border-red-200',
      payment_collection: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      contract_breach: 'bg-pink-100 text-pink-700 border-pink-200',
      vehicle_damage: 'bg-orange-100 text-orange-700 border-orange-200',
      accident_claim: 'bg-rose-100 text-rose-700 border-rose-200',
      insurance_claim: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      other: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F8FB] dark:bg-slate-950">
        <LoadingSpinner />
      </div>
    );
  }

  // --- Dashboard View ---
  const DashboardView = () => <LegalDashboard cases={cases} totalLoadedScope={totalCases} stats={stats}
    loading={isLoading || isLoadingStats} error={Boolean(error || statsError)}
    onRetry={() => { void queryClient.invalidateQueries({ queryKey: ['legal-cases'] }); void queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] }); }}
    onOpen={handleViewDetails} customerName={getLegalCaseCustomerName} caseTitle={getLegalCaseTitle} typeLabel={getTypeLabel} />;

  // --- Cases List View ---
  const CasesListView = () => (
    <div className="legal-panel overflow-hidden animate-in fade-in duration-500">
      {searchParams.get('contract_id') && <div className="flex items-center justify-between gap-3 border-b p-4 text-sm bg-teal-50 text-teal-900">
        <span>تُعرض القضايا المرتبطة بالعقد المحدد فقط.</span>
        <Button variant="outline" onClick={() => { setCurrentPage(1); setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('contract_id'); return next; }); }}>عرض جميع القضايا</Button>
      </div>}
      <div className="flex flex-col items-center justify-between gap-4 border-b border-[#E5EAF1] p-4 md:flex-row md:p-5">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <Input
              type="text"
              aria-label="البحث في سجل القضايا"
              placeholder="ابحث برقم القضية أو العقد أو اسم العميل…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border-[#E5EAF1] bg-[#F6F8FB] py-2.5 pl-4 pr-10 text-sm focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20"
            />
          </div>
          <Button
            variant="outline"
            aria-expanded={showFilters}
            aria-controls="legal-case-filters"
            onClick={() => setShowFilters(!showFilters)}
            className="legal-action-secondary flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2.5 text-sm sm:w-auto"
          >
            <Filter size={16} />
            <span>تصفية</span>
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {cancellableVisibleCaseIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleAllVisibleCases}
              className="legal-action-secondary flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2.5 text-sm sm:w-auto"
            >
              <CheckCircle2 size={16} />
              <span>{allVisibleCasesSelected ? 'إلغاء تحديد الكل' : 'تحديد القضايا القابلة للإلغاء'}</span>
            </Button>
          )}
          {selectedCancellableCaseIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 hover:bg-red-100 sm:w-auto"
            >
              <XCircle size={16} />
              <span>إلغاء المحدد ({selectedCancellableCaseIds.length})</span>
            </Button>
          )}
          <Button variant="outline" disabled={isLoading || cases.length === 0} onClick={() => downloadLegalCases(legalCaseCsv([
            ['رقم القضية', 'عنوان القضية', 'العميل', 'النوع', 'الحالة', 'قيمة المطالبة (ر.ق)', 'المحكمة', 'موعد الجلسة'],
            ...cases.map(item => [item.case_number, getLegalCaseTitle(item), getLegalCaseCustomerName(item), getTypeLabel(item.case_type), legalCaseStatusLabel(item.case_status), item.case_value ?? '', item.court_name, item.hearing_date]),
          ]))} className="legal-action-secondary gap-2">
            <Download size={16} /><span>تصدير الصفحة الحالية</span>
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="legal-action-primary flex min-h-[44px] w-full items-center justify-center gap-2 px-5 py-2.5 text-sm sm:w-auto"
          >
            <Plus size={16} />
            <span>تسجيل قضية جديدة</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#E5EAF1]"
          >
            <div id="legal-case-filters" className="grid grid-cols-1 gap-4 bg-[#F6F8FB] p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-lg border-[#E5EAF1] bg-white">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">القضايا الجارية</SelectItem>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                  <SelectItem value="suspended">معلقة</SelectItem>
                  <SelectItem value="on_hold">قيد الانتظار</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="rounded-lg border-[#E5EAF1] bg-white">
                  <SelectValue placeholder="تصفية حسب النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="civil">مدنية</SelectItem>
                  <SelectItem value="criminal">جنائية</SelectItem>
                  <SelectItem value="commercial">تجارية</SelectItem>
                  <SelectItem value="labor">عمالية</SelectItem>
                  <SelectItem value="administrative">إدارية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCancellableCaseIds.length > 0 && (
        <div className="flex flex-col gap-3 border-b border-[#E5EAF1] bg-red-50/80 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span>تم تحديد {selectedCancellableCaseIds.length} قضية قابلة للإلغاء.</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedCaseIds([])}
              className="border-red-200 bg-white text-red-700 hover:bg-red-50"
            >
              إلغاء التحديد
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <XCircle className="ml-2 h-4 w-4" />
              إلغاء القضايا المحددة
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <Table className="w-full min-w-[600px]">
          <TableHeader>
            <TableRow className="border-b border-[#E5EAF1] bg-[#F6F8FB] text-[#64748B] hover:bg-[#F6F8FB]">
              <TableHead className="px-6 py-4 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allVisibleCasesSelected}
                  disabled={cancellableVisibleCaseIds.length === 0}
                  onChange={handleToggleAllVisibleCases}
                  aria-label="تحديد كل القضايا القابلة للإلغاء"
                  className="rounded border-[#CBD5E1] text-[#38BDF8] focus:ring-[#38BDF8]"
                />
              </TableHead>
              <TableHead className="px-6 py-4 font-medium">رقم الملف</TableHead>
              <TableHead className="px-6 py-4 font-medium">العميل</TableHead>
              <TableHead className="px-6 py-4 font-medium">نوع القضية</TableHead>
              <TableHead className="px-6 py-4 font-medium">المطالبة</TableHead>
              <TableHead className="px-6 py-4 font-medium">الحالة</TableHead>
              <TableHead className="px-6 py-4 font-medium">موعد الجلسة</TableHead>
              <TableHead className="px-6 py-4 font-medium">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5EAF1]">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : cases.length > 0 ? (
              cases.map((item) => {
                const isCancellable = isCancellableLegalCase(item as LegalCase);
                return (
                  <TableRow key={item.id} className="group transition-colors hover:bg-[#38BDF8]/5">
                  <TableCell className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.includes(item.id)}
                      disabled={!isCancellable}
                      onChange={() => handleToggleCaseSelection(item.id)}
                      aria-label={isCancellable
                        ? `تحديد القضية ${item.case_number}`
                        : `القضية ${item.case_number} مغلقة أو ملغاة`}
                      title={isCancellable ? undefined : 'لا يمكن إلغاء قضية نهائية مرة أخرى'}
                      className="rounded border-[#CBD5E1] text-[#38BDF8] focus:ring-[#38BDF8] disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-[#020617]"><button type="button" className="lw-file-link" onClick={() => handleViewDetails(item)} aria-label={`فتح القضية ${item.case_number}`}><FileText size={15} /><bdi>{item.case_number}</bdi></button></TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium text-[#020617]">{getLegalCaseCustomerName(item as LegalCase)}</div>
                    <div className="mt-0.5 text-xs text-[#94A3B8]">
                      {getLegalCaseTitle(item)}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTypeColor(item.case_type)}`}>
                      {getTypeLabel(item.case_type)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-[#020617]">
                    {item.case_value == null ? 'غير محددة' : formatCurrency(item.case_value)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={item.case_status} />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[#64748B]">
                    {item.hearing_date && Number.isFinite(Date.parse(item.hearing_date)) ? (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-[#38BDF8]" />
                        {format(new Date(item.hearing_date), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    ) : (
                      <span className="text-slate-400">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`إجراءات القضية ${item.case_number}`}
                          className="rounded-lg p-1 text-[#94A3B8] transition-colors hover:bg-[#38BDF8]/10 hover:text-[#38BDF8]"
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-lg border-[#E5EAF1]">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => handleViewDetails(item as LegalCase)}
                        >
                          <Eye size={14} />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => handleEditCase(item as LegalCase)}
                        >
                          <Edit size={14} />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-indigo-600"
                          onClick={() => handleViewDetails(item as LegalCase)}
                        >
                          <PlayCircle size={14} />
                          معالجة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-purple-600"
                          onClick={() => {
                            const caseItem = item as LegalCase;
                            if (caseItem.contract_id) {
                              navigate(`/legal/lawsuit/prepare/${caseItem.contract_id}`);
                            } else {
                              toast.error('لا يوجد عقد مرتبط بهذه القضية');
                            }
                          }}
                        >
                          <FileText size={14} />
                          صفحة تجهيز الدعوى
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-blue-600"
                          onClick={() => handleSendCaseNotification(item as LegalCase)}
                        >
                          <MessageSquare size={14} />
                          إشعار العميل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-emerald-600"
                          onClick={() => handleOpenCloseDialog(item as LegalCase)}
                        >
                          <CheckCircle2 size={14} />
                          إغلاق القضية
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-red-600 cursor-pointer"
                          onClick={() => handleDeleteCase(item as LegalCase)}
                        >
                          <XCircle size={14} />
                          إلغاء القضية
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-[#94A3B8]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#38BDF8]/10">
                      <Folder className="h-8 w-8 text-[#38BDF8]" />
                    </div>
                    <p className="font-medium text-[#64748B]">لا توجد قضايا حالياً</p>
                    <Button onClick={() => setShowCaseWizard(true)} variant="outline" className="legal-action-secondary gap-2">
                      <Plus size={16} />
                      إنشاء قضية جديدة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5EAF1] p-4 text-xs text-[#64748B]">
          <span>عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCases)} من أصل {totalCases} قضية</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="legal-action-secondary"
            >
              السابق
            </Button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "rounded-lg",
                  currentPage === page
                    ? 'border-[#38BDF8] bg-[#38BDF8] text-white shadow-none'
                    : 'border-[#E5EAF1] hover:bg-[#F6F8FB]'
                )}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="legal-action-secondary"
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Calendar View ---
  const CalendarView = () => <LegalCalendar hearings={upcomingHearings} loading={isLoading} error={Boolean(error)} loadedCount={cases.length} totalCount={totalCases} onRetry={() => { void queryClient.invalidateQueries({ queryKey: ['legal-cases'] }); }} onOpen={id => { const item = cases.find(c => c.id === id); if (item) handleViewDetails(item); }} />;

  // --- Legal Collection View ---

  // --- Settings View ---
  const SettingsView = () => {
    if (isLoadingCompany || !companyId) {
      return (
        <div className="legal-panel flex min-h-40 flex-col items-center justify-center p-6 text-center">
          <LoadingSpinner />
          <p className="mt-3 text-sm text-[#64748B]">جاري تحميل بيانات الشركة...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="legal-panel">
          <CardHeader className="border-b border-[#E5EAF1]">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-[#38BDF8]" />
              الإنشاء التلقائي للقضايا
            </CardTitle>
            <CardDescription className="text-[#64748B]">
              إعداد المحفزات التي تنشئ قضايا قانونية عند تجاوز أيام التأخير أو قيمة المديونية أو تكرار الوعود المكسورة.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <ErrorBoundary>
              <AutoCreateCaseTriggersConfig
                open={true}
                onOpenChange={() => {}}
                companyId={companyId}
                embedded={true}
              />
            </ErrorBoundary>
          </CardContent>
        </Card>

      </div>
    );
  };

  const NoticesView = () => {
    if (isLoadingCompany || !companyId) {
      return (
        <div className="legal-panel flex min-h-40 flex-col items-center justify-center p-6 text-center">
          <LoadingSpinner />
          <p className="mt-3 text-sm text-[#64748B]">جاري تحميل بيانات الشركة...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <ErrorBoundary>
          <EnhancedLegalNoticeGenerator
            companyId={companyId}
            onDocumentGenerated={() => {
              toast.success('تم إنشاء المستند بنجاح');
            }}
          />
        </ErrorBoundary>
      </div>
    );
  };

  // --- Finance View removed - use /legal/delinquency instead ---

  // --- Main Render ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'cases':
        return <CasesListView />;
      case 'calendar':
        return <CalendarView />;
      case 'collection':
        return (
          <JudgmentSettlementsView
            onViewCaseDetails={handleViewCaseDetailsById}
            onUploadCaseDocument={handleOpenJudgmentUploadDialog}
          />
        );
      case 'notices':
        return <NoticesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="legal-system w-full min-h-screen font-sans text-right pb-10" dir="rtl">
      <LegalPageHeader featured={activeTab === 'dashboard'}
        title={activeTab === 'dashboard' ? 'مركز المتابعة القانونية' : activeTab === 'cases' ? 'سجل القضايا' : activeTab === 'calendar' ? 'الجلسات والمواعيد' : activeTab === 'collection' ? 'التحصيل القانوني' : activeTab === 'notices' ? 'الإنذارات القانونية' : 'إعدادات الشؤون القانونية'}
        eyebrow="الشؤون القانونية / إدارة الملفات"
        description={{ dashboard: 'نظّم ملفات القضايا، تابع مواعيدها، وانتقل إلى الإجراء التالي بوضوح.', cases: 'ابحث في ملفات الشركة، راجع الحالة والمطالبة، ثم افتح القضية لمتابعة إجراءاتها.', calendar: 'جدول موحّد لمواعيد الجلسات القادمة والسابقة، مرتبط مباشرة بملفات القضايا.', collection: 'راجع الأحكام والمبالغ المسددة والأرصدة المتبقية، وسجّل إجراءات التسوية.', notices: 'اختر قالب الوثيقة، أكمل بيانات العميل، ثم راجع النص قبل التنزيل أو الطباعة.', settings: 'اضبط شروط إنشاء القضايا تلقائيًا وأولوية الملفات وإعدادات الإشعار.' }[activeTab] || 'إدارة ومتابعة الملفات القانونية.'}
        icon={Scale}
        actions={<>
          <Button className="lw-primary gap-2" onClick={() => setShowCaseWizard(true)}><Plus size={16} />قضية جديدة</Button>
          <Button className="lw-secondary gap-2" variant="outline" onClick={() => navigate('/legal/lawsuit-data')}><FileText size={16} />بيانات التقاضي</Button>
          <Button className="lw-secondary gap-2" variant="outline" onClick={() => setShowTriggersConfig(true)}><Zap size={16} />الإنشاء التلقائي</Button>
        </>}
      />
      <nav className="lw-case-tabs" aria-label="عروض القضايا">
        <TabButton id="dashboard" label="نظرة عامة" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="cases" label="سجل القضايا" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="calendar" label="الجلسات والمواعيد" icon={CalendarDays} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="collection" label="التحصيل القانوني" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="notices" label="الإنذارات القانونية" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
        <TabButton id="settings" label="الإعدادات" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
      </nav>

      {/* Main Content Area */}
      <div className="min-w-0">
        {renderContent()}
      </div>

      {/* Case Creation Wizard Dialog */}
      <LegalCaseCreationWizard
        open={showCaseWizard}
        onOpenChange={setShowCaseWizard}
        onSuccess={handleCaseCreated}
      />


      {/* Triggers Config Dialog */}
      {companyId && (
        <AutoCreateCaseTriggersConfig
          open={showTriggersConfig}
          onOpenChange={setShowTriggersConfig}
          companyId={companyId}
        />
      )}

      {/* Case Details Dialog */}
      <Dialog open={showCaseDetails} onOpenChange={setShowCaseDetails}>
        <DialogContent className="lw-case-details max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#E55B5B]" />
              تفاصيل القضية: {selectedCase?.case_number}
            </DialogTitle>
            <DialogDescription>
              {getLegalCaseTitle(selectedCase)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Info */}
              <div className="lw-case-facts grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">رقم القضية</p>
                  <p className="font-medium">{selectedCase.case_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">نوع القضية</p>
                  <p className="font-medium">{getTypeLabel(selectedCase.case_type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">الحالة</p>
                  <StatusBadge status={selectedCase.case_status} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">قيمة المطالبة</p>
                  <p className="font-medium text-lg text-[#E55B5B]">{formatCurrency(selectedCase.case_value || 0)}</p>
                </div>
              </div>

              {selectedCasePenalties.length > 0 && (
                <div className="border-t pt-4" dir="rtl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-semibold">المخالفات المرورية غير المسددة</h4>
                    {selectedCasePenalties.some((penalty) => penalty.case_follow_up) && (
                      <Badge className="border border-amber-300 bg-amber-100 text-amber-900">محوّلة لمتابعة القضايا</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedCasePenalties.map((penalty) => (
                      <div key={penalty.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <span>مخالفة {penalty.penalty_number || penalty.id}</span>
                        <span className="font-bold">{formatCurrency(Number(penalty.amount || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCase.outcome_type || selectedCase.outcome_date || selectedCase.outcome_notes) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    الحكم والنتيجة
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">النتيجة</p>
                      <p className="font-medium">{getOutcomeLabel(selectedCase.outcome_type)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">مبلغ الحكم</p>
                      <p className="font-medium">{formatCurrency(selectedCase.outcome_amount || 0)}</p>
                    </div>
                    {selectedCase.outcome_date && (
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500">تاريخ الحكم</p>
                        <p className="font-medium">{format(new Date(selectedCase.outcome_date), 'dd MMM yyyy', { locale: ar })}</p>
                      </div>
                    )}
                    {selectedCase.outcome_notes && (
                      <div className="col-span-2 space-y-1">
                        <p className="text-sm text-slate-500">تفاصيل الحكم</p>
                        <p className="text-sm whitespace-pre-wrap">{selectedCase.outcome_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <LegalCaseWorkflowPanel
                caseId={selectedCase.id}
                onChanged={(updatedCase) => setSelectedCase((current) => current ? { ...current, ...updatedCase } as LegalCase : current)}
              />

              {/* Client Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  معلومات العميل
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">اسم العميل</p>
                    <p className="font-medium">{getLegalCaseCustomerName(selectedCase)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">الوصف</h4>
                  <p className="text-slate-600 text-sm">{decodeDisplayText(selectedCase.description)}</p>
                </div>
              )}

              {/* Dates */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  التواريخ والمواعيد
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">موعد الجلسة القادمة</p>
                    {selectedCase.hearing_date ? (
                      <p className="font-medium text-[#E55B5B] flex items-center gap-2">
                        <Gavel className="w-4 h-4" />
                        {format(new Date(selectedCase.hearing_date), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </p>
                    ) : (
                      <p className="text-slate-400">لم يحدد بعد</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">تاريخ رفع الدعوى</p>
                    {selectedCase.filing_date ? (
                      <p className="font-medium">
                        {format(new Date(selectedCase.filing_date), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    ) : (
                      <p className="text-slate-400">غير محدد</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">تاريخ الإنشاء</p>
                    <p className="font-medium">
                      {format(new Date(selectedCase.created_at), 'dd MMM yyyy', { locale: ar })}
                    </p>
                  </div>
                  {selectedCase.court_name && (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">المحكمة</p>
                      <p className="font-medium">{selectedCase.court_name}</p>
                    </div>
                  )}
                  {selectedCase.case_reference && (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">رقم القضية في المحكمة</p>
                      <p className="font-medium">{selectedCase.case_reference}</p>
                    </div>
                  )}
                  {selectedCase.judge_name && (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">القاضي أو الدائرة</p>
                      <p className="font-medium">{selectedCase.judge_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCase.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">ملاحظات ومتابعة القضية</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{decodeDisplayText(selectedCase.notes)}</p>
                </div>
              )}

              {/* Documents Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    المستندات والملفات
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => handleOpenUploadDialog(selectedCase.id)}
                    className="bg-[#E55B5B] hover:bg-[#d64545]"
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    رفع ملف
                  </Button>
                </div>

                {isLoadingDocuments ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : caseDocuments && caseDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {caseDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <div>
                            <p className="font-medium text-sm">{doc.document_title}</p>
                            <p className="text-xs text-slate-500">
                              {doc.document_type} • {formatFileSize(doc.file_size)}
                              {doc.source === 'lawsuit_preparation' && (
                                <Badge variant="secondary" className="mr-2 text-xs">ملف تجهيز الدعوى</Badge>
                              )}
                              {doc.is_confidential && (
                                <Badge variant="destructive" className="mr-2 text-xs">سري</Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadDocument(doc.id)}
                            disabled={downloadDocumentMutation.isPending}
                           aria-label="تحميل المستند" title="تحميل المستند">
                            <Download className="w-4 h-4" />
                          </Button>
                          {doc.source !== 'lawsuit_preparation' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={deleteDocumentMutation.isPending}
                             aria-label="حذف المستند" title="حذف المستند">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Folder className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد مستندات مرفقة</p>
                    <p className="text-sm">اضغط على "رفع ملف" لإضافة مستندات</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedCase?.contract_id && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowCaseDetails(false);
                  navigate(`/legal/lawsuit/prepare/${selectedCase.contract_id}`);
                }}
              >
                <FileText className="w-4 h-4 ml-2" />
                تجهيز الدعوى
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowCaseDetails(false)}
            >
              إغلاق
            </Button>
            <Button
              onClick={() => {
                if (selectedCase) {
                  setShowCaseDetails(false);
                  handleEditCase(selectedCase);
                }
              }}
              className="bg-[#E55B5B] hover:bg-[#d64545]"
            >
              <Edit className="w-4 h-4 ml-2" />
              تحديث القضية والجلسات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) {
          // إعادة تعيين الحالة عند إغلاق الحوار
          setUploadFile(null);
      setUploadFormData({
        document_title: '',
        document_type: 'court_document',
        description: '',
        is_confidential: false,
        is_original: true,
        access_level: 'company',
      });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#E55B5B]" />
              رفع مستند جديد
            </DialogTitle>
            <DialogDescription>
              إضافة ملف أو مستند للقضية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>الملف *</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#E55B5B] transition-colors">
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(uploadFile.type)}
                    <div className="text-right">
                      <p className="font-medium text-sm">{uploadFile.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploadFile(null)}
                     aria-label="إزالة الملف المختار" title="إزالة الملف المختار">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">اضغط لاختيار ملف أو اسحب الملف هنا</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, صور (حد أقصى 10 MB)</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div className="space-y-2">
              <Label htmlFor="doc-title">عنوان المستند *</Label>
              <Input
                id="doc-title"
                value={uploadFormData.document_title}
                onChange={(e) => setUploadFormData(prev => ({ ...prev, document_title: e.target.value }))}
                placeholder="عنوان المستند"
              />
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label>نوع المستند</Label>
              <Select
                value={uploadFormData.document_type}
                onValueChange={(value) => setUploadFormData(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="court_judgment">نسخة الحكم</SelectItem>
                  <SelectItem value="court_document">مستند محكمة</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                  <SelectItem value="evidence">دليل</SelectItem>
                  <SelectItem value="correspondence">مراسلة</SelectItem>
                  <SelectItem value="legal_notice">إشعار قانوني</SelectItem>
                  <SelectItem value="id_document">وثيقة هوية</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="doc-description">الوصف (اختياري)</Label>
              <Textarea
                id="doc-description"
                value={uploadFormData.description}
                onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف المستند..."
                rows={2}
              />
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadFormData.is_confidential}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, is_confidential: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">مستند سري</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadFormData.is_original}
                  onChange={(e) => setUploadFormData(prev => ({ ...prev, is_original: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">نسخة أصلية</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUploadDocument}
              disabled={createDocumentMutation.isPending || !uploadFile}
              className="bg-[#E55B5B] hover:bg-[#d64545]"
            >
              {createDocumentMutation.isPending ? 'جاري الرفع...' : 'رفع المستند'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Case Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#E55B5B]" />
              تعديل القضية: {caseToEdit?.case_number}
            </DialogTitle>
            <DialogDescription>
              تعديل بيانات القضية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">عنوان القضية</Label>
                <Input
                  id="edit-title"
                  value={editFormData.case_title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, case_title: e.target.value }))}
                  placeholder="عنوان القضية"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">نوع القضية</Label>
                <Select
                  value={editFormData.case_type}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, case_type: value }))}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="اختر نوع القضية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_collection">تحصيل مستحقات</SelectItem>
                    <SelectItem value="contract_breach">خرق عقد</SelectItem>
                    <SelectItem value="vehicle_damage">أضرار مركبة</SelectItem>
                    <SelectItem value="accident_claim">مطالبة حادث</SelectItem>
                    <SelectItem value="insurance_claim">مطالبة تأمين</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  يتم تغيير الحالة من لوحة سير العمل داخل تفاصيل القضية لضمان حفظ السجل والمتابعات.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-priority">الأولوية</Label>
                <Select
                  value={editFormData.priority}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="اختر الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-value">قيمة المطالبة (ر.ق)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  value={editFormData.case_value}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, case_value: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-court">اسم المحكمة</Label>
                <Input
                  id="edit-court"
                  value={editFormData.court_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, court_name: e.target.value }))}
                  placeholder="اسم المحكمة"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reference">رقم القضية في المحكمة</Label>
                <Input
                  id="edit-reference"
                  value={editFormData.case_reference}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, case_reference: e.target.value }))}
                  placeholder="رقم الدعوى أو المرجع"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-judge">اسم القاضي أو الدائرة</Label>
                <Input
                  id="edit-judge"
                  value={editFormData.judge_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, judge_name: e.target.value }))}
                  placeholder="اسم القاضي أو الدائرة"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-filing-date">تاريخ رفع الدعوى</Label>
                <Input
                  id="edit-filing-date"
                  type="date"
                  value={editFormData.filing_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, filing_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-hearing-date">موعد الجلسة القادمة</Label>
                <Input
                  id="edit-hearing-date"
                  type="datetime-local"
                  value={editFormData.hearing_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, hearing_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف القضية..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">ملاحظات ومتابعة القضية</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="آخر إجراء، طلبات المحكمة، المطلوب في الجلسة القادمة..."
                rows={3}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h4 className="font-semibold">الحكم والنتيجة</h4>
                <p className="text-sm text-slate-500">يُستخدم عند صدور حكم أو تسوية، ويمكن تحديثه لاحقًا.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-outcome-type">نتيجة القضية</Label>
                  <Select
                    value={editFormData.outcome_type || 'none'}
                    onValueChange={(value) => setEditFormData(prev => ({
                      ...prev,
                      outcome_type: value === 'none' ? '' : value as LegalCase['outcome_type'],
                    }))}
                  >
                    <SelectTrigger id="edit-outcome-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">لم يصدر حكم</SelectItem>
                      <SelectItem value="pending">قيد الحكم</SelectItem>
                      <SelectItem value="won">ربح القضية</SelectItem>
                      <SelectItem value="lost">خسارة القضية</SelectItem>
                      <SelectItem value="settled">تسوية</SelectItem>
                      <SelectItem value="dismissed">رفض الدعوى</SelectItem>
                      <SelectItem value="withdrawn">سحب الدعوى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-outcome-amount">مبلغ الحكم (ر.ق)</Label>
                  <Input
                    id="edit-outcome-amount"
                    type="number"
                    min="0"
                    value={editFormData.outcome_amount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, outcome_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-outcome-date">تاريخ الحكم</Label>
                  <Input
                    id="edit-outcome-date"
                    type="date"
                    value={editFormData.outcome_date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, outcome_date: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-outcome-notes">تفاصيل ومنطوق الحكم</Label>
                  <Textarea
                    id="edit-outcome-notes"
                    value={editFormData.outcome_notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, outcome_notes: e.target.value }))}
                    placeholder="منطوق الحكم، الالتزامات، مهلة الاستئناف، وأي تفاصيل أخرى..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateCaseMutation.isPending}
              className="bg-[#E55B5B] hover:bg-[#d14d4d]"
            >
              {updateCaseMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Case Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              إغلاق القضية: {caseToClose?.case_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* الصف الأول: اتجاه القضية والنتيجة */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">اتجاه القضية</Label>
                <Select
                  value={closeFormData.case_direction}
                  onValueChange={(value: 'filed_by_us' | 'filed_against_us') => {
                    setCloseFormData(prev => ({ 
                      ...prev, 
                      case_direction: value,
                      payment_direction: value === 'filed_against_us' ? 'pay' : 'receive'
                    }));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filed_by_us">رفعناها نحن</SelectItem>
                    <SelectItem value="filed_against_us">مرفوعة ضدنا</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">النتيجة</Label>
                <Select
                  value={closeFormData.outcome_type}
                  onValueChange={(value: 'won' | 'lost' | 'settled' | 'dismissed') => 
                    setCloseFormData(prev => ({ ...prev, outcome_type: value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">ربح ✅</SelectItem>
                    <SelectItem value="lost">خسارة ❌</SelectItem>
                    <SelectItem value="settled">تسوية 🤝</SelectItem>
                    <SelectItem value="dismissed">رفض 🚫</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* الصف الثاني: المبلغ والتاريخ */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">المبلغ (ر.ق)</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={closeFormData.outcome_amount}
                  onChange={(e) => setCloseFormData(prev => ({ ...prev, outcome_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">تاريخ الحكم</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={closeFormData.outcome_date}
                  onChange={(e) => setCloseFormData(prev => ({ ...prev, outcome_date: e.target.value }))}
                />
              </div>
            </div>

            {/* الصف الثالث: نوع المبلغ واتجاه الدفع */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">نوع المبلغ</Label>
                <Select
                  value={closeFormData.outcome_amount_type}
                  onValueChange={(value: 'fine' | 'compensation' | 'settlement' | 'court_fees' | 'other') => 
                    setCloseFormData(prev => ({ ...prev, outcome_amount_type: value }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compensation">تعويض</SelectItem>
                    <SelectItem value="fine">غرامة</SelectItem>
                    <SelectItem value="settlement">تسوية</SelectItem>
                    <SelectItem value="court_fees">رسوم قضائية</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500">اتجاه الدفع</Label>
                <div className="flex gap-3 h-9 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_direction"
                      checked={closeFormData.payment_direction === 'receive'}
                      onChange={() => setCloseFormData(prev => ({ ...prev, payment_direction: 'receive' }))}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs text-green-600 font-medium">نستلم</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_direction"
                      checked={closeFormData.payment_direction === 'pay'}
                      onChange={() => setCloseFormData(prev => ({ ...prev, payment_direction: 'pay' }))}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs text-red-600 font-medium">ندفع</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ملاحظات - اختياري */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">ملاحظات (اختياري)</Label>
              <Input
                value={closeFormData.outcome_notes}
                onChange={(e) => setCloseFormData(prev => ({ ...prev, outcome_notes: e.target.value }))}
                placeholder="ملاحظات إضافية..."
                className="h-9"
              />
            </div>

            {/* The outcome is recognized as pending until an actual payment is recorded. */}
            {closeFormData.outcome_amount > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  سيُحفظ مبلغ الحكم كمستحق. يُسجل القيد والحركة النقدية عند الدفع أو الاستلام الفعلي فقط.
                </AlertDescription>
              </Alert>
            )}

            {/* ملخص مضغوط */}
            <div className="p-3 bg-slate-100 rounded-lg flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-600">
                {closeFormData.outcome_type === 'won' ? '✅ ربح' :
                 closeFormData.outcome_type === 'lost' ? '❌ خسارة' :
                 closeFormData.outcome_type === 'settled' ? '🤝 تسوية' : '🚫 رفض'}
              </span>
              <span className={`font-bold ${closeFormData.payment_direction === 'pay' ? 'text-red-600' : 'text-green-600'}`}>
                {closeFormData.payment_direction === 'pay' ? '-' : '+'}{formatCurrency(closeFormData.outcome_amount)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCloseDialog(false)}>
              إلغاء
            </Button>
            <Button 
              size="sm"
              onClick={handleCloseCase}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              إغلاق القضية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد إلغاء القضايا المحددة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من إلغاء <strong>{selectedCancellableCaseIds.length}</strong> قضية محددة؟ ستبقى محفوظة في سجل القضايا.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={bulkDeleteCasesMutation.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmBulkDelete();
              }}
              disabled={bulkDeleteCasesMutation.isPending || selectedCancellableCaseIds.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteCasesMutation.isPending ? 'جاري الإلغاء...' : `إلغاء ${selectedCancellableCaseIds.length} قضية`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد إلغاء القضية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من إلغاء القضية <strong>{caseToDelete?.case_number}</strong>؟ سيبقى سجلها محفوظًا.
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCaseMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LegalCasesTracking;
