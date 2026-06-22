import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Package,
  FileText,
  BarChart3,
  Car,
  Users,
  Wrench,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface DepartmentIntegrationSummaryProps {
  className?: string;
}

export function DepartmentIntegrationSummary({ className }: DepartmentIntegrationSummaryProps) {
  const navigate = useNavigate();

  // بيانات تجريبية للتكامل بين الأقسام
  const integrationStats = {
    contracts: {
      total: 45,
      active: 32,
      pending_invoices: 8,
      overdue_payments: 3
    },
    fleet: {
      total_vehicles: 28,
      in_maintenance: 4,
      pending_insurance: 2,
      due_inspections: 6
    },
    customers: {
      total: 156,
      with_contracts: 89,
      outstanding_payments: 12,
      blacklisted: 2
    },
    financial: {
      pending_journal_entries: 15,
      unreconciled_payments: 7,
      budget_alerts: 3,
      cost_center_overruns: 2
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ملخص التكامل السريع */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ملخص التكامل بين الأقسام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* العقود */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Scale className="h-5 w-5 text-purple-600" />
                <h3 className="font-medium">العقود</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>إجمالي العقود</span>
                  <Badge variant="outline">{integrationStats.contracts.total}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>نشطة</span>
                  <Badge className="bg-green-100 text-green-800">{integrationStats.contracts.active}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>فواتير معلقة</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{integrationStats.contracts.pending_invoices}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات متأخرة</span>
                  <Badge className="bg-red-100 text-red-800">{integrationStats.contracts.overdue_payments}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate('/contracts')}
              >
                عرض العقود
              </Button>
            </div>

            {/* الأسطول */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Car className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">الأسطول</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>إجمالي المركبات</span>
                  <Badge variant="outline">{integrationStats.fleet.total_vehicles}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>في الصيانة</span>
                  <Badge className="bg-orange-100 text-orange-800">{integrationStats.fleet.in_maintenance}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>تأمين معلق</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{integrationStats.fleet.pending_insurance}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>فحص مستحق</span>
                  <Badge className="bg-red-100 text-red-800">{integrationStats.fleet.due_inspections}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate('/fleet')}
              >
                عرض الأسطول
              </Button>
            </div>

            {/* العملاء */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">العملاء</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>إجمالي العملاء</span>
                  <Badge variant="outline">{integrationStats.customers.total}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>لديهم عقود</span>
                  <Badge className="bg-green-100 text-green-800">{integrationStats.customers.with_contracts}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات معلقة</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{integrationStats.customers.outstanding_payments}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>محظورون</span>
                  <Badge className="bg-red-100 text-red-800">{integrationStats.customers.blacklisted}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate('/tenants')}
              >
                عرض المستأجرين
              </Button>
            </div>

            {/* المالية */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                <h3 className="font-medium">المالية</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>قيود معلقة</span>
                  <Badge className="bg-blue-100 text-blue-800">{integrationStats.financial.pending_journal_entries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات غير مطابقة</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{integrationStats.financial.unreconciled_payments}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>تنبيهات الميزانية</span>
                  <Badge className="bg-orange-100 text-orange-800">{integrationStats.financial.budget_alerts}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>تجاوز مراكز التكلفة</span>
                  <Badge className="bg-red-100 text-red-800">{integrationStats.financial.cost_center_overruns}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate('/finance')}
              >
                عرض المالية
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التنبيهات والإجراءات المطلوبة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            الإجراءات المطلوبة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon('error')}
                <div>
                  <p className="font-medium text-red-800">3 مدفوعات متأخرة</p>
                  <p className="text-sm text-red-600">تتطلب متابعة عاجلة</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/finance/payments?status=overdue')}
              >
                عرض
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon('warning')}
                <div>
                  <p className="font-medium text-yellow-800">6 مركبات تحتاج فحص</p>
                  <p className="text-sm text-yellow-600">موعد الفحص قريب</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/fleet?status=inspection_due')}
              >
                عرض
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon('warning')}
                <div>
                  <p className="font-medium text-orange-800">15 قيد محاسبي معلق</p>
                  <p className="text-sm text-orange-600">تتطلب مراجعة واعتماد</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/finance/general-ledger?status=draft')}
              >
                عرض
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon('info')}
                <div>
                  <p className="font-medium text-blue-800">8 فواتير معلقة</p>
                  <p className="text-sm text-blue-600">جاهزة للإرسال</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/finance/invoices?status=pending')}
              >
                عرض
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}