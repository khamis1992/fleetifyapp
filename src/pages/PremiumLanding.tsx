import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  PremiumNavbar,
  PremiumHero, 
  StatsSection,
  FeaturesGrid,
  PricingSection,
  TestimonialsSection,
  IntegrationsSection,
  CTASection,
  PremiumFooter
} from '@/components/premium-landing';

/**
 * Premium Landing Page - ERP SaaS
 * تصميم احترافي متقدم لنظام ERP SaaS
 * 
 * Features:
 * - Modern glassmorphism design
 * - Advanced animations
 * - Interactive elements
 * - Responsive layout
 * - Professional color scheme
 */
const PremiumLanding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect authenticated users
  if (user && !loading) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation */}
      <PremiumNavbar scrolled={scrolled} />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <PremiumHero />

        {/* Stats Section - Social Proof */}
        <StatsSection />

        {/* Features Grid */}
        <FeaturesGrid />

        {/* Integrations Showcase */}
        <IntegrationsSection />

        {/* Pricing Section */}
        <PricingSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Final CTA */}
        <CTASection />
      </main>

      {/* Footer */}
      <PremiumFooter />
    </div>
  );
};

export default PremiumLanding;

