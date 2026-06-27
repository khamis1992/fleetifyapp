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
      "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
      activeTab === id
        ? 'border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#020617]'
        : 'border-transparent text-[#64748B] hover:border-[#E5EAF1] hover:bg-[#F6F8FB] hover:text-[#020617]'
    )}
  >
    <Icon size={18} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default TabButton;
