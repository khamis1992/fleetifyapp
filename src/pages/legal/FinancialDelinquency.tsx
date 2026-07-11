/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  FileSearch,
  FileText,
  Gavel,
  Handshake,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConvertToLegalDialog } from '@/components/contracts/ConvertToLegalDialog';
import type { ContractForLegal } from '@/hooks/useConvertToLegal';
import { useDelinquentCustomers, type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { calculateDelinquencyAmounts } from '@/utils/calculateDelinquencyAmounts';
import { formatCustomerName } from '@/utils/formatCustomerName';
import '@/styles/legal-system.css';

type QueueItem = {
  legalCaseId: string;
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
type CandidateSort = 'amount_desc' | 'amount_asc' | 'traffic_desc' | 'traffic_asc';

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
    .in('case_status', activeLegalStatuses)
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
      legalCaseId: legalCase.id,
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

type CollectionRiskLevel = 'high' | 'medium' | 'low';
type CollectionRecommendation = 'settlement' | 'legal' | 'reminder';

type DelinquencyAIInsight = {
  customer: DelinquentCustomer;
  rank: number;
  score: number;
  riskLevel: CollectionRiskLevel;
  riskLabel: string;
  riskClassName: string;
  recommendation: CollectionRecommendation;
  recommendationLabel: string;
  recommendationClassName: string;
  paymentProbability: number;
  reason: string;
  nextAction: string;
  whatsappMessage: string;
};

const getDaysSinceDate = (dateValue?: string | null) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
};

const normalizeWhatsAppPhone = (phone?: string | null) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('974')) return digits;
  if (digits.length === 8) return `974${digits}`;
  return digits;
};

const buildDelinquencyAIInsights = (
  customers: DelinquentCustomer[],
  formatCurrency: (amount: number) => string
): DelinquencyAIInsight[] => {
  return customers
    .map((customer) => {
      const daysOverdue = Number(customer.days_overdue || 0);
      const totalDebt = Number(customer.total_debt || 0);
      const lastPaymentAge = getDaysSinceDate(customer.last_payment_date);
      const hasRecentPayment = lastPaymentAge !== null && lastPaymentAge <= 45;
      const hasPaymentHistory = Number(customer.actual_payments_count || 0) > 0 || lastPaymentAge !== null;
      const hasLegalHistory = customer.has_previous_legal_cases || customer.is_blacklisted;

      const score =
        Number(customer.risk_score || 0) +
        Math.min(daysOverdue, 180) * 0.75 +
        Math.min(totalDebt / 1000, 70) +
        Number(customer.violations_count || 0) * 5 +
        (hasLegalHistory ? 30 : 0) -
        (hasRecentPayment ? 22 : 0);

      const riskLevel: CollectionRiskLevel =
        customer.is_blacklisted || daysOverdue >= 90 || Number(customer.risk_score || 0) >= 85 || score >= 145
          ? 'high'
          : daysOverdue >= 45 || Number(customer.risk_score || 0) >= 65 || score >= 90
          ? 'medium'
          : 'low';

      const paymentProbability = Math.max(
        10,
        Math.min(
          94,
          84 -
            Math.min(daysOverdue, 180) * 0.32 -
            Math.min(totalDebt / 1000, 40) +
            (hasRecentPayment ? 18 : 0) +
            (hasPaymentHistory ? 10 : -8) -
            (hasLegalHistory ? 14 : 0)
        )
      );

      const recommendation: CollectionRecommendation =
        riskLevel === 'high' && (daysOverdue >= 90 || paymentProbability < 42 || hasLegalHistory)
          ? 'legal'
          : riskLevel === 'medium' || totalDebt >= 5000 || hasPaymentHistory
          ? 'settlement'
          : 'reminder';

      const riskLabel = riskLevel === 'high' ? 'خطر عالي' : riskLevel === 'medium' ? 'خطر متوسط' : 'خطر منخفض';
      const recommendationLabel =
        recommendation === 'legal'
          ? 'مرشح للتصعيد القانوني'
          : recommendation === 'settlement'
          ? 'مرشح للتسوية'
          : 'تذكير واتساب أولًا';

      const paymentPattern =
        hasRecentPayment
          ? `لكنه سدد سابقًا قبل ${lastPaymentAge} يوم`
          : hasPaymentHistory && lastPaymentAge !== null
          ? `وآخر سداد له قبل ${lastPaymentAge} يوم`
          : 'ولا يوجد سداد حديث واضح';

      const nextAction =
        recommendation === 'legal'
          ? 'إرسال إنذار واتساب نهائي وتجهيز الملف القانوني إذا لم يتم الرد.'
          : recommendation === 'settlement'
          ? 'عرض تسوية قصيرة الأجل مع موعد دفع واضح قبل التصعيد.'
          : 'إرسال تذكير واتساب ودي قبل التصعيد.';

      const reason = `هذا العميل متأخر ${daysOverdue} يومًا، بإجمالي ${formatCurrency(totalDebt)}، ${paymentPattern}. الأفضل ${nextAction}`;
      const whatsappMessage =
        recommendation === 'legal'
          ? `مرحبًا ${customer.customer_name}، نود تذكيركم بوجود مبلغ متأخر قدره ${formatCurrency(totalDebt)} لمدة ${daysOverdue} يومًا. يرجى السداد أو التواصل معنا اليوم لتجنب اتخاذ إجراءات قانونية.`
          : recommendation === 'settlement'
          ? `مرحبًا ${customer.customer_name}، يوجد مبلغ مستحق قدره ${formatCurrency(totalDebt)}. يمكننا ترتيب تسوية مناسبة إذا تم تأكيد موعد السداد اليوم. يرجى التواصل معنا.`
          : `مرحبًا ${customer.customer_name}، تذكير ودي بوجود مبلغ مستحق قدره ${formatCurrency(totalDebt)}. نرجو السداد أو إعلامنا بموعد الدفع المناسب.`;

      return {
        customer,
        rank: 0,
        score,
        riskLevel,
        riskLabel,
        riskClassName:
          riskLevel === 'high'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : riskLevel === 'medium'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        recommendation,
        recommendationLabel,
        recommendationClassName:
          recommendation === 'legal'
            ? 'border-rose-200 bg-white text-rose-700'
            : recommendation === 'settlement'
            ? 'border-[#7C83F6]/30 bg-white text-[#5B5FE8]'
            : 'border-emerald-200 bg-white text-emerald-700',
        paymentProbability: Math.round(paymentProbability),
        reason,
        nextAction,
        whatsappMessage,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((insight, index) => ({ ...insight, rank: index + 1 }));
};

const FinancialDelinquencyPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { companyId, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  const [activeTab, setActiveTab] = useState<'queue' | 'search'>('queue');
  const [queueSearch, setQueueSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateType, setCandidateType] = useState<'all' | CandidateSource>('all');
  const [candidateSort, setCandidateSort] = useState<CandidateSort>('amount_desc');
  const [selectedContract, setSelectedContract] = useState<ContractForLegal | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [removingItem, setRemovingItem] = useState<QueueItem | null>(null);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);

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

  const { data: delinquentCustomers = [], isFetching: aiFetching } = useDelinquentCustomers({
    useCachedData: true,
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
    const uniqueCandidates = merged.filter((candidate) => {
      const key = `${candidate.source}-${candidate.contract?.id || candidate.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return [...uniqueCandidates].sort((a, b) => {
      switch (candidateSort) {
        case 'amount_asc':
          return a.detailedClaimTotal - b.detailedClaimTotal;
        case 'traffic_desc':
          return b.trafficViolations - a.trafficViolations;
        case 'traffic_asc':
          return a.trafficViolations - b.trafficViolations;
        case 'amount_desc':
        default:
          return b.detailedClaimTotal - a.detailedClaimTotal;
      }
    });
  }, [candidateSort, candidateType, rentCandidates, trafficCandidates]);

  const queueStats = useMemo(() => {
    const totalRentalValue = legalQueue.reduce((sum, item) => sum + item.overdueRent, 0);
    const activeCases = legalQueue.filter((item) => activeLegalStatuses.includes(item.legalCaseStatus || 'pending')).length;
    const readyForCourt = legalQueue.filter((item) => item.legalCaseStatus === 'pending').length;
    return { total: legalQueue.length, totalRentalValue, activeCases, readyForCourt };
  }, [legalQueue]);

  const delinquencyAIInsights = useMemo(
    () => buildDelinquencyAIInsights(delinquentCustomers, formatCurrency),
    [delinquentCustomers, formatCurrency]
  );

  const topAIInsight = delinquencyAIInsights[0];
  const aiStats = useMemo(() => {
    const highRisk = delinquencyAIInsights.filter((insight) => insight.riskLevel === 'high').length;
    const settlement = delinquencyAIInsights.filter((insight) => insight.recommendation === 'settlement').length;
    const legal = delinquencyAIInsights.filter((insight) => insight.recommendation === 'legal').length;
    const avgProbability = delinquencyAIInsights.length
      ? Math.round(delinquencyAIInsights.reduce((sum, insight) => sum + insight.paymentProbability, 0) / delinquencyAIInsights.length)
      : 0;

    return { highRisk, settlement, legal, avgProbability };
  }, [delinquencyAIInsights]);

  const aiInsightByCandidateKey = useMemo(() => {
    const map = new Map<string, DelinquencyAIInsight>();
    delinquencyAIInsights.forEach((insight) => {
      if (insight.customer.contract_id) {
        map.set(`id:${insight.customer.contract_id}`, insight);
      }
      if (insight.customer.contract_number) {
        map.set(`number:${insight.customer.contract_number}`, insight);
      }
    });
    return map;
  }, [delinquencyAIInsights]);

  const copyAIMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('تم نسخ رسالة واتساب');
    } catch (error) {
      console.error('Copy AI message error:', error);
      toast.error('تعذر نسخ الرسالة');
    }
  };

  const openAIWhatsApp = (insight: DelinquencyAIInsight) => {
    const phone = normalizeWhatsAppPhone(insight.customer.phone);
    if (!phone) {
      toast.error('لا يوجد رقم واتساب صالح لهذا العميل');
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(insight.whatsappMessage)}`, '_blank', 'noopener,noreferrer');
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['manual-legal-delinquency-queue'] });
    queryClient.invalidateQueries({ queryKey: ['legal-delinquency-rent-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['legal-delinquency-traffic-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['contract-details'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
    queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
  };

  const openConvertDialog = (candidate: CandidateItem) => {
    if (!candidate.contract) {
      toast.error('لا يمكن تحويل هذا السجل قبل ربط المخالفة بعقد.');
      return;
    }

    setSelectedContract(candidate.contract);
    setConvertDialogOpen(true);
  };

  const removeLegalProcedure = async () => {
    if (!companyId || !removingItem) return;

    setIsRemovingLegal(true);
    try {
      const now = new Date().toISOString();
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          updated_at: now,
        })
        .eq('id', removingItem.contract.id)
        .eq('company_id', companyId);

      if (contractError) throw contractError;

      const { error: legalCaseError } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          outcome_type: 'dismissed',
          outcome_date: now.slice(0, 10),
          outcome_notes: 'تمت إزالة الإجراء القانوني من صفحة الشؤون القانونية.',
          updated_at: now,
        })
        .eq('id', removingItem.legalCaseId)
        .eq('company_id', companyId);

      if (legalCaseError) throw legalCaseError;

      await supabase
        .from('delinquent_customers')
        .delete()
        .eq('contract_id', removingItem.contract.id);

      toast.success('تمت إزالة الإجراء القانوني', {
        description: `تم إرجاع العقد ${removingItem.contract.contract_number} إلى الحالة النشطة وإغلاق القضية المرتبطة.`,
      });

      setRemovingItem(null);
      refreshAll();
    } catch (error) {
      console.error('Error removing legal procedure:', error);
      const errorMessage = typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : 'حدث خطأ غير متوقع أثناء التحديث.';
      toast.error('تعذر إزالة الإجراء القانوني', {
        description: errorMessage,
      });
    } finally {
      setIsRemovingLegal(false);
    }
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

        <section className="hidden">
          <div className="border-b border-slate-100 bg-[#F8FAFC] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#020617] text-white">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#020617]">AI للتحصيل والمتأخرات</h2>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">
                    يصنف العملاء المتأخرين، يحدد أولوية التواصل، يقترح رسالة واتساب، ويقرر هل الأنسب تسوية أم تصعيد قانوني.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div className="rounded-xl border border-rose-100 bg-white px-3 py-2">
                  <span className="block text-xs font-bold text-[#94A3B8]">خطر عالي</span>
                  <strong className="text-lg text-rose-600">{aiStats.highRisk}</strong>
                </div>
                <div className="rounded-xl border border-[#7C83F6]/20 bg-white px-3 py-2">
                  <span className="block text-xs font-bold text-[#94A3B8]">قابل للتسوية</span>
                  <strong className="text-lg text-[#5B5FE8]">{aiStats.settlement}</strong>
                </div>
                <div className="rounded-xl border border-rose-100 bg-white px-3 py-2">
                  <span className="block text-xs font-bold text-[#94A3B8]">تصعيد قانوني</span>
                  <strong className="text-lg text-rose-700">{aiStats.legal}</strong>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <span className="block text-xs font-bold text-[#94A3B8]">احتمال السداد</span>
                  <strong className="text-lg text-emerald-600">{aiStats.avgProbability}%</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {aiFetching ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-[#F8FAFC] p-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#22C7A1]" />
                <span className="mr-3 text-sm font-bold text-[#94A3B8]">جاري تحليل العملاء المتأخرين...</span>
              </div>
            ) : topAIInsight ? (
              <>
                <div className="grid gap-4 rounded-2xl bg-[#020617] p-5 text-white xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white text-[#020617] hover:bg-white">الأولوية الأولى</Badge>
                      <Badge className="bg-rose-500 text-white hover:bg-rose-500">{topAIInsight.riskLabel}</Badge>
                      <Badge className="bg-[#22C7A1] text-white hover:bg-[#22C7A1]">{topAIInsight.recommendationLabel}</Badge>
                    </div>
                    <h3 className="mt-3 text-2xl font-black">{topAIInsight.customer.customer_name}</h3>
                    <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-200">{topAIInsight.reason}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-6 py-4 text-center text-[#020617]">
                    <span className="block text-xs font-bold text-[#64748B]">احتمال السداد</span>
                    <strong className="text-4xl font-black">{topAIInsight.paymentProbability}%</strong>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {delinquencyAIInsights.slice(0, 6).map((insight) => {
                    const RecommendationIcon = insight.recommendation === 'legal'
                      ? Scale
                      : insight.recommendation === 'settlement'
                      ? Handshake
                      : MessageSquare;

                    return (
                      <article key={insight.customer.contract_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">#{insight.rank}</Badge>
                              <Badge variant="outline" className={insight.riskClassName}>{insight.riskLabel}</Badge>
                              <Badge variant="outline" className={insight.recommendationClassName}>
                                <RecommendationIcon className="ml-1 h-3 w-3" />
                                {insight.recommendationLabel}
                              </Badge>
                            </div>
                            <h4 className="mt-3 font-black text-[#020617]">{insight.customer.customer_name}</h4>
                            <p className="mt-1 text-sm text-[#64748B]">
                              عقد {insight.customer.contract_number} · {formatCurrency(insight.customer.total_debt)} · متأخر {insight.customer.days_overdue || 0} يوم
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
                            <span className="block text-xs font-bold text-emerald-700">سداد متوقع</span>
                            <strong className="text-xl text-emerald-700">{insight.paymentProbability}%</strong>
                          </div>
                        </div>

                        <p className="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-sm leading-7 text-[#334155]">
                          {insight.reason}
                        </p>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#020617]">
                            <MessageSquare className="h-4 w-4 text-[#22C7A1]" />
                            رسالة واتساب مقترحة
                          </div>
                          <p className="text-sm leading-7 text-[#475569]">{insight.whatsappMessage}</p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => copyAIMessage(insight.whatsappMessage)} className="gap-2 rounded-xl border-slate-200 bg-white">
                            <Copy className="h-4 w-4" />
                            نسخ الرسالة
                          </Button>
                          <Button type="button" size="sm" onClick={() => openAIWhatsApp(insight)} className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]">
                            <Send className="h-4 w-4" />
                            فتح واتساب
                          </Button>
                          {insight.recommendation === 'legal' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveTab('search');
                                setCandidateSearch(insight.customer.contract_number || insight.customer.customer_name);
                                setCandidateType('rent');
                              }}
                              className="gap-2 rounded-xl border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                            >
                              <Gavel className="h-4 w-4" />
                              ابحث للتحويل القانوني
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-[#22C7A1]" />
                <h3 className="mt-3 text-lg font-black text-[#020617]">لا توجد متأخرات للتحليل</h3>
                <p className="mt-1 text-sm text-[#94A3B8]">عند ظهور عملاء متأخرين سيعرض النظام أولوية التواصل والتوصية المناسبة هنا.</p>
              </div>
            )}
          </div>
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
                          onClick={() => window.open(`/contracts/${encodeURIComponent(item.contract.contract_number)}`, '_blank', 'noopener,noreferrer')}
                          className="gap-2 rounded-xl border-slate-200 bg-white"
                        >
                          <FileText className="h-4 w-4" />
                          تفاصيل العقد
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setRemovingItem(item)}
                          className="gap-2 rounded-xl border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <XCircle className="h-4 w-4" />
                          إزالة الإجراء القانوني
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
              <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
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
                      onClick={() => {
                        setCandidateType(value as 'all' | CandidateSource);
                        if (value === 'traffic') setCandidateSort('traffic_desc');
                      }}
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
                <Select value={candidateSort} onValueChange={(value) => setCandidateSort(value as CandidateSort)}>
                  <SelectTrigger className="h-12 min-w-[210px] rounded-xl border-slate-200 bg-[#F6F8FB]">
                    <SelectValue placeholder="ترتيب العرض" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="amount_desc">الإجمالي: الأعلى أولا</SelectItem>
                    <SelectItem value="amount_asc">الإجمالي: الأقل أولا</SelectItem>
                    <SelectItem value="traffic_desc">المخالفات: الأعلى أولا</SelectItem>
                    <SelectItem value="traffic_asc">المخالفات: الأقل أولا</SelectItem>
                  </SelectContent>
                </Select>
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
                {candidates.map((candidate) => {
                  const candidateAIInsight =
                    (candidate.contract?.id && aiInsightByCandidateKey.get(`id:${candidate.contract.id}`)) ||
                    (candidate.contractNumber && aiInsightByCandidateKey.get(`number:${candidate.contractNumber}`));
                  const RecommendationIcon = candidateAIInsight?.recommendation === 'legal'
                    ? Scale
                    : candidateAIInsight?.recommendation === 'settlement'
                    ? Handshake
                    : MessageSquare;

                  return (
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
                          {candidateAIInsight && (
                            <>
                              <Badge variant="outline">AI #{candidateAIInsight.rank}</Badge>
                              <Badge variant="outline" className={candidateAIInsight.riskClassName}>
                                {candidateAIInsight.riskLabel}
                              </Badge>
                              <Badge variant="outline" className={candidateAIInsight.recommendationClassName}>
                                <RecommendationIcon className="ml-1 h-3 w-3" />
                                {candidateAIInsight.recommendationLabel}
                              </Badge>
                            </>
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

                        {candidateAIInsight && (
                          <div className="grid gap-3 rounded-xl border border-[#22C7A1]/20 bg-[#F8FFFC] p-3 xl:grid-cols-[1fr_180px] xl:items-stretch">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-black text-[#020617]">
                                <Brain className="h-4 w-4 text-[#22C7A1]" />
                                توصية AI للتحصيل
                              </div>
                              <p className="rounded-lg bg-white/80 p-3 text-sm leading-7 text-[#334155]">
                                {candidateAIInsight.reason}
                              </p>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#020617]">
                                  <MessageSquare className="h-4 w-4 text-[#22C7A1]" />
                                  رسالة واتساب مقترحة
                                </div>
                                <p className="text-sm leading-7 text-[#475569]">{candidateAIInsight.whatsappMessage}</p>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                              <div>
                                <span className="block text-xs font-bold text-emerald-700">سداد متوقع</span>
                                <strong className="text-2xl text-emerald-700">{candidateAIInsight.paymentProbability}%</strong>
                              </div>
                              <div className="grid gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => copyAIMessage(candidateAIInsight.whatsappMessage)} className="gap-2 rounded-xl border-slate-200 bg-white">
                                  <Copy className="h-4 w-4" />
                                  نسخ الرسالة
                                </Button>
                                <Button type="button" size="sm" onClick={() => openAIWhatsApp(candidateAIInsight)} className="gap-2 rounded-xl bg-[#22C7A1] text-white hover:bg-[#1BAA8A]">
                                  <Send className="h-4 w-4" />
                                  فتح واتساب
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
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
                            onClick={() => window.open(`/contracts/${encodeURIComponent(candidate.contract.contract_number)}`, '_blank', 'noopener,noreferrer')}
                            className="gap-2 rounded-xl border-slate-200 bg-white"
                          >
                            <FileText className="h-4 w-4" />
                            فتح العقد
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                  );
                })}
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

      <AlertDialog open={!!removingItem} onOpenChange={(open) => !open && !isRemovingLegal && setRemovingItem(null)}>
        <AlertDialogContent className="rounded-2xl text-right" dir="rtl">
          <AlertDialogHeader className="text-right">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <AlertDialogTitle>إزالة الإجراء القانوني</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              سيتم إرجاع العقد {removingItem?.contract.contract_number || ''} إلى الحالة النشطة، وإغلاق القضية القانونية المرتبطة حتى لا تظهر ضمن قائمة المتابعة القانونية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            هذا لا يحذف السجل التاريخي للقضية، بل يغلقه كإجراء ملغى ويحافظ على أثر المراجعة.
          </div>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={isRemovingLegal} className="rounded-xl">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                removeLegalProcedure();
              }}
              disabled={isRemovingLegal}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemovingLegal ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جار الإزالة...
                </>
              ) : (
                'نعم، إزالة الإجراء'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinancialDelinquencyPage;
