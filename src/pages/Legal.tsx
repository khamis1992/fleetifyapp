import React from 'react';
import { UnifiedLegalAIAssistant } from '@/components/legal/UnifiedLegalAIAssistant';

const Legal = () => {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <UnifiedLegalAIAssistant />
      </div>
    </div>
  );
};

export default Legal;