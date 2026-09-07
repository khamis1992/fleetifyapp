import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpLeft, Car, Check, ChevronLeft, CreditCard, FileText, FolderOpen, LayoutDashboard, Mail, MessageSquare, Pencil, Phone, Plus, Search, ShieldAlert, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerHeroProps } from '../customer-details-v3/CustomerHero';
import type { CustomerSection } from './navigation';
import './customer-workspace.css';

const sectionDetails = {
  overview: { label: 'نظرة عامة', description: 'ملخص العلاقة، آخر العمليات والخطوات التي تحتاج انتباهك.', icon: LayoutDashboard },
  info: { label: 'بيانات العميل', description: 'الهوية والمعلومات الشخصية ووسائل التواصل في مكان واحد.', icon: UserRound },
  contracts: { label: 'العقود', description: 'جميع عقود العميل وحالاتها، مع وصول مباشر إلى تفاصيل كل عقد.', icon: FileText },
  vehicles: { label: 'المركبات', description: 'المركبات المرتبطة بعقود العميل النشطة.', icon: Car },
  invoices: { label: 'الفواتير', description: 'آخر 100 فاتورة وأرصدة السداد؛ افتح أي فاتورة للاطلاع على تفاصيلها.', icon: CreditCard },
  payments: { label: 'الدفعات', description: 'آخر 10 عمليات سداد مسجلة للعميل وطرق الدفع وحالاتها.', icon: CreditCard },
  violations: { label: 'المخالفات', description: 'المخالفات المرتبطة بعقود العميل ومتابعة حالات السداد.', icon: ShieldAlert },
  documents: { label: 'المستندات', description: 'مكتبة وثائق العميل؛ معاينة الملفات وتنزيلها وإضافة مستند جديد.', icon: FolderOpen },
  activity: { label: 'النشاط والمتابعة', description: 'سجّل التواصل، راجع الملاحظات وتابع تسلسل العمليات.', icon: MessageSquare },
};

interface WorkspaceProps extends CustomerHeroProps {
  section: CustomerSection;
  onSectionChange: (section: CustomerSection) => void;
  onCreateContract: () => void;
  onAddPayment: () => void;
  counts: Partial<Record<CustomerSection, number>>;
  loadingSummary: boolean;
  children: ReactNode;
  actions: ReactNode;
}

export function CustomerWorkspace({ customer, customerName, initials, snapshot, completion, onBack, onEdit,
  onCall, onWhatsApp, formatCurrency, section, onSectionChange, onCreateContract, onAddPayment,
  counts, loadingSummary, children, actions }: WorkspaceProps) {
  const metrics = [
    { label: 'الرصيد المستحق', value: formatCurrency(snapshot.outstandingTotal), hint: `${snapshot.openInvoicesCount} فاتورة مفتوحة`, target: 'invoices', tone: 'accent' },
    { label: 'المتأخر حتى اليوم', value: formatCurrency(snapshot.dueNowTotal), hint: 'من الرصيد المستحق', target: 'invoices', tone: snapshot.dueNowTotal > 0 ? 'danger' : '' },
    { label: 'المسدد على الفواتير', value: formatCurrency(snapshot.paidTotal), hint: 'حسب مبالغ السداد المسجلة', target: 'payments', tone: '' },
    { label: 'العقود النشطة', value: String(snapshot.activeContracts), hint: `من أصل ${snapshot.totalContracts} عقد`, target: 'contracts', tone: '' },
  ] as const;
  return (
    <div className="customer-workspace" dir="rtl">
      <div className="cw-container">
        <nav className="cw-breadcrumb" aria-label="مسار ملف العميل">
          <button onClick={onBack}><ArrowRight size={15} />العملاء</button><ChevronLeft size={13} /><span>ملف العميل</span>
        </nav>
        <header className="cw-identity">
          <div className="cw-avatar" aria-hidden="true">{initials}</div>
          <div className="cw-identity-copy">
            <div className="cw-eyebrow">إدارة العلاقات <span>/</span> {customer.customer_type === 'company' ? 'عميل شركة' : customer.customer_type === 'government' ? 'جهة حكومية' : 'عميل فرد'}</div>
            <div className="cw-name-line"><h1>{customerName}</h1><span className={`cw-status ${customer.is_active === false ? 'cw-status-paused' : ''}`}><i />{customer.is_active === false ? 'غير نشط' : 'نشط'}</span></div>
            <div className="cw-contact-line">
              <span><UserRound size={14} />الهوية <bdi>{customer.national_id || 'غير مسجلة'}</bdi></span>
              {customer.phone && <button onClick={onCall}><Phone size={14}/><bdi>{customer.phone}</bdi></button>}
              {customer.email && <a href={`mailto:${customer.email}`}><Mail size={14}/><bdi>{customer.email}</bdi></a>}
            </div>
          </div>
          <div className="cw-identity-actions">
            <Button variant="outline" onClick={onEdit}><Pencil size={15}/>تعديل البيانات</Button>
            {customer.phone && <Button variant="outline" onClick={onWhatsApp} aria-label="التواصل عبر واتساب"><MessageSquare size={17}/></Button>}
            <Button className="cw-primary" onClick={onCreateContract}><Plus size={17}/>عقد جديد</Button>
          </div>
        </header>

        <div className="cw-metrics" aria-label="ملخص حساب العميل" aria-busy={loadingSummary}>
          {metrics.map(metric => <button key={metric.label} onClick={() => onSectionChange(metric.target)} className={`cw-metric ${metric.tone}`}>
            <span className="cw-metric-label">{metric.label}<ArrowUpLeft size={15}/></span>
            <strong>{loadingSummary ? '—' : metric.value}</strong>
            <small>{loadingSummary ? 'جاري تحميل الملخص…' : metric.hint}</small>
          </button>)}
        </div>

        <div className="cw-layout">
          <aside className="cw-sidebar">
            <div className="cw-nav-title">محتويات الملف <span>09</span></div>
            <nav className="cw-nav" aria-label="أقسام ملف العميل">
              {(Object.entries(sectionDetails) as [CustomerSection, typeof sectionDetails.overview][]).map(([key, item]) => <button
                key={key} aria-current={section === key ? 'page' : undefined} onClick={() => onSectionChange(key)}
                className={section === key ? 'is-active' : ''}>
                <item.icon size={18}/><span>{item.label}</span>{counts[key] !== undefined && <small>{counts[key]}</small>}
              </button>)}
            </nav>
            <div className="cw-completion">
              <div><span>اكتمال الملف</span><strong>{completion.percent}%</strong></div>
              <progress value={completion.percent} max={100} aria-label="نسبة اكتمال ملف العميل"/>
              <p>{completion.missing.length ? `${completion.missing.length} عناصر تحتاج إلى استكمال` : 'جميع البيانات الأساسية مكتملة'}</p>
              <button onClick={() => onSectionChange('info')}>{completion.missing.length ? 'مراجعة بيانات الملف' : 'عرض بيانات الملف'}<ChevronLeft size={14}/></button>
            </div>
            <Button className="cw-collect" variant="outline" onClick={onAddPayment}><Plus size={16}/>تسجيل دفعة</Button>
          </aside>
          <div className="cw-content">
            <div className="cw-section-heading">
              <div><div className="cw-eyebrow">ملف العميل <span>/</span> {String(Object.keys(sectionDetails).indexOf(section) + 1).padStart(2, '0')}</div>
                <h2 id="customer-section-title">{sectionDetails[section].label}</h2><p>{sectionDetails[section].description}</p></div>
              <span className="cw-section-symbol" aria-hidden="true">{(() => { const Icon = sectionDetails[section].icon; return <Icon size={25}/>; })()}</span>
            </div>
            <section key={section} aria-labelledby="customer-section-title" className="cw-section-body">{children}</section>
          </div>
        </div>
        <div className="cw-operations">{actions}</div>
        <footer className="cw-footer"><span>العراف لتأجير السيارات</span><span>ملف عميل موحّد · Fleetify</span><Check size={14}/></footer>
      </div>
    </div>
  );
}

export function CustomerSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="cw-search"><Search size={18}/><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}/>{value && <button aria-label="مسح البحث" onClick={() => onChange('')}><X size={16}/></button>}</div>;
}

export function CustomerPanel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="cw-panel"><header><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action}</header><div className="cw-panel-body">{children}</div></section>;
}
