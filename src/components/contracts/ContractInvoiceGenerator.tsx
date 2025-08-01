import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ContractInvoiceGeneratorProps {
  contract: any
}

export const ContractInvoiceGenerator: React.FC<ContractInvoiceGeneratorProps> = ({ contract }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const queryClient = useQueryClient()

  // Get existing invoices for this contract
  const { data: existingInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['contract-invoices', contract.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .order('invoice_date', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!contract.id
  })

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (period: string) => {
      // Call the database function directly
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          company_id: contract.company_id,
          customer_id: contract.customer_id,
          contract_id: contract.id,
          invoice_number: `CNT-INV-${new Date().getFullYear()}-${Date.now()}`,
          invoice_type: 'sale',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: period === 'monthly' ? contract.monthly_amount : 
                   period === 'quarterly' ? contract.monthly_amount * 3 : 
                   contract.contract_amount,
          tax_amount: 0,
          total_amount: period === 'monthly' ? contract.monthly_amount : 
                       period === 'quarterly' ? contract.monthly_amount * 3 : 
                       contract.contract_amount,
          status: 'draft',
          notes: `Auto-generated from contract #${contract.contract_number} (${period} billing)`
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('تم إنشاء الفاتورة بنجاح')
    },
    onError: (error) => {
      console.error('Error creating invoice:', error)
      toast.error('حدث خطأ في إنشاء الفاتورة')
    }
  })

  // Generate periodic invoices for all active contracts
  const generatePeriodicInvoicesMutation = useMutation({
    mutationFn: async () => {
      // For now, just create a single invoice for this contract
      const period = 'monthly'
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          company_id: contract.company_id,
          customer_id: contract.customer_id,
          contract_id: contract.id,
          invoice_number: `CNT-INV-${new Date().getFullYear()}-${Date.now()}`,
          invoice_type: 'sale',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: contract.monthly_amount,
          tax_amount: 0,
          total_amount: contract.monthly_amount,
          status: 'draft',
          notes: `Auto-generated periodic invoice from contract #${contract.contract_number}`
        }])
        .select()
      
      if (error) throw error
      return data?.length || 0
    },
    onSuccess: (invoicesCount) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(`تم إنشاء ${invoicesCount} فاتورة دورية`)
    },
    onError: (error) => {
      console.error('Error generating periodic invoices:', error)
      toast.error('حدث خطأ في إنشاء الفواتير الدورية')
    }
  })

  const handleCreateInvoice = () => {
    createInvoiceMutation.mutate(selectedPeriod)
  }

  const handleGeneratePeriodicInvoices = () => {
    generatePeriodicInvoicesMutation.mutate()
  }

  const getInvoiceAmount = (period: string) => {
    switch (period) {
      case 'monthly': return contract.monthly_amount
      case 'quarterly': return contract.monthly_amount * 3
      case 'yearly': return contract.contract_amount
      default: return contract.monthly_amount
    }
  }

  const getLastInvoiceDate = () => {
    if (!existingInvoices || existingInvoices.length === 0) return null
    return existingInvoices[0].invoice_date
  }

  const getDaysSinceLastInvoice = () => {
    const lastDate = getLastInvoiceDate()
    if (!lastDate) {
      const daysSinceStart = Math.floor(
        (new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceStart
    }
    
    return Math.floor(
      (new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  const isEligibleForPeriodicInvoice = () => {
    const daysSince = getDaysSinceLastInvoice()
    return daysSince >= 30 && contract.status === 'active' && 
           ['monthly_rental', 'yearly_rental'].includes(contract.contract_type)
  }

  if (contract.status !== 'active') {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إنشاء الفواتير
        </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يمكن إنشاء فواتير للعقود غير النشطة. حالة العقد الحالية: {contract.status}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إنشاء الفواتير
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">القيمة الشهرية</span>
            </div>
            <p className="text-xl font-bold text-blue-800">{contract.monthly_amount?.toFixed(3)} د.ك</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">آخر فاتورة</span>
            </div>
            <p className="text-lg font-bold text-green-800">
              {getLastInvoiceDate() 
                ? new Date(getLastInvoiceDate()).toLocaleDateString('en-GB')
                : 'لا توجد'
              }
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">أيام منذ آخر فاتورة</span>
            </div>
            <p className="text-xl font-bold text-orange-800">{getDaysSinceLastInvoice()} يوم</p>
          </div>
        </div>

        {/* Periodic Invoice Alert */}
        {isEligibleForPeriodicInvoice() && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>هذا العقد مؤهل لإنشاء فاتورة دورية تلقائياً</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGeneratePeriodicInvoices}
                  disabled={generatePeriodicInvoicesMutation.isPending}
                >
                  {generatePeriodicInvoicesMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      إنشاء تلقائي
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Invoice Creation */}
        <div className="space-y-4">
          <h4 className="font-medium">إنشاء فاتورة يدوية</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>فترة الفوترة</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">شهرية</SelectItem>
                  <SelectItem value="quarterly">ربع سنوية</SelectItem>
                  <SelectItem value="yearly">سنوية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>مبلغ الفاتورة</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-lg font-bold">{getInvoiceAmount(selectedPeriod)?.toFixed(3)} د.ك</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateInvoice}
            disabled={createInvoiceMutation.isPending}
            className="w-full"
          >
            {createInvoiceMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                إنشاء فاتورة {selectedPeriod === 'monthly' ? 'شهرية' : selectedPeriod === 'quarterly' ? 'ربع سنوية' : 'سنوية'}
              </>
            )}
          </Button>
        </div>

        {/* Existing Invoices */}
        {invoicesLoading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : existingInvoices && existingInvoices.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium">الفواتير الموجودة</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {existingInvoices.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{invoice.total_amount?.toFixed(3)} د.ك</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status === 'paid' ? 'مدفوعة' : 
                       invoice.status === 'sent' ? 'مرسلة' : 'مسودة'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا توجد فواتير لهذا العقد</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
