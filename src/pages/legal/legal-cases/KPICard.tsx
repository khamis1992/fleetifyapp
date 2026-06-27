import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  title: string;
  value: string | number;
  subValue: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  color: string;
  textColor: string;
  progressColor: string;
  barValue: number;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  change,
  isPositive = true,
  icon: Icon,
  barValue,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="legal-panel p-5 transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#38BDF8]/10 text-[#38BDF8]">
        <Icon size={22} />
      </div>
      {change && (
        <span className={cn(
          "rounded-lg px-2.5 py-1 text-xs font-bold",
          isPositive ? 'bg-[#22C7A1]/10 text-[#22C7A1]' : 'bg-[#FB6B7A]/10 text-[#FB6B7A]'
        )}>
          {change}
        </span>
      )}
    </div>
    <div>
      <h3 className="mb-1 text-xs font-medium text-[#94A3B8]">{title}</h3>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-bold text-[#020617]">{value}</h2>
      </div>
      <p className="mt-1 text-xs text-[#94A3B8]">{subValue}</p>
    </div>
    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-lg bg-[#E5EAF1]">
      <div
        className="h-full rounded-lg bg-[#38BDF8] transition-all"
        style={{ width: `${barValue}%` }}
      />
    </div>
  </motion.div>
);

export default KPICard;
