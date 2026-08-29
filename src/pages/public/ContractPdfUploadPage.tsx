import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { getSupabaseConfig } from '@/lib/env';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

type UploadTokenInfo = {
  success: boolean;
  valid: boolean;
  contractNumber: string;
  reason: 'missing' | 'identity_mismatch';
  expiresAt: string;
  maxFileBytes: number;
  message?: string;
};

type PageStatus = 'loading' | 'ready' | 'uploading' | 'success' | 'error';

export default function ContractPdfUploadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [tokenInfo, setTokenInfo] = useState<UploadTokenInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const endpoint = useMemo(() => {
    const { url } = getSupabaseConfig();
    return `${url.replace(/\/$/, '')}/functions/v1/upload-missing-contract-pdf?token=${encodeURIComponent(token)}&format=json`;
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();

    async function resolveToken() {
      if (!TOKEN_PATTERN.test(token)) {
        setError('رابط الرفع غير صالح أو ناقص. اطلب رابطاً جديداً من مسؤول العقود.');
        setStatus('error');
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const payload = await readJson(response);
        if (!response.ok || payload.success !== true || payload.valid !== true) {
          throw new Error(apiMessage(payload, 'انتهت صلاحية الرابط أو تم استخدامه مسبقاً.'));
        }
        setTokenInfo({
          success: true,
          valid: true,
          contractNumber: typeof payload.contractNumber === 'string' ? payload.contractNumber : '',
          reason: payload.reason === 'identity_mismatch' ? 'identity_mismatch' : 'missing',
          expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : '',
          maxFileBytes: typeof payload.maxFileBytes === 'number' ? payload.maxFileBytes : MAX_FILE_BYTES,
        });
        setStatus('ready');
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(errorMessage(loadError));
        setStatus('error');
      }
    }

    void resolveToken();
    return () => controller.abort();
  }, [endpoint, token]);

  const chooseFile = useCallback(async (candidate: File | null) => {
    setError('');
    if (!candidate) return;
    if (candidate.size < 5 || candidate.size > (tokenInfo?.maxFileBytes || MAX_FILE_BYTES)) {
      setFile(null);
      setError('حجم الملف غير مسموح. الحد الأقصى 15 ميجابايت.');
      return;
    }
    if (candidate.type !== 'application/pdf' && !candidate.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setError('اختر ملف PDF فقط.');
      return;
    }
    const signature = await candidate.slice(0, 5).text();
    if (signature !== '%PDF-') {
      setFile(null);
      setError('الملف المختار لا يحتوي على توقيع PDF صالح.');
      return;
    }
    setFile(candidate);
  }, [tokenInfo?.maxFileBytes]);

  const upload = async () => {
    if (!file || status !== 'ready') return;
    setStatus('uploading');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
      });
      const payload = await readJson(response);
      if (!response.ok || payload.success !== true) {
        throw new Error(apiMessage(payload, 'تعذر رفع الملف. حاول مرة أخرى.'));
      }
      setStatus('success');
    } catch (uploadError) {
      setError(errorMessage(uploadError));
      setStatus('ready');
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-[#071b1d] font-cairo text-[#133234]">
      <div aria-hidden className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div aria-hidden className="absolute -right-32 -top-36 h-96 w-96 rounded-full bg-[#d6a84b]/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-48 -left-28 h-[28rem] w-[28rem] rounded-full bg-[#3ab7a2]/15 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-7">
        <section className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#f3efe5] shadow-[0_28px_90px_rgba(0,0,0,.38)] lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="relative hidden min-h-[650px] overflow-hidden bg-[#0d3435] p-10 text-[#f5f0e3] lg:flex lg:flex-col lg:justify-between">
            <div aria-hidden className="absolute inset-0 opacity-[.08] [background-image:radial-gradient(circle_at_center,#fff_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative">
              <div className="mb-12 flex items-center gap-3 text-sm font-semibold tracking-wide text-[#e8c878]">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[#e8c878]/40"><FileText size={19} /></span>
                شركة العراف لتأجير السيارات
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-[#76cabb]">بوابة المستندات الآمنة</p>
              <h1 className="max-w-sm text-4xl font-bold leading-[1.35]">نسخة صحيحة.<br />عقد موثّق.<br />إجراء قانوني آمن.</h1>
              <div className="mt-9 h-px w-24 bg-[#e8c878]" />
            </div>
            <div className="relative space-y-5 text-sm leading-7 text-[#d8e3df]">
              <SecurityLine icon={<LockKeyhole size={18} />} text="لا يتيح الرابط دخول النظام أو مشاهدة بيانات العميل." />
              <SecurityLine icon={<Clock3 size={18} />} text="صالح لمدة 10 أيام ويُستخدم مرة واحدة فقط." />
              <SecurityLine icon={<ShieldCheck size={18} />} text="لن يعتمد الملف قانونياً قبل مطابقة هوية المستأجر." />
            </div>
          </aside>

          <div className="flex min-h-[650px] flex-col p-6 sm:p-10 lg:p-14">
            <div className="mb-9 flex items-center justify-between border-b border-[#173c3d]/10 pb-6">
              <div>
                <p className="text-xs font-bold tracking-wide text-[#9b762e]">رفع مستند مخصص</p>
                <h2 className="mt-1 text-2xl font-bold text-[#0d3435]">رفع نسخة العقد الموقعة</h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0d3435] text-[#f2d58f] shadow-lg"><FileUp size={22} /></span>
            </div>

            {status === 'loading' && <LoadingState />}
            {status === 'error' && <ErrorState message={error} />}
            {status === 'success' && <SuccessState contractNumber={tokenInfo?.contractNumber || ''} />}

            {(status === 'ready' || status === 'uploading') && tokenInfo && (
              <div className="flex flex-1 flex-col">
                <div className="mb-7 grid gap-3 sm:grid-cols-2">
                  <InfoCard label="رقم العقد" value={tokenInfo.contractNumber} />
                  <InfoCard label="صلاحية الرابط" value={formatExpiry(tokenInfo.expiresAt)} />
                </div>

                <div className="mb-5 rounded-2xl border border-[#c59434]/25 bg-[#fff8e8] px-4 py-3 text-sm leading-7 text-[#5e4b26]">
                  {tokenInfo.reason === 'identity_mismatch'
                    ? 'النسخة السابقة لا تطابق مستأجر هذا العقد. ارفع النسخة الصحيحة الخاصة بالعقد أعلاه.'
                    : 'لا توجد نسخة عقد موقعة لهذا العقد. ارفع النسخة الصحيحة بصيغة PDF.'}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    void chooseFile(event.dataTransfer.files?.[0] || null);
                  }}
                  className={`group relative grid min-h-52 cursor-pointer place-items-center rounded-[24px] border-2 border-dashed p-7 text-center transition-all duration-300 ${isDragging ? 'border-[#bd8e32] bg-[#fff8e8] scale-[1.01]' : 'border-[#6f8c87]/35 bg-white/65 hover:border-[#bd8e32]/70 hover:bg-white'}`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(event) => void chooseFile(event.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="w-full">
                      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#dcebe5] text-[#176456]"><FileText size={26} /></div>
                      <p className="mx-auto max-w-sm truncate font-bold text-[#133234]">{file.name}</p>
                      <p className="mt-1 text-sm text-[#71817d]">{formatBytes(file.size)}</p>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                        className="mx-auto mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#8b3f35] hover:text-[#b14638]"
                      ><X size={15} /> إزالة الملف</button>
                    </div>
                  ) : (
                    <div>
                      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#e4eee9] text-[#176456] transition-transform group-hover:-translate-y-1"><UploadCloud size={30} /></div>
                      <p className="font-bold text-[#133234]">اسحب ملف PDF هنا</p>
                      <p className="mt-2 text-sm text-[#71817d]">أو اضغط لاختيار الملف — الحد الأقصى 15 ميجابايت</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff0ec] px-4 py-3 text-sm text-[#8c3a30]">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} /> {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void upload()}
                  disabled={!file || status === 'uploading'}
                  className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0d4b49] px-6 font-bold text-white shadow-[0_12px_30px_rgba(13,75,73,.23)] transition hover:bg-[#11605c] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {status === 'uploading' ? <><Loader2 className="animate-spin" size={20} /> جارٍ رفع النسخة والتحقق منها…</> : <><FileUp size={20} /> رفع النسخة الموقعة</>}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function SecurityLine({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex items-start gap-3"><span className="mt-1 text-[#e8c878]">{icon}</span><span>{text}</span></div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#173c3d]/10 bg-white/70 p-4"><p className="text-xs font-semibold text-[#7b8b86]">{label}</p><p className="mt-1 truncate font-bold text-[#133234]">{value}</p></div>;
}

function LoadingState() {
  return <div className="grid flex-1 place-items-center text-center"><div><Loader2 className="mx-auto animate-spin text-[#176456]" size={34} /><p className="mt-4 font-semibold text-[#536b66]">جارٍ التحقق من صلاحية الرابط…</p></div></div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="grid flex-1 place-items-center text-center"><div className="max-w-md"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f5ddd7] text-[#9b4034]"><AlertCircle size={30} /></span><h3 className="mt-5 text-xl font-bold text-[#173c3d]">تعذر فتح رابط الرفع</h3><p className="mt-3 leading-8 text-[#667873]">{message}</p><p className="mt-5 text-sm text-[#8a9692]">اطلب من مسؤول العقود إرسال رابط جديد.</p></div></div>;
}

function SuccessState({ contractNumber }: { contractNumber: string }) {
  return <div className="grid flex-1 place-items-center text-center"><div className="max-w-md"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#dceee5] text-[#176456]"><CheckCircle2 size={38} /></span><p className="mt-6 text-xs font-bold text-[#9b762e]">تم الاستلام بنجاح</p><h3 className="mt-2 text-2xl font-bold text-[#173c3d]">وصلت نسخة العقد {contractNumber}</h3><p className="mt-4 leading-8 text-[#667873]">سيطابق النظام هوية المستأجر تلقائياً. لن تُستخدم النسخة في أي إجراء قانوني قبل نجاح المطابقة.</p><div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#edf3ef] px-4 py-2 text-sm font-semibold text-[#45645d]"><ShieldCheck size={17} /> أُغلق رابط الرفع بعد الاستخدام</div></div></div>;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json();
  } catch {
    return { success: false, message: 'استجابة الخدمة غير صالحة. حاول مرة أخرى لاحقاً.' };
  }
}

function apiMessage(payload: Record<string, unknown>, fallback: string): string {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : fallback;
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '10 أيام من تاريخ الرسالة';
  return new Intl.DateTimeFormat('ar-QA', { dateStyle: 'long', timeZone: 'Asia/Qatar' }).format(date);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} ميجابايت`;
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
