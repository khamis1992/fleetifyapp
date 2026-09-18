import { useEffect, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, BarChart3, Briefcase, Car, Check, ClipboardCheck, Home, MessageSquare, Settings, Shield, Truck, Users, Wrench } from 'lucide-react';
import './operations-workspace.css';
import './administration-workspace.css';

type Section = 'maintenance' | 'customers' | 'crm' | 'permissions' | 'hrReports' | 'closeouts' | 'dispatch' | 'employee';
const sections = {
  maintenance: { label: 'إدارة الأسطول', title: 'صيانة الأسطول', description: 'تابع الطلبات، وأعد المركبات إلى الطريق بثقة.', icon: Wrench },
  customers: { label: 'إدارة العملاء', title: 'دليل العملاء', description: 'كل علاقة تبدأ بملف واضح. ابحث، راجع البيانات، وابدأ الخطوة التالية.', icon: Users },
  crm: { label: 'إدارة العملاء', title: 'علاقات العملاء', description: 'رتّب أولويات التواصل، وسجّل المتابعة، وابقَ قريبًا من عملائك.', icon: MessageSquare },
  permissions: { label: 'إدارة النظام', title: 'المستخدمون والصلاحيات', description: 'حدّد مسؤولية كل مستخدم، وراجع ما يمكنه الوصول إليه من مكان واحد.', icon: Shield },
  hrReports: { label: 'الموارد البشرية', title: 'تقارير الفريق', description: 'افهم أداء الفريق، وراجع الحضور والرواتب من مكان واحد.', icon: BarChart3 },
  closeouts: { label: 'الموارد البشرية', title: 'إقفالات العمل اليومية', description: 'راجع حصيلة اليوم، واكتمال التوثيق، وما يحتاج إلى متابعة.', icon: ClipboardCheck },
  dispatch: { label: 'إدارة الأسطول', title: 'تصاريح حركة المركبات', description: 'تابع كل حركة من الطلب والموافقة إلى عودة المركبة.', icon: Truck },
  employee: { label: 'مساحة الموظف', title: 'مساحة عملي', description: 'ابدأ بأولوياتك، وثّق متابعاتك، وأقفل يومك بصورة واضحة.', icon: Briefcase },
};
const sectionClasses: Record<Section, string> = { maintenance: 'opw-maintenance', customers: 'opw-customers', crm: 'opw-crm', permissions: 'opw-administration opw-permissions', hrReports: 'opw-administration opw-hr-reports', closeouts: 'opw-administration opw-closeouts', dispatch: 'opw-administration opw-dispatch', employee: 'opw-administration opw-employee' };

export function OperationsWorkspace({ section, actions, children }: { section: Section; actions?: ReactNode; children: ReactNode }) {
  const details = sections[section];
  useEffect(() => {
    document.body.setAttribute('data-operations-active', section === 'maintenance' ? 'maintenance' : section === 'crm' ? 'customers' : section);
    if (!['maintenance', 'customers', 'crm'].includes(section)) document.body.setAttribute('data-administration-active', section);
    return () => { document.body.removeAttribute('data-operations-active'); document.body.removeAttribute('data-administration-active'); };
  }, [section]);
  const links = section === 'permissions'
    ? [{ to: '/settings/permissions', label: 'الأدوار والصلاحيات', icon: Shield, active: true }, { to: '/settings', label: 'الإعدادات', icon: Settings, active: false }]
    : ['hrReports', 'closeouts'].includes(section)
    ? [{ to: '/hr/reports', label: 'تقارير الفريق', icon: BarChart3, active: section === 'hrReports' }, { to: '/hr/daily-closeouts', label: 'الإقفالات اليومية', icon: ClipboardCheck, active: section === 'closeouts' }]
    : section === 'employee'
    ? [{ to: '/employee-workspace', label: 'مساحة عملي', icon: Briefcase, active: true }, { to: '/dashboard', label: 'الرئيسية', icon: Home, active: false }]
    : section === 'dispatch'
    ? [{ to: '/fleet/dispatch-permits', label: 'تصاريح الحركة', icon: Truck, active: true }, { to: '/fleet', label: 'مركبات الأسطول', icon: Car, active: false }]
    : section === 'maintenance'
    ? [{ to: '/fleet/maintenance', label: 'مركز الصيانة', icon: Wrench, active: true }, { to: '/fleet', label: 'مركبات الأسطول', icon: Car, active: false }]
    : [{ to: '/customers', label: 'دليل العملاء', icon: Users, active: section === 'customers' }, { to: '/customers/crm', label: 'علاقات العملاء', icon: MessageSquare, active: section === 'crm' }];
  return <div className={`operations-workspace ${sectionClasses[section]}`} dir="rtl">
    <div className="opw-masthead"><span>{details.label}<small>العراف لتأجير السيارات</small></span><nav aria-label={`تنقل ${details.label}`}>{links.map(item => <Link key={item.to} to={item.to} aria-current={item.active ? 'page' : undefined}><item.icon size={16} />{item.label}</Link>)}</nav></div>
    <header className="opw-hero">
      <div className="opw-hero-copy"><span className="opw-eyebrow"><details.icon size={15} />مساحة العمل / {details.label}</span><h1>{details.title}</h1><p>{details.description}</p>{actions && <div className="opw-hero-actions">{actions}</div>}</div>
      <div className="opw-hero-symbol" aria-hidden="true"><details.icon strokeWidth={1} /><span>{['maintenance', 'dispatch'].includes(section) ? 'جاهزية • حركة • تشغيل' : section === 'permissions' ? 'أدوار • وصول • مسؤولية' : ['hrReports', 'closeouts', 'employee'].includes(section) ? 'فريق • إنجاز • متابعة' : 'بيانات • تواصل • متابعة'}</span></div>
    </header>
    <div className="opw-content">{children}</div>
  </div>;
}

export function OperationsMetric({ label, value, hint, icon: Icon, onClick, tone = 'default' }: {
  label: string; value: ReactNode; hint: string; icon: ElementType; onClick?: () => void; tone?: 'default' | 'warning' | 'danger';
}) {
  const content = <><span className="opw-metric-label">{label}<Icon size={18} /></span><strong>{value}</strong><small>{hint}</small>{onClick && <ArrowUpLeft className="opw-metric-arrow" size={15} />}</>;
  return onClick ? <button className="opw-metric" data-tone={tone} onClick={onClick}>{content}</button> : <article className="opw-metric" data-tone={tone}>{content}</article>;
}

export function OperationsPanel({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`opw-panel ${className}`}><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header><div className="opw-panel-content">{children}</div></section>;
}

export function OperationsEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="opw-empty"><Check size={28} /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
