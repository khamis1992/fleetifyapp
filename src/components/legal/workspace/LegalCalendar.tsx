import { useState } from 'react';
import { CalendarDays, ArrowUpLeft, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export interface LegalHearing {
  id: string; date: string; displayDate: string; time: string; caseId: string;
  title: string; location: string; daysUntil: number;
}

export function LegalCalendar({ hearings, onOpen, loading, error, onRetry, loadedCount, totalCount }: {
  hearings: LegalHearing[]; onOpen: (id: string) => void; loading: boolean; error: boolean;
  onRetry: () => void; loadedCount: number; totalCount: number;
}) {
  const [period, setPeriod] = useState<'upcoming' | 'recent'>('upcoming');
  const upcoming = hearings.filter(item => item.daysUntil >= 0);
  const recent = hearings.filter(item => item.daysUntil < 0).slice().reverse();
  const visible = period === 'upcoming' ? upcoming : recent;
  const next = upcoming[0];

  if (loading) return <div className="lw-panel animate-pulse h-60" role="status">جارٍ تحميل مواعيد الجلسات…</div>;
  if (error) return <div className="lw-panel" role="alert"><p>تعذّر تحميل مواعيد الجلسات.</p><Button variant="outline" onClick={onRetry}>إعادة المحاولة</Button></div>;

  return <div className="lw-calendar-grid">
    <section className="lw-panel">
      <div className="lw-section-heading"><div><h2>جدول الجلسات</h2><p>المواعيد المسجلة في ملفات القضايا · {loadedCount.toLocaleString('ar-QA')} من {totalCount.toLocaleString('ar-QA')} ملفًا ضمن نطاق القائمة</p></div><CalendarDays size={23} /></div>
      <div className="lw-period-switch" role="group" aria-label="نطاق الجلسات">
        <button type="button" aria-pressed={period === 'upcoming'} onClick={() => setPeriod('upcoming')}>القادمة <span>{upcoming.length}</span></button>
        <button type="button" aria-pressed={period === 'recent'} onClick={() => setPeriod('recent')}>الأسبوع الماضي <span>{recent.length}</span></button>
      </div>
      {visible.length ? <div className="lw-agenda">{visible.map(event => <article key={event.id}>
        <div className="lw-agenda-date"><strong>{Number(event.date.split('-')[2]).toLocaleString('ar-QA')}</strong><span>{new Date(event.date).toLocaleDateString('ar-QA', { month: 'short' })}</span></div>
        <div className="lw-agenda-copy"><span className="lw-tag" data-tone={event.daysUntil <= 1 ? 'warning' : 'muted'}>{event.daysUntil < 0 ? 'موعد سابق' : event.daysUntil === 0 ? 'اليوم' : event.daysUntil === 1 ? 'غدًا' : `بعد ${event.daysUntil} يوم`}</span><h3>{event.title}</h3><p><bdi>{event.caseId}</bdi> · {event.displayDate}</p><div><span><MapPin size={13} />{event.location}</span><span><Clock size={13} />{event.time}</span></div></div>
        <Button variant="outline" onClick={() => onOpen(event.id)} aria-label={`فتح القضية ${event.caseId}`}>فتح الملف <ArrowUpLeft size={15} /></Button>
      </article>)}</div> : <div className="lw-empty"><CalendarDays /><strong>{period === 'upcoming' ? 'لا توجد جلسات قادمة مسجلة' : 'لا توجد جلسات مسجلة في الأسبوع الماضي'}</strong><p>أضف موعد الجلسة من تعديل بيانات القضية ليظهر في هذا الجدول.</p><Button asChild variant="outline"><Link to="/legal/cases?view=cases">الانتقال إلى سجل القضايا</Link></Button></div>}
    </section>
    <aside className="space-y-5">
      <section className="lw-next-hearing"><span className="lw-eyebrow"><Clock size={15} />الموعد الأقرب</span>{next ? <><h2>{next.displayDate}</h2><p>{next.time}</p><h3>{next.title}</h3><p>{next.location}</p><Button onClick={() => onOpen(next.id)} variant="secondary">مراجعة ملف الجلسة <ArrowUpLeft size={15} /></Button></> : <><h2>جدولك خالٍ حاليًا</h2><p>تظهر الجلسة الأقرب هنا عند تسجيل موعد قادم.</p></>}</section>
      <section className="lw-panel"><h2 className="font-bold mb-3">متابعة ما قبل الجلسة</h2><ol className="lw-checklist"><li>مراجعة موعد الجلسة والمحكمة.</li><li>استكمال الأدلة والمستندات في الملف.</li><li>تسجيل مهمة المتابعة للمسؤول.</li></ol><Button asChild variant="outline" className="w-full mt-5"><Link to="/tasks">إدارة المهام <ArrowUpLeft size={15} /></Link></Button></section>
    </aside>
  </div>;
}
