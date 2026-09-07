import React, { createContext, useContext, useId } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './employee-workspace.css';

const WorkspacePresentationContext = createContext(false);

/** Presentation follows React portals, so shared workflows retain their normal design elsewhere. */
export function EmployeeWorkspacePresentation({ children }: { children: React.ReactNode }) {
  return <WorkspacePresentationContext.Provider value={true}>{children}</WorkspacePresentationContext.Provider>;
}

export const WorkspaceButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    const enabled = useContext(WorkspacePresentationContext);
    const danger = variant === 'destructive' || /(?:text|bg)-red-/.test(className || '');
    return <Button ref={ref} variant={variant} className={cn(className, enabled && 'ew-button')}
      data-employee-tone={enabled ? danger ? 'danger' : !variant || variant === 'default' || variant === 'success' ? 'primary' : 'secondary' : undefined}
      {...props} />;
  },
);
WorkspaceButton.displayName = 'WorkspaceButton';

export const WorkspaceDialogContent = React.forwardRef<React.ElementRef<typeof DialogContent>, React.ComponentPropsWithoutRef<typeof DialogContent>>(
  ({ className, ...props }, ref) => {
    const enabled = useContext(WorkspacePresentationContext);
    return <DialogContent ref={ref} className={cn(className, enabled && 'ew-dialog')} {...props} />;
  },
);
WorkspaceDialogContent.displayName = 'WorkspaceDialogContent';

export function WorkspaceDialogHeader({ className, children, ...props }: React.ComponentProps<typeof DialogHeader>) {
  const enabled = useContext(WorkspacePresentationContext);
  return <DialogHeader className={cn(className, enabled && 'ew-dialog-heading')} {...props}>
    {enabled && <span className="ew-dialog-eyebrow">مساحة الموظف <span aria-hidden="true">/</span> إجراءات العمل</span>}
    {children}
  </DialogHeader>;
}

export function WorkspaceDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter>) {
  const enabled = useContext(WorkspacePresentationContext);
  return <DialogFooter className={cn(className, enabled && 'ew-dialog-footer')} {...props} />;
}

export function WorkspaceFormSection({ title, description, number, children }: {
  title: string; description?: string; number: string; children: React.ReactNode;
}) {
  const id = useId();
  return <section className="ew-form-section" aria-labelledby={id}>
    <header><span className="ew-section-number" aria-hidden="true">{number}</span><div>
      <h3 id={id}>{title}</h3>{description && <p>{description}</p>}
    </div></header>
    <div className="ew-form-fields">{children}</div>
  </section>;
}

export function WorkspaceViewHeading({ title, description, children }: {
  title: string; description: string; children?: React.ReactNode;
}) {
  return <header className="ew-view-heading"><div><p>مساحة عملي</p><h2>{title}</h2><span>{description}</span></div>{children}</header>;
}

export function WorkspaceSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  const enabled = useContext(WorkspacePresentationContext);
  if (!enabled) return null;
  return <ol className="ew-step-track" aria-label="مراحل الإجراء">{steps.map((label, index) =>
    <li key={label} aria-current={index === current ? 'step' : undefined} data-complete={index < current}>
      <span aria-hidden="true">{index + 1}</span><strong>{label}</strong>
    </li>,
  )}</ol>;
}
