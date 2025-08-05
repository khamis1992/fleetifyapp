import React from 'react';
import { LegalAIDashboard } from '@/components/legal/LegalAIDashboard';

const Legal = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">المستشار القانوني الذكي</h1>
        <p className="text-muted-foreground">تفاعل مع المساعد القانوني الذكي للحصول على استشارات قانونية</p>
      </div>
      
      <LegalAIDashboard />
    </div>
  );
};

export default Legal;