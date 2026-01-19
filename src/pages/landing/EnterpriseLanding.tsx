import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EnterpriseNavbar } from '@/components/landing/enterprise/EnterpriseNavbar';
import { EnterpriseHero } from '@/components/landing/enterprise/EnterpriseHero';
import { EnterpriseVideo } from '@/components/landing/enterprise/EnterpriseVideo';
import { EnterpriseTrustedBy } from '@/components/landing/enterprise/EnterpriseTrustedBy';
import { EnterpriseLiveDemo } from '@/components/landing/enterprise/EnterpriseLiveDemo';
import { EnterpriseComparison } from '@/components/landing/enterprise/EnterpriseComparison';
import { EnterprisePricing } from '@/components/landing/enterprise/EnterprisePricing';
import { EnterpriseFooter } from '@/components/landing/enterprise/EnterpriseFooter';

/**
 * Enterprise Landing Page
 * صفحة هبوط احترافية للمؤسسات
 *
 * A professional, enterprise-grade landing page for Fleetify
 * Clean, trustworthy, and designed for B2B enterprise clients
 */
const EnterpriseLanding = () => {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect if authenticated
  if (user && !loading) {
    window.location.href = '/dashboard';
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <EnterpriseNavbar scrolled={scrolled} />
      <EnterpriseHero />
      <EnterpriseVideo />
      <EnterpriseComparison />
      <EnterpriseTrustedBy />
      <EnterpriseLiveDemo />
      <EnterprisePricing />
      <EnterpriseFooter />
    </div>
  );
};

export default EnterpriseLanding;
