import { motion } from 'framer-motion';
import { Sparkles, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export function PremiumFooter() {
  const footerLinks = {
    product: {
      title: 'المنتج',
      links: [
        { label: 'الميزات', href: '#features' },
        { label: 'الأسعار', href: '#pricing' },
        { label: 'التقييمات', href: '#testimonials' },
        { label: 'التحديثات', href: '#' },
        { label: 'خريطة الطريق', href: '#' },
      ],
    },
    solutions: {
      title: 'الحلول',
      links: [
        { label: 'تأجير السيارات', href: '#' },
        { label: 'العقارات', href: '#' },
        { label: 'التجزئة', href: '#' },
        { label: 'التصنيع', href: '#' },
        { label: 'الخدمات', href: '#' },
      ],
    },
    company: {
      title: 'الشركة',
      links: [
        { label: 'من نحن', href: '#' },
        { label: 'الوظائف', href: '#' },
        { label: 'المدونة', href: '#' },
        { label: 'الشركاء', href: '#' },
        { label: 'تواصل معنا', href: '#contact' },
      ],
    },
    resources: {
      title: 'الموارد',
      links: [
        { label: 'التوثيق', href: '#' },
        { label: 'مركز المساعدة', href: '#' },
        { label: 'فيديوهات تعليمية', href: '#' },
        { label: 'API', href: '#' },
        { label: 'الحالة', href: '#' },
      ],
    },
  };

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ];

  return (
    <footer className="relative border-t border-border/50 bg-card/30 backdrop-blur-sm">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-full" />
                  <div className="relative w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    FleetifyApp
                  </h3>
                  <p className="text-xs text-muted-foreground">نظام ERP الشامل</p>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed max-w-sm">
                منصة إدارة أعمال سحابية متطورة تدعم 10+ قطاعات مع حلول مخصصة
                للمحاسبة، المخزون، العملاء، والمزيد.
              </p>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:info@fleetifyapp.com" className="hover:text-primary transition-colors">
                    info@fleetifyapp.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href="tel:+96512345678" className="hover:text-primary transition-colors">
                    +965 1234 5678
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>الكويت، الخليج العربي</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-9 h-9 rounded-lg bg-accent/10 hover:bg-gradient-primary hover:text-white flex items-center justify-center transition-all border border-border/30 hover:border-primary/30"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([key, section], columnIndex) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: columnIndex * 0.1 }}
            >
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, index) => (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: columnIndex * 0.1 + index * 0.05 }}
                  >
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm inline-block relative group"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="border-t border-border/50 py-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center md:text-right">
              © 2025 FleetifyApp. جميع الحقوق محفوظة.
            </p>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                سياسة الخصوصية
              </a>
              <span className="text-border">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                شروط الخدمة
              </a>
              <span className="text-border">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                سياسة الكوكيز
              </a>
              <span className="text-border">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                GDPR
              </a>
            </div>

            {/* Made with love */}
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              صُنع بـ <span className="text-red-500">❤️</span> في الكويت
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

