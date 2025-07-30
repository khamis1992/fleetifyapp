import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useJournalEntryLines } from "@/hooks/useGeneralLedger";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DetailedJournalEntryViewProps {
  entry: {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    status: string;
    reference_type?: string;
    total_debit: number;
    total_credit: number;
  };
  showAsCard?: boolean;
}

export function DetailedJournalEntryView({ entry, showAsCard = true }: DetailedJournalEntryViewProps) {
  const { data: entryLines, isLoading } = useJournalEntryLines(entry.id);

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'posted': return 'default';
      case 'draft': return 'secondary';
      case 'reversed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'مرحل';
      case 'draft': return 'مسودة';
      case 'reversed': return 'ملغي';
      default: return status;
    }
  };

  const TableContent = () => (
    <>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <Table className="border border-border">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center border-r border-border font-bold text-red-700">دائن</TableHead>
              <TableHead className="text-center border-r border-border font-bold text-green-700">مدين</TableHead>
              <TableHead className="text-center border-r border-border font-bold">البيان</TableHead>
              <TableHead className="text-center border-r border-border font-bold">اسم الحساب</TableHead>
              <TableHead className="text-center font-bold">رمز الحساب</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entryLines?.map((line, index) => (
              <TableRow key={line.id} className="border-b border-border">
                <TableCell className="border-r border-border text-center font-medium">
                  {line.credit_amount > 0 ? (
                    <span className="text-red-600">{line.credit_amount.toFixed(3)}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="border-r border-border text-center font-medium">
                  {line.debit_amount > 0 ? (
                    <span className="text-green-600">{line.debit_amount.toFixed(3)}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="border-r border-border text-right">
                  <div className="text-sm">
                    {line.line_description || entry.description || '-'}
                  </div>
                </TableCell>
                <TableCell className="border-r border-border text-right">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {line.account?.account_name_ar || line.account?.account_name || '-'}
                    </div>
                    {line.account?.account_name_ar && line.account?.account_name && (
                      <div className="text-xs text-muted-foreground opacity-70">
                        {line.account.account_name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-mono text-sm">
                    {line.account?.account_code || '-'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Totals Row */}
            <TableRow className="bg-muted/30 font-bold border-t-2 border-border">
              <TableCell className="text-center border-r border-border text-red-600">
                {entry.total_credit.toFixed(3)}
              </TableCell>
              <TableCell className="text-center border-r border-border text-green-600">
                {entry.total_debit.toFixed(3)}
              </TableCell>
              <TableCell colSpan={3} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span>المجموع</span>
                  {entry.total_debit === entry.total_credit ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                      متوازن
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                      غير متوازن
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </>
  );

  if (!showAsCard) {
    return <TableContent />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-border bg-muted/20">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-lg font-bold">سند قيد رقم: {entry.entry_number}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>التاريخ: {new Date(entry.entry_date).toLocaleDateString('en-GB')}</span>
              {entry.reference_type && (
                <Badge variant="outline">{entry.reference_type}</Badge>
              )}
            </div>
          </div>
          <Badge variant={getStatusColor(entry.status)}>
            {getStatusLabel(entry.status)}
          </Badge>
        </div>
        {entry.description && (
          <div className="mt-2 p-2 bg-muted/30 rounded text-sm border-r-4 border-primary">
            <span className="font-medium">البيان:</span> {entry.description}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <TableContent />
      </CardContent>
    </Card>
  );
}