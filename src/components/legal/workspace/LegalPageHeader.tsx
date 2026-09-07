import type { ReactNode, ElementType } from 'react';
import { Scale } from 'lucide-react';

export function LegalPageHeader({ title, description, eyebrow = 'مساحة العمل القانونية', icon: Icon = Scale, actions, aside, featured = false }: {
  title: string; description?: ReactNode; eyebrow?: string; icon?: ElementType;
  actions?: ReactNode; aside?: ReactNode; featured?: boolean;
}) {
  return <header className={`lw-page-header${featured ? ' lw-page-header-featured' : ''}`}>
    <div className="lw-header-copy"><span className="lw-eyebrow"><Icon size={16} />{eyebrow}</span><h1>{title}</h1>{description && <div className="lw-header-description">{description}</div>}{actions && <div className="lw-header-actions">{actions}</div>}</div>
    {aside ? <div className="lw-header-aside">{aside}</div> : <div className="lw-header-emblem" aria-hidden="true"><Icon /></div>}
  </header>;
}
