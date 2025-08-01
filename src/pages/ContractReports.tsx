import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarDays, TrendingUp, Users, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";

export function ContractReports() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState("all");

  // Fetch contract analytics data
  const { data: contractStats, isLoading } = useQuery({
    queryKey: ["contract-analytics", user?.profile?.company_id, dateFrom, dateTo, contractType],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      let query = supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(first_name, last_name, company_name),
          vehicle:vehicles(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .gte("contract_date", dateFrom)
        .lte("contract_date", dateTo);

      if (contractType !== "all") {
        query = query.eq("contract_type", contractType);
      }

      const { data: contracts, error } = await query;
      if (error) throw error;

      // Calculate statistics
      const totalContracts = contracts?.length || 0;
      const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
      const expiredContracts = contracts?.filter(c => c.status === 'expired').length || 0;
      const cancelledContracts = contracts?.filter(c => c.status === 'cancelled').length || 0;
      const totalRevenue = contracts?.reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0) || 0;
      const monthlyRevenue = contracts?.reduce((sum, c) => sum + (Number(c.monthly_amount) || 0), 0) || 0;

      // Revenue by month
      const revenueByMonth = contracts?.reduce((acc: any, contract) => {
        const month = new Date(contract.contract_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
        acc[month] = (acc[month] || 0) + Number(contract.contract_amount);
        return acc;
      }, {});

      const monthlyData = Object.entries(revenueByMonth || {}).map(([month, revenue]) => ({
        month,
        revenue: Number(revenue)
      }));

      // Contract status distribution
      const statusData = [
        { name: 'نشط', value: activeContracts, color: '#10b981' },
        { name: 'منتهي', value: expiredContracts, color: '#f59e0b' },
        { name: 'ملغي', value: cancelledContracts, color: '#ef4444' }
      ];

      // Contract type distribution
      const typeDistribution = contracts?.reduce((acc: any, contract) => {
        acc[contract.contract_type] = (acc[contract.contract_type] || 0) + 1;
        return acc;
      }, {});

      const typeData = Object.entries(typeDistribution || {}).map(([type, count]) => ({
        type: type === 'rental' ? 'إيجار' : type === 'service' ? 'خدمة' : type,
        count: Number(count)
      }));

      return {
        totalContracts,
        activeContracts,
        expiredContracts,
        cancelledContracts,
        totalRevenue,
        monthlyRevenue,
        monthlyData,
        statusData,
        typeData,
        contracts: contracts || []
      };
    },
    enabled: !!user?.profile?.company_id
  });

  // Get contracts expiring soon
  const { data: expiringContracts } = useQuery({
    queryKey: ["expiring-contracts", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("company_id", user.profile.company_id)
        .eq("status", "active")
        .lte("end_date", thirtyDaysFromNow.toISOString().split('T')[0])
        .order("end_date");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">تقارير العقود</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>فلترة البيانات</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_from">من تاريخ</Label>
            <Input
              id="date_from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_to">إلى تاريخ</Label>
            <Input
              id="date_to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_type">نوع العقد</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="rental">إيجار</SelectItem>
                <SelectItem value="service">خدمة</SelectItem>
                <SelectItem value="maintenance">صيانة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <CalendarDays className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">إجمالي العقود</p>
              <p className="text-2xl font-bold">{contractStats?.totalContracts || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">العقود النشطة</p>
              <p className="text-2xl font-bold">{contractStats?.activeContracts || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{(contractStats?.totalRevenue || 0).toFixed(3)} د.ك</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">الإيرادات الشهرية</p>
              <p className="text-2xl font-bold">{(contractStats?.monthlyRevenue || 0).toFixed(3)} د.ك</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">تحليل البيانات</TabsTrigger>
          <TabsTrigger value="expiring">العقود المنتهية قريباً</TabsTrigger>
          <TabsTrigger value="performance">تقرير الأداء</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الإيرادات الشهرية</CardTitle>
                <CardDescription>توزيع الإيرادات على مدار الأشهر</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contractStats?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(3)} د.ك`, 'الإيرادات']} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع حالة العقود</CardTitle>
                <CardDescription>نسبة العقود حسب الحالة</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contractStats?.statusData || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {contractStats?.statusData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center mt-4 space-x-4">
                  {contractStats?.statusData?.map((entry) => (
                    <div key={entry.name} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                العقود المنتهية خلال 30 يوم
              </CardTitle>
              <CardDescription>العقود التي تحتاج لتجديد أو إنهاء قريباً</CardDescription>
            </CardHeader>
            <CardContent>
              {expiringContracts && expiringContracts.length > 0 ? (
                <div className="space-y-4">
                  {expiringContracts.map((contract) => (
                    <div key={contract.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{contract.contract_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          العميل: {(contract.customer as any)?.company_name || `${(contract.customer as any)?.first_name} ${(contract.customer as any)?.last_name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          ينتهي في: {new Date(contract.end_date).toLocaleDateString('en-GB')}
                        </Badge>
                        <p className="text-sm font-medium">{Number(contract.contract_amount).toFixed(3)} د.ك</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد عقود منتهية خلال الفترة القادمة
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>أداء أنواع العقود</CardTitle>
                <CardDescription>عدد العقود حسب النوع</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contractStats?.typeData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معدل الإنجاز</CardTitle>
                <CardDescription>نسبة العقود المكتملة بنجاح</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {contractStats?.totalContracts ? 
                      ((contractStats.activeContracts + contractStats.expiredContracts) / contractStats.totalContracts * 100).toFixed(1)
                      : 0
                    }%
                  </div>
                  <p className="text-sm text-muted-foreground">معدل إكمال العقود</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>العقود المكتملة</span>
                    <span>{(contractStats?.activeContracts || 0) + (contractStats?.expiredContracts || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>العقود الملغية</span>
                    <span>{contractStats?.cancelledContracts || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>إجمالي العقود</span>
                    <span>{contractStats?.totalContracts || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}