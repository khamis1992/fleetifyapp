import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRentalMonthSummary } from '@/hooks/useRentalMonthSummary';
import { rentalMonthReviewLabels } from '@/services/rentalMonthSummary';
import { contractBusinessDate } from '@/utils/contractScheduleSettlement';

/** Invoice-month obligations, not receipt dates or an estimate from monthly rent. */
const UnpaidByMonthView = ({ companyId }: { companyId: string | null }) => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => contractBusinessDate().slice(0, 7));
  const { data, error, isPending, isFetching, refetch } = useRentalMonthSummary(companyId, month);
  const rows = data || [];
  const verified = rows.filter(row => row.review_reasons.length === 0);
  const unpaid = verified.filter(row => row.outstanding_amount > 0);
  const reviewCount = rows.length - verified.length;
  // The response boundary validates cents and safe aggregate range.
  const total = unpaid.reduce((sum,row) => sum + Math.round(row.outstanding_amount * 100),0) / 100;
  const visible = rows.filter(row => row.review_reasons.length > 0 || row.outstanding_amount > 0);
  const unavailable = !companyId || error || isPending || isFetching;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>متابعة فواتير الإيجار حسب الشهر</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="rental-summary-month">شهر الفاتورة — وليس تاريخ دفعها</Label>
          <Input id="rental-summary-month" type="month" value={month}
            onChange={event => { if (event.target.value) setMonth(event.target.value); }} />
          <Button variant="outline" onClick={() => void refetch()} disabled={!companyId || isFetching}>تحديث التقرير</Button>
        </CardContent>
      </Card>
      {unavailable ? (
        <Card><CardContent className="pt-6" role={error ? 'alert' : 'status'}>
          {!companyId ? 'اختر الشركة لعرض التقرير.' : error ? error.message : 'جاري التحقق من الفواتير وتخصيصات الدفعات…'}
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6">عقود بفواتير غير مسددة: {unpaid.length}</CardContent></Card>
            <Card><CardContent className="pt-6">المتبقي للفواتير المتحققة: {total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</CardContent></Card>
            <Card><CardContent className="pt-6">عقود تحتاج مطابقة: {reviewCount}</CardContent></Card>
          </div>
          {reviewCount > 0 && <p role="alert" className="text-amber-700">
            الحالات التي تحتاج مطابقة مستبعدة من الإجمالي؛ لا تُعد مسددة أو متعثرة حتى اكتمال بياناتها.
          </p>}
          <Card>
            <CardHeader><CardTitle>فواتير شهر {month}</CardTitle></CardHeader>
            <CardContent>
              {visible.length === 0 ? (
                <p>{rows.length === 0 ? 'لا توجد عقود أو فواتير ضمن نطاق هذا الشهر.' : 'لا يوجد رصيد متبقٍ على فواتير هذا الشهر المتحققة.'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      {['العميل','العقد','قيمة الفواتير','المسدد','المتبقي','الحالة','إجراءات'].map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>{visible.map(row => {
                      const review = row.review_reasons.length > 0;
                      const money = (value: number) => review ? 'غير معتمد' : value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
                      return <TableRow key={row.contract_id}>
                        <TableCell>{row.customer_name}</TableCell>
                        <TableCell>{row.contract_number}</TableCell>
                        <TableCell>{money(row.invoiced_amount)}</TableCell>
                        <TableCell>{money(row.paid_amount)}</TableCell>
                        <TableCell>{money(row.outstanding_amount)}</TableCell>
                        <TableCell>{review ? row.review_reasons.map(reason => rentalMonthReviewLabels[reason]).join('، ') : row.paid_amount > 0 ? 'دفع جزئي' : 'غير مدفوع'}</TableCell>
                        <TableCell><Button variant="outline" size="sm" onClick={() => navigate('/contracts/' + row.contract_id)}>تفاصيل العقد والفواتير</Button></TableCell>
                      </TableRow>;
                    })}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
export default UnpaidByMonthView;
