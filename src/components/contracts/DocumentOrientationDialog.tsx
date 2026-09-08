import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCw, RotateCcw, WandSparkles, Loader2, Check, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { ContractDocument } from '@/hooks/useContractDocuments';
import { invokeDocumentOrientation, type OrientationInspection, type OrientationSaved } from '@/services/contractDocumentOrientation';
import { renderOrientationPages, detectPageOrientations, type OrientationPage, type OrientationSuggestion } from '@/utils/pdfOrientation';
import { invalidateContractDocumentDependents } from '@/utils/contractDocumentQueries';
import { toast } from 'sonner';

export default function DocumentOrientationDialog({ document, onClose, onSaved }: {
  document: ContractDocument; onClose: () => void; onSaved: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const [inspection, setInspection] = useState<OrientationInspection>();
  const [pages, setPages] = useState<OrientationPage[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<OrientationSuggestion[]>([]);
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const detection = useRef<AbortController>();
  const mounted = useRef(true);
  const request = useRef<{ id: string; key: string }>();
  useEffect(() => {
    let active = true;
    mounted.current = true;
    void (async () => {
      try {
        const info = await invokeDocumentOrientation(document) as OrientationInspection;
        const { data, error: downloadError } = await supabase.storage.from(info.source_bucket || 'contract-documents').download(info.file_path);
        if (downloadError || !data) throw new Error('تعذر تحميل الملف للمراجعة');
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await data.arrayBuffer())), (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (hash !== info.source_sha256) throw new Error('تغير محتوى الملف؛ افتح التصحيح مجددًا');
        const rendered = await renderOrientationPages(data);
        if (active) { setInspection(info); setPages(rendered); setRotations(rendered.map(() => 0)); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'تعذر فتح المستند'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; mounted.current = false; detection.current?.abort(); };
  }, [document.id, document.company_id, document.contract_id, document.sourceType]);
  const busy = loading || saving || detecting || inspection?.can_save === false;
  const changeRotations = (next: number[], affected: number[]) => {
    setRotations(next); setConfirmed(false);
    setReviewed((current) => new Set([...current].filter((i) => !affected.includes(i))));
  };
  const rotate = (angle: number, all = false) => changeRotations(
    rotations.map((value, i) => all || i === index ? (value + angle + 360) % 360 : value),
    all ? pages.map((_, i) => i) : [index],
  );
  const detect = async () => {
    const controller = new AbortController(); detection.current = controller;
    setDetecting(true); setError('');
    try {
      const result = await detectPageOrientations(pages, controller.signal, (page) => { if (mounted.current) setProgress(page); });
      if (!mounted.current || controller.signal.aborted || detection.current !== controller) return;
      setSuggestions(result);
      // Suggestions are absolute corrections from the stored source, never
      // accumulated over a user's previous manual changes.
      const next = rotations.map((value, i) => result[i].reliable ? result[i].rotation : value);
      changeRotations(next, next.flatMap((value, i) => value !== rotations[i] ? [i] : []));
    } catch (e) { if (mounted.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'تعذر الفحص؛ يمكنك التدوير يدويًا'); }
    finally { if (mounted.current && detection.current === controller) setDetecting(false); }
  };
  const save = async () => {
    if (!inspection || busy || !confirmed || reviewed.size !== pages.length || !rotations.some(Boolean)) return;
    setSaving(true); setError('');
    const key = JSON.stringify([inspection.revision, rotations]);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    try {
      const saved = await invokeDocumentOrientation(document, { revision: inspection.revision, sourceSha256: inspection.source_sha256, requestId: request.current.id, rotations }) as OrientationSaved;
      onSaved(saved.file_path);
      toast.success('تم حفظ الاتجاه الصحيح مع الاحتفاظ بالنسخة الأصلية');
      onClose();
      await Promise.all((saved.affected_contract_ids || inspection.affected_contract_ids || [document.contract_id])
        .map((contractId) => invalidateContractDocumentDependents(queryClient, document.company_id, contractId)));
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'تعذر حفظ التصحيح'); }
    finally { if (mounted.current) setSaving(false); }
  };
  const original = inspection?.history.at(-1)?.previous_file_path;
  const openOriginal = async () => {
    if (!original) return;
    const { data, error: downloadError } = await supabase.storage.from(inspection?.source_bucket || 'contract-documents').download(original);
    if (downloadError || !data) { setError('تعذر تحميل النسخة الأصلية'); return; }
    const url = URL.createObjectURL(data);
    const link = window.document.createElement('a'); link.href = url; link.download = `original-${document.document_name}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent dir="rtl" className="max-w-5xl max-h-[94vh] overflow-y-auto bg-white text-slate-900">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><RotateCw className="h-5 w-5 text-emerald-700" />تصحيح اتجاه الصفحات</DialogTitle>
        <DialogDescription>راجع الاتجاه ثم احفظ النسخة المصححة. سيبقى أصل الملف محفوظًا وسيتحدث المستند في العقد وتجهيز الدعوى.</DialogDescription>
      </DialogHeader>
      <p className="truncate text-sm font-medium">{document.document_name}</p>
      {document.sourceType === 'customer' && <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
        هذا مستند من ملف العميل. سيظهر الاتجاه المحفوظ في جميع عقوده المرتبطة، مع الاحتفاظ بالنسخة الأصلية.
      </p>}
      {inspection?.automatic_check && <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
        <p>الفحص اليومي: {({ upright: 'اتجاه الصفحات صحيح', corrected: 'تم تصحيح الاتجاه تلقائيًا',
          needs_review: 'توجد صفحات تحتاج مراجعتك', protected: 'النسخة محمية لارتباطها بإجراءات الدعوى',
          failed: 'تعذر الفحص، ستتم إعادة المحاولة', human_reviewed: 'تم الاحتفاظ بالاتجاه الذي راجعته يدويًا' } as Record<string, string>)[inspection.automatic_check.status] || 'تم الفحص'}</p>
        <p className="mt-1 text-xs">{new Date(inspection.automatic_check.checked_at).toLocaleString('ar-QA')}
          {inspection.automatic_check.corrected_pages > 0 && ` · ${inspection.automatic_check.corrected_pages} صفحة مصححة`}
          {!!inspection.automatic_check.review_pages.length && ` · راجع الصفحات: ${inspection.automatic_check.review_pages.join('، ')}`}</p>
      </div>}
      {loading && <p role="status" className="flex items-center gap-2 py-10"><Loader2 className="animate-spin h-5 w-5" />جارٍ تجهيز جميع الصفحات…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {inspection?.can_save === false && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">النسخة مرتبطة بطلب رفع قائم أو دعوى مسجلة. يمكنك معاينة السجل والأصل؛ يلزم إيقاف الطلب غير المرفوع قبل التصحيح.</p>}
      {pages.length > 0 && <>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={detect} className="gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"><WandSparkles className="h-4 w-4" />اكتشاف الاتجاه تلقائيًا</Button>
          <Button variant="outline" disabled={busy} onClick={() => rotate(90)} aria-label="تدوير الصفحة لليمين"><RotateCw className="h-4 w-4" /></Button>
          <Button variant="outline" disabled={busy} onClick={() => rotate(-90)} aria-label="تدوير الصفحة لليسار"><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" disabled={busy} onClick={() => rotate(180, true)}>تدوير الكل 180°</Button>
          <Button variant="ghost" disabled={busy} onClick={() => changeRotations(pages.map(() => 0), pages.map((_, i) => i))}>إعادة ضبط</Button>
        </div>
        {detecting && <div role="status" className="flex items-center gap-3 text-sm text-emerald-800"><Loader2 className="h-4 w-4 animate-spin" />فحص الصفحة {progress || 1} من {pages.length}<Button variant="ghost" size="sm" onClick={() => { detection.current?.abort(); setDetecting(false); }}>إيقاف الفحص</Button></div>}
        {!!suggestions.length && <p className="text-xs text-slate-600">تم اقتراح الاتجاه للصفحات الواضحة. {suggestions.filter((s) => !s.reliable).length} صفحة تحتاج تحديد الاتجاه يدويًا. راجع النتيجة قبل الحفظ.</p>}
        <div className="flex flex-wrap gap-1" aria-label="صفحات المستند">
          {pages.map((_, i) => <Button key={i} variant={index === i ? 'default' : 'outline'} size="sm" disabled={saving}
            aria-label={`صفحة ${i + 1}`} aria-current={index === i ? 'page' : undefined} onClick={() => setIndex(i)}
            title={suggestions[i] && !suggestions[i].reliable ? 'تحتاج مراجعة الاتجاه يدويًا' : undefined}
            className={index === i ? 'bg-emerald-800 text-white' : ''}>{i + 1}
            {suggestions[i] && !suggestions[i].reliable && <span className="ms-1 h-2 w-2 rounded-full bg-amber-500" />}
            {reviewed.has(i) && <Check className="ms-1 h-3 w-3" />}</Button>)}
        </div>
        {suggestions[index] && !suggestions[index].reliable && <p className="text-sm text-amber-800">لم يُحدد اتجاه هذه الصفحة بثقة. راجع المعاينة واستخدم أزرار التدوير عند الحاجة.</p>}
        <div className="flex h-[48vh] min-h-64 items-center justify-center overflow-hidden rounded-xl border bg-slate-100 p-3">
          <img src={pages[index].image} alt={`معاينة الصفحة ${index + 1}`} className="max-h-full max-w-full object-contain"
            style={{ transform: `rotate(${rotations[index]}deg)`, ...(rotations[index] % 180 ? { maxWidth: '55%', maxHeight: '55%' } : {}) }} />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>الصفحة {index + 1} / {pages.length} · التدوير {rotations[index]}°</span>
          <Button variant="outline" disabled={busy} onClick={() => { setReviewed((current) => new Set(current).add(index)); if (index + 1 < pages.length) setIndex(index + 1); }}>
            <Check className="me-1 h-4 w-4" />الاتجاه صحيح{index + 1 < pages.length ? '، التالي' : ''}
          </Button>
        </div>
        <label className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm">
          <Checkbox checked={confirmed} disabled={busy || reviewed.size !== pages.length} onCheckedChange={(value) => setConfirmed(value === true)} />
          راجعت اتجاه جميع الصفحات ({reviewed.size}/{pages.length}) وأريد حفظ التصحيح
        </label>
      </>}
      {!!inspection?.history.length && <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">سجل التصحيحات ({inspection.history.length})</summary>
        <Button variant="link" onClick={openOriginal} className="gap-2"><History className="h-4 w-4" />تحميل النسخة الأصلية</Button>
        {inspection.history.map((item) => <p key={item.corrected_file_path} className="py-1 text-xs text-slate-600">{new Date(item.created_at).toLocaleString('ar-QA')} · {item.rotations.filter(Boolean).length} صفحة مصححة</p>)}
      </details>}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" disabled={saving} onClick={onClose}>إغلاق</Button>
        <Button className="bg-emerald-800 text-white hover:bg-emerald-900" disabled={busy || !confirmed || reviewed.size !== pages.length || !rotations.some(Boolean)} onClick={save}>
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} {saving ? 'جارٍ حفظ التصحيح…' : 'حفظ التصحيح'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}
