import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageCustomizer } from "@/components/PageCustomizer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  Car,
  Eye,
  Edit,
  TrendingUp,
  Upload,
  Download,
  XOctagon,
  MessageSquare,
  FileSignature,
  Play,
  Scale,
  MoreVertical,
  List,
  Bell,
  Settings,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { ContractDeleteDialog } from "@/components/contracts/ContractDeleteDialog";
import { UnifiedContractUpload } from "@/components/contracts/UnifiedContractUpload";
import { ContractsNeedingAttention } from "@/components/contracts/ContractsNeedingAttention";
import { LateFinesSettings } from "@/components/contracts/LateFinesSettings";
import SendRemindersDialog from "@/components/contracts/SendRemindersDialog";
import { BulkDeleteContractsDialog } from "@/components/contracts/BulkDeleteContractsDialog";
import { ContractAmendmentForm } from "@/components/contracts";
import { ContractPDFImportRedesigned } from "@/components/contracts/ContractPDFImportRedesigned";
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
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Hook imports
import { useContractsData } from "@/hooks/useContractsData";
import { useAuth } from "@/contexts/AuthContext";
import { useContractCreation } from "@/hooks/useContractCreation";
import { useContractDrafts } from "@/hooks/useContractDrafts";
import { useToast } from "@/hooks/use-toast-mock";
import { useUpdateContractStatus } from "@/hooks/useContractRenewal";
import { generateShortContractNumber } from "@/utils/contractNumberGenerator";
import { formatDateInGregorian } from "@/utils/dateFormatter";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { supabase, supabaseConfig } from "@/integrations/supabase/client";

// Types
interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id?: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contract_amount: number;
  status: string;
  legal_status?: string | null;
  customers?: {
    first_name_ar?: string;
    last_name_ar?: string;
    first_name?: string;
    last_name?: string;
    company_name_ar?: string;
    company_name?: string;
    customer_type?: string;
    phone?: string;
  };
  vehicle?: {
    make_ar?: string;
    model_ar?: string;
    make?: string;
    model?: string;
    year?: number;
    plate_number?: string;
  };
}

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

// Status Badge Component
const StatusBadge = ({ status, legalStatus, onClick }: { 
  status: string; 
  legalStatus?: string | null; 
  onClick?: (e: React.MouseEvent) => void;
}) => {
  const statusConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
    active: { icon: CheckCircle, label: "نشط", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    draft: { icon: FileEdit, label: "مسودة", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    under_review: { icon: Clock, label: "قيد المراجعة", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    cancelled: { icon: XCircle, label: "ملغي", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
    expired: { icon: XOctagon, label: "منتهي", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    expiring_soon: { icon: AlertTriangle, label: "قارب الانتهاء", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    under_legal_procedure: { icon: Scale, label: "إجراء قانوني", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    pending_completion: { icon: Clock, label: "بانتظار الإكمال", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  };

  const legalStatusConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
    under_legal_action: { icon: Scale, label: "تحت الإجراء القانوني", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    legal_case_filed: { icon: Scale, label: "تم رفع دعوى", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
    in_court: { icon: Scale, label: "في المحكمة", bg: "bg-purple-200", text: "text-purple-900", border: "border-purple-400" },
    judgment_issued: { icon: Scale, label: "صدر حكم", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
    execution_phase: { icon: Scale, label: "مرحلة التنفيذ", bg: "bg-indigo-200", text: "text-indigo-900", border: "border-indigo-400" },
    settled: { icon: CheckCircle, label: "تم التسوية", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    closed: { icon: XCircle, label: "مغلق", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };

  const isLegacyLegalProcedure = status === 'under_legal_procedure';
  const displayStatus = isLegacyLegalProcedure ? 'active' : status;
  const effectiveLegalStatus = isLegacyLegalProcedure ? 'under_legal_action' : legalStatus;

  const config = statusConfig[displayStatus] || statusConfig.active;
  const Icon = config.icon;
  const legalConfig = effectiveLegalStatus ? legalStatusConfig[effectiveLegalStatus] : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span 
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all duration-200 hover:shadow-md",
          config.bg, config.text, config.border,
          onClick && "hover:opacity-80"
        )}
        onClick={onClick}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {legalConfig && (
        <span 
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
            legalConfig.bg, legalConfig.text, legalConfig.border
          )}
        >
          <legalConfig.icon className="w-3 h-3" />
          {legalConfig.label}
        </span>
      )}
    </div>
  );
};

// Quick Stat Card - New Design matching the image
const QuickStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  badge,
  details,
  accentColor 
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  badge?: { label: string; color: string };
  details?: Array<{ label: string; value: number | string; dotColor: string }>;
  accentColor?: string;
}) => {
  const colorClasses: Record<string, { border: string; iconBg: string; iconColor: string; badgeBg: string; badgeText: string }> = {
    blue: { 
      border: 'border-blue-500', 
      iconBg: 'bg-blue-50', 
      iconColor: 'text-blue-500',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-600'
    },
    slate: { 
      border: 'border-slate-400', 
      iconBg: 'bg-slate-50', 
      iconColor: 'text-slate-500',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600'
    },
    rose: { 
      border: 'border-rose-500', 
      iconBg: 'bg-rose-50', 
      iconColor: 'text-rose-500',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-600'
    },
    emerald: { 
      border: 'border-emerald-500', 
      iconBg: 'bg-emerald-50', 
      iconColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-600'
    },
    violet: { 
      border: 'border-violet-500', 
      iconBg: 'bg-violet-50', 
      iconColor: 'text-violet-500',
      badgeBg: 'bg-violet-50',
      badgeText: 'text-violet-600'
    },
    amber: { 
      border: 'border-amber-500', 
      iconBg: 'bg-amber-50', 
      iconColor: 'text-amber-500',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-600'
    },
    purple: { 
      border: 'border-purple-500', 
      iconBg: 'bg-purple-50', 
      iconColor: 'text-purple-500',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-600'
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const borderColor = accentColor || colors.border;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300",
        "hover:shadow-lg hover:shadow-black/5"
      )}
    >
      {/* Left accent border */}
      <div className={cn("absolute right-0 top-0 bottom-0 w-1", borderColor.replace('border-', 'bg-'))} />
      
      <div className="p-5 pr-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Title */}
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
            
            {/* Value and Badge row */}
            <div className="flex items-center gap-3 mb-3">
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {badge && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium",
                  badge.color === 'emerald' && "bg-emerald-50 text-emerald-600",
                  badge.color === 'blue' && "bg-blue-50 text-blue-600",
                  badge.color === 'rose' && "bg-rose-50 text-rose-600",
                  badge.color === 'amber' && "bg-amber-50 text-amber-600",
                  badge.color === 'purple' && "bg-purple-50 text-purple-600",
                  badge.color === 'slate' && "bg-slate-100 text-slate-600"
                )}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
          
          {/* Icon */}
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            colors.iconBg
          )}>
            <Icon className={cn("w-5 h-5", colors.iconColor)} />
          </div>
        </div>

        {/* Divider */}
        {(details || badge) && <div className="border-t border-slate-100 my-3" />}

        {/* Details section */}
        {details && details.length > 0 && (
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", detail.dotColor)} />
                  <span className="text-sm text-slate-600">{detail.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Contract List Item Component
const ContractListItem = ({ 
  contract, 
  onView,
  onEdit,
  onRenew,
  onCancel,
  onDelete,
  onManageStatus,
  onConvertToLegal,
  onRemoveLegal,
  onReactivate,
  isReactivating,
}: {
  contract: Contract;
  onView: (c: Contract) => void;
  onEdit: (c: Contract) => void;
  onRenew: (c: Contract) => void;
  onCancel: (c: Contract) => void;
  onDelete: (c: Contract) => void;
  onManageStatus: (c: Contract) => void;
  onConvertToLegal: (c: Contract) => void;
  onRemoveLegal: (c: Contract) => void;
  onReactivate: (c: Contract) => void;
  isReactivating: boolean;
}) => {
  const getCustomerName = () => {
    if (!contract.customers) return "غير محدد";
    const c = contract.customers;
    if (c.customer_type === 'corporate') {
      return c.company_name_ar || c.company_name || 'شركة غير محددة';
    }
    return `${c.first_name_ar || c.first_name || ''} ${c.last_name_ar || c.last_name || ''}`.trim() || 'غير محدد';
  };

  const getVehicleInfo = () => {
    const v = contract.vehicle;
    if (!v) return "غير محدد";
    const make = v.make_ar || v.make || "";
    const model = v.model_ar || v.model || "";
    const year = v.year || "";
    const plate = v.plate_number || "";
    return `${make} ${model} ${year}`.trim() + (plate ? ` | ${plate}` : "");
  };

  const { formatCurrency } = useCurrencyFormatter();

  const isActive = contract.status === 'active';
  const isCancelled = contract.status === 'cancelled';
  const hasLegalStatus = contract.legal_status || contract.status === 'under_legal_procedure';

  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      initial="rest"
      animate="rest"
      className={cn(
        "group relative bg-white rounded-2xl border p-5 transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:border-slate-300",
        "cursor-pointer"
      )}
      onClick={() => onView(contract)}
    >
      {/* Status Indicator Line */}
      <div className={cn(
        "absolute right-0 top-4 bottom-4 w-1 rounded-l-full transition-all duration-300",
        isActive ? "bg-emerald-500" : 
        isCancelled ? "bg-rose-500" : 
        hasLegalStatus ? "bg-purple-500" : "bg-slate-300"
      )} />

      <div className="flex flex-col lg:flex-row lg:items-start gap-4 pr-3">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                isActive ? "bg-emerald-100" : 
                isCancelled ? "bg-rose-100" : 
                hasLegalStatus ? "bg-purple-100" : "bg-slate-100"
              )}>
                <FileText className={cn(
                  "w-5 h-5",
                  isActive ? "text-emerald-600" : 
                  isCancelled ? "text-rose-600" : 
                  hasLegalStatus ? "text-purple-600" : "text-slate-600"
                )} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{getCustomerName()}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {contract.contract_number}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5" />
                    {getVehicleInfo()}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge 
              status={contract.status} 
              legalStatus={contract.legal_status}
              onClick={(e) => {
                e.stopPropagation();
                onManageStatus(contract);
              }}
            />
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 mb-1">تاريخ البداية</p>
              <p className="font-semibold text-slate-700 text-sm">{formatDateInGregorian(contract.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">تاريخ الانتهاء</p>
              <p className="font-semibold text-slate-700 text-sm">{formatDateInGregorian(contract.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">القيمة الشهرية</p>
              <p className="font-bold text-emerald-600">{formatCurrency(contract.monthly_amount || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">القيمة الإجمالية</p>
              <p className="font-bold text-slate-700">{formatCurrency(contract.contract_amount || 0)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onView(contract)}
              className="rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <Eye className="w-4 h-4 ml-1.5" />
              عرض
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 px-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(contract)}>
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل العقد
                </DropdownMenuItem>
                
                {isActive && (
                  <>
                    <DropdownMenuItem onClick={() => onRenew(contract)}>
                      <RefreshCw className="w-4 h-4 ml-2" />
                      تجديد العقد
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onCancel(contract)} className="text-rose-600 focus:text-rose-600">
                      <XCircle className="w-4 h-4 ml-2" />
                      إلغاء العقد
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onConvertToLegal(contract)} className="text-purple-600 focus:text-purple-600">
                      <Scale className="w-4 h-4 ml-2" />
                      تحويل للقانونية
                    </DropdownMenuItem>
                  </>
                )}
                
                {isCancelled && (
                  <>
                    <DropdownMenuItem onClick={() => onReactivate(contract)} disabled={isReactivating}>
                      <Play className="w-4 h-4 ml-2" />
                      {isReactivating ? 'جاري التنشيط...' : 'تنشيط العقد'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onConvertToLegal(contract)} className="text-purple-600 focus:text-purple-600">
                      <Scale className="w-4 h-4 ml-2" />
                      تحويل للقانونية
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(contract)} className="text-rose-600 focus:text-rose-600">
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف نهائي
                    </DropdownMenuItem>
                  </>
                )}
                
                {hasLegalStatus && (
                  <DropdownMenuItem onClick={() => onRemoveLegal(contract)} className="text-emerald-600 focus:text-emerald-600">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    إزالة الإجراء القانوني
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Draft Card Component
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
    className="bg-white rounded-2xl border border-slate-200/60 p-4 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 group"
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
        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(draft.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
      onClick={() => onLoad(draft.id)}
    >
      <FileEdit className="h-4 w-4 ml-2" />
      استئناف التحرير
    </Button>
  </motion.div>
);

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRemoveLegalDialog, setShowRemoveLegalDialog] = useState(false);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
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
  const { mutateAsync: updateContractStatus, isPending: isReactivating } = useUpdateContractStatus();

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
    else if (activeTab === "draft") newFilters.showDraftLike = true;
    else if (activeTab === "incomplete") newFilters.showIncomplete = true;
    else if (activeTab === "cancelled") newFilters.status = "cancelled";
    else if (activeTab === "legal_action") newFilters.legal_status = "under_legal_action";
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
  const { contracts, filteredContracts, isLoading, refetch, statistics } = 
    useContractsData(filtersWithPagination);

  const safeContracts = useMemo(() => Array.isArray(contracts) ? contracts : [], [contracts]);
  const safeFilteredContracts = useMemo(() => Array.isArray(filteredContracts) ? filteredContracts : [], [filteredContracts]);

  // Sort contracts
  const sortedContracts = useMemo(() => {
    if (sortBy === 'default') return safeFilteredContracts;
    return [...safeFilteredContracts].sort((a, b) => {
      if (sortBy === 'customer_name') {
        const nameA = a.customers?.first_name_ar || a.customers?.first_name || '';
        const nameB = b.customers?.first_name_ar || b.customers?.first_name || '';
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
    activeContracts: [],
    draftContracts: [],
    underReviewContracts: [],
    cancelledContracts: [],
    legalProcedureContracts: [],
    activeWithLegalIssues: [],
    cancelledWithLegalIssues: [],
    totalLegalCases: [],
    totalRevenue: 0,
  }, [statistics]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: safeContracts.length,
    active: safeStatistics.activeContracts?.length || 0,
    draft: safeStatistics.draftContracts?.length || 0,
    incomplete: safeStatistics.incompleteContracts?.length || 0,
    cancelled: safeStatistics.cancelledContracts?.length || 0,
    legal_action: safeStatistics.totalLegalCases?.length || 0,
    pending_completion: 0,
    alerts: 0,
    settings: 0,
  }), [safeContracts, safeStatistics]);

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
      };
      createContract(finalData);
    } catch (error) {
      console.error("Error in contract creation:", error);
      setShowCreationProgress(false);
      throw error;
    }
  }, [user?.id, createContract, resetCreationState]);

  const handleCreationComplete = useCallback(() => {
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

  const handleReactivateContract = useCallback(async (contract: any) => {
    try {
      await updateContractStatus({
        contractId: contract.id,
        status: 'active',
        reason: 'تم إعادة تنشيط العقد'
      });
      refetch();
    } catch (error) {
      console.error('Error reactivating contract:', error);
    }
  }, [updateContractStatus, refetch]);

  const handleRemoveLegalProcedure = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowRemoveLegalDialog(true);
  }, []);

  const handleConvertToLegal = useCallback(async (contract: any) => {
    if (!contract || !companyId) return;
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: 'under_legal_procedure',
          legal_status: 'under_legal_action',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: 'تم التحويل للشؤون القانونية',
        description: `تم تحويل العقد #${contract.contract_number} للإجراء القانوني`,
      });

      refetch();
    } catch (error: any) {
      console.error('خطأ في التحويل للشؤون القانونية:', error);
      toast({
        title: 'خطأ في التحويل',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    }
  }, [companyId, toast, refetch]);

  const executeRemoveLegalProcedure = useCallback(async () => {
    if (!selectedContract || !companyId) return;
    setIsRemovingLegal(true);
    try {
      const updateData: any = {
        legal_status: null,
        updated_at: new Date().toISOString()
      };
      if (selectedContract.status === 'under_legal_procedure') {
        updateData.status = 'active';
      }

      const { error: contractError } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', selectedContract.id)
        .eq('company_id', companyId);

      if (contractError) throw contractError;

      await supabase
        .from('legal_cases')
        .delete()
        .eq('contract_id', selectedContract.id)
        .eq('company_id', companyId);

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

  const handleDeleteContract = useCallback((contract: any) => {
    setSelectedContract(contract);
    setShowDeleteDialog(true);
  }, []);

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

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-500">جاري تحميل العقود...</p>
        </div>
      </div>
    );
  }

  return (
    <PageCustomizer pageId="contracts-page" title="" titleAr="">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
        {/* Header Section */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4">
              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                  <FileSignature className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">إدارة العقود</h1>
                  <p className="text-sm text-slate-500">إدارة ومتابعة جميع عقود الإيجار</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowContractWizard(true)}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300 hover:shadow-xl"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        عقد جديد
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إنشاء عقد جديد</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl border-slate-200">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {user?.roles?.includes('super_admin') && (
                      <DropdownMenuItem onClick={() => setShowCSVUpload(true)}>
                        <Upload className="w-4 h-4 ml-2" />
                        استيراد CSV
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowContractPDFImport(true)}>
                      <FileText className="w-4 h-4 ml-2" />
                      استيراد PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRemindersDialog(true)}>
                      <MessageSquare className="w-4 h-4 ml-2" />
                      إرسال تنبيهات
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/contracts/signed-agreements')}>
                      <FileSignature className="w-4 h-4 ml-2" />
                      العقود الموقعة
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                      <Download className="w-4 h-4 ml-2" />
                      تصدير البيانات
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Statistics Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <QuickStatCard
              title="الإيرادات المتوقعة"
              value={formatCurrency(safeStatistics.totalRevenue || 0)}
              icon={TrendingUp}
              color="blue"
              badge={{ label: "شهرياً", color: "blue" }}
              details={[
                { label: "من العقود النشطة", value: safeStatistics.activeContracts?.length || 0, dotColor: "bg-emerald-500" },
                { label: "قيد المراجعة", value: safeStatistics.underReviewContracts?.length || 0, dotColor: "bg-amber-500" },
              ]}
              accentColor="border-blue-500"
            />
            <QuickStatCard
              title="حالة العمليات"
              value={safeContracts.length}
              icon={FileText}
              color="slate"
              details={[
                { label: "منتهية", value: safeStatistics.expiredContracts?.length || 0, dotColor: "bg-rose-500" },
                { label: "ملغية", value: safeStatistics.cancelledContracts?.length || 0, dotColor: "bg-slate-400" },
                { label: "نشطة", value: safeStatistics.activeContracts?.length || 0, dotColor: "bg-emerald-500" },
              ]}
              accentColor="border-slate-400"
            />
            <QuickStatCard
              title="القضايا القانونية"
              value={tabCounts.legal_action}
              icon={Scale}
              color="rose"
              badge={{ label: "إجمالي القضايا", color: "rose" }}
              details={[
                { label: "عقود خاضعة/قانونية", value: safeStatistics.legalProcedureContracts?.length || 0, dotColor: "bg-rose-500" },
                { label: "عقود ما زالت نشطة", value: (safeStatistics.activeWithLegalIssues?.length || 0), dotColor: "bg-amber-500" },
              ]}
              accentColor="border-rose-500"
            />
            <QuickStatCard
              title="العقود النشطة"
              value={tabCounts.active}
              icon={CheckCircle}
              color="emerald"
              badge={{ label: "قيد التنفيذ", color: "emerald" }}
              details={[
                { label: "عقود سالمة", value: (tabCounts.active - (safeStatistics.activeWithLegalIssues?.length || 0)), dotColor: "bg-emerald-500" },
              ]}
              accentColor="border-emerald-500"
            />
          </motion.div>

          {/* Contracts Needing Attention */}
          <AnimatePresence>
            {safeContracts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ContractsNeedingAttention contracts={safeContracts} />
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
                className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-violet-200/50 p-6"
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

          {/* Search & Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="بحث برقم العقد، اسم العميل، رقم الجوال، الرقم الشخصي، رقم المركبة..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="h-12 pr-12 text-base bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                >
                  <option value="default">ترتيب افتراضي</option>
                  <option value="customer_name">حسب اسم العميل</option>
                  <option value="contract_date">حسب تاريخ العقد</option>
                  <option value="end_date">حسب تاريخ الانتهاء</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-slate-200/60 bg-slate-50/50">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex p-2 gap-1">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const count = tabCounts[tab.id as keyof typeof tabCounts];
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
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
                        <span>{tab.label}</span>
                        {count > 0 && tab.id !== 'settings' && (
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
            <div className="p-6">
              {activeTab === "settings" ? (
                <LateFinesSettings />
              ) : sortedContracts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد عقود</h3>
                  {searchTerm ? (
                    <>
                      <p className="text-slate-500 mb-6">لم يتم العثور على نتائج للبحث: "{searchTerm}"</p>
                      <Button variant="outline" onClick={() => setSearchTerm("")} className="rounded-xl">
                        <XCircle className="w-4 h-4 ml-2" />
                        مسح البحث
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 mb-6">ابدأ بإنشاء عقد جديد</p>
                      <Button 
                        onClick={() => setShowContractWizard(true)}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء عقد جديد
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {sortedContracts.map((contract) => (
                    <ContractListItem
                      key={contract.id}
                      contract={contract}
                      onView={handleViewDetails}
                      onEdit={(c) => {
                        setContractToEdit(c);
                        setShowContractWizard(true);
                      }}
                      onRenew={handleRenewContract}
                      onCancel={handleCancelContract}
                      onDelete={handleDeleteContract}
                      onManageStatus={handleManageStatus}
                      onConvertToLegal={handleConvertToLegal}
                      onRemoveLegal={handleRemoveLegalProcedure}
                      onReactivate={handleReactivateContract}
                      isReactivating={isReactivating}
                    />
                  ))}
                </motion.div>
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
            if (!open) setContractToEdit(undefined);
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
                className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full"
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
        <ContractDeleteDialog 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog} 
          contract={selectedContract} 
          onSuccess={() => refetch()} 
        />
        <UnifiedContractUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false);
            refetch();
          }}
        />
        <BulkDeleteContractsDialog 
          open={showBulkDelete} 
          onOpenChange={setShowBulkDelete} 
        />
        
        {/* Remove Legal Procedure Dialog */}
        <AlertDialog open={showRemoveLegalDialog} onOpenChange={setShowRemoveLegalDialog}>
          <AlertDialogContent className="rounded-2xl" dir="rtl">
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
                      سيتم إعادة العقد للحالة النشطة وحذف سجل العميل المتعثر إن وجد.
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

        <SendRemindersDialog
          open={showRemindersDialog}
          onOpenChange={setShowRemindersDialog}
          contracts={safeContracts as any || []}
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
