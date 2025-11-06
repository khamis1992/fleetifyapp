import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { useFinancialOverview } from '@/hooks/useFinancialOverview';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const ForecastingSection: React.FC = () => {
  const { data: financialData } = useFinancialOverview('car_rental');
  const { formatCurrency } = useCurrencyFormatter();

  const currentRevenue = financialData?.totalRevenue || 0;
  const growthRate = financialData?.growthRate || 18; // معدل النمو من البيانات أو افتراضي 18%
  const forecastedRevenue = currentRevenue * (1 + growthRate / 100);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {/* Revenue Forecast */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">توقعات الإيرادات</h3>
          <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
            <Brain className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">الشهر الحالي</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(currentRevenue)}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" 
                style={{ width: '78%' }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">توقع الشهر القادم</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(forecastedRevenue)}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse" 
                style={{ width: '92%' }}
              ></div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl">
            <p className="text-sm font-semibold text-gray-900 mb-3">العوامل المؤثرة:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <ArrowUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-700">موسم الذروة (+18%)</span>
              </div>
              <div className="flex items-center gap-3">
                <ArrowUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-700">عقود جديدة متوقعة (+12%)</span>
              </div>
              <div className="flex items-center gap-3">
                <ArrowDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-700">صيانات مجدولة (-8%)</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                +{growthRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600">نمو متوقع</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {Math.min(85 + Math.floor(currentRevenue / 10000), 95)}%
              </p>
              <p className="text-xs text-gray-600">دقة التوقع</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Smart Booking Calendar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">تقويم الحجوزات</h3>
          <button className="text-sm font-semibold text-red-600 hover:text-red-700">
            عرض الشهر كاملاً
          </button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
            <div key={day} className="text-xs font-semibold text-gray-500 py-2">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {/* Sample calendar days */}
          <div className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-sm font-semibold">15</span>
            <span className="text-xs text-green-600">85%</span>
          </div>
          <div className="aspect-square rounded-lg bg-red-50 flex flex-col items-center justify-center cursor-pointer hover:bg-red-100 transition-colors">
            <span className="text-sm font-semibold">16</span>
            <span className="text-xs text-red-600">محجوز</span>
          </div>
          <div className="aspect-square rounded-lg bg-orange-50 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors">
            <span className="text-sm font-semibold">17</span>
            <span className="text-xs text-orange-600">65%</span>
          </div>
          <div className="aspect-square rounded-lg bg-blue-100 border-2 border-blue-500 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-blue-600">18</span>
            <span className="text-xs text-blue-600">اليوم</span>
          </div>
          <div className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-sm font-semibold">19</span>
            <span className="text-xs text-green-600">90%</span>
          </div>
          <div className="aspect-square rounded-lg bg-yellow-50 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-100 transition-colors">
            <span className="text-sm font-semibold">20</span>
            <span className="text-xs text-yellow-600">45%</span>
          </div>
          <div className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
            <span className="text-sm font-semibold">21</span>
            <span className="text-xs text-green-600">75%</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">ملخص الأسبوع</span>
            <span className="text-xs text-gray-500">15-21 نوفمبر</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">68%</p>
              <p className="text-xs text-gray-600">متوسط الإشغال</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">24</p>
              <p className="text-xs text-gray-600">حجوزات جديدة</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

