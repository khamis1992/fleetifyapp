import { useLandingContent } from './useLandingContent';

export const useDynamicLandingContent = (language: 'en' | 'ar' = 'en') => {
  const { content, loading, getContentByKey } = useLandingContent();
  
  console.log('🎭 [DYNAMIC_LANDING] Loading:', loading, 'Content length:', content?.length);

  // Helper function to get content with fallback
  const getContent = (key: string, fallback: string = '') => {
    const value = getContentByKey(key, language);
    return value || fallback;
  };

  // Dynamic content objects
  const dynamicContent = {
    hero: {
      title: getContent('hero_title', language === 'ar' ? 'حوّل عملك بحلول ذكية' : 'Transform Your Business with Smart Solutions'),
      subtitle: getContent('hero_subtitle', language === 'ar' 
        ? 'بسّط عملياتك مع منصة إدارة الأعمال الشاملة' 
        : 'Streamline your operations with our comprehensive business management platform'
      ),
      cta: getContent('hero_cta', language === 'ar' ? 'ابدأ اليوم' : 'Get Started Today'),
    },
    features: {
      title: getContent('features_title', language === 'ar' ? 'ميزات قوية للأعمال الحديثة' : 'Powerful Features for Modern Business'),
      subtitle: getContent('features_subtitle', language === 'ar' 
        ? 'كل ما تحتاجه لإدارة عملك بكفاءة' 
        : 'Everything you need to manage your business efficiently'
      ),
    },
    testimonials: {
      title: getContent('testimonials_title', language === 'ar' ? 'ماذا يقول عملاؤنا' : 'What Our Clients Say'),
    },
    cta: {
      title: getContent('cta_title', language === 'ar' ? 'مستعد للبدء؟' : 'Ready to Get Started?'),
      subtitle: getContent('cta_subtitle', language === 'ar' 
        ? 'انضم إلى آلاف الشركات التي تستخدم منصتنا بالفعل' 
        : 'Join thousands of businesses already using our platform'
      ),
      button: getContent('cta_button', language === 'ar' ? 'ابدأ التجربة المجانية' : 'Start Free Trial'),
    },
  };

  return {
    content: dynamicContent,
    loading,
    getContent,
  };
};