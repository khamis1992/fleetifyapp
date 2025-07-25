import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Plus } from 'lucide-react'
import { useCostCenters } from '@/hooks/useFinance'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

interface ContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => void
}

export const ContractForm: React.FC<ContractFormProps> = ({ open, onOpenChange, onSubmit }) => {
  const [contractData, setContractData] = useState({
    contract_number: '',
    contract_date: new Date().toISOString().slice(0, 10),
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    contract_amount: 0,
    monthly_amount: 0,
    contract_type: 'rental',
    cost_center_id: '',
    customer_id: '',
    vehicle_id: '',
    description: '',
    terms: ''
  })

  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contractData.contract_number || !contractData.customer_id) {
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
        cost_center_id: '',
        customer_id: '',
        vehicle_id: '',
        description: '',
        terms: ''
      })
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('حدث خطأ في إنشاء العقد')
    }
  }

  if (costCentersLoading) {
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
                <Label htmlFor="contract_number">رقم العقد *</Label>
                <Input
                  id="contract_number"
                  value={contractData.contract_number}
                  onChange={(e) => setContractData({...contractData, contract_number: e.target.value})}
                  placeholder="رقم العقد"
                  required
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
                    <SelectItem value="rental">إيجار</SelectItem>
                    <SelectItem value="service">خدمة</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="sales">مبيعات</SelectItem>
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
                  onChange={(e) => setContractData({...contractData, start_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">تاريخ النهاية</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={contractData.end_date}
                  onChange={(e) => setContractData({...contractData, end_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                <Select 
                  value={contractData.cost_center_id} 
                  onValueChange={(value) => setContractData({...contractData, cost_center_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">لا يوجد</SelectItem>
                    {costCenters?.map((costCenter) => (
                      <SelectItem key={costCenter.id} value={costCenter.id}>
                        {costCenter.center_code} - {costCenter.center_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">التفاصيل المالية</CardTitle>
              <CardDescription>المبالغ والرسوم المالية للعقد</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_amount">قيمة العقد (د.ك)</Label>
                <Input
                  id="contract_amount"
                  type="number"
                  step="0.001"
                  value={contractData.contract_amount}
                  onChange={(e) => setContractData({...contractData, contract_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthly_amount">المبلغ الشهري (د.ك)</Label>
                <Input
                  id="monthly_amount"
                  type="number"
                  step="0.001"
                  value={contractData.monthly_amount}
                  onChange={(e) => setContractData({...contractData, monthly_amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.000"
                />
              </div>
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