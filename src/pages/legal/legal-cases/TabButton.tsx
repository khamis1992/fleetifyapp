import React from 'react';


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
    type="button"
    aria-current={activeTab === id ? 'page' : undefined}
    className="lw-tab"
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

export default TabButton;
