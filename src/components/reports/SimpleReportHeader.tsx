import React from 'react';

interface SimpleReportHeaderProps {
  title: string;
  companyName?: string;
}

export function SimpleReportHeader({ title, companyName = 'اسم الشركة' }: SimpleReportHeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-GB');
  const currentTime = new Date().toLocaleTimeString('en-GB', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <header className="border-b-4 border-gray-700 pb-4 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
          <h2 className="text-lg text-gray-500">{title}</h2>
        </div>
        <div className="text-sm text-gray-600">
          <p>تاريخ التقرير: <span className="font-semibold">{currentDate}</span></p>
          <p>الوقت: <span className="font-semibold">{currentTime}</span></p>
        </div>
      </div>
    </header>
  );
}