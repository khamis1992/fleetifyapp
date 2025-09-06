import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  Truck,
  Brain,
  BarChart3,
  Activity
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { StatCardNumber, StatCardPercentage } from '@/components/ui/NumberDisplay';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export const SmartAnalyticsPanel: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [isLoading, setIsLoading] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<any>(null);

  // Mock analytics data
  React.useEffect(() => {
    const mockData = {
      trends: [
        { month: 'يناير', revenue: 12000, customers: 45 },
        { month: 'فبراير', revenue: 14500, customers: 52 },
        { month: 'مارس', revenue: 13200, customers: 48 },
        { month: 'أبريل', revenue: 16800, customers: 61 },
        { month: 'مايو', revenue: 15400, customers: 58 },
        { month: 'يونيو', revenue: 18200, customers: 67 }
      ],
      distribution: [
        { name: 'عقود نشطة', value: 65 },
        { name: 'عقود منتهية', value: 25 },
        { name: 'عقود معلقة', value: 10 }
      ],
      metrics: {
        growth_rate: 12.5,
        customer_satisfaction: 88,
        revenue_target: 75,
        operational_efficiency: 92
      }
    };
    setAnalytics(mockData);
  }, []);

  const generateReport = () => {
    setIsLoading(true);
    // Simulate report generation
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">جاري تحميل التحليلات الذكية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          التحليلات الذكية
        </h3>
        <Button onClick={generateReport} disabled={isLoading}>
          <Activity className="h-4 w-4 mr-2" />
          {isLoading ? 'جاري التحليل...' : 'تحليل متقدم'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النمو</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +<StatCardPercentage value={analytics.metrics.growth_rate} className="inline" />
            </div>
            <Progress value={analytics.metrics.growth_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رضا العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <StatCardPercentage value={analytics.metrics.customer_satisfaction} />
            </div>
            <Progress value={analytics.metrics.customer_satisfaction} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هدف الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              <StatCardPercentage value={analytics.metrics.revenue_target} />
            </div>
            <Progress value={analytics.metrics.revenue_target} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الكفاءة التشغيلية</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              <StatCardPercentage value={analytics.metrics.operational_efficiency} />
            </div>
            <Progress value={analytics.metrics.operational_efficiency} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>اتجاه الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={CHART_COLORS[0]} 
                  strokeWidth={2}
                  name="الإيرادات"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contract Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع العقود</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}%`}
                >
                  {analytics.distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth */}
      <Card>
        <CardHeader>
          <CardTitle>نمو العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" fill={CHART_COLORS[1]} name="العملاء" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAnalyticsPanel;