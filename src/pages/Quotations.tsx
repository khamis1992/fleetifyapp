import { useMemo, useState } from "react"
import {
  Plus, FileText, DollarSign, Users, Clock, CheckCircle, XCircle, Eye, FileDown,
  MessageCircle, Building, CalendarDays, RefreshCw, Search, Sparkles, ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import type { Tables } from "@/integrations/supabase/types"
import { useAuth } from "@/contexts/AuthContext"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { PageHelp } from "@/components/help";
import { QuotationsPageHelpContent } from "@/components/help/content";
import { useRentalViolationOverride } from '@/contexts/RentalViolationOverrideContext';
import { RentalEligibilityConfirmationCancelledError } from '@/contexts/rentalViolationOverrideErrors';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
import { fleetGradient } from "@/components/dashboard/workspace/model";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

interface QuotationFormData {
  customer_id: string
  vehicle_id?: string
  quotation_type: 'daily' | 'weekly' | 'monthly'
  duration: number
  rate_per_unit: number
  total_amount: number
  description?: string
  terms?: string
  valid_until: string
}

type QuotationWithRelations = Tables<'quotations'> & {
  customers?: Pick<Tables<'customers'>, 'id' | 'first_name' | 'last_name' | 'company_name' | 'customer_type' | 'phone' | 'alternative_phone'> | null
  vehicles?: Pick<Tables<'vehicles'>, 'id' | 'make' | 'model' | 'year' | 'plate_number'> | null
  companies?: Pick<Tables<'companies'>, 'id' | 'name' | 'name_ar' | 'logo_url'> | null
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'converted'

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  converted: 'محول',
}

const statusTones: Record<string, 'ok' | 'warn' | 'risk' | 'info'> = {
  pending: 'warn',
  accepted: 'ok',
  rejected: 'risk',
  converted: 'info',
}

const statusColors: Record<string, string> = {
  pending: '#d5ad69',
  accepted: '#7c9e65',
  rejected: '#b86d50',
  converted: '#2f7966',
}

const typeLabels: Record<string, string> = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' }
const typeUnits: Record<string, string> = { daily: 'يوم', weekly: 'أسبوع', monthly: 'شهر' }

const formatDay = (value: string) => new Date(value).toLocaleDateString('en-GB')

export default function Quotations() {
  const { t } = useFleetifyTranslation("ui");
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now())
  const { user } = useAuth()
  const { filter, companyId, hasGlobalAccess, getQueryKey } = useUnifiedCompanyAccess()
  const { formatCurrency } = useCurrencyFormatter()
  const queryClient = useQueryClient()
  const { confirmRentalEligibility } = useRentalViolationOverride()

  const { register, handleSubmit, watch, reset, setValue } = useForm<QuotationFormData>({
    defaultValues: {
      quotation_type: 'daily',
      duration: 1,
      total_amount: 0
    }
  })

  const quotationType = watch('quotation_type')
  const duration = watch('duration')
  const ratePerUnit = watch('rate_per_unit')
  const totalAmount = watch('total_amount')

  // Auto calculate total amount when duration or rate changes
  const calculatedAmount = (duration || 0) * (ratePerUnit || 0)

  // Update total amount when calculated amount changes, but allow manual override
  if (calculatedAmount !== totalAmount && calculatedAmount > 0) {
    setValue('total_amount', calculatedAmount)
  }

  // Fetch quotations with company scoping
  const { data: quotations, isLoading } = useQuery({
    queryKey: getQueryKey(['quotations']),
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            alternative_phone
          ),
          vehicles (
            id,
            make,
            model,
            year,
            plate_number
          ),
          companies (
            id,
            name,
            name_ar,
            logo_url
          )
        `)
        .order('created_at', { ascending: false })

      // Apply company filter for non-global access users
      if (!hasGlobalAccess && filter.company_id) {
        query = query.eq('company_id', filter.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })

  // Fetch customers for dropdown with company scoping
  const { data: customers } = useQuery({
    queryKey: getQueryKey(['customers-list']),
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, phone, alternative_phone')
        .eq('is_active', true)

      // Apply company filter for non-global access users
      if (!hasGlobalAccess && filter.company_id) {
        query = query.eq('company_id', filter.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })

  // Fetch available vehicles for dropdown with company scoping
  const { data: vehicles } = useQuery({
    queryKey: getQueryKey(['available-vehicles']),
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('id, plate_number, make, model, year')

      // Apply company filter for non-global access users
      if (!hasGlobalAccess && filter.company_id) {
        query = query.eq('company_id', filter.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: async (quotationData: QuotationFormData) => {
      if (!companyId) throw new Error('Company ID is required')

      // Generate quotation number
      const quotationNumber = `QT-${Date.now()}`

      const { data, error } = await supabase
        .from('quotations')
        .insert([{
          ...quotationData,
          quotation_number: quotationNumber,
          company_id: companyId,
          created_by: user?.id,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error
      return { ...data, quotation_number: quotationNumber }
    },
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(['quotations']) })
      setShowQuotationForm(false)
      reset()
      toast.success('تم إنشاء عرض السعر بنجاح', {
        action: {
          label: 'مشاركة عبر واتساب',
          onClick: () => shareViaWhatsApp(newQuotation)
        }
      })
    },
    onError: (error) => {
      console.error('Error creating quotation:', error)
      toast.error('حدث خطأ أثناء إنشاء عرض السعر')
    }
  })

  // Convert to contract mutation
  const convertToContractMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const quotation = quotations?.find(q => q.id === quotationId)
      if (!quotation) throw new Error('Quotation not found')

      let acceptedUnpaidViolations = false
      if (quotation.vehicle_id) {
        const confirmation = await confirmRentalEligibility({
          companyId: quotation.company_id,
          vehicleId: quotation.vehicle_id,
          customerId: quotation.customer_id,
        })
        if (!confirmation) throw new RentalEligibilityConfirmationCancelledError()
        acceptedUnpaidViolations = confirmation.acceptedUnpaidViolations
      }

      // Calculate start and end dates
      const startDate = new Date()
      const endDate = new Date()

      if (quotation.quotation_type === 'daily') {
        endDate.setDate(startDate.getDate() + quotation.duration)
      } else if (quotation.quotation_type === 'weekly') {
        endDate.setDate(startDate.getDate() + (quotation.duration * 7))
      } else if (quotation.quotation_type === 'monthly') {
        endDate.setMonth(startDate.getMonth() + quotation.duration)
      }

      const monthlyAmount = quotation.quotation_type === 'monthly'
        ? quotation.rate_per_unit
        : quotation.total_amount
      const { data: creationResult, error: contractError } = await supabase.rpc(
        'create_contract_with_violation_override_atomic',
        {
          p_company_id: quotation.company_id,
          p_customer_id: quotation.customer_id,
          p_vehicle_id: quotation.vehicle_id || undefined,
          p_contract_type: 'rental',
          p_contract_amount: quotation.total_amount,
          p_monthly_amount: monthlyAmount,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0],
          p_contract_date: new Date().toISOString().split('T')[0],
          p_description: quotation.description || undefined,
          p_terms: quotation.terms || undefined,
          p_created_by: user?.id,
          p_created_via: 'sales_quote',
          p_idempotency_key: `quote-conversion:${quotation.id}`,
          p_accept_unpaid_violations: acceptedUnpaidViolations,
        },
      )

      if (contractError) throw contractError
      const payload = creationResult as Record<string, unknown> | null
      if (!payload?.success || !payload.billing_graph_created) {
        throw new Error(String(payload?.error || 'لم يكتمل إنشاء العقد وشبكة الفوترة'))
      }

      // Update quotation status
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ status: 'converted' })
        .eq('id', quotationId)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(['quotations']) })
      toast.success('تم تحويل عرض السعر إلى عقد بنجاح')
    },
    onError: (error) => {
      if (error instanceof RentalEligibilityConfirmationCancelledError) return
      console.error('Error converting quotation:', error)
      toast.error('حدث خطأ أثناء تحويل عرض السعر')
    }
  })

  // Quotation statistics
  const pendingQuotations = quotations?.filter(q => q.status === 'pending') || []
  const acceptedQuotations = quotations?.filter(q => q.status === 'accepted') || []
  const rejectedQuotations = quotations?.filter(q => q.status === 'rejected') || []
  const convertedQuotations = quotations?.filter(q => q.status === 'converted') || []
  const totalQuotationValue = pendingQuotations.reduce((sum, q) => sum + (q.total_amount || 0), 0)

  const weekAhead = Date.now() + 7 * 24 * 60 * 60 * 1000
  const expiringSoon = pendingQuotations.filter(q => new Date(q.valid_until).getTime() <= weekAhead)

  const conversionRate = quotations?.length
    ? Math.round((convertedQuotations.length / quotations.length) * 100)
    : 0

  const conversionRows = [
    { label: 'معلق', value: pendingQuotations.length, color: statusColors.pending },
    { label: 'مقبول', value: acceptedQuotations.length, color: statusColors.accepted },
    { label: 'مرفوض', value: rejectedQuotations.length, color: statusColors.rejected },
    { label: 'محول', value: convertedQuotations.length, color: statusColors.converted },
  ].map(row => ({
    ...row,
    percent: quotations?.length ? (row.value / quotations.length) * 100 : 0,
  }))

  const filteredQuotations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return (quotations || []).filter(q => {
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter
      if (!matchesStatus) return false
      if (!term) return true
      const customerName = q.customers
        ? q.customers.customer_type === 'corporate'
          ? q.customers.company_name || ''
          : `${q.customers.first_name} ${q.customers.last_name}`
        : ''
      return `${q.quotation_number} ${customerName}`.toLowerCase().includes(term)
    })
  }, [quotations, statusFilter, searchTerm])

  const visibleQuotations = filteredQuotations.slice(0, 12)

  // Generate approval link for quotation
  const generateApprovalLink = async (quotationId: string) => {
    try {
      // Generate token and set expiry (30 days)
      const { data, error } = await supabase
        .rpc('generate_approval_token')

      if (error) throw error;

      const approvalToken = data;
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create a shorter, user-friendly approval URL that points to our app
      const approvalUrl = `${window.location.origin}/quotation-approval?token=${approvalToken}`;

      // Update quotation with approval data
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          approval_token: approvalToken,
          approval_expires_at: expiryDate,
          client_approval_url: approvalUrl
        })
        .eq('id', quotationId);

      if (updateError) throw updateError;

      return approvalUrl;
    } catch (error) {
      console.error('Error generating approval link:', error);
      return null;
    }
  };

  // Share quotation via WhatsApp with approval link
  const shareViaWhatsApp = async (quotation: QuotationWithRelations) => {
    // Get customer and vehicle data from quotation relations or fallback to lookup
    const customer = quotation.customers || customers?.find(c => c.id === quotation.customer_id)
    const vehicle = quotation.vehicles || vehicles?.find(v => v.id === quotation.vehicle_id)

    // Get customer phone number (prefer phone over alternative_phone)
    const customerPhone = customer?.phone || customer?.alternative_phone

    if (!customerPhone) {
      toast.error('رقم هاتف العميل غير متوفر')
      return
    }

    // Generate approval link
    const approvalUrl = await generateApprovalLink(quotation.id);

    // Clean and format phone number (remove spaces, dashes, etc.)
    const cleanPhone = customerPhone.replace(/[\s-()]/g, '')

    // Add Kuwait country code if not present
    let formattedPhone = cleanPhone
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('965')) {
        formattedPhone = '+' + cleanPhone
      } else if (cleanPhone.startsWith('0')) {
        formattedPhone = '+965' + cleanPhone.substring(1)
      } else {
        formattedPhone = '+965' + cleanPhone
      }
    }

    const vehicleInfo = vehicle
      ? `\nالمركبة: ${vehicle.make || ''} ${vehicle.model || ''} - ${vehicle.plate_number || 'غير محدد'}`
      : ''

    const durationType = quotation.quotation_type === 'daily' ? 'يوم' :
                        quotation.quotation_type === 'weekly' ? 'أسبوع' : 'شهر'

    const message = `*عرض سعر من شركة ${quotation.companies?.name || user?.company?.name || 'شركتنا'}*

*رقم العرض:* ${quotation.quotation_number}${vehicleInfo}

*تفاصيل السعر:*
• نوع الإيجار: ${quotation.quotation_type === 'daily' ? 'يومي' : quotation.quotation_type === 'weekly' ? 'أسبوعي' : 'شهري'}
• المدة: ${quotation.duration} ${durationType}
• السعر لكل ${durationType}: ${formatCurrency(quotation.rate_per_unit || 0)}
• *المبلغ الإجمالي: ${formatCurrency(quotation.total_amount || 0)}*

*صالح حتى:* ${new Date(quotation.valid_until).toLocaleDateString('en-GB')}

${quotation.description ? `*الوصف:* ${quotation.description}\n` : ''}
${quotation.terms ? `*الشروط والأحكام:* ${quotation.terms}\n` : ''}

${approvalUrl ? `\n*للموافقة على العرض أو رفضه، يرجى النقر على الرابط:*\n🔗 ${approvalUrl}\n\n*صالح لمدة 30 يوماً*` : ''}

نتطلع لخدمتكم!
للاستفسار، يرجى الرد على هذه الرسالة.
    `.trim()

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')

    // Refresh quotations to show updated data
    queryClient.invalidateQueries({ queryKey: getQueryKey(['quotations']) });

    toast.success('تم إرسال العرض مع رابط الموافقة عبر واتساب');
  }

  const onSubmit = (data: QuotationFormData) => {
    createQuotationMutation.mutate(data)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: getQueryKey(['quotations']) })
      setRefreshedAt(Date.now())
    } finally {
      setRefreshing(false)
    }
  }

  const insightRows = [
    {
      key: 'awaiting',
      urgent: pendingQuotations.length > 0,
      icon: Clock,
      title: 'عروض تنتظر رد العميل',
      reason: pendingQuotations.length > 0 ? 'تابعها أو أعد إرسالها عبر واتساب برابط الموافقة' : 'لا توجد عروض معلقة حالياً',
      badge: `${pendingQuotations.length} عرض`,
    },
    {
      key: 'ready',
      urgent: acceptedQuotations.length > 0,
      icon: CheckCircle,
      title: 'مقبولة بانتظار التحويل',
      reason: acceptedQuotations.length > 0 ? 'حوّلها إلى عقود لتثبيت الإيراد' : 'لا توجد عروض مقبولة غير محولة',
      badge: `${acceptedQuotations.length} عرض`,
    },
    {
      key: 'expiring',
      urgent: expiringSoon.length > 0,
      icon: CalendarDays,
      title: 'تنتهي صلاحيتها قريبًا',
      reason: 'عروض معلقة تنتهي صلاحيتها خلال 7 أيام أو انتهت بالفعل',
      badge: `${expiringSoon.length} عرض`,
    },
  ]

  const metrics = [
    { label: 'قيد الانتظار', value: pendingQuotations.length, hint: 'بانتظار رد العميل', icon: Clock, accent: true },
    { label: 'مقبولة', value: acceptedQuotations.length, hint: 'جاهزة للتحويل لعقد', icon: CheckCircle, accent: false },
    { label: 'مرفوضة', value: rejectedQuotations.length, hint: 'عروض مرفوضة', icon: XCircle, accent: false },
    { label: 'محولة لعقود', value: convertedQuotations.length, hint: 'أصبحت عقودًا فعالة', icon: FileText, accent: false },
    { label: 'قيمة معلقة', value: formatCurrency(totalQuotationValue), hint: 'مجموع العروض المعلقة', icon: DollarSign, accent: false },
  ]

  const customerName = (quotation: QuotationWithRelations) =>
    quotation.customers
      ? quotation.customers.customer_type === 'corporate'
        ? quotation.customers.company_name
        : `${quotation.customers.first_name} ${quotation.customers.last_name}`
      : 'عميل غير محدد'

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> عروض الأسعار
            </div>
            <h1>عروض الأسعار</h1>
            <p>إنشاء عروض الأسعار للعملاء، مشاركتها برابط موافقة، وتحويلها إلى عقود.</p>
          </div>
          <div className="dw-header-tools">
            <button
              className="dw-icon-button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="تحديث عروض الأسعار"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarDays size={17} />
            <span>{new Date().toLocaleDateString('ar-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="dw-primary-actions">
            <button className="dw-button dw-button-primary" onClick={() => setShowQuotationForm(true)}>
              <Plus size={17} />
              عرض سعر جديد
            </button>
          </div>
        </div>

        <section className="dw-metrics wk-metrics-5" aria-label="مؤشرات العروض">
          {metrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
                <metric.icon size={19} />
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel number="01" title="أولويات المتابعة" subtitle="العروض التي تستحق انتباهك أولاً" className="wk-panel-main">
            <div className="dw-priority-toolbar">
              <div className="dw-filters" role="group" aria-label="تصفية العروض">
                {([
                  { value: 'all', label: 'الكل', count: quotations?.length || 0 },
                  { value: 'pending', label: 'معلق', count: pendingQuotations.length },
                  { value: 'accepted', label: 'مقبول', count: acceptedQuotations.length },
                  { value: 'rejected', label: 'مرفوض', count: rejectedQuotations.length },
                  { value: 'converted', label: 'محول', count: convertedQuotations.length },
                ] as const).map(chip => (
                  <button
                    key={chip.value}
                    aria-pressed={statusFilter === chip.value}
                    onClick={() => setStatusFilter(chip.value)}
                  >
                    {chip.label}<span>{isLoading ? '—' : chip.count}</span>
                  </button>
                ))}
              </div>
              <span className="dw-priority-note"><Sparkles size={13} />تصفية سريعة</span>
            </div>
            <div className="dw-priority-list" aria-live="polite">
              {insightRows.map((row) => {
                const Icon = row.icon;
                return (
                  <a key={row.key} href="#fr-quotations" className="dw-priority-row">
                    <span className={`dw-priority-icon ${row.urgent ? 'is-urgent' : ''}`}>
                      <Icon size={19} />
                    </span>
                    <div className="dw-priority-copy">
                      <h3>{row.title}</h3>
                      <p>{row.reason}</p>
                    </div>
                    <span className={`dw-priority-badge ${row.urgent ? 'is-urgent' : ''}`}>{row.badge}</span>
                    <ChevronLeft className="dw-row-arrow" size={16} />
                  </a>
                );
              })}
            </div>
            <div className="dw-panel-foot">
              <MessageCircle size={14} />
              <span>مشاركة العرض عبر واتساب تولّد رابط موافقة إلكترونية صالحاً 30 يوماً.</span>
            </div>
          </PagePanel>

          <PagePanel number="02" title="معدل التحويل" subtitle="نسبة العروض التي أصبحت عقودًا" className="wk-panel-side">
            {isLoading ? (
              <PageLoading />
            ) : !quotations?.length ? (
              <PageEmpty icon={FileText} message="لا توجد عروض أسعار بعد" />
            ) : (
              <>
                <div className="dw-fleet-visual">
                  <div
                    className="dw-fleet-ring"
                    style={{ background: fleetGradient(conversionRows.map(row => ({ ...row, path: '#' }))) }}
                    role="img"
                    aria-label={`معدل تحويل العروض ${conversionRate}%`}
                  >
                    <div>
                      <strong>
                        {conversionRate}
                        <small>%</small>
                      </strong>
                      <span>معدل التحويل</span>
                    </div>
                  </div>
                  <div className="dw-fleet-annotation">
                    <span>تحولت إلى عقود</span>
                    <strong>{convertedQuotations.length}</strong>
                    <small>عرض من إجمالي {quotations.length}</small>
                  </div>
                </div>
                <div className="wk-legend">
                  {conversionRows.map(row => (
                    <div key={row.label} className="wk-legend-row">
                      <i style={{ background: row.color }} />
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <small>{Math.round(row.percent)}%</small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PagePanel>

          <PagePanel
            number="03"
            title="سجل العروض"
            subtitle="جميع عروض الأسعار المرتبطة بحسابك"
            className="wk-panel-full"
            id="fr-quotations"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 210 }}
                    placeholder="ابحث برقم العرض أو العميل…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="بحث في العروض"
                  />
                </div>
              </div>
            }
          >
            {isLoading ? (
              <PageLoading />
            ) : visibleQuotations.length === 0 ? (
              <PageEmpty icon={FileText} message={quotations?.length ? 'لا توجد عروض مطابقة لبحثك' : 'لا توجد عروض أسعار بعد'}>
                {!quotations?.length && (
                  <button className="dw-button" onClick={() => setShowQuotationForm(true)}>
                    <Plus size={16} />
                    إنشاء عرض سعر جديد
                  </button>
                )}
              </PageEmpty>
            ) : (
              <>
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">عروض الأسعار</caption>
                    <thead>
                      <tr>
                        <th scope="col">العرض / العميل</th>
                        <th scope="col">النوع والمدة</th>
                        <th scope="col">المبلغ الإجمالي</th>
                        <th scope="col">صالح حتى</th>
                        <th scope="col">الحالة</th>
                        <th scope="col"><span className="sr-only">إجراءات</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleQuotations.map((quotation) => (
                        <tr key={quotation.id}>
                          <td>
                            <strong><bdi>عرض رقم {quotation.quotation_number}</bdi></strong>
                            <span className="wk-sub">
                              <Users size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                              <bdi>{customerName(quotation)}</bdi>
                              {hasGlobalAccess && quotation.companies && (
                                <span style={{ marginInlineStart: 8, color: '#829174' }}>
                                  <Building size={10} style={{ verticalAlign: 'middle' }} /> {quotation.companies.name}
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            {typeLabels[quotation.quotation_type]} · {quotation.duration} {typeUnits[quotation.quotation_type]}
                            <span className="wk-sub">{formatCurrency(quotation.rate_per_unit || 0)} للوحدة</span>
                          </td>
                          <td>{formatCurrency(quotation.total_amount || 0)}</td>
                          <td><bdi>{formatDay(quotation.valid_until)}</bdi></td>
                          <td>
                            <span className={`wk-badge is-${statusTones[quotation.status] ?? 'neutral'}`}>
                              {statusLabels[quotation.status] || quotation.status}
                            </span>
                          </td>
                          <td>
                            <div className="wk-actions">
                              <button
                                type="button"
                                className="wk-action"
                                title="مشاركة عبر واتساب"
                                aria-label={`مشاركة العرض ${quotation.quotation_number} عبر واتساب`}
                                onClick={() => shareViaWhatsApp(quotation)}
                              >
                                <MessageCircle size={15} />
                              </button>
                              <button type="button" className="wk-action" title={t("pdf")} aria-label={`تصدير العرض ${quotation.quotation_number} PDF`}>
                                <FileDown size={15} />
                              </button>
                              <button type="button" className="wk-action" title="عرض التفاصيل" aria-label={`عرض تفاصيل ${quotation.quotation_number}`}>
                                <Eye size={15} />
                              </button>
                              {quotation.status === 'accepted' && (
                                <button
                                  type="button"
                                  className="wk-action is-primary"
                                  title="تحويل لعقد"
                                  aria-label={`تحويل العرض ${quotation.quotation_number} إلى عقد`}
                                  disabled={convertToContractMutation.isPending}
                                  onClick={() => convertToContractMutation.mutate(quotation.id)}
                                >
                                  <FileText size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredQuotations.length > visibleQuotations.length && (
                  <p className="wk-more-note">+{filteredQuotations.length - visibleQuotations.length} عرض آخر — استخدم التصفية أو البحث لتضييق النتائج</p>
                )}
              </>
            )}
          </PagePanel>
        </div>

        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> عروض الأسعار
          </span>
          <span role="status">
            {refreshing ? 'جاري تحديث البيانات…' : `آخر تحديث ${new Date(refreshedAt).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </footer>
      </div>

      {/* Quotation Form Dialog */}
      <Dialog open={showQuotationForm} onOpenChange={setShowQuotationForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">إنشاء عرض سعر جديد</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* معلومات أساسية */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">المعلومات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer" className="text-slate-700 dark:text-slate-300">العميل *</Label>
                  <Select onValueChange={(value) => setValue('customer_id', value)}>
                    <SelectTrigger id="customer" className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.customer_type === 'corporate'
                            ? customer.company_name || 'شركة بدون اسم'
                            : [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'عميل بدون اسم'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle" className="text-slate-700 dark:text-slate-300">المركبة</Label>
                  <Select onValueChange={(value) => setValue('vehicle_id', value)}>
                    <SelectTrigger id="vehicle" className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="اختر المركبة (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.make || ''} {vehicle.model || ''} - {vehicle.plate_number || 'غير محدد'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* تفاصيل السعر */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">تفاصيل السعر</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quotation_type" className="text-slate-700 dark:text-slate-300">نوع الإيجار *</Label>
                  <Select
                    value={quotationType}
                    onValueChange={(value) => setValue('quotation_type', value as 'daily' | 'weekly' | 'monthly')}
                  >
                    <SelectTrigger id="quotation_type" className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومي</SelectItem>
                      <SelectItem value="weekly">أسبوعي</SelectItem>
                      <SelectItem value="monthly">شهري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-slate-700 dark:text-slate-300">المدة *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="عدد الأيام/الأسابيع/الشهور"
                    className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('duration', { required: true, valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit" className="text-slate-700 dark:text-slate-300">السعر لكل وحدة (ر.ق) *</Label>
                  <Input
                    id="rate_per_unit"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('rate_per_unit', { required: true, valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount" className="text-slate-700 dark:text-slate-300">المبلغ الإجمالي (ر.ق) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    className="font-semibold text-slate-900 dark:text-slate-100 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('total_amount', { required: true, valueAsNumber: true })}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    محسوب تلقائياً: {calculatedAmount.toFixed(2)} ر.ق
                  </p>
                </div>
              </div>
            </div>

            {/* تفاصيل إضافية */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">التفاصيل الإضافية</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_until" className="text-slate-700 dark:text-slate-300">صالح حتى *</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('valid_until', { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">الوصف</Label>
                  <Textarea
                    id="description"
                    placeholder="وصف موجز لعرض السعر..."
                    className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('description')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms" className="text-slate-700 dark:text-slate-300">الشروط والأحكام</Label>
                  <Textarea
                    id="terms"
                    placeholder="الشروط والأحكام الخاصة بعرض السعر..."
                    className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    {...register('terms')}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowQuotationForm(false)
                  reset()
                }}
                className="px-6 rounded-xl min-h-[44px] border-slate-200 dark:border-slate-700"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createQuotationMutation.isPending}
                className="px-6 bg-teal-500 hover:bg-teal-600 rounded-xl shadow-sm min-h-[44px]"
              >
                {createQuotationMutation.isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    <PageHelp title="مساعدة عروض الأسعار">
      <QuotationsPageHelpContent />
    </PageHelp>

    </div>
  )
}
