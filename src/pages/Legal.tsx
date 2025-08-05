import React from 'react';
import { LegalAIDashboard } from '@/components/legal/LegalAIDashboard';

const Legal = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المستشار القانوني الذكي</h1>
          <p className="text-muted-foreground">محادثة مع المستشار القانوني المدعوم بالذكاء الاصطناعي</p>
        </div>
      </div>

      <LegalAIDashboard />
    </div>
  );
};

export default Legal;