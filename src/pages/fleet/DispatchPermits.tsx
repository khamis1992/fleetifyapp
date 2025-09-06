import { useState } from "react";
import { Plus, FileText, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DispatchPermitForm } from "@/components/fleet/DispatchPermitForm";
import { DispatchPermitsList } from "@/components/fleet/DispatchPermitsList";
import { useDispatchPermits } from "@/hooks/useDispatchPermits";
import { ResponsivePageActions } from "@/components/ui/responsive-page-actions";

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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <ResponsivePageActions
        title="تصاريح الحركة الداخلية"
        subtitle="إدارة تصاريح حركة المركبات والموافقات"
        primaryAction={{
          id: 'new-permit',
          label: 'طلب تصريح جديد',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setShowPermitForm(true)
        }}
      />

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
      <DispatchPermitsList />

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