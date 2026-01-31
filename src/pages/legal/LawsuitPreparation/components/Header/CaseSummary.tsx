/**
 * Case Summary Component
 * مكون ملخص القضية
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLawsuitPreparationContext } from '../../store';

export function CaseSummary() {
  const { state } = useLawsuitPreparationContext();
  const { contract, customer, calculations, ui } = state;
  
  if (!contract || !calculations) return null;
  
  const customerName = customer 
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معروف'
    : 'غير معروف';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0 shadow-lg shadow-teal-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <Gavel className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">تجهيز الدعوى</h1>
                <p className="text-sm text-white/70">
                  {customerName} | العقد: {contract.contract_number}
                </p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">
                {calculations.total.toLocaleString('en-US')} ر.ق
              </div>
              <p className="text-xs text-white/60">إجمالي المطالبة</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>التقدم في تجهيز المستندات</span>
              <span className="font-bold">{ui.progress.ready}/{ui.progress.total} مستند</span>
            </div>
            <Progress value={ui.progress.percentage} className="h-3 bg-white/20" />
            <p className="text-xs text-white/60 text-center">
              {ui.progress.percentage === 100
                ? '✅ جميع المستندات جاهزة!'
                : `${ui.progress.percentage}% مكتمل`}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default CaseSummary;
