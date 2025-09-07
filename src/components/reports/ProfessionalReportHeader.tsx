import React from 'react';
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
    <header className="border-b-4 border-gray-700 pb-4 mb-6 print:border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">شركة الكويت للإيجار</h1>
          <h2 className="text-lg text-gray-500">{reportTitle}</h2>
        </div>
        <div className="text-sm text-gray-600">
          <p>تاريخ التقرير: <span className="font-semibold">{formatDateForDocument(generatedAt)}</span></p>
          <p>الوقت: <span className="font-semibold">{generatedAt.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })}</span></p>
        </div>
      </div>
    </header>
  );
}