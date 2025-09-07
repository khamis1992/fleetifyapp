import React from 'react';
import { Shield, Calendar, Clock, User } from 'lucide-react';
import { formatDateForDocument } from '@/utils/dateFormatter';

export function ProfessionalReportFooter() {
  const currentDate = new Date();
  
  return (
    <div className="border-t border-border/50 bg-muted/30 print:bg-gray-50 print:border-t-2">
      <div className="px-6 py-4 print:p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground print:text-gray-600">
          {/* Left side - System info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>تقرير محمي ومؤمن رقمياً</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>نظام إدارة الموارد المؤسسية</span>
            </div>
          </div>
          
          {/* Right side - Date and time */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>طُبع في: {formatDateForDocument(currentDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{currentDate.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
              })}</span>
            </div>
          </div>
        </div>
        
        {/* Company footer */}
        <div className="mt-2 pt-2 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground print:text-gray-500">
            © 2024 شركة الكويت للإيجار - جميع الحقوق محفوظة | نظام إدارة الموارد المؤسسية المتقدم
          </p>
        </div>
      </div>
    </div>
  );
}