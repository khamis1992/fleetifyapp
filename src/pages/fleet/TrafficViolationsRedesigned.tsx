import React, {
  useEffect,
  useState,
  useMemo,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  FileWarning,
  Printer,
  ChevronDown,
  Eye,
  CreditCard,
  Edit,
  Upload,
  List,
  RefreshCw,
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  ReceiptText,
  Send,
  ShieldAlert,
  Sparkles,
  FolderUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  useTrafficViolations,
  TrafficViolation,
  useDeleteTrafficViolation,
  useDeleteAllTrafficViolations,
  useTrafficViolationsStats,
} from "@/hooks/useTrafficViolations";
import { CustomerAssignmentDialog } from "@/components/fleet/violations-workspace/CustomerAssignmentDialog";
import { TrafficViolationsSmartDashboard } from "@/components/fleet/TrafficViolationsSmartDashboard";
import { TrafficViolationsAlertsPanel } from "@/components/fleet/TrafficViolationsAlertsPanel";
import { TrafficViolationSidePanel } from "@/components/fleet/TrafficViolationSidePanel";
import { TrafficViolationReportDialog } from "@/components/fleet/TrafficViolationReportDialog";
import { ViolationInboxDropzone } from "@/components/fleet/ViolationInboxDropzone";
import { TrafficViolationReminderDialog } from "@/components/fleet/TrafficViolationReminderDialog";
import { TrafficViolationsAIAdvisor } from "@/components/fleet/TrafficViolationsAIAdvisor";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import "@/components/fleet/violations-workspace/workspace.css";
import { TrafficMailSyncControl } from "@/components/fleet/TrafficMailSyncControl";
import { useRolePermissions } from "@/hooks/useRolePermissions";

// Lazy load heavy components for better performance
const TrafficViolationForm = lazy(() =>
  import("@/components/fleet/TrafficViolationForm").then((m) => ({
    default: m.TrafficViolationForm,
  }))
);
const TrafficViolationPaymentsDialog = lazy(() =>
  import("@/components/fleet/TrafficViolationPaymentsDialog").then((m) => ({
    default: m.TrafficViolationPaymentsDialog,
  }))
);
const TrafficViolationPDFImport = lazy(() =>
  import("@/components/fleet/TrafficViolationPDFImport").then((m) => ({
    default: m.TrafficViolationPDFImport,
  }))
);
const TrafficFilesImport = lazy(() =>
  import("@/components/fleet/TrafficFilesImport").then((m) => ({
    default: m.TrafficFilesImport,
  }))
);

export default function TrafficViolationsRedesigned() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("list");
  const refreshWorkspace = () =>
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).includes("traffic"),
    });
  const safeViolationDate = (value?: string | null) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleDateString("ar-QA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "غير محدد";
  const companyId = useCurrentCompanyId();
  const rolePermissions = useRolePermissions();

  // State Management
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");
  const [filterCar, setFilterCar] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("all");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<TrafficViolation | null>(null);
  const [selectedViolation, setSelectedViolation] =
    useState<TrafficViolation | null>(null);
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isRelinkDialogOpen, setIsRelinkDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const [selectedViolationsForReminder, setSelectedViolationsForReminder] =
    useState<TrafficViolation[]>([]);

  // Data Fetching - Reduced limit for better performance (was 10000!)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const isServerFilteringActive =
    searchTerm.trim().length > 0 ||
    filterStatus !== "all" ||
    filterPaymentStatus !== "all" ||
    filterCar !== "all" ||
    filterCustomer !== "all";

  // When switching filters/search, reset pagination to the first page
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterStatus,
    filterPaymentStatus,
    filterCar,
    filterCustomer,
  ]);

  const {
    data: violations = [],
    isLoading,
    isError,
    refetch,
  } = useTrafficViolations({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    enabled: !isServerFilteringActive,
  });
  const { data: allViolationStats } = useTrafficViolationsStats();
  const { data: companyLiabilityViolations = [] } = useQuery({
    queryKey: ["company-traffic-violation-liabilities", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("traffic_violations")
        .select(
          `
          id,
          violation_number,
          violation_date,
          fine_amount,
          status,
          liability_amount,
          liability_recognized_at,
          liability_journal_entry_id,
          original_contract_number,
          responsibility_reason,
          vehicles (plate_number, make, model)
        `
        )
        .eq("company_id", companyId)
        .eq("responsibility_party", "company")
        .order("liability_recognized_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["traffic-violations-filter-vehicles", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("plate_number")
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // When search/filters are active, fetch matching violations server-side
  const {
    data: serverFilteredViolations = [],
    isLoading: isLoadingServerFiltered,
    isError: serverError,
  } = useQuery({
    queryKey: [
      "traffic-violations-server-filtered",
      companyId,
      searchTerm,
      filterStatus,
      filterPaymentStatus,
      filterCar,
      filterCustomer,
    ],
    enabled: isServerFilteringActive && !!companyId,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.user.id)
        .single();

      if (!profile?.company_id) return [];

      const rawTerm = searchTerm.trim();
      const termNoHash = rawTerm.replace(/^#/, "");
      const termDigits = rawTerm.replace(/\D/g, "");
      const safeTerm = termNoHash.replace(/[(),]/g, " ").trim();
      const safeDigits = termDigits.replace(/[(),]/g, " ").trim();
      const relatedCustomerIds = new Set<string>();
      const relatedContractIds = new Set<string>();

      if (safeTerm.length > 0 || safeDigits.length > 0) {
        const customerSearchParts: string[] = [];
        const contractSearchParts: string[] = [];
        const addRelatedSearchTerm = (term: string) => {
          if (!term) return;
          customerSearchParts.push(`first_name.ilike.%${term}%`);
          customerSearchParts.push(`last_name.ilike.%${term}%`);
          customerSearchParts.push(`company_name.ilike.%${term}%`);
          customerSearchParts.push(`phone.ilike.%${term}%`);
          contractSearchParts.push(`contract_number.ilike.%${term}%`);
        };

        addRelatedSearchTerm(safeTerm);
        if (safeDigits && safeDigits !== safeTerm)
          addRelatedSearchTerm(safeDigits);

        if (customerSearchParts.length > 0) {
          const { data: customersMatches } = await supabase
            .from("customers")
            .select("id")
            .eq("company_id", profile.company_id)
            .or(customerSearchParts.join(","))
            .limit(100);
          (customersMatches || []).forEach((customer) =>
            relatedCustomerIds.add(customer.id)
          );
        }

        if (contractSearchParts.length > 0) {
          const { data: contractMatches } = await supabase
            .from("contracts")
            .select("id, customer_id")
            .eq("company_id", profile.company_id)
            .or(contractSearchParts.join(","))
            .limit(100);
          (contractMatches || []).forEach((contract) => {
            relatedContractIds.add(contract.id);
            if (contract.customer_id)
              relatedCustomerIds.add(contract.customer_id);
          });
        }
      }

      let query = supabase
        .from("penalties")
        .select(
          `
            id,
            penalty_number,
            violation_type,
            penalty_date,
            amount,
            location,
            vehicle_plate,
            vehicle_id,
            reason,
            notes,
            status,
            payment_status,
            customer_id,
            contract_id,
            created_at,
            updated_at,
            vehicles (
              id,
              plate_number,
              make,
              model,
              year,
              registration_expiry
            ),
            customers (
              id,
              first_name,
              last_name,
              company_name,
              phone
            ),
            contracts (
              id,
              contract_number,
              status,
              start_date,
              end_date,
              customer_id,
              customers (
                id,
                first_name,
                last_name,
                company_name,
                phone
              )
            )
          `
        )
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(500);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (filterPaymentStatus !== "all") {
        query = query.eq("payment_status", filterPaymentStatus);
      }
      if (filterCustomer !== "all") {
        query = query.eq("customer_id", filterCustomer);
      }
      if (filterCar !== "all") {
        // allow both vehicle_id and raw plate number selection
        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            filterCar
          );
        query = looksLikeUuid
          ? query.or(`vehicle_id.eq.${filterCar},vehicle_plate.eq.${filterCar}`)
          : query.eq("vehicle_plate", filterCar);
      }

      if (safeTerm.length > 0 || safeDigits.length > 0) {
        const orParts: string[] = [];
        const addTerm = (t: string) => {
          if (!t) return;
          orParts.push(`penalty_number.ilike.%${t}%`);
          orParts.push(`vehicle_plate.ilike.%${t}%`);
          orParts.push(`violation_type.ilike.%${t}%`);
          orParts.push(`reason.ilike.%${t}%`);
          orParts.push(`location.ilike.%${t}%`);
        };
        addTerm(safeTerm);
        if (safeDigits && safeDigits !== safeTerm) addTerm(safeDigits);
        if (relatedCustomerIds.size > 0) {
          orParts.push(
            `customer_id.in.(${Array.from(relatedCustomerIds).join(",")})`
          );
        }
        if (relatedContractIds.size > 0) {
          orParts.push(
            `contract_id.in.(${Array.from(relatedContractIds).join(",")})`
          );
        }
        query = query.or(orParts.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TrafficViolation[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["traffic-violations-count", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.user.id)
        .single();

      if (!profile?.company_id) return 0;

      const { count } = await supabase
        .from("penalties")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id);

      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteViolationMutation = useDeleteTrafficViolation();
  const deleteAllViolationsMutation = useDeleteAllTrafficViolations();
  const { formatCurrency } = useCurrencyFormatter();

  // Fetch customers for filter
  const { data: customers = [] } = useQuery({
    queryKey: ["traffic-violations-customers-for-filter", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, first_name, last_name, company_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name")
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isAnyLoading = isServerFilteringActive
    ? isLoadingServerFiltered
    : isLoading;
  const hasQueryError = isServerFilteringActive ? serverError : isError;

  // Helper Functions
  const getCarName = useCallback((violation: TrafficViolation) => {
    if (violation.vehicles) {
      return `${violation.vehicles.make} ${violation.vehicles.model} (${violation.vehicles.plate_number})`;
    }
    if (violation.vehicle_plate) {
      return violation.vehicle_plate;
    }
    return "غير معروف";
  }, []);

  const getCustomerName = useCallback((violation: TrafficViolation) => {
    if (violation.customers) {
      const fullName = `${violation.customers.first_name || ""} ${
        violation.customers.last_name || ""
      }`.trim();
      return fullName || violation.customers.company_name || "غير محدد";
    }
    if (violation.contracts?.customers) {
      const fullName = `${violation.contracts.customers.first_name || ""} ${
        violation.contracts.customers.last_name || ""
      }`.trim();
      return (
        fullName || violation.contracts.customers.company_name || "غير محدد"
      );
    }
    return "غير محدد";
  }, []);

  const sourceViolations = isServerFilteringActive
    ? serverFilteredViolations
    : violations;

  // Filtering Logic
  const filteredViolations = useMemo(() => {
    if (isServerFilteringActive) return sourceViolations;
    return sourceViolations.filter((v) => {
      const matchesSearch =
        v.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCarName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(v).toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.violation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || v.status === filterStatus;
      const matchesPaymentStatus =
        filterPaymentStatus === "all" ||
        v.payment_status === filterPaymentStatus;
      const matchesCar =
        filterCar === "all" ||
        v.vehicle_id === filterCar ||
        v.vehicle_plate === filterCar;
      const matchesCustomer =
        filterCustomer === "all" || v.customer_id === filterCustomer;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentStatus &&
        matchesCar &&
        matchesCustomer
      );
    });
  }, [
    sourceViolations,
    searchTerm,
    filterStatus,
    filterPaymentStatus,
    filterCar,
    filterCustomer,
    getCarName,
    getCustomerName,
    isServerFilteringActive,
  ]);
  const resultCount = isServerFilteringActive
    ? filteredViolations.length
    : totalCount;
  const displayPages = Math.max(1, Math.ceil(resultCount / itemsPerPage));
  const visibleViolations = isServerFilteringActive
    ? filteredViolations.slice(
        (Math.min(currentPage, displayPages) - 1) * itemsPerPage,
        Math.min(currentPage, displayPages) * itemsPerPage
      )
    : filteredViolations;

  const violationInsights = useMemo(() => {
    const unpaid = sourceViolations.filter(
      (v) => v.payment_status === "unpaid"
    );
    const partial = sourceViolations.filter(
      (v) => v.payment_status === "partially_paid"
    );
    const paid = sourceViolations.filter((v) => v.payment_status === "paid");
    const unlinked = sourceViolations.filter(
      (v) => !v.customer_id || !v.contract_id
    );
    const unpaidAmount = [...unpaid, ...partial].reduce(
      (sum, v) => sum + Number(v.amount || 0),
      0
    );
    const totalAmount = sourceViolations.reduce(
      (sum, v) => sum + Number(v.amount || 0),
      0
    );

    const currentViewInsights = {
      total: sourceViolations.length,
      shown: filteredViolations.length,
      unpaid: unpaid.length,
      partial: partial.length,
      paid: paid.length,
      unlinked: unlinked.length,
      unpaidAmount,
      totalAmount,
      collectionRate: sourceViolations.length
        ? Math.round((paid.length / sourceViolations.length) * 100)
        : 0,
    };

    if (!isServerFilteringActive && allViolationStats) {
      return {
        total: allViolationStats.total,
        shown: filteredViolations.length,
        unpaid: allViolationStats.unpaidCount,
        partial: allViolationStats.partiallyPaidCount,
        paid: allViolationStats.paidCount,
        unlinked: allViolationStats.unlinkedCount,
        unpaidAmount: allViolationStats.unpaidAmount,
        totalAmount: allViolationStats.totalAmount,
        collectionRate: allViolationStats.collectionRate,
      };
    }

    return currentViewInsights;
  }, [
    allViolationStats,
    filteredViolations.length,
    isServerFilteringActive,
    sourceViolations,
  ]);

  // Handlers
  const handleOpenModal = useCallback(
    (violation: TrafficViolation | null = null) => {
      setModalData(violation);
      setIsModalOpen(true);
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        window.confirm(
          "هل أنت متأكد من إلغاء هذه المخالفة؟ سيبقى السجل محفوظًا لأغراض التدقيق."
        )
      ) {
        try {
          await deleteViolationMutation.mutateAsync(id);
        } catch {
          // The mutation displays the precise reason when a paid record cannot be cancelled.
        }
      }
    },
    [deleteViolationMutation]
  );

  const handleDeleteAllViolations = useCallback(async () => {
    if (deleteAllConfirmText.trim() !== "إلغاء") return;

    try {
      await deleteAllViolationsMutation.mutateAsync();
      setIsDeleteAllDialogOpen(false);
      setDeleteAllConfirmText("");
      setCurrentPage(1);
      setFilterStatus("all");
      setFilterPaymentStatus("all");
      setFilterCar("all");
      setFilterCustomer("all");
      setSearchTerm("");
      await refetch();
    } catch (error) {
      console.error("Failed to cancel traffic violations:", error);
    }
  }, [deleteAllConfirmText, deleteAllViolationsMutation, refetch]);

  const handleOpenReportDialog = useCallback(() => {
    setIsReportDialogOpen(true);
  }, []);

  const handleOpenSidePanel = useCallback((violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsSidePanelOpen(true);
  }, []);

  const handleNavigateToVehicle = useCallback(
    (vehicleId: string) => {
      if (vehicleId) {
        navigate(`/fleet/vehicles/${vehicleId}`);
      }
    },
    [navigate]
  );

  const handleNavigateToCustomer = useCallback(
    (customerId: string) => {
      if (customerId) {
        navigate(`/customers/${customerId}`);
      }
    },
    [navigate]
  );

  const handleNavigateToContract = useCallback(
    (contractId: string) => {
      if (contractId) {
        navigate(`/contracts/${contractId}`);
      }
    },
    [navigate]
  );

  const handleFilterByStatus = useCallback((status: string) => {
    setSection("list");
    if (
      status === "unpaid" ||
      status === "paid" ||
      status === "partially_paid"
    ) {
      setFilterPaymentStatus(status);
    } else {
      setFilterStatus(status);
    }
  }, []);

  const handleEscalateToLegal = useCallback(
    (violation: TrafficViolation) => {
      // Navigate to legal cases with pre-filled data
      navigate("/legal/cases", {
        state: {
          prefillData: {
            customer_id: violation.customer_id,
            violation_id: violation.id,
            amount: violation.amount,
          },
        },
      });
      toast.info("جاري التحويل للشؤون القانونية...");
    },
    [navigate]
  );

  // فتح نافذة إرسال تذكير للمخالفات غير المسددة
  const handleOpenReminderDialog = useCallback(() => {
    // جمع المخالفات غير المسددة
    const unpaidViolations = filteredViolations.filter(
      (v) =>
        v.payment_status === "unpaid" || v.payment_status === "partially_paid"
    );

    if (unpaidViolations.length === 0) {
      toast.error("لا توجد مخالفات غير مسددة");
      return;
    }

    setSelectedViolationsForReminder(unpaidViolations);
    setIsReminderDialogOpen(true);
  }, [filteredViolations]);

  return (
    <div className="violations-workspace" dir="rtl">
      <div className="vw-container">
        <header className="vw-header">
          <div>
            <div className="vw-eyebrow">
              <i />
              إدارة الأسطول <span>/</span> المتابعة والامتثال
            </div>
            <h1>المخالفات المرورية</h1>
            <p>من تسجيل المخالفة إلى تسويتها، كل التفاصيل في مكان واحد.</p>
          </div>
          <div className="vw-actions">
            <button
              className="vw-button"
              onClick={() => void refreshWorkspace()}
            >
              <RefreshCw size={16} />
              تحديث
            </button>
            <button
              className="vw-button vw-primary"
              onClick={() => handleOpenModal(null)}
            >
              <Plus size={17} />
              تسجيل مخالفة
            </button>
          </div>
        </header>
        <div className="vw-overview">
          <section className="vw-balance">
            <div>
              <span className="vw-eyebrow">
                قيمة المخالفات غير مكتملة السداد
              </span>
              <strong>
                {isAnyLoading
                  ? "—"
                  : formatCurrency(violationInsights.unpaidAmount)}
              </strong>
              <p>
                {isServerFilteringActive
                  ? "ضمن نتائج التصفية"
                  : "على مستوى سجل الشركة"}{" "}
                · تشمل القيمة الأصلية للمخالفات المسددة جزئياً
              </p>
            </div>
            <div className="vw-balance-icon">
              <ReceiptText size={32} />
            </div>
            <div className="vw-collection">
              <span>المخالفات المسددة بالكامل</span>
              <b>{violationInsights.collectionRate}%</b>
              <progress value={violationInsights.collectionRate} max={100} />
            </div>
          </section>
          <section className="vw-metrics" aria-label="ملخص المخالفات">
            {[
              {
                label: "إجمالي المخالفات",
                value: violationInsights.total,
                icon: FileWarning,
                payment: "all",
              },
              {
                label: "غير مسددة",
                value: violationInsights.unpaid,
                icon: Clock,
                payment: "unpaid",
              },
              {
                label: "مسددة",
                value: violationInsights.paid,
                icon: CheckCircle2,
                payment: "paid",
              },
              {
                label: "تحتاج ربطاً",
                value: violationInsights.unlinked,
                icon: Link2,
                payment: null,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.payment !== null) {
                    setFilterPaymentStatus(item.payment);
                    setSection("list");
                  } else setIsRelinkDialogOpen(true);
                }}
              >
                <item.icon size={18} />
                <strong>{isAnyLoading ? "—" : item.value}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </section>
        </div>
        <nav className="vw-nav" aria-label="أقسام المخالفات">
          {[
            { id: "list", label: "سجل المخالفات", icon: List },
            { id: "import", label: "استيراد المخالفات", icon: Upload },
            { id: "traffic-files", label: "الملفات المرورية", icon: FolderUp },
            { id: "analysis", label: "التحليل والمتابعة", icon: Sparkles },
            { id: "liabilities", label: "التزامات الشركة", icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>
        {section === "list" && (
          <section className="vw-register">
            <div className="vw-panel-heading">
              <div>
                <h2>سجل المخالفات</h2>
                <p>تابع الحالة والسداد والعميل المسؤول عن كل مخالفة.</p>
              </div>
              <div className="vw-actions">
                <button className="vw-button" onClick={handleOpenReportDialog}>
                  <Printer size={15} />
                  تقرير العرض الحالي
                </button>
                <button
                  className="vw-button"
                  onClick={handleOpenReminderDialog}
                >
                  <Send size={15} />
                  تذكير المعروض
                </button>
                <details className="vw-menu">
                  <summary>
                    المزيد <ChevronDown size={15} />
                  </summary>
                  <div>
                    <button onClick={() => setIsRelinkDialogOpen(true)}>
                      إسناد المخالفات للعملاء
                    </button>
                    <button
                      onClick={() =>
                        navigate("/fleet/traffic-violations/payments")
                      }
                    >
                      سجل المدفوعات
                    </button>
                    {rolePermissions.isAdminOrManager() && (
                      <button
                        className="vw-danger"
                        onClick={() => setIsDeleteAllDialogOpen(true)}
                      >
                        إلغاء المخالفات غير المسددة
                      </button>
                    )}
                  </div>
                </details>
              </div>
            </div>
            <div className="vw-search-row">
              <label className="vw-search">
                <Search size={18} />
                <input
                  aria-label="البحث في المخالفات"
                  placeholder="ابحث برقم المخالفة، اللوحة، العميل أو العقد…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    aria-label="مسح البحث"
                    onClick={() => setSearchTerm("")}
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </label>
            </div>
            <div className="vw-filters">
              <label>
                حالة المخالفة
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">كل الحالات</option>
                  <option value="pending">بانتظار التأكيد</option>
                  <option value="confirmed">مؤكدة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </label>
              <label>
                السداد
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                >
                  <option value="all">كل حالات السداد</option>
                  <option value="unpaid">غير مسددة</option>
                  <option value="partially_paid">مسددة جزئياً</option>
                  <option value="paid">مسددة</option>
                </select>
              </label>
              <label>
                المركبة
                <select
                  value={filterCar}
                  onChange={(e) => setFilterCar(e.target.value)}
                >
                  <option value="all">كل المركبات</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} · {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                العميل
                <select
                  value={filterCustomer}
                  onChange={(e) => setFilterCustomer(e.target.value)}
                >
                  <option value="all">كل العملاء</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ||
                        `${c.first_name || ""} ${c.last_name || ""}`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="vw-clear"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setFilterPaymentStatus("all");
                  setFilterCar("all");
                  setFilterCustomer("all");
                }}
              >
                مسح التصفية
              </button>
            </div>
            <div className="vw-result-heading">
              <span>
                {isAnyLoading ? "جاري تحميل السجل…" : `${resultCount} مخالفة`}
              </span>
              <span>
                الأحدث تسجيلاً أولاً{" "}
                {isServerFilteringActive &&
                serverFilteredViolations.length >= 500
                  ? "· تظهر أول 500 نتيجة، ضيّق البحث للمزيد من الدقة"
                  : ""}
              </span>
            </div>
            {isAnyLoading ? (
              <div className="vw-empty" role="status">
                <LoadingSpinner />
                <p>جاري تحميل المخالفات…</p>
              </div>
            ) : hasQueryError ? (
              <div className="vw-empty" role="alert">
                <AlertTriangle />
                <h3>تعذر تحميل السجل</h3>
                <button
                  className="vw-button"
                  onClick={() => void refreshWorkspace()}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : !filteredViolations.length ? (
              <div className="vw-empty">
                <ShieldAlert size={34} />
                <h3>لا توجد مخالفات ضمن هذا العرض</h3>
                <p>غيّر التصفية أو سجّل مخالفة جديدة.</p>
                <button
                  className="vw-button"
                  onClick={() => handleOpenModal(null)}
                >
                  تسجيل مخالفة
                </button>
              </div>
            ) : (
              <div className="vw-table-scroll">
                <table className="vw-table">
                  <caption className="sr-only">سجل المخالفات المرورية</caption>
                  <thead>
                    <tr>
                      <th>المخالفة</th>
                      <th>المركبة</th>
                      <th>العميل والعقد</th>
                      <th>القيمة</th>
                      <th>الحالة والسداد</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleViolations.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <button
                            className="vw-record-title"
                            onClick={() => handleOpenSidePanel(v)}
                          >
                            {v.violation_type || v.reason || "مخالفة مرورية"}
                          </button>
                          <small>
                            #{v.penalty_number} <span>·</span>{" "}
                            {safeViolationDate(v.penalty_date)}
                          </small>
                          {v.location && (
                            <small className="vw-location">
                              <MapPin size={11} />
                              {v.location}
                            </small>
                          )}
                        </td>
                        <td>
                          <button
                            className="vw-plate"
                            disabled={!v.vehicle_id}
                            onClick={() =>
                              v.vehicle_id &&
                              handleNavigateToVehicle(v.vehicle_id)
                            }
                          >
                            {v.vehicle_plate ||
                              v.vehicles?.plate_number ||
                              "غير محددة"}
                          </button>
                          <small>
                            {v.vehicles
                              ? `${v.vehicles.make} ${v.vehicles.model}`
                              : "مركبة غير مرتبطة"}
                          </small>
                        </td>
                        <td>
                          <button
                            className="vw-text-link"
                            disabled={
                              !v.customer_id && !v.contracts?.customer_id
                            }
                            onClick={() =>
                              handleNavigateToCustomer(
                                v.customer_id || v.contracts?.customer_id || ""
                              )
                            }
                          >
                            {getCustomerName(v)}
                          </button>
                          {v.contract_id ? (
                            <button
                              className="vw-contract"
                              onClick={() =>
                                handleNavigateToContract(v.contract_id || "")
                              }
                            >
                              <Link2 size={11} />
                              {v.contracts?.contract_number || "فتح العقد"}
                            </button>
                          ) : (
                            <small className="vw-warning">
                              لا يوجد عقد مرتبط
                            </small>
                          )}
                        </td>
                        <td className="vw-money">{formatCurrency(v.amount)}</td>
                        <td>
                          <span className={`vw-badge state-${v.status}`}>
                            {v.status === "confirmed"
                              ? "مؤكدة"
                              : v.status === "cancelled"
                              ? "ملغاة"
                              : "بانتظار التأكيد"}
                          </span>
                          <small
                            className={`vw-payment payment-${v.payment_status}`}
                          >
                            <i />
                            {v.payment_status === "paid"
                              ? "مسددة"
                              : v.payment_status === "partially_paid"
                              ? "مسددة جزئياً"
                              : "غير مسددة"}
                          </small>
                        </td>
                        <td>
                          <div className="vw-row-actions">
                            <button
                              title="تفاصيل المخالفة"
                              aria-label={`تفاصيل المخالفة ${v.penalty_number}`}
                              onClick={() => handleOpenSidePanel(v)}
                            >
                              <Eye size={16} />
                            </button>
                            {v.status !== "cancelled" && (
                              <>
                                <button
                                  title="السداد"
                                  aria-label={`سداد المخالفة ${v.penalty_number}`}
                                  onClick={() => {
                                    setSelectedViolation(v);
                                    setIsPaymentsDialogOpen(true);
                                  }}
                                >
                                  <CreditCard size={16} />
                                </button>
                                <button
                                  title="تعديل"
                                  disabled={v.status !== "pending"}
                                  aria-label={`تعديل المخالفة ${v.penalty_number}`}
                                  onClick={() => handleOpenModal(v)}
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  title="إلغاء المخالفة"
                                  aria-label={`إلغاء المخالفة ${v.penalty_number}`}
                                  onClick={() => handleDelete(v.id)}
                                >
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {displayPages > 1 && (
              <footer className="vw-pagination">
                <span>
                  صفحة {Math.min(currentPage, displayPages)} من {displayPages}
                </span>
                <div>
                  <button
                    className="vw-button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    السابق
                  </button>
                  <button
                    className="vw-button"
                    disabled={currentPage >= displayPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    التالي
                  </button>
                </div>
              </footer>
            )}
          </section>
        )}
        {section === "import" && (
          <div className="vw-subpage">
            <div className="vw-panel-heading">
              <div>
                <h2>استيراد المخالفات</h2>
                <p>ارفع المستندات وراجع البيانات المستخرجة قبل اعتمادها.</p>
              </div>
            </div>
            <ViolationInboxDropzone />
            <Suspense fallback={<LoadingSpinner />}>
              <TrafficViolationPDFImport />
            </Suspense>
          </div>
        )}
        {section === "traffic-files" && (
          <div className="vw-subpage">
            {(rolePermissions.isSuperAdmin() ||
              rolePermissions.isAdminOrManager()) && (
              <TrafficMailSyncControl
                companyId={companyId}
                onSynced={() => void refreshWorkspace()}
              />
            )}
            <Suspense fallback={<LoadingSpinner />}>
              <TrafficFilesImport />
            </Suspense>
          </div>
        )}
        {section === "analysis" && (
          <div className="vw-subpage">
            <p className="vw-scope-note">
              التحليل مبني على المخالفات المحمّلة؛ التنبيهات تعرض ملخص الشركة.
            </p>
            <TrafficViolationsSmartDashboard violations={sourceViolations} />
            <TrafficViolationsAlertsPanel
              onFilterByStatus={handleFilterByStatus}
              onNavigateToVehicle={handleNavigateToVehicle}
            />
            <TrafficViolationsAIAdvisor
              formatCurrency={formatCurrency}
              violations={sourceViolations}
              onOpenViolation={handleOpenSidePanel}
            />
          </div>
        )}
        {section === "liabilities" && (
          <div className="vw-subpage">
            <div className="vw-panel-heading">
              <div>
                <h2>المخالفات التي تتحملها الشركة</h2>
                <p>آخر 100 سجل للمسؤولية المالية المعترف بها على الشركة.</p>
              </div>
              <ShieldAlert size={25} />
            </div>
            {!companyLiabilityViolations.length ? (
              <div className="vw-empty">
                <CheckCircle2 size={32} />
                <h3>لا توجد التزامات مسجلة</h3>
              </div>
            ) : (
              <div className="vw-table-scroll">
                <table className="vw-table">
                  <thead>
                    <tr>
                      <th>المخالفة</th>
                      <th>المركبة</th>
                      <th>المبلغ</th>
                      <th>سبب المسؤولية</th>
                      <th>تاريخ الاعتراف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyLiabilityViolations.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.violation_number}
                          <small>{v.original_contract_number}</small>
                        </td>
                        <td>{v.vehicles?.plate_number || "—"}</td>
                        <td>
                          {formatCurrency(
                            v.liability_amount || v.fine_amount || 0
                          )}
                        </td>
                        <td>{v.responsibility_reason || "—"}</td>
                        <td>{safeViolationDate(v.liability_recognized_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <footer className="vw-footer">
          <span>Fleetify / متابعة المخالفات</span>
          <span>المركبات · العملاء · العقود · السداد</span>
        </footer>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="vw-dialog max-w-2xl max-h-[90dvh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>
              {modalData ? "تعديل المخالفة" : "تسجيل مخالفة جديدة"}
            </DialogTitle>
            <DialogDescription>
              بيانات المخالفة والمركبة والعميل المسؤول.
            </DialogDescription>
          </DialogHeader>
          <Suspense fallback={<LoadingSpinner />}>
            <TrafficViolationForm
              violation={modalData}
              onSuccess={() => {
                setIsModalOpen(false);
                void refreshWorkspace();
              }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
      {/* Side Panel */}
      <TrafficViolationSidePanel
        violation={selectedViolation}
        open={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        onAddPayment={(violation) => {
          setSelectedViolation(violation);
          setIsSidePanelOpen(false);
          setIsPaymentsDialogOpen(true);
        }}
        onEscalateToLegal={handleEscalateToLegal}
      />

      {/* Payments Dialog */}
      <Suspense fallback={<LoadingSpinner size="sm" />}>
        <TrafficViolationPaymentsDialog
          violation={selectedViolation}
          open={isPaymentsDialogOpen}
          onOpenChange={setIsPaymentsDialogOpen}
        />
      </Suspense>

      {/* Report Customization Dialog */}
      <TrafficViolationReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        violations={visibleViolations}
      />

      {/* Reminder Dialog */}
      <TrafficViolationReminderDialog
        open={isReminderDialogOpen}
        onOpenChange={setIsReminderDialogOpen}
        violations={selectedViolationsForReminder}
        onSuccess={() => refetch()}
      />

      <Dialog
        open={isDeleteAllDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteAllDialogOpen(open);
          if (!open) setDeleteAllConfirmText("");
        }}
      >
        <DialogContent className="max-w-lg rounded-[8px] border-[#FFD5DC]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#FB6B7A]">
              <AlertTriangle className="h-5 w-5" />
              إلغاء المخالفات غير المسددة
            </DialogTitle>
            <DialogDescription className="text-right leading-7">
              سيتم إلغاء المخالفات غير الملغاة المسجلة للشركة الحالية، من أصل{" "}
              <span className="font-black text-[#020617]">
                {totalCount.toLocaleString("en-US")}
              </span>{" "}
              مخالفة. المخالفات المرتبطة بأي دفعة ستبقى محمية دون تغيير، وستظل
              كل السجلات محفوظة لأغراض التدقيق.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-[8px] border border-[#FFD5DC] bg-[#FFF7F8] p-4">
            <p className="text-sm font-bold text-[#102B4E]">
              للتأكيد اكتب كلمة{" "}
              <span className="font-black text-[#FB6B7A]">إلغاء</span> في الحقل
              التالي.
            </p>
            <input
              value={deleteAllConfirmText}
              onChange={(event) => setDeleteAllConfirmText(event.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#FFD5DC] bg-white px-3 text-sm font-black text-[#020617] outline-none focus:border-[#FB6B7A]"
              placeholder="اكتب إلغاء"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAllDialogOpen(false);
                setDeleteAllConfirmText("");
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllViolations}
              disabled={
                deleteAllConfirmText.trim() !== "إلغاء" ||
                deleteAllViolationsMutation.isPending
              }
            >
              {deleteAllViolationsMutation.isPending
                ? "جاري الإلغاء..."
                : "إلغاء المخالفات غير المسددة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isRelinkDialogOpen && (
        <CustomerAssignmentDialog
          companyId={companyId}
          onClose={() => setIsRelinkDialogOpen(false)}
        />
      )}
    </div>
  );
}
