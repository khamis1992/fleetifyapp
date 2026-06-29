/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Gavel,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConvertToLegalDialog } from '@/components/contracts/ConvertToLegalDialog';
import type { ContractForLegal } from '@/hooks/useConvertToLegal';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { calculateDelinquencyAmounts } from '@/utils/calculateDelinquencyAmounts';
import { formatCustomerName } from '@/utils/formatCustomerName';
import '@/styles/legal-system.css';

type QueueItem = {
  contract: ContractForLegal;
  customerName: string;
  phone?: string | null;
  vehicleLabel: string;
  legalCaseNumber?: string | null;
  legalCaseStatus?: string | null;
  legalCaseValue: number;
  overdueRent: number;
  lateFees: number;
  trafficViolations: number;
  detailedClaimTotal: number;
  transferredAt?: string | null;
};

type CandidateSource = 'rent' | 'traffic';

type CandidateItem = {
  id: string;
  source: CandidateSource;
  reason: string;
  amount: number;
  daysOverdue?: number;
  violationsCount?: number;
  overdueRent: number;
  lateFees: number;
  trafficViolations: number;
  detailedClaimTotal: number;
  contract?: ContractForLegal | null;
  customerName: string;
  phone?: string | null;
  contractNumber?: string | null;
  vehicleLabel?: string | null;
  canConvert: boolean;
};

const activeLegalStatuses = ['pending', 'active', 'under_review', 'on_hold'];

const normalizeCustomerName = (customer: any) => {
  if (!customer) return 'عميل غير محدد';
  return formatCustomerName({
    first_name: customer.first_name,
    last_name: customer.last_name,
    first_name_ar: customer.first_name_ar,
    last_name_ar: customer.last_name_ar,
    company_name: customer.company_name,
    company_name_ar: customer.company_name_ar,
    customer_type: customer.customer_type,
    full_name: customer.full_name,
  });
};

const normalizeContractForLegal = (contract: any): ContractForLegal => ({
  id: contract.id,
  contract_number: contract.contract_number || '',
  customer_id: contract.customer_id || '',
  vehicle_id: contract.vehicle_id || undefined,
  company_id: contract.company_id,
  contract_amount: Number(contract.contract_amount || 0),
  total_paid: Number(contract.total_paid || 0),
  balance_due: Number(contract.balance_due || 0),
  late_fine_amount: Number(contract.late_fine_amount || 0),
  monthly_amount: Number(contract.monthly_amount || 0),
  start_date: contract.start_date,
  end_date: contract.end_date,
  status: contract.status || 'active',
  customer: contract.customers
    ? {
        id: contract.customers.id,
        first_name: contract.customers.first_name,
        last_name: contract.customers.last_name,
        first_name_ar: contract.customers.first_name_ar,
        last_name_ar: contract.customers.last_name_ar,
        company_name: contract.customers.company_name,
        company_name_ar: contract.customers.company_name_ar,
        phone: contract.customers.phone,
        email: contract.customers.email,
        national_id: contract.customers.national_id || contract.customers.passport_number,
        customer_type: contract.customers.customer_type,
      }
    : undefined,
  vehicle: contract.vehicles
    ? {
        id: contract.vehicles.id,
        plate_number: contract.vehicles.plate_number || contract.license_plate,
        make: contract.vehicles.make || contract.make,
        model: contract.vehicles.model || contract.model,
        year: contract.vehicles.year || contract.year,
      }
    : contract.vehicle_id
      ? {
          id: contract.vehicle_id,
          plate_number: contract.license_plate,
          make: contract.make,
          model: contract.model,
          year: contract.year,
        }
      : undefined,
});

const vehicleLabel = (contract: any) => {
  const vehicle = contract.vehicles || {};
  const make = vehicle.make || contract.make || '';
  const model = vehicle.model || contract.model || '';
  const year = vehicle.year || contract.year || '';
  const plate = vehicle.plate_number || contract.license_plate || '';
  return [make, model, year, plate ? `- ${plate}` : ''].filter(Boolean).join(' ').trim() || 'مركبة غير محددة';
};

const fetchLegalQueue = async (companyId: string): Promise<QueueItem[]> => {
  const { data: legalCases, error } = await supabase
    .from('legal_cases')
    .select(`
      id,
      contract_id,
      case_number,
      case_status,
      case_value,
      client_name,
      client_phone,
      created_at,
      contracts!legal_cases_contract_id_fkey(
      id,
      company_id,
      contract_number,
      customer_id,
      vehicle_id,
      status,
      start_date,
      end_date,
      monthly_amount,
      contract_amount,
      total_paid,
      balance_due,
      late_fine_amount,
      days_overdue,
      license_plate,
      make,
      model,
      year,
      updated_at,
      customers(
        id,
        first_name,
        last_name,
        first_name_ar,
        last_name_ar,
        company_name,
        company_name_ar,
        customer_type,
        phone,
        email,
        national_id,
        passport_number
      ),
      vehicles(
        id,
        make,
        model,
        year,
        plate_number
      )
      )
    `)
    .eq('company_id', companyId)
    .not('contract_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!legalCases?.length) return [];

  const contractIds = legalCases.map((legalCase: any) => legalCase.contract_id).filter(Boolean);
  const violationsByContract = new Map<string, number>();
  const invoicesByContract = new Map<string, any[]>();

  if (contractIds.length > 0) {
    const [{ data: penalties, error: penaltiesError }, { data: invoices, error: invoicesError }] = await Promise.all([
      supabase
        .from('penalties')
        .select('contract_id, amount')
        .eq('company_id', companyId)
        .in('contract_id', contractIds)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled'),
      supabase
        .from('invoices')
        .select('id, invoice_number, contract_id, due_date, total_amount, paid_amount, status')
        .eq('company_id', companyId)
        .in('contract_id', contractIds)
        .neq('status', 'cancelled'),
    ]);

    if (penaltiesError) throw penaltiesError;
    if (invoicesError) throw invoicesError;

    (penalties || []).forEach((penalty: any) => {
      if (!penalty.contract_id) return;
      violationsByContract.set(
        penalty.contract_id,
        (violationsByContract.get(penalty.contract_id) || 0) + Number(penalty.amount || 0)
      );
    });

    (invoices || []).forEach((invoice: any) => {
      if (!invoice.contract_id) return;
      invoicesByContract.set(invoice.contract_id, [...(invoicesByContract.get(invoice.contract_id) || []), invoice]);
    });
  }

  return legalCases
    .filter((legalCase: any) => legalCase.contracts)
    .map((legalCase: any) => {
    const contract = legalCase.contracts;
    const normalized = normalizeContractForLegal(contract);
    const invoiceCalculation = calculateDelinquencyAmounts(
      invoicesByContract.get(normalized.id) || [],
      [],
      { includeDamagesFee: false }
    );
    const overdueRent = invoiceCalculation.overdueRent > 0
      ? invoiceCalculation.overdueRent
      : Number(normalized.balance_due || 0);
    const lateFees = invoiceCalculation.overdueInvoicesCount > 0
      ? invoiceCalculation.lateFees
      : Number(normalized.late_fine_amount || 0);
    const trafficViolations = violationsByContract.get(normalized.id) || 0;
    const detailedClaimTotal = overdueRent + lateFees + trafficViolations;

    return {
      contract: normalized,
      customerName: legalCase.client_name || normalizeCustomerName(contract.customers),
      phone: legalCase.client_phone || contract.customers?.phone,
      vehicleLabel: vehicleLabel(contract),
      legalCaseNumber: legalCase?.case_number,
      legalCaseStatus: legalCase?.case_status,
      legalCaseValue: Number(legalCase?.case_value || normalized.balance_due || 0),
      overdueRent,
      lateFees,
      trafficViolations,
      detailedClaimTotal,
      transferredAt: legalCase?.created_at,
    };
  });
};

const fetchRentCandidates = async (companyId: string, searchTerm: string): Promise<CandidateItem[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      company_id,
      contract_number,
      customer_id,
      vehicle_id,
      status,
      start_date,
      end_date,
      monthly_amount,
      contract_amount,
      total_paid,
      balance_due,
      late_fine_amount,
      days_overdue,
      license_plate,
      make,
      model,
      year,
      customers(
        id,
        first_name,
        last_name,
        first_name_ar,
        last_name_ar,
        company_name,
        company_name_ar,
        customer_type,
        phone,
        email,
        national_id,
        passport_number
      ),
      vehicles(
        id,
        make,
        model,
        year,
        plate_number
      )
    `)
    .eq('company_id', companyId)
    .in('status', ['active', 'expired', 'closed', 'cancelled'])
    .gt('balance_due', 0)
    .order('balance_due', { ascending: false })
    .limit(80);

  if (error) throw error;

  const contractIds = (data || []).map((contract: any) => contract.id).filter(Boolean);
  const invoicesByContract = new Map<string, any[]>();
  const violationsByContract = new Map<string, number>();

  if (contractIds.length > 0) {
    const [{ data: invoices, error: invoicesError }, { data: penalties, error: penaltiesError }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, invoice_number, contract_id, due_date, total_amount, paid_amount, status')
        .eq('company_id', companyId)
        .in('contract_id', contractIds)
        .neq('status', 'cancelled'),
      supabase
        .from('penalties')
        .select('contract_id, amount')
        .eq('company_id', companyId)
        .in('contract_id', contractIds)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled'),
    ]);

    if (invoicesError) throw invoicesError;
    if (penaltiesError) throw penaltiesError;

    (invoices || []).forEach((invoice: any) => {
      if (!invoice.contract_id) return;
      invoicesByContract.set(invoice.contract_id, [...(invoicesByContract.get(invoice.contract_id) || []), invoice]);
    });

    (penalties || []).forEach((penalty: any) => {
      if (!penalty.contract_id) return;
      violationsByContract.set(
        penalty.contract_id,
        (violationsByContract.get(penalty.contract_id) || 0) + Number(penalty.amount || 0)
      );
    });
  }

  const needle = searchTerm.trim().toLowerCase();
  return (data || [])
    .filter((contract: any) => {
      const name = normalizeCustomerName(contract.customers).toLowerCase();
      return (
        !needle ||
        name.includes(needle) ||
        contract.contract_number?.toLowerCase().includes(needle) ||
        contract.customers?.phone?.toLowerCase().includes(needle) ||
        contract.license_plate?.toLowerCase().includes(needle) ||
        contract.vehicles?.plate_number?.toLowerCase().includes(needle)
      );
    })
    .map((contract: any) => {
      const calculation = calculateDelinquencyAmounts(
        invoicesByContract.get(contract.id) || [],
        [],
        { includeDamagesFee: false }
      );
      const overdueRent = calculation.overdueRent > 0
        ? calculation.overdueRent
        : Number(contract.balance_due || 0);
      const lateFees = calculation.overdueInvoicesCount > 0
        ? calculation.lateFees
        : Number(contract.late_fine_amount || 0);
      const trafficViolations = violationsByContract.get(contract.id) || 0;
      const detailedClaimTotal = overdueRent + lateFees + trafficViolations;

      return {
        id: `rent-${contract.id}`,
        source: 'rent' as const,
        reason: 'تأخير في سداد الإيجار',
        amount: detailedClaimTotal,
        daysOverdue: Number(contract.days_overdue || 0),
        violationsCount: trafficViolations > 0 ? 1 : 0,
        overdueRent,
        lateFees,
        trafficViolations,
        detailedClaimTotal,
        contract: normalizeContractForLegal(contract),
        customerName: normalizeCustomerName(contract.customers),
        phone: contract.customers?.phone,
        contractNumber: contract.contract_number,
        vehicleLabel: vehicleLabel(contract),
        canConvert: true,
      };
    });
};

const fetchTrafficCandidates = async (companyId: string, searchTerm: string): Promise<CandidateItem[]> => {
  const { data, error } = await supabase
    .from('penalties')
    .select(`
      id,
      penalty_number,
      amount,
      reason,
      violation_type,
      penalty_date,
      customer_id,
      contract_id,
      vehicle_plate,
      customers(
        id,
        first_name,
        last_name,
        first_name_ar,
        last_name_ar,
        company_name,
        company_name_ar,
        customer_type,
        phone,
        email,
        national_id,
        passport_number
      ),
      contracts(
        id,
        company_id,
        contract_number,
        customer_id,
        vehicle_id,
        status,
        start_date,
        end_date,
        monthly_amount,
        contract_amount,
        total_paid,
        balance_due,
        late_fine_amount,
        days_overdue,
        license_plate,
        make,
        model,
        year,
        customers(
          id,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_name,
          company_name_ar,
          customer_type,
          phone,
          email,
          national_id,
          passport_number
        ),
        vehicles(
          id,
          make,
          model,
          year,
          plate_number
        )
      )
    `)
    .eq('company_id', companyId)
    .neq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .order('penalty_date', { ascending: false })
    .limit(120);

  if (error) throw error;

  const grouped = new Map<string, any[]>();
  (data || []).forEach((penalty: any) => {
    const key = penalty.contract_id || penalty.customer_id || penalty.vehicle_plate || penalty.id;
    grouped.set(key, [...(grouped.get(key) || []), penalty]);
  });

  const needle = searchTerm.trim().toLowerCase();

  return Array.from(grouped.values())
    .map((penalties) => {
      const first = penalties[0];
      const contract = first.contracts;
      const customer = first.customers || contract?.customers;
      const amount = penalties.reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0);
      const name = normalizeCustomerName(customer);
      const normalizedContract = contract ? normalizeContractForLegal({ ...contract, customers: customer }) : null;
      const overdueRent = normalizedContract?.balance_due || 0;
      const lateFees = normalizedContract?.late_fine_amount || 0;
      const trafficViolations = amount;
      const detailedClaimTotal = overdueRent + lateFees + trafficViolations;

      return {
        id: `traffic-${first.contract_id || first.customer_id || first.vehicle_plate || first.id}`,
        source: 'traffic' as const,
        reason: `${penalties.length} مخالفة مرورية غير مسددة`,
        amount: detailedClaimTotal,
        violationsCount: penalties.length,
        overdueRent,
        lateFees,
        trafficViolations,
        detailedClaimTotal,
        contract: normalizedContract,
        customerName: name,
        phone: customer?.phone,
        contractNumber: contract?.contract_number,
        vehicleLabel: contract ? vehicleLabel(contract) : first.vehicle_plate,
        canConvert: !!normalizedContract,
      };
    })
    .filter((candidate) => {
      if (!needle) return true;
      return (
        candidate.customerName.toLowerCase().includes(needle) ||
        candidate.phone?.toLowerCase().includes(needle) ||
        candidate.contractNumber?.toLowerCase().includes(needle) ||
        candidate.vehicleLabel?.toLowerCase().includes(needle)
      );
    });
};

const statusLabel = (status?: string | null) => {
  switch (status) {
    case 'pending':
      return 'قيد التجهيز';
    case 'active':
      return 'نشطة';
    case 'under_review':
      return 'تحت المراجعة';
    case 'on_hold':
      return 'معلقة';
    case 'closed':
      return 'مغلقة';
    default:
      return 'محول قانونيًا';
  }
};

const CandidateBadge = ({ source }: { source: CandidateSource }) => (
  <Badge
    className={cn(
      'border-0 px-2.5 py-1 text-xs font-bold',
      source === 'rent'
        ? 'bg-[#7C83F6]/10 text-[#5B5FE8] hover:bg-[#7C83F6]/10'
        : 'bg-[#FB6B7A]/10 text-[#E11D48] hover:bg-[#FB6B7A]/10'
    )}
  >
    {source === 'rent' ? 'تأخير إيجار' : 'مخالفات مرورية'}
  </Badge>
);

const FinancialDelinquencyPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { companyId, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  const [activeTab, setActiveTab] = useState<'queue' | 'search'>('queue');
  const [queueSearch, setQueueSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateType, setCandidateType] = useState<'all' | CandidateSource>('all');
  const [selectedContract, setSelectedContract] = useState<ContractForLegal | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const isCompanyReady = !!companyId && !isInitializing && !isAuthenticating;

  const { data: legalQueue = [], isLoading: queueLoading, isFetching: queueFetching } = useQuery({
    queryKey: ['manual-legal-delinquency-queue', companyId],
    queryFn: () => {
      if (!companyId) throw new Error('Company not ready');
      return fetchLegalQueue(companyId);
    },
    enabled: isCompanyReady,
    staleTime: 1000 * 60,
  });

  const shouldLoadCandidates = activeTab === 'search' && isCompanyReady;

  const { data: rentCandidates = [], isFetching: rentSearching } = useQuery({
    queryKey: ['legal-delinquency-rent-candidates', companyId, candidateSearch],
    queryFn: () => {
      if (!companyId) throw new Error('Company not ready');
      return fetchRentCandidates(companyId, candidateSearch);
    },
    enabled: shouldLoadCandidates && candidateType !== 'traffic',
  });

  const { data: trafficCandidates = [], isFetching: trafficSearching } = useQuery({
    queryKey: ['legal-delinquency-traffic-candidates', companyId, candidateSearch],
    queryFn: () => {
      if (!companyId) throw new Error('Company not ready');
      return fetchTrafficCandidates(companyId, candidateSearch);
    },
    enabled: shouldLoadCandidates && candidateType !== 'rent',
  });

  const filteredQueue = useMemo(() => {
    const needle = queueSearch.trim().toLowerCase();
    if (!needle) return legalQueue;
    return legalQueue.filter((item) =>
      item.customerName.toLowerCase().includes(needle) ||
      item.contract.contract_number.toLowerCase().includes(needle) ||
      item.phone?.toLowerCase().includes(needle) ||
      item.vehicleLabel.toLowerCase().includes(needle) ||
      item.legalCaseNumber?.toLowerCase().includes(needle)
    );
  }, [legalQueue, queueSearch]);

  const candidates = useMemo(() => {
    const merged = candidateType === 'rent'
      ? rentCandidates
      : candidateType === 'traffic'
        ? trafficCandidates
        : [...rentCandidates, ...trafficCandidates];

    const seen = new Set<string>();
    return merged.filter((candidate) => {
      const key = `${candidate.source}-${candidate.contract?.id || candidate.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [candidateType, rentCandidates, trafficCandidates]);

  const queueStats = useMemo(() => {
    const totalRentalValue = legalQueue.reduce((sum, item) => sum + item.overdueRent, 0);
    const activeCases = legalQueue.filter((item) => activeLegalStatuses.includes(item.legalCaseStatus || 'pending')).length;
    const readyForCourt = legalQueue.filter((item) => item.legalCaseStatus === 'pending').length;
    return { total: legalQueue.length, totalRentalValue, activeCases, readyForCourt };
  }, [legalQueue]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['manual-legal-delinquency-queue'] });
    queryClient.invalidateQueries({ queryKey: ['legal-delinquency-rent-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['legal-delinquency-traffic-candidates'] });
  };

  const openConvertDialog = (candidate: CandidateItem) => {
    if (!candidate.contract) {
      toast.error('لا يمكن تحويل هذا السجل قبل ربط المخالفة بعقد.');
      return;
    }

    setSelectedContract(candidate.contract);
    setConvertDialogOpen(true);
  };

  if (!isCompanyReady || queueLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB]" dir="rtl">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm font-semibold text-[#94A3B8]">جاري تحميل قائمة الشؤون القانونية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-system min-h-screen bg-[#F6F8FB] pb-8 text-right font-sans text-[#020617]" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#22C7A1]/10 text-[#22C7A1]">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#020617] md:text-3xl">الشؤون القانونية</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#94A3B8]">
                  هذه الصفحة تعرض العقود التي تم تحويلها يدويًا للشؤون القانونية فقط. المتأخرون أو أصحاب المخالفات لا يظهرون هنا تلقائيًا حتى يتم تحويل العقد من تفاصيل العقد أو من أداة البحث أدناه.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={refreshAll}
                disabled={queueFetching || rentSearching || trafficSearching}
                className="gap-2 rounded-xl border-slate-200 bg-white"
              >
                <RefreshCw className={cn('h-4 w-4', (queueFetching || rentSearching || trafficSearching) && 'animate-spin')} />
                تحديث
              </Button>
              <Button
                onClick={() => setActiveTab('search')}
                className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
              >
                <FileSearch className="h-4 w-4" />
                بحث عن مخالف
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94A3B8]">ملفات قانونية</p>
                  <p className="mt-2 text-2xl font-bold text-[#020617]">{queueStats.total}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C83F6]/10 text-[#7C83F6]">
                  <Gavel className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94A3B8]">إجمالي الإيجارات</p>
                  <p className="mt-2 text-2xl font-bold text-[#020617]">{formatCurrency(queueStats.totalRentalValue)}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22C7A1]/10 text-[#22C7A1]">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94A3B8]">قضايا مفتوحة</p>
                  <p className="mt-2 text-2xl font-bold text-[#020617]">{queueStats.activeCases}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FB6B7A]/10 text-[#FB6B7A]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94A3B8]">بانتظار التجهيز</p>
                  <p className="mt-2 text-2xl font-bold text-[#020617]">{queueStats.readyForCourt}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#38BDF8]/10 text-[#38BDF8]">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'queue' | 'search')} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-white p-1 shadow-sm lg:w-[520px]">
            <TabsTrigger value="queue" className="rounded-xl py-3 data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
              المحول قانونيًا
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-xl py-3 data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white">
              بحث وإدراج يدوي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="ابحث في الملفات المحولة: اسم العميل، رقم العقد، رقم القضية، اللوحة..."
                  className="h-12 rounded-xl border-slate-200 bg-[#F6F8FB] pr-10"
                />
              </div>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <ShieldCheck className="mx-auto h-12 w-12 text-[#22C7A1]" />
                <h2 className="mt-4 text-xl font-bold text-[#020617]">لا توجد عقود محولة قانونيًا</h2>
                <p className="mt-2 text-sm text-[#94A3B8]">
                  عند تحويل عقد من صفحة تفاصيل العقد سيظهر هنا فورًا. لا يتم إدراج المتأخرين تلقائيًا.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredQueue.map((item) => (
                  <article key={item.contract.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-[#22C7A1]/10 text-[#0F766E] hover:bg-[#22C7A1]/10">
                            {statusLabel(item.legalCaseStatus)}
                          </Badge>
                          {item.legalCaseNumber && (
                            <Badge variant="outline" className="border-slate-200 text-[#64748B]">
                              {item.legalCaseNumber}
                            </Badge>
                          )}
                          <span className="text-xs text-[#94A3B8]">
                            تم التحويل يدويًا {item.transferredAt ? new Date(item.transferredAt).toLocaleDateString('ar-QA') : ''}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-[#020617]">{item.customerName}</h3>
                          <p className="mt-1 text-sm text-[#94A3B8]">
                            عقد {item.contract.contract_number} · {item.vehicleLabel}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">الإيجار المتأخر</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(item.overdueRent)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">غرامات التأخير</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(item.lateFees)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">المخالفات المرورية</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(item.trafficViolations)}</p>
                          </div>
                          <div className="rounded-xl bg-[#ECFDF5] p-3">
                            <p className="text-xs font-semibold text-[#0F766E]">الإجمالي المفصل</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(item.detailedClaimTotal)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">الهاتف</p>
                            <p className="mt-1 font-bold text-[#020617]" dir="ltr">{item.phone || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button
                          onClick={() => navigate(`/legal/lawsuit/prepare/${item.contract.id}`)}
                          className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
                        >
                          <Gavel className="h-4 w-4" />
                          تجهيز الدعوى
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/contracts/${item.contract.contract_number}`)}
                          className="gap-2 rounded-xl border-slate-200 bg-white"
                        >
                          <FileText className="h-4 w-4" />
                          تفاصيل العقد
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                    placeholder="ابحث باسم العميل، رقم الهاتف، رقم العقد، أو لوحة المركبة..."
                    className="h-12 rounded-xl border-slate-200 bg-[#F6F8FB] pr-10"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['all', 'الكل'],
                    ['rent', 'إيجار'],
                    ['traffic', 'مخالفات'],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={candidateType === value ? 'default' : 'outline'}
                      onClick={() => setCandidateType(value as 'all' | CandidateSource)}
                      className={cn(
                        'rounded-xl',
                        candidateType === value
                          ? 'bg-[#7C83F6] text-white hover:bg-[#6A70E8]'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs leading-6 text-[#94A3B8]">
                البحث هنا لا يضيف العميل تلقائيًا. اضغط “تحويل قانوني” فقط بعد قرار الإدارة، حتى لا يدخل العملاء المتفق معهم على التأخير ضمن الإجراءات.
              </p>
            </section>

            {rentSearching || trafficSearching ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-[#22C7A1]" />
                <span className="mr-3 text-sm font-semibold text-[#94A3B8]">جاري البحث في المرشحين...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#22C7A1]" />
                <h2 className="mt-4 text-xl font-bold text-[#020617]">لا توجد نتائج مطابقة</h2>
                <p className="mt-2 text-sm text-[#94A3B8]">جرّب اسمًا آخر، رقم عقد، هاتف، أو لوحة مركبة.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {candidates.map((candidate) => (
                  <article key={candidate.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CandidateBadge source={candidate.source} />
                          <Badge variant="outline" className="border-slate-200 text-[#64748B]">
                            {candidate.reason}
                          </Badge>
                          {!candidate.canConvert && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              يحتاج ربط بعقد
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-[#020617]">{candidate.customerName}</h3>
                          <p className="mt-1 text-sm text-[#94A3B8]">
                            {candidate.contractNumber ? `عقد ${candidate.contractNumber}` : 'لا يوجد عقد مرتبط'} · {candidate.vehicleLabel || 'مركبة غير محددة'}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">الإيجار المتأخر</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(candidate.overdueRent)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">غرامات التأخير</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(candidate.lateFees)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">المخالفات المرورية</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(candidate.trafficViolations)}</p>
                          </div>
                          <div className="rounded-xl bg-[#ECFDF5] p-3">
                            <p className="text-xs font-semibold text-[#0F766E]">الإجمالي المفصل</p>
                            <p className="mt-1 font-bold text-[#020617]">{formatCurrency(candidate.detailedClaimTotal)}</p>
                          </div>
                          <div className="rounded-xl bg-[#F6F8FB] p-3">
                            <p className="text-xs font-semibold text-[#94A3B8]">الهاتف</p>
                            <p className="mt-1 font-bold text-[#020617]" dir="ltr">{candidate.phone || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button
                          disabled={!candidate.canConvert}
                          onClick={() => openConvertDialog(candidate)}
                          className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]"
                        >
                          <Gavel className="h-4 w-4" />
                          تحويل قانوني
                        </Button>
                        {candidate.contract?.id && (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/contracts/${candidate.contract?.contract_number}`)}
                            className="gap-2 rounded-xl border-slate-200 bg-white"
                          >
                            <FileText className="h-4 w-4" />
                            فتح العقد
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConvertToLegalDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        contract={selectedContract}
        onSuccess={() => {
          setSelectedContract(null);
          refreshAll();
          setActiveTab('queue');
        }}
      />
    </div>
  );
};

export default FinancialDelinquencyPage;
