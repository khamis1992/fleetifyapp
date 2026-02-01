/**
 * Mobile Employee Header
 * Header لصفحات تطبيق مساحة عمل الموظف
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Bell, 
  RefreshCw,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeNotifications } from '@/hooks/useEmployeeNotifications';

interface MobileEmployeeHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showRefresh?: boolean;
  showMenu?: boolean;
  onRefresh?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export const MobileEmployeeHeader: React.FC<MobileEmployeeHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showNotifications = true,
  showRefresh = false,
  showMenu = false,
  onRefresh,
  onMenuClick,
  className,
}) => {
  const navigate = useNavigate();
  const { stats } = useEmployeeNotifications();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center justify-between px-4 py-4',
        className
      )}
    >
      {/* Left Side */}
      <div className="flex items-center gap-3">
        {showBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/50 hover:bg-white transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </motion.button>
        )}

        {showMenu && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onMenuClick}
            className="p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/50 hover:bg-white transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </motion.button>
        )}

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {showRefresh && onRefresh && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/50 hover:bg-white transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </motion.button>
        )}

        {showNotifications && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/mobile/employee/notifications')}
            className="relative p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/50 hover:bg-white transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {stats.unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center"
              >
                {stats.unread > 99 ? '99+' : stats.unread}
              </motion.span>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default MobileEmployeeHeader;
