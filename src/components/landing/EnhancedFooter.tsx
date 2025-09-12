import { motion } from 'framer-motion';
import { 
  Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram,
  ArrowUp, Heart, Shield, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const footerSections = [
  {
    title: 'الحلول',
    links: [
      { name: 'النظام المحاسبي', href: '#' },
      { name: 'إدارة العملاء', href: '#' },
      { name: 'إدارة المخزون', href: '#' },
      { name: 'التحليلات', href: '#' },
      { name: 'نقاط البيع', href: '#' },
      { name: 'إدارة الموارد البشرية', href: '#' }
    ]
  },
  {
    title: 'القطاعات',
    links: [
      { name: 'تأجير السيارات', href: '#' },
      { name: 'العقارات', href: '#' },
      { name: 'التجزئة', href: '#' },
      { name: 'الرعاية الصحية', href: '#' },
      { name: 'التصنيع', href: '#' },
      { name: 'المطاعم', href: '#' }
    ]
  },
  {
    title: 'الشركة',
    links: [
      { name: 'من نحن', href: '#' },
      { name: 'فريق العمل', href: '#' },
      { name: 'الوظائف', href: '#' },
      { name: 'الأخبار', href: '#' },
      { name: 'الشراكات', href: '#' },
      { name: 'المدونة', href: '#' }
    ]
  },
  {
    title: 'الدعم',
    links: [
      { name: 'مركز المساعدة', href: '#' },
      { name: 'التوثيق', href: '#' },
      { name: 'API', href: '#' },
      { name: 'الحالة', href: '#' },
      { name: 'تواصل معنا', href: '#' },
      { name: 'التدريب', href: '#' }
    ]
  }
];

const socialLinks = [
  { icon: Facebook, href: '#', color: '#1877F2' },
  { icon: Twitter, href: '#', color: '#1DA1F2' },
  { icon: Linkedin, href: '#', color: '#0A66C2' },
  { icon: Instagram, href: '#', color: '#E4405F' }
];

const trustIndicators = [
  { icon: Shield, text: 'ISO 27001 معتمد' },
  { icon: Award, text: 'SOC 2 Type II' },
  { icon: Heart, text: '99% رضا العملاء' }
];

export function EnhancedFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-background border-t border-border/50 relative">
      {/* Newsletter Section */}
      <div className="bg-gradient-primary/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h3 className="arabic-heading-lg mb-4 bg-gradient-primary bg-clip-text text-transparent">
              ابق على اطلاع بآخر التحديثات
            </h3>
            <p className="arabic-body-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-center">
              اشترك في نشرتنا الإخبارية لتصلك آخر الميزات، النصائح، والعروض الحصرية
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                className="flex-1 px-4 py-3 rounded-lg border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 arabic-body"
                dir="rtl"
              />
              <Button className="arabic-body px-6">
                اشتراك
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                ERP سيستم
              </h3>
              <p className="arabic-body text-muted-foreground leading-relaxed text-container">
                نظام إدارة موارد المؤسسات الأكثر تطوراً في المنطقة. نساعد الشركات على تحسين كفاءتها وزيادة أرباحها.
              </p>
            </motion.div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="arabic-body-sm">+966 11 123 4567</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="arabic-body-sm">info@erpsystem.sa</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="arabic-body-sm">الرياض، المملكة العربية السعودية</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 flex items-center justify-center transition-colors group"
                >
                  <social.icon 
                    className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" 
                  />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            {footerSections.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
              >
                <h4 className="arabic-heading-sm mb-6 text-container">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a 
                        href={link.href}
                        className="arabic-body-sm text-muted-foreground hover:text-primary transition-colors story-link"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-8">
            {trustIndicators.map((indicator, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-2"
              >
                <indicator.icon className="h-5 w-5 text-primary" />
                <span className="arabic-body-sm font-medium">{indicator.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="arabic-body-sm text-muted-foreground text-center md:text-right">
              © 2025 ERP سيستم. جميع الحقوق محفوظة. صنع بـ 
              <Heart className="inline h-4 w-4 text-red-500 mx-1" />
              في المملكة العربية السعودية
            </p>
            
            <div className="flex items-center gap-6">
              <a href="#" className="arabic-body-sm text-muted-foreground hover:text-primary transition-colors">
                سياسة الخصوصية
              </a>
              <a href="#" className="arabic-body-sm text-muted-foreground hover:text-primary transition-colors">
                شروط الاستخدام
              </a>
              <a href="#" className="arabic-body-sm text-muted-foreground hover:text-primary transition-colors">
                ملفات تعريف الارتباط
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        className="fixed bottom-8 left-8 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowUp className="h-5 w-5 text-primary-foreground" />
      </motion.button>
    </footer>
  );
}