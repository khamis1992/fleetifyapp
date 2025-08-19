import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { UnifiedAccountSelector } from '@/components/ui/unified-account-selector'
import { useCreateJournalEntry } from '@/hooks/useFinance'
import { useCostCenters } from '@/hooks/useFinance'
import { ChartOfAccount } from '@/hooks/useChartOfAccounts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

// Enhanced helper function to sanitize UUID values - handles all edge cases
const sanitizeUuid = (value: string | undefined | null): string | null => {
  // Handle null, undefined, empty strings, whitespace-only strings
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null
  }
  
  const trimmedValue = value.trim().toLowerCase()
  
  // Handle common "empty" values
  if (trimmedValue === 'none' || trimmedValue === 'null' || trimmedValue === 'undefined') {
    return null
  }
  
  // Return the original trimmed value if it looks like a valid UUID
  const originalTrimmed = value.trim()
  
  // Basic UUID format check (36 characters with hyphens in right places)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(originalTrimmed)) {
    return originalTrimmed
  }
  
  // If it doesn't look like a UUID, return null
  return null
}

interface JournalEntryLine {
  id: string
  account_id: string
  account_name?: string
  cost_center_id?: string
  cost_center_name?: string
  asset_id?: string
  asset_name?: string
  employee_id?: string
  employee_name?: string
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

  const [accountSearchOpen, setAccountSearchOpen] = useState<{[key: string]: boolean}>({})
  const [costCenterSearchOpen, setCostCenterSearchOpen] = useState<{[key: string]: boolean}>({})
  const [assetSearchOpen, setAssetSearchOpen] = useState<{[key: string]: boolean}>({})

  const [lines, setLines] = useState<JournalEntryLine[]>([
    { 
      id: '1', 
      account_id: '', 
      account_name: '',
      cost_center_id: '',
      cost_center_name: '',
      asset_id: '',
      asset_name: '',
      employee_id: '',
      employee_name: '',
      description: '', 
      debit_amount: 0, 
      credit_amount: 0 
    }
  ])

  
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters()
  const createJournalEntry = useCreateJournalEntry()

  // Fetch fixed assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_assets')
        .select('id, asset_code, asset_name, asset_name_ar')
        .eq('is_active', true)
        .order('asset_code');
      if (error) throw error;
      return data || [];
    }
  })

  // Fetch employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name')
        .eq('is_active', true)
        .order('employee_number');
      if (error) throw error;
      return data || [];
    }
  })

  const addLine = () => {
    const newLine: JournalEntryLine = {
      id: Date.now().toString(),
      account_id: '',
      account_name: '',
      cost_center_id: '',
      cost_center_name: '',
      asset_id: '',
      asset_name: '',
      employee_id: '',
      employee_name: '',
      description: '',
      debit_amount: 0,
      credit_amount: 0
    }
    setLines([...lines, newLine])
  }

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(line => line.id !== id))
    }
  }

  const updateLine = (id: string, field: keyof JournalEntryLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, [field]: value }
        
        // If account_id changes, update account_name
        if (field === 'account_id') {
          // Account name will be handled by the unified selector
          updatedLine.account_name = ''
        }
        
         // If cost_center_id changes, update cost_center_name
         if (field === 'cost_center_id') {
           const selectedCostCenter = costCenters?.find(cc => cc.id === value)
           updatedLine.cost_center_name = selectedCostCenter?.center_name_ar || selectedCostCenter?.center_name || ''
         }
        
        // If asset_id changes, update asset_name
        if (field === 'asset_id') {
          const selectedAsset = assets?.find(asset => asset.id === value)
          updatedLine.asset_name = selectedAsset?.asset_name || ''
        }
        
        // If employee_id changes, update employee_name
        if (field === 'employee_id') {
          const selectedEmployee = employees?.find(emp => emp.id === value)
          updatedLine.employee_name = selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''
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
    
    // Enhanced validation before submission
    console.log('=== Journal Entry Form Submission Started ===')
    console.log('Entry data:', entryData)
    console.log('Lines data:', lines)
    
    if (!isBalanced) {
      toast.error('يجب أن تتوازن مبالغ المدين والدائن')
      return
    }

    // Enhanced validation for accounts
    const invalidLines = lines.filter(line => !line.account_id || line.account_id.trim() === '')
    if (invalidLines.length > 0) {
      toast.error(`يجب اختيار حساب لكل بند - البنود غير الصحيحة: ${invalidLines.map((_, index) => index + 1).join(', ')}`)
      return
    }

    // Check if at least one line has an amount
    const hasAmounts = lines.some(line => (line.debit_amount > 0) || (line.credit_amount > 0))
    if (!hasAmounts) {
      toast.error('يجب إدخال مبلغ مدين أو دائن واحد على الأقل')
      return
    }

    try {
      // Enhanced data preparation with comprehensive sanitization
      const sanitizedLines = lines.map((line, index) => {
        // Enhanced account validation
        const accountId = sanitizeUuid(line.account_id)
        if (!accountId) {
          throw new Error(`Invalid account for line ${index + 1} - الحساب غير صحيح للبند رقم ${index + 1}`)
        }

        const sanitizedLine = {
          account_id: accountId,
          cost_center_id: sanitizeUuid(line.cost_center_id),
          asset_id: sanitizeUuid(line.asset_id),
          employee_id: sanitizeUuid(line.employee_id),
          line_description: line.description || '',
          debit_amount: Number(line.debit_amount) || 0,
          credit_amount: Number(line.credit_amount) || 0
        }
        
        // Comprehensive logging for debugging
        console.log(`=== Line ${index + 1} Processing ===`)
        console.log('Original line data:', {
          account_id: line.account_id,
          cost_center_id: line.cost_center_id,
          asset_id: line.asset_id,
          employee_id: line.employee_id,
          description: line.description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount
        })
        console.log('Sanitized line data:', sanitizedLine)
        
        return sanitizedLine
      })

      console.log('=== Final sanitized lines ready for submission ===')
      console.log('Sanitized lines:', sanitizedLines)

      // Sanitize the main entry data, especially UUID fields
      const sanitizedEntryData = {
        ...entryData,
        reference_id: sanitizeUuid(entryData.reference_id), // Apply sanitization to reference_id
        total_debit: totalDebits,
        total_credit: totalCredits
      }

      console.log('=== Sanitized entry data ===')
      console.log('Original entry data:', entryData)
      console.log('Sanitized entry data:', sanitizedEntryData)

      await createJournalEntry.mutateAsync({
        entry: sanitizedEntryData,
        lines: sanitizedLines
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
        { id: '1', account_id: '', account_name: '', cost_center_id: '', cost_center_name: '', asset_id: '', asset_name: '', employee_id: '', employee_name: '', description: '', debit_amount: 0, credit_amount: 0 }
      ])
      onOpenChange?.(false)
      onSuccess?.()
      
    } catch (error) {
      console.error('Error creating journal entry:', error)
    }
  }

  if (costCentersLoading || assetsLoading || employeesLoading) {
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
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
                  placeholder="سيتم إنشاؤه تلقائياً إذا ترك فارغاً"
                />
                <p className="text-sm text-muted-foreground">
                  اتركه فارغاً لتوليد رقم تلقائي أو أدخل رقماً مخصصاً
                </p>
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
              <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[280px]">الحساب</TableHead>
                      <TableHead className="min-w-[180px]">مركز التكلفة</TableHead>
                      <TableHead className="min-w-[180px]">الأصل</TableHead>
                      <TableHead className="min-w-[180px]">الموظف</TableHead>
                      <TableHead className="min-w-[200px]">الوصف</TableHead>
                      <TableHead className="min-w-[120px]">مدين</TableHead>
                      <TableHead className="min-w-[120px]">دائن</TableHead>
                      <TableHead className="w-20">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <UnifiedAccountSelector
                          value={line.account_id}
                          onValueChange={(value) => updateLine(line.id, 'account_id', value)}
                          placeholder="اختر الحساب..."
                          filterLevel="level_5_6"
                          showAccountType={true}
                          showParentAccount={true}
                          allowSearch={true}
                        />
                      </TableCell>
                      <TableCell>
                        <Popover 
                          open={costCenterSearchOpen[line.id] || false}
                          onOpenChange={(open) => setCostCenterSearchOpen({...costCenterSearchOpen, [line.id]: open})}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {line.cost_center_id
                                ? costCenters?.find((cc) => cc.id === line.cost_center_id)?.center_name_ar || 
                                  costCenters?.find((cc) => cc.id === line.cost_center_id)?.center_name || 'مركز التكلفة'
                                : 'مركز التكلفة'}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="البحث عن مركز التكلفة..." />
                              <CommandList>
                                <CommandEmpty>لم يتم العثور على مركز تكلفة.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value=""
                                    onSelect={() => {
                                      updateLine(line.id, 'cost_center_id', '')
                                      setCostCenterSearchOpen({...costCenterSearchOpen, [line.id]: false})
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !line.cost_center_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    لا يوجد
                                  </CommandItem>
                                  {(costCenters || []).map((costCenter) => (
                                    <CommandItem
                                      key={costCenter.id}
                                      keywords={[costCenter.center_code, costCenter.center_name_ar || '', costCenter.center_name || '']}
                                      onSelect={() => {
                                        updateLine(line.id, 'cost_center_id', costCenter.id)
                                        setCostCenterSearchOpen({...costCenterSearchOpen, [line.id]: false})
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          line.cost_center_id === costCenter.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {costCenter.center_code} - {costCenter.center_name_ar || costCenter.center_name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Popover open={assetSearchOpen[line.id]} onOpenChange={(open) => setAssetSearchOpen({...assetSearchOpen, [line.id]: open})}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={assetSearchOpen[line.id]}
                              className="w-full justify-between"
                              disabled={assetsLoading}
                            >
                              {line.asset_name || "الأصل"}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0">
                            <Command>
                              <CommandInput placeholder="البحث في الأصول..." />
                              <CommandList>
                                <CommandEmpty>لا توجد أصول</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    keywords={['لا يوجد', 'none']}
                                    onSelect={() => {
                                      updateLine(line.id, 'asset_id', '')
                                      setAssetSearchOpen({...assetSearchOpen, [line.id]: false})
                                    }}
                                  >
                                    لا يوجد
                                  </CommandItem>
                                  {(assets || []).map((asset) => (
                                    <CommandItem
                                      key={asset.id}
                                      keywords={[asset.asset_code, asset.asset_name, asset.asset_name_ar || '']}
                                      onSelect={() => {
                                        updateLine(line.id, 'asset_id', asset.id)
                                        setAssetSearchOpen({...assetSearchOpen, [line.id]: false})
                                      }}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{asset.asset_code} - {asset.asset_name}</span>
                                        {asset.asset_name_ar && (
                                          <span className="text-sm text-muted-foreground">{asset.asset_name_ar}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.employee_id || 'none'}
                          onValueChange={(value) => updateLine(line.id, 'employee_id', value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="الموظف" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">لا يوجد</SelectItem>
                            {(employees || []).map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.employee_number} - {employee.first_name} {employee.last_name}
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
                          disabled={lines.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>

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