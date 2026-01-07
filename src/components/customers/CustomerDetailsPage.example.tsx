/**
 * أمثلة على استخدام مكون CustomerDetailsPage
 * 
 * هذا الملف يحتوي على أمثلة عملية لكيفية دمج مكون صفحة تفاصيل العميل
 * في تطبيق FleetifyApp
 */

import { Routes, Route, Link } from 'react-router-dom';
import { CustomerDetailsPage } from './CustomerDetailsPage';

// ============================================
// مثال 1: التكامل البسيط مع React Router
// ============================================

export const Example1_BasicRouting = () => {
  return (
    <Routes>
      {/* المسار الأساسي لصفحة تفاصيل العميل */}
      <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
      
      {/* مسار بديل مع معرف ثابت */}
      <Route path="/customer-profile" element={<CustomerDetailsPage />} />
    </Routes>
  );
};

// ============================================
// مثال 2: التكامل مع قائمة العملاء
// ============================================

export const Example2_CustomerList = () => {
  const customers = [
    { id: 'CUS-001', name: 'أحمد محمد' },
    { id: 'CUS-002', name: 'فاطمة علي' },
    { id: 'CUS-003', name: 'محمد عبدالله' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">قائمة العملاء</h2>
      <div className="grid gap-4">
        {customers.map((customer) => (
          <Link
            key={customer.id}
            to={`/customers/${customer.id}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="font-semibold">{customer.name}</div>
            <div className="text-sm text-slate-600">ID: {customer.id}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// ============================================
// مثال 3: مع ProtectedRoute للأمان
// ============================================

import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export const Example3_ProtectedRoute = () => {
  return (
    <Routes>
      <Route
        path="/customers/:customerId"
        element={
          <ProtectedRoute requiredRole="admin">
            <CustomerDetailsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// ============================================
// مثال 4: مع Layout مخصص
// ============================================

import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export const Example4_WithLayout = () => {
  return (
    <Routes>
      <Route
        path="/customers/:customerId"
        element={
          <DashboardLayout>
            <CustomerDetailsPage />
          </DashboardLayout>
        }
      />
    </Routes>
  );
};

// ============================================
// مثال 5: التكامل الكامل مع جميع الميزات
// ============================================

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const Example5_FullIntegration = () => {
  return (
    <Routes>
      <Route
        path="/customers/:customerId"
        element={
          <ErrorBoundary>
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <CustomerDetailsPage />
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
    </Routes>
  );
};

// ============================================
// مثال 6: استخدام برمجي مع useNavigate
// ============================================

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Example6_ProgrammaticNavigation = () => {
  const navigate = useNavigate();

  const handleViewCustomer = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <div>
      <h2>إجراءات العملاء</h2>
      <Button onClick={() => handleViewCustomer('CUS-12345')}>
        عرض تفاصيل العميل
      </Button>
    </div>
  );
};

// ============================================
// مثال 7: مع Breadcrumbs
// ============================================

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';

export const Example7_WithBreadcrumbs = () => {
  return (
    <div>
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/customers">العملاء</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          تفاصيل العميل
        </BreadcrumbItem>
      </Breadcrumb>
      
      <CustomerDetailsPage />
    </div>
  );
};

// ============================================
// مثال 8: دمج مع API (React Query)
// ============================================

import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';

// دوال API (يجب استبدالها بالدوال الفعلية)
const fetchCustomerData = async (customerId: string) => {
  const response = await fetch(`/api/customers/${customerId}`);
  return response.json();
};

export const Example8_WithAPI = () => {
  const { customerId } = useParams();
  
  const { data, isLoading, error } = useQuery(
    ['customer', customerId],
    () => fetchCustomerData(customerId!),
    {
      enabled: !!customerId,
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>حدث خطأ في تحميل البيانات</div>;

  return <CustomerDetailsPage />;
};

// ============================================
// مثال 9: مع Modal/Dialog
// ============================================

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export const Example9_WithModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>عرض تفاصيل العميل</Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <CustomerDetailsPage />
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// مثال 10: مع تبويبات متعددة
// ============================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Example10_WithTabs = () => {
  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="list">قائمة العملاء</TabsTrigger>
        <TabsTrigger value="details">تفاصيل العميل</TabsTrigger>
        <TabsTrigger value="analytics">التحليلات</TabsTrigger>
      </TabsList>
      
      <TabsContent value="list">
        <div>قائمة العملاء...</div>
      </TabsContent>
      
      <TabsContent value="details">
        <CustomerDetailsPage />
      </TabsContent>
      
      <TabsContent value="analytics">
        <div>تحليلات العملاء...</div>
      </TabsContent>
    </Tabs>
  );
};

// ============================================
// الاستخدام في ملف التوجيه الرئيسي (App.tsx)
// ============================================

/*
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CustomerDetailsPage } from '@/components/customers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... باقي المسارات *\/}
        
        {/* مسار صفحة تفاصيل العميل *\/}
        <Route 
          path="/customers/:customerId" 
          element={<CustomerDetailsPage />} 
        />
        
        {/* ... باقي المسارات *\/}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
*/

