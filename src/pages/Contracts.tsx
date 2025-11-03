import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageCustomizer } from "@/components/PageCustomizer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
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
  AlertCircle,
  Check,
  MessageSquare,
} from "lucide-react";

// Component imports
import { BulkInvoiceGenerationDialog } from "@/components/contracts/BulkInvoiceGenerationDialog";
import { ContractWizard } from "@/components/contracts/ContractWizard";
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
import { useAutoRenewContracts } from "@/hooks/useContractRenewal";
import { useContractCreation } from "@/hooks/useContractCreation";
import { useContractDrafts } from "@/hooks/useContractDrafts";
import { useToast } from "@/hooks/use-toast-mock";
import { generateShortContractNumber } from "@/utils/contractNumberGenerator";
import { formatDateInGregorian } from "@/utils/dateFormatter";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { getCurrencyConfig } from "@/utils/currencyConfig";

function ContractsNew() {
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
  const [filters, setFilters] = useState<any>({});
  const [searchInput, setSearchInput] = useState<string>(""); // State للبحث الفوري
  const debouncedSearch = useDebounce(searchInput, 500); // تأخير 500ms
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // تطبيق البحث المؤجل على الفلاتر
  useEffect(() => {
    setFilters((prev: any) => {
      const currentSearch = prev.search || "";
      const newSearch = debouncedSearch.trim();
      
      // إذا لم يتغير البحث، لا تحدث filters
      if (currentSearch === newSearch) {
        return prev;
      }
      
      // تحديث فقط إذا تغير البحث
      if (newSearch === "") {
        const { search, ...rest } = prev;
        return rest;
      }
      return { ...prev, search: newSearch };
    });
  }, [debouncedSearch]);
  
  // Apply tab filter to status filter
  useEffect(() => {
    setFilters((prev: any) => {
      const { status, ...rest } = prev; // احذف status أولاً
      let newStatus: string | undefined;
      
      if (activeTab === "all") {
        newStatus = undefined;
      } else if (activeTab === "active") {
        newStatus = "active";
      } else if (activeTab === "cancelled") {
        newStatus = "cancelled";
      } else if (activeTab === "alerts") {
        newStatus = "expiring_soon";
      }
      
      // إذا لم يتغير status، لا تحدث filters
      if (prev.status === newStatus) {
        return prev;
      }
      
      if (newStatus === undefined) {
        return rest; // أعد rest بدون status
      }
      return { ...rest, status: newStatus };
    });
  }, [activeTab]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const autoRenewContracts = useAutoRenewContracts();
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation();
  const contractDrafts = useContractDrafts();
  const { formatCurrency: formatCurrencyAmount, currency } = useCurrencyFormatter();
  const currencyConfig = getCurrencyConfig(currency);

  // Helper function to format currency with Arabic symbol
  const formatCurrencyWithSymbol = (amount: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    const minDigits = opts?.minimumFractionDigits ?? currencyConfig.fractionDigits;
    const maxDigits = opts?.maximumFractionDigits ?? currencyConfig.fractionDigits;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
    return `${formatted} ${currencyConfig.symbol}`;
  };

  // Data fetching with pagination
  const filtersWithPagination = useMemo(
    () => ({
      ...filters,
      page,
      pageSize,
    }),
    // استخدام القيم الفعلية بدلاً من الكائن نفسه
    [filters.search, filters.status, filters.contract_type, filters.customer_id, filters.cost_center_id, page, pageSize]
  );

  const { contracts, filteredContracts, isLoading, refetch, statistics, pagination } = useContractsData(filtersWithPagination);

  // Ensure contracts and filteredContracts are arrays
  const safeContracts = useMemo(() => (Array.isArray(contracts) ? contracts : []), [contracts]);
  const safeFilteredContracts = useMemo(() => (Array.isArray(filteredContracts) ? filteredContracts : []), [filteredContracts]);
  const safeStatistics = useMemo(
    () =>
      statistics || {
        activeContracts: [],
        draftContracts: [],
        underReviewContracts: [],
        cancelledContracts: [],
        totalRevenue: 0,
      },
    [statistics]
  );

  // Handle pre-selected customer from navigation
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      setPreselectedCustomerId(location.state.selectedCustomerId || undefined);
      setShowContractWizard(true);
    }
  }, [location.state]);

  // Handle vehicle parameter from URL query string
  useEffect(() => {
    const vehicleParam = searchParams.get("vehicle");
    if (vehicleParam) {
      setPreselectedVehicleId(vehicleParam);
      setShowContractWizard(true);
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("vehicle");
        return newParams;
      }, { replace: true });
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

  const handleViewDetails = useCallback(
    (contract: any) => {
      if (!contract?.contract_number) {
        console.error("Contract number is missing:", contract);
        return;
      }
      navigate(`/contracts/${contract.contract_number}`);
    },
    [navigate]
  );

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
              toast({
                title: "تم حذف المسودة",
                description: "تم حذف المسودة بنجاح",
              });
              resolve(null);
            },
            onError: reject,
          });
        });
      } catch (error) {
        console.error("Error deleting draft:", error);
        toast({
          title: "خطأ",
          description: "فشل حذف المسودة",
          variant: "destructive",
        });
      }
    },
    [contractDrafts, toast]
  );

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { icon: any; text: string; className: string }> = {
      active: {
        icon: CheckCircle,
        text: "نشط",
        className: "status-badge status-active",
      },
      draft: {
        icon: FileEdit,
        text: "مسودة",
        className: "status-badge status-draft",
      },
      under_review: {
        icon: Clock,
        text: "قيد المراجعة",
        className: "status-badge status-review",
      },
      cancelled: {
        icon: XCircle,
        text: "ملغي",
        className: "status-badge status-cancelled",
      },
      expired: {
        icon: XOctagon,
        text: "منتهي",
        className: "status-badge status-expired",
      },
      expiring_soon: {
        icon: AlertCircle,
        text: "قارب الانتهاء",
        className: "status-badge status-expiring",
      },
    };

    const config = statusMap[status] || statusMap.active;
    const Icon = config.icon;

    return (
      <span className={config.className}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
  };

  // Helper function to get customer name
  const getCustomerName = (contract: any) => {
    if (!contract.customers) return "غير محدد";
    const customer = contract.customers;
    if (customer.customer_type === "company") {
      return customer.company_name_ar || customer.company_name || "شركة غير محددة";
    }
    return `${customer.first_name_ar || customer.first_name || ""} ${customer.last_name_ar || customer.last_name || ""}`.trim() || "عميل غير محدد";
  };

  // Helper function to get vehicle info
  const getVehicleInfo = (contract: any) => {
    // دعم كلا التنسيقين: vehicle و vehicles
    const vehicle = contract.vehicle || contract.vehicles;
    if (!vehicle) return "غير محدد";
    
    const make = vehicle.make_ar || vehicle.make || "";
    const model = vehicle.model_ar || vehicle.model || "";
    const year = vehicle.year || "";
    const plate = vehicle.plate_number || "";
    
    // تجنب عرض نص فارغ
    const vehicleInfo = `${make} ${model} ${year}`.trim();
    if (!vehicleInfo) return "غير محدد";
    
    return `${vehicleInfo}${plate ? ` | ${plate}` : ""}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <PageCustomizer pageId="contracts-page" title="" titleAr="">
      <div className="space-y-6">
        {/* Page Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة العقود</h2>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowContractWizard(true)}
              className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>إنشاء عقد جديد</span>
            </Button>
            <Button
              onClick={() => setShowExpressMode(true)}
              variant="outline"
              className="px-5 py-3 rounded-xl font-medium border-gray-300 hover:border-red-500 transition-colors flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <span>عقود ايجار</span>
            </Button>
            {user?.roles?.includes('super_admin') && (
              <Button
                onClick={() => setShowCSVUpload(true)}
                variant="outline"
                className="px-5 py-3 rounded-xl font-medium border-gray-300 hover:border-red-500 transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5 text-blue-500" />
                <span className="hidden lg:inline">استيراد CSV</span>
              </Button>
            )}
            <Button
              onClick={() => setShowRemindersDialog(true)}
              variant="outline"
              className="px-5 py-3 rounded-xl font-medium border-gray-300 hover:border-purple-500 transition-colors flex items-center gap-2"
              title="إرسال تنبيهات الواتساب للعقود"
            >
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <span className="hidden lg:inline">إرسال تنبيهات</span>
            </Button>
            <Button
              onClick={() => setShowExportDialog(true)}
              variant="outline"
              className="px-5 py-3 rounded-xl font-medium border-gray-300 hover:border-red-500 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5 text-purple-500" />
              <span className="hidden lg:inline">تصدير</span>
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="px-5 py-3 rounded-xl font-medium border-gray-300 hover:border-red-500 transition-colors flex items-center gap-2 mr-auto"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-5 h-5 text-gray-500", isRefreshing && "animate-spin")} />
              <span className="hidden lg:inline">تحديث</span>
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Contracts Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-scale-in">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">نشط</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{safeStatistics.activeContracts?.length || 0}</h3>
              <p className="text-sm text-gray-600 font-medium">العقود النشطة</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">إجمالي العقود الفعالة</p>
              </div>
            </div>

            {/* Draft Contracts Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                  <FileEdit className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">مسودات</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{safeStatistics.draftContracts?.length || 0}</h3>
              <p className="text-sm text-gray-600 font-medium">المسودات</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">بانتظار الإكمال</p>
              </div>
            </div>

            {/* Under Review Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">مراجعة</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{safeStatistics.underReviewContracts?.length || 0}</h3>
              <p className="text-sm text-gray-600 font-medium">قيد المراجعة</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">قيد المعالجة</p>
              </div>
            </div>

            {/* Cancelled Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-scale-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-full">ملغية</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{safeStatistics.cancelledContracts?.length || 0}</h3>
              <p className="text-sm text-gray-600 font-medium">العقود الملغية</p>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">عقود موقوفة</p>
              </div>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-red-100 text-sm font-medium mb-2">إجمالي الإيرادات الشهرية المتوقعة</p>
                <h2 className="text-4xl font-bold mb-1">{formatCurrencyWithSymbol(safeStatistics.totalRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h2>
                <p className="text-red-100 text-sm">من {safeStatistics.activeContracts?.length || 0} عقد نشط</p>
              </div>
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          {/* Resume Draft Section */}
          {contractDrafts.loadDrafts.data && contractDrafts.loadDrafts.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileEdit className="h-5 w-5" />
                  استئناف المسودات ({contractDrafts.loadDrafts.data.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(contractDrafts.loadDrafts.data || []).map((draft) => (
                    <Card key={draft.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{draft.draft_name || "مسودة بدون اسم"}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  آخر تحديث: {formatDateInGregorian(draft.updated_at)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
              </CardContent>
            </Card>
          )}

          {/* Search & Filters Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-gray-200">
              <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-gray-900">البحث والفلاتر</span>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-gray-500 transition-transform", showFilters && "rotate-180")} />
              </button>
            </div>

            {showFilters && (
              <div className="p-6 space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث برقم العقد، اسم العميل، رقم المركبة..."
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>تطبيق الفلاتر</span>
                  </Button>
                  <Button variant="outline" className="px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2" onClick={() => {
                    setSearchInput("");
                    setFilters({});
                  }}>
                    <XCircle className="w-4 h-4" />
                    <span>مسح الفلاتر</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tabs Header */}
            <div className="border-b border-gray-200 relative">
              <div className="flex gap-2 p-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap",
                    activeTab === "all" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  جميع العقود
                </button>
                <button
                  onClick={() => setActiveTab("active")}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap",
                    activeTab === "active" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  النشطة
                </button>
                <button
                  onClick={() => setActiveTab("cancelled")}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap",
                    activeTab === "cancelled" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  الملغية
                </button>
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap",
                    activeTab === "alerts" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  تنبيهات الانتهاء
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap hidden lg:block",
                    activeTab === "settings" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  إعدادات الغرامات
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "settings" ? (
                <LateFinesSettings />
              ) : (
                <div className="space-y-4">
                  {safeFilteredContracts.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد عقود</h3>
                      <p className="text-gray-500 mb-4">لم يتم العثور على أي عقود</p>
                      <Button onClick={() => setShowContractWizard(true)} className="bg-gradient-to-r from-red-600 to-red-800 text-white">
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء عقد جديد
                      </Button>
                    </div>
                  ) : (
                    safeFilteredContracts.map((contract) => (
                      <div 
                        key={contract.id} 
                        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewDetails(contract)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 mb-1">{contract.contract_number || "غير محدد"}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <User className="w-4 h-4" />
                                <span>{getCustomerName(contract)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Car className="w-4 h-4" />
                                <span>{getVehicleInfo(contract)}</span>
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(contract.status)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">تاريخ البداية</p>
                            <p className="font-semibold text-gray-900">{formatDateInGregorian(contract.start_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</p>
                            <p className="font-semibold text-gray-900">{formatDateInGregorian(contract.end_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">القيمة الشهرية</p>
                            <p className="font-bold text-red-600 text-lg">{formatCurrencyWithSymbol(contract.monthly_amount || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(contract)} className="bg-gray-50 text-gray-700 hover:bg-gray-100">
                            <Eye className="w-4 h-4 ml-2" />
                            عرض
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setContractToEdit(contract)} className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRenewContract(contract)} className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                            <RefreshCw className="w-4 h-4 ml-2" />
                            تجديد
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleCancelContract(contract)} className="bg-red-50 text-red-700 hover:bg-red-100">
                            <XCircle className="w-4 h-4 ml-2" />
                            إلغاء
                          </Button>
                          <Button variant="outline" size="sm" className="bg-gray-50 text-gray-700 hover:bg-gray-100 mr-auto">
                            <MoreHorizontal className="w-4 h-4 ml-2" />
                            <span className="hidden lg:inline">المزيد</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
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

      <ContractWizard
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
        onSubmit={handleContractSubmit}
        preselectedCustomerId={preselectedCustomerId}
        preselectedVehicleId={preselectedVehicleId}
        draftIdToLoad={draftIdToLoad}
        contractToEdit={contractToEdit}
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

      <div className={cn("fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity", showCreationProgress ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
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
        contracts={safeFilteredContracts || []}
      />

      {showTemplateManager && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <Card>
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

      {/* Add CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        
        /* Status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.3s ease-out;
        }
        
        .status-active {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
          border: 1px solid #86efac;
        }
        
        .status-draft {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #4338ca;
          border: 1px solid #a5b4fc;
        }
        
        .status-review {
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          color: #9a3412;
          border: 1px solid #fb923c;
        }
        
        .status-cancelled {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        
        .status-expired {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        
        .status-expiring {
          background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
          color: #c2410c;
          border: 1px solid #fdba74;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </PageCustomizer>
  );
}

export default function ContractsNewWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ContractsNew />
    </ErrorBoundary>
  );
}

