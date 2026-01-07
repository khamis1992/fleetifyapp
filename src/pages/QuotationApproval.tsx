import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, Car, DollarSign } from "lucide-react"
import { toast } from "sonner"

interface Quotation {
  id: string
  quotation_number: string
  quotation_type: string
  duration: number
  rate_per_unit: number
  total_amount: number
  description?: string
  terms?: string
  valid_until: string
  status: string
  approved_by_client?: boolean
  client_comments?: string
  approved_at?: string
  customers: {
    id: string
    first_name: string
    last_name: string
    company_name?: string
    customer_type: string
    phone?: string
    email?: string
  }
  vehicles?: {
    id: string
    make: string
    model: string
    year: number
    plate_number: string
  }
  companies: {
    id: string
    name: string
    name_ar?: string
    logo_url?: string
    phone?: string
    email?: string
    address?: string
  }
}

export default function QuotationApproval() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('رمز الموافقة مفقود')
      setLoading(false)
      return
    }

    const fetchQuotation = async () => {
      try {
        const response = await fetch(
          `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/quotation-approval?token=${token}`
        )
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'فشل في جلب بيانات العرض')
        }

        setQuotation(data.quotation)
      } catch (err: unknown) {
        setError(err.message || 'حدث خطأ أثناء جلب بيانات العرض')
      } finally {
        setLoading(false)
      }
    }

    fetchQuotation()
  }, [token])

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!token) return

    setProcessing(true)
    try {
      const response = await fetch(
        'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/quotation-approval',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            action,
            comments: comments || undefined
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'فشل في معالجة الطلب')
      }

      setProcessed(true)
      toast.success(data.message)
      
      // Update local quotation state
      if (quotation) {
        setQuotation({
          ...quotation,
          approved_by_client: action === 'approve',
          status: action === 'approve' ? 'approved' : 'rejected',
          client_comments: comments || null,
          approved_at: new Date().toISOString()
        })
      }
    } catch (err: unknown) {
      toast.error(err.message || 'حدث خطأ أثناء معالجة الطلب')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-600">خطأ</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">عرض السعر غير موجود</h2>
            <p className="text-muted-foreground">لم يتم العثور على عرض السعر المطلوب</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(quotation.valid_until) < new Date()
  const isProcessed = quotation.approved_by_client !== null || processed

  const customerName = quotation.customers.customer_type === 'corporate'
    ? quotation.customers.company_name
    : `${quotation.customers.first_name} ${quotation.customers.last_name}`

  const durationType = quotation.quotation_type === 'daily' ? 'يوم' : 
                      quotation.quotation_type === 'weekly' ? 'أسبوع' : 'شهر'

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {quotation.companies.logo_url && (
                  <img 
                    src={quotation.companies.logo_url} 
                    alt={quotation.companies.name}
                    className="h-16 w-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold">{quotation.companies.name}</h1>
                  <p className="text-muted-foreground">{quotation.companies.name_ar}</p>
                  {quotation.companies.phone && (
                    <p className="text-sm text-muted-foreground">{quotation.companies.phone}</p>
                  )}
                </div>
              </div>
              <Badge 
                className={
                  isProcessed 
                    ? quotation.approved_by_client 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                    : isExpired 
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-yellow-100 text-yellow-800'
                }
              >
                {isProcessed 
                  ? quotation.approved_by_client 
                    ? 'تم القبول'
                    : 'تم الرفض'
                  : isExpired 
                    ? 'منتهي الصلاحية'
                    : 'في انتظار الموافقة'
                }
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              عرض سعر رقم {quotation.quotation_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">العميل</Label>
                <p className="text-lg font-semibold">{customerName}</p>
              </div>
              
              {quotation.vehicles && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    المركبة
                  </Label>
                  <p className="text-lg font-semibold">
                    {quotation.vehicles.make} {quotation.vehicles.model} ({quotation.vehicles.year})
                  </p>
                  <p className="text-sm text-muted-foreground">{quotation.vehicles.plate_number}</p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">نوع الإيجار</Label>
                <p className="text-lg font-semibold">
                  {quotation.quotation_type === 'daily' ? 'يومي' : 
                   quotation.quotation_type === 'weekly' ? 'أسبوعي' : 'شهري'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">المدة</Label>
                <p className="text-lg font-semibold">{quotation.duration} {durationType}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">السعر لكل {durationType}</Label>
                <p className="text-lg font-semibold">{quotation.rate_per_unit.toFixed(3)} د.ك</p>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg">
              <Label className="text-sm font-medium text-muted-foreground">المبلغ الإجمالي</Label>
              <p className="text-3xl font-bold text-primary">{quotation.total_amount.toFixed(3)} د.ك</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                صالح حتى
              </Label>
              <p className="text-lg font-semibold">
                {new Date(quotation.valid_until).toLocaleDateString('en-US')}
              </p>
            </div>

            {quotation.description && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">الوصف</Label>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{quotation.description}</p>
              </div>
            )}

            {quotation.terms && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">الشروط والأحكام</Label>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{quotation.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Actions */}
        {!isProcessed && !isExpired && (
          <Card>
            <CardHeader>
              <CardTitle>اتخاذ قرار بشأن عرض السعر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comments">تعليقات (اختياري)</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="اكتب أي تعليقات أو ملاحظات..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleApproval('approve')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'جاري المعالجة...' : 'موافق على العرض'}
                </Button>
                
                <Button 
                  onClick={() => handleApproval('reject')}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {processing ? 'جاري المعالجة...' : 'رفض العرض'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Processed Message */}
        {isProcessed && (
          <Card>
            <CardContent className="pt-6 text-center">
              {quotation.approved_by_client ? (
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              ) : (
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {quotation.approved_by_client ? 'تم قبول العرض' : 'تم رفض العرض'}
              </h2>
              <p className="text-muted-foreground">
                تم معالجة عرض السعر بتاريخ {quotation.approved_at ? new Date(quotation.approved_at).toLocaleDateString('en-US') : 'غير محدد'}
              </p>
              {quotation.client_comments && (
                <div className="mt-4 bg-slate-50 p-3 rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">التعليقات</Label>
                  <p className="text-slate-700">{quotation.client_comments}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expired Message */}
        {isExpired && !isProcessed && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="mx-auto h-12 w-12 text-slate-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-slate-600">انتهت صلاحية العرض</h2>
              <p className="text-muted-foreground">
                انتهت صلاحية هذا العرض في {new Date(quotation.valid_until).toLocaleDateString('en-US')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                يرجى التواصل مع الشركة للحصول على عرض جديد
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}