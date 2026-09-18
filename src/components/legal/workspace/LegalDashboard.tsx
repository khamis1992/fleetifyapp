import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, CalendarDays, CheckCheck, CircleCheck, FileCheck2, FolderKanban, Gavel, Scale, ShieldAlert, Files, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import type { LegalCase } from '@/hooks/useLegalCases';
import { legalDashboardModel } from './legalDashboardModel';

type Stats = { total: number; active: number; closed: number; highPriority: number };
export function LegalDashboard({ cases, totalLoadedScope, stats, loading, error, onRetry, onOpen, customerName, caseTitle, typeLabel }: {
  cases: LegalCase[]; totalLoadedScope: number; stats?: Stats; loading: boolean; error?: boolean;
  onRetry: () => void; onOpen: (item: LegalCase) => void;
  customerName: (item: LegalCase) => string; caseTitle: (item: LegalCase) => string; typeLabel: (value: string) => string;
}) {
  const model = useMemo(() => legalDashboardModel(cases), [cases]);
  const number = (value: number) => value.toLocaleString('ar-QA');
  if (error) return <section className="lw-panel" role="alert"><div className="lw-empty"><AlertCircle /><strong>تعذر تحميل ملخص القضايا</strong><p>أعد المحاولة لعرض بيانات موثوقة.</p><button onClick={onRetry} className="flex items-center gap-2"><RefreshCw size={15} />إعادة المحاولة</button></div></section>;
  if (loading) return <section className="lw-metrics" aria-label="جارٍ تحميل مؤشرات القضايا" role="status">{[1,2,3,4].map(i => <div key={i} className="lw-metric h-36 animate-pulse"><div className="h-3 w-2/3 rounded bg-slate-100" /><div className="mt-6 h-9 w-1/3 rounded bg-slate-100" /></div>)}</section>;
  return <div className="space-y-6">
    <section className="lw-metrics" aria-label="مؤشرات القضايا">
      {[
        {label:'إجمالي القضايا', value:stats?.total, hint:'جميع ملفات الشركة المسجلة', icon:FolderKanban},
        {label:'القضايا النشطة', value:stats?.active, hint:'بحسب الحالة المسجلة للقضية', icon:Scale},
        {label:'أولوية عالية', value:stats?.highPriority, hint:'ملفات مصنفة عالية أو عاجلة', icon:ShieldAlert},
        {label:'القضايا المغلقة', value:stats?.closed, hint:'إغلاق الملف بحسب السجل', icon:CheckCheck},
      ].map(item => <article key={item.label} className="lw-metric"><div className="lw-metric-top"><span>{item.label}</span><item.icon /></div><strong className="lw-metric-value">{item.value == null ? '—' : number(item.value)}</strong><small>{item.hint}</small></article>)}
    </section>
    <section aria-label="خدمات قانونية سريعة" className="lw-shortcuts">{[
      {title:'تجهيز دعوى', hint:'راجع الملفات وأكمل جاهزيتها', to:'/legal/delinquency', icon:Gavel},
      {title:'مستندات الشركة', hint:'تابع الملفات المطلوبة وصلاحيتها', to:'/legal/documents', icon:Files},
      {title:'العقود غير الموقعة', hint:'استكمل أدلة الملفات القانونية', to:'/legal/contracts-without-signed-lease', icon:FileCheck2},
      {title:'كتاب رسمي', hint:'جهّز كتابًا من القوالب المعتمدة', to:'/legal/document-generator', icon:FileText},
    ].map(item => <Link className="lw-shortcut" key={item.to} to={item.to}><item.icon size={20} /><div><strong>{item.title}</strong><p>{item.hint}</p></div><ArrowUpLeft size={14} className="ms-auto" /></Link>)}</section>
    <div className="lw-dashboard-grid">
      <section className="lw-panel"><div className="lw-section-heading"><div><h2>ملفات تحتاج متابعة</h2><p>الأولوية الأعلى أولًا، ثم آخر تحديث للملف</p></div><Link to="/legal/cases?view=cases">سجل القضايا ←</Link></div>
        {model.attention.length ? <div>{model.attention.slice(0,6).map((item, index) => <button className="lw-case-row" key={item.id} onClick={() => onOpen(item)}><span className="lw-case-index">{String(index + 1).padStart(2, '0')}</span><div className="lw-case-row-copy"><strong>{caseTitle(item)}</strong><p><bdi>{item.case_number}</bdi> · {customerName(item)}</p></div><span className="lw-tag" data-tone={item.priority === 'urgent' ? 'danger' : item.priority === 'high' ? 'warning' : 'muted'}>{item.priority === 'urgent' ? 'عاجلة' : item.priority === 'high' ? 'أولوية عالية' : 'للمتابعة'}</span><ArrowUpLeft size={15} /></button>)}</div> : <div className="lw-empty"><CircleCheck /><strong>لا توجد ملفات حالية في هذه القائمة</strong><p>يمكنك مراجعة جميع الملفات من سجل القضايا.</p></div>}
      </section>
      <section className="lw-panel"><div className="lw-section-heading"><div><h2>على جدول الجلسات</h2><p>المواعيد القادمة المسجلة بالملفات</p></div><Link to="/legal/cases?view=calendar">عرض الجدول ←</Link></div>
        {model.hearings.length ? model.hearings.slice(0,4).map(item => {const date=new Date(item.hearing_date || '');return <button key={item.id} className="lw-hearing w-full text-start" onClick={() => onOpen(item)}><div className="lw-hearing-date"><strong>{date.toLocaleDateString('ar-QA',{day:'numeric'})}</strong><span>{date.toLocaleDateString('ar-QA',{month:'short'})}</span></div><div className="lw-case-row-copy"><strong>{caseTitle(item)}</strong><p>{item.court_name || 'المحكمة غير محددة'}</p><p><bdi>{item.case_number}</bdi></p></div></button>;}) : <div className="lw-empty"><CalendarDays /><strong>لا توجد جلسات قادمة مسجلة</strong><p>تظهر المواعيد هنا بعد إضافتها إلى ملف القضية.</p></div>}
      </section>
    </div>
    <section className="lw-panel"><div className="lw-section-heading"><div><h2>توزيع الملفات حسب النوع</h2><p>من {number(cases.length)} ملفًا محملًا من أصل {number(totalLoadedScope)} ضمن نطاق القائمة الحالية</p></div><span className="lw-tag" data-tone="muted">بيانات السجل</span></div>
      {model.types.length ? <div className="grid gap-x-10 md:grid-cols-2">{model.types.map(([type,count]) => <div key={type} className="lw-distribution-row"><span>{typeLabel(type)}</span><div className="lw-distribution-track"><i style={{width:`${count / Math.max(cases.length,1) * 100}%`}} /></div><b>{number(count)}</b></div>)}</div> : <div className="lw-empty"><Files />لم تُسجل أنواع قضايا بعد.</div>}
    </section>
  </div>;
}
