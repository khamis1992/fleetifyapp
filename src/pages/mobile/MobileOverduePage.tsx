import React from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import MobileOverdue from './MobileOverdue';

/**
 * Standalone page for mobile overdue contracts
 * Wraps MobileOverdue with MobileLayout for proper tab navigation
 */
export const MobileOverduePage: React.FC = () => (
  <MobileLayout currentTab="overdue" onTabChange={() => {}}>
    <MobileOverdue key="overdue" />
  </MobileLayout>
);

export default MobileOverduePage;
