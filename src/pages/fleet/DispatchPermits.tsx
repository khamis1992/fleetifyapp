import { useState } from "react";
import { Plus, FileText, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DispatchPermitForm } from "@/components/fleet/DispatchPermitForm";
import { DispatchPermitsList } from "@/components/fleet/DispatchPermitsList";
import { useDispatchPermits } from "@/hooks/useDispatchPermits";

export default function DispatchPermits() {
  const [showPermitForm, setShowPermitForm] = useState(false);
  const { data: permits } = useDispatchPermits();

  // Calculate statistics
  const stats = {
    total: permits?.length || 0,
    pending: permits?.filter(p => p.status === 'pending').length || 0,
    approved: permits?.filter(p => p.status === 'approved').length || 0,
    in_progress: permits?.filter(p => p.status === 'in_progress').length || 0,
    completed: permits?.filter(p => p.status === 'completed').length || 0,
    rejected: permits?.filter(p => p.status === 'rejected').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تصاريح الحركة الداخلية</h1>
          <p className="text-muted-foreground">
            إدارة تصاريح حركة المركبات والموافقات
          </p>
        </div>
        <Button onClick={() => setShowPermitForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          طلب تصريح جديد
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التصاريح</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">موافق عليها</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرفوضة</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="permits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permits">قائمة التصاريح</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="permits" className="space-y-4">
          <DispatchPermitsList />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليلات التصاريح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Distribution */}
                  <div>
                    <h4 className="font-medium mb-3">توزيع الحالات</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">قيد الانتظار</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-yellow-500 rounded"
                              style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{stats.pending}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">موافق عليها</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-green-500 rounded"
                              style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{stats.approved}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">قيد التنفيذ</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-blue-500 rounded"
                              style={{ width: `${stats.total > 0 ? (stats.in_progress / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{stats.in_progress}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">مكتملة</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-emerald-500 rounded"
                              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{stats.completed}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">مرفوضة</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-red-500 rounded"
                              style={{ width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{stats.rejected}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div>
                    <h4 className="font-medium mb-3">إحصائيات سريعة</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">معدل الموافقة</span>
                        <span className="text-sm font-medium">
                          {stats.total > 0 ? Math.round(((stats.approved + stats.completed) / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm">معدل الرفض</span>
                        <span className="text-sm font-medium">
                          {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm">التصاريح المعلقة</span>
                        <span className="text-sm font-medium">
                          {stats.pending + stats.in_progress}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {stats.total === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد بيانات لعرض التحليلات</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permit Form Dialog */}
      {showPermitForm && (
        <DispatchPermitForm 
          open={showPermitForm} 
          onOpenChange={setShowPermitForm}
        />
      )}
    </div>
  );
}