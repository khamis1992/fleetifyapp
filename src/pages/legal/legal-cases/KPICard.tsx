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
  color,
  textColor,
  progressColor,
  barValue,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md", color)}>
        <Icon size={22} className={textColor} />
      </div>
      {change && (
        <span className={cn(
          "text-xs font-bold px-2.5 py-1 rounded-full",
          isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        )}>
          {change}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-slate-500 text-xs font-medium mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-bold text-slate-900">{value}</h2>
      </div>
      <p className="text-xs text-slate-400 mt-1">{subValue}</p>
    </div>
    <div className="w-full bg-slate-50 rounded-full h-1.5 mt-4 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", progressColor)}
        style={{ width: `${barValue}%` }}
      />
    </div>
  </motion.div>
);

export default KPICard;
