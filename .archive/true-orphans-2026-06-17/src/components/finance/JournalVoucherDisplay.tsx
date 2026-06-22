import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useJournalEntryLines } from "@/hooks/useGeneralLedger"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface JournalVoucherDisplayProps {
  entry: {
    id: string
    entry_number: string
    entry_date: string
    description: string
    status: string
    total_debit: number
    total_credit: number
    reference_type?: string
    reference_id?: string
    created_by_profile?: {
      first_name?: string
      last_name?: string
    }
  }
}

export function JournalVoucherDisplay({ entry }: JournalVoucherDisplayProps) {
  const { data: entryLines = [] } = useJournalEntryLines(entry.id)
  const { formatCurrency } = useCurrencyFormatter()

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'مرحل'
      case 'draft': return 'مسودة'
      case 'reversed': return 'ملغي'
      default: return status
    }
  }

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'posted': return 'default'
      case 'draft': return 'secondary'
      case 'reversed': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
      {/* Voucher Header */}
      <CardHeader className="text-center border-b-2 border-slate-800 pb-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">سند قيد محاسبي</h1>
          <div className="flex justify-between items-center">
            <div className="text-right">
              <p className="text-sm text-slate-600">رقم القيد: <span className="font-bold">{entry.entry_number}</span></p>
              <p className="text-sm text-slate-600">
                التاريخ: <span className="font-bold">
                  {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ar })}
                </span>
              </p>
            </div>
            <div className="text-left">
              <Badge variant={getStatusColor(entry.status)} className="text-sm">
                {getStatusLabel(entry.status)}
              </Badge>
              {entry.reference_type && (
                <p className="text-sm text-slate-600 mt-1">
                  النوع: <span className="font-bold">{entry.reference_type}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Voucher Description */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">البيان:</h3>
          <p className="text-slate-700">{entry.description}</p>
        </div>

        {/* Voucher Table */}
        <div className="border-2 border-slate-800 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-slate-100 border-b-2 border-slate-800">
            <div className="grid grid-cols-16 gap-1 p-3 font-bold text-slate-800 text-sm">
              <div className="col-span-2 text-center">رمز الحساب</div>
              <div className="col-span-3 text-center">اسم الحساب</div>
              <div className="col-span-3 text-center">البيان</div>
              <div className="col-span-2 text-center">مركز التكلفة</div>
              <div className="col-span-2 text-center">الأصل</div>
              <div className="col-span-2 text-center">الموظف</div>
              <div className="col-span-1 text-center">مدين</div>
              <div className="col-span-1 text-center">دائن</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-300">
            {entryLines.map((line: any, index: number) => (
              <div key={line.id} className={`grid grid-cols-16 gap-1 p-3 text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="col-span-2 text-center font-mono text-xs">
                  {line.account?.account_code}
                </div>
                <div className="col-span-3 text-right">
                  <div className="font-semibold text-xs">{line.account?.account_name_ar || line.account?.account_name}</div>
                </div>
                <div className="col-span-3 text-right">
                  <div className="text-xs">{line.line_description || '-'}</div>
                </div>
                <div className="col-span-2 text-center text-xs">
                  {line.cost_center?.center_name_ar || line.cost_center?.center_name || '-'}
                </div>
                <div className="col-span-2 text-center text-xs">
                  {line.asset?.asset_name_ar || line.asset?.asset_name || '-'}
                </div>
                <div className="col-span-2 text-center text-xs">
                  {line.employee ? `${line.employee.first_name} ${line.employee.last_name}` : '-'}
                </div>
                <div className="col-span-1 text-center font-bold text-green-700 text-xs">
                  {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                </div>
                <div className="col-span-1 text-center font-bold text-red-700 text-xs">
                  {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer - Totals */}
          <div className="bg-slate-200 border-t-2 border-slate-800">
            <div className="grid grid-cols-16 gap-1 p-3 font-bold text-slate-800">
              <div className="col-span-14 text-right text-base">الإجمالي:</div>
              <div className="col-span-1 text-center text-base text-green-700">
                {formatCurrency(entry.total_debit)}
              </div>
              <div className="col-span-1 text-center text-base text-red-700">
                {formatCurrency(entry.total_credit)}
              </div>
            </div>
          </div>
        </div>

        {/* Voucher Footer */}
        <div className="mt-8 grid grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <p className="text-sm text-slate-600">أعد بواسطة</p>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-semibold">
                {entry.created_by_profile?.first_name && entry.created_by_profile?.last_name
                  ? `${entry.created_by_profile.first_name} ${entry.created_by_profile.last_name}`
                  : 'غير محدد'
                }
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-slate-600">راجع بواسطة</p>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-semibold">________________</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-slate-600">اعتمد بواسطة</p>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-semibold">________________</p>
            </div>
          </div>
        </div>

        {/* Balance Check */}
        {Math.abs(entry.total_debit - entry.total_credit) > 0.001 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold text-center">
              تحذير: القيد غير متوازن - الفرق: {formatCurrency(Math.abs(entry.total_debit - entry.total_credit))}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}