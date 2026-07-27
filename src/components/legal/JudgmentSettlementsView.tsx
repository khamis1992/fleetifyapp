import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Banknote,
  MessageSquarePlus,
  Download, ExternalLink, Eye, Link2, Loader2, Printer, RefreshCw,
  Scale, Search, ShieldCheck, Unlink, WalletCards,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatCurrency } from '@/lib/utils';
import {
  JudgmentSettlement, JudgmentSettlementStatus, LegalPaymentCandidate,
  useJudgmentSettlements, useLegalPaymentCandidates, useLegalSettlementActions,
  useLegalSettlementDetails,
} from '@/hooks/useJudgmentSettlements';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';

type QuickCollectionMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'debit_card';

const getLocalIsoDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const statusLabels: Record<JudgmentSettlementStatus, string> = {
  pending: 'بانتظار حركة مالية',
  linked_unposted: 'مرتبط وغير مرحل',
  partial: 'تسوية جزئية',
  settled: 'مسدد بالكامل',
  closed_with_balance: 'مغلق وله رصيد',
};

const statusClasses: Record<JudgmentSettlementStatus, string> = {
  pending: 'border-slate-200 bg-slate-50 text-slate-700',
  linked_unposted: 'border-amber-200 bg-amber-50 text-amber-800',
  partial: 'border-sky-200 bg-sky-50 text-sky-800',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  closed_with_balance: 'border-rose-200 bg-rose-50 text-rose-800',
};

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('ar-QA', { year: 'numeric', month: 'short', day: 'numeric' })
  : '-';

const mojibakeMarkers = ['Ø', 'Ù', 'Ã', 'Â', 'â', 'ð', '�'];

const reviewIssueLabels: Record<string, string> = {
  match_suggestion: 'حركة مالية محتملة لحكم قضائي',
  legacy_payment_unlinked: 'دفعة قانونية قديمة غير مرتبطة بحركة مالية',
  missing_journal: 'حركة مرتبطة بالحكم دون قيد مرحل',
  direction_mismatch: 'اتجاه الحركة المالية لا يطابق الحكم',
  closed_with_balance: 'قضية مغلقة ولها رصيد حكم غير مسدد',
  over_allocation: 'تعذر الربط التلقائي لحركة تحمل رقم القضية',
};

const hasMojibake = (input: string) => mojibakeMarkers.some((marker) => input.includes(marker));
const countArabicLetters = (input: string) => (input.match(/[\u0600-\u06FF]/g) || []).length;
const countMojibakeMarkers = (input: string) => mojibakeMarkers.reduce(
  (count, marker) => count + (input.match(new RegExp(marker, 'g')) || []).length,
  0,
);

const decodeLatin1Utf8 = (input: string) => {
  try {
    const bytes = Uint8Array.from(input, (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  } catch {
    return input;
  }
};

const chooseBestDisplayText = (options: string[]) => options
  .map((text) => text.trim())
  .filter(Boolean)
  .sort((a, b) => {
    const arabicDelta = countArabicLetters(b) - countArabicLetters(a);
    if (arabicDelta !== 0) return arabicDelta;
    return countMojibakeMarkers(a) - countMojibakeMarkers(b);
  })[0] || '';

const decodePossiblyMojibake = (value: string) => {
  const text = value.trim();
  if (!text || !hasMojibake(text)) return text;

  const firstPass = decodeLatin1Utf8(text);
  const secondPass = hasMojibake(firstPass) ? decodeLatin1Utf8(firstPass) : firstPass;
  return chooseBestDisplayText([text, firstPass, secondPass]);
};

const translateDetailKey = (key: string) => ({
  amount: 'المبلغ',
  allocation_id: 'معرف الربط',
  error: 'السبب',
  judgment_amount: 'مبلغ الحكم',
  linked_amount: 'المبلغ المرتبط',
  payment_date: 'تاريخ الدفعة',
  reference_number: 'رقم المرجع',
  score: 'درجة المطابقة',
  settled_amount: 'المبلغ المسدد',
}[key] || key);

const decodeDisplayText = (value?: unknown): string => {
  if (typeof value === 'string') return decodePossiblyMojibake(value);
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const preferredValue = record.message || record.reason || record.error || record.description || record.title;
  if (preferredValue) return decodeDisplayText(preferredValue);

  return Object.entries(record)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
    .map(([key, entryValue]) => `${translateDetailKey(key)}: ${decodeDisplayText(String(entryValue))}`)
    .join('، ');
};

interface JudgmentSettlementsViewProps {
  onViewCaseDetails?: (caseId: string) => void;
  onUploadCaseDocument?: (caseId: string, caseNumber?: string) => void;
}

export function JudgmentSettlementsView({
  onViewCaseDetails,
  onUploadCaseDocument,
}: JudgmentSettlementsViewProps) {
  const navigate = useNavigate();
  const settlementsQuery = useJudgmentSettlements();
  const actions = useLegalSettlementActions();
  const { createPayment } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | JudgmentSettlementStatus>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'receive' | 'pay'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<JudgmentSettlement | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<LegalPaymentCandidate | null>(null);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [linkReason, setLinkReason] = useState('');
  const [reverseTarget, setReverseTarget] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickCollectionOpen, setQuickCollectionOpen] = useState(false);
  const [quickCollectionTarget, setQuickCollectionTarget] = useState<JudgmentSettlement | null>(null);
  const [quickCollectionAmount, setQuickCollectionAmount] = useState('');
  const [quickCollectionDate, setQuickCollectionDate] = useState(getLocalIsoDate);
  const [quickCollectionMethod, setQuickCollectionMethod] = useState<QuickCollectionMethod>('bank_transfer');
  const [quickCollectionReference, setQuickCollectionReference] = useState('');
  const [quickCollectionNotes, setQuickCollectionNotes] = useState('');
  const [quickCollectionKey, setQuickCollectionKey] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [caseNote, setCaseNote] = useState('');

  const detailsQuery = useLegalSettlementDetails(selected?.id);
  const candidatesQuery = useLegalPaymentCandidates(selected);
  const settlements = useMemo(() => settlementsQuery.data || [], [settlementsQuery.data]);

  const stats = useMemo(() => ({
    judgments: settlements.reduce((sum, item) => sum + item.outcome_amount, 0),
    received: settlements.filter((item) => item.payment_direction === 'receive').reduce((sum, item) => sum + item.settled_amount, 0),
    paid: settlements.filter((item) => item.payment_direction === 'pay').reduce((sum, item) => sum + item.settled_amount, 0),
    remaining: settlements.reduce((sum, item) => sum + item.remaining_amount, 0),
    reviews: settlements.reduce((sum, item) => sum + item.open_review_count, 0),
  }), [settlements]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return settlements.filter((item) => {
      if (statusFilter !== 'all' && item.settlement_status !== statusFilter) return false;
      if (directionFilter !== 'all' && item.payment_direction !== directionFilter) return false;
      if (!term) return true;
      return [item.case_number, item.case_reference, item.client_name, item.case_title]
        .some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [settlements, statusFilter, directionFilter, search]);

  const toggleSelected = (id: string) => setSelectedIds((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  const printable = selectedIds.length ? filtered.filter((item) => selectedIds.includes(item.id)) : filtered;

  const exportCsv = () => {
    const rows = [
      ['رقم القضية', 'العميل', 'الاتجاه', 'مبلغ الحكم', 'المسدد', 'المتبقي', 'الحالة'],
      ...printable.map((item) => [
        item.case_number, item.client_name || '', item.payment_direction === 'receive' ? 'لصالح الشركة' : 'على الشركة',
        item.outcome_amount, item.settled_amount, item.remaining_amount, statusLabels[item.settlement_status],
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `legal-judgment-settlements-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  const openLinkDialog = (item: JudgmentSettlement) => {
    setSelected(item); setSelectedPayment(null); setAllocationAmount(''); setLinkReason(''); setLinkOpen(true);
  };

  const openQuickCollection = (item: JudgmentSettlement) => {
    setQuickCollectionTarget(item);
    setQuickCollectionAmount(item.remaining_amount.toFixed(2));
    setQuickCollectionDate(getLocalIsoDate());
    setQuickCollectionMethod('bank_transfer');
    setQuickCollectionReference('');
    setQuickCollectionNotes('');
    setQuickCollectionKey(`legal-collection:${item.id}:${crypto.randomUUID()}`);
    setQuickCollectionOpen(true);
  };

  const confirmQuickCollection = async () => {
    if (!quickCollectionTarget?.client_id || quickCollectionTarget.payment_direction !== 'receive') return;
    const amount = Number(quickCollectionAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > quickCollectionTarget.remaining_amount + 0.01) return;

    await createPayment.mutateAsync({
      customer_id: quickCollectionTarget.client_id,
      legal_case_id: quickCollectionTarget.id,
      amount,
      payment_date: quickCollectionDate,
      payment_method: quickCollectionMethod,
      payment_status: 'completed',
      type: 'receipt',
      currency: 'QAR',
      reference_number: quickCollectionReference.trim() || quickCollectionTarget.case_number,
      notes: [`تحصيل حكم القضية ${quickCollectionTarget.case_number}`, quickCollectionNotes.trim()].filter(Boolean).join(' - '),
      idempotencyKey: quickCollectionKey,
    });

    setQuickCollectionOpen(false);
    setQuickCollectionTarget(null);
    setSelected(null);
  };

  const choosePayment = (payment: LegalPaymentCandidate) => {
    setSelectedPayment(payment);
    setAllocationAmount(String(Math.min(payment.amount, selected?.remaining_amount || payment.amount)));
  };

  const confirmLink = async () => {
    if (!selected || !selectedPayment || Number(allocationAmount) <= 0) return;
    await actions.linkPayment.mutateAsync({
      caseId: selected.id, paymentId: selectedPayment.id, amount: Number(allocationAmount), reason: linkReason,
    });
    setLinkOpen(false); setSelectedPayment(null);
  };

  const openNoteDialog = () => {
    setCaseNote('');
    setNoteDialogOpen(true);
  };

  const confirmCaseNote = async () => {
    if (!selected || !caseNote.trim()) return;
    await actions.addCaseNote.mutateAsync({ caseId: selected.id, note: caseNote });
    setCaseNote('');
    setNoteDialogOpen(false);
  };

  if (settlementsQuery.isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-500" /></div>;
  if (settlementsQuery.error) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>تعذر تحميل تسويات الأحكام المالية.</AlertDescription></Alert>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Scale className="h-5 w-5 text-indigo-600" />تسوية الأحكام المالية</h2>
          <p className="mt-1 text-sm text-slate-500">المبالغ المثبتة بأحكام المحكمة وربطها بسندات مالية وقيود محاسبية مرحلة.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="ml-2 h-4 w-4" />تصدير</Button>
          <Button size="sm" onClick={() => actions.runMatcher.mutate()} disabled={actions.runMatcher.isPending}>
            {actions.runMatcher.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}مطابقة الحركات
          </Button>
        </div>
      </div>

      <Alert className="border-indigo-200 bg-indigo-50/50">
        <ShieldCheck className="h-4 w-4 text-indigo-700" />
        <AlertDescription className="text-indigo-950">لا يُحتسب أي مبلغ هنا إلا من حركة مالية مكتملة مرتبطة بقيد محاسبي مرحل. لا توجد متابعة أو مراسلات مع العميل في هذا المسار.</AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="إجمالي الأحكام" value={stats.judgments} icon={Scale} />
        <MetricCard label="محصل للشركة" value={stats.received} icon={ArrowDownToLine} tone="success" />
        <MetricCard label="مدفوع من الشركة" value={stats.paid} icon={ArrowUpFromLine} tone="info" />
        <MetricCard label="الرصيد المتبقي" value={stats.remaining} icon={WalletCards} tone="warning" />
        <button type="button" onClick={() => setStatusFilter('closed_with_balance')} className="text-right">
          <MetricCard label="بحاجة إلى مراجعة" value={stats.reviews} icon={AlertTriangle} raw tone="danger" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-3 print:hidden">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="رقم القضية أو العميل أو مرجع المحكمة" className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={(value) => setDirectionFilter(value as typeof directionFilter)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الاتجاهات</SelectItem><SelectItem value="receive">لصالح الشركة</SelectItem><SelectItem value="pay">على الشركة</SelectItem></SelectContent>
        </Select>
        {selectedIds.length > 0 && <Badge variant="secondary">تم تحديد {selectedIds.length}</Badge>}
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow className="bg-slate-50">
            <TableHead className="w-10 print:hidden"><Checkbox checked={filtered.length > 0 && selectedIds.length === filtered.length} onCheckedChange={(checked) => setSelectedIds(checked ? filtered.map((item) => item.id) : [])} /></TableHead>
            <TableHead className="text-right">القضية</TableHead><TableHead className="text-right">صاحب القضية</TableHead><TableHead className="text-right">الاتجاه</TableHead>
            <TableHead className="text-right">مبلغ الحكم</TableHead><TableHead className="text-right">المسدد</TableHead><TableHead className="text-right">المتبقي</TableHead>
            <TableHead className="text-right">الحالة</TableHead><TableHead className="text-right print:hidden">الإجراء</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="h-40 text-center text-slate-500">لا توجد أحكام مالية مطابقة</TableCell></TableRow> : filtered.map((item) => (
              <TableRow key={item.id} className={cn('cursor-pointer hover:bg-slate-50', selectedIds.length && !selectedIds.includes(item.id) && 'print:hidden')} onClick={() => setSelected(item)}>
                <TableCell className="print:hidden" onClick={(event) => event.stopPropagation()}><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelected(item.id)} /></TableCell>
                <TableCell><p className="font-semibold text-slate-950">{item.case_number}</p><p className="text-xs text-slate-500">{formatDate(item.outcome_date)}</p></TableCell>
                <TableCell>{item.client_name || 'غير محدد'}</TableCell>
                <TableCell><Badge variant="outline" className={item.payment_direction === 'receive' ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}>{item.payment_direction === 'receive' ? 'لصالح الشركة' : 'على الشركة'}</Badge></TableCell>
                <TableCell className="font-semibold">{formatCurrency(item.outcome_amount)}</TableCell>
                <TableCell className="font-semibold text-emerald-700">{formatCurrency(item.settled_amount)}</TableCell>
                <TableCell className="font-semibold text-rose-700">{formatCurrency(item.remaining_amount)}</TableCell>
                <TableCell><Badge variant="outline" className={statusClasses[item.settlement_status]}>{statusLabels[item.settlement_status]}</Badge>{item.open_review_count > 0 && <span className="mr-2 text-xs text-rose-600">{item.open_review_count} مراجعة</span>}</TableCell>
                <TableCell className="print:hidden" onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    {item.payment_direction === 'receive' && (
                      <Button size="sm" onClick={() => openQuickCollection(item)} disabled={item.remaining_amount <= 0 || !item.client_id}>
                        <Banknote className="ml-2 h-4 w-4" />تسجيل تحصيل
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openLinkDialog(item)} disabled={item.remaining_amount <= 0}><Link2 className="ml-2 h-4 w-4" />ربط حركة</Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(null); onViewCaseDetails?.(item.id); }}>
                      <Eye className="ml-2 h-4 w-4" />
                      تفاصيل القضية
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(null); onUploadCaseDocument?.(item.id, item.case_number); }}>
                      <Upload className="ml-2 h-4 w-4" />
                      رفع ملف
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selected) && !linkOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-xl" dir="rtl">
          {selected && <>
            <SheetHeader><SheetTitle>{selected.case_number}</SheetTitle><SheetDescription>{selected.client_name || selected.case_title}</SheetDescription></SheetHeader>
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-3 gap-2"><SmallMetric label="الحكم" value={selected.outcome_amount} /><SmallMetric label="المسدد" value={selected.settled_amount} /><SmallMetric label="المتبقي" value={selected.remaining_amount} /></div>
              <div className="rounded-md border p-3 text-sm"><div className="grid grid-cols-2 gap-3"><Info label="تاريخ الحكم" value={formatDate(selected.outcome_date)} /><Info label="مرجع المحكمة" value={selected.case_reference || '-'} /><Info label="المحكمة" value={selected.court_name || '-'} /><Info label="الاتجاه" value={selected.payment_direction === 'receive' ? 'تحصيل لصالح الشركة' : 'دفع من الشركة'} /></div></div>
              <div className="flex flex-wrap gap-2 print:hidden">
                {selected.payment_direction === 'receive' && <Button size="sm" onClick={() => openQuickCollection(selected)} disabled={selected.remaining_amount <= 0 || !selected.client_id}><Banknote className="ml-2 h-4 w-4" />تسجيل تحصيل</Button>}
                <Button size="sm" variant="outline" onClick={() => openLinkDialog(selected)} disabled={selected.remaining_amount <= 0}><Link2 className="ml-2 h-4 w-4" />ربط حركة مالية</Button>
                <Button size="sm" variant="outline" onClick={openNoteDialog}><MessageSquarePlus className="ml-2 h-4 w-4" />إضافة ملاحظة</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelected(null); onViewCaseDetails?.(selected.id); }}><Eye className="ml-2 h-4 w-4" />تفاصيل القضية</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelected(null); onUploadCaseDocument?.(selected.id, selected.case_number); }}><Upload className="ml-2 h-4 w-4" />رفع نسخة الحكم</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/finance/billing?tab=payments')}><ExternalLink className="ml-2 h-4 w-4" />السجل المالي</Button>
              </div>

              <section><h3 className="mb-2 font-semibold">الحركات المرتبطة</h3>
                {detailsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (detailsQuery.data?.allocations || []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-slate-500">لا توجد حركة مالية مرتبطة</p> : <div className="space-y-2">{detailsQuery.data?.allocations.map((allocation) => {
                  const payment = allocation.payments;
                  const journal = Array.isArray(payment?.journal_entries) ? payment?.journal_entries[0] : payment?.journal_entries;
                  const posted = payment?.payment_status === 'completed' && journal?.status === 'posted';
                  return <div key={allocation.id} className={cn('rounded-md border p-3', allocation.status === 'reversed' && 'opacity-60')}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{payment?.payment_number || allocation.payment_id}</p><p className="text-xs text-slate-500">{formatDate(payment?.payment_date)} · {payment?.payment_method || '-'}</p></div><p className="font-bold">{formatCurrency(allocation.allocated_amount)}</p></div><div className="mt-2 flex items-center justify-between"><Badge variant="outline" className={posted ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}>{posted ? 'قيد مرحل ومحتسب' : allocation.status === 'reversed' ? 'معكوس' : 'غير محتسب حتى الترحيل'}</Badge>{allocation.status === 'active' && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setReverseTarget(allocation.id)}><Unlink className="ml-1 h-4 w-4" />فك الربط</Button>}</div></div>;
                })}</div>}
              </section>

              {(detailsQuery.data?.reviews || []).length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    عناصر تحتاج مراجعة
                  </h3>
                  <div className="space-y-2">
                    {detailsQuery.data?.reviews.map((review) => {
                      const decodedTitle = decodeDisplayText(review.title);
                      const fallbackTitle = reviewIssueLabels[review.issue_type] || 'عنصر يحتاج مراجعة';
                      const title = decodedTitle && !hasMojibake(decodedTitle) ? decodedTitle : fallbackTitle;
                      const details = decodeDisplayText(review.details);

                      return (
                        <div key={review.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                          <p className="font-medium text-amber-950">{title || 'عنصر يحتاج مراجعة'}</p>
                          {details && <p className="mt-1 text-sm text-amber-900">{details}</p>}
                          <p className="mt-1 text-xs text-amber-800">الثقة: {review.confidence ?? '-'}%</p>
                          <div className="mt-2 flex gap-2">
                            {review.payment_id && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const payment = candidatesQuery.data?.find((item) => item.id === review.payment_id);
                                  if (payment) {
                                    choosePayment(payment);
                                    setLinkOpen(true);
                                  }
                                }}
                                disabled={!candidatesQuery.data?.some((item) => item.id === review.payment_id)}
                              >
                                اعتماد الربط
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => actions.resolveReview.mutate({
                                reviewId: review.id,
                                action: 'dismissed',
                                reason: 'تمت المراجعة ولا تخص هذه القضية',
                              })}
                            >
                              استبعاد
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl" dir="rtl"><DialogHeader><DialogTitle>ربط حركة مالية بالحكم</DialogTitle><DialogDescription>اختر سندًا ماليًا موجودًا. الربط لا ينشئ دفعة جديدة ولا يحتسبها قبل ترحيل القيد.</DialogDescription></DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">{candidatesQuery.isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : (candidatesQuery.data || []).length === 0 ? <p className="rounded-md border border-dashed p-5 text-center text-sm text-slate-500">لا توجد حركات مالية مناسبة غير مرتبطة</p> : candidatesQuery.data?.map((payment) => <button type="button" key={payment.id} onClick={() => choosePayment(payment)} className={cn('flex w-full items-center justify-between rounded-md border p-3 text-right', selectedPayment?.id === payment.id && 'border-indigo-500 bg-indigo-50')}><div><p className="font-semibold">{payment.payment_number}</p><p className="text-xs text-slate-500">{formatDate(payment.payment_date)} · {payment.reference_number || 'بدون مرجع'} · {payment.payment_status}</p></div><p className="font-bold">{formatCurrency(payment.amount)}</p></button>)}</div>
          {selectedPayment && <div className="grid gap-3 border-t pt-3"><div><Label>المبلغ المخصص للحكم</Label><Input type="number" min="0.01" max={Math.min(selectedPayment.amount, selected?.remaining_amount || selectedPayment.amount)} value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} /></div><div><Label>سبب الربط أو ملاحظته</Label><Textarea value={linkReason} onChange={(event) => setLinkReason(event.target.value)} placeholder="مرجع الحكم أو سبب اختيار هذه الحركة" /></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setLinkOpen(false)}>إلغاء</Button><Button onClick={confirmLink} disabled={!selectedPayment || Number(allocationAmount) <= 0 || actions.linkPayment.isPending}>{actions.linkPayment.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}اعتماد الربط</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickCollectionOpen} onOpenChange={(open) => { setQuickCollectionOpen(open); if (!open) setQuickCollectionTarget(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل تحصيل الحكم</DialogTitle>
            <DialogDescription>
              سيتم إنشاء سند قبض وقيد محاسبي وربطهما مباشرة بالقضية {quickCollectionTarget?.case_number}.
            </DialogDescription>
          </DialogHeader>

          {quickCollectionTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-slate-50 p-3 text-sm">
                <Info label="العميل" value={quickCollectionTarget.client_name || '-'} />
                <Info label="الرصيد المتبقي" value={formatCurrency(quickCollectionTarget.remaining_amount)} />
              </div>

              {!quickCollectionTarget.client_id && (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>لا يمكن تسجيل التحصيل قبل ربط القضية بعميل.</AlertDescription></Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legal-collection-amount">المبلغ المحصل *</Label>
                  <Input id="legal-collection-amount" type="number" min="0.01" step="0.01" max={quickCollectionTarget.remaining_amount} value={quickCollectionAmount} onChange={(event) => setQuickCollectionAmount(event.target.value)} />
                  {Number(quickCollectionAmount) > quickCollectionTarget.remaining_amount + 0.01 && <p className="text-xs text-rose-600">المبلغ أكبر من الرصيد المتبقي.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-collection-date">تاريخ التحصيل *</Label>
                  <Input id="legal-collection-date" type="date" value={quickCollectionDate} onChange={(event) => setQuickCollectionDate(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>طريقة التحصيل *</Label>
                <Select value={quickCollectionMethod} onValueChange={(value) => setQuickCollectionMethod(value as QuickCollectionMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمانية</SelectItem>
                    <SelectItem value="debit_card">بطاقة خصم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-collection-reference">مرجع التحصيل</Label>
                <Input id="legal-collection-reference" value={quickCollectionReference} onChange={(event) => setQuickCollectionReference(event.target.value)} placeholder="رقم التحويل أو الشيك أو سند التنفيذ" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-collection-notes">ملاحظات</Label>
                <Textarea id="legal-collection-notes" value={quickCollectionNotes} onChange={(event) => setQuickCollectionNotes(event.target.value)} placeholder="تفاصيل التحصيل أو الدفعة الجزئية" />
              </div>

              <Alert className="border-emerald-200 bg-emerald-50">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <AlertDescription className="text-emerald-950">الحفظ يسجل حركة مالية فعلية، وليس مجرد ملاحظة على القضية.</AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCollectionOpen(false)}>إلغاء</Button>
            <Button
              onClick={confirmQuickCollection}
              disabled={
                createPayment.isPending ||
                !quickCollectionTarget?.client_id ||
                !quickCollectionDate ||
                Number(quickCollectionAmount) <= 0 ||
                Number(quickCollectionAmount) > (quickCollectionTarget?.remaining_amount || 0) + 0.01
              }
            >
              {createPayment.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Banknote className="ml-2 h-4 w-4" />}
              حفظ سند القبض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظة على القضية</DialogTitle>
            <DialogDescription>
              سيتم حفظ الملاحظة في سجل نشاط القضية {selected?.case_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="legal-case-note">نص الملاحظة</Label>
            <Textarea
              id="legal-case-note"
              value={caseNote}
              onChange={(event) => setCaseNote(event.target.value)}
              placeholder="مثال: تم التواصل مع العميل، تم تحديث موعد الجلسة، وصلت إفادة جديدة..."
              className="min-h-32 resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)} disabled={actions.addCaseNote.isPending}>
              إلغاء
            </Button>
            <Button onClick={confirmCaseNote} disabled={!caseNote.trim() || actions.addCaseNote.isPending}>
              {actions.addCaseNote.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ الملاحظة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reverseTarget)} onOpenChange={(open) => !open && setReverseTarget(null)}><DialogContent dir="rtl"><DialogHeader><DialogTitle>عكس رابط الحركة المالية</DialogTitle><DialogDescription>لن يتم حذف السند أو القيد. سيُلغى احتسابه من هذا الحكم فقط مع حفظ السبب.</DialogDescription></DialogHeader><div><Label>سبب فك الربط</Label><Textarea value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setReverseTarget(null)}>إلغاء</Button><Button variant="destructive" disabled={reverseReason.trim().length < 5 || actions.reverseLink.isPending} onClick={async () => { if (!reverseTarget) return; await actions.reverseLink.mutateAsync({ allocationId: reverseTarget, reason: reverseReason }); setReverseTarget(null); setReverseReason(''); }}>عكس الرابط</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone = 'default', raw = false }: { label: string; value: number; icon: typeof Banknote; tone?: 'default' | 'success' | 'info' | 'warning' | 'danger'; raw?: boolean }) {
  const tones = { default: 'text-slate-700 bg-slate-100', success: 'text-emerald-700 bg-emerald-50', info: 'text-sky-700 bg-sky-50', warning: 'text-amber-700 bg-amber-50', danger: 'text-rose-700 bg-rose-50' };
  return <Card className="rounded-md shadow-none"><CardContent className="flex min-h-[94px] items-center justify-between p-4"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-slate-950">{raw ? value.toLocaleString('en-US') : formatCurrency(value)}</p></div><span className={cn('rounded-md p-2', tones[tone])}><Icon className="h-5 w-5" /></span></CardContent></Card>;
}
function SmallMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{formatCurrency(value)}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900">{value}</p></div>; }
