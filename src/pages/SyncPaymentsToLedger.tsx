import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { fetchLegacyRentalReceiptAudit } from '@/services/legacyRentalReceiptAudit';

const labels = { linked:'دفعة محددة', cancelled:'دفعة ملغاة', review:'تحتاج مراجعة', no_payment:'دون مبلغ مدفوع' };

const SyncPaymentsToLedger = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const audit = useQuery({
    queryKey: ['legacy-rental-receipt-audit',companyId],
    enabled:false,
    queryFn:()=>fetchLegacyRentalReceiptAudit(companyId || ''),
    retry:false,
  });
  const data=audit.data || [];
  const currentPage=Math.min(page,Math.max(0,Math.ceil(data.length/100)-1));
  const hasResult=Boolean(audit.data) && !audit.error && !audit.isFetching;
  return (
    <div className="container mx-auto p-6 space-y-5" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>مطابقة سندات الإيجار القديمة</CardTitle>
          <CardDescription>فحص الروابط ومفاتيح العمليات قبل أي ترحيل مالي.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert><AlertDescription>
            هذا الفحص لا ينشئ دفعات أو قيودًا، ولا يغيّر السندات. السند المرتبط بفاتورة قد يكون ملخصًا تراكميًا وليس قبضًا جديدًا.
            السند المستقل غير المرتبط يحتاج إثبات مصدره قبل تسجيله عبر مسار الدفعات.
          </AlertDescription></Alert>
          <Button disabled={!companyId || audit.isFetching} onClick={()=>{setPage(0);void audit.refetch();}}>
            {audit.isFetching?'جاري فحص السندات…':'فحص السندات دون تعديل مالي'}
          </Button>
          {!companyId && <p>اختر الشركة لبدء الفحص.</p>}
          {audit.error && <Alert variant="destructive"><AlertDescription>
            تعذر إكمال قراءة بيانات المطابقة. لم يُعتمد تقرير جزئي ولم تُنشأ دفعات؛ أعد المحاولة.
          </AlertDescription></Alert>}
          {audit.isFetching && <p role="status">جاري قراءة صفحات السندات والدفعات والقيود…</p>}
        </CardContent>
      </Card>
      {hasResult && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(labels).map(([status,label])=><Card key={status}><CardContent className="pt-6">
            {label}: {data.filter(item=>item.status===status).length}
          </CardContent></Card>)}
        </div>
        <p>تم فحص {data.length} سند. النتائج للمراجعة وليست أمر ترحيل أو كشف مديونية، وقد تتغير البيانات بعد الفحص.</p>
        <Card><CardContent className="pt-6 overflow-x-auto">
          {data.length===0?<p>لا توجد سندات ضمن نطاق القراءة الحالي.</p>:<Table>
            <TableHeader><TableRow>{['السند','العميل','النتيجة','التوضيح','المتابعة'].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(currentPage*100,(currentPage+1)*100).map(item=><TableRow key={item.receiptId}>
              <TableCell>{item.receiptNumber}</TableCell><TableCell>{item.customerName}</TableCell>
              <TableCell>{labels[item.status]}</TableCell><TableCell>{item.message}</TableCell>
              <TableCell>{item.contractId && <Button variant="outline" onClick={()=>navigate('/contracts/'+item.contractId)}>مراجعة العقد</Button>}</TableCell>
            </TableRow>)}</TableBody>
          </Table>}
          {data.length>100 && <div className="flex gap-3 items-center mt-4">
            <Button variant="outline" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>السابق</Button>
            <span>صفحة {currentPage+1} من {Math.ceil(data.length/100)}</span>
            <Button variant="outline" disabled={(currentPage+1)*100>=data.length} onClick={()=>setPage(currentPage+1)}>التالي</Button>
          </div>}
        </CardContent></Card>
      </>}
    </div>
  );
};
export default SyncPaymentsToLedger;
