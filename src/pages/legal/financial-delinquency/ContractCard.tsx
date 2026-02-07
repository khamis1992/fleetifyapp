import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Gavel } from 'lucide-react';
import { type OverdueContract } from '@/services/LawsuitService';
import { formatCurrency } from '@/lib/utils';
import { colors } from './types';

/**
 * بطاقة عقد متأخر
 */
export interface ContractCardProps {
  contract: OverdueContract;
  index: number;
  onViewLawsuit: () => void;
}

export const ContractCard = React.forwardRef<HTMLDivElement, ContractCardProps>(({ contract, index, onViewLawsuit }, ref) => {
  const isCritical = (contract.days_overdue || 0) > 90;
  const isHigh = (contract.days_overdue || 0) > 60;
  const color = isCritical ? colors.destructive : isHigh ? colors.accentForeground : colors.primary;
  
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-2xl border-2 bg-card p-5 transition-all duration-300 hover:shadow-lg"
      style={{ borderColor: `hsl(${color} / 0.3)` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `hsl(${color} / 0.1)` }}
          >
            <Users className="h-6 w-6" style={{ color: `hsl(${color})` }} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{contract.customer_name}</h3>
            <p className="text-xs text-muted-foreground">{contract.customer_id_number}</p>
          </div>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: `hsl(${color})` }}
        >
          {contract.days_overdue}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">رقم العقد:</span>
          <span className="font-semibold">{contract.contract_number}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">السيارة:</span>
          <span className="font-semibold">{contract.vehicle_info}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">المبلغ المتأخر:</span>
          <span className="font-bold" style={{ color: `hsl(${color})` }}>
            {formatCurrency(contract.total_overdue || 0)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {contract.has_lawsuit ? (
          <Badge className="bg-violet-500 text-white gap-1">
            <Gavel className="w-3 h-3" />
            قضية قائمة
          </Badge>
        ) : (
          <Badge variant="secondary">متأخر</Badge>
        )}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button
          size="sm"
          className="w-full gap-2"
          variant={contract.has_lawsuit ? "outline" : "default"}
          onClick={onViewLawsuit}
          style={!contract.has_lawsuit ? {
            background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
          } : {}}
        >
          <Gavel className="w-4 h-4" />
          {contract.has_lawsuit ? 'عرض القضية' : 'تجهيز الدعوى'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>مستوى التأخير</span>
          <span>{contract.days_overdue} يوم</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((contract.days_overdue || 0) / 1.5, 100)}%` }}
            transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        </div>
      </div>
    </motion.div>
  );
});

ContractCard.displayName = 'ContractCard';
