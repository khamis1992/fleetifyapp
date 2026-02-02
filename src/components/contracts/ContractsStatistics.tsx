import React from 'react';
import { CheckCircle, Clock, DollarSign, AlertTriangle, Scale, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';
import { Separator } from '@/components/ui/separator';

interface ContractsStatisticsProps {
  activeCount: number;
  draftCount: number;
  underReviewCount: number;
  cancelledCount: number;
  totalRevenue: number;
  // New props for detailed breakdown
  activeWithLegalCount?: number;
  legalTotalCount?: number;
  cancelledWithLegalCount?: number;
}

export const ContractsStatistics: React.FC<ContractsStatisticsProps> = ({
  activeCount,
  draftCount,
  underReviewCount,
  cancelledCount,
  totalRevenue,
  activeWithLegalCount = 0,
  legalTotalCount = 0,
  cancelledWithLegalCount: _cancelledWithLegalCount = 0
}) => {
  void _cancelledWithLegalCount; // Reserved for future use
  const { formatCurrency } = useCurrencyFormatter();
  const formattedRevenue = formatCurrency(totalRevenue);

  // Calculate clean active contracts (without legal issues)
  const cleanActiveCount = Math.max(0, activeCount - activeWithLegalCount);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
      {/* 1. Active Contracts Card - Enhanced */}
      <Card className="w-full relative overflow-hidden border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">العقود النشطة</p>
              <div className="flex items-baseline gap-2">
                <StatCardNumber value={activeCount} className="text-3xl font-bold text-slate-800" />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  قيد التنفيذ
                </span>
              </div>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          
          <Separator className="my-3 bg-emerald-100" />
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                عقود سليمة
              </span>
              <span className="font-semibold text-emerald-700">{cleanActiveCount}</span>
            </div>
            {activeWithLegalCount > 0 && (
              <div className="flex justify-between items-center text-xs bg-amber-50 p-1.5 rounded border border-amber-100">
                <span className="text-amber-700 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  عليها إجراء قانوني
                </span>
                <span className="font-bold text-amber-700">{activeWithLegalCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* 2. Legal Analysis Card - New & Detailed */}
      <Card className="w-full relative overflow-hidden border-rose-100 bg-gradient-to-br from-white to-rose-50/50">
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">القضايا القانونية</p>
              <div className="flex items-baseline gap-2">
                <StatCardNumber value={legalTotalCount} className="text-3xl font-bold text-slate-800" />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  إجمالي القضايا
                </span>
              </div>
            </div>
            <div className="p-2 bg-rose-100 rounded-lg">
              <Scale className="h-5 w-5 text-rose-600" />
            </div>
          </div>

          <Separator className="my-3 bg-rose-100" />

          <div className="space-y-2">
             <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                عقود ملغية/منتهية
              </span>
              <span className="font-semibold text-slate-700">
                {legalTotalCount - activeWithLegalCount}
              </span>
            </div>
             <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                عقود ما زالت نشطة
              </span>
              <span className="font-semibold text-amber-700">
                {activeWithLegalCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Operational Status (Drafts & Review & Cancelled) */}
      <Card className="w-full relative overflow-hidden border-slate-100 bg-gradient-to-br from-white to-slate-50/50">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-400" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">حالة العمليات</p>
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-800">{draftCount}</span>
                    <span className="text-[10px] text-slate-500">مسودة</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200" />
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-800">{underReviewCount}</span>
                    <span className="text-[10px] text-slate-500">مراجعة</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200" />
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold text-slate-800">{cancelledCount}</span>
                    <span className="text-[10px] text-slate-500">ملغي</span>
                 </div>
              </div>
            </div>
             <div className="p-2 bg-slate-100 rounded-lg">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          
           <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded">
             <Clock className="w-3 h-3" />
             <span>اجمالي العقود غير النشطة: {draftCount + underReviewCount + cancelledCount}</span>
           </div>
        </CardContent>
      </Card>

      {/* 4. Revenue Card */}
      <Card className="w-full relative overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/50">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">الإيرادات المتوقعة</p>
              <div className="flex items-baseline gap-2">
                <StatCardNumber value={formattedRevenue} className="text-2xl font-bold text-slate-800" />
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">شهرياً</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <Separator className="my-3 bg-blue-100" />
          
          <div className="text-xs text-slate-500">
            يتم حساب الإيرادات من العقود النشطة ({activeCount}) والعقود قيد المراجعة ({underReviewCount}) فقط.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};