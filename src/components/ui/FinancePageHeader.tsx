import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { animations } from '@/lib/design-tokens';

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

const defaultGradient = 'from-rose-500 to-orange-500';

export const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({
  title,
  description,
  breadcrumbs = [],
  actions,
  icon: Icon,
  gradient = defaultGradient,
  className,
  children,
}) => {
  return (
    <motion.div
      className={cn(
        'rounded-2xl p-6 mb-6 text-white shadow-lg',
        `bg-gradient-to-r ${gradient}`,
        className
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animations.durationMs.normal / 1000 }}
      dir="rtl"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <Breadcrumb className="mb-1">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/finance" className="text-white/70 hover:text-white transition-colors">
                        <Home className="w-4 h-4" />
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      <BreadcrumbSeparator>
                        <ChevronLeft className="w-3 h-3 text-white/50" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        {crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.href} className="text-white/70 hover:text-white transition-colors">
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-white">
                            {crumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && (
              <p className="text-white/80 text-sm mt-1">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex gap-2">{actions}</div>
        )}
      </div>

      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </motion.div>
  );
};

export default FinancePageHeader;