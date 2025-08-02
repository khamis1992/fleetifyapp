import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, AlertTriangle, CheckCircle, Clock, Save, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { useContractValidation } from '@/hooks/useContractValidation'
import { useCustomers } from '@/hooks/useCustomers'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useContractCreation } from '@/hooks/useContractCreation'
import { ContractCreationProgress } from './ContractCreationProgress'
import { CustomerDisplayName } from '@/components/customers/CustomerDisplayName'

interface ImprovedContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => void
  preselectedCustomerId?: string | null
}

interface ContractFormData {
  customer_id: string
  vehicle_id: string
  contract_type: string
  contract_date: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount: number
  description: string
  terms: string
  status: string
}

export const ImprovedContractForm: React.FC<ImprovedContractFormProps> = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  preselectedCustomerId 
}) => {
  const [formData, setFormData] = useState<ContractFormData>({
    customer_id: preselectedCustomerId || '',
    vehicle_id: '',
    contract_type: 'rental',
    contract_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    contract_amount: 0,
    monthly_amount: 0,
    description: '',
    terms: '',
    status: 'draft'
  })

  const [clientErrors, setClientErrors] = useState<string[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  // Hooks - Enhanced customer fetching with search
  const { data: customers, isLoading: customersLoading, error: customersError } = useCustomers({
    searchTerm: customerSearchTerm,
    includeInactive: false,
    limit: 50
  })
  const { data: vehicles, isLoading: vehiclesLoading } = useAvailableVehiclesForContracts()
  const { validation, isValidating, validateContract, debouncedValidation } = useContractValidation()
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation()

  // Client-side validation
  const validateForm = useCallback(() => {
    const errors: string[] = []

    if (!formData.customer_id) {
      errors.push('يرجى اختيار العميل')
    }

    if (!formData.contract_type) {
      errors.push('يرجى اختيار نوع العقد')
    }

    if (!formData.start_date) {
      errors.push('يرجى تحديد تاريخ البداية')
    }

    if (!formData.end_date) {
      errors.push('يرجى تحديد تاريخ النهاية')
    }

    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      errors.push('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
    }

    if (!formData.contract_amount || formData.contract_amount <= 0) {
      errors.push('يرجى إدخال مبلغ العقد')
    }

    if (!formData.monthly_amount || formData.monthly_amount <= 0) {
      errors.push('يرجى إدخال المبلغ الشهري')
    }

    setClientErrors(errors)
    return errors.length === 0
  }, [formData])

  // Update validation when form data changes
  useEffect(() => {
    if (formData.customer_id || formData.vehicle_id) {
      debouncedValidation(formData)
    }
  }, [formData, debouncedValidation])

  // Auto-calculate monthly amount based on contract duration
  useEffect(() => {
    if (formData.start_date && formData.end_date && formData.contract_amount > 0) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const diffMonths = Math.max(1, Math.round(diffDays / 30))
      
      const calculatedMonthlyAmount = Math.round(formData.contract_amount / diffMonths)
      
      if (calculatedMonthlyAmount !== formData.monthly_amount) {
        setFormData(prev => ({
          ...prev,
          monthly_amount: calculatedMonthlyAmount
        }))
      }
    }
  }, [formData.start_date, formData.end_date, formData.contract_amount])

  // Set preselected customer
  useEffect(() => {
    if (preselectedCustomerId && preselectedCustomerId !== formData.customer_id) {
      setFormData(prev => ({ ...prev, customer_id: preselectedCustomerId }))
    }
  }, [preselectedCustomerId])

  const handleInputChange = (field: keyof ContractFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!validateForm()) {
      return
    }

    // Server-side validation
    const validationResult = await validateContract(formData)
    
    if (!validationResult.valid) {
      toast.error('يرجى إصلاح الأخطاء قبل المتابعة')
      return
    }

    // Show progress and create contract
    setShowProgress(true)
    resetCreationState()

    try {
      await createContract(formData)
      
      // Close form after successful creation
      setTimeout(() => {
        setShowProgress(false)
        onOpenChange(false)
        
        // Reset form
        setFormData({
          customer_id: '',
          vehicle_id: '',
          contract_type: 'rental',
          contract_date: new Date().toISOString().split('T')[0],
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          contract_amount: 0,
          monthly_amount: 0,
          description: '',
          terms: '',
          status: 'draft'
        })
        
        if (onSubmit) {
          onSubmit(formData)
        }
      }, 2000)
      
    } catch (error) {
      console.error('Contract creation failed:', error)
      // Progress will show the error, no need to close
    }
  }

  const handleCloseProgress = () => {
    setShowProgress(false)
    resetCreationState()
  }

  const selectedCustomer = customers?.find(c => c.id === formData.customer_id)
  const selectedVehicle = vehicles?.find(v => v.id === formData.vehicle_id)

  const hasValidationErrors = validation.errors.length > 0
  const hasValidationWarnings = validation.warnings.length > 0
  const hasClientErrors = clientErrors.length > 0

  if (showProgress) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء العقد</DialogTitle>
          </DialogHeader>
          <ContractCreationProgress 
            creationState={creationState}
            onRetry={retryCreation}
            onClose={handleCloseProgress}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء عقد جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client-side errors */}
          {hasClientErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {clientErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Server validation errors */}
          {hasValidationErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Server validation warnings */}
          {hasValidationWarnings && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات العميل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer_id">العميل *</Label>
                  
                  {/* Customer search */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن العميل..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select 
                    value={formData.customer_id} 
                    onValueChange={(value) => handleInputChange('customer_id', value)}
                    disabled={customersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        customersLoading ? "جاري التحميل..." :
                        customersError ? "خطأ في تحميل العملاء" :
                        customers?.length === 0 ? "لا توجد عملاء" :
                        "اختر العميل"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {customers?.map((customer) => (
                        <SelectItem 
                          key={customer.id} 
                          value={customer.id}
                          disabled={customer.is_blacklisted || !customer.is_active}
                          className="py-3"
                        >
                          <CustomerDisplayName 
                            customer={customer}
                            showStatus={true}
                            showBadges={true}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {customersError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        خطأ في تحميل قائمة العملاء: {customersError.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-muted rounded text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {selectedCustomer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                        </Badge>
                        {selectedCustomer.is_blacklisted && (
                          <Badge variant="destructive">محظور</Badge>
                        )}
                        {!selectedCustomer.is_active && (
                          <Badge variant="secondary">غير نشط</Badge>
                        )}
                      </div>
                      {selectedCustomer.phone && (
                        <p><strong>الهاتف:</strong> {selectedCustomer.phone}</p>
                      )}
                      {selectedCustomer.email && (
                        <p><strong>البريد:</strong> {selectedCustomer.email}</p>
                      )}
                      {selectedCustomer.national_id && (
                        <p><strong>الهوية:</strong> {selectedCustomer.national_id}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات المركبة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vehicle_id">المركبة</Label>
                  <Select 
                    value={formData.vehicle_id} 
                    onValueChange={(value) => handleInputChange('vehicle_id', value)}
                    disabled={vehiclesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={vehiclesLoading ? "جاري التحميل..." : "اختر المركبة (اختياري)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون مركبة</SelectItem>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.plate_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVehicle && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p><strong>الطراز:</strong> {selectedVehicle.make} {selectedVehicle.model}</p>
                      <p><strong>السنة:</strong> {selectedVehicle.year}</p>
                      <p><strong>اللوحة:</strong> {selectedVehicle.plate_number}</p>
                      <p><strong>الحالة:</strong> {selectedVehicle.status}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل العقد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contract_type">نوع العقد *</Label>
                  <Select 
                    value={formData.contract_type} 
                    onValueChange={(value) => handleInputChange('contract_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rental">إيجار</SelectItem>
                      <SelectItem value="lease">تأجير</SelectItem>
                      <SelectItem value="sale">بيع</SelectItem>
                      <SelectItem value="service">خدمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contract_date">تاريخ العقد *</Label>
                  <Input
                    id="contract_date"
                    type="date"
                    value={formData.contract_date}
                    onChange={(e) => handleInputChange('contract_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">حالة العقد *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حالة العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="pending">في انتظار الموافقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">تاريخ البداية *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">تاريخ النهاية *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_amount">إجمالي مبلغ العقد *</Label>
                  <Input
                    id="contract_amount"
                    type="number"
                    step="0.001"
                    value={formData.contract_amount}
                    onChange={(e) => handleInputChange('contract_amount', parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="monthly_amount">المبلغ الشهري *</Label>
                  <Input
                    id="monthly_amount"
                    type="number"
                    step="0.001"
                    value={formData.monthly_amount}
                    onChange={(e) => handleInputChange('monthly_amount', parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="وصف العقد..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="terms">الشروط والأحكام</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  placeholder="شروط وأحكام العقد..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={
                isCreating || 
                isValidating || 
                customersLoading || 
                vehiclesLoading || 
                hasClientErrors || 
                hasValidationErrors
              }
            >
              {isCreating && <LoadingSpinner className="w-4 h-4 mr-2" />}
              {isValidating && <Clock className="w-4 h-4 mr-2" />}
              {!isCreating && !isValidating && <Save className="w-4 h-4 mr-2" />}
              {isCreating ? 'جاري الإنشاء...' : isValidating ? 'جاري التحقق...' : 'إنشاء العقد'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}