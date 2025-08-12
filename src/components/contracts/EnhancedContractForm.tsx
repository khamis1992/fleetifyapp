import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Plus, Calculator, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useContractCalculations } from '@/hooks/useContractCalculations'
import { AccountLevelBadge } from '@/components/finance/AccountLevelBadge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface EnhancedContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => void
  preselectedCustomerId?: string | null
}

export const EnhancedContractForm: React.FC<EnhancedContractFormProps> = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  preselectedCustomerId 
}) => {
  const { user } = useAuth()
  
  const [contractData, setContractData] = useState({
    contract_number: '',
    contract_date: new Date().toISOString().slice(0, 10),
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    contract_amount: 0,
    monthly_amount: 0,
    contract_type: 'rental',
    status: 'active',
    account_id: 'none',
    customer_id: '',
    vehicle_id: '',
    description: '',
    terms: '',
    rental_days: 1
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [approvalInfo, setApprovalInfo] = useState<any>(null)

  // Get user profile with company ID
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get customers for the company
  const { data: customers } = useQuery({
    queryKey: ['customers', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, is_blacklisted, is_active')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const { data: entryAllowedAccounts, isLoading: accountsLoading } = useEntryAllowedAccounts()
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehiclesForContracts(profile?.company_id)
  const { formatCurrency } = useCurrencyFormatter()


  // Get selected vehicle for calculations
  const selectedVehicle = availableVehicles?.find(v => v.id === contractData.vehicle_id) || null
  const calculations = useContractCalculations(selectedVehicle, contractData.contract_type, contractData.rental_days)

  // Validate contract data mutation
  const validateContractMutation = useMutation({
    mutationFn: async (data: any) => {
      // Simple client-side validation for now
      const errors: string[] = []
      
      if (data.customer_id) {
        const customer = customers?.find(c => c.id === data.customer_id)
        if (customer?.is_blacklisted) {
          errors.push('العميل محظور ولا يمكن إنشاء عقود معه')
        }
        if (!customer?.is_active) {
          errors.push('العميل غير نشط')
        }
      }
      
      if (data.vehicle_id && data.vehicle_id !== 'none') {
        const vehicle = availableVehicles?.find(v => v.id === data.vehicle_id)
        if (!vehicle || !['available', 'reserved'].includes(vehicle.status)) {
          errors.push('المركبة غير متاحة حالياً')
        }
      }
      
      return { valid: errors.length === 0, errors }
    },
    onSuccess: (validationResult) => {
      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors || [])
      } else {
        setValidationErrors([])
      }
    },
    onError: (error) => {
      console.error('Validation error:', error)
      toast.error('حدث خطأ في التحقق من البيانات')
    }
  })

  // Pre-select customer when form opens
  useEffect(() => {
    if (preselectedCustomerId && open) {
      setContractData(prev => ({
        ...prev,
        customer_id: preselectedCustomerId
      }))
    }
  }, [preselectedCustomerId, open])

  // Auto-validate when key fields change
  useEffect(() => {
    if (contractData.customer_id && contractData.contract_amount > 0) {
      setIsValidating(true)
      const validationData = {
        customer_id: contractData.customer_id,
        vehicle_id: contractData.vehicle_id === 'none' ? null : contractData.vehicle_id,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        contract_amount: contractData.contract_amount
      }
      
      validateContractMutation.mutate(validationData)
      setIsValidating(false)
    }
  }, [contractData.customer_id, contractData.vehicle_id, contractData.start_date, contractData.end_date, contractData.contract_amount])

  // Check approval requirements
  useEffect(() => {
    if (contractData.contract_amount >= 5000) {
      const approvalSteps = []
      
      if (contractData.contract_amount >= 5000) {
        approvalSteps.push({ role: 'manager', title: 'موافقة المدير' })
      }
      
      if (contractData.contract_amount >= 10000) {
        approvalSteps.push({ role: 'company_admin', title: 'موافقة إدارة الشركة' })
      }
      
      setApprovalInfo({
        required: true,
        steps: approvalSteps,
        message: `هذا العقد يتطلب موافقة نظراً لقيمته (${formatCurrency(contractData.contract_amount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })})`
      })
    } else {
      setApprovalInfo(null)
    }
  }, [contractData.contract_amount])

  // Calculate end date based on start date and rental days
  const calculateEndDate = (startDate: string, days: number) => {
    if (!startDate || days <= 0) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + days - 1)
    return end.toISOString().slice(0, 10)
  }

  const handleStartDateChange = (newStartDate: string) => {
    const newData = { ...contractData, start_date: newStartDate }
    newData.end_date = calculateEndDate(newStartDate, contractData.rental_days)
    setContractData(newData)
  }

  const handleRentalDaysChange = (days: number) => {
    const newData = { ...contractData, rental_days: days }
    newData.end_date = calculateEndDate(contractData.start_date, days)
    setContractData(newData)
  }

  // Auto-update financial calculations
  useEffect(() => {
    if (calculations && selectedVehicle) {
      setContractData(prev => ({
        ...prev,
        contract_amount: calculations.totalAmount,
        monthly_amount: calculations.monthlyAmount
      }))
    }
  }, [calculations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contractData.customer_id) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    if (validationErrors.length > 0) {
      toast.error('يرجى إصلاح الأخطاء قبل المتابعة')
      return
    }

    try {
      await onSubmit?.(contractData)
      
      // Reset form
      setContractData({
        contract_number: '',
        contract_date: new Date().toISOString().slice(0, 10),
        start_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        contract_amount: 0,
        monthly_amount: 0,
        contract_type: 'rental',
        status: 'active',
        account_id: 'none',
        customer_id: '',
        vehicle_id: '',
        description: '',
        terms: '',
        rental_days: 1
      })
      setValidationErrors([])
      setApprovalInfo(null)
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('حدث خطأ في إنشاء العقد')
    }
  }

  if (accountsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء عقد جديد (محسن)
            {preselectedCustomerId && (
              <Badge variant="secondary">عميل محدد مسبقاً</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-destructive bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">يرجى إصلاح الأخطاء التالية:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Approval Information */}
        {approvalInfo && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{approvalInfo.message}</p>
                <div className="text-sm space-y-1">
                  <p className="font-medium">خطوات الموافقة المطلوبة:</p>
                  {approvalInfo.steps.map((step: any, index: number) => (
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات العقد الأساسية</CardTitle>
              <CardDescription>المعلومات الأساسية للعقد مع التحقق التلقائي</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_number">رقم العقد</Label>
                <Input
                  id="contract_number"
                  value={contractData.contract_number}
                  onChange={(e) => setContractData({...contractData, contract_number: e.target.value})}
                  placeholder="سيتم توليده تلقائياً إذا ترك فارغاً"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contract_type">نوع العقد</Label>
                <Select 
                  value={contractData.contract_type} 
                  onValueChange={(value) => setContractData({...contractData, contract_type: value})}
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
                <Label htmlFor="contract_date">تاريخ العقد</Label>
                <Input
                  id="contract_date"
                  type="date"
                  value={contractData.contract_date}
                  onChange={(e) => setContractData({...contractData, contract_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_date">تاريخ البداية</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={contractData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rental_days">عدد الأيام</Label>
                <Input
                  id="rental_days"
                  type="number"
                  min="1"
                  value={contractData.rental_days}
                  onChange={(e) => handleRentalDaysChange(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">تاريخ النهاية</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={contractData.end_date}
                  onChange={(e) => setContractData({...contractData, end_date: e.target.value})}
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer and Vehicle Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">العميل والمركبة</CardTitle>
              <CardDescription>اختيار العميل والمركبة مع التحقق من الصحة</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">العميل *</Label>
                <Select 
                  value={contractData.customer_id} 
                  onValueChange={(value) => setContractData({...contractData, customer_id: value})}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">المركبة</Label>
                <Select 
                  value={contractData.vehicle_id} 
                  onValueChange={(value) => setContractData({...contractData, vehicle_id: value})}
                  disabled={vehiclesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      vehiclesLoading ? "جاري التحميل..." : "اختر المركبة المتاحة"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {availableVehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                        {vehicle.daily_rate && ` (${vehicle.daily_rate} د.ك/يوم)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          {calculations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  التفاصيل المالية المحسوبة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">إجمالي قيمة العقد</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(calculations.totalAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">القيمة الشهرية</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(calculations.monthlyAmount, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600 font-medium">أفضل معدل</p>
                    <p className="text-lg font-bold text-yellow-800">{calculations.bestRateType}</p>
                  </div>
                </div>
                
                {calculations.breakdown && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <p className="font-medium mb-1">تفاصيل الحساب:</p>
                    <p>{String(calculations.breakdown)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">وصف العقد</Label>
                <Textarea
                  id="description"
                  value={contractData.description}
                  onChange={(e) => setContractData({...contractData, description: e.target.value})}
                  placeholder="وصف مختصر للعقد..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="terms">شروط العقد</Label>
                <Textarea
                  id="terms"
                  value={contractData.terms}
                  onChange={(e) => setContractData({...contractData, terms: e.target.value})}
                  placeholder="شروط وأحكام العقد..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={isValidating || validationErrors.length > 0}
              className="min-w-[120px]"
            >
              {isValidating ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {approvalInfo ? 'إرسال للموافقة' : 'إنشاء العقد'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}