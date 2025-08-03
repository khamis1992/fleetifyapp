import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Car, User, Building2, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuotationData {
  id: string;
  quotation_number: string;
  quotation_type: string;
  duration: number;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  total_amount: number;
  valid_until: string;
  status: string;
  notes?: string;
  client_comments?: string;
  customers: {
    first_name_ar?: string;
    last_name_ar?: string;
    company_name_ar?: string;
    customer_type: string;
    phone?: string;
    email?: string;
  };
  vehicles?: {
    make?: string;
    model?: string;
    year?: number;
    plate_number?: string;
  };
  companies: {
    name: string;
    name_ar?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };
}

export default function QuotationApproval() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid approval link");
      setLoading(false);
      return;
    }

    fetchQuotation();
  }, [token]);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(
        `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/quotation-approval?token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch quotation');
      }

      const data = await response.json();
      setQuotation(data.quotation);
      setAlreadyProcessed(data.alreadyProcessed || false);
    } catch (err) {
      console.error('Error fetching quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/quotation-approval`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            action,
            comments: comments.trim() || undefined
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      const result = await response.json();
      
      toast({
        title: action === 'approve' ? "Quotation Approved" : "Quotation Rejected",
        description: result.message,
        variant: action === 'approve' ? "default" : "destructive"
      });

      // Update local state
      if (quotation) {
        setQuotation({
          ...quotation,
          status: result.action,
          client_comments: comments.trim() || undefined
        });
        setAlreadyProcessed(true);
      }

    } catch (err) {
      console.error('Error processing approval:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to process approval',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getCustomerName = (customer: QuotationData['customers']) => {
    if (customer.customer_type === 'company') {
      return customer.company_name_ar || 'شركة';
    }
    return `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'عميل';
  };

  const getRateDisplay = () => {
    if (!quotation) return '';
    
    switch (quotation.quotation_type) {
      case 'daily_rental':
        return `${quotation.daily_rate || 0} دينار/يوم`;
      case 'weekly_rental':
        return `${quotation.weekly_rate || 0} دينار/أسبوع`;
      case 'monthly_rental':
        return `${quotation.monthly_rate || 0} دينار/شهر`;
      case 'yearly_rental':
        return `${quotation.yearly_rate || 0} دينار/سنة`;
      default:
        return `${quotation.total_amount} دينار`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">جاري تحميل العرض...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">خطأ في الرابط</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {error || "الرابط غير صحيح أو منتهي الصلاحية"}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {quotation.companies.logo_url && (
                <img 
                  src={quotation.companies.logo_url} 
                  alt="Company Logo" 
                  className="w-16 h-16 object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {quotation.companies.name_ar || quotation.companies.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  {quotation.companies.phone && (
                    <span>📞 {quotation.companies.phone}</span>
                  )}
                  {quotation.companies.email && (
                    <span>📧 {quotation.companies.email}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Banner */}
        {alreadyProcessed && (
          <Card className="mb-6 border-l-4 border-l-yellow-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Badge variant={quotation.status === 'accepted' ? 'default' : 'destructive'}>
                  {quotation.status === 'accepted' ? 'تم القبول' : 'تم الرفض'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  تم معالجة هذا العرض بالفعل
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quotation Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              تفاصيل العرض
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">رقم العرض</label>
                <p className="font-semibold">{quotation.quotation_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">نوع العرض</label>
                <p className="font-semibold">
                  {quotation.quotation_type === 'rental' && 'إيجار'}
                  {quotation.quotation_type === 'daily_rental' && 'إيجار يومي'}
                  {quotation.quotation_type === 'weekly_rental' && 'إيجار أسبوعي'}
                  {quotation.quotation_type === 'monthly_rental' && 'إيجار شهري'}
                  {quotation.quotation_type === 'yearly_rental' && 'إيجار سنوي'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">المدة</label>
                <p className="font-semibold">{quotation.duration} أيام</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">صالح حتى</label>
                <p className="font-semibold">
                  {format(new Date(quotation.valid_until), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات العميل
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">{getCustomerName(quotation.customers)}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  {quotation.customers.phone && (
                    <span>📞 {quotation.customers.phone}</span>
                  )}
                  {quotation.customers.email && (
                    <span>📧 {quotation.customers.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            {quotation.vehicles && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  بيانات المركبة
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium">
                    {quotation.vehicles.make} {quotation.vehicles.model} {quotation.vehicles.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    رقم اللوحة: {quotation.vehicles.plate_number}
                  </p>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                تفاصيل التسعير
              </h3>
              <div className="bg-primary/5 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">السعر</label>
                    <p className="font-semibold">{getRateDisplay()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">المبلغ الإجمالي</label>
                    <p className="text-2xl font-bold text-primary">
                      {quotation.total_amount} دينار كويتي
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div>
                <h3 className="text-lg font-semibold mb-2">ملاحظات</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{quotation.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Section */}
        {!alreadyProcessed && (
          <Card>
            <CardHeader>
              <CardTitle>الرد على العرض</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="comments" className="text-sm font-medium">
                  التعليقات (اختياري)
                </label>
                <Textarea
                  id="comments"
                  placeholder="اكتب تعليقاتك هنا..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleApproval('approve')}
                  disabled={processing}
                  className="flex-1"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {processing ? "جاري المعالجة..." : "قبول العرض"}
                </Button>
                <Button
                  onClick={() => handleApproval('reject')}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {processing ? "جاري المعالجة..." : "رفض العرض"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>هذا الرابط خاص بك فقط، يرجى عدم مشاركته مع الآخرين</p>
        </div>
      </div>
    </div>
  );
}