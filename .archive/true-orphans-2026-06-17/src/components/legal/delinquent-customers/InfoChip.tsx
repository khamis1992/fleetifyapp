import React from 'react';
import { colors } from './types';

// ===== Info Chip Component =====
export interface InfoChipProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}

export const InfoChip: React.FC<InfoChipProps> = ({ icon: Icon, label, value, color = colors.primary }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: `hsl(${color})` }} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-semibold truncate" style={{ color: `hsl(${color})` }}>
          {value}
        </p>
      </div>
    </div>
  );
};

export default InfoChip;
