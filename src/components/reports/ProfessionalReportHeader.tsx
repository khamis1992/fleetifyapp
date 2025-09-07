import React from 'react';
import { Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { formatDateForDocument } from '@/utils/dateFormatter';

interface ProfessionalReportHeaderProps {
  reportTitle: string;
  reportId: string;
  moduleType: string;
  generatedAt?: Date;
}

export function ProfessionalReportHeader({ 
  reportTitle, 
  reportId, 
  moduleType, 
  generatedAt = new Date() 
}: ProfessionalReportHeaderProps) {
  return (
    <div className="bg-gradient-card border-b border-border/50 print:bg-white print:border-b-2 print:border-border">
      {/* Company Header */}
      <div className="flex items-center justify-between p-6 print:p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center print:bg-primary">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground arabic-heading-md print:text-black">
              شركة الكويت للإيجار
            </h1>
            <p className="text-sm text-muted-foreground print:text-gray-600">
              نظام إدارة الموارد المؤسسية المتقدم
            </p>
          </div>
        </div>
        
        <div className="text-left print:text-right">
          <div className="space-y-1 text-sm text-muted-foreground print:text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>الكويت، مدينة الكويت</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span dir="ltr">+965 2222 3333</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span dir="ltr">info@kwrent.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span dir="ltr">www.kwrent.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Information */}
      <div className="bg-accent/10 border-t border-border/30 px-6 py-4 print:bg-gray-50 print:border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground arabic-heading-sm print:text-black">
              {reportTitle}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground print:text-gray-600">
              <span>رقم التقرير: {reportId}</span>
              <span>نوع الوحدة: {moduleType}</span>
            </div>
          </div>
          
          <div className="text-left print:text-right">
            <div className="text-sm text-muted-foreground print:text-gray-600">
              <div>تاريخ الإنشاء: {formatDateForDocument(generatedAt)}</div>
              <div>الوقت: {generatedAt.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
              })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}