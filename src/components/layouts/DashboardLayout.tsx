import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Menu,
  Home,
  Shield,
  BarChart3
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigationItems = [
  { 
    name: 'لوحة التحكم', 
    name_en: 'Dashboard',
    href: '/dashboard', 
    icon: Home 
  },
  { 
    name: 'الأسطول', 
    name_en: 'Fleet',
    href: '/fleet', 
    icon: Car 
  },
  { 
    name: 'العقود', 
    name_en: 'Contracts',
    href: '/contracts', 
    icon: FileText 
  },
  { 
    name: 'العملاء', 
    name_en: 'Customers',
    href: '/customers', 
    icon: Users 
  },
  { 
    name: 'المالية', 
    name_en: 'Finance',
    href: '/finance', 
    icon: DollarSign 
  },
  { 
    name: 'التقارير', 
    name_en: 'Reports',
    href: '/reports', 
    icon: BarChart3 
  },
  { 
    name: 'الشؤون القانونية', 
    name_en: 'Legal',
    href: '/legal', 
    icon: Shield 
  },
];

const Sidebar = ({ className = "" }: { className?: string }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`h-screen bg-gradient-to-br from-primary via-primary-light to-accent p-6 text-primary-foreground ${className}`}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
          KW RentFlow
        </h1>
        <p className="text-sm text-center text-primary-foreground/80 mt-1">
          نظام إدارة تأجير السيارات
        </p>
      </div>

      {/* User Info */}
      <div className="mb-6 p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
        <div className="text-sm font-medium">
          {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
        </div>
        <div className="text-xs text-primary-foreground/70">
          {user?.profile?.position || 'موظف'}
        </div>
        {user?.company && (
          <div className="text-xs text-accent-light mt-1">
            {user.company.name_ar || user.company.name}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-foreground/20 text-accent shadow-accent/20 shadow-lg'
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="space-y-2 mt-8">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-foreground/10 transition-all"
        >
          <Settings className="h-5 w-5" />
          <span>الإعدادات</span>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-primary-foreground hover:bg-destructive/20 hover:text-destructive-foreground"
        >
          <LogOut className="h-5 w-5" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background-soft" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-80 lg:fixed lg:inset-y-0 lg:right-0 lg:z-50">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">KW RentFlow</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="lg:mr-80">
        <main className="min-h-screen p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};