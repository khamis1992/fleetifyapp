import React from 'react';
import { CheckCircle2, AlertCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: 'check' | 'alert' | 'info' | 'tip';
}

export const HelpSection: React.FC<HelpSectionProps> = ({ title, children, icon }) => {
  const icons = {
    check: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    alert: <AlertCircle className="h-5 w-5 text-orange-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    tip: <Lightbulb className="h-5 w-5 text-yellow-600" />,
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900 flex items-center justify-end gap-2">
        {icon && icons[icon]}
        {title}
      </h3>
      <div className="text-slate-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
};

interface HelpStepProps {
  number: number;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const HelpStep: React.FC<HelpStepProps> = ({
  number,
  title,
  description,
  children,
}) => {
  return (
    <div className="flex items-start gap-3 text-right">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-900 mb-1">{title}</h4>
        {description && <p className="text-slate-600 text-sm">{description}</p>}
        {children && <div className="text-slate-600 text-sm">{children}</div>}
      </div>
    </div>
  );
};

interface HelpListProps {
  items: string | string[];
  type?: 'bullet' | 'check' | 'number' | 'info';
}

export const HelpList: React.FC<HelpListProps> = ({ items, type = 'bullet' }) => {
  const normalizedItems = Array.isArray(items) ? items : [items];

  return (
    <ul className="space-y-2">
      {normalizedItems.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-right">
          {type === 'check' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : type === 'number' ? (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {index + 1}
            </span>
          ) : type === 'info' ? (
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
          ) : (
            <span className="text-blue-600 font-bold flex-shrink-0">•</span>
          )}
          <span className="text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
};

interface HelpNoteProps {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'tip' | 'alert' | 'note';
}

export const HelpNote: React.FC<HelpNoteProps> = ({ children, type = 'info' }) => {
  const normalizedType = type === 'alert' ? 'warning' : type === 'note' ? 'info' : type;
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-orange-50 border-orange-200 text-orange-900',
    tip: 'bg-green-50 border-green-200 text-green-900',
  };

  const icons = {
    info: <Info className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    tip: <Lightbulb className="h-5 w-5" />,
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border-2 flex items-start gap-3 text-right',
      styles[normalizedType]
    )}>
      <div className="flex-shrink-0">
        {icons[normalizedType]}
      </div>
      <div className="flex-1 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
};

interface HelpCodeProps {
  children: string;
}

export const HelpCode: React.FC<HelpCodeProps> = ({ children }) => {
  return (
    <code className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-sm font-mono">
      {children}
    </code>
  );
};
