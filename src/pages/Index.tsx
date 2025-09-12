import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { BusinessTypesSection } from '@/components/landing/BusinessTypesSection';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { PartnersSection } from '@/components/landing/PartnersSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CallToActionSection } from '@/components/landing/CallToActionSection';
import { EnhancedFooter } from '@/components/landing/EnhancedFooter';
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
      
      <AnnouncementBar />
      <HeroSection />
      
      <StatsSection />
      
      <ParallaxSection offset={50}>
        <FeatureShowcase />
      </ParallaxSection>
      
      <ParallaxSection offset={-20}>
        <BusinessTypesSection />
      </ParallaxSection>
      
      <ParallaxSection offset={-30}>
        <DashboardPreview />
      </ParallaxSection>
      
      <PartnersSection />
      
      <ParallaxSection offset={20}>
        <PricingSection />
      </ParallaxSection>
      
      <SecuritySection />
      
      <ParallaxSection offset={-20}>
        <FAQSection />
      </ParallaxSection>
      
      <CallToActionSection />

      <EnhancedFooter />
    </div>
  );
};

export default Index;