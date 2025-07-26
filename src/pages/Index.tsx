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

const Index = () => {
  const { user, loading } = useAuth();

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
                Fleetify
              </h3>
              <p className="text-sm text-muted-foreground">
                Next-generation business management platform for modern enterprises.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Fleet Management</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">HR Solutions</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Financial Control</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Analytics</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">GDPR</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Fleetify. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;