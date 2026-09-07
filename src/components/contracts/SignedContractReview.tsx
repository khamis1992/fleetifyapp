import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { applySignedContractRotations, loadSignedContractPages, findMismatchedContractPage, type ReviewPage } from '@/utils/signedContractReview';

export interface SignedContractReviewContext { contractNumber?: string; customerName?: string; nationalId?: string; vehiclePlate?: string; allowRotation?: boolean }

/** Native modal uses the browser top layer, including when called from a Radix upload dialog. */
export function SignedContractReview({ file, expected, onDone }: {
  file: File; expected: SignedContractReviewContext; onDone: (file: File | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pages, setPages] = useState<ReviewPage[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    loadSignedContractPages(file).then((result) => {
      if (!active) return;
      setPages(result); setRotations(result.map(() => 0));
    }).catch((e: Error) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [file]);
  const wrongPage = findMismatchedContractPage(pages, expected.contractNumber);
  const mismatch = wrongPage >= 0;
  const page = pages[index];
  const rotate = (all: boolean) => {
    setRotations((values) => values.map((value, i) => all || i === index ? (value + 90) % 360 : value));
    setConfirmed(false);
  };
  const save = async () => {
    if (loading || saving || mismatch || !confirmed || seen.size !== pages.length || !pages.length) return;
    setSaving(true); setError('');
    try { onDone(await applySignedContractRotations(file, rotations)); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الملف'); setSaving(false); }
  };
  const button = 'rounded-md border px-4 py-2 text-sm disabled:opacity-40';
  return <dialog ref={dialog} dir="rtl" aria-labelledby="signed-review-title"
    className="pointer-events-auto m-auto max-h-[95vh] w-[95vw] max-w-5xl overflow-auto rounded-xl bg-background p-5 text-foreground shadow-xl backdrop:bg-black/60"
    onCancel={(event) => { event.preventDefault(); if (!saving) onDone(null); }}>
    <h2 id="signed-review-title" className="text-xl font-bold">مراجعة نسخة العقد الموقّعة</h2>
    <p className="my-2 break-words">{file.name}</p>
    <div className="my-3 rounded-lg bg-muted p-3">
      <p>العقد: <b dir="auto">{expected.contractNumber || 'سيتم تحديده بعد المطابقة'}</b> · العميل: {expected.customerName || '—'}</p>
      <p>رقم الهوية: <span dir="ltr">{expected.nationalId || '—'}</span> · السيارة: {expected.vehiclePlate || '—'}</p>
      <p className="mt-2 text-sm">راجع جميع الصفحات والتوقيعات والهوية. الحفظ لا يعني اعتماد المطابقة؛ تُفحص الهوية بعد الرفع.</p>
    </div>
    {loading && <p role="status">جارٍ تجهيز جميع الصفحات وفحص رمز العقد…</p>}
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {mismatch && <p role="alert" className="my-3 font-bold text-red-700">الصفحة {Number(wrongPage) + 1} تخص عقدًا آخر. لا يمكن رفع هذا الملف للعقد الحالي.</p>}
    {page && <>
      <div className="flex flex-wrap items-center gap-2">
        <button className={button} disabled={saving || index === 0} onClick={() => setIndex(index - 1)}>السابق</button>
        <span>صفحة {index + 1} / {pages.length}</span>
        <button className={button} disabled={saving || index === pages.length - 1} onClick={() => setIndex(index + 1)}>التالي</button>
        {expected.allowRotation !== false && <>
          <button className={button} disabled={saving} onClick={() => rotate(false)}>تدوير الصفحة 90°</button>
          <button className={button} disabled={saving} onClick={() => rotate(true)}>تدوير الكل 90°</button>
        </>}
      </div>
      <div className="my-3 flex h-[55vh] items-center justify-center overflow-auto rounded-lg bg-slate-100">
        <img key={index} src={page.image} alt={`صفحة العقد ${index + 1}`} className="max-h-full max-w-full object-contain"
          onLoad={() => setSeen((current) => new Set(current).add(index))}
          style={{ transform: `rotate(${rotations[index]}deg)`, maxHeight: rotations[index] % 180 ? '65%' : '100%', maxWidth: rotations[index] % 180 ? '65%' : '100%' }} />
      </div>
      <label className="my-3 flex items-center gap-2">
        <input type="checkbox" checked={confirmed} disabled={saving || seen.size !== pages.length || mismatch}
          onChange={(event) => setConfirmed(event.target.checked)} />
        {expected.contractNumber ? 'راجعت جميع الصفحات؛ الاتجاه صحيح والنسخة تخص العقد الموضح' : 'راجعت جميع الصفحات والتوقيعات؛ الاتجاه صحيح وسأراجع بيانات العقد بعد المطابقة'} ({seen.size}/{pages.length})
      </label>
    </>}
    <div className="mt-4 flex gap-3">
      <button className={`${button} bg-emerald-700 text-white`} disabled={loading || saving || mismatch || !confirmed || seen.size !== pages.length}
        onClick={save}>{saving ? 'جارٍ حفظ التدوير…' : 'متابعة الرفع والفحص'}</button>
      <button className={button} disabled={saving} onClick={() => onDone(null)}>إلغاء الرفع</button>
    </div>
  </dialog>;
}

function showSignedContractReview(file: File, expected: SignedContractReviewContext): Promise<File> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    // Stay inside the existing dialog's focus scope. Radix disables pointer
    // events on body and traps focus while the upload dialog is open.
    const parent = document.activeElement?.closest('[role="dialog"]') || document.body;
    parent.appendChild(host);
    const root = createRoot(host);
    let settled = false;
    root.render(<SignedContractReview file={file} expected={expected} onDone={(result) => {
      if (settled) return;
      settled = true;
      queueMicrotask(() => { root.unmount(); host.remove(); });
      if (result) resolve(result); else reject(new Error('تم إلغاء رفع نسخة العقد'));
    }} />);
  });
}

let reviewQueue: Promise<unknown> = Promise.resolve();
export function reviewSignedContract(file: File, expected: SignedContractReviewContext): Promise<File> {
  const next = reviewQueue.then(() => showSignedContractReview(file, expected));
  reviewQueue = next.catch(() => undefined);
  return next;
}
