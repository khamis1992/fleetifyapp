import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface EnterpriseNavbarProps {
  scrolled?: boolean;
}

export function EnterpriseNavbar({ scrolled = false }: EnterpriseNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { name: 'مقارنة', href: '#comparison' },
    { name: 'التغطية', href: '#coverage' },
    { name: 'تجربة مباشرة', href: '#demo' },
    { name: 'الأسعار', href: '#pricing' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-800' : 'bg-transparent'
      }`}
      dir="rtl"
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Fleetify */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className={`text-2xl font-bold ${scrolled ? 'text-white' : 'text-white'}`}>
              Fleetify
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <motion.a
                key={link.name}
                href={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`font-semibold transition-colors hover:text-teal-400 text-white/90`}
              >
                {link.name}
              </motion.a>
            ))}
          </div>

          {/* Desktop CTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex items-center gap-4"
          >
            <button
              onClick={() => navigate('/auth/login')}
              className="font-semibold text-white/90 hover:text-teal-400 transition-colors"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-lg hover:shadow-xl"
            >
              ابدأ الآن
            </button>
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-900 border-t border-slate-800 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-white font-semibold hover:text-teal-400"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 space-y-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    navigate('/auth/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-white font-semibold hover:text-teal-400"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => {
                    navigate('/onboarding');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-teal-500 text-white rounded-xl font-semibold"
                >
                  ابدأ الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
