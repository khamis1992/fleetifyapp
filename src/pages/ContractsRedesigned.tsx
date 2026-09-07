import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageCustomizer } from "@/components/PageCustomizer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatCustomerName } from "@/utils/formatCustomerName";
import {
  RefreshCw,
  Search,
  Plus,
  FileEdit,
  Clock,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Car,
  Calendar,
  Eye,
  Edit,
  TrendingUp,
  Wallet,
  Upload,
  Download,
  XOctagon,
  MessageSquare,
  FileSignature,
  Loader2,
  Scale,
  MoreVertical,
  List,
  Bell,
  Settings,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Component imports
import { SimpleContractWizard } from "@/components/contracts/SimpleContractWizard";
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager";
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog";
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement";
import { ContractDetailsDialog } from "@/components/contracts/ContractDetailsDialog";
import { ContractInvoiceDialog } from "@/components/contracts/ContractInvoiceDialog";
import { ContractExportDialog } from "@/components/contracts/ContractExportDialog";
import { ContractCreationProgress } from "@/components/contracts/ContractCreationProgress";
import { ContractCancellationDialog } from "@/components/contracts/ContractCancellationDialog";
import { UnifiedContractUpload } from "@/components/contracts/UnifiedContractUpload";
import { ContractsNeedingAttention } from "@/components/contracts/ContractsNeedingAttention";
import { LateFinesSettings } from "@/components/contracts/LateFinesSettings";
import SendRemindersDialog from "@/components/contracts/SendRemindersDialog";
import { ContractAmendmentForm } from "@/components/contracts";
import { ContractPDFImportRedesigned } from "@/components/contracts/ContractPDFImportRedesigned";
import { PermanentContractDeleteDialog } from "@/components/contracts/PermanentContractDeleteDialog";
import { LegalTransferReadinessWizard as ConvertToLegalDialog } from "@/components/contracts/LegalTransferReadinessWizard";
import { canPermanentlyDeleteContract } from "@/components/contracts/contractDeletionEligibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Hook imports
import { useContractsData, type ContractWithVehicle as Contract } from "@/hooks/useContractsData";
import { useAuth } from "@/contexts/AuthContext";
import { useContractCreation } from "@/hooks/useContractCreation";
import { useContractDrafts } from "@/hooks/useContractDrafts";
import { useToast } from "@/hooks/use-toast";
import { generateShortContractNumber } from "@/utils/contractNumberGenerator";
import { formatDateInGregorian } from "@/utils/dateFormatter";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { supabaseConfig } from "@/integrations/supabase/client";
import "@/components/contracts/contracts-register.css";
import { isContractOccupyingVehicle } from "@/utils/vehicleOperationalStatus";
import { revertContractLegalProcedure } from '@/services/contractLegalProcedureService';
import { SeizedActiveContractBanner } from '@/components/contracts/SeizedActiveContractBanner';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

// Tab configuration
const TAB_CONFIG = [
  { id: "all", label: "الكل", icon: List, color: "slate" },
  { id: "active", label: "النشطة", icon: CheckCircle, color: "emerald" },
  { id: "draft", label: "المسودات", icon: FileEdit, color: "violet" },
  { id: "incomplete", label: "غير مكتمل", icon: AlertCircle, color: "orange" },
  { id: "cancelled", label: "الملغية", icon: XCircle, color: "rose" },
  { id: "legal_action", label: "القانونية", icon: Scale, color: "purple" },
  { id: "pending_completion", label: "بانتظار الإكمال", icon: Clock, color: "amber" },
  { id: "alerts", label: "التنبيهات", icon: Bell, color: "red" },
  { id: "settings", label: "الإعدادات", icon: Settings, color: "blue" },
];

const getContractTabLabel = (tabId: string) => {
  const labels: Record<string, string> = {
    all: "كل العقود",
    active: "نشطة",
    draft: "مسودات",
    incomplete: "غير مكتملة",
    cancelled: "ملغاة",
    legal_action: "قانونية",
    pending_completion: "بانتظار الإكمال",
    alerts: "تحتاج متابعة",
    settings: "الإعدادات",
  };
  return labels[tabId] || tabId;
};

const DraftCard = ({ 
  draft, 
  onLoad, 
  onDelete 
}: { 
  draft: any; 
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <motion.div
    variants={itemVariants}
    className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 truncate">{draft.draft_name || "مسودة بدون اسم"}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <Clock className="h-3 w-3" />
          <span>آخر تحديث: {formatDateInGregorian(draft.updated_at)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 opacity-100 transition-opacity"
        onClick={() => onDelete(draft.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
           <Button
             variant="outline"
             size="default"
             className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 min-h-[44px]"
             onClick={() => onLoad(draft.id)}
           >
             <FileEdit className="h-4 w-4 ml-2" />
             استئناف التحرير
           </Button>
  </motion.div>
);

const getContractCustomerName = (contract: Contract) => formatCustomerName(contract.customers) || "عميل غير محدد";

const getContractVehicleInfo = (contract: Contract) => {
  const vehicle = contract.vehicle;
  if (!vehicle) return "مركبة غير محددة";
  const make = vehicle.make || "";
  const model = vehicle.model || "";
  const year = vehicle.year || "";
  return `${make} ${model} ${year}`.trim() || "مركبة غير محددة";
};

const getContractPlate = (contract: Contract) => contract.vehicle?.plate_number || "-";

const getContractAssignedEmployeeName = (contract: Contract) => {
  const profile = contract.assigned_employee;
  if (!profile) return "غير معين";

  const arabicName = [profile.first_name_ar, profile.last_name_ar].filter(Boolean).join(" ").trim();
  const englishName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();

  return arabicName || englishName || profile.email || "غير محدد";
};

const getContractDaysLeft = (date?: string) => {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? days : null;
};

const getContractIncompleteReasons = (contract: Contract) => {
  const contractAmount = contract.contract_amount === undefined || contract.contract_amount === null
    ? null
    : Number(contract.contract_amount);
  const monthlyAmount = contract.monthly_amount === undefined || contract.monthly_amount === null
    ? null
    : Number(contract.monthly_amount);
  const reasons: string[] = [];

  if (contractAmount === 0 && monthlyAmount === 0) {
    reasons.push("قيمة العقد والإيجار الشهري غير مكتملة");
  }

  if (!contract.customer_id) {
    reasons.push("لا يوجد عميل مرتبط بالعقد");
  }

  if (!contract.vehicle_id) {
    reasons.push("لا توجد مركبة مرتبطة بالعقد");
  }

  if (contract.end_date && new Date(contract.end_date) < new Date() && contract.status === "active") {
    reasons.push("العقد نشط رغم أن تاريخ النهاية منتهي");
  }

  return reasons;
};

const ModernStatusBadge = ({
  status,
  legalStatus,
  onClick,
}: {
  status: string;
  legalStatus?: string | null;
  onClick?: (event: React.MouseEvent) => void;
}) => {
  const statusMap: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: "نشط", className: "bg-[#E8FBF6] text-[#0f766e] border-[#BFEFE4]", icon: CheckCircle },
    draft: { label: "مسودة", className: "bg-[#ECEEFE] text-[#6554a4] border-[#D8D9FF]", icon: FileEdit },
    under_review: { label: "قيد المراجعة", className: "bg-[#EAF8FE] text-[#0369a1] border-[#BEE9FB]", icon: Clock },
    cancelled: { label: "ملغي", className: "bg-[#FFF0F2] text-[#be3455] border-[#FFD5DC]", icon: XCircle },
    expired: { label: "منتهي", className: "bg-[#FFF0F2] text-[#be3455] border-[#FFD5DC]", icon: XOctagon },
    expiring_soon: { label: "قارب الانتهاء", className: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]", icon: AlertTriangle },
    under_legal_procedure: { label: "إجراء قانوني", className: "bg-[#ECEEFE] text-[#6554a4] border-[#D8D9FF]", icon: Scale },
    pending_completion: { label: "بانتظار الإكمال", className: "bg-[#EAF8FE] text-[#0369a1] border-[#BEE9FB]", icon: Clock },
  };
  const config = statusMap[status] || { label: status === "suspended" ? "معلق" : status === "completed" ? "مكتمل" : status || "غير محدد", className: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText };
  const Icon = config.icon;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black", config.className)}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </button>
      {(legalStatus && status !== "under_legal_procedure") && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D9FF] bg-[#ECEEFE] px-2.5 py-1 text-xs font-black text-[#6554a4]">
          <Scale className="h-3.5 w-3.5" />
          قانوني
        </span>
      )}
    </div>
  );
};

const CompactDatum = ({
  label,
  value,
  icon: Icon,
  strong = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  strong?: boolean;
}) => (
  <div className="rounded-[8px] bg-[#F8FAFC] px-3 py-2">
    <div className="mb-1 flex items-center gap-1 text-xs font-bold text-[#687c74]">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className={cn("truncate text-sm font-black", strong ? "text-[#020617]" : "text-[#64748B]")}>{value}</div>
  </div>
);

const ContractOperationsRow = ({
  contract,
  onView,
  onEdit,
  onRenew,
  onCancel,
  onManageStatus,
  onConvertToLegal,
  onRemoveLegal,
  onDeletePermanent,
}: {
  contract: Contract;
  onView: (c: Contract) => void;
  onEdit: (c: Contract) => void;
  onRenew: (c: Contract) => void;
  onCancel: (c: Contract) => void;
  onManageStatus: (c: Contract) => void;
  onConvertToLegal: (c: Contract) => void;
  onRemoveLegal: (c: Contract) => void;
  onDeletePermanent: (c: Contract) => void;
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const isActive = contract.status === "active";
  const isCancelled = contract.status === "cancelled";
  const hasLegalStatus = Boolean(contract.legal_status || contract.status === "under_legal_procedure");
  const daysLeft = getContractDaysLeft(contract.end_date);
  const incompleteReasons = getContractIncompleteReasons(contract);
  const progress = contract.contract_amount
    ? Math.min(100, Math.max(0, ((contract.total_paid || 0) / contract.contract_amount) * 100))
    : 0;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "contracts-record",
        isActive && "border-[#BFEFE4]",
        isCancelled && "border-[#FFD5DC]",
        hasLegalStatus && "border-[#D8D9FF]"
      )}
    >
      <div className="contracts-record-grid">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className={cn(
              "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]",
              isActive ? "bg-[#E8FBF6] text-[#0f766e]" :
              isCancelled ? "bg-[#FFF0F2] text-[#be3455]" :
              hasLegalStatus ? "bg-[#ECEEFE] text-[#6554a4]" : "bg-[#F6F8FB] text-[#64748B]"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#213f38]"><button className="contracts-customer-link" onClick={() => onView(contract)}>{getContractCustomerName(contract)}</button></h3>
                <ModernStatusBadge
                  status={contract.status}
                  legalStatus={contract.legal_status}
                  onClick={(event) => {
                    event.stopPropagation();
                    onManageStatus(contract);
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-[#64748B]">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {contract.contract_number}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" />
                  {getContractVehicleInfo(contract)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileSignature className="h-3.5 w-3.5" />
                  {contract.vehicle_id ? <Link className="contracts-plate" to={`/fleet/vehicles/${contract.vehicle_id}`}>{getContractPlate(contract)}</Link> : getContractPlate(contract)}
                </span>
                <span className="inline-flex items-center gap-1" title="الموظف المسؤول عن العقد">
                  <UserRound className="h-3.5 w-3.5" />
                  <span className="text-[#687c74]">المسؤول:</span>
                  {getContractAssignedEmployeeName(contract)}
                </span>
              </div>
              {contract.vehicle_id && isContractOccupyingVehicle(contract) && <span className="contracts-occupancy">المركبة مشغولة بهذا العقد</span>}
              <SeizedActiveContractBanner contractStatus={contract.status} vehicleStatus={contract.vehicles?.status} className="mt-3" />
              {incompleteReasons.length > 0 && (
                <div className="mt-3 rounded-[8px] border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-xs font-bold leading-5 text-[#C2410C]">
                  <div className="mb-1 flex items-center gap-1.5 font-black">
                    <AlertCircle className="h-3.5 w-3.5" />
                    سبب عدم الاكتمال
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {incompleteReasons.map((reason) => (
                      <span key={reason} className="rounded-full bg-white/80 px-2 py-0.5">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CompactDatum label="البداية" value={formatDateInGregorian(contract.start_date)} icon={Calendar} />
          <CompactDatum label="النهاية" value={formatDateInGregorian(contract.end_date)} icon={Clock} />
          <div className="col-span-2 rounded-[8px] bg-[#F8FAFC] px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#687c74]">
              <span>حتى تاريخ النهاية</span>
              <span>{daysLeft === null ? "-" : daysLeft > 0 ? `${daysLeft} يوم` : daysLeft === 0 ? "اليوم" : "مضى تاريخ النهاية"}</span>
            </div>

          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <CompactDatum label="الإيجار الشهري" value={formatCurrency(contract.monthly_amount || 0)} icon={Wallet} strong />
          <CompactDatum label="قيمة العقد" value={formatCurrency(contract.contract_amount || 0)} icon={TrendingUp} strong />
          <div className="rounded-[8px] bg-[#F8FAFC] px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#687c74]">
              <span>التحصيل</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 xl:justify-end" onClick={(event) => event.stopPropagation()}>
          <Button
            variant="outline"
            size="default"
            onClick={() => onView(contract)}
            className="h-10 rounded-[8px] border-[#DDE5EF] px-4 font-black text-[#102B4E]"
          >
            <Eye className="ml-1.5 h-4 w-4" />
            عرض
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label={`إجراءات العقد ${contract.contract_number}`} variant="outline" size="default" className="h-10 rounded-[8px] border-[#DDE5EF] px-3">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-right">
              <DropdownMenuItem onClick={() => onEdit(contract)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل العقد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageStatus(contract)}>
                <Settings className="ml-2 h-4 w-4" />
                إدارة الحالة
              </DropdownMenuItem>
              {isActive && (
                <>
                  <DropdownMenuItem onClick={() => onRenew(contract)}>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    تجديد العقد
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCancel(contract)} className="text-[#be3455] focus:text-[#be3455]">
                    <XCircle className="ml-2 h-4 w-4" />
                    إلغاء العقد
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertToLegal(contract)} className="text-[#6554a4] focus:text-[#6554a4]">
                    <Scale className="ml-2 h-4 w-4" />
                    تحويل للشؤون القانونية
                  </DropdownMenuItem>
                </>
              )}
              {/* Cancelled contracts require a dedicated accounting/legal reversal path. */}
              {canPermanentlyDeleteContract(contract.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeletePermanent(contract)}
                    className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف العقد نهائيًا
                  </DropdownMenuItem>
                </>
              )}
              {hasLegalStatus && (
                <DropdownMenuItem onClick={() => onRemoveLegal(contract)} className="text-[#0f766e] focus:text-[#0f766e]">
                  <CheckCircle className="ml-2 h-4 w-4" />
                  إزالة الإجراء القانوني
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
};

function ContractsRedesigned() {
  // State management
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | undefined>(undefined);
  const [contractToEdit, setContractToEdit] = useState<any>(undefined);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCreationProgress, setShowCreationProgress] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showConvertToLegalDialog, setShowConvertToLegalDialog] = useState(false);
  const [showRemoveLegalDialog, setShowRemoveLegalDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showContractPDFImport, setShowContractPDFImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState<'default' | 'customer_name' | 'contract_date' | 'end_date'>('default');

  // Refs
  const processedCustomerRef = useRef(false);
  const processedVehicleRef = useRef(false);
  const contractCreationKeyRef = useRef<string | null>(null);

  // Hooks
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { createContract, creationState, retryCreation, resetCreationState } = useContractCreation();
  const contractDrafts = useContractDrafts();
  const { formatCurrency } = useCurrencyFormatter();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filters
  const filters = useMemo(() => {
    const newFilters: any = {};
    if (debouncedSearchTerm?.trim()) {
      newFilters.search = debouncedSearchTerm.trim();
    }
    if (activeTab === "active") newFilters.status = "active";
    else if (activeTab === "draft") newFilters.status = "draft";
    else if (activeTab === "incomplete") newFilters.showIncomplete = true;
    else if (activeTab === "cancelled") newFilters.status = "cancelled";
    else if (activeTab === "legal_action") newFilters.showLegalAction = true;
    else if (activeTab === "pending_completion") newFilters.status = "pending_completion";
    else if (activeTab === "alerts") newFilters.status = "expiring_soon";
    return newFilters;
  }, [debouncedSearchTerm, activeTab]);

  const filtersWithPagination = useMemo(() => ({
    ...filters,
    page,
    pageSize,
  }), [filters, page, pageSize]);

  // Data fetching
  const { contracts, filteredContracts, isLoading, isFetching, error, statisticsError, statisticsLoading, refetch, statistics, pagination } =
    useContractsData(filtersWithPagination);

  const safeContracts = useMemo(() => Array.isArray(contracts) ? contracts : [], [contracts]);
  const safeFilteredContracts = useMemo(() => Array.isArray(filteredContracts) ? filteredContracts : [], [filteredContracts]);
  const contractsNeedingAttention = useMemo(() => safeContracts.map((contract) => ({
    ...contract,
    customers: contract.customers ? {
      first_name: contract.customers.first_name ?? undefined,
      last_name: contract.customers.last_name ?? undefined,
      first_name_ar: contract.customers.first_name_ar ?? undefined,
      last_name_ar: contract.customers.last_name_ar ?? undefined,
      company_name: contract.customers.company_name ?? undefined,
      company_name_ar: contract.customers.company_name_ar ?? undefined,
      customer_type: contract.customers.customer_type ?? undefined,
    } : undefined,
    vehicles: contract.vehicles ? {
      plate_number: contract.vehicles.plate_number,
      make: contract.vehicles.make,
      model: contract.vehicles.model,
    } : undefined,
  })), [safeContracts]);
  const reminderContracts = useMemo(() => safeContracts.map((contract) => ({
    id: contract.id,
    contract_number: contract.contract_number,
    customer_name: contract.customer_name ?? undefined,
    customer_phone: contract.customer_phone ?? contract.customers?.phone ?? undefined,
    customers: contract.customers ? {
      phone: contract.customers.phone,
      first_name_ar: contract.customers.first_name_ar ?? undefined,
      last_name_ar: contract.customers.last_name_ar ?? undefined,
      first_name: contract.customers.first_name ?? undefined,
      last_name: contract.customers.last_name ?? undefined,
      company_name_ar: contract.customers.company_name_ar ?? undefined,
      company_name: contract.customers.company_name ?? undefined,
      customer_type: contract.customers.customer_type ?? undefined,
    } : undefined,
    monthly_amount: contract.monthly_amount,
    status: contract.status,
  })), [safeContracts]);

  // Sort contracts
  const sortedContracts = useMemo(() => {
    if (sortBy === 'default') return safeFilteredContracts;
    return [...safeFilteredContracts].sort((a, b) => {
      if (sortBy === 'customer_name') {
        const nameA = formatCustomerName(a.customers);
        const nameB = formatCustomerName(b.customers);
        return nameA.localeCompare(nameB, 'ar');
      }
      if (sortBy === 'contract_date') {
        return new Date(b.contract_date || 0).getTime() - new Date(a.contract_date || 0).getTime();
      }
      if (sortBy === 'end_date') {
        return new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime();
      }
      return 0;
    });
  }, [safeFilteredContracts, sortBy]);

  const isInitialLoading = isLoading && safeFilteredContracts.length === 0;

  const safeStatistics = useMemo(() => statistics || {
    totalContracts: 0,
    activeContracts: [],
    draftContracts: [],
    underReviewContracts: [],
    cancelledContracts: [],
    pendingCompletionContracts: [],
    expiringSoonContracts: [],
    legalProcedureContracts: [],
    activeWithLegalIssues: [],
    cancelledWithLegalIssues: [],
    totalLegalCases: [],
    totalRevenue: 0,
  }, [statistics]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: safeStatistics.totalContracts || 0,
    active: safeStatistics.activeContracts?.length || 0,
    draft: safeStatistics.draftContracts?.length || 0,
    incomplete: safeStatistics.incompleteContracts?.length || 0,
    cancelled: safeStatistics.cancelledContracts?.length || 0,
    legal_action: safeStatistics.totalLegalCases?.length || 0,
    pending_completion: safeStatistics.pendingCompletionContracts?.length || 0,
    alerts: safeStatistics.expiringSoonContracts?.length || 0,
    settings: 0,
  }), [safeStatistics]);

  // Handle pre-selected parameters
  useEffect(() => {
    if (location.state?.selectedCustomerId && !processedCustomerRef.current) {
      setPreselectedCustomerId(location.state.selectedCustomerId);
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

  useEffect(() => {
    const customerParam = searchParams.get("customer");
    if (customerParam && !processedCustomerRef.current) {
      processedCustomerRef.current = true;
      setPreselectedCustomerId(customerParam);
      setShowContractWizard(true);
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("customer");
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

  const handleContractSubmit = useCallback(async (contractData: any): Promise<void> => {
    try {
      setShowCreationProgress(true);
      resetCreationState();
      const finalData = {
        ...contractData,
        created_by: user?.id,
        contract_date: contractData.contract_date || new Date().toISOString().split("T")[0],
        contract_number: contractData.contract_number || generateShortContractNumber(),
        idempotency_key: contractCreationKeyRef.current
          ?? (contractCreationKeyRef.current = `contract:${crypto.randomUUID()}`),
      };
      await createContract(finalData);
    } catch (error) {
      console.error("Error in contract creation:", error);
      setShowCreationProgress(false);
      throw error;
    }
  }, [user?.id, createContract, resetCreationState]);

  const handleCreationComplete = useCallback(() => {
    contractCreationKeyRef.current = null;
    setShowCreationProgress(false);
    setShowContractWizard(false);
    setPreselectedCustomerId(undefined);
    refetch();
  }, [refetch]);

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

  const handleRemoveLegalProcedure = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowRemoveLegalDialog(true);
  }, []);

  const handleOpenPermanentDelete = useCallback((contract: Contract) => {
    setSelectedContract(contract);
    setShowPermanentDeleteDialog(true);
  }, []);

  const handleConvertToLegal = useCallback((contract: any) => {
    setSelectedContract({
      ...contract,
      customer: contract.customer || contract.customers || null,
      vehicle: contract.vehicle || contract.vehicles || null,
    });
    setShowConvertToLegalDialog(true);
  }, []);

  const executeRemoveLegalProcedure = useCallback(async () => {
    if (!selectedContract || !companyId) return;
    setIsRemovingLegal(true);
    try {
      await revertContractLegalProcedure({
        contractId: selectedContract.id,
        companyId,
        reason: 'تمت إزالة الإجراء القانوني من صفحة العقود',
      });

      toast({
        title: 'تم إزالة الإجراء القانوني',
        description: `تم إعادة العقد #${selectedContract.contract_number} للحالة النشطة`,
      });

      setShowRemoveLegalDialog(false);
      refetch();
    } catch (error: any) {
      console.error('خطأ في إزالة الإجراء القانوني:', error);
      toast({
        title: 'خطأ في إزالة الإجراء القانوني',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingLegal(false);
    }
  }, [selectedContract, companyId, toast, refetch]);

  const handleAmendContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowAmendmentForm(true);
  }, []);

  const handleLoadDraft = useCallback((draftId: string) => {
    setContractToEdit({ draftId });
    setShowContractWizard(true);
  }, []);

  const handleDeleteDraft = useCallback(async (draftId: string) => {
    try {
      await contractDrafts.deleteDraft.mutateAsync(draftId);
      toast({ title: "تم حذف المسودة", description: "تم حذف المسودة بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف المسودة", variant: "destructive" });
    }
  }, [contractDrafts, toast]);

  return (
    <PageCustomizer pageId="contracts-page" title="" titleAr="">
      <div
        className="contracts-register"
        dir="rtl"
      >
        <header className="contracts-register-header">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#102B4E] text-white shadow-[0_18px_32px_-24px_rgba(16,43,78,.8)]">
                  <FileSignature className="h-6 w-6" />
                </div>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#0f766e]">العراف / إدارة التأجير</span>
                    <span className="rounded-full bg-[#EAF8FE] px-3 py-1 text-xs font-black text-[#0369a1]">سجل العقود</span>
                  </div>
                  <h1 className="text-2xl font-black text-[#020617]">كل عقد، بتفاصيله.</h1>
                  <p className="text-sm font-bold text-[#64748B]">مساحة واحدة لمتابعة العملاء والمركبات والتزامات الإيجار.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setShowContractWizard(true)}
                  className="h-11 rounded-[8px] bg-[#22C7A1] px-4 font-black text-white hover:bg-[#1DAE8D]"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  عقد جديد
                </Button>

                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                  className="h-11 rounded-[8px] border-[#22C7A1] bg-[#E8FBF6] px-4 font-black text-[#117C68] hover:bg-[#D7F7EF]"
                >
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  تقرير Excel شامل
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-label="أدوات العقود" variant="outline" size="default" className="h-11 rounded-[8px] border-[#DDE5EF] px-3">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-right">
                    {user?.roles?.includes('super_admin') && (
                      <DropdownMenuItem onClick={() => setShowCSVUpload(true)}>
                        <Upload className="ml-2 h-4 w-4" />
                        استيراد CSV
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowContractPDFImport(true)}>
                      <FileText className="ml-2 h-4 w-4" />
                      استيراد PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRemindersDialog(true)}>
                      <MessageSquare className="ml-2 h-4 w-4" />
                      إرسال تنبيهات
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/contracts/signed-agreements')}>
                      <FileSignature className="ml-2 h-4 w-4" />
                      العقود الموقعة
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                      <Download className="ml-2 h-4 w-4" />
                      تصدير البيانات
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  aria-label="تحديث العقود"
                  onClick={handleRefresh}
                  variant="outline"
                  size="default"
                  className="h-11 rounded-[8px] border-[#DDE5EF]"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="contracts-workspace max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {statisticsError && <div role="alert" className="contracts-followup">تعذر تحديث ملخص العقود. <button onClick={handleRefresh}>إعادة المحاولة</button></div>}
          <section className="contracts-summary" aria-label="ملخص العقود">
            <button onClick={() => { setActiveTab('all'); setPage(1); }}><span>إجمالي العقود</span><strong>{statisticsError || statisticsLoading ? "—" : tabCounts.all}</strong><small>جميع العقود المسجلة <ChevronLeft size={14} /></small></button>
            <button onClick={() => { setActiveTab('active'); setPage(1); }}><span>العقود النشطة</span><strong>{statisticsError || statisticsLoading ? "—" : tabCounts.active}</strong><small>متابعة الإيجار والتشغيل <ChevronLeft size={14} /></small></button>
            <div><span>الإيجار الشهري المتوقع</span><strong>{statisticsError || statisticsLoading ? "—" : formatCurrency(safeStatistics.totalRevenue || 0)}</strong><small>العقود النشطة وقيد المراجعة</small></div>
            <button onClick={() => { setActiveTab('legal_action'); setPage(1); }}><span>الملفات القانونية</span><strong>{statisticsError || statisticsLoading ? "—" : tabCounts.legal_action}</strong><small>عقود مرتبطة بإجراءات قانونية <ChevronLeft size={14} /></small></button>
          </section>
          {/* Contracts Needing Attention */}
          <AnimatePresence>
            {safeContracts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <details className="contracts-followup"><summary>متابعة العقود المعروضة في هذه الصفحة</summary><ContractsNeedingAttention contracts={contractsNeedingAttention} /></details>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drafts Section */}
          <AnimatePresence>
            {contractDrafts.loadDrafts.data && contractDrafts.loadDrafts.data.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-violet-50 to-white rounded-xl border border-violet-200/50 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-violet-500" />
                    المسودات المحفوظة
                    <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                      {contractDrafts.loadDrafts.data.length}
                    </Badge>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractDrafts.loadDrafts.data.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onLoad={handleLoadDraft}
                      onDelete={handleDeleteDraft}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="contracts-register-intro"><div><h2>سجل العقود</h2><p>ابحث عن عقد، أو اختر الحالة للوصول إلى ما تحتاجه.</p></div><span role="status">{isFetching ? "جاري تحديث النتائج…" : error ? "تعذر تحميل النتائج" : `${pagination?.totalCount ?? sortedContracts.length} نتيجة`}</span></div>
          <section className="contracts-filter-panel rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687c74]" />
                <Input
                  aria-label="البحث في العقود"
                  placeholder="ابحث برقم العقد، اسم العميل، رقم الجوال، الرقم الشخصي، أو رقم المركبة..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  className="h-12 rounded-[8px] border-[#DDE5EF] bg-[#F8FAFC] pr-12 text-base font-bold text-[#020617] focus:border-[#22C7A1]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(""); setPage(1); }}
                    className="contracts-clear-search"
                    aria-label="مسح البحث"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
              </div>

              <select
                aria-label="ترتيب النتائج في الصفحة"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as any)}
                className="h-12 rounded-[8px] border border-[#DDE5EF] bg-white px-4 text-sm font-black text-[#020617] outline-none transition focus:border-[#22C7A1] focus:ring-2 focus:ring-[#22C7A1]/20"
              >
                <option value="default">ترتيب الصفحة: الأحدث إضافة</option>
                <option value="customer_name">ترتيب الصفحة: اسم العميل</option>
                <option value="contract_date">ترتيب الصفحة: تاريخ العقد</option>
                <option value="end_date">ترتيب الصفحة: الأقرب انتهاءً</option>
              </select>
            </div>
          </section>

          {/* Tabs & Content */}
          <div className="contracts-results">
            {/* Tabs */}
            <div className="contracts-tabs">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex p-2 gap-1">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const count = tabCounts[tab.id as keyof typeof tabCounts];
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        aria-pressed={isActive}
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setPage(1);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                            : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn(
                          "w-4 h-4",
                          isActive && tab.color === 'emerald' && "text-emerald-500",
                          isActive && tab.color === 'violet' && "text-violet-500",
                          isActive && tab.color === 'rose' && "text-rose-500",
                          isActive && tab.color === 'purple' && "text-purple-500",
                          isActive && tab.color === 'amber' && "text-amber-500",
                          isActive && tab.color === 'orange' && "text-orange-500",
                          isActive && tab.color === 'red' && "text-red-500",
                          isActive && tab.color === 'blue' && "text-blue-500",
                          isActive && tab.color === 'slate' && "text-slate-500",
                        )} />
                        <span>{getContractTabLabel(tab.id)}</span>
                        {!statisticsError && !statisticsLoading && count > 0 && tab.id !== 'settings' && (
                          <Badge 
                            variant={isActive ? "default" : "secondary"}
                            className={cn(
                              "text-xs px-2 py-0 h-5",
                              isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                            )}
                          >
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <div className="contracts-results-body" aria-busy={isFetching}>
              {activeTab === "settings" ? (
                <LateFinesSettings />
              ) : error ? (<div className="contracts-loading" role="alert"><AlertCircle /><p>تعذر تحميل العقود. أعد المحاولة.</p><Button variant="outline" onClick={handleRefresh}>إعادة المحاولة</Button></div>) : isInitialLoading ? (<div className="contracts-loading"><LoadingSpinner /><p>جاري تحميل العقود…</p></div>) : sortedContracts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد عقود</h3>
                  {searchTerm ? (
                    <>
                      <p className="text-slate-500 mb-6">لم يتم العثور على نتائج للبحث: "{searchTerm}"</p>
                      <Button variant="outline" onClick={() => { setSearchTerm(""); setPage(1); }} className="rounded-xl">
                        <XCircle className="w-4 h-4 ml-2" />
                        مسح البحث
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 mb-6">ابدأ بإنشاء عقد جديد</p>
                      <Button 
                        onClick={() => setShowContractWizard(true)}
                        className="bg-teal-500 text-white rounded-xl"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء عقد جديد
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="contracts-row-list"
                  >
                    {sortedContracts.map((contract) => (
                      <ContractOperationsRow
                        key={contract.id}
                        contract={contract}
                        onView={handleViewDetails}
                        onEdit={(c) => {
                          setContractToEdit(c);
                          setShowContractWizard(true);
                        }}
                        onRenew={handleRenewContract}
                        onCancel={handleCancelContract}
                        onManageStatus={handleManageStatus}
                        onConvertToLegal={handleConvertToLegal}
                        onRemoveLegal={handleRemoveLegalProcedure}
                        onDeletePermanent={handleOpenPermanentDelete}
                      />
                    ))}
                  </motion.div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                      <span className="text-sm font-medium text-slate-500">
                        عرض {((pagination.page - 1) * pagination.pageSize) + 1} إلى {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} من {pagination.totalCount}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isFetching || pagination.page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                          aria-label="الصفحة السابقة"
                          title="الصفحة السابقة"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <span className="min-w-24 text-center text-sm font-bold text-slate-700">
                          الصفحة {pagination.page} من {pagination.totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isFetching || !pagination.hasMore}
                          onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                          aria-label="الصفحة التالية"
                          title="الصفحة التالية"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Dialogs */}
        <ContractRenewalDialog 
          open={showRenewalDialog} 
          onOpenChange={setShowRenewalDialog} 
          contract={selectedContract} 
        />
        <ContractStatusManagement 
          open={showStatusDialog} 
          onOpenChange={setShowStatusDialog} 
          contract={selectedContract} 
        />
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
        <ContractExportDialog 
          open={showExportDialog} 
          onOpenChange={setShowExportDialog} 
        />
        <SimpleContractWizard
          open={showContractWizard}
          onOpenChange={(open) => {
            setShowContractWizard(open);
            if (!open) {
              setContractToEdit(undefined);
              contractCreationKeyRef.current = null;
            }
          }}
          onSubmit={contractToEdit ? undefined : handleContractSubmit}
          preselectedCustomerId={preselectedCustomerId}
          preselectedVehicleId={preselectedVehicleId}
          editContract={contractToEdit}
          key={contractToEdit?.id || (showContractWizard ? 'wizard-open' : 'wizard-closed')}
        />
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
        
        {/* Creation Progress Modal */}
        <AnimatePresence>
          {showCreationProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full"
              >
                <ContractCreationProgress 
                  creationState={creationState} 
                  onRetry={() => retryCreation()} 
                  onClose={handleCreationComplete} 
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ContractCancellationDialog 
          open={showCancellationDialog} 
          onOpenChange={setShowCancellationDialog} 
          contract={selectedContract} 
        />
        <ConvertToLegalDialog
          open={showConvertToLegalDialog}
          onOpenChange={setShowConvertToLegalDialog}
          contract={selectedContract}
          onSuccess={() => {
            setShowConvertToLegalDialog(false);
            refetch();
          }}
        />
        <UnifiedContractUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false);
            refetch();
          }}
        />
        {/* Remove Legal Procedure Dialog */}
        <AlertDialog open={showRemoveLegalDialog} onOpenChange={setShowRemoveLegalDialog}>
          <AlertDialogContent className="rounded-xl" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-emerald-600 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                إزالة الإجراء القانوني
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 mt-4">
                  <p>هل أنت متأكد من إزالة الإجراء القانوني للعقد <strong>#{selectedContract?.contract_number}</strong>؟</p>
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800 mr-2">
                      سيتم إعادة العقد للحالة النشطة مع إغلاق القضايا وتعطيل سجل التعثر، مع الاحتفاظ بكامل السجل للمراجعة.
                    </AlertDescription>
                  </Alert>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeRemoveLegalProcedure}
                disabled={isRemovingLegal}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                {isRemovingLegal ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإزالة...
                  </>
                ) : (
                  'نعم، إزالة الإجراء القانوني'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PermanentContractDeleteDialog
          open={showPermanentDeleteDialog}
          onOpenChange={setShowPermanentDeleteDialog}
          contract={selectedContract}
          companyId={companyId}
          onDeleted={async () => {
            setSelectedContract(null);
            await refetch();
          }}
          onReviewViolations={(contract) => navigate(`/contracts/${contract.contract_number}`)}
        />

        <SendRemindersDialog
          open={showRemindersDialog}
          onOpenChange={setShowRemindersDialog}
          contracts={reminderContracts}
        />
        <ContractPDFImportRedesigned
          open={showContractPDFImport}
          onOpenChange={setShowContractPDFImport}
          onComplete={() => refetch()}
          ocrConfig={{
            supabaseUrl: supabaseConfig.url,
            apiKey: supabaseConfig.anonKey,
          }}
        />
        
        {/* Template Manager Modal */}
        <AnimatePresence>
          {showTemplateManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-auto"
              >
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-500" />
                        إدارة قوالب العقود
                      </CardTitle>
                      <Button variant="outline" onClick={() => setShowTemplateManager(false)}>
                        إغلاق
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ContractTemplateManager />
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
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
