/**
 * LocationBasedKey Component
 * 
 * Forces React to remount child components when the location changes
 * This ensures that pages reload properly when navigating between routes
 * 
 * Problem: When navigating between pages using the sidebar, components
 * were not remounting, causing stale data to be displayed
 * 
 * Solution: Use location.pathname as a key prop to force remounting
 */

import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface LocationBasedKeyProps {
  children: ReactNode;
}

export const LocationBasedKey: React.FC<LocationBasedKeyProps> = ({ children }) => {
  const location = useLocation();
  
  // Create a unique key based on the current location pathname only
  // We exclude search params to avoid remounting when user types in search fields
  // This forces React to unmount and remount only when the actual page path changes
  const locationKey = location.pathname;
  
  return (
    <div key={locationKey} className="h-full w-full">
      {children}
    </div>
  );
};

LocationBasedKey.displayName = 'LocationBasedKey';
