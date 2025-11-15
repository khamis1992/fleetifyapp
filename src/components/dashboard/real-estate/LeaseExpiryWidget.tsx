import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

interface PropertyContract {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rental_amount: number;
  status: string;
  properties?: { property_name: string };
}

export const LeaseExpiryWidget: React.FC = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { companyId, filter, hasGlobalAccess } = useUnifiedCompanyAccess();
  const navigate = useNavigate();

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['property-contracts-expiry', companyId],
    queryFn: async () => {
      if (!companyId && !hasGlobalAccess) {
        return [];
      }

      let query = supabase
        .from('property_contracts')
        .select(`
          *,
          properties(property_name)
        `);

      if (filter.company_id) {
        query = query.eq('company_id', filter.company_id);
      } else if (companyId && !hasGlobalAccess) {
        query = query.eq('company_id', companyId);
      }

      query = query.eq('status', 'active').order('end_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching contracts:', error);
        return [];
      }

      return data as PropertyContract[];
    },
    enabled: !!(companyId || hasGlobalAccess),
  });

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  const contracts = contractsData || [];
  const currentDate = new Date();

  // Calculate expiry periods
  const expiringThisMonth = contracts.filter(c => {
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = Math.floor((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  const expiringNext3Months = contracts.filter(c => {
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = Math.floor((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 30 && daysUntilExpiry <= 90;
  });

  const expiringNext6Months = contracts.filter(c => {
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = Math.floor((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 90 && daysUntilExpiry <= 180;
  });

  // Calculate renewal rate (mock for now - would need historical data)
  const renewalRate = 85; // Mock 85% renewal rate

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    return Math.floor((end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return 'bg-red-100 text-red-700 border-red-200';
    if (days <= 90) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  // Prepare export data
  const exportData = React.useMemo(() => [
    { المؤشر: 'عقود تنتهي هذا الشهر', القيمة: expiringThisMonth.length },
    { المؤشر: 'عقود تنتهي في 3 أشهر', القيمة: expiringNext3Months.length },
    { المؤشر: 'عقود تنتهي في 6 أشهر', القيمة: expiringNext6Months.length },
    { المؤشر: 'معدل التجديد', القيمة: `${renewalRate}%` },
    ...[...expiringThisMonth, ...expiringNext3Months].slice(0, 10).map(c => ({
      'اسم العقار': c.properties?.property_name || 'غير محدد',
      'تاريخ الانتهاء': format(new Date(c.end_date), 'dd/MM/yyyy'),
      'الأيام المتبقية': getDaysUntilExpiry(c.end_date),
    })),
  ], [expiringThisMonth, expiringNext3Months, expiringNext6Months, renewalRate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                انتهاء عقود الإيجار
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="lease_expiry"
                title="انتهاء عقود الإيجار"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/properties')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض العقود ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Expiry Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 rounded-lg p-3 text-center border-2 border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{expiringThisMonth.length}</div>
              <div className="text-xs text-red-600">هذا الشهر</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center border-2 border-orange-200">
              <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-700">{expiringNext3Months.length}</div>
              <div className="text-xs text-orange-600">3 أشهر القادمة</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center border-2 border-yellow-200">
              <Calendar className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-yellow-700">{expiringNext6Months.length}</div>
              <div className="text-xs text-yellow-600">6 أشهر القادمة</div>
            </div>
          </div>

          {/* Renewal Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">معدل التجديد</span>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                renewalRate >= 80
                  ? 'bg-green-100 text-green-700'
                  : renewalRate >= 60
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {renewalRate >= 80 ? 'ممتاز' : renewalRate >= 60 ? 'جيد' : 'يحتاج تحسين'}
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {renewalRate}%
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${renewalRate}%` }}
              ></div>
            </div>
          </div>

          {/* Expiring Leases List */}
          {[...expiringThisMonth, ...expiringNext3Months].slice(0, 5).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">العقود القريبة من الانتهاء</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...expiringThisMonth, ...expiringNext3Months]
                  .slice(0, 5)
                  .map((contract, index) => {
                    const daysUntil = getDaysUntilExpiry(contract.end_date);
                    const urgencyColor = getUrgencyColor(daysUntil);

                    return (
                      <div
                        key={contract.id}
                        className={`p-3 rounded-lg border ${urgencyColor} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${urgencyColor}`}>
                            {daysUntil} يوم
                          </span>
                          <span className="text-sm font-medium text-gray-800 text-right">
                            {contract.properties?.property_name || 'عقار غير محدد'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: ar })}
                          </span>
                          <span>تاريخ الانتهاء</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {contracts.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">لا توجد عقود نشطة</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/properties')}
              className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
            >
              إرسال إشعار تجديد
            </button>
            <button
              onClick={() => navigate('/properties')}
              className="py-2 px-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-all duration-300 text-sm"
            >
              عرض المنتهية
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
