import { useState } from "react"
import { Plus, FileText, DollarSign, Users, Clock, CheckCircle, XCircle, Eye, Edit, FileDown, MessageCircle } from "lucide-react"
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
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null)
  const { user } = useAuth()
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

  // Fetch quotations
  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, phone, alternative_phone')
        .eq('is_active', true)

      if (error) throw error
      return data
    }
  })

  // Fetch available vehicles for dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['available-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, year')
        .eq('is_active', true)
        .in('status', ['available', 'reserved'])

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
          company_id: user?.profile?.company_id || user?.company?.id,
          created_by: user?.id,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error
      return { ...data, quotation_number: quotationNumber }
    },
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
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
      const contractNumber = `CT-${Date.now()}`
      
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
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
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
      default: return 'bg-gray-100 text-gray-800'
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
      // Generate token and set expiry (7 days)
      const { data, error } = await supabase
        .rpc('generate_approval_token')

      if (error) throw error;

      const approvalToken = data;
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const approvalUrl = `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/quotation-approval?token=${approvalToken}`;

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
    const customer = customers?.find(c => c.id === quotation.customer_id)
    const vehicle = vehicles?.find(v => v.id === quotation.vehicle_id)
    
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

    const message = `*عرض سعر من شركة ${user?.company?.name || 'شركتنا'}*

*رقم العرض:* ${quotation.quotation_number}${vehicleInfo}

*تفاصيل السعر:*
• نوع الإيجار: ${quotation.quotation_type === 'daily' ? 'يومي' : quotation.quotation_type === 'weekly' ? 'أسبوعي' : 'شهري'}
• المدة: ${quotation.duration} ${durationType}
• السعر لكل ${durationType}: ${quotation.rate_per_unit?.toFixed(3)} د.ك
• *المبلغ الإجمالي: ${quotation.total_amount?.toFixed(3)} د.ك*

*صالح حتى:* ${new Date(quotation.valid_until).toLocaleDateString('en-GB')}

${quotation.description ? `*الوصف:* ${quotation.description}\n` : ''}
${quotation.terms ? `*الشروط والأحكام:* ${quotation.terms}\n` : ''}

${approvalUrl ? `\n*للموافقة على العرض أو رفضه، يرجى الضغط على الرابط التالي:*\n${approvalUrl}\n` : ''}

نتطلع لخدمتكم!
للاستفسار، يرجى الرد على هذه الرسالة.
    `.trim()

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    // Refresh quotations to show updated data
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">عروض الأسعار</h1>
          <p className="text-muted-foreground">
            إنشاء وإدارة عروض الأسعار للعملاء وتحويلها لعقود
          </p>
        </div>
        <Button onClick={() => setShowQuotationForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          عرض سعر جديد
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingQuotations.length}</div>
            <p className="text-xs text-muted-foreground">عرض معلق</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مقبولة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acceptedQuotations.length}</div>
            <p className="text-xs text-muted-foreground">تم القبول</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedQuotations.length}</div>
            <p className="text-xs text-muted-foreground">تم الرفض</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">محولة لعقود</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{convertedQuotations.length}</div>
            <p className="text-xs text-muted-foreground">تم التحويل</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة الإجمالية</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalQuotationValue.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">العروض المعلقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotations List */}
      <div className="grid gap-4">
        {quotations?.map((quotation) => (
          <Card key={quotation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">عرض سعر رقم {quotation.quotation_number}</h3>
                    <Badge className={getStatusColor(quotation.status)}>
                      {getStatusIcon(quotation.status)}
                      <span className="mr-1">
                        {quotation.status === 'pending' ? 'معلق' :
                         quotation.status === 'accepted' ? 'مقبول' :
                         quotation.status === 'rejected' ? 'مرفوض' : 'محول'}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        عرض سعر رقم {quotation.quotation_number}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {quotation.duration} {quotation.quotation_type === 'daily' ? 'يوم' : 
                                            quotation.quotation_type === 'weekly' ? 'أسبوع' : 'شهر'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {quotation.total_amount?.toFixed(3)} د.ك
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        صالح حتى: {new Date(quotation.valid_until).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                  
                  {quotation.description && (
                    <p className="text-sm text-muted-foreground">{quotation.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    عرض
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => shareViaWhatsApp(quotation)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    ارسال
                  </Button>
                  {quotation.status === 'accepted' && (
                    <Button 
                      size="sm"
                      onClick={() => convertToContractMutation.mutate(quotation.id)}
                      disabled={convertToContractMutation.isPending}
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عروض أسعار بعد</h3>
              <p className="text-muted-foreground text-center mb-4">
                ابدأ في إنشاء عروض أسعار جديدة للعملاء
              </p>
              <Button onClick={() => setShowQuotationForm(true)}>
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
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 text-primary">المعلومات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">العميل *</Label>
                  <Select onValueChange={(value) => setValue('customer_id', value)}>
                    <SelectTrigger id="customer">
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
                  <Label htmlFor="vehicle">المركبة</Label>
                  <Select onValueChange={(value) => setValue('vehicle_id', value)}>
                    <SelectTrigger id="vehicle">
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
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 text-primary">تفاصيل السعر</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quotation_type">نوع الإيجار *</Label>
                  <Select 
                    value={quotationType} 
                    onValueChange={(value) => setValue('quotation_type', value as 'daily' | 'weekly' | 'monthly')}
                  >
                    <SelectTrigger id="quotation_type">
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
                  <Label htmlFor="duration">المدة *</Label>
                  <Input 
                    id="duration"
                    type="number" 
                    min="1"
                    placeholder="عدد الأيام/الأسابيع/الشهور"
                    {...register('duration', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_per_unit">السعر لكل وحدة (د.ك) *</Label>
                  <Input 
                    id="rate_per_unit"
                    type="number" 
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    {...register('rate_per_unit', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">المبلغ الإجمالي (د.ك) *</Label>
                  <Input 
                    id="total_amount"
                    type="number" 
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    className="font-semibold text-primary"
                    {...register('total_amount', { required: true, valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    محسوب تلقائياً: {calculatedAmount.toFixed(3)} د.ك
                  </p>
                </div>
              </div>
            </div>

            {/* تفاصيل إضافية */}
            <div className="bg-card p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 text-primary">التفاصيل الإضافية</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_until">صالح حتى *</Label>
                  <Input 
                    id="valid_until"
                    type="date" 
                    {...register('valid_until', { required: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea 
                    id="description"
                    placeholder="وصف موجز لعرض السعر..."
                    {...register('description')} 
                    rows={2} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">الشروط والأحكام</Label>
                  <Textarea 
                    id="terms"
                    placeholder="الشروط والأحكام الخاصة بعرض السعر..."
                    {...register('terms')} 
                    rows={3} 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowQuotationForm(false)
                  reset()
                }}
                className="px-6"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createQuotationMutation.isPending}
                className="px-6"
              >
                {createQuotationMutation.isPending ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}