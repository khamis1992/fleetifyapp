import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHome } from './MobileHome';
import { MobileContracts } from './MobileContracts';
import MobileCars from './MobileCars';
import MobileOverdue from './MobileOverdue';

export const MobileApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'contracts' | 'cars' | 'overdue'>('home');

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <MobileHome key="home" />;
      case 'contracts':
        return <MobileContracts key="contracts" />;
      case 'cars':
        return <MobileCars key="cars" />;
      case 'overdue':
        return <MobileOverdue key="overdue" />;
      default:
        return <MobileHome key="home" />;
    }
  };

  return (
    <MobileLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </MobileLayout>
  );
};

export default MobileApp;
