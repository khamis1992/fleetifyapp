import { useState } from "react"
import { Plus, Users, Building, Phone, Mail, MapPin, UserX, FileText } from "lucide-react"
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

interface CustomerFormData {
  customer_type: 'individual' | 'corporate'
  first_name?: string
  last_name?: string
  company_name?: string
  phone: string
  email?: string
  national_id?: string
  city?: string
  address?: string
  notes?: string
}

export default function Customers() {
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const { register, handleSubmit, watch, reset, setValue } = useForm<CustomerFormData>({
    defaultValues: {
      customer_type: 'individual'
    }
  })

  const customerType = watch('customer_type')

  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contracts:contracts(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const { error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          company_id: user?.profile?.company_id || user?.company?.id
        }])

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowCustomerForm(false)
      reset()
      toast.success('تم إضافة العميل بنجاح')
    },
    onError: (error) => {
      console.error('Error creating customer:', error)
      toast.error('حدث خطأ أثناء إضافة العميل')
    }
  })

  // Customer statistics
  const individualCustomers = customers?.filter(c => c.customer_type === 'individual') || []
  const companyCustomers = customers?.filter(c => c.customer_type === 'corporate') || []
  const blacklistedCustomers = customers?.filter(c => c.is_blacklisted) || []
  const activeCustomers = customers?.filter(c => c.is_active) || []

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data)
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
          <h1 className="text-3xl font-bold tracking-tight">إدارة العملاء</h1>
          <p className="text-muted-foreground">
            قاعدة بيانات شاملة لإدارة معلومات العملاء
          </p>
        </div>
        <Button onClick={() => setShowCustomerForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          عميل جديد
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل نشط</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء الأفراد</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{individualCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل فردي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء الشركات</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{companyCustomers.length}</div>
            <p className="text-xs text-muted-foreground">شركة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القائمة السوداء</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blacklistedCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل محظور</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <div className="grid gap-4">
        {customers?.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {customer.customer_type === 'corporate' ? (
                      <Building className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Users className="h-5 w-5 text-green-600" />
                    )}
                    <h3 className="font-semibold text-lg">
                      {customer.customer_type === 'corporate' 
                        ? customer.company_name 
                        : `${customer.first_name} ${customer.last_name}`}
                    </h3>
                    {customer.is_blacklisted && (
                      <Badge className="bg-red-100 text-red-800">
                        <UserX className="h-3 w-3 mr-1" />
                        محظور
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{customer.city}</span>
                      </div>
                    )}
                    
                    {customer.national_id && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">هوية: {customer.national_id}</span>
                      </div>
                    )}
                  </div>
                  
                  {customer.notes && (
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(customer)}>
                    عرض
                  </Button>
                  <Button variant="outline" size="sm">
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm">
                    العقود
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {customers?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عملاء بعد</h3>
              <p className="text-muted-foreground text-center mb-4">
                ابدأ في إضافة أول عميل إلى قاعدة البيانات
              </p>
              <Button onClick={() => setShowCustomerForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة عميل جديد
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Customer Form Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>نوع العميل</Label>
              <Select 
                value={customerType} 
                onValueChange={(value) => setValue('customer_type', value as 'individual' | 'corporate')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="corporate">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {customerType === 'individual' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم الأول *</Label>
                    <Input {...register('first_name', { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الأخير *</Label>
                    <Input {...register('last_name', { required: true })} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>اسم الشركة *</Label>
                <Input {...register('company_name', { required: customerType === 'corporate' })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهاتف *</Label>
                <Input {...register('phone', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" {...register('email')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رقم الهوية</Label>
                <Input {...register('national_id')} />
              </div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <Input {...register('city')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input {...register('address')} />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea {...register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}