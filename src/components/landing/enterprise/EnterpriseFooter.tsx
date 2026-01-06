import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnterpriseFooter() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'المنتج',
      links: [
        { name: 'مقارنة', href: '#comparison' },
        { name: 'التغطية', href: '#coverage' },
        { name: 'تجربة مباشرة', href: '#demo' },
        { name: 'الأسعار', href: '#pricing' },
      ],
    },
    {
      title: 'الشركة',
      links: [
        { name: 'من نحن', href: '/about' },
        { name: 'وظائف', href: '/careers' },
      ],
    },
    {
      title: 'الدعم',
      links: [
        { name: 'مركز المساعدة', href: '/help' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', name: 'Facebook' },
    { icon: Twitter, href: '#', name: 'Twitter' },
    { icon: Linkedin, href: '#', name: 'Linkedin' },
    { icon: Instagram, href: '#', name: 'Instagram' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300" dir="rtl">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 mb-4 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-2xl font-bold text-white">Fleetify</span>
            </motion.div>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-md">
              نظام إدارة الأساطيل الأول في قطر. نساعد شركات تأجير السيارات وإدارة الأساطيل على تحسين كفاءتها وزيادة أرباحها.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-white font-bold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-slate-400 hover:text-teal-400 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Column */}
          <div>
            <h4 className="text-white font-bold mb-4">تواصل معنا</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
                <span>الدوحة، قطر</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-400" />
                <span dir="ltr">+974 4444 4444</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-400" />
                <a href="mailto:hello@fleetify.qa" className="hover:text-teal-400 transition-colors">
                  hello@fleetify.qa
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © {currentYear} Fleetify. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="/privacy-policy" className="hover:text-teal-400 transition-colors">سياسة الخصوصية</a>
              <a href="/terms-and-conditions" className="hover:text-teal-400 transition-colors">الشروط والأحكام</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
