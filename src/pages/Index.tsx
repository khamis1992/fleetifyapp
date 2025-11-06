import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { BusinessTypesSection } from '@/components/landing/BusinessTypesSection';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { CallToActionSection } from '@/components/landing/CallToActionSection';
import { ParallaxSection } from '@/components/landing/ParallaxSection';

const Index = () => {
  const { user, loading } = useAuth();

  console.log('🏠 [INDEX] Rendering Index page', { user: !!user, loading });

  // CRITICAL FIX: Don't block the landing page with loading state
  // Allow landing page to render even while auth is loading
  // Only redirect to dashboard if we have a confirmed user
  if (loading && user) {
    // Only show loading if we already know there's a user (fast path)
    console.log('🏠 [INDEX] User exists but still loading details');
    return <Navigate to="/dashboard" replace />;
  }

  if (!loading && user) {
    // User is fully loaded and authenticated
    console.log('🏠 [INDEX] User authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Show landing page immediately - don't wait for auth to complete
  // This prevents blank page if auth fails or times out
  console.log('🏠 [INDEX] Rendering landing page');

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      <HeroSection />
      
      <ParallaxSection offset={50}>
        <FeatureShowcase />
      </ParallaxSection>
      
      <ParallaxSection offset={-20}>
        <BusinessTypesSection />
      </ParallaxSection>
      
      <ParallaxSection offset={-30}>
        <DashboardPreview />
      </ParallaxSection>
      
      <CallToActionSection />

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                ERP سيستم
              </h3>
              <p className="text-sm text-muted-foreground">
                نظام إدارة موارد المؤسسات الشامل للأعمال الحديثة.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">الحلول</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">النظام المحاسبي</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">إدارة العملاء</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">إدارة المخزون</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">التحليلات</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">الشركة</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">من نحن</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">الوظائف</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">تواصل معنا</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">الدعم</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">القانونية</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">شروط الخدمة</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">GDPR</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">الأمان</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2025 ERP سيستم. جميع الحقوق محفوظة.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                الخصوصية
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                الشروط
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                الدعم
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;