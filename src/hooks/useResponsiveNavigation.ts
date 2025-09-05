import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useResponsiveBreakpoint } from './use-mobile';

export interface NavigationState {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  activeSection: string;
  navigationMode: 'sidebar' | 'bottom' | 'drawer';
}

export function useResponsiveNavigation() {
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint();
  const location = useLocation();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isSidebarOpen: !isMobile,
    isMobileMenuOpen: false,
    activeSection: 'dashboard',
    navigationMode: isMobile ? 'bottom' : 'sidebar'
  });

  // Update navigation mode based on screen size
  useEffect(() => {
    const newMode: NavigationState['navigationMode'] = 
      isMobile ? 'bottom' : 
      isTablet ? 'drawer' : 
      'sidebar';
    
    setNavigationState(prev => ({
      ...prev,
      navigationMode: newMode,
      isSidebarOpen: isDesktop,
      isMobileMenuOpen: false
    }));
  }, [isMobile, isTablet, isDesktop]);

  // Update active section based on current route
  useEffect(() => {
    const path = location.pathname;
    let section = 'dashboard';
    
    if (path.startsWith('/customers')) section = 'customers';
    else if (path.startsWith('/contracts')) section = 'contracts';
    else if (path.startsWith('/fleet')) section = 'fleet';
    else if (path.startsWith('/finance')) section = 'finance';
    else if (path.startsWith('/hr')) section = 'hr';
    else if (path.startsWith('/reports')) section = 'reports';
    else if (path.startsWith('/legal')) section = 'legal';
    
    setNavigationState(prev => ({
      ...prev,
      activeSection: section
    }));
  }, [location.pathname]);

  const toggleSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      isSidebarOpen: !prev.isSidebarOpen
    }));
  };

  const toggleMobileMenu = () => {
    setNavigationState(prev => ({
      ...prev,
      isMobileMenuOpen: !prev.isMobileMenuOpen
    }));
  };

  const closeMobileMenu = () => {
    setNavigationState(prev => ({
      ...prev,
      isMobileMenuOpen: false
    }));
  };

  const openSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      isSidebarOpen: true
    }));
  };

  const closeSidebar = () => {
    setNavigationState(prev => ({
      ...prev,
      isSidebarOpen: false
    }));
  };

  // Auto-close mobile menu when navigating
  useEffect(() => {
    if (isMobile) {
      closeMobileMenu();
    }
  }, [location.pathname, isMobile]);

  return {
    ...navigationState,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    openSidebar,
    closeSidebar,
    isMobile,
    isTablet,
    isDesktop
  };
}