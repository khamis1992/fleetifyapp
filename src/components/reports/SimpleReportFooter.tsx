import React from 'react';

export function SimpleReportFooter() {
  const currentDate = new Date().toLocaleDateString('ar-SA', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    calendar: 'gregory'
  });
  
  const currentTime = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <footer className="border-t pt-4 mt-8 text-sm text-gray-500 text-center">
      تم إنشاء هذا التقرير بواسطة نظام إدارة الشركات بتاريخ{' '}
      <span className="font-semibold">{currentDate} - {currentTime}</span>
    </footer>
  );
}