import type { ReactNode } from 'react';
import './contract-sections.css';

/** Shared visual language for the contract's operational sections. */
export function ContractSectionHeading({ title, description, number, children }: {
  title: string; description: string; number: string; children?: ReactNode;
}) {
  return <header className="contract-section-heading">
    <div className="contract-section-heading-copy">
      <span className="contract-section-number" aria-hidden="true">{number}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
    {children && <div className="contract-section-actions">{children}</div>}
  </header>;
}

export function ContractMetricStrip({ items }: { items: Array<{ title: string; value: ReactNode; subtext?: string }> }) {
  return <dl className="contract-metric-strip">
    {items.map((item) => <div key={item.title}>
      <dt>{item.title}</dt><dd>{item.value}</dd>
      {item.subtext && <p>{item.subtext}</p>}
    </div>)}
  </dl>;
}
