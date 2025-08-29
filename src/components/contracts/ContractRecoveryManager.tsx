import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { useContractRecovery } from '@/hooks/useContractRecovery'
import { cn } from '@/lib/utils'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(amount)
}

export const ContractRecoveryManager = () => {
  const {
    contractsWithoutJournalEntries,
    isLoading,
    createJournalEntry,
    isCreatingJournalEntry,
    createAllJournalEntries,
    isCreatingAllJournalEntries,
    hasContractsWithoutJournalEntries
  } = useContractRecovery()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="mr-2">جاري البحث عن العقود...</span>
        </CardContent>
      </Card>
    )
  }

  if (!hasContractsWithoutJournalEntries) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            حالة القيود المحاسبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-success/10 border-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              جميع العقود النشطة تحتوي على قيود محاسبية صحيحة
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
          <AlertTriangle className="h-5 w-5 text-warning" />
          العقود التي تحتاج لقيود محاسبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-warning/10 border-warning">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            تم العثور على {contractsWithoutJournalEntries.length} عقد بدون قيود محاسبية.
            يمكنك إنشاء القيود المحاسبية لهذه العقود الآن.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={() => createAllJournalEntries()}
            disabled={isCreatingAllJournalEntries || isCreatingJournalEntry}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isCreatingAllJournalEntries ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 ml-2" />
                إنشاء جميع القيود المحاسبية
              </>
            )}
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم العقد</TableHead>
                <TableHead>اسم العميل</TableHead>
                <TableHead>مبلغ العقد</TableHead>
                <TableHead>تاريخ العقد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractsWithoutJournalEntries.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.contract_number}
                  </TableCell>
                  <TableCell>{contract.customer_name}</TableCell>
                  <TableCell>{formatCurrency(contract.contract_amount)}</TableCell>
                  <TableCell>
                    {new Date(contract.contract_date).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={contract.status === 'active' ? 'default' : 'secondary'}
                    >
                      {contract.status === 'active' ? 'نشط' : 'مسودة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createJournalEntry(contract.id)}
                      disabled={isCreatingJournalEntry || isCreatingAllJournalEntries}
                    >
                      {isCreatingJournalEntry ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'إنشاء قيد'
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}