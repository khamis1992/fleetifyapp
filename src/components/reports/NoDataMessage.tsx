import React from 'react';

interface NoDataMessageProps {
  message?: string;
}

export function NoDataMessage({ message = 'لا توجد سجلات متاحة للفترة المحددة' }: NoDataMessageProps) {
  return (
    <section className="mb-6">
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-gray-600 font-medium">
        {message}
      </div>
    </section>
  );
}