import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { FileText, Users, Car, Calendar, DollarSign, CheckCircle, AlertTriangle, Clock, Edit } from 'lucide-react'
import { useContractWizard } from './ContractWizardProvider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useContractCalculations } from '@/hooks/useContractCalculations'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useAvailableVehiclesByDateRange } from '@/hooks/useAvailableVehiclesByDateRange'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'
import { useTemplateByType, getDefaultDurationByType } from '@/hooks/useContractTemplates'
import { VehicleConditionWizardStep } from './VehicleConditionWizardStep'
import { useContractValidation } from '@/hooks/useContractValidation'
import { ProactiveAlertSystem } from './ProactiveAlertSystem'
import { ContractDataValidator } from './ContractDataValidator'
import { ContractValidationSummary } from './ContractValidationSummary'
import { SmartSuggestions } from './SmartSuggestions'
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useCustomerLinkedAccounts } from '@/hooks/useCustomerAccounts'

// Step 1: Basic Information
export const BasicInfoStep: React.FC = () => {
  const { data, updateData } = useContractWizard()
  const template = useTemplateByType(data.contract_type || '')
  const [isEditingTerms, setIsEditingTerms] = useState(false)

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
                <SelectItem value="daily_rental">إيجار يومي</SelectItem>
                <SelectItem value="weekly_rental">إيجار أسبوعي</SelectItem>
                <SelectItem value="monthly_rental">إيجار شهري</SelectItem>
                <SelectItem value="corporate">عقد مؤسسي</SelectItem>
                <SelectItem value="rent_to_own">إيجار حتى التملك</SelectItem>
                <SelectItem value="yearly_rental">إيجار سنوي</SelectItem>
              </SelectContent>
            </Select>
            
            {template && (
              <Alert className="mt-2">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  تم تطبيق قالب: <strong>{template.template_name_ar}</strong>
                </AlertDescription>
              </Alert>
            )}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="terms">الشروط والأحكام</Label>
            {data.terms && !isEditingTerms && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTerms(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                تعديل
              </Button>
            )}
          </div>
          
          {!isEditingTerms && data.terms ? (
            <div className="relative">
              <div className="border rounded-md p-3 bg-background min-h-[120px] whitespace-pre-wrap text-sm">
                {data.terms}
              </div>
              {template && (
                <Badge variant="secondary" className="absolute top-2 right-2">
                  من القالب: {template.template_name_ar}
                </Badge>
              )}
            </div>
          ) : (
            <Textarea
              id="terms"
              value={data.terms}
              onChange={(e) => updateData({ terms: e.target.value })}
              placeholder="شروط وأحكام العقد..."
              rows={8}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Step 2: Customer and Vehicle Selection
export const CustomerVehicleStep: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const { validation, isValidating, debouncedValidation } = useContractValidation()
  
  // Trigger validation when customer or vehicle changes
  React.useEffect(() => {
    if (data.customer_id || data.vehicle_id) {
      debouncedValidation({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        start_date: data.start_date,
        end_date: data.end_date,
        contract_amount: data.contract_amount,
        contract_type: data.contract_type
      })
    }
  }, [data.customer_id, data.vehicle_id, data.start_date, data.end_date, data.contract_amount, debouncedValidation])

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

  // Use date-range filtered vehicles if dates are available, otherwise fallback to all available vehicles
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehiclesByDateRange({
    companyId: user?.profile?.company_id,
    startDate: data.start_date,
    endDate: data.end_date,
    enabled: !!user?.profile?.company_id
  })
  
  // Fallback for when no dates are selected yet
  const { data: allAvailableVehicles, isLoading: allVehiclesLoading } = useAvailableVehiclesForContracts(user?.profile?.company_id)
  
  // Use filtered vehicles if dates are available, otherwise use all available vehicles
  const vehiclesToShow = (data.start_date && data.end_date) ? availableVehicles : allAvailableVehicles
  const isLoadingVehicles = (data.start_date && data.end_date) ? vehiclesLoading : allVehiclesLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          العميل والمركبة
        </CardTitle>
        <CardDescription>
          اختر العميل والمركبة للعقد
          {(data.start_date && data.end_date) ? (
            <div className="text-green-600 text-sm mt-1">
              ✓ عرض المركبات المتاحة للفترة المحددة ({data.start_date} إلى {data.end_date})
            </div>
          ) : (
            <div className="text-yellow-600 text-sm mt-1">
              💡 حدد التواريخ أولاً لعرض المركبات المتاحة فقط
            </div>
          )}
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
            {isLoadingVehicles ? (
              <div className="flex items-center justify-center h-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <Select 
                value={data.vehicle_id} 
                onValueChange={(value) => {
                  // Clear vehicle condition report when vehicle changes
                  updateData({ 
                    vehicle_id: value,
                    vehicle_condition_report_id: undefined 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المركبة (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مركبة محددة</SelectItem>
                  {vehiclesToShow?.map((vehicle) => (
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

        {/* Vehicle Condition Check */}
        {data.vehicle_id && data.vehicle_id !== 'none' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">فحص حالة المركبة</h3>
            <VehicleConditionWizardStep 
              vehicleId={data.vehicle_id}
              contractId={undefined} // Will be set after contract creation
              onComplete={(reportId) => {
                console.log('Vehicle condition report created:', reportId);
                // Save the condition report ID to enable Next button
                updateData({ vehicle_condition_report_id: reportId });
              }}
            />
          </div>
        )}

        {/* Proactive Alert System */}
        <div className="mt-4">
          <ProactiveAlertSystem 
            validation={validation}
            isValidating={isValidating}
            showConflictDetails={true}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Step 3: Dates and Duration
export const DatesStep: React.FC = () => {
  const { data, updateData } = useContractWizard()
  const { validation, isValidating, debouncedValidation } = useContractValidation()
  
  // Trigger validation when dates change
  React.useEffect(() => {
    if (data.start_date && data.end_date) {
      debouncedValidation({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        start_date: data.start_date,
        end_date: data.end_date,
        contract_amount: data.contract_amount,
        contract_type: data.contract_type
      })
    }
  }, [data.start_date, data.end_date, data.customer_id, data.vehicle_id, data.contract_amount, debouncedValidation])

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

  const suggestedDuration = getDefaultDurationByType(data.contract_type)
  const isUsingSuggested = data.rental_days === suggestedDuration

  const applySuggestedDuration = () => {
    handleRentalDaysChange(suggestedDuration)
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
        {/* Duration suggestion */}
        {data.contract_type && suggestedDuration > 1 && !isUsingSuggested && (
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  المدة المقترحة لنوع العقد "{data.contract_type}": {suggestedDuration} يوم
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  يمكنك استخدام المدة المقترحة أو تخصيص مدة أخرى
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applySuggestedDuration}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                استخدام المقترح
              </Button>
            </div>
          </div>
        )}

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
            <Label htmlFor="rental_days">
              عدد الأيام * 
              {isUsingSuggested && (
                <span className="text-xs text-green-600 mr-2">(مقترح تلقائياً)</span>
              )}
            </Label>
            <Input
              id="rental_days"
              type="number"
              min="1"
              value={data.rental_days}
              onChange={(e) => handleRentalDaysChange(parseInt(e.target.value) || 1)}
              className={isUsingSuggested ? "border-green-300 bg-green-50" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end_date">تاريخ النهاية (محسوب تلقائياً)</Label>
            <Input
              id="end_date"
              type="date"
              value={data.end_date}
              onChange={(e) => updateData({ end_date: e.target.value })}
              className="bg-muted"
            />
          </div>
        </div>

        {/* Proactive Alert System */}
        <ProactiveAlertSystem 
          validation={validation}
          isValidating={isValidating}
          showConflictDetails={true}
        />

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
                <p className="font-medium">
                  {Math.floor(data.rental_days / 7) > 0 
                    ? `${Math.floor(data.rental_days / 7)} أسبوع` 
                    : 'أقل من أسبوع'
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">الأشهر:</span>
                <p className="font-medium">
                  {Math.floor(data.rental_days / 30) > 0 
                    ? `${Math.floor(data.rental_days / 30)} شهر` 
                    : 'أقل من شهر'
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">السنوات:</span>
                <p className="font-medium">
                  {data.rental_days >= 365 
                    ? `${(data.rental_days / 365).toFixed(1)} سنة`
                    : 'أقل من سنة'
                  }
                </p>
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
  const { validation, isValidating, debouncedValidation } = useContractValidation()
  
  // Trigger validation when amounts change
  React.useEffect(() => {
    if (data.contract_amount > 0) {
      debouncedValidation({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        start_date: data.start_date,
        end_date: data.end_date,
        contract_amount: data.contract_amount,
        contract_type: data.contract_type
      })
    }
  }, [data.contract_amount, data.customer_id, data.vehicle_id, data.start_date, data.end_date, debouncedValidation])
  
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts()
  
  // Get customer's linked accounts
  const { data: customerLinkedAccounts } = useCustomerLinkedAccounts(data.customer_id || '')
  
  // Auto-set customer's financial account when customer is selected
  React.useEffect(() => {
    console.log('[FINANCIAL_STEP] Effect triggered:', {
      customerLinkedAccounts,
      hasAccounts: customerLinkedAccounts?.length > 0,
      currentAccountId: data.account_id,
      customerId: data.customer_id
    });

    if (customerLinkedAccounts && customerLinkedAccounts.length > 0 && !data.account_id) {
      const primaryAccountLink = customerLinkedAccounts[0]
      
      if (primaryAccountLink?.chart_of_accounts) {
        const account = primaryAccountLink.chart_of_accounts
        console.log('[FINANCIAL_STEP] Auto-setting customer account:', account.account_code);
        updateData({ account_id: account.id });
      }
    }
  }, [customerLinkedAccounts, data.account_id, data.customer_id, updateData])

  // Note: Cost center is now handled automatically by the database trigger
  // No manual cost center selection needed


  // Cost center is now automatically assigned by database trigger

  // Get vehicle for calculations
  const { data: availableVehicles } = useAvailableVehiclesForContracts(user?.profile?.company_id)
  const selectedVehicle = availableVehicles?.find(v => v.id === data.vehicle_id) || null
  const calculations = useContractCalculations(selectedVehicle, data.contract_type, data.rental_days)

  // Auto-update financial calculations with proper tracking
  React.useEffect(() => {
    if (calculations && selectedVehicle && data.rental_days) {
      const newData = {
        contract_amount: calculations.totalAmount,
        // Always calculate monthly_amount, even for short contracts (for consistency)
        monthly_amount: data.rental_days >= 30 ? calculations.monthlyAmount : calculations.totalAmount
      }
      
      // Only update if values have actually changed
      if (data.contract_amount !== newData.contract_amount || 
          data.monthly_amount !== newData.monthly_amount) {
        console.log('[FINANCIAL_STEP] Auto-updating calculations:', newData)
        updateData(newData)
      }
    }
  }, [calculations, selectedVehicle, data.rental_days, data.contract_amount, data.monthly_amount, updateData])

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
                <span className="text-green-700">
                  {calculations.periodType === 'daily' && 'المبلغ اليومي:'}
                  {calculations.periodType === 'weekly' && 'المبلغ الأسبوعي:'}
                  {calculations.periodType === 'monthly' && 'المبلغ الشهري:'}
                </span>
                <p className="font-medium">{calculations.periodAmount.toFixed(3)} د.ك</p>
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

        {/* Customer Account Information */}
        {customerLinkedAccounts && customerLinkedAccounts.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              حساب العميل المالي
            </h4>
            <p className="text-blue-700 text-sm">
              تم اختيار حساب العميل المالي تلقائياً. يمكنك تغييره إذا لزم الأمر.
            </p>
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
          
          {/* Only show monthly amount for contracts 30+ days */}
          {data.rental_days >= 30 && (
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
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="account_id">الحساب المحاسبي</Label>
              {customerLinkedAccounts && customerLinkedAccounts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  تم اختياره تلقائياً
                </Badge>
              )}
            </div>
            <Select 
              value={data.account_id} 
              onValueChange={(value) => updateData({ account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحساب المحاسبي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون ربط محاسبي</SelectItem>
                {/* Show customer's linked accounts first */}
                {customerLinkedAccounts && customerLinkedAccounts.length > 0 && (
                  <>
                    <SelectItem disabled value="customer_accounts_header">
                      <div className="text-xs font-medium text-muted-foreground">
                        حسابات العميل
                      </div>
                    </SelectItem>
                    {customerLinkedAccounts.map((customerAccount) => {
                      const account = Array.isArray(customerAccount.chart_of_accounts) 
                        ? customerAccount.chart_of_accounts[0] 
                        : customerAccount.chart_of_accounts;
                      if (!account || typeof account !== 'object' || !('id' in account)) return null;
                      
                      const accountData = account as any;
                      return (
                        <SelectItem key={accountData.id} value={accountData.id}>
                          <div className="flex flex-col">
                            <span>{accountData.account_code} - {accountData.account_name}</span>
                            {accountData.account_name_ar && (
                              <span className="text-xs text-muted-foreground">{accountData.account_name_ar}</span>
                            )}
                            <Badge variant="outline" className="text-xs w-fit mt-1">
                              حساب العميل
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                    <SelectItem disabled value="other_accounts_header">
                      <div className="text-xs font-medium text-muted-foreground">
                        حسابات أخرى
                      </div>
                    </SelectItem>
                  </>
                )}
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
          
          {/* Cost center field removed - now handled automatically */}
        </div>

        {/* Proactive Alert System */}
        <ProactiveAlertSystem 
          validation={validation}
          isValidating={isValidating}
          showConflictDetails={false}
        />
      </CardContent>
    </Card>
  )
}

// Step 5: Review and Submit
export const ReviewStep: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const { validation, isValidating, validateContract } = useContractValidation()
  const { generateAllSuggestions } = useSmartSuggestions()
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  
  // Final validation and suggestions on component mount
  React.useEffect(() => {
    const runValidationAndSuggestions = async () => {
      await validateContract({
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
        start_date: data.start_date,
        end_date: data.end_date,
        contract_amount: data.contract_amount,
        contract_type: data.contract_type
      })
      
      // Generate smart suggestions
      if (user?.profile?.company_id) {
        const smartSuggestions = await generateAllSuggestions(
          user.profile.company_id,
          data,
          [...(validation.errors || []), ...(validation.warnings || [])]
        )
        setSuggestions(smartSuggestions)
      }
    }
    
    runValidationAndSuggestions()
  }, [data, validateContract, generateAllSuggestions, user?.profile?.company_id])

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

      // Store validation data in local state instead of contract data
      updateData({
        _validation_status: errors.length === 0 ? 'valid' : 'invalid',
        _validation_errors: errors,
        _requires_approval: requiresApproval,
        _approval_steps: approvalSteps
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
        {/* Data Validation and Auto-Correction */}
        <ContractDataValidator 
          data={data as any}
          onDataCorrection={(corrections) => {
            console.log('[REVIEW_STEP] Applying data corrections:', corrections)
            updateData(corrections)
          }}
          onValidate={() => validateContract({
            customer_id: data.customer_id,
            vehicle_id: data.vehicle_id,
            start_date: data.start_date,
            end_date: data.end_date,
            contract_amount: data.contract_amount,
            contract_type: data.contract_type
          })}
          isValidating={isValidating}
        />

        {/* Comprehensive Validation Summary */}
        <ContractValidationSummary 
          validation={validation}
          contractData={data}
          isValidating={isValidating}
        />

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <SmartSuggestions 
            suggestions={suggestions}
            onApplySuggestion={(suggestion) => {
              // Handle suggestion application
              console.log('Applying suggestion:', suggestion)
              // You can implement specific logic for each suggestion type here
            }}
          />
        )}

        {/* Legacy Validation Status - keeping for backwards compatibility */}
        {data._validation_status === 'invalid' && data._validation_errors?.length > 0 && (
          <Alert className="border-destructive bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">يرجى إصلاح الأخطاء التالية:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {data._validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {data._validation_status === 'valid' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              تم التحقق من البيانات بنجاح. العقد جاهز للإرسال.
            </AlertDescription>
          </Alert>
        )}

        {/* Approval Information */}
        {data._requires_approval && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  هذا العقد يتطلب موافقة نظراً لقيمته ({data.contract_amount.toFixed(3)} د.ك)
                </p>
                <div className="text-sm space-y-1">
                  <p className="font-medium">خطوات الموافقة المطلوبة:</p>
                  {data._approval_steps?.map((step: any, index: number) => (
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