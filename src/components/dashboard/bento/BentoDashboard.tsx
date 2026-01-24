import React from 'react';
import BentoDashboardRedesigned from './BentoDashboardRedesigned';

/**
 * Wrapper component to redirect all legacy usages of BentoDashboard to the new Redesigned version.
 * This ensures that no matter which file imports this component, they get the new design.
 */
const BentoDashboard: React.FC = () => {
  return <BentoDashboardRedesigned />;
};

export default BentoDashboard;
