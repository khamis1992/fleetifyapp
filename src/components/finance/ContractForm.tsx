import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Calculator, TrendingUp } from 'lucide-react'
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts'
import { useAvailableVehiclesForContracts } from '@/hooks/useVehicles'
import { useContractCalculations } from '@/hooks/useContractCalculations'
import { AccountLevelBadge } from '@/components/finance/AccountLevelBadge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface ContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => void
  preselectedCustomerId?: string | null
}

export const ContractForm: React.FC<ContractFormProps> = ({ open, onOpenChange, onSubmit, preselectedCustomerId }) => {
  const { user } = useAuth()
  
  const [contractData, setContractData] = useState({
    contract_number: '',
    contract_date: new Date().toISOString().slice(0, 10),
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    contract_amount: 0,
    monthly_amount: 0,
    contract_type: 'rental',
    status: 'active', // Default to active status
    account_id: 'none',
    customer_id: '',
    vehicle_id: '',
    description: '',
    terms: '',
    rental_days: 1
  })

  const [manualOverride, setManualOverride] = useState({
    contract_amount: false,
    monthly_amount: false
  })

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
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const { data: entryAllowedAccounts, isLoading: accountsLoading } = useEntryAllowedAccounts()
  
  // Get available vehicles for contracts (excluding those under maintenance or already rented)
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehiclesForContracts(profile?.company_id)

  // Get selected vehicle for calculations
  const selectedVehicle = availableVehicles?.find(v => v.id === contractData.vehicle_id) || null

  // Debug logging for vehicle selection
  useEffect(() => {
    if (contractData.vehicle_id) {
      console.log("🚗 [CONTRACT_FORM] Vehicle selected:", {
        vehicleId: contractData.vehicle_id,
        availableVehicles: availableVehicles?.length || 0,
        selectedVehicle: selectedVehicle ? {
          id: selectedVehicle.id,
          plate_number: selectedVehicle.plate_number,
          daily_rate: selectedVehicle.daily_rate,
          weekly_rate: selectedVehicle.weekly_rate,
          monthly_rate: selectedVehicle.monthly_rate
        } : null
      })
    }
  }, [contractData.vehicle_id, availableVehicles, selectedVehicle])

  // Calculate financial details automatically
  const calculations = useContractCalculations(selectedVehicle, contractData.contract_type, contractData.rental_days)

  // Pre-select customer when form opens with preselectedCustomerId
  useEffect(() => {
    if (preselectedCustomerId && open) {
      setContractData(prev => ({
        ...prev,
        customer_id: preselectedCustomerId
      }))
    }
  }, [preselectedCustomerId, open])

  // Function to calculate end date based on start date and rental days
  const calculateEndDate = (startDate: string, days: number) => {
    if (!startDate || days <= 0) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + days - 1) // Subtract 1 because start date is included
    return end.toISOString().slice(0, 10)
  }

  // Auto-calculate end date when start date or rental days change
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

  // Handle vehicle selection and trigger calculations
  const handleVehicleChange = (vehicleId: string) => {
    setContractData(prev => ({ ...prev, vehicle_id: vehicleId }))
    // Reset manual overrides when vehicle changes
    setManualOverride({ contract_amount: false, monthly_amount: false })
  }

  // Handle contract type change and trigger calculations
  const handleContractTypeChange = (contractType: string) => {
    setContractData(prev => ({ ...prev, contract_type: contractType }))
    // Reset manual overrides when contract type changes
    setManualOverride({ contract_amount: false, monthly_amount: false })
  }

  // Auto-update financial calculations when not manually overridden
  useEffect(() => {
    if (calculations && selectedVehicle) {
      const updates: any = {}
      
      if (!manualOverride.contract_amount) {
        updates.contract_amount = calculations.totalAmount
      }
      
      if (!manualOverride.monthly_amount) {
        updates.monthly_amount = calculations.monthlyAmount
      }
      
      if (Object.keys(updates).length > 0) {
        setContractData(prev => ({ ...prev, ...updates }))
      }
    }
  }, [calculations, manualOverride.contract_amount, manualOverride.monthly_amount])

  // Handle manual amount changes
  const handleManualAmountChange = (field: 'contract_amount' | 'monthly_amount', value: number) => {
    setContractData(prev => ({ ...prev, [field]: value }))
    setManualOverride(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contractData.customer_id) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
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
        status: 'active', // Default to active status
        account_id: 'none',
        customer_id: '',
        vehicle_id: '',
        description: '',
        terms: '',
        rental_days: 1
      })
      setManualOverride({ contract_amount: false, monthly_amount: false })
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إنشاء عقد جديد
            {preselectedCustomerId && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                عميل محدد مسبقاً
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات العقد الأساسية</CardTitle>
              <CardDescription>المعلومات الأساسية للعقد</CardDescription>
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
                <p className="text-xs text-muted-foreground">
                  اتركه فارغاً لتوليد رقم تلقائي
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contract_type">نوع العقد</Label>
                <Select 
                  value={contractData.contract_type} 
                  onValueChange={handleContractTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العقد" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-700 z-50">
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
                  placeholder="عدد أيام الإيجار"
                />
                <p className="text-xs text-muted-foreground">
                  سيتم حساب تاريخ النهاية تلقائياً
                </p>
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
                <p className="text-xs text-muted-foreground">
                  محسوب تلقائياً أو يمكن تعديله يدوياً
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_id">الحساب المحاسبي</Label>
                <Select 
                  value={contractData.account_id} 
                  onValueChange={(value) => setContractData({...contractData, account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب المحاسبي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {entryAllowedAccounts?.filter(account => 
                      account.account_type === 'revenue' || 
                      account.account_type === 'assets'
                    )?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{account.account_code} - {account.account_name}</span>
                          <AccountLevelBadge accountLevel={account.account_level} isHeader={false} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  يمكن اختيار الحسابات الفرعية فقط (المستوى 5 أو 6) للقيود المحاسبية
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Customer and Vehicle Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">العميل والمركبة</CardTitle>
              <CardDescription>اختيار العميل والمركبة للعقد</CardDescription>
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
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_type === 'individual' 
                          ? `${customer.first_name} ${customer.last_name}`
                          : customer.company_name
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
                <div className="space-y-2">
                <Label htmlFor="vehicle_id">المركبة (للإيجار)</Label>
                <Select 
                  value={contractData.vehicle_id} 
                  onValueChange={handleVehicleChange}
                  disabled={vehiclesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      vehiclesLoading ? "جاري التحميل..." :
                      "اختر المركبة المتاحة"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {availableVehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.year})
                        {vehicle.daily_rate && ` - ${vehicle.daily_rate} د.ك/يوم`}
                        {vehicle.weekly_rate && ` - ${vehicle.weekly_rate} د.ك/أسبوع`}
                        {vehicle.monthly_rate && ` - ${vehicle.monthly_rate} د.ك/شهر`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vehiclesLoading && (
                  <p className="text-sm text-muted-foreground">🔄 جاري تحميل المركبات المتاحة...</p>
                )}
                {!vehiclesLoading && (!availableVehicles || availableVehicles.length === 0) && (
                  <p className="text-sm text-yellow-600">⚠️ لا توجد مركبات متاحة حالياً</p>
                )}
                {!vehiclesLoading && availableVehicles && availableVehicles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-green-600">✅ {availableVehicles.length} مركبة متاحة</p>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="text-xs h-6"
                      >
                        🔄 تحديث البيانات
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          console.log("🔍 [DEBUG] Current vehicle data:", {
                            selectedVehicle,
                            availableVehicles,
                            contractData: contractData.vehicle_id,
                            calculations
                          })
                          alert("تم طباعة البيانات في وحدة التحكم (console)")
                        }}
                        className="text-xs h-6"
                      >
                        🔍 فحص البيانات
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                التفاصيل المالية
              </CardTitle>
              <CardDescription>المبالغ والرسوم المالية للعقد (محسوبة تلقائياً)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Calculation Summary */}
              {calculations && selectedVehicle && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">ملخص الحساب التلقائي</span>
                    <Badge variant="secondary" className="mr-auto">
                      {calculations.breakdown.rateType} - {calculations.breakdown.period} فترة
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">يومي:</span>
                      <p className="font-medium">{calculations.dailyRate.toFixed(3)} د.ك</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">أسبوعي:</span>
                      <p className="font-medium">{calculations.weeklyRate.toFixed(3)} د.ك</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">شهري:</span>
                      <p className="font-medium">{calculations.monthlyRate.toFixed(3)} د.ك</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الأفضل:</span>
                      <p className="font-medium text-green-600">{calculations.breakdown.rateType}</p>
                    </div>
                  </div>
                  {calculations.breakdown.savings && (
                    <div className="mt-2 text-sm text-green-600">
                      💰 توفير: {calculations.breakdown.savings.toFixed(3)} د.ك
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_amount" className="flex items-center gap-2">
                    قيمة العقد (د.ك)
                    {manualOverride.contract_amount && (
                      <Badge variant="outline" className="text-xs">تعديل يدوي</Badge>
                    )}
                  </Label>
                  <Input
                    id="contract_amount"
                    type="number"
                    step="0.001"
                    value={contractData.contract_amount}
                    onChange={(e) => handleManualAmountChange('contract_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.000"
                    className={manualOverride.contract_amount ? "border-yellow-300" : ""}
                  />
                  {calculations && !manualOverride.contract_amount && (
                    <p className="text-xs text-green-600">✅ محسوب تلقائياً</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monthly_amount" className="flex items-center gap-2">
                    المبلغ الشهري (د.ك)
                    {manualOverride.monthly_amount && (
                      <Badge variant="outline" className="text-xs">تعديل يدوي</Badge>
                    )}
                  </Label>
                  <Input
                    id="monthly_amount"
                    type="number"
                    step="0.001"
                    value={contractData.monthly_amount}
                    onChange={(e) => handleManualAmountChange('monthly_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.000"
                    className={manualOverride.monthly_amount ? "border-yellow-300" : ""}
                  />
                  {calculations && !manualOverride.monthly_amount && (
                    <p className="text-xs text-green-600">✅ محسوب تلقائياً</p>
                  )}
                </div>
              </div>

              {!selectedVehicle && contractData.vehicle_id && contractData.vehicle_id !== 'none' && (
                <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  ⚠️ لم يتم العثور على بيانات أسعار المركبة المحددة
                </div>
              )}

              {contractData.vehicle_id === 'none' && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  💡 اختر مركبة لحساب المبالغ تلقائياً
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل إضافية</CardTitle>
              <CardDescription>الوصف والشروط والملاحظات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">وصف العقد</Label>
                <Textarea
                  id="description"
                  value={contractData.description}
                  onChange={(e) => setContractData({...contractData, description: e.target.value})}
                  placeholder="وصف تفصيلي للعقد"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="terms">شروط العقد</Label>
                <Textarea
                  id="terms"
                  value={contractData.terms}
                  onChange={(e) => setContractData({...contractData, terms: e.target.value})}
                  placeholder="شروط وأحكام العقد"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              حفظ العقد
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}