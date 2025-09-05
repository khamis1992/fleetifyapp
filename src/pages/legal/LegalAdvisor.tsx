import React from 'react';
import EnhancedLegalAIInterface_v2 from '@/components/legal/EnhancedLegalAIInterface_v2';

const LegalAdvisor = () => {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <EnhancedLegalAIInterface_v2 />
      </div>
    </div>
  );
};

export default LegalAdvisor;