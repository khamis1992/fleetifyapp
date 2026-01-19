import React from 'react';

interface NoDataMessageProps {
  message?: string;
}

export function NoDataMessage({ message = 'لا توجد سجلات متاحة للفترة المحددة' }: NoDataMessageProps) {
  return (
    <section className="mb-6">
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 text-center text-slate-600 font-medium">
        {message}
      </div>
    </section>
  );
}