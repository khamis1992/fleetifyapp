import { lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * نظام التحميل الكسول للمكونات الثقيلة
 * يحسن الأداء عبر تحميل المكونات عند الحاجة فقط
 */

// تحميل كسول للمكونات المتجاوبة الثقيلة
export const LazyResponsiveTable = lazy(() => 
  import('@/components/ui/responsive-table').then(module => ({
    default: module.ResponsiveTable
  }))
);

export const LazyResponsiveDialog = lazy(() =>
  import('@/components/ui/responsive-dialog').then(module => ({
    default: module.ResponsiveDialog
  }))
);

export const LazyResponsiveForm = lazy(() =>
  import('@/components/ui/responsive-form').then(module => ({
    default: module.FormItem
  }))
);

// تحميل كسول للصفحات الثقيلة
export const LazyFinanceDashboard = lazy(() =>
  import('@/components/finance/UnifiedFinancialDashboard')
);

export const LazyContractWizard = lazy(() =>
  import('@/components/contracts/ContractWizard')
);

export const LazyVehicleGrid = lazy(() =>
  import('@/components/fleet/VehicleGrid')
);

export const LazyUnifiedReportViewer = lazy(() =>
  import('@/components/reports/UnifiedReportViewer')
);

// تحميل كسول للمكونات حسب نوع الجهاز
export const LazyMobileComponents = lazy(() =>
  import('@/components/responsive/MobileOptimized').then(module => ({
    default: module.MobileOptimizedComponents
  }))
);

export const LazyDesktopComponents = lazy(() =>
  import('@/components/responsive/DesktopOptimized').then(module => ({
    default: module.DesktopOptimizedComponents
  }))
);

// مكون wrapper للتحميل الكسول مع loading state
export const withLazyLoading = <T extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  fallback?: React.ReactNode
) => {
  return (props: T) => (
    <React.Suspense fallback={fallback || <LoadingSpinner size="lg" />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// تحميل كسول شرطي حسب الجهاز
export const createDeviceSpecificLazyComponent = <T extends object>(
  mobileComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  desktopComponent: React.LazyExoticComponent<React.ComponentType<T>>
) => {
  return (props: T & { isMobile?: boolean }) => {
    const { isMobile, ...componentProps } = props;
    const Component = isMobile ? mobileComponent : desktopComponent;
    
    return (
      <React.Suspense fallback={<LoadingSpinner size="lg" />}>
        <Component {...(componentProps as T)} />
      </React.Suspense>
    );
  };
};

// تحسين تحميل الصور
export const createLazyImage = (src: string, alt: string) => {
  return lazy(() => 
    new Promise<{ default: React.ComponentType<any> }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          default: () => <img src={src} alt={alt} className="w-full h-auto" />
        });
      };
      img.src = src;
    })
  );
};

// تحميل كسول للرسوم البيانية
export const LazyCharts = {
  BarChart: lazy(() => import('recharts').then(module => ({ default: module.BarChart }))),
  LineChart: lazy(() => import('recharts').then(module => ({ default: module.LineChart }))),
  PieChart: lazy(() => import('recharts').then(module => ({ default: module.PieChart }))),
  AreaChart: lazy(() => import('recharts').then(module => ({ default: module.AreaChart }))),
};

// تحميل كسول للمحررات الثقيلة
export const LazyRichTextEditor = lazy(() =>
  import('@/components/ui/rich-text-editor')
);

export const LazyCodeEditor = lazy(() =>
  import('@/components/ui/code-editor')
);

// مساعد لتحديد ما إذا كان يجب تحميل المكون كسولاً
export const shouldLazyLoad = (componentSize: 'small' | 'medium' | 'large', deviceType: 'mobile' | 'tablet' | 'desktop') => {
  // تحميل كسول للمكونات الكبيرة على الأجهزة المحمولة
  if (deviceType === 'mobile' && componentSize === 'large') return true;
  
  // تحميل كسول للمكونات المتوسطة والكبيرة على الأجهزة اللوحية
  if (deviceType === 'tablet' && (componentSize === 'medium' || componentSize === 'large')) return true;
  
  // تحميل عادي للأجهزة المكتبية
  return false;
};

export default {
  LazyResponsiveTable,
  LazyResponsiveDialog,
  LazyResponsiveForm,
  LazyFinanceDashboard,
  LazyContractWizard,
  LazyVehicleGrid,
  LazyUnifiedReportViewer,
  LazyMobileComponents,
  LazyDesktopComponents,
  LazyCharts,
  LazyRichTextEditor,
  LazyCodeEditor,
  withLazyLoading,
  createDeviceSpecificLazyComponent,
  createLazyImage,
  shouldLazyLoad
};
