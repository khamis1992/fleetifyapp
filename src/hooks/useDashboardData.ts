import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetric {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  trend?: number[];
}

interface DashboardActivity {
  id: number;
  type: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  priority?: 'high' | 'medium' | 'low';
}

interface DashboardData {
  metrics: DashboardMetric[];
  activities: DashboardActivity[];
  fleetStatus: {
    available: number;
    rented: number;
    maintenance: number;
    outOfService: number;
  };
  isLoading: boolean;
  error: string | null;
}

export const useDashboardData = (): DashboardData => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    metrics: [],
    activities: [],
    fleetStatus: {
      available: 0,
      rented: 0,
      maintenance: 0,
      outOfService: 0
    },
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Simulate API call - replace with actual data fetching
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: DashboardData = {
          metrics: [
            {
              title: 'إجمالي الأسطول',
              value: '24',
              change: '+2 هذا الشهر',
              changeType: 'positive',
              trend: [12, 19, 15, 22, 24, 26, 24]
            },
            {
              title: 'العقود النشطة',
              value: '18',
              change: '+3 هذا الأسبوع',
              changeType: 'positive',
              trend: [8, 12, 15, 16, 18, 17, 18]
            },
            {
              title: 'العملاء',
              value: '157',
              change: '+12 شهرياً',
              changeType: 'positive',
              trend: [120, 135, 142, 148, 152, 155, 157]
            },
            {
              title: 'الإيرادات الشهرية',
              value: '12,450 د.ك',
              change: '+8.2%',
              changeType: 'positive',
              trend: [8500, 9200, 10100, 11200, 11800, 12100, 12450]
            }
          ],
          activities: [
            {
              id: 1,
              type: 'عقد جديد',
              description: 'تم إنشاء عقد جديد للسيد أحمد المحمد - سيارة BMW X5',
              time: 'منذ ساعتين',
              icon: 'FileText',
              color: 'bg-success',
              priority: 'high'
            },
            {
              id: 2,
              type: 'صيانة مطلوبة',
              description: 'السيارة ABC-123 تحتاج صيانة دورية - موعد الصيانة غداً',
              time: 'منذ 4 ساعات',
              icon: 'AlertTriangle',
              color: 'bg-warning',
              priority: 'medium'
            },
            {
              id: 3,
              type: 'عميل جديد',
              description: 'تم تسجيل عميل جديد: سارة الكندري - رقم العضوية: 1578',
              time: 'منذ يوم',
              icon: 'Users',
              color: 'bg-primary',
              priority: 'low'
            },
            {
              id: 4,
              type: 'دفعة مالية',
              description: 'تم استلام دفعة بقيمة 2,400 د.ك من عقد رقم #2024-156',
              time: 'منذ يومين',
              icon: 'DollarSign',
              color: 'bg-accent',
              priority: 'high'
            }
          ],
          fleetStatus: {
            available: 6,
            rented: 18,
            maintenance: 2,
            outOfService: 1
          },
          isLoading: false,
          error: null
        };
        
        setData(mockData);
      } catch (error) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
        }));
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return data;
};