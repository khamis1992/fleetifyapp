import type { ElementType, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Shared building blocks for pages built on the dashboard workspace design
 * language (dw-*). Presentation only — data fetching stays in the pages.
 */

export function PagePanel({
  number,
  title,
  subtitle,
  action,
  className = '',
  id,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`dw-panel ${className}`}>
      <header className="dw-panel-heading">
        <div className="dw-panel-title">
          <span className="dw-section-number">{number}</span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PageLoading({ label = 'جاري تحميل البيانات…' }: { label?: string }) {
  return (
    <div className="dw-state" role="status">
      <RefreshCw className="animate-spin" size={20} />
      <p>{label}</p>
    </div>
  );
}

export function PageEmpty({
  icon: Icon,
  message,
  children,
}: {
  icon: ElementType;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="dw-state">
      <Icon size={28} />
      <p>{message}</p>
      {children}
    </div>
  );
}
