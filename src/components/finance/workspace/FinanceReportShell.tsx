import type { ElementType, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { allFinanceDestinations } from './financeNavigation';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import './finance-report-shell.css';

/**
 * Shared chrome for finance report pages, built on the dashboard workspace
 * language (dw-*). Only presentation: report bodies render unchanged inside.
 */
export function FinanceReportShell({
  title,
  description,
  icon: Icon,
  actions,
  backLabel = 'مكتبة التقارير',
  backHref = '/finance/reports',
  children,
}: {
  title: string;
  description?: string;
  icon?: ElementType;
  actions?: ReactNode;
  backLabel?: string;
  backHref?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const chips = [
    ...allFinanceDestinations
      .filter(item => item.href.startsWith('/finance/reports/'))
      .map(item => ({ href: item.href, label: item.ar })),
    { href: '/finance/consolidation', label: 'التوحيد المالي' },
  ];
  const dateLabel = new Date().toLocaleDateString('ar-QA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="fin-reports-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> التقارير والتحليل <span>/</span> {title}
            </div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          <div className="dw-header-tools">
            {actions}
            <Link to={backHref} className="dw-button">
              {backLabel}
            </Link>
          </div>
        </header>
        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarDays size={17} />
            <span>{dateLabel}</span>
          </div>
          <nav className="fin-report-chips" aria-label="التنقل بين التقارير المالية">
            {Icon && <Icon size={15} style={{ color: '#81986e' }} aria-hidden />}
            {chips.map(chip => (
              <Link
                key={chip.href}
                to={chip.href}
                className="fin-report-chip"
                aria-current={pathname === chip.href ? 'page' : undefined}
              >
                {chip.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="fin-reports-shell-body">{children}</div>
        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> التقارير المالية
          </span>
          <span>القوائم محسوبة من القيود المرحلة حتى تاريخ كل تقرير</span>
        </footer>
      </div>
    </div>
  );
}
