import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { FileText, Users, Car, Calendar, DollarSign, CheckCircle, AlertTriangle, Clock, Edit, AlertCircle, Asterisk } from 'lucide-react'
import { useContractFormValidation } from '@/hooks/useContractFormValidation'
import { FormErrorSummary } from './FormErrorSummary'
import { useContractWizard } from './ContractWizardProvider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useContractCalculations } from '@/hooks/useContractCalculations'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useAvailableVehiclesByDateRange } from '@/hooks/useAvailableVehiclesByDateRange'
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'
import { useTemplateByType, getDefaultDurationByType } from '@/hooks/useContractTemplates'
import { VehicleConditionWizardStep } from './VehicleConditionWizardStep'
import { useContractValidation } from '@/hooks/useContractValidation'
import { ProactiveAlertSystem } from './ProactiveAlertSystem'
import { ContractDataValidator } from './ContractDataValidator'
import { ContractValidationSummary } from './ContractValidationSummary'
import { SmartSuggestions } from './SmartSuggestions'
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions'
import { ContractSignatureSection } from './ContractSignatureSection'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useCustomerLinkedAccounts } from '@/hooks/useCustomerAccounts'
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'
import { getRateTypeLabel } from '@/hooks/useContractCalculations'
import { 
  calculateEndDate, 
  calculateDurationDetails, 
  getSuggestedDurationMode, 
  formatDuration, 
  validateDates,
  type DurationMode 
} from '@/utils/dateCalculations'
import { CustomerSelector } from './CustomerSelector'

// Step 1: Basic Information
export const BasicInfoStep: React.FC = () => {
  const { data, updateData } = useContractWizard()
  const template = useTemplateByType(data.contract_type || '')
  const [isEditingTerms, setIsEditingTerms] = useState(false)
  
  // Import validation hook
  const { getFieldStatus, markFieldTouched } = useContractFormValidation({
    data,
    validateOnChange: true
  })

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
            <div className="flex items-center gap-2">
              <Label htmlFor="contract_type" className={getFieldStatus('contract_type').hasError ? 'text-destructive' : ''}>
                نوع العقد
              </Label>
              <span className="text-destructive">*</span>
              {getFieldStatus('contract_type').isRequired && (
                <Badge variant="secondary" className="text-xs">مطلوب</Badge>
              )}
            </div>
            <Select 
              value={data.contract_type} 
              onValueChange={(value) => {
                updateData({ contract_type: value })
                markFieldTouched('contract_type')
              }}
            >
              <SelectTrigger className={getFieldStatus('contract_type').hasError ? 'border-destructive' : ''}>
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
            
            {getFieldStatus('contract_type').hasError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{getFieldStatus('contract_type').errorMessage}</AlertDescription>
              </Alert>
            )}
            
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
            <div className="flex items-center gap-2">
              <Label htmlFor="contract_date" className={getFieldStatus('contract_date').hasError ? 'text-destructive' : ''}>
                تاريخ العقد
              </Label>
              <span className="text-destructive">*</span>
              {getFieldStatus('contract_date').isRequired && (
                <Badge variant="secondary" className="text-xs">مطلوب</Badge>
              )}
            </div>
            <Input
              id="contract_date"
              type="date"
              value={data.contract_date}
              onChange={(e) => {
                updateData({ contract_date: e.target.value })
                markFieldTouched('contract_date')
              }}
              className={getFieldStatus('contract_date').hasError ? 'border-destructive' : ''}
            />
            {getFieldStatus('contract_date').hasError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{getFieldStatus('contract_date').errorMessage}</AlertDescription>
              </Alert>
            )}
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
    // Only validate if we have meaningful data to validate and contract amount is set
    if ((data.customer_id || data.vehicle_id) && 
        data.contract_amount && 
        data.contract_amount > 0 && 
        data.start_date && 
        data.end_date) {
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


  const companyId = useCurrentCompanyId()
  
  console.log("🚗 [VehicleSelectionStep] Company context:", {
    companyId,
    startDate: data.start_date,
    endDate: data.end_date
  })
  
  // Use date-range filtered vehicles if dates are available, otherwise fallback to all available vehicles
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehiclesByDateRange({
    companyId,
    startDate: data.start_date,
    endDate: data.end_date,
    enabled: !!companyId
  })
  
  // Fallback for when no dates are selected yet
  const { data: allAvailableVehicles, isLoading: allVehiclesLoading } = useAvailableVehiclesForContracts(companyId)
  
  // Use filtered vehicles if dates are available, otherwise use all available vehicles
  const vehiclesToShow = (data.start_date && data.end_date) ? availableVehicles : allAvailableVehicles
  const isLoadingVehicles = (data.start_date && data.end_date) ? vehiclesLoading : allVehiclesLoading
  const { formatCurrency } = useCurrencyFormatter()

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
        {(data.start_date && data.end_date) ? (
          <span className="text-green-600 text-sm">
            ✓ عرض المركبات المتاحة للفترة المحددة ({data.start_date} إلى {data.end_date})
          </span>
        ) : (
          <span className="text-yellow-600 text-sm">
            💡 حدد التواريخ أولاً لعرض المركبات المتاحة فقط
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Selection with Search and Create */}
          <CustomerSelector
            value={data.customer_id}
            onValueChange={(customerId) => updateData({ customer_id: customerId })}
            placeholder="ابحث عن عميل أو أنشئ جديد..."
            disabled={false}
          />
          
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
                    <span className="flex flex-col">
                      <span>{vehicle.make} {vehicle.model} - {vehicle.plate_number}</span>
                      <span className="text-xs text-muted-foreground flex gap-2">
                        {vehicle.daily_rate && <span>يومي: {formatCurrency(vehicle.daily_rate, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>}
                        {vehicle.weekly_rate && <span>أسبوعي: {formatCurrency(vehicle.weekly_rate, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>}
                        {vehicle.monthly_rate && <span>شهري: {formatCurrency(vehicle.monthly_rate, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>}
                      </span>
                    </span>
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
    // Only validate if we have all required data including valid contract amount
    if (data.start_date && 
        data.end_date && 
        data.customer_id && 
        data.contract_amount && 
        data.contract_amount > 0) {
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

  const [durationMode, setDurationMode] = React.useState<'days' | 'calendar_months' | 'commercial_months'>('days')
  
  // Get suggested duration mode based on contract type
  const suggestedMode = getSuggestedDurationMode(data.contract_type)
  
  React.useEffect(() => {
    setDurationMode(suggestedMode)
  }, [suggestedMode])

  const handleStartDateChange = (newStartDate: string) => {
    if (!newStartDate) return
    
    // Calculate end date based on current duration and mode
    let endDate = ''
    if (durationMode === 'calendar_months' && data.rental_months > 0) {
      endDate = calculateEndDate(newStartDate, data.rental_months, 'calendar_months')
    } else if (durationMode === 'commercial_months' && data.rental_months > 0) {
      endDate = calculateEndDate(newStartDate, data.rental_months, 'commercial_months')
    } else if (data.rental_days > 0) {
      endDate = calculateEndDate(newStartDate, data.rental_days, 'days')
    }
    
    updateData({ 
      start_date: newStartDate,
      end_date: endDate
    })
  }

  const handleRentalDaysChange = (days: number) => {
    if (days <= 0) return
    
    const endDate = calculateEndDate(data.start_date, days, 'days')
    updateData({ 
      rental_days: days,
      rental_months: Math.round(days / 30), // Update months for display
      end_date: endDate
    })
    setDurationMode('days')
  }

  const handleRentalMonthsChange = (months: number) => {
    if (months <= 0) return
    
    const mode = durationMode === 'commercial_months' ? 'commercial_months' : 'calendar_months'
    const endDate = calculateEndDate(data.start_date, months, mode)
    
    updateData({ 
      rental_months: months,
      rental_days: mode === 'commercial_months' ? months * 30 : 0, // For commercial months, show equivalent days
      end_date: endDate
    })
    setDurationMode(mode)
  }

  const handleDurationModeChange = (mode: 'days' | 'calendar_months' | 'commercial_months') => {
    setDurationMode(mode)
    
    // Recalculate end date with new mode
    let endDate = ''
    if (mode === 'days' && data.rental_days > 0) {
      endDate = calculateEndDate(data.start_date, data.rental_days, 'days')
    } else if ((mode === 'calendar_months' || mode === 'commercial_months') && data.rental_months > 0) {
      endDate = calculateEndDate(data.start_date, data.rental_months, mode)
    }
    
    updateData({ end_date: endDate })
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

        {/* Duration Mode Selection */}
        <div className="space-y-2">
          <Label>طريقة حساب المدة</Label>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant={durationMode === 'days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDurationModeChange('days')}
            >
              بالأيام
            </Button>
            <Button
              type="button"
              variant={durationMode === 'calendar_months' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDurationModeChange('calendar_months')}
            >
              أشهر تقويمية
            </Button>
            <Button
              type="button"
              variant={durationMode === 'commercial_months' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDurationModeChange('commercial_months')}
            >
              أشهر تجارية (30 يوم)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {durationMode === 'calendar_months' && 'الأشهر التقويمية تحسب حسب التقويم الفعلي (28-31 يوم)'}
            {durationMode === 'commercial_months' && 'الأشهر التجارية تحسب بـ 30 يوم ثابت لكل شهر'}
            {durationMode === 'days' && 'الحساب بالأيام بدقة'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">تاريخ البداية *</Label>
            <Input
              id="start_date"
              type="date"
              value={data.start_date}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          
          {(durationMode === 'calendar_months' || durationMode === 'commercial_months') && (
            <div className="space-y-2">
              <Label htmlFor="rental_months">
                عدد الأشهر *
                {isUsingSuggested && (
                  <span className="text-xs text-green-600 mr-2">(مقترح تلقائياً)</span>
                )}
              </Label>
              <Input
                id="rental_months"
                type="number"
                min="0.1"
                step="0.1"
                value={data.rental_months || ''}
                onChange={(e) => handleRentalMonthsChange(parseFloat(e.target.value) || 0)}
                className={isUsingSuggested ? "border-green-300 bg-green-50" : ""}
                placeholder="1"
              />
            </div>
          )}
          
          {durationMode === 'days' && (
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
                value={data.rental_days || ''}
                onChange={(e) => handleRentalDaysChange(parseInt(e.target.value) || 1)}
                className={isUsingSuggested ? "border-green-300 bg-green-50" : ""}
                placeholder="1"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="end_date">تاريخ النهاية</Label>
            <Input
              id="end_date"
              type="date"
              value={data.end_date}
              onChange={(e) => updateData({ end_date: e.target.value })}
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              محسوب تلقائياً، أو يمكن تعديله يدوياً
            </p>
          </div>
        </div>

        {/* Proactive Alert System */}
        <ProactiveAlertSystem 
          validation={validation}
          isValidating={isValidating}
          showConflictDetails={true}
        />

        {/* Duration summary with improved calculations */}
        {data.start_date && data.end_date && (() => {
          const durationDetails = calculateDurationDetails(data.start_date, data.end_date, durationMode)
          const validation = validateDates(data.start_date, data.end_date)
          
          return (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">ملخص المدة:</h4>
              
              {!validation.valid && (
                <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {validation.message}
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">الأيام الفعلية:</span>
                  <p className="font-medium">{durationDetails.actualDays} يوم</p>
                </div>
                <div>
                  <span className="text-muted-foreground">الأسابيع:</span>
                  <p className="font-medium">
                    {durationDetails.breakdown.weeks > 0 
                      ? `${durationDetails.breakdown.weeks} أسبوع` 
                      : 'أقل من أسبوع'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">الأشهر المكافئة:</span>
                  <p className="font-medium">
                    {durationDetails.breakdown.months > 0 
                      ? `${durationDetails.breakdown.months} شهر` 
                      : 'أقل من شهر'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">طريقة الحساب:</span>
                  <p className="font-medium">
                    {durationMode === 'calendar_months' ? 'أشهر تقويمية' : 
                     durationMode === 'commercial_months' ? 'أشهر تجارية' : 'أيام'}
                  </p>
                </div>
              </div>
              
              {durationMode !== 'days' && durationDetails.breakdown.remainingDays > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  المدة تتضمن {durationDetails.breakdown.months} شهر و {durationDetails.breakdown.remainingDays} يوم إضافي
                </div>
              )}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

// Step 4: Financial Details
export const FinancialStep: React.FC = () => {
  const { user } = useAuth()
  const { data, updateData } = useContractWizard()
  const { validation, isValidating, debouncedValidation } = useContractValidation()
  
  // التحقق من صلاحيات التعديل اليدوي
  const { data: userRoles } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      
      if (error) throw error
      return data?.map(r => r.role) || []
    },
    enabled: !!user?.id
  })
  
  // التحقق من صلاحية التعديل اليدوي
  const canEditManually = userRoles?.includes('super_admin') || 
                          userRoles?.includes('company_admin') || 
                          userRoles?.includes('accountant')
  const { formatCurrency } = useCurrencyFormatter()
  const [isCustomAmount, setIsCustomAmount] = useState(false)
  
  // Trigger validation when amounts change
  React.useEffect(() => {
    // Only validate if we have complete data for meaningful validation
    if (data.contract_amount && 
        data.contract_amount > 0 && 
        data.customer_id && 
        data.start_date && 
        data.end_date) {
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

  // Cost center support
  const { data: costCenters } = useCostCenters();

  // Get vehicle for calculations
  const companyId = useCurrentCompanyId()
  const { data: availableVehicles } = useAvailableVehiclesForContracts(companyId)
  const selectedVehicle = availableVehicles?.find((v): v is any => v.id === data.vehicle_id) || null
  const calculations = useContractCalculations(selectedVehicle, data.contract_type, data.rental_days, isCustomAmount ? data.contract_amount : undefined)

  // Auto-update financial calculations with proper tracking
  React.useEffect(() => {
    // Only auto-update if custom amount is not enabled
    if (!isCustomAmount && calculations && selectedVehicle && data.rental_days) {
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
  }, [calculations, selectedVehicle, data.rental_days, data.contract_amount, data.monthly_amount, updateData, isCustomAmount])

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
              حسابات تلقائية ذكية
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-green-700">نوع التسعير:</span>
                <p className="font-medium">{calculations.breakdown.rateType}</p>
              </div>
              <div>
                <span className="text-green-700">المبلغ الإجمالي:</span>
                <p className="font-medium">{formatCurrency(calculations.totalAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              <div>
                <span className="text-green-700">
                  {calculations.periodType === 'daily' && 'المبلغ اليومي:'}
                  {calculations.periodType === 'weekly' && 'المبلغ الأسبوعي:'}
                  {calculations.periodType === 'monthly' && 'المبلغ الشهري:'}
                </span>
                <p className="font-medium">{formatCurrency(calculations.periodAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
              {calculations.breakdown.savings && (
                <div>
                  <span className="text-green-700">التوفير:</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(calculations.breakdown.savings, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </p>
                </div>
              )}
            </div>
            
            {/* عرض تفاصيل التسعير المختلط المحسّن */}
            {calculations.bestRateType === 'mixed' && calculations.breakdown.mixedDetails && (
              <div className="border-t border-green-200 pt-3">
                <h5 className="font-medium text-green-800 mb-2">تفاصيل التركيبة المحسّنة:</h5>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-700">التركيبة:</span>
                      <span className="font-semibold">{calculations.breakdown.mixedDetails.combination}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                      {calculations.breakdown.mixedDetails.months > 0 && (
                        <div className="bg-blue-50 rounded p-2">
                          <div className="text-xs text-blue-600">شهري</div>
                          <div className="font-semibold text-blue-800">
                            {calculations.breakdown.mixedDetails.months} شهر
                          </div>
                          <div className="text-xs text-blue-700">
                            {formatCurrency(calculations.breakdown.mixedDetails.monthlyPortion, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </div>
                        </div>
                      )}
                      
                      {calculations.breakdown.mixedDetails.weeks > 0 && (
                        <div className="bg-orange-50 rounded p-2">
                          <div className="text-xs text-orange-600">أسبوعي</div>
                          <div className="font-semibold text-orange-800">
                            {calculations.breakdown.mixedDetails.weeks} أسبوع
                          </div>
                          <div className="text-xs text-orange-700">
                            {formatCurrency(calculations.breakdown.mixedDetails.weeklyPortion, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </div>
                        </div>
                      )}
                      
                      {calculations.breakdown.mixedDetails.remainingDays > 0 && (
                        <div className="bg-purple-50 rounded p-2">
                          <div className="text-xs text-purple-600">يومي</div>
                          <div className="font-semibold text-purple-800">
                            {calculations.breakdown.mixedDetails.remainingDays} يوم
                          </div>
                          <div className="text-xs text-purple-700">
                            {formatCurrency(calculations.breakdown.mixedDetails.dailyPortion, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* خيار التعديل اليدوي للمبلغ - متاح فقط للمدير والمحاسب */}
        {canEditManually && (
          <Card className="border-2 border-muted">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="custom_amount_toggle" className="text-base font-semibold leading-none">
                        التعديل اليدوي للمبلغ
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        تخصيص مبلغ العقد بدلاً من الحسابات التلقائية
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="custom_amount_toggle"
                    checked={isCustomAmount}
                    className="transition-all duration-300 hover:scale-105 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20"
                    onCheckedChange={(checked) => {
                      setIsCustomAmount(checked)
                      if (!checked && calculations) {
                        updateData({
                          contract_amount: calculations.totalAmount,
                          monthly_amount: data.rental_days >= 30 ? calculations.monthlyAmount : calculations.totalAmount
                        })
                      }
                    }}
                  />
                </div>
              
              {isCustomAmount && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 text-sm">
                      <p className="text-amber-800 font-medium">
                        تم تفعيل التعديل اليدوي
                      </p>
                      <p className="text-amber-700">
                        لن يتم تحديث المبلغ تلقائياً عند تغيير المركبة أو فترة الإيجار
                      </p>
                      {selectedVehicle && selectedVehicle.enforce_minimum_price && (
                        <div className="pt-2 border-t border-amber-200">
                          {calculations && calculations.bestRateType && (
                            <p className="text-amber-800 font-medium">
                              الحد الأدنى المطلوب ({getRateTypeLabel(calculations.bestRateType)}): 
                              <span className="font-bold mr-1">
                                {(() => {
                                  switch (calculations.bestRateType) {
                                    case 'daily':
                                      return formatCurrency(selectedVehicle.minimum_daily_rate || selectedVehicle.minimum_rental_price || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                    case 'weekly':
                                      return formatCurrency(selectedVehicle.minimum_weekly_rate || selectedVehicle.minimum_rental_price || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                    case 'monthly':
                                    case 'mixed':
                                      return formatCurrency(selectedVehicle.minimum_monthly_rate || selectedVehicle.minimum_rental_price || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                    default:
                                      return formatCurrency(selectedVehicle.minimum_rental_price || 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                  }
                                })()}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* رسالة للمستخدمين غير المخولين */}
        {!canEditManually && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              خيار التعديل اليدوي للمبلغ متاح فقط للمدير والمحاسب. سيتم حساب المبلغ تلقائياً بناءً على بيانات المركبة والفترة المحددة.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_amount">مبلغ العقد الإجمالي *</Label>
            <Input
              id="contract_amount"
              type="number"
              step="0.001"
              min={selectedVehicle && selectedVehicle.enforce_minimum_price ? (
                calculations && calculations.bestRateType ? (
                  calculations.bestRateType === 'daily' ? selectedVehicle.minimum_daily_rate || selectedVehicle.minimum_rental_price || 0 :
                  calculations.bestRateType === 'weekly' ? selectedVehicle.minimum_weekly_rate || selectedVehicle.minimum_rental_price || 0 :
                  selectedVehicle.minimum_monthly_rate || selectedVehicle.minimum_rental_price || 0
                ) : selectedVehicle.minimum_rental_price || 0
              ) : 0}
              value={data.contract_amount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0
                const minPrice = selectedVehicle && selectedVehicle.enforce_minimum_price ? (
                  calculations && calculations.bestRateType ? (
                    calculations.bestRateType === 'daily' ? selectedVehicle.minimum_daily_rate || selectedVehicle.minimum_rental_price || 0 :
                    calculations.bestRateType === 'weekly' ? selectedVehicle.minimum_weekly_rate || selectedVehicle.minimum_rental_price || 0 :
                    selectedVehicle.minimum_monthly_rate || selectedVehicle.minimum_rental_price || 0
                  ) : selectedVehicle.minimum_rental_price || 0
                ) : 0
                
                if (minPrice && value > 0 && value < minPrice) {
                  // Show warning but allow the value temporarily
                  updateData({ contract_amount: value })
                } else {
                  updateData({ contract_amount: value })
                }
              }}
              className={(() => {
                const minPrice = selectedVehicle && selectedVehicle.enforce_minimum_price ? (
                  calculations && calculations.bestRateType ? (
                    calculations.bestRateType === 'daily' ? selectedVehicle.minimum_daily_rate || selectedVehicle.minimum_rental_price || 0 :
                    calculations.bestRateType === 'weekly' ? selectedVehicle.minimum_weekly_rate || selectedVehicle.minimum_rental_price || 0 :
                    selectedVehicle.minimum_monthly_rate || selectedVehicle.minimum_rental_price || 0
                  ) : selectedVehicle.minimum_rental_price || 0
                ) : 0
                return minPrice && data.contract_amount < minPrice ? 'border-red-500' : ''
              })()}
            />
            {(() => {
              if (!selectedVehicle || !selectedVehicle.enforce_minimum_price || data.contract_amount <= 0) return null
              
              const minPrice = calculations && calculations.bestRateType ? (
                calculations.bestRateType === 'daily' ? selectedVehicle.minimum_daily_rate || selectedVehicle.minimum_rental_price || 0 :
                calculations.bestRateType === 'weekly' ? selectedVehicle.minimum_weekly_rate || selectedVehicle.minimum_rental_price || 0 :
                selectedVehicle.minimum_monthly_rate || selectedVehicle.minimum_rental_price || 0
              ) : selectedVehicle.minimum_rental_price || 0
              
              return minPrice && data.contract_amount < minPrice ? (
                <p className="text-sm text-red-600 font-medium">
                  ⚠️ المبلغ أقل من الحد الأدنى المطلوب ({formatCurrency(minPrice, { minimumFractionDigits: 3, maximumFractionDigits: 3 })})
                </p>
              ) : null
            })()}
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
          
          {/* عرض الحساب المحاسبي المحدد من القالب */}
          {data.account_id && (
            <div className="space-y-2">
              <Label>الحساب المحاسبي</Label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      تم اختيار الحساب تلقائياً من القالب
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      معرف الحساب: {data.account_id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
  const { formatCurrency } = useCurrencyFormatter()
  
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
                  هذا العقد يتطلب موافقة نظراً لقيمته ({formatCurrency(data.contract_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })})
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
                <p className="font-medium">
                  {data.rental_months && data.rental_months > 0 
                    ? `${data.rental_months} شهر${data.rental_months > 1 ? '' : ''}`
                    : `${data.rental_days} يوم`
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                <p className="font-medium text-primary">{formatCurrency(data.contract_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Signatures */}
        <ContractSignatureSection />
      </CardContent>
    </Card>
  )
}