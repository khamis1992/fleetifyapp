import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLegalCases, useLegalCaseStats, useUpdateLegalCase, LegalCase } from '@/hooks/useLegalCases';
import { useLegalCollectionReport, useLegalCollectionStats } from '@/hooks/useLegalCollectionReport';
import { useManualLegalCollections, ManualCollectionItem, RepaymentPlan } from '@/hooks/useManualLegalCollections';
import { ManualLegalCollectionView } from '@/components/legal/ManualLegalCollectionView';
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
  Trash2,
  Upload,
  File,
  Image,
  MessageSquare,
  Send,
  X,
  FileIcon,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, addDays, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import LegalCaseCreationWizard from '@/components/legal/LegalCaseCreationWizard';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import EnhancedLegalNoticeGenerator from '@/components/legal/EnhancedLegalNoticeGenerator';
import { CHART_COLORS, StatusBadge, TabButton, KPICard } from './legal-cases';
// DelinquentCustomersTab removed - use /legal/delinquency instead

// --- Main Component ---
export const LegalCasesTracking: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('view') || 'dashboard';
  const setActiveTab = (tab: string) => setSearchParams({ view: tab });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
    create_journal_entry: true,
    debit_account_id: '',
    credit_account_id: '',
  });

  const { companyId, isLoading: isLoadingCompany } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  
  // Delete case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase
        .from('legal_cases')
        .delete()
        .eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      toast.success('تم حذف القضية بنجاح');
      setShowDeleteDialog(false);
      setCaseToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`فشل في حذف القضية: ${error.message}`);
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
    selectedCase ? { case_id: selectedCase.id } : undefined
  );

  // Handlers for case actions
  const handleViewDetails = useCallback((legalCase: LegalCase) => {
    setSelectedCase(legalCase);
    setShowCaseDetails(true);
  }, []);

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
    });
    setShowEditDialog(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!caseToEdit) return;
    
    try {
      await updateCaseMutation.mutateAsync({
        id: caseToEdit.id,
        data: {
          case_title: editFormData.case_title,
          case_type: editFormData.case_type,
          case_status: editFormData.case_status,
          priority: editFormData.priority,
          description: editFormData.description,
          case_value: editFormData.case_value,
          court_name: editFormData.court_name,
        },
      });
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
        document_type: 'contract',
        description: '',
        is_confidential: false,
        is_original: true,
        access_level: 'private',
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
      // Get customer phone from contract
      const { data: contract } = await supabase
        .from('contracts')
        .select('customers(phone, first_name, last_name, first_name_ar, last_name_ar)')
        .eq('id', legalCase.contract_id)
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
      });
      
      toast.success('تم إرسال الإشعار للعميل عبر واتساب');
    } catch (error) {
      console.error('Error sending case notification:', error);
      toast.error('فشل إرسال الإشعار. يرجى المحاولة مرة أخرى');
    }
  }, []);

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
      create_journal_entry: true,
      debit_account_id: '',
      credit_account_id: '',
    });
    setShowCloseDialog(true);
  }, []);

  const handleCloseCase = useCallback(async () => {
    if (!caseToClose || !companyId || !user?.id) return;

    try {
      let journalEntryId: string | null = null;

      // إنشاء قيد محاسبي إذا طُلب ذلك والمبلغ أكبر من صفر
      if (closeFormData.create_journal_entry && closeFormData.outcome_amount > 0) {
        // تحديد الحسابات بناءً على اتجاه الدفع
        const isPayment = closeFormData.payment_direction === 'pay';
        
        // معرفات الحسابات
        // حساب البنك: 11151 (البنك التجاري - حساب الجاري)
        const bankAccountId = '5f0f1a61-e5dd-427b-b063-1a20e5f1582a';
        // حساب المصروفات القانونية: 53101
        const expenseAccountId = '30a2bcf0-aed7-4b64-92fc-a64c2ab19917';
        // حساب إيرادات التعويضات: 44100
        const revenueAccountId = 'b8c824ec-44cb-4470-862b-2335fa4ab6a8';
        
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
            status: 'posted',
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
              account_id: expenseAccountId,
              line_description: `غرامة/تعويض - القضية ${caseToClose.case_number}`,
              debit_amount: closeFormData.outcome_amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: journalEntryId,
              account_id: bankAccountId,
              line_description: `سداد غرامة - القضية ${caseToClose.case_number}`,
              debit_amount: 0,
              credit_amount: closeFormData.outcome_amount,
              line_number: 2,
            },
          ] : [
            // قيد إيراد: مدين البنك، دائن الإيرادات
            {
              journal_entry_id: journalEntryId,
              account_id: bankAccountId,
              line_description: `استلام تعويض - القضية ${caseToClose.case_number}`,
              debit_amount: closeFormData.outcome_amount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              journal_entry_id: journalEntryId,
              account_id: revenueAccountId,
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
            await supabase.from('journal_entries').delete().eq('id', journalEntryId);
            toast.error('فشل في إنشاء سطور القيد المحاسبي');
            return;
          }

          toast.success('تم إنشاء القيد المحاسبي بنجاح');
        }
      }

      // تحديث القضية
      const { error: updateError } = await supabase
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
        .eq('id', caseToClose.id);

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

  const { data: casesResponse, isLoading, error } = useLegalCases(
    {
      case_status: statusFilter !== 'all' ? statusFilter : undefined,
      case_type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
      page: currentPage,
      pageSize,
    }
  );

  const { data: stats, isLoading: isLoadingStats } = useLegalCaseStats();

  const cases = casesResponse?.data || [];
  const totalCases = casesResponse?.count || 0;
  const totalPages = Math.ceil(totalCases / pageSize);

  // Calculate KPI data
  const kpiData = useMemo(() => {
    const activeCases = stats?.active || 0;
    const totalValue = stats?.totalValue || 0;
    const highPriority = stats?.highPriority || 0;
    const closedCases = stats?.closed || 0;
    
    return [
      {
        title: "إجمالي المطالبات",
        value: formatCurrency(totalValue),
        subValue: "تعويضات وحوادث وإيجارات",
        change: "+12%",
        isPositive: true,
        icon: DollarSign,
        color: "bg-[#FCD34D]",
        textColor: "text-[#D97706]",
        progressColor: "bg-[#FCD34D]",
        barValue: 45,
      },
      {
        title: "القضايا النشطة",
        value: activeCases.toString(),
        subValue: `من أصل ${stats?.total || 0} قضية`,
        change: "+5%",
        isPositive: false,
        icon: Gavel,
        color: "bg-[#60A5FA]",
        textColor: "text-[#2563EB]",
        progressColor: "bg-[#60A5FA]",
        barValue: stats?.total ? (activeCases / stats.total) * 100 : 0,
      },
      {
        title: "قضايا عالية الأولوية",
        value: highPriority.toString(),
        subValue: "تحتاج متابعة فورية",
        change: "-2%",
        isPositive: true,
        icon: AlertTriangle,
        color: "bg-[#F87171]",
        textColor: "text-[#DC2626]",
        progressColor: "bg-[#F87171]",
        barValue: stats?.total ? (highPriority / stats.total) * 100 : 60,
      },
      {
        title: "القضايا المغلقة",
        value: closedCases.toString(),
        subValue: "تم حلها بنجاح",
        change: "مهم",
        isPositive: true,
        icon: CheckCircle2,
        color: "bg-[#4ADE80]",
        textColor: "text-[#16A34A]",
        progressColor: "bg-[#4ADE80]",
        barValue: stats?.total ? (closedCases / stats.total) * 100 : 80,
      },
    ];
  }, [stats]);

  // Financial data for chart - Real data from cases
  const financialData = useMemo(() => {
    if (!cases || cases.length === 0) {
      return [];
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyData: Record<number, { claimed: number; recovered: number }> = {};
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      monthlyData[monthIndex] = { claimed: 0, recovered: 0 };
    }

    // Aggregate data by month
    cases.forEach(legalCase => {
      const createdDate = new Date(legalCase.created_at);
      const monthIndex = createdDate.getMonth();
      
      // Only include if within the last 6 months
      const monthsAgo = (now.getMonth() - monthIndex + 12) % 12;
      if (monthsAgo < 6 || (now.getMonth() < monthIndex && now.getMonth() + 12 - monthIndex < 6)) {
        if (!monthlyData[monthIndex]) {
          monthlyData[monthIndex] = { claimed: 0, recovered: 0 };
        }
        
        // Add case_value to claimed
        const caseValue = parseFloat(String(legalCase.case_value || 0));
        monthlyData[monthIndex].claimed += caseValue;
        
        // If case is closed/settled/won, add to recovered
        const closedStatuses = ['closed', 'won', 'settled'];
        if (closedStatuses.includes(legalCase.case_status || '')) {
          monthlyData[monthIndex].recovered += caseValue;
        }
      }
    });

    // Convert to array format for chart
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      result.push({
        name: monthNames[monthIndex],
        claimed: monthlyData[monthIndex]?.claimed || 0,
        recovered: monthlyData[monthIndex]?.recovered || 0,
      });
    }
    
    return result;
  }, [cases]);

  // Case types data for pie chart
  const caseTypesData = useMemo(() => {
    if (!stats) return [];
    const byType = stats.byType || {};
    return [
      { name: 'قضايا مدنية', value: byType.civil || 0, color: CHART_COLORS.red },
      { name: 'قضايا تجارية', value: byType.commercial || 0, color: CHART_COLORS.blue },
      { name: 'قضايا جنائية', value: byType.criminal || 0, color: CHART_COLORS.yellow },
      { name: 'قضايا عمالية', value: byType.labor || 0, color: CHART_COLORS.green },
      { name: 'قضايا إدارية', value: byType.administrative || 0, color: CHART_COLORS.purple },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Generate upcoming hearings from real hearing_date in cases
  const upcomingHearings = useMemo(() => {
    if (!cases || cases.length === 0) return [];
    const today = new Date();
    
    return cases
      .filter(c => c.hearing_date) // Only cases with hearing dates
      .map(c => {
        const hearingDate = new Date(c.hearing_date!);
        const daysUntil = differenceInDays(hearingDate, today);
        return {
          date: format(hearingDate, 'yyyy-MM-dd'),
          displayDate: format(hearingDate, 'dd MMM yyyy', { locale: ar }),
          time: '09:00 ص',
          caseId: c.case_number,
          title: c.case_title_ar || c.case_title || 'جلسة محكمة',
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

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      civil: 'مدنية',
      criminal: 'جنائية',
      commercial: 'تجارية',
      labor: 'عمالية',
      administrative: 'إدارية',
      rental_dispute: 'نزاع إيجار',
      accident: 'حادث',
      theft: 'سرقة',
      traffic_violation: 'مخالفة مرورية',
      payment_default: 'تخلف عن سداد',
      payment_collection: 'تحصيل مستحقات',
      contract_breach: 'خرق عقد',
      vehicle_damage: 'أضرار مركبة',
      accident_claim: 'مطالبة حادث',
      insurance_claim: 'مطالبة تأمين',
      other: 'أخرى',
    };
    return labels[type] || type;
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <LoadingSpinner />
      </div>
    );
  }

  // --- Dashboard View ---
  const DashboardView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((stat, index) => (
          <KPICard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">التحليل المالي للقضايا</h3>
              <p className="text-sm text-slate-500 mt-1">التعويضات vs المطالبات</p>
            </div>
            <Badge variant="outline" className="text-xs border-slate-200/50 text-slate-600">
              آخر 6 أشهر
            </Badge>
          </div>
          <div className="h-72">
            {financialData.length > 0 && financialData.some(d => d.claimed > 0 || d.recovered > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -12px rgba(0, 0, 0, 0.15)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="claimed" name="إجمالي المطالبات" fill="#fb7185" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="recovered" name="تم تحصيله" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <DollarSign size={48} className="mb-3 opacity-50" />
                <p className="text-sm font-medium">لا توجد بيانات مالية بعد</p>
                <p className="text-xs mt-1">قم بإضافة قيم المطالبات في القضايا</p>
              </div>
            )}
          </div>
        </div>

        {/* Case Types Pie Chart */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-200/50 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
          <h3 className="text-lg font-bold text-slate-900 mb-6">أنواع القضايا</h3>
          {caseTypesData.length > 0 ? (
            <>
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={caseTypesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {caseTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'قضية']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900">{stats?.total || 0}</span>
                  <span className="text-xs text-slate-400">قضية</span>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                {caseTypesData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              إجمالي القضايا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.active || 0} نشطة • {stats?.closed || 0} مغلقة
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              عملاء متأثرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {new Set(cases.map(c => c.client_id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-slate-500 mt-1">عميل لديه قضايا</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              الجلسات القادمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {upcomingHearings.filter(h => h.daysUntil >= 0).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">جلسة محكمة قادمة</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // --- Cases List View ---
  const CasesListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="بحث برقم اللوحة، اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-100 transition-all"
          >
            <Filter size={16} />
            <span>تصفية</span>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            <span>تصدير</span>
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700 shadow-md transition-all"
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
            className="border-b border-slate-100 overflow-hidden"
          >
            <div className="p-5 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-slate-200 rounded-xl">
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                  <SelectItem value="suspended">معلقة</SelectItem>
                  <SelectItem value="on_hold">قيد الانتظار</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="border-slate-200 rounded-xl">
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

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 text-slate-500 border-b border-slate-100 hover:bg-slate-50/50">
              <TableHead className="px-6 py-4 font-medium w-10">
                <input type="checkbox" className="rounded border-slate-300 text-rose-500 focus:ring-rose-500" />
              </TableHead>
              <TableHead className="px-6 py-4 font-medium">رقم الملف</TableHead>
              <TableHead className="px-6 py-4 font-medium">العميل</TableHead>
              <TableHead className="px-6 py-4 font-medium">نوع القضية</TableHead>
              <TableHead className="px-6 py-4 font-medium">المطالبة</TableHead>
              <TableHead className="px-6 py-4 font-medium">الحالة</TableHead>
              <TableHead className="px-6 py-4 font-medium">موعد الجلسة</TableHead>
              <TableHead className="px-6 py-4 font-medium"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-50">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : cases.length > 0 ? (
              cases.map((item) => (
                <TableRow key={item.id} className="hover:bg-rose-50/30 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <input type="checkbox" className="rounded border-slate-300 text-rose-500 focus:ring-rose-500" />
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-slate-800">{item.case_number}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium text-slate-800">{item.client_name || 'غير محدد'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.case_title_ar || item.case_title}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTypeColor(item.case_type)}`}>
                      {getTypeLabel(item.case_type)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-slate-800">
                    {formatCurrency(item.case_value || item.total_costs || 0)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={item.case_status} />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-slate-500">
                    {item.hearing_date ? (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-rose-500" />
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
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
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
                          <Trash2 size={14} />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <Folder className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-500">لا توجد قضايا حالياً</p>
                    <Button onClick={() => setShowCaseWizard(true)} variant="outline" className="gap-2 border-slate-200 rounded-xl">
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
        <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCases)} من أصل {totalCases} قضية</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border-slate-200 hover:bg-slate-50"
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
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-500 shadow-md'
                    : 'border-slate-200 hover:bg-slate-50'
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
              className="rounded-lg border-slate-200 hover:bg-slate-50"
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Calendar View ---
  const CalendarView = () => {
    // Get upcoming hearings (cases with hearing dates)
    const futureHearings = upcomingHearings.filter(h => h.daysUntil >= 0);
    const pastHearings = upcomingHearings.filter(h => h.daysUntil < 0);
    const nextHearing = futureHearings[0];

    // Generate task reminders from cases with upcoming hearings
    const caseTaskReminders = useMemo(() => {
      return futureHearings.slice(0, 5).map(h => ({
        id: h.caseId,
        title: `جلسة ${h.caseId} - ${h.title}`,
        dueDate: h.displayDate,
        daysUntil: h.daysUntil,
        completed: false,
      }));
    }, [futureHearings]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/50 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-lg">جدول الجلسات</h3>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs border-slate-200/50 text-slate-600">
                {futureHearings.length} جلسة قادمة
              </Badge>
            </div>
          </div>
          <div className="space-y-4">
            {futureHearings.length > 0 ? (
              futureHearings.map((event, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4 p-4 rounded-2xl border transition-all bg-white",
                    event.daysUntil <= 3
                      ? "border-red-200 bg-red-50/50 shadow-sm"
                      : "border-slate-100 hover:border-rose-200 hover:shadow-md"
                  )}
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center rounded-xl w-16 h-16 shrink-0 shadow-sm",
                    event.daysUntil <= 3
                      ? "bg-gradient-to-br from-red-500 to-rose-600 text-white"
                      : "bg-gradient-to-br from-rose-500 to-rose-600 text-white"
                  )}>
                    <span className="text-xl font-bold">{event.date.split('-')[2]}</span>
                    <span className="text-xs font-medium">
                      {format(new Date(event.date), 'MMM', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900">{event.title}</h4>
                      <span className={cn(
                        "text-xs px-2.5 py-1 rounded-lg font-medium",
                        event.daysUntil === 0
                          ? "bg-red-100 text-red-600 font-bold"
                          : event.daysUntil <= 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      )}>
                        {event.daysUntil === 0 ? 'اليوم' : event.daysUntil === 1 ? 'غداً' : `بعد ${event.daysUntil} يوم`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-sm text-rose-600 font-semibold">{event.caseId}</span>
                      {event.caseRef && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs text-slate-500">{event.caseRef}</span>
                        </>
                      )}
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-600">{event.location}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-center rounded-xl border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                    onClick={() => {
                      const caseItem = cases.find(c => c.case_number === event.caseId);
                      if (caseItem) handleViewDetails(caseItem as LegalCase);
                    }}
                  >
                    التفاصيل
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-500">لا توجد جلسات قادمة</p>
                <p className="text-sm mt-2">قم بإضافة مواعيد الجلسات في القضايا</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Next Hearing Card */}
          {nextHearing ? (
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl p-6 shadow-lg shadow-rose-200">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-5 h-5" />
                <h3 className="font-bold text-lg">الجلسة القادمة</h3>
              </div>
              <p className="text-rose-100 text-sm mb-5">
                {nextHearing.daysUntil === 0 ? 'اليوم!' : nextHearing.daysUntil === 1 ? 'غداً' : `باقي ${nextHearing.daysUntil} يوم`}
              </p>
              <div className="bg-white/15 backdrop-blur-sm p-5 rounded-2xl mb-5 border border-white/20 shadow-inner">
                <div className="text-3xl font-bold mb-2">
                  {nextHearing.displayDate}
                </div>
                <div className="mt-2 text-base font-medium">{nextHearing.title}</div>
                <div className="mt-1 text-sm opacity-90">{nextHearing.caseId} • {nextHearing.location}</div>
              </div>
              <Button
                variant="secondary"
                className="w-full py-2.5 bg-white text-rose-600 rounded-xl font-semibold text-sm hover:bg-rose-50 transition-all shadow-md"
                onClick={() => {
                  const caseItem = cases.find(c => c.case_number === nextHearing.caseId);
                  if (caseItem) handleViewDetails(caseItem as LegalCase);
                }}
              >
                عرض تفاصيل القضية
              </Button>
            </div>
          ) : (
            <div className="bg-slate-100 text-slate-500 rounded-2xl p-6 border border-slate-200">
              <div className="text-center">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <h3 className="font-medium">لا توجد جلسات قادمة</h3>
                <p className="text-xs mt-1">أضف مواعيد الجلسات في القضايا</p>
              </div>
            </div>
          )}

          {/* Tasks Card - Linked to real case hearings */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <Clock size={16} className="text-rose-500" />
              تذكيرات المهام
            </h3>
            <div className="space-y-3">
              {caseTaskReminders.length > 0 ? (
                caseTaskReminders.map((task, i) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0",
                        task.daysUntil <= 3 ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'
                      )}
                    >
                      {task.daysUntil <= 1 && <AlertTriangle size={12} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 block truncate">{task.title}</span>
                      <span className="text-xs text-slate-400">{task.dueDate}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">
                  لا توجد تذكيرات حالياً
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:bg-slate-50 transition-all"
              onClick={() => navigate('/tasks')}
            >
              إدارة المهام
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // --- Legal Collection View ---

  // --- Settings View ---
  const SettingsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">الإنشاء التلقائي للقضايا</CardTitle>
          <CardDescription className="text-slate-500">
            إعداد المحفزات التلقائية لإنشاء قضايا قانونية عند حدوث شروط معينة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutoCreateCaseTriggersConfig
            open={true}
            onOpenChange={() => {}}
            companyId={companyId || ''}
            embedded={true}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">مولد الإنذارات القانونية</CardTitle>
          <CardDescription className="text-slate-500">
            إنشاء إنذارات قانونية احترافية تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedLegalNoticeGenerator
            companyId={companyId || ''}
            onDocumentGenerated={(document) => {
              toast.success('تم إنشاء المستند بنجاح');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

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
        return <ManualLegalCollectionView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans text-right pb-10" dir="rtl">
      {/* Sub-System Header - Enhanced Design */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-teal-600 rounded-xl blur-xl opacity-20" />
              <div className="relative bg-teal-600 p-3 rounded-xl shadow-lg">
                <Gavel className="text-white" size={24} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">الشؤون القانونية</h1>
              <p className="text-sm text-slate-500">إدارة نزاعات وحوادث تأجير السيارات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/legal/lawsuit-data')}
              variant="outline"
              size="sm"
              className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">بيانات التقاضي</span>
            </Button>
            <Button
              onClick={() => setShowTriggersConfig(true)}
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200 hover:bg-slate-50"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">الإنشاء التلقائي</span>
            </Button>
            <Button
              onClick={() => setShowCaseWizard(true)}
              size="sm"
              className="gap-2 bg-teal-600 hover:bg-teal-700 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">قضية جديدة</span>
            </Button>
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-slate-700">
                {user?.full_name || user?.email?.split('@')[0] || 'المستخدم'}
              </span>
              <span className="text-xs text-slate-400">مدير النظام</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <TabButton id="dashboard" label="نظرة عامة" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="cases" label="سجل القضايا" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="calendar" label="الجلسات والمواعيد" icon={CalendarDays} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="collection" label="التحصيل القانوني" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="settings" label="الإعدادات" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Case Creation Wizard Dialog */}
      <LegalCaseCreationWizard
        open={showCaseWizard}
        onOpenChange={setShowCaseWizard}
        onSuccess={handleCaseCreated}
      />


      {/* Triggers Config Dialog */}
      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        companyId={companyId || ''}
      />

      {/* Case Details Dialog */}
      <Dialog open={showCaseDetails} onOpenChange={setShowCaseDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#E55B5B]" />
              تفاصيل القضية: {selectedCase?.case_number}
            </DialogTitle>
            <DialogDescription>
              {selectedCase?.case_title_ar || selectedCase?.case_title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Info */}
              <div className="grid grid-cols-2 gap-4">
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
                  <p className="font-medium text-lg text-[#E55B5B]">{formatCurrency(selectedCase.total_costs)}</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  معلومات العميل
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">اسم العميل</p>
                    <p className="font-medium">{selectedCase.client_name || 'غير محدد'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">الوصف</h4>
                  <p className="text-slate-600 text-sm">{selectedCase.description}</p>
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
                        {format(new Date(selectedCase.hearing_date), 'dd MMM yyyy', { locale: ar })}
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
                </div>
              </div>

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
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
              تعديل القضية
            </Button>
            {selectedCase?.case_status !== 'closed' && (
              <Button
                onClick={() => {
                  if (selectedCase) {
                    setShowCaseDetails(false);
                    handleOpenCloseDialog(selectedCase);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                إغلاق القضية
              </Button>
            )}
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
            document_type: 'contract',
            description: '',
            is_confidential: false,
            is_original: true,
            access_level: 'private',
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
                    >
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
        <DialogContent className="max-w-2xl">
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
                <Label htmlFor="edit-status">الحالة</Label>
                <Select
                  value={editFormData.case_status}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, case_status: value }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="on_hold">قيد الانتظار</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                    <SelectItem value="won">تم الكسب</SelectItem>
                    <SelectItem value="lost">تم الخسارة</SelectItem>
                    <SelectItem value="settled">تم التسوية</SelectItem>
                  </SelectContent>
                </Select>
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

            {/* إنشاء قيد محاسبي + ملخص */}
            {closeFormData.outcome_amount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeFormData.create_journal_entry}
                    onChange={(e) => setCloseFormData(prev => ({ ...prev, create_journal_entry: e.target.checked }))}
                    className="rounded border-blue-300 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-blue-800">إنشاء قيد محاسبي تلقائياً</span>
                </label>
                {closeFormData.create_journal_entry && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    قيد {closeFormData.payment_direction === 'pay' ? 'مصروف' : 'إيراد'}: {formatCurrency(closeFormData.outcome_amount)}
                  </p>
                )}
              </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد حذف القضية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف القضية <strong>{caseToDelete?.case_number}</strong>؟
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
