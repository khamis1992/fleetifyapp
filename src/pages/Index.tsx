import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustedCompanies } from '@/components/landing/TrustedCompanies';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CallToActionSection } from '@/components/landing/CallToActionSection';
import { ParallaxSection } from '@/components/landing/ParallaxSection';
import { useDynamicLandingContent } from '@/hooks/useDynamicLandingContent';

const Index = () => {
  const { user, loading } = useAuth();
  const { content: dynamicContent, loading: contentLoading } = useDynamicLandingContent('ar');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      <HeroSection />
      
      <ParallaxSection offset={30}>
        <TrustedCompanies />
      </ParallaxSection>
      
      <ParallaxSection offset={50}>
        <FeatureShowcase />
      </ParallaxSection>
      
      <ParallaxSection offset={-30}>
        <DashboardPreview />
      </ParallaxSection>
      
      <ParallaxSection offset={40}>
        <TestimonialsSection />
      </ParallaxSection>
      
      <CallToActionSection />

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                فليتيفاي
              </h3>
              <p className="text-sm text-muted-foreground">
                منصة إدارة أعمال الجيل القادم للمؤسسات الحديثة.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">المنتج</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">إدارة الأسطول</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">حلول الموارد البشرية</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">التحكم المالي</a></li>
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
              © 2025 فليتيفاي. جميع الحقوق محفوظة.
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