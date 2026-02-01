/**
 * Quick Stats Component
 * مكون الإحصائيات السريعة
 */

import React from 'react';
import { motion } from 'framer-motion';
import { User, Car, FileText, FileWarning } from 'lucide-react';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { useLawsuitPreparationContext } from '../../store';

export function QuickStats() {
  const { state } = useLawsuitPreparationContext();
  const { customer, vehicle, overdueInvoices, calculations } = state;
  
  if (!calculations) return null;
  
  const customerName = formatCustomerName(customer);
  
  const vehicleInfo = vehicle
    ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : 'غير محدد';
  
  const stats = [
    {
      icon: User,
      label: 'المدعى عليه',
      value: customerName,
      color: 'text-muted-foreground',
    },
    {
      icon: Car,
      label: 'السيارة',
      value: vehicleInfo,
      color: 'text-muted-foreground',
    },
    {
      icon: FileText,
      label: 'الفواتير المتأخرة',
      value: `${overdueInvoices.length} فاتورة`,
      color: 'text-muted-foreground',
    },
    {
      icon: FileWarning,
      label: 'المخالفات',
      value: `${calculations.violationsCount} مخالفة`,
      color: 'text-red-500',
    },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted/70 transition-colors"
        >
          <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="font-medium text-sm truncate" title={stat.value}>
            {stat.value}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default QuickStats;
