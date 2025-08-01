import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FileText, Users, Car, Calendar, DollarSign, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { useContractWizard } from './ContractWizardProvider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useContractCalculations } from '@/hooks/useContractCalculations'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'

// Step 1: Basic Information
export const BasicInfoStep: React.FC = () => {
  const { data, updateData } = useContractWizard()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          المعلومات الأساسية
        </CardTitle>
        <CardDescription>
          أدخل المعلومات الأساسية للعقد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_number">رقم العقد</Label>
            <Input
              id="contract_number"
              value={data.contract_number}
              onChange={(e) => updateData({ contract_number: e.target.value })}
              placeholder="سيتم توليده تلقائياً إذا ترك فارغاً"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contract_type">نوع العقد *</Label>
            <Select 
              value={data.contract_type} 
              onValueChange={(value) => updateData({ contract_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع العقد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent_to_own">إيجار حتى التملك</SelectItem>
                <SelectItem value="daily_rental">إيجار يومي</SelectItem>
                <SelectItem value="weekly_rental">إيجار أسبوعي</SelectItem>
                <SelectItem value="monthly_rental">إيجار شهري</SelectItem>
                <SelectItem value="yearly_rental">إيجار سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contract_date">تاريخ العقد *</Label>
            <Input
              id="contract_date"
              type="date"
              value={data.contract_date}
              onChange={(e) => updateData({ contract_date: e.target.value })}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">وصف العقد</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="وصف مختصر للعقد..."
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="terms">الشروط والأحكام</Label>
          <Textarea
            id="terms"
            value={data.terms}
            onChange={(e) => updateData({ terms: e.target.value })}
            placeholder="شروط وأحكام العقد..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Step 2: Customer and Vehicle Selection
export const CustomerVehicleStep: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()

  // Get customers for the company
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, is_blacklisted, is_active')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user?.profile?.company_id,
  })

  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehiclesForContracts(user?.profile?.company_id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          العميل والمركبة
        </CardTitle>
        <CardDescription>
          اختر العميل والمركبة للعقد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">العميل *</Label>
            {customersLoading ? (
              <div className="flex items-center justify-center h-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <Select 
                value={data.customer_id} 
                onValueChange={(value) => updateData({ customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem 
                      key={customer.id} 
                      value={customer.id}
                      disabled={customer.is_blacklisted || !customer.is_active}
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {customer.customer_type === 'individual' 
                            ? `${customer.first_name} ${customer.last_name}`
                            : customer.company_name
                          }
                        </span>
                        {customer.is_blacklisted && (
                          <Badge variant="destructive" className="text-xs">محظور</Badge>
                        )}
                        {!customer.is_active && (
                          <Badge variant="secondary" className="text-xs">غير نشط</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vehicle_id">المركبة</Label>
            {vehiclesLoading ? (
              <div className="flex items-center justify-center h-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <Select 
                value={data.vehicle_id} 
                onValueChange={(value) => updateData({ vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المركبة (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مركبة محددة</SelectItem>
                  {availableVehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex flex-col">
                        <span>{vehicle.make} {vehicle.model} - {vehicle.plate_number}</span>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {vehicle.daily_rate && <span>يومي: {vehicle.daily_rate} د.ك</span>}
                          {vehicle.weekly_rate && <span>أسبوعي: {vehicle.weekly_rate} د.ك</span>}
                          {vehicle.monthly_rate && <span>شهري: {vehicle.monthly_rate} د.ك</span>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Selected customer validation */}
        {data.customer_id && customers && (
          <div className="mt-4">
            {(() => {
              const selectedCustomer = customers.find(c => c.id === data.customer_id)
              if (selectedCustomer?.is_blacklisted) {
                return (
                  <Alert className="border-destructive bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      تحذير: هذا العميل محظور. لا يمكن إنشاء عقود جديدة معه.
                    </AlertDescription>
                  </Alert>
                )
              }
              if (!selectedCustomer?.is_active) {
                return (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      تحذير: هذا العميل غير نشط.
                    </AlertDescription>
                  </Alert>
                )
              }
              return null
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Step 3: Dates and Duration
export const DatesStep: React.FC = () => {
  const { data, updateData } = useContractWizard()

  const calculateEndDate = (startDate: string, days: number) => {
    if (!startDate || days <= 0) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + days - 1)
    return end.toISOString().slice(0, 10)
  }

  const handleStartDateChange = (newStartDate: string) => {
    const endDate = calculateEndDate(newStartDate, data.rental_days)
    updateData({ 
      start_date: newStartDate,
      end_date: endDate
    })
  }

  const handleRentalDaysChange = (days: number) => {
    const endDate = calculateEndDate(data.start_date, days)
    updateData({ 
      rental_days: days,
      end_date: endDate
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          التواريخ والمدة
        </CardTitle>
        <CardDescription>
          حدد تواريخ العقد ومدة الإيجار
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">تاريخ البداية *</Label>
            <Input
              id="start_date"
              type="date"
              value={data.start_date}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rental_days">عدد الأيام *</Label>
            <Input
              id="rental_days"
              type="number"
              min="1"
              value={data.rental_days}
              onChange={(e) => handleRentalDaysChange(parseInt(e.target.value) || 1)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end_date">تاريخ النهاية</Label>
            <Input
              id="end_date"
              type="date"
              value={data.end_date}
              onChange={(e) => updateData({ end_date: e.target.value })}
              className="bg-muted"
            />
          </div>
        </div>

        {/* Duration summary */}
        {data.start_date && data.end_date && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">ملخص المدة:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">إجمالي الأيام:</span>
                <p className="font-medium">{data.rental_days} يوم</p>
              </div>
              <div>
                <span className="text-muted-foreground">الأسابيع:</span>
                <p className="font-medium">{Math.ceil(data.rental_days / 7)} أسبوع</p>
              </div>
              <div>
                <span className="text-muted-foreground">الأشهر:</span>
                <p className="font-medium">{Math.ceil(data.rental_days / 30)} شهر</p>
              </div>
              <div>
                <span className="text-muted-foreground">السنوات:</span>
                <p className="font-medium">{(data.rental_days / 365).toFixed(1)} سنة</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Step 4: Financial Details
export const FinancialStep: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts()
  
  // Get cost centers
  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, center_code, center_name, center_name_ar')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('center_code')
      
      if (error) throw error
      return data || []
    },
    enabled: !!user?.profile?.company_id,
  })

  // Get vehicle for calculations
  const { data: availableVehicles } = useAvailableVehiclesForContracts(user?.profile?.company_id)
  const selectedVehicle = availableVehicles?.find(v => v.id === data.vehicle_id) || null
  const calculations = useContractCalculations(selectedVehicle, data.contract_type, data.rental_days)

  // Auto-update financial calculations
  React.useEffect(() => {
    if (calculations && selectedVehicle) {
      updateData({
        contract_amount: calculations.totalAmount,
        monthly_amount: calculations.monthlyAmount
      })
    }
  }, [calculations])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          التفاصيل المالية
        </CardTitle>
        <CardDescription>
          حدد المبالغ والحسابات المحاسبية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calculations Display */}
        {calculations && selectedVehicle && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              حسابات تلقائية
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-700">نوع التسعير:</span>
                <p className="font-medium">{calculations.breakdown.rateType}</p>
              </div>
              <div>
                <span className="text-green-700">المبلغ الإجمالي:</span>
                <p className="font-medium">{calculations.totalAmount.toFixed(3)} د.ك</p>
              </div>
              <div>
                <span className="text-green-700">المبلغ الشهري:</span>
                <p className="font-medium">{calculations.monthlyAmount.toFixed(3)} د.ك</p>
              </div>
              {calculations.breakdown.savings && (
                <div>
                  <span className="text-green-700">التوفير:</span>
                  <p className="font-medium text-green-600">
                    {calculations.breakdown.savings.toFixed(3)} د.ك
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_amount">مبلغ العقد الإجمالي *</Label>
            <Input
              id="contract_amount"
              type="number"
              step="0.001"
              min="0"
              value={data.contract_amount}
              onChange={(e) => updateData({ contract_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monthly_amount">المبلغ الشهري</Label>
            <Input
              id="monthly_amount"
              type="number"
              step="0.001"
              min="0"
              value={data.monthly_amount}
              onChange={(e) => updateData({ monthly_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account_id">الحساب المحاسبي</Label>
            <Select 
              value={data.account_id} 
              onValueChange={(value) => updateData({ account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحساب المحاسبي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون ربط محاسبي</SelectItem>
                {entryAllowedAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col">
                      <span>{account.account_code} - {account.account_name}</span>
                      {account.account_name_ar && (
                        <span className="text-xs text-muted-foreground">{account.account_name_ar}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cost_center_id">مركز التكلفة</Label>
            <Select 
              value={data.cost_center_id} 
              onValueChange={(value) => updateData({ cost_center_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر مركز التكلفة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">بدون مركز تكلفة</SelectItem>
                {costCenters?.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.center_code} - {center.center_name_ar || center.center_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Step 5: Review and Submit
export const ReviewStep: React.FC = () => {
  const { data, updateData } = useContractWizard()

  // Validation logic
  React.useEffect(() => {
    const validateData = () => {
      const errors: string[] = []
      
      if (!data.customer_id) errors.push('يجب اختيار عميل')
      if (!data.contract_type) errors.push('يجب اختيار نوع العقد')
      if (!data.start_date) errors.push('يجب تحديد تاريخ البداية')
      if (!data.end_date) errors.push('يجب تحديد تاريخ النهاية')
      if (data.contract_amount <= 0) errors.push('يجب أن يكون مبلغ العقد أكبر من الصفر')
      
      const requiresApproval = data.contract_amount >= 5000
      const approvalSteps = []
      
      if (data.contract_amount >= 5000) {
        approvalSteps.push({ role: 'manager', title: 'موافقة المدير' })
      }
      
      if (data.contract_amount >= 10000) {
        approvalSteps.push({ role: 'company_admin', title: 'موافقة إدارة الشركة' })
      }

      updateData({
        validation_status: errors.length === 0 ? 'valid' : 'invalid',
        validation_errors: errors,
        requires_approval: requiresApproval,
        approval_steps: approvalSteps
      })
    }

    validateData()
  }, [data.customer_id, data.contract_type, data.start_date, data.end_date, data.contract_amount])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          مراجعة وإرسال
        </CardTitle>
        <CardDescription>
          راجع بيانات العقد قبل الإرسال
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status */}
        {data.validation_status === 'invalid' && data.validation_errors.length > 0 && (
          <Alert className="border-destructive bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">يرجى إصلاح الأخطاء التالية:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {data.validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {data.validation_status === 'valid' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              تم التحقق من البيانات بنجاح. العقد جاهز للإرسال.
            </AlertDescription>
          </Alert>
        )}

        {/* Approval Information */}
        {data.requires_approval && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  هذا العقد يتطلب موافقة نظراً لقيمته ({data.contract_amount.toFixed(3)} د.ك)
                </p>
                <div className="text-sm space-y-1">
                  <p className="font-medium">خطوات الموافقة المطلوبة:</p>
                  {data.approval_steps.map((step: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Contract Summary */}
        <div className="grid gap-4">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-medium">ملخص العقد:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">رقم العقد:</span>
                <p className="font-medium">{data.contract_number || 'سيتم توليده تلقائياً'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">نوع العقد:</span>
                <p className="font-medium">{data.contract_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">تاريخ البداية:</span>
                <p className="font-medium">{data.start_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">تاريخ النهاية:</span>
                <p className="font-medium">{data.end_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">المدة:</span>
                <p className="font-medium">{data.rental_days} يوم</p>
              </div>
              <div>
                <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                <p className="font-medium text-primary">{data.contract_amount.toFixed(3)} د.ك</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}