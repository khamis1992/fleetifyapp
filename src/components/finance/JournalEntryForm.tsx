import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { useChartOfAccounts, useCreateJournalEntry, useCostCenters } from '@/hooks/useFinance'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

interface JournalEntryLine {
  id: string
  account_id: string
  account_name?: string
  cost_center_id?: string
  cost_center_name?: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface JournalEntryFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const [entryData, setEntryData] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
    reference_type: '',
    reference_id: ''
  })

  const [lines, setLines] = useState<JournalEntryLine[]>([
    { 
      id: '1', 
      account_id: '', 
      account_name: '',
      cost_center_id: '',
      cost_center_name: '',
      description: '', 
      debit_amount: 0, 
      credit_amount: 0 
    },
    { 
      id: '2', 
      account_id: '', 
      account_name: '',
      cost_center_id: '',
      cost_center_name: '',
      description: '', 
      debit_amount: 0, 
      credit_amount: 0 
    }
  ])

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts()
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters()
  const createJournalEntry = useCreateJournalEntry()

  const addLine = () => {
    const newLine: JournalEntryLine = {
      id: Date.now().toString(),
      account_id: '',
      account_name: '',
      cost_center_id: '',
      cost_center_name: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0
    }
    setLines([...lines, newLine])
  }

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(line => line.id !== id))
    }
  }

  const updateLine = (id: string, field: keyof JournalEntryLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, [field]: value }
        
        // If account_id changes, update account_name
        if (field === 'account_id') {
          const selectedAccount = accounts?.find(acc => acc.id === value)
          updatedLine.account_name = selectedAccount?.account_name || ''
        }
        
        // If cost_center_id changes, update cost_center_name
        if (field === 'cost_center_id') {
          const selectedCostCenter = costCenters?.find(cc => cc.id === value)
          updatedLine.cost_center_name = selectedCostCenter?.center_name || ''
        }
        
        return updatedLine
      }
      return line
    }))
  }

  const totalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isBalanced) {
      toast.error('يجب أن تتوازن مبالغ المدين والدائن')
      return
    }

    if (lines.some(line => !line.account_id)) {
      toast.error('يجب اختيار حساب لكل بند')
      return
    }

    try {
      await createJournalEntry.mutateAsync({
        entry: {
          ...entryData,
          total_debit: totalDebits,
          total_credit: totalCredits
        },
        lines: lines.map(line => ({
          account_id: line.account_id,
          cost_center_id: line.cost_center_id || null,
          line_description: line.description,
          debit_amount: line.debit_amount || 0,
          credit_amount: line.credit_amount || 0
        }))
      })

      // Reset form
      setEntryData({
        entry_number: '',
        entry_date: new Date().toISOString().slice(0, 10),
        description: '',
        reference_type: '',
        reference_id: ''
      })
      setLines([
        { id: '1', account_id: '', account_name: '', cost_center_id: '', cost_center_name: '', description: '', debit_amount: 0, credit_amount: 0 },
        { id: '2', account_id: '', account_name: '', cost_center_id: '', cost_center_name: '', description: '', debit_amount: 0, credit_amount: 0 }
      ])
      onOpenChange?.(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Error creating journal entry:', error)
    }
  }

  if (accountsLoading || costCentersLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            إنشاء قيد محاسبي جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entry Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">بيانات القيد</CardTitle>
              <CardDescription>المعلومات الأساسية للقيد المحاسبي</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_number">رقم القيد</Label>
                <Input
                  id="entry_number"
                  value={entryData.entry_number}
                  onChange={(e) => setEntryData({...entryData, entry_number: e.target.value})}
                  placeholder="سيتم إنشاؤه تلقائياً"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry_date">تاريخ القيد</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={entryData.entry_date}
                  onChange={(e) => setEntryData({...entryData, entry_date: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">وصف القيد</Label>
                <Textarea
                  id="description"
                  value={entryData.description}
                  onChange={(e) => setEntryData({...entryData, description: e.target.value})}
                  placeholder="وصف القيد المحاسبي"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Entry Lines */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">بنود القيد</CardTitle>
                  <CardDescription>تفاصيل المدين والدائن للقيد</CardDescription>
                </div>
                <Button type="button" onClick={addLine} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة بند
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحساب</TableHead>
                    <TableHead>مركز التكلفة</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>مدين</TableHead>
                    <TableHead>دائن</TableHead>
                    <TableHead className="w-20">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="w-64">
                        <Select
                          value={line.account_id}
                          onValueChange={(value) => updateLine(line.id, 'account_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-64">
                        <Select
                          value={line.cost_center_id || ''}
                          onValueChange={(value) => updateLine(line.id, 'cost_center_id', value || '')}
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
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="وصف البند"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateLine(line.id, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.000"
                          className="text-green-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateLine(line.id, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.000"
                          className="text-red-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">إجمالي المدين:</span>
                  <span className="font-bold text-green-600">{totalDebits.toFixed(3)} د.ك</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">إجمالي الدائن:</span>
                  <span className="font-bold text-red-600">{totalCredits.toFixed(3)} د.ك</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="font-medium">الفرق:</span>
                  <span className={`font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(totalDebits - totalCredits).toFixed(3)} د.ك
                  </span>
                </div>
                {!isBalanced && (
                  <p className="text-sm text-red-600 text-center">
                    يجب أن يتساوى إجمالي المدين مع إجمالي الدائن
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={!isBalanced || createJournalEntry.isPending}
            >
              {createJournalEntry.isPending ? 'جاري الحفظ...' : 'حفظ القيد'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}