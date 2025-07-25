import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Menu,
  BarChart3,
  Shield,
  Crown
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigationItems = [
  { 
    name: 'لوحة التحكم الرئيسية', 
    href: '/super-admin/dashboard', 
    icon: BarChart3 
  },
  { 
    name: 'إدارة الشركات', 
    href: '/super-admin/companies', 
    icon: Building2 
  },
  { 
    name: 'إدارة المستخدمين', 
    href: '/super-admin/users', 
    icon: Users 
  },
  { 
    name: 'المدفوعات والاشتراكات', 
    href: '/super-admin/payments', 
    icon: DollarSign 
  },
  { 
    name: 'تقارير النظام', 
    href: '/super-admin/reports', 
    icon: BarChart3 
  },
];

const Sidebar = ({ className = "" }: { className?: string }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`h-screen bg-gradient-to-br from-destructive via-destructive/90 to-warning p-6 text-destructive-foreground ${className}`}>
      <div className="mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Crown className="h-8 w-8 text-warning" />
          <h1 className="text-2xl font-bold text-center">
            Super Admin
          </h1>
        </div>
        <p className="text-sm text-center text-destructive-foreground/80">
          لوحة تحكم مزود الخدمة
        </p>
      </div>

      {/* User Info */}
      <div className="mb-6 p-4 bg-destructive-foreground/10 rounded-lg backdrop-blur-sm border border-destructive-foreground/20">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">
            {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
          </span>
        </div>
        <div className="text-xs text-destructive-foreground/70">
          مدير النظام الرئيسي
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-destructive-foreground/20 text-warning shadow-warning/20 shadow-lg'
                  : 'hover:bg-destructive-foreground/10'
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
          to="/super-admin/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive-foreground/10 transition-all"
        >
          <Settings className="h-5 w-5" />
          <span>إعدادات النظام</span>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-destructive-foreground hover:bg-destructive-foreground/20"
        >
          <LogOut className="h-5 w-5" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export const SuperAdminLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/super-admin" replace />;
  }

  const isSuperAdmin = user?.roles?.includes('super_admin');
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background-soft" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-80 lg:fixed lg:inset-y-0 lg:right-0 lg:z-50">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-destructive text-destructive-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-warning" />
          <h1 className="text-xl font-bold">Super Admin</h1>
        </div>
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