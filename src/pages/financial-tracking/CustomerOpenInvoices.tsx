import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OpenCustomerInvoice } from "@/services/customerCollectionSummary";

export function CustomerOpenInvoices({
  invoices,
  asOf,
}: {
  invoices: OpenCustomerInvoice[];
  asOf: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الفواتير غير المسددة ({invoices.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-muted-foreground">
            لا توجد أرصدة متبقية على الفواتير الصادرة ضمن هذا التقرير.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الفاتورة</TableHead>
                <TableHead className="text-right">الاستحقاق</TableHead>
                <TableHead className="text-right">المتبقي</TableHead>
                <TableHead className="text-right">أيام التأخير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const days = invoice.due_date
                  ? Math.max(
                      0,
                      Math.floor(
                        (Date.parse(`${asOf}T00:00:00Z`) -
                          Date.parse(`${invoice.due_date}T00:00:00Z`)) /
                          86400000
                      )
                    )
                  : null;
                return (
                  <TableRow key={invoice.invoice_id}>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {invoice.due_date || "غير محدد"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {invoice.balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ر.ق
                    </TableCell>
                    <TableCell>{days ?? "غير متاح"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
