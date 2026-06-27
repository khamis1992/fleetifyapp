import { useState } from "react"
import { Plus, FileText, DollarSign, Users, Clock, CheckCircle, XCircle, Eye, Edit, FileDown, MessageCircle, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { ResponsivePageActions } from "@/components/ui/responsive-page-actions"
import { generateShortContractNumber } from "@/utils/contractNumberGenerator"
import { PageHelp } from "@/components/help";
import { QuotationsPageHelpContent } from "@/components/help/content";

import { useFleetifyTranslation } from "@/hooks/useTranslation";
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

export default function Quotations() {
  const { t } = useFleetifyTranslation("ui");
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const { user } = useAuth()
  const { filter, companyId, hasGlobalAccess, getQueryKey } = useUnifiedCompanyAccess()
  const { formatCurrency } = useCurrencyFormatter()
  const queryClient = useQueryClient()
  
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

      // Generate contract number
      const contractNumber = generateShortContractNumber()
      
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

      // Create contract
      const { error: contractError } = await supabase
        .from('contracts')
        .insert([{
          contract_number: contractNumber,
          customer_id: quotation.customer_id,
          vehicle_id: quotation.vehicle_id,
          contract_type: 'rental',
          contract_amount: quotation.total_amount,
          monthly_amount: quotation.quotation_type === 'monthly' ? quotation.rate_per_unit : 0,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          contract_date: new Date().toISOString().split('T')[0],
          description: quotation.description,
          terms: quotation.terms,
          status: 'active',
          company_id: quotation.company_id,
          created_by: user?.id
        }])

      if (contractError) throw contractError

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'converted': return 'bg-blue-100 text-blue-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'converted': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

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
  const shareViaWhatsApp = async (quotation: any) => {
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
    const cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '')
    
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
    
    const customerName = customer?.customer_type === 'corporate' 
      ? customer.company_name 
      : `${customer?.first_name} ${customer?.last_name}`

    const vehicleInfo = vehicle 
      ? `\nالمركبة: ${vehicle.make} ${vehicle.model} - ${vehicle.plate_number}`
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 space-y-6">
      {/* Header */}
      <ResponsivePageActions
        title="عروض الأسعار"
        subtitle="إنشاء وإدارة عروض الأسعار للعملاء وتحويلها لعقود"
        primaryAction={{
          id: 'new-quotation',
          label: 'عرض سعر جديد',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setShowQuotationForm(true)
        }}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">قيد الانتظار</CardTitle>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-sm">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingQuotations.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">عرض معلق</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">مقبولة</CardTitle>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-sm">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{acceptedQuotations.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">تم القبول</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">مرفوضة</CardTitle>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <XCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rejectedQuotations.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">تم الرفض</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">محولة لعقود</CardTitle>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-sm">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{convertedQuotations.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">تم التحويل</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">القيمة الإجمالية</CardTitle>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-sm">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalQuotationValue)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">العروض المعلقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotations List */}
      <div className="grid gap-4">
        {quotations?.map((quotation) => (
          <Card key={quotation.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">عرض سعر رقم {quotation.quotation_number}</h3>
                    <Badge className={getStatusColor(quotation.status)}>
                      {getStatusIcon(quotation.status)}
                      <span className="mr-1">
                        {quotation.status === 'pending' ? 'معلق' :
                         quotation.status === 'accepted' ? 'مقبول' :
                         quotation.status === 'rejected' ? 'مرفوض' : 'محول'}
                      </span>
                    </Badge>
                    {hasGlobalAccess && quotation.companies && (
                      <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700">
                        <Building className="h-3 w-3 mr-1" />
                        {quotation.companies.name}
                      </Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {quotation.customers ? (
                          quotation.customers.customer_type === 'corporate'
                            ? quotation.customers.company_name
                            : `${quotation.customers.first_name} ${quotation.customers.last_name}`
                        ) : (
                          'عميل غير محدد'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {quotation.duration} {quotation.quotation_type === 'daily' ? 'يوم' :
                                            quotation.quotation_type === 'weekly' ? 'أسبوع' : 'شهر'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(quotation.total_amount || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        صالح حتى: {new Date(quotation.valid_until).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>

                  {quotation.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{quotation.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="default" className="rounded-xl hover:shadow-sm min-h-[44px] border-slate-200 dark:border-slate-700">
                    <Eye className="h-4 w-4 mr-1" />
                    عرض
                  </Button>
                  <Button variant="outline" size="default" className="rounded-xl hover:shadow-sm min-h-[44px] border-slate-200 dark:border-slate-700">
                    <FileDown className="h-4 w-4 mr-1" />{t("pdf")}</Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => shareViaWhatsApp(quotation)}
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl hover:shadow-sm min-h-[44px] border-green-200 dark:border-green-800"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    ارسال
                  </Button>
                  {quotation.status === 'accepted' && (
                    <Button
                      size="default"
                      onClick={() => convertToContractMutation.mutate(quotation.id)}
                      disabled={convertToContractMutation.isPending}
                      className="bg-teal-500 hover:bg-teal-600 rounded-xl shadow-sm min-h-[44px]"
                    >
                      تحويل لعقد
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {quotations?.length === 0 && (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">لا توجد عروض أسعار بعد</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-4">
                ابدأ في إنشاء عروض أسعار جديدة للعملاء
              </p>
              <Button onClick={() => setShowQuotationForm(true)} className="bg-teal-500 hover:bg-teal-600 rounded-xl shadow-sm min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                إنشاء عرض سعر جديد
              </Button>
            </CardContent>
          </Card>
        )}
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
                            ? customer.company_name
                            : `${customer.first_name} ${customer.last_name}`}
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
                          {vehicle.make} {vehicle.model} - {vehicle.plate_number}
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
                  <Label htmlFor="rate_per_unit" className="text-slate-700 dark:text-slate-300">السعر لكل وحدة (د.ك) *</Label>
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
                  <Label htmlFor="total_amount" className="text-slate-700 dark:text-slate-300">المبلغ الإجمالي (د.ك) *</Label>
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
                    محسوب تلقائياً: {calculatedAmount.toFixed(3)} د.ك
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
    <PageHelp content={<QuotationsPageHelpContent />} />

    </div>
  )
}