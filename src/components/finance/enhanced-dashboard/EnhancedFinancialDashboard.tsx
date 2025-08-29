import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialDashboard } from '../FinancialDashboard';
import { SmartPaymentAllocation } from '../smart-allocation/SmartPaymentAllocation';
import { FinancialTrendsReport } from '../advanced-reports/FinancialTrendsReport';
import { AdvancedFinancialAlerts } from '../advanced-reports/AdvancedFinancialAlerts';
import { PaymentAllocation } from '@/types/financial-obligations';

interface EnhancedFinancialDashboardProps {
  companyId: string;
}

// Mock data for demonstration
const mockTrends = [
  {
    period: 'يناير 2024',
    total_revenue: 45000,
    total_collections: 42000,
    overdue_amount: 3000,
    collection_rate: 93.3
  },
  {
    period: 'فبراير 2024',
    total_revenue: 52000,
    total_collections: 48000,
    overdue_amount: 4000,
    collection_rate: 92.3
  },
  {
    period: 'مارس 2024',
    total_revenue: 48000,
    total_collections: 45000,
    overdue_amount: 3000,
    collection_rate: 93.8
  },
  {
    period: 'أبريل 2024',
    total_revenue: 55000,
    total_collections: 52000,
    overdue_amount: 3000,
    collection_rate: 94.5
  }
];

const mockAlerts = [
  {
    id: '1',
    type: 'overdue_increase' as const,
    severity: 'high' as const,
    title: 'زيادة ملحوظة في المتأخرات',
    description: 'ارتفع إجمالي المتأخرات بنسبة 25% خلال الأسبوع الماضي',
    amount: 15000,
    percentage_change: 25,
    created_at: new Date().toISOString(),
    is_acknowledged: false
  },
  {
    id: '2',
    type: 'customer_risk' as const,
    severity: 'medium' as const,
    title: 'عميل عالي المخاطر',
    description: 'العميل أحمد محمد لديه متأخرات تزيد عن 60 يوم',
    customer_name: 'أحمد محمد',
    days_overdue: 65,
    amount: 8500,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    is_acknowledged: false
  }
];

export const EnhancedFinancialDashboard: React.FC<EnhancedFinancialDashboardProps> = ({
  companyId
}) => {
  const [showPaymentAllocation, setShowPaymentAllocation] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const handleAllocationComplete = (allocations: PaymentAllocation[]) => {
    console.log('Payment allocation completed:', allocations);
    setShowPaymentAllocation(false);
    // Handle the allocation logic here
  };

  const handleConfigureAlert = (config: any) => {
    console.log('Alert configuration:', config);
    // Handle alert configuration
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    console.log('Alert acknowledged:', alertId);
    // Handle alert acknowledgment
  };

  const startPaymentAllocation = (customerId: string, amount: number) => {
    setSelectedCustomerId(customerId);
    setPaymentAmount(amount);
    setShowPaymentAllocation(true);
  };

  if (showPaymentAllocation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">توزيع المدفوعات الذكي</h2>
        </div>
        <SmartPaymentAllocation
          customerId={selectedCustomerId}
          paymentAmount={paymentAmount}
          onAllocationComplete={handleAllocationComplete}
          onCancel={() => setShowPaymentAllocation(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">لوحة التحكم المالية المحسنة</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">اللوحة الرئيسية</TabsTrigger>
          <TabsTrigger value="trends">تحليل الاتجاهات</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات المتقدمة</TabsTrigger>
          <TabsTrigger value="allocation">توزيع المدفوعات</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <FinancialTrendsReport 
            trends={mockTrends}
            periodType="monthly"
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AdvancedFinancialAlerts
            alerts={mockAlerts}
            onConfigureAlert={handleConfigureAlert}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-4">توزيع المدفوعات الذكي</h3>
            <p className="text-muted-foreground mb-6">
              اختر عميل ومبلغ لبدء عملية التوزيع الذكي للمدفوعات
            </p>
            <button
              onClick={() => startPaymentAllocation('customer-1', 1000)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              بدء تجربة التوزيع الذكي
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};