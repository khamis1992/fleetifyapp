import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalPageHeader } from './LegalPageHeader';

export function LegalPageState({ title, loading, message, onRetry }: {
  title: string; loading: boolean; message?: string; onRetry?: () => void;
}) {
  return <div className="space-y-5">
    <LegalPageHeader title={title} description="إدارة ومراجعة الملفات القانونية للشركة." />
    <section className="lw-panel" role={loading ? 'status' : 'alert'}>
      <div className="lw-empty">
        {loading ? <Loader2 className="animate-spin" /> : <AlertCircle />}
        <strong>{loading ? 'جارٍ تحميل البيانات…' : 'تعذّر تحميل البيانات'}</strong>
        <p className="max-w-xl leading-7">{loading ? 'تظهر الملفات والإجراءات بعد اكتمال القراءة.' : message || 'أعد المحاولة للتحقق من بيانات الصفحة.'}</p>
        {!loading && onRetry && <Button variant="outline" onClick={onRetry}><RefreshCw size={15} />إعادة المحاولة</Button>}
      </div>
    </section>
  </div>;
}
