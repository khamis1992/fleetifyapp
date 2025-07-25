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
    <div className={`h-screen bg-sidebar text-sidebar-foreground ${className}`}>
      {/* Sidebar Header */}
      <div className="p-6 border-b border-sidebar-border/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              البشائر الخليجية
            </h1>
            <p className="text-xs text-sidebar-foreground/70">
              مدير التاجر
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigationItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-base ${
                isActive
                  ? 'bg-sidebar-primary/20 text-sidebar-primary border-l-4 border-sidebar-primary'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-sidebar-border/20">
        <div className="flex items-center gap-3 p-3 bg-sidebar-accent/20 rounded-lg">
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-sidebar-foreground">
              {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م').charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
            </div>
            <div className="text-xs text-sidebar-foreground/70 truncate">
              {user?.profile?.position || 'موظف'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 space-y-1 border-t border-sidebar-border/20">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground transition-base"
        >
          <Settings className="h-4 w-4" />
          <span>الإعدادات</span>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
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
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background-secondary" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:fixed lg:inset-y-0 lg:right-0 lg:z-50">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">البشائر الخليجية</h1>
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
      <div className="lg:mr-64">
        <main className="min-h-screen p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};