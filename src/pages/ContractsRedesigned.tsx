import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageCustomizer } from "@/components/PageCustomizer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Filter,
  Search,
  Plus,
  FileEdit,
  Clock,
  Trash2,
  ChevronDown,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Car,
  Eye,
  Edit,
  MoreHorizontal,
  TrendingUp,
  Zap,
  Upload,
  Download,
  XOctagon,
  X,
  MessageSquare,
  FileSignature,
} from "lucide-react";

// Component imports
import { BulkInvoiceGenerationDialog } from "@/components/contracts/BulkInvoiceGenerationDialog";
import { SimpleContractWizard } from "@/components/contracts/SimpleContractWizard";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog";
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement";
import { ContractDetailsDialog } from "@/components/contracts/ContractDetailsDialog";
import { ContractInvoiceDialog } from "@/components/contracts/ContractInvoiceDialog";
import { ContractExportDialog } from "@/components/contracts/ContractExportDialog";
import { ContractCreationProgress } from "@/components/contracts/ContractCreationProgress";
import { ContractCancellationDialog } from "@/components/contracts/ContractCancellationDialog";
import { ContractDeleteDialog } from "@/components/contracts/ContractDeleteDialog";
import { UnifiedContractUpload } from "@/components/contracts/UnifiedContractUpload";
import { LateFinesSettings } from "@/components/contracts/LateFinesSettings";
import SendRemindersDialog from "@/components/contracts/SendRemindersDialog";
import { BulkDeleteContractsDialog } from "@/components/contracts/BulkDeleteContractsDialog";
import { ExpressContractForm } from "@/components/contracts";
import { ContractAmendmentForm } from "@/components/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Hook imports
import { useContractsData } from "@/hooks/useContractsData";
import { useAuth } from "@/contexts/AuthContext";
import { useContractCreation } from "@/hooks/useContractCreation";
import { useContractDrafts } from "@/hooks/useContractDrafts";
import { useToast } from "@/hooks/use-toast-mock";
import { generateShortContractNumber } from "@/utils/contractNumberGenerator";
import { formatDateInGregorian } from "@/utils/dateFormatter";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { getCurrencyConfig } from "@/utils/currencyConfig";

function ContractsRedesigned() {
  // State management
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [showExpressMode, setShowExpressMode] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | undefined>(undefined);
  const [draftIdToLoad, setDraftIdToLoad] = useState<string | undefined>(undefined);
  const [contractToEdit, setContractToEdit] = useState<any>(undefined);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCreationProgress, setShowCreationProgress] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Refs to track processed parameters
  const processedCustomerRef = useRef(false);
  const processedVehicleRef = useRef(false);

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation();
  const contractDrafts = useContractDrafts();
  const { formatCurrency: formatCurrencyAmount, currency } = useCurrencyFormatter();
  const currencyConfig = getCurrencyConfig(currency);

  // Filters - استخدام searchTerm مباشرة مثل صفحة العملاء
  const filters = useMemo(() => {
    const newFilters: any = {};
    if (searchTerm && searchTerm.trim()) {
      newFilters.search = searchTerm.trim();
    }
    if (activeTab === "active") {
      newFilters.status = "active";
    } else if (activeTab === "cancelled") {
      newFilters.status = "cancelled";
    } else if (activeTab === "alerts") {
      newFilters.status = "expiring_soon";
    }
    return newFilters;
  }, [searchTerm, activeTab]);

  const filtersWithPagination = useMemo(() => ({
    ...filters,
    page,
    pageSize,
  }), [filters, page, pageSize]);

  const { contracts, filteredContracts, isLoading, isFetching, refetch, statistics, pagination } = useContractsData(filtersWithPagination);

  const safeContracts = useMemo(() => (Array.isArray(contracts) ? contracts : []), [contracts]);
  const safeFilteredContracts = useMemo(() => (Array.isArray(filteredContracts) ? filteredContracts : []), [filteredContracts]);
  const isInitialLoading = isLoading && safeFilteredContracts.length === 0;
  const safeStatistics = useMemo(
    () => statistics || {
      activeContracts: [],
      draftContracts: [],
      underReviewContracts: [],
      cancelledContracts: [],
      totalRevenue: 0,
    },
    [statistics]
  );

  // Handle pre-selected parameters
  useEffect(() => {
    if (location.state?.selectedCustomerId && !processedCustomerRef.current) {
      setPreselectedCustomerId(location.state.selectedCustomerId || undefined);
      setShowContractWizard(true);
      processedCustomerRef.current = true;
    }
  }, [location.state]);

  useEffect(() => {
    const vehicleParam = searchParams.get("vehicle");
    if (vehicleParam && !processedVehicleRef.current) {
      setPreselectedVehicleId(vehicleParam);
      setShowContractWizard(true);
      processedVehicleRef.current = true;
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("vehicle");
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Use useEffect to handle customer parameter from URL
  useEffect(() => {
    const customerParam = searchParams.get("customer");
    if (customerParam && !processedCustomerRef.current) {
      console.log('[CONTRACTS] Processing customer parameter:', customerParam);
      processedCustomerRef.current = true;

      // Batch state updates together to prevent multiple re-renders
      unstable_batchedUpdates(() => {
        setPreselectedCustomerId(customerParam);
        setShowContractWizard(true);

        // Clear the parameter to prevent re-triggering
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete("customer");
          return newParams;
        }, { replace: true });
      });
    }
  }, [searchParams, setSearchParams]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleContractSubmit = useCallback(
    async (contractData: any): Promise<void> => {
      try {
        setShowCreationProgress(true);
        resetCreationState();
        const finalData = {
          ...contractData,
          created_by: user?.id,
          contract_date: contractData.contract_date || new Date().toISOString().split("T")[0],
          contract_number: contractData.contract_number || generateShortContractNumber(),
        };
        createContract(finalData);
      } catch (error) {
        console.error("Error in contract creation:", error);
        setShowCreationProgress(false);
        throw error;
      }
    },
    [user?.id, createContract, resetCreationState]
  );

  const handleCreationComplete = useCallback(() => {
    setShowCreationProgress(false);
    setShowContractWizard(false);
    setPreselectedCustomerId(undefined);
    refetch();
  }, [refetch]);

  const handleCreationRetry = useCallback(() => {
    retryCreation();
  }, [retryCreation]);

  const handleViewDetails = useCallback((contract: any) => {
    if (!contract?.contract_number) return;
    navigate(`/contracts/${contract.contract_number}`);
  }, [navigate]);

  const handleRenewContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowRenewalDialog(true);
  }, []);

  const handleManageStatus = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowStatusDialog(true);
  }, []);

  const handleCancelContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowCancellationDialog(true);
  }, []);

  const handleDeleteContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowDeleteDialog(true);
  }, []);

  const handleAmendContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowAmendmentForm(true);
  }, []);

  const handleLoadDraft = useCallback((draftId: string) => {
    setDraftIdToLoad(draftId);
    setShowContractWizard(true);
  }, []);

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        await new Promise((resolve, reject) => {
          contractDrafts.deleteDraft.mutate(draftId, {
            onSuccess: () => {
              toast({ title: "تم حذف المسودة", description: "تم حذف المسودة بنجاح" });
              resolve(null);
            },
            onError: reject,
          });
        });
      } catch (error) {
        toast({ title: "خطأ", description: "فشل حذف المسودة", variant: "destructive" });
      }
    },
    [contractDrafts, toast]
  );

  const formatCurrencyWithSymbol = (amount: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    const minDigits = opts?.minimumFractionDigits ?? currencyConfig.fractionDigits;
    const maxDigits = opts?.maximumFractionDigits ?? currencyConfig.fractionDigits;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
    return `${formatted} ${currencyConfig.symbol}`;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
      active: { icon: CheckCircle, label: "نشط", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
      draft: { icon: FileEdit, label: "مسودة", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
      under_review: { icon: Clock, label: "قيد المراجعة", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      cancelled: { icon: XCircle, label: "ملغي", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
      expired: { icon: XOctagon, label: "منتهي", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
      expiring_soon: { icon: AlertTriangle, label: "قارب الانتهاء", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border", config.bg, config.text, config.border)}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  // Stat card component
  const StatCard = ({ title, value, icon: Icon, color, description }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: 'emerald' | 'violet' | 'amber' | 'slate';
    description: string;
  }) => {
    const colorStyles = {
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600' },
      violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600' },
      slate: { bg: 'bg-slate-50', text: 'text-slate-600', iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600' },
    };

    const style = colorStyles[color];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-5 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/20", style.iconBg)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", style.bg, style.text)}>
            {title}
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 mb-1">{value.toLocaleString()}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </motion.div>
    );
  };

  // Helper functions
  const getCustomerName = (contract: any) => {
    if (!contract.customers) return "غير محدد";
    const customer = contract.customers;
    if (customer.customer_type === "company") {
      return customer.company_name_ar || customer.company_name || "شركة غير محددة";
    }
    return `${customer.first_name_ar || customer.first_name || ""} ${customer.last_name_ar || customer.last_name || ""}`.trim() || "عميل غير محدد";
  };

  const getVehicleInfo = (contract: any) => {
    const vehicle = contract.vehicle || contract.vehicles;
    if (!vehicle) return "غير محدد";
    const make = vehicle.make_ar || vehicle.make || "";
    const model = vehicle.model_ar || vehicle.model || "";
    const year = vehicle.year || "";
    const plate = vehicle.plate_number || "";
    const vehicleInfo = `${make} ${model} ${year}`.trim();
    if (!vehicleInfo) return "غير محدد";
    return `${vehicleInfo}${plate ? ` | ${plate}` : ""}`;
  };

  // Contract card component
  const ContractCard = ({ contract }: { contract: any }) => {
    const statusColors: Record<string, string> = {
      active: "bg-emerald-50/50 border-emerald-200/50",
      cancelled: "bg-rose-50/50 border-rose-200/50",
      expired: "bg-amber-50/50 border-amber-200/50",
      under_legal_procedure: "bg-amber-50/50 border-amber-200/50",
    };

    const iconGradients: Record<string, string> = {
      active: "bg-gradient-to-br from-teal-500 to-teal-600",
      cancelled: "bg-gradient-to-br from-rose-500 to-rose-600",
      expired: "bg-gradient-to-br from-amber-500 to-amber-600",
      under_legal_procedure: "bg-gradient-to-br from-amber-500 to-amber-600",
    };

    const cardBg = statusColors[contract.status] || "bg-white/80 border-slate-200/50";
    const iconGradient = iconGradients[contract.status] || "bg-gradient-to-br from-slate-500 to-slate-600";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-3xl border border-slate-200/50 p-5 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 cursor-pointer backdrop-blur-xl", cardBg)}
        onClick={() => handleViewDetails(contract)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className={cn("w-12 h-12 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20", iconGradient)}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">{contract.contract_number || "غير محدد"}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <User className="w-4 h-4" />
                <span>{getCustomerName(contract)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Car className="w-4 h-4" />
                <span>{getVehicleInfo(contract)}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={contract.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white/50 rounded-3xl">
          <div>
            <p className="text-xs text-slate-500 mb-1">تاريخ البداية</p>
            <p className="font-semibold text-slate-900 text-sm">{formatDateInGregorian(contract.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">تاريخ الانتهاء</p>
            <p className="font-semibold text-slate-900 text-sm">{formatDateInGregorian(contract.end_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">القيمة الشهرية</p>
            <p className="font-bold text-red-600">{formatCurrencyWithSymbol(contract.monthly_amount || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        <div className="border-t border-slate-200/50 pt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => handleViewDetails(contract)} className="bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-3xl hover:shadow-xl hover:shadow-teal-500/10">
            <Eye className="w-4 h-4 ml-2" />
            عرض
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setContractToEdit(contract);
            setShowContractWizard(true);
          }} className="bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-3xl hover:shadow-xl hover:shadow-teal-500/10">
            <Edit className="w-4 h-4 ml-2" />
            تعديل
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleRenewContract(contract)} className="bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-3xl hover:shadow-xl hover:shadow-teal-500/10">
            <RefreshCw className="w-4 h-4 ml-2" />
            تجديد
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleCancelContract(contract)} className="bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-3xl hover:shadow-xl hover:shadow-teal-500/10">
            <XCircle className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
          <Button variant="outline" size="sm" className="bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-3xl ml-auto hover:shadow-xl hover:shadow-teal-500/10">
            <MoreHorizontal className="w-4 h-4 ml-2" />
            المزيد
          </Button>
        </div>
      </motion.div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <PageCustomizer pageId="contracts-page" title="" titleAr="">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30" dir="rtl">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <FileSignature className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">إدارة العقود</h1>
                  <p className="text-sm text-slate-500">إدارة ومتابعة جميع عقود الإيجار</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setShowContractWizard(true)}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-3xl font-semibold shadow-lg shadow-teal-500/20 transition-all"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء عقد جديد
                </Button>
                <Button
                  onClick={() => setShowExpressMode(true)}
                  variant="outline"
                  className="px-4 py-2.5 rounded-3xl font-medium border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/50 transition-all hover:shadow-xl hover:shadow-teal-500/10"
                >
                  <Zap className="w-4 h-4 ml-2 text-amber-500" />
                  عقود ايجار
                </Button>
                {user?.roles?.includes('super_admin') && (
                  <Button
                    onClick={() => setShowCSVUpload(true)}
                    variant="outline"
                    className="px-4 py-2.5 rounded-3xl font-medium border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/50 transition-all hover:shadow-xl hover:shadow-teal-500/10"
                  >
                    <Upload className="w-4 h-4 ml-2 text-sky-500" />
                    <span className="hidden lg:inline">استيراد CSV</span>
                  </Button>
                )}
                <Button
                  onClick={() => setShowRemindersDialog(true)}
                  variant="outline"
                  className="px-4 py-2.5 rounded-3xl font-medium border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/50 transition-all hover:shadow-xl hover:shadow-teal-500/10"
                >
                  <MessageSquare className="w-4 h-4 ml-2 text-violet-500" />
                  <span className="hidden lg:inline">إرسال تنبيهات</span>
                </Button>
                <Button
                  onClick={() => navigate('/contracts/signed-agreements')}
                  variant="outline"
                  className="px-4 py-2.5 rounded-3xl font-medium border-slate-200/50 hover:border-green-500/30 hover:bg-green-50/50 transition-all hover:shadow-xl hover:shadow-green-500/10"
                >
                  <FileSignature className="w-4 h-4 ml-2 text-green-500" />
                  <span className="hidden lg:inline">العقود الموقعة</span>
                </Button>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                  className="px-4 py-2.5 rounded-3xl font-medium border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/50 transition-all hover:shadow-xl hover:shadow-teal-500/10"
                >
                  <Download className="w-4 h-4 ml-2 text-emerald-500" />
                  <span className="hidden lg:inline">تصدير</span>
                </Button>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="p-2.5 rounded-3xl border-slate-200/50 hover:bg-slate-50/50 transition-all hover:shadow-xl hover:shadow-teal-500/10"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("w-4 h-4 text-slate-500", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="نشط"
              value={safeStatistics.activeContracts?.length || 0}
              icon={CheckCircle}
              color="emerald"
              description="العقود النشطة"
            />
            <StatCard
              title="مسودات"
              value={safeStatistics.draftContracts?.length || 0}
              icon={FileEdit}
              color="violet"
              description="بانتظار الإكمال"
            />
            <StatCard
              title="مراجعة"
              value={safeStatistics.underReviewContracts?.length || 0}
              icon={Clock}
              color="amber"
              description="قيد المراجعة"
            />
            <StatCard
              title="ملغية"
              value={safeStatistics.cancelledContracts?.length || 0}
              icon={XCircle}
              color="slate"
              description="العقود الملغية"
            />
          </div>

          {/* Revenue Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-6 shadow-xl shadow-teal-500/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-50 text-sm font-medium mb-2">إجمالي الإيرادات الشهرية المتوقعة</p>
                <h2 className="text-4xl font-bold text-white mb-1">
                  {formatCurrencyWithSymbol(safeStatistics.totalRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </h2>
                <p className="text-teal-100 text-sm">من {safeStatistics.activeContracts?.length || 0} عقد نشط</p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Drafts Section */}
          {contractDrafts.loadDrafts.data && contractDrafts.loadDrafts.data.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-violet-500" />
                  استئناف المسودات ({contractDrafts.loadDrafts.data.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(contractDrafts.loadDrafts.data || []).map((draft) => (
                  <Card key={draft.id} className="hover:shadow-xl hover:shadow-teal-500/10 transition-all border-slate-200/50 bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{draft.draft_name || "مسودة بدون اسم"}</h4>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>آخر تحديث: {formatDateInGregorian(draft.updated_at)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleLoadDraft(draft.id)}>
                          <FileEdit className="h-4 w-4 ml-2" />
                          استئناف التحرير
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 overflow-hidden"
          >
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-500" />
                <span className="font-semibold text-slate-900">البحث والفلاتر</span>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-slate-500 transition-transform", showFilters && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 space-y-4"
                >
                  {/* Search Input - نفس أسلوب صفحة العملاء */}
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="بحث برقم العقد، اسم العميل، رقم المركبة..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="h-10 pr-10 text-sm bg-white/50 border-slate-200/50 focus:border-teal-500/50"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Search Results Count */}
                  {searchTerm && !isFetching && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">
                        {safeFilteredContracts.length > 0 ? (
                          <>تم العثور على <span className="font-semibold text-slate-900">{safeFilteredContracts.length}</span> عقد</>
                        ) : (
                          <span className="text-amber-600">لم يتم العثور على نتائج</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    className="px-4 py-2 rounded-3xl font-medium hover:bg-slate-50/50 transition-colors"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveTab("all");
                    }}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    مسح الفلاتر
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tabs & Contracts List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 overflow-hidden"
          >
            {/* Tabs */}
            <div className="border-b border-slate-200/50">
              <div className="flex gap-2 p-2 overflow-x-auto">
                {[
                  { id: "all", label: "جميع العقود" },
                  { id: "active", label: "النشطة" },
                  { id: "cancelled", label: "الملغية" },
                  { id: "alerts", label: "تنبيهات الانتهاء" },
                  { id: "settings", label: "إعدادات الغرامات" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-3xl text-sm font-medium transition-all whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20"
                        : "text-slate-600 hover:bg-slate-50/50 hover:shadow-xl hover:shadow-teal-500/10"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === "settings" ? (
                <LateFinesSettings />
              ) : (
                <div className="space-y-4">
                  {safeFilteredContracts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد عقود</h3>
                      {searchTerm ? (
                        <>
                          <p className="text-slate-500 mb-4">لم يتم العثور على نتائج للبحث: "{searchTerm}"</p>
                          <Button variant="outline" onClick={() => setSearchTerm("")}>
                            <XCircle className="w-4 h-4 ml-2" />
                            مسح البحث
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-500 mb-4">ابدأ بإنشاء عقد جديد</p>
                          <Button onClick={() => setShowContractWizard(true)} className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                            <Plus className="w-4 h-4 ml-2" />
                            إنشاء عقد جديد
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {safeFilteredContracts.map((contract) => (
                        <ContractCard key={contract.id} contract={contract} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
      <ContractRenewalDialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog} contract={selectedContract} />
      <ContractStatusManagement open={showStatusDialog} onOpenChange={setShowStatusDialog} contract={selectedContract} />
      <ContractDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        contract={selectedContract}
        onEdit={(contract) => {
          setContractToEdit(contract);
          setShowContractWizard(true);
        }}
        onCreateInvoice={(contract) => {
          setSelectedContract(contract);
          setShowInvoiceDialog(true);
        }}
        onAmendContract={handleAmendContract}
      />
      <ContractInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        contract={selectedContract}
        onSuccess={() => {
          refetch();
          setShowInvoiceDialog(false);
        }}
      />
      <ContractExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      <SimpleContractWizard
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
        onSubmit={handleContractSubmit}
        preselectedCustomerId={preselectedCustomerId}
        preselectedVehicleId={preselectedVehicleId}
        key={showContractWizard ? 'wizard-open' : 'wizard-closed'}
      />
      <ExpressContractForm open={showExpressMode} onOpenChange={setShowExpressMode} onSubmit={handleContractSubmit} />
      {selectedContract && (
        <ContractAmendmentForm
          open={showAmendmentForm}
          onOpenChange={setShowAmendmentForm}
          contract={selectedContract}
          onSuccess={() => {
            refetch();
            setShowAmendmentForm(false);
          }}
        />
      )}
      <div className={cn("fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity", showCreationProgress ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-teal-500/20 max-w-md w-full">
          <ContractCreationProgress creationState={creationState} onRetry={handleCreationRetry} onClose={handleCreationComplete} />
        </div>
      </div>
      <ContractCancellationDialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog} contract={selectedContract} />
      <ContractDeleteDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} contract={selectedContract} onSuccess={() => refetch()} />
      <UnifiedContractUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false);
          refetch();
        }}
      />
      <BulkDeleteContractsDialog open={showBulkDelete} onOpenChange={setShowBulkDelete} />
      <SendRemindersDialog
        open={showRemindersDialog}
        onOpenChange={setShowRemindersDialog}
        contracts={safeContracts as any || []}
      />
      {showTemplateManager && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <Card className="bg-white/80 backdrop-blur-xl border-slate-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>إدارة قوالب العقود</CardTitle>
                  <Button variant="outline" onClick={() => setShowTemplateManager(false)}>
                    إغلاق
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ContractTemplateManager />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageCustomizer>
  );
}

export default function ContractsRedesignedWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ContractsRedesigned />
    </ErrorBoundary>
  );
}
