import React, { type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import "@/components/finance/workspace/finance-system.css";
export interface BreadcrumbItemData {
  label: string;
  href?: string;
}
export interface FinancePageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItemData[];
  actions?: ReactNode;
  icon?: React.ElementType;
  gradient?: string;
  className?: string;
  children?: ReactNode;
}
export function FinancePageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  icon: Icon,
  className,
  children,
}: FinancePageHeaderProps) {
  return (
    <header className={cn("finance-page-header", className)}>
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="مسار الصفحة"
          className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronLeft size={12} aria-hidden="true" />}
              {crumb.href ? (
                <Link to={crumb.href}>{crumb.label}</Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="finance-page-header-main">
        <div className="finance-page-header-title">
          {Icon && (
            <span className="finance-page-header-icon">
              <Icon size={22} aria-hidden="true" />
            </span>
          )}
          <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
        </div>
        {actions && (
          <div className="finance-page-header-actions">{actions}</div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}
export default FinancePageHeader;
