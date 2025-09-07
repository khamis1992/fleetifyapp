import React from 'react';

export function ProfessionalReportFooter() {
  const currentDate = new Date();
  
  return (
    <footer className="border-t pt-4 mt-8 text-sm text-gray-500 text-center print:text-gray-500">
      تم إنشاء هذا التقرير بواسطة نظام إدارة الشركات بتاريخ 
      <span className="font-semibold">
        {currentDate.toLocaleDateString('ar-SA')} - {currentDate.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        })}
      </span>
    </footer>
  );
}