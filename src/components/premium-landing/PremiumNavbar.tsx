import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PremiumNavbarProps {
  scrolled: boolean;
}

export function PremiumNavbar({ scrolled }: PremiumNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: 'الميزات', href: '#features' },
    { label: 'الأسعار', href: '#pricing' },
    { label: 'التقييمات', href: '#testimonials' },
    { label: 'تواصل معنا', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-3 space-x-reverse"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-full" />
              <div className="relative w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elevated">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FleetifyApp
              </h1>
              <p className="text-xs text-muted-foreground">نظام ERP الشامل</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:flex items-center space-x-8 space-x-reverse"
          >
            {navItems.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="text-foreground/80 hover:text-primary transition-colors font-medium relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary transition-all duration-300 group-hover:w-full" />
              </motion.a>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="hidden lg:flex items-center space-x-4 space-x-reverse"
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="hover:bg-primary/10"
            >
              تسجيل الدخول
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-gradient-primary hover:opacity-90 transition-opacity group"
            >
              ابدأ تجربتك المجانية
              <ArrowRight className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-accent/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          height: mobileMenuOpen ? 'auto' : 0,
          opacity: mobileMenuOpen ? 1 : 0,
        }}
        className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border/50"
      >
        <div className="container mx-auto px-4 py-6 space-y-4">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block py-2 text-foreground/80 hover:text-primary transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="pt-4 space-y-3 border-t border-border/30">
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              تسجيل الدخول
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="w-full bg-gradient-primary"
            >
              ابدأ تجربتك المجانية
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
}

