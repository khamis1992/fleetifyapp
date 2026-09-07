import { useState } from 'react';
import { CheckCircle2, Clock, FileText, Plus, RefreshCw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DispatchPermitForm } from '@/components/fleet/DispatchPermitForm';
import { DispatchPermitsList } from '@/components/fleet/DispatchPermitsList';
import { useDispatchPermits } from '@/hooks/useDispatchPermits';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { OperationsMetric, OperationsPanel, OperationsWorkspace } from '@/components/operations/OperationsWorkspace';
import { PageHelp } from '@/components/help';
import { DispatchPermitsPageHelpContent } from '@/components/help/content';

export default function DispatchPermits() {
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  const { data: permits, isLoading, isFetching, error, refetch } = useDispatchPermits();
  const count = (status: string) => permits?.filter(permit => permit.status === status).length ?? 0;
  const unavailable = isLoading || !!error;

  return <OperationsWorkspace section="dispatch" actions={<>
    <Button className="opw-primary" onClick={() => setShowPermitForm(true)}><Plus size={16} />طلب تصريح جديد</Button>
    <Button className="opw-secondary" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />تحديث السجل</Button>
  </>}>
    <div className="opw-metrics" aria-busy={isLoading}>
      <OperationsMetric label="إجمالي التصاريح" value={unavailable ? '—' : permits?.length ?? 0} hint="جميع طلبات حركة المركبات" icon={FileText} />
      <OperationsMetric label="بانتظار الموافقة" value={unavailable ? '—' : count('pending')} hint="طلبات تحتاج إلى مراجعة" icon={Clock} tone="warning" />
      <OperationsMetric label="حركات قيد التنفيذ" value={unavailable ? '—' : count('in_progress')} hint={unavailable ? 'جارٍ تحميل الحالات' : count('approved') + ' تصريحًا تمت الموافقة عليه ولم يبدأ'} icon={Truck} />
      <OperationsMetric label="حركات مكتملة" value={unavailable ? '—' : count('completed')} hint={unavailable ? 'جارٍ تحميل الحالات' : count('rejected') + ' مرفوض · ' + count('cancelled') + ' ملغي'} icon={CheckCircle2} />
    </div>
    {isLoading ? <OperationsPanel title="سجل الحركة"><div className="opw-empty" role="status"><LoadingSpinner /><p>جارٍ تحميل تصاريح الحركة...</p></div></OperationsPanel>
      : error ? <div className="ad-notice" role="alert"><div><strong>تعذر تحميل تصاريح الحركة</strong>أعد المحاولة باستخدام زر تحديث السجل.</div></div>
      : <DispatchPermitsList onEditPermit={setEditingPermitId} />}
    {(showPermitForm || editingPermitId) && <DispatchPermitForm open={showPermitForm || !!editingPermitId} onOpenChange={open => { if (!open) { setShowPermitForm(false); setEditingPermitId(null); } }} editingPermitId={editingPermitId} />}
    <PageHelp title="مساعدة تصاريح التحرك"><DispatchPermitsPageHelpContent /></PageHelp>
  </OperationsWorkspace>;
}
