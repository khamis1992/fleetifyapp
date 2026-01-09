import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHome } from './MobileHome';
import { MobileContracts } from './MobileContracts';
import MobileCars from './MobileCars';
import MobileOverdue from './MobileOverdue';

interface MobileAppProps {
  initialTab?: 'home' | 'contracts' | 'cars' | 'overdue';
}

export const MobileApp: React.FC<MobileAppProps> = ({ initialTab = 'home' }) => {
  const [currentTab, setCurrentTab] = useState<'home' | 'contracts' | 'cars' | 'overdue'>(initialTab);

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
      {renderContent()}
    </MobileLayout>
  );
};

export default MobileApp;
