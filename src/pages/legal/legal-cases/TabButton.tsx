import React from 'react';
import { cn } from '@/lib/utils';

export interface TabButtonProps {
  id: string;
  label: string;
  icon: React.ElementType;
  activeTab: string;
  onClick: (id: string) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2",
      activeTab === id
        ? 'border-teal-500 text-teal-600 bg-teal-50/50'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    )}
  >
    <Icon size={18} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default TabButton;
