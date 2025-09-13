import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import CarRentalDashboard from './dashboards/CarRentalDashboard';
import NewRealEstateDashboard from './dashboards/NewRealEstateDashboard';
import RetailDashboard from './dashboards/RetailDashboard';
import DashboardDiagnostics from '@/components/dashboard/DashboardDiagnostics';

/**
 * Dashboard محسن يعتمد على business_type من AuthContext
 * يحل مشكلة عرض dashboard خاطئ في البداية
 */
const OptimizedDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  // مكون تشخيصي لمراقبة الأداء
  const diagnostics = <DashboardDiagnostics />;

  console.log('🚀 [OPTIMIZED_DASHBOARD] ===== RENDER DEBUG =====');
  console.log('🚀 [OPTIMIZED_DASHBOARD] Loading:', loading);
  console.log('🚀 [OPTIMIZED_DASHBOARD] User ID:', user?.id);
  console.log('🚀 [OPTIMIZED_DASHBOARD] Company ID:', user?.company?.id);
  console.log('🚀 [OPTIMIZED_DASHBOARD] Company Name:', user?.company?.name);
  console.log('🚀 [OPTIMIZED_DASHBOARD] Business Type:', user?.company?.business_type);
  console.log('🚀 [OPTIMIZED_DASHBOARD] Active Modules:', user?.company?.active_modules);
  console.log('🚀 [OPTIMIZED_DASHBOARD] ================================');

  // عرض loading أثناء تحميل بيانات المصادقة
  if (loading) {
    console.log('🚀 [OPTIMIZED_DASHBOARD] Showing loading - auth loading');
    return (
      <>
        {diagnostics}
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              جاري تحميل بيانات المستخدم...
            </p>
          </div>
        </div>
      </>
    );
  }

  // التأكد من وجود المستخدم
  if (!user) {
    console.log('🚀 [OPTIMIZED_DASHBOARD] No user found');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">
            خطأ في تحميل بيانات المستخدم
          </p>
          <p className="text-xs text-muted-foreground">
            يرجى تسجيل الدخول مرة أخرى
          </p>
        </div>
      </div>
    );
  }

  // التأكد من وجود الشركة
  if (!user.company?.id) {
    console.log('🚀 [OPTIMIZED_DASHBOARD] No company associated with user');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">
            لم يتم العثور على شركة مرتبطة بهذا المستخدم
          </p>
          <p className="text-xs text-muted-foreground">
            يرجى التواصل مع الدعم التقني
          </p>
        </div>
      </div>
    );
  }

  let businessType = user.company.business_type;
  const companyName = user.company.name;

  // معالجة ذكية لتحديد نوع النشاط المناسب
  if (companyName) {
    // شركات المقاولات والإنشاءات
    if (companyName.includes('مقاولات') || companyName.includes('إنشاءات') || companyName.includes('عقار')) {
      if (!businessType || businessType === 'car_rental') {
        console.log('🏗️ [OPTIMIZED_DASHBOARD] Construction/Real Estate company detected, setting to real_estate');
        businessType = 'real_estate';
      }
    }
    // شركات السيارات
    else if (companyName.includes('سيارات') || companyName.includes('تأجير') || companyName.includes('مركبات')) {
      if (!businessType || businessType === 'real_estate') {
        console.log('🚗 [OPTIMIZED_DASHBOARD] Car rental company detected, setting to car_rental');
        businessType = 'car_rental';
      }
    }
    // شركات التجارة
    else if (companyName.includes('تجارة') || companyName.includes('متجر') || companyName.includes('مبيعات')) {
      if (!businessType) {
        console.log('🛍️ [OPTIMIZED_DASHBOARD] Retail company detected, setting to retail');
        businessType = 'retail';
      }
    }
  }

  // إذا كانت الشركة تحتوي على "إدارة النظام" أو "System Management"، استخدم نوع افتراضي
  if (companyName && (companyName.includes('إدارة النظام') || companyName.includes('System Management'))) {
    console.log('⚙️ [OPTIMIZED_DASHBOARD] System management company detected, using default dashboard');
    // يمكن استخدام أي نوع كافتراضي، أو إنشاء dashboard خاص للإدارة
    if (!businessType) {
      businessType = 'retail'; // استخدام retail كافتراضي للشركات الإدارية
    }
  }

  // التأكد من وجود نوع النشاط
  if (!businessType) {
    console.log('🚀 [OPTIMIZED_DASHBOARD] No business type defined for company');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            جاري تحديد نوع النشاط...
          </p>
          {companyName && (
            <p className="text-xs text-muted-foreground">
              شركة {companyName}
            </p>
          )}
        </div>
      </div>
    );
  }

  console.log(`🚀 [OPTIMIZED_DASHBOARD] Rendering ${businessType} dashboard for company: ${companyName}`);

  // عرض لوحة التحكم المناسبة بناءً على نوع النشاط
  switch (businessType) {
    case 'car_rental':
      console.log('🚗 [OPTIMIZED_DASHBOARD] Rendering Car Rental Dashboard');
      return (
        <>
          {diagnostics}
          <CarRentalDashboard key={`car-rental-${user.company.id}`} />
        </>
      );
      
    case 'real_estate':
      console.log('🏠 [OPTIMIZED_DASHBOARD] Rendering Real Estate Dashboard');
      return (
        <>
          {diagnostics}
          <NewRealEstateDashboard key={`real-estate-${user.company.id}`} />
        </>
      );
      
    case 'retail':
      console.log('🛒 [OPTIMIZED_DASHBOARD] Rendering Retail Dashboard');
      return <RetailDashboard key={`retail-${user.company.id}`} />;
      
    case 'construction':
      console.log('🏗️ [OPTIMIZED_DASHBOARD] Construction type detected - using Real Estate Dashboard');
      // شركة النور للمقاولات وشركات المقاولات الأخرى تستخدم نظام العقارات
      return (
        <>
          {diagnostics}
          <NewRealEstateDashboard key={`construction-${user.company.id}`} />
        </>
      );
      
    case 'medical':
    case 'manufacturing':
    case 'restaurant':
    case 'logistics':
    case 'education':
    case 'consulting':
      console.log(`📋 [OPTIMIZED_DASHBOARD] ${businessType} type - using Retail Dashboard as fallback`);
      return <RetailDashboard key={`${businessType}-${user.company.id}`} />;
      
    default:
      console.error('🚨 [OPTIMIZED_DASHBOARD] Unknown business type:', businessType);
      return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-destructive">
              نوع النشاط غير مدعوم: {businessType}
            </p>
            <p className="text-xs text-muted-foreground">
              شركة {companyName}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              يرجى التواصل مع الدعم التقني لإضافة دعم لهذا النوع
            </p>
          </div>
        </div>
      );
  }
};

export default OptimizedDashboard;
