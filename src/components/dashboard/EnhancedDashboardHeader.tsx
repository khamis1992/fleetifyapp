import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Eye, ArrowLeft, Calendar, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface EnhancedDashboardHeaderProps {
  isBrowsingMode?: boolean;
  browsedCompany?: any;
  onExitBrowseMode?: () => void;
}

const EnhancedDashboardHeader: React.FC<EnhancedDashboardHeaderProps> = ({
  isBrowsingMode,
  browsedCompany,
  onExitBrowseMode
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  const getCurrentDate = () => {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  };

  const getInitials = () => {
    const firstName = user?.profile?.first_name_ar || user?.profile?.first_name || '';
    const lastName = user?.profile?.last_name_ar || user?.profile?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <>
      {/* Browse Mode Indicator - Enhanced */}
      {isBrowsingMode && browsedCompany && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border border-warning/20 rounded-xl p-4 mb-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="p-3 rounded-lg bg-warning/10 text-warning"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Eye size={18} />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-warning mb-1">
                  وضع المشاهدة مفعل
                </p>
                <p className="text-xs text-muted-foreground">
                  تصفح بيانات: {browsedCompany.name_ar || browsedCompany.name}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onExitBrowseMode}
              className="h-9 hover:bg-warning/10 hover:text-warning border-warning/20"
            >
              <ArrowLeft size={14} className="ml-2" />
              العودة لشركتي
            </Button>
          </div>
        </motion.div>
      )}

      {/* Enhanced Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="bg-gradient-to-br from-card/60 via-card/40 to-card/20 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-6 flex-1">
              {/* Header Info */}
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 rounded-xl bg-primary/10 text-primary shadow-sm"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Target size={24} />
                </motion.div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    لوحة التحكم المهنية
                  </span>
                  {isBrowsingMode && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye size={10} className="ml-1" />
                      معاينة
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Main Greeting */}
              <div className="space-y-3">
                <h1 className="text-5xl font-bold text-foreground leading-tight">
                  {getGreeting()}, {user?.profile?.first_name_ar || user?.profile?.first_name || 'أهلاً وسهلاً'}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {isBrowsingMode && browsedCompany
                    ? `نظرة عامة على أداء ${browsedCompany.name_ar || browsedCompany.name}`
                    : 'نظرة عامة على أداء شركتك اليوم'
                  }
                </p>
                
                {/* Date and Time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={16} />
                  <span>{getCurrentDate()}</span>
                </div>
              </div>
            </div>
            
            {/* Right Side Content */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Animated Icon */}
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Zap size={36} />
              </motion.div>
              
              {/* Quick Actions */}
              <div className="flex flex-col gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10">
                      <Bell size={16} className="ml-2" />
                      الإشعارات
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>الإشعارات الحديثة</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <span className="text-sm text-muted-foreground">لا توجد إشعارات جديدة</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10">
                      <Avatar className="w-6 h-6 ml-2">
                        <AvatarImage src={user?.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                      </Avatar>
                      الملف الشخصي
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="ml-2 h-4 w-4" />
                      الإعدادات
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default EnhancedDashboardHeader;