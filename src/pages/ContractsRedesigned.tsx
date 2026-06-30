import { CSSProperties, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { EmptyState } from '@/components/ui/EmptyState';
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";

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

const contractsTheme = systemColorPattern.colors;
const contractsSystemStyle = {
  '--contracts-text': contractsTheme.text,
  '--contracts-surface': contractsTheme.surface,
  '--contracts-inner': contractsTheme.innerSurface,
  '--contracts-muted': contractsTheme.secondaryText,
  '--contracts-border': contractsTheme.border,
  '--contracts-info': contractsTheme.info,
  '--contracts-alert': contractsTheme.alert,
  '--contracts-focus': contractsTheme.focus,
  '--contracts-success': contractsTheme.success,
} as CSSProperties;

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
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300",
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
    return formatCustomerName(contract.customers);
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
        "group relative bg-white rounded-xl border p-5 transition-all duration-300",
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
               size="default"
               onClick={() => onView(contract)}
               className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
             >
               <Eye className="w-4 h-4 ml-1.5" />
               عرض
             </Button>

             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" size="default" className="rounded-xl border-slate-200 dark:border-slate-700 px-3 min-h-[44px]">
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
        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(draft.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
           <Button
             variant="outline"
             size="default"
             className="w-full rounded-xl border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 min-h-[44px]"
             onClick={() => onLoad(draft.id)}
           >
             <FileEdit className="h-4 w-4 ml-2" />
             استئناف التحرير
           </Button>
  </motion.div>
);

const OperationsMetric = ({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  caption?: string;
  icon: React.ElementType;
  tone?: "success" | "info" | "focus" | "alert" | "neutral";
}) => {
  const toneClass = {
    success: "bg-[#E8FBF6] text-[#22C7A1]",
    info: "bg-[#EAF8FE] text-[#38BDF8]",
    focus: "bg-[#ECEEFE] text-[#7C83F6]",
    alert: "bg-[#FFF0F2] text-[#FB6B7A]",
    neutral: "bg-[#F6F8FB] text-[#64748B]",
  }[tone];

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#94A3B8]">{label}</p>
          <div className="mt-2 text-2xl font-black text-[#020617]">{value}</div>
          {caption && <p className="mt-1 text-xs font-bold text-[#64748B]">{caption}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
};

const getContractCustomerName = (contract: Contract) => formatCustomerName(contract.customers) || "عميل غير محدد";

const getContractVehicleInfo = (contract: Contract) => {
  const vehicle = contract.vehicle;
  if (!vehicle) return "مركبة غير محددة";
  const make = vehicle.make_ar || vehicle.make || "";
  const model = vehicle.model_ar || vehicle.model || "";
  const year = vehicle.year || "";
  return `${make} ${model} ${year}`.trim() || "مركبة غير محددة";
};

const getContractPlate = (contract: Contract) => contract.vehicle?.plate_number || "-";

const getContractDaysLeft = (date?: string) => {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? days : null;
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
    active: { label: "نشط", className: "bg-[#E8FBF6] text-[#22C7A1] border-[#BFEFE4]", icon: CheckCircle },
    draft: { label: "مسودة", className: "bg-[#ECEEFE] text-[#7C83F6] border-[#D8D9FF]", icon: FileEdit },
    under_review: { label: "قيد المراجعة", className: "bg-[#EAF8FE] text-[#38BDF8] border-[#BEE9FB]", icon: Clock },
    cancelled: { label: "ملغي", className: "bg-[#FFF0F2] text-[#FB6B7A] border-[#FFD5DC]", icon: XCircle },
    expired: { label: "منتهي", className: "bg-[#FFF0F2] text-[#FB6B7A] border-[#FFD5DC]", icon: XOctagon },
    expiring_soon: { label: "قارب الانتهاء", className: "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]", icon: AlertTriangle },
    under_legal_procedure: { label: "إجراء قانوني", className: "bg-[#ECEEFE] text-[#7C83F6] border-[#D8D9FF]", icon: Scale },
    pending_completion: { label: "بانتظار الإكمال", className: "bg-[#EAF8FE] text-[#38BDF8] border-[#BEE9FB]", icon: Clock },
  };
  const config = statusMap[status] || statusMap.active;
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
      {(legalStatus || status === "under_legal_procedure") && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D9FF] bg-[#ECEEFE] px-2.5 py-1 text-xs font-black text-[#7C83F6]">
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
    <div className="mb-1 flex items-center gap-1 text-xs font-bold text-[#94A3B8]">
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
  const { formatCurrency } = useCurrencyFormatter();
  const isActive = contract.status === "active";
  const isCancelled = contract.status === "cancelled";
  const hasLegalStatus = Boolean(contract.legal_status || contract.status === "under_legal_procedure");
  const daysLeft = getContractDaysLeft(contract.end_date);
  const progress = contract.contract_amount
    ? Math.min(100, Math.max(0, ((contract.total_paid || 0) / contract.contract_amount) * 100))
    : 0;

  return (
    <motion.div
      variants={itemVariants}
      onClick={() => onView(contract)}
      className={cn(
        "group rounded-[8px] border bg-white p-4 transition-all duration-200 hover:border-[#B7C4D6] hover:shadow-[0_18px_45px_-34px_rgba(15,23,42,.7)]",
        isActive && "border-[#BFEFE4]",
        isCancelled && "border-[#FFD5DC]",
        hasLegalStatus && "border-[#D8D9FF]"
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.15fr)_minmax(220px,.78fr)_minmax(260px,.9fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className={cn(
              "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]",
              isActive ? "bg-[#E8FBF6] text-[#22C7A1]" :
              isCancelled ? "bg-[#FFF0F2] text-[#FB6B7A]" :
              hasLegalStatus ? "bg-[#ECEEFE] text-[#7C83F6]" : "bg-[#F6F8FB] text-[#64748B]"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-[#020617]">{getContractCustomerName(contract)}</h3>
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
                  {getContractPlate(contract)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CompactDatum label="البداية" value={formatDateInGregorian(contract.start_date)} icon={Calendar} />
          <CompactDatum label="النهاية" value={formatDateInGregorian(contract.end_date)} icon={Clock} />
          <div className="col-span-2 rounded-[8px] bg-[#F8FAFC] px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#94A3B8]">
              <span>المدة المتبقية</span>
              <span>{daysLeft === null ? "-" : daysLeft > 0 ? `${daysLeft} يوم` : "منتهي"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className={cn("h-full rounded-full", daysLeft !== null && daysLeft < 30 ? "bg-[#FB6B7A]" : "bg-[#22C7A1]")}
                style={{ width: `${daysLeft === null ? 0 : Math.max(8, Math.min(100, daysLeft / 4))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <CompactDatum label="الإيجار الشهري" value={formatCurrency(contract.monthly_amount || 0)} icon={Wallet} strong />
          <CompactDatum label="قيمة العقد" value={formatCurrency(contract.contract_amount || 0)} icon={TrendingUp} strong />
          <div className="rounded-[8px] bg-[#F8FAFC] px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#94A3B8]">
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
              <Button variant="outline" size="default" className="h-10 rounded-[8px] border-[#DDE5EF] px-3">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" dir="rtl">
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
                  <DropdownMenuItem onClick={() => onCancel(contract)} className="text-[#FB6B7A] focus:text-[#FB6B7A]">
                    <XCircle className="ml-2 h-4 w-4" />
                    إلغاء العقد
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertToLegal(contract)} className="text-[#7C83F6] focus:text-[#7C83F6]">
                    <Scale className="ml-2 h-4 w-4" />
                    تحويل للشؤون القانونية
                  </DropdownMenuItem>
                </>
              )}
              {isCancelled && (
                <>
                  <DropdownMenuItem onClick={() => onReactivate(contract)} disabled={isReactivating}>
                    <Play className="ml-2 h-4 w-4" />
                    {isReactivating ? "جاري التنشيط..." : "تنشيط العقد"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onConvertToLegal(contract)} className="text-[#7C83F6] focus:text-[#7C83F6]">
                    <Scale className="ml-2 h-4 w-4" />
                    تحويل للشؤون القانونية
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(contract)} className="text-[#FB6B7A] focus:text-[#FB6B7A]">
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف نهائي
                  </DropdownMenuItem>
                </>
              )}
              {hasLegalStatus && (
                <DropdownMenuItem onClick={() => onRemoveLegal(contract)} className="text-[#22C7A1] focus:text-[#22C7A1]">
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

  // When the active tab/search/sort changes the filtered list may shrink, and the
  // browser would otherwise clamp the scroll position to a jarring mid-page spot.
  // Smoothly return to the top so the user starts at the new list's first item.
  const prevFilterRef = useRef<{ tab: string; search: string; sort: string }>({
    tab: activeTab,
    search: debouncedSearchTerm,
    sort: sortBy,
  });
  useEffect(() => {
    const prev = prevFilterRef.current;
    const changed =
      prev.tab !== activeTab ||
      prev.search !== debouncedSearchTerm ||
      prev.sort !== sortBy;
    if (!changed) return;
    prevFilterRef.current = { tab: activeTab, search: debouncedSearchTerm, sort: sortBy };
    const scroller =
      document.querySelector('main[role="main"]') as HTMLElement | null;
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, debouncedSearchTerm, sortBy]);

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
      <div
        className="flex items-center justify-center min-h-screen bg-[#F6F8FB]"
        style={contractsSystemStyle}
      >
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-[#94A3B8]">جاري تحميل العقود...</p>
        </div>
      </div>
    );
  }

  return (
    <PageCustomizer pageId="contracts-page" title="" titleAr="">
      <div
        className="contracts-system min-h-screen bg-[#F6F8FB]"
        dir="rtl"
        style={contractsSystemStyle}
      >
        <header className="contracts-command-header sticky top-0 z-40 border-b border-[#DDE5EF] bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#102B4E] text-white shadow-[0_18px_32px_-24px_rgba(16,43,78,.8)]">
                  <FileSignature className="h-6 w-6" />
                </div>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-xs font-black text-[#22C7A1]">مركز العقود</span>
                    <span className="rounded-full bg-[#EAF8FE] px-3 py-1 text-xs font-black text-[#38BDF8]">تشغيل ومتابعة</span>
                  </div>
                  <h1 className="text-2xl font-black text-[#020617]">إدارة العقود</h1>
                  <p className="text-sm font-bold text-[#64748B]">تابع العقود النشطة، التحصيل، المسودات، والحالات القانونية من شاشة واحدة.</p>
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="h-11 rounded-[8px] border-[#DDE5EF] px-3">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" dir="rtl">
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
        {/* Header Section */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4">
              {/* Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
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
                         className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-300 hover:shadow-xl min-h-[44px]"
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
                     <Button variant="outline" size="default" className="rounded-xl border-slate-200 dark:border-slate-700 min-h-[44px]">
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
                   size="default"
                   className="rounded-xl border-slate-200 dark:border-slate-700 min-h-[44px]"
                   disabled={isRefreshing}
                 >
                   <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                 </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="contracts-workspace max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <section className="rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black text-[#22C7A1]">لوحة تشغيل العقود</p>
                <h2 className="mt-1 text-xl font-black text-[#020617]">ما الذي يحتاج انتباهك الآن؟</h2>
                <p className="mt-1 text-sm font-bold text-[#64748B]">ابدأ من الحالة، ثم افتح العقد أو نفّذ إجراء سريع بدون مغادرة السجل.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-[#E8FBF6] px-3 py-1 text-[#22C7A1]">{tabCounts.active} نشط</span>
                <span className="rounded-full bg-[#FFF0F2] px-3 py-1 text-[#FB6B7A]">{tabCounts.cancelled} ملغى</span>
                <span className="rounded-full bg-[#ECEEFE] px-3 py-1 text-[#7C83F6]">{tabCounts.legal_action} قانوني</span>
              </div>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <OperationsMetric
                label="إجمالي العقود"
                value={safeContracts.length}
                caption={`${sortedContracts.length} ضمن الفلتر الحالي`}
                icon={FileText}
                tone="neutral"
              />
              <OperationsMetric
                label="العقود النشطة"
                value={tabCounts.active}
                caption="جاهزة للتشغيل والتحصيل"
                icon={CheckCircle}
                tone="success"
              />
              <OperationsMetric
                label="الإيراد المتوقع"
                value={formatCurrency(safeStatistics.totalRevenue || 0)}
                caption="من العقود المسجلة"
                icon={TrendingUp}
                tone="info"
              />
              <OperationsMetric
                label="ملفات قانونية"
                value={tabCounts.legal_action}
                caption="تحتاج متابعة منفصلة"
                icon={Scale}
                tone="focus"
              />
            </motion.div>
          </section>
          {/* Statistics Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4"
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

          <section className="contracts-filter-panel rounded-[8px] border border-[#DDE5EF] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,.58)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                <Input
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
                    onClick={() => setSearchTerm("")}
                    className="absolute left-3 top-1/2 rounded-[8px] p-1.5 text-[#94A3B8] transition hover:bg-[#EEF2F7]"
                    aria-label="مسح البحث"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as any)}
                className="h-12 rounded-[8px] border border-[#DDE5EF] bg-white px-4 text-sm font-black text-[#020617] outline-none transition focus:border-[#22C7A1] focus:ring-2 focus:ring-[#22C7A1]/20"
              >
                <option value="default">الترتيب الافتراضي</option>
                <option value="customer_name">حسب اسم العميل</option>
                <option value="contract_date">الأحدث حسب تاريخ العقد</option>
                <option value="end_date">الأقرب انتهاءً</option>
              </select>
            </div>
          </section>

          {/* Search & Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4">
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
                   className="h-12 pr-12 text-base bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 transition-all"
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
                   className="h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
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
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
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
                        <span>{getContractTabLabel(tab.id)}</span>
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
                  <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-6">
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
                        className="bg-teal-500 text-white rounded-xl"
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
        <style>{`
          .contracts-system {
            --contracts-radius: 8px;
            color: var(--contracts-text);
          }

          .contracts-system > header:not(.contracts-command-header) {
            display: none !important;
          }

          .contracts-workspace > .grid.grid-cols-2.sm\\:grid-cols-2.lg\\:grid-cols-4 {
            display: none !important;
          }

          .contracts-workspace > .bg-white.rounded-xl.border.border-slate-200\\/60.shadow-sm.p-4 {
            display: none !important;
          }

          .contracts-system header,
          .contracts-system .bg-white {
            background-color: var(--contracts-surface) !important;
          }

          .contracts-system .bg-slate-50,
          .contracts-system .bg-slate-100,
          .contracts-system .bg-gray-50,
          .contracts-system .bg-neutral-50 {
            background-color: var(--contracts-inner) !important;
          }

          .contracts-system .border-slate-100,
          .contracts-system .border-slate-200,
          .contracts-system .border-slate-200\\/50,
          .contracts-system .border-slate-200\\/60,
          .contracts-system .border-slate-300,
          .contracts-system .border-gray-200,
          .contracts-system .border-neutral-100 {
            border-color: var(--contracts-border) !important;
          }

          .contracts-system .text-slate-900,
          .contracts-system .text-slate-800,
          .contracts-system .text-slate-700,
          .contracts-system .text-gray-900,
          .contracts-system .text-neutral-900 {
            color: var(--contracts-text) !important;
          }

          .contracts-system .text-slate-600,
          .contracts-system .text-slate-500,
          .contracts-system .text-slate-400,
          .contracts-system .text-gray-500,
          .contracts-system .text-neutral-500 {
            color: var(--contracts-muted) !important;
          }

          .contracts-system .rounded-2xl,
          .contracts-system .rounded-xl,
          .contracts-system .rounded-lg,
          .contracts-system .rounded-md {
            border-radius: var(--contracts-radius) !important;
          }

          .contracts-system .shadow-sm,
          .contracts-system .shadow-md,
          .contracts-system .shadow-lg,
          .contracts-system .shadow-xl {
            box-shadow: 0 14px 30px -24px rgba(2, 6, 23, 0.42) !important;
          }

          .contracts-system .bg-teal-500,
          .contracts-system .bg-teal-600,
          .contracts-system .bg-emerald-500,
          .contracts-system .bg-green-500 {
            background-color: var(--contracts-success) !important;
          }

          .contracts-system .hover\\:bg-teal-600:hover,
          .contracts-system .hover\\:bg-emerald-700:hover,
          .contracts-system .hover\\:bg-green-100:hover {
            background-color: rgba(34, 199, 161, 0.16) !important;
          }

          .contracts-system .text-teal-500,
          .contracts-system .text-teal-600,
          .contracts-system .text-emerald-500,
          .contracts-system .text-emerald-600,
          .contracts-system .text-emerald-700,
          .contracts-system .text-green-600,
          .contracts-system .focus\\:text-emerald-600:focus {
            color: var(--contracts-success) !important;
          }

          .contracts-system .bg-teal-50,
          .contracts-system .bg-emerald-50,
          .contracts-system .bg-emerald-100,
          .contracts-system .bg-green-50 {
            background-color: rgba(34, 199, 161, 0.1) !important;
          }

          .contracts-system .border-teal-500,
          .contracts-system .border-emerald-200,
          .contracts-system .border-emerald-500,
          .contracts-system .focus\\:border-teal-500:focus {
            border-color: rgba(34, 199, 161, 0.32) !important;
          }

          .contracts-system .bg-blue-50,
          .contracts-system .bg-blue-100,
          .contracts-system .bg-violet-50,
          .contracts-system .bg-violet-100,
          .contracts-system .bg-purple-50,
          .contracts-system .bg-purple-100,
          .contracts-system .bg-indigo-100,
          .contracts-system .bg-indigo-200 {
            background-color: rgba(124, 131, 246, 0.1) !important;
          }

          .contracts-system .bg-blue-500,
          .contracts-system .bg-violet-500,
          .contracts-system .bg-purple-500,
          .contracts-system .bg-indigo-500 {
            background-color: var(--contracts-focus) !important;
          }

          .contracts-system .text-blue-500,
          .contracts-system .text-blue-600,
          .contracts-system .text-blue-700,
          .contracts-system .text-blue-800,
          .contracts-system .text-violet-500,
          .contracts-system .text-violet-600,
          .contracts-system .text-violet-700,
          .contracts-system .text-purple-500,
          .contracts-system .text-purple-600,
          .contracts-system .text-purple-700,
          .contracts-system .text-purple-800,
          .contracts-system .text-purple-900,
          .contracts-system .text-indigo-800,
          .contracts-system .text-indigo-900,
          .contracts-system .focus\\:text-purple-600:focus {
            color: var(--contracts-focus) !important;
          }

          .contracts-system .border-blue-200,
          .contracts-system .border-blue-500,
          .contracts-system .border-violet-200,
          .contracts-system .border-violet-500,
          .contracts-system .border-purple-200,
          .contracts-system .border-purple-300,
          .contracts-system .border-purple-400,
          .contracts-system .border-purple-500,
          .contracts-system .border-indigo-300 {
            border-color: rgba(124, 131, 246, 0.28) !important;
          }

          .contracts-system .bg-rose-50,
          .contracts-system .bg-rose-100,
          .contracts-system .bg-red-50,
          .contracts-system .bg-red-100,
          .contracts-system .bg-orange-50,
          .contracts-system .bg-orange-100 {
            background-color: rgba(251, 107, 122, 0.1) !important;
          }

          .contracts-system .bg-rose-500,
          .contracts-system .bg-red-500,
          .contracts-system .bg-orange-500 {
            background-color: var(--contracts-alert) !important;
          }

          .contracts-system .text-rose-500,
          .contracts-system .text-rose-600,
          .contracts-system .text-rose-700,
          .contracts-system .text-red-500,
          .contracts-system .text-red-600,
          .contracts-system .text-red-700,
          .contracts-system .text-orange-500,
          .contracts-system .text-orange-600,
          .contracts-system .text-orange-700,
          .contracts-system .focus\\:text-rose-600:focus {
            color: var(--contracts-alert) !important;
          }

          .contracts-system .border-rose-200,
          .contracts-system .border-rose-500,
          .contracts-system .border-red-200,
          .contracts-system .border-orange-200 {
            border-color: rgba(251, 107, 122, 0.28) !important;
          }

          .contracts-system .bg-amber-50,
          .contracts-system .bg-amber-100,
          .contracts-system .bg-yellow-50 {
            background-color: rgba(56, 189, 248, 0.12) !important;
          }

          .contracts-system .bg-amber-500,
          .contracts-system .bg-yellow-500 {
            background-color: var(--contracts-info) !important;
          }

          .contracts-system .text-amber-500,
          .contracts-system .text-amber-600,
          .contracts-system .text-amber-700,
          .contracts-system .text-yellow-600 {
            color: var(--contracts-info) !important;
          }

          .contracts-system .border-amber-200,
          .contracts-system .border-amber-500 {
            border-color: rgba(56, 189, 248, 0.28) !important;
          }

          .contracts-system input,
          .contracts-system select,
          .contracts-system textarea {
            background-color: var(--contracts-surface) !important;
            border-color: var(--contracts-border) !important;
            color: var(--contracts-text) !important;
            border-radius: var(--contracts-radius) !important;
          }

          .contracts-system input:focus,
          .contracts-system select:focus,
          .contracts-system textarea:focus {
            border-color: var(--contracts-success) !important;
            box-shadow: 0 0 0 3px rgba(34, 199, 161, 0.12) !important;
          }

          .contracts-system button[class*="bg-teal-500"],
          .contracts-system button[class*="bg-emerald-600"],
          .contracts-system button[class*="bg-slate-900"] {
            background-color: var(--contracts-success) !important;
            color: #ffffff !important;
            box-shadow: 0 12px 24px -18px rgba(34, 199, 161, 0.72) !important;
          }

          .contracts-system .hover\\:bg-slate-50:hover,
          .contracts-system .hover\\:bg-slate-200:hover,
          .contracts-system .hover\\:bg-white\\/50:hover {
            background-color: rgba(56, 189, 248, 0.08) !important;
          }

          .contracts-system .bg-gradient-to-br,
          .contracts-system .bg-gradient-to-r {
            background: var(--contracts-inner) !important;
          }
        `}</style>
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
