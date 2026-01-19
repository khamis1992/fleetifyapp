import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationHistoryItem {
  path: string;
  timestamp: number;
  title?: string;
}

const MAX_HISTORY_ITEMS = 20;
const STORAGE_KEY = 'navigation_history';

export const useNavigationHistory = () => {
  const location = useLocation();
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading navigation history:', error);
    }
  }, []);

  // Add current location to history
  useEffect(() => {
    const newItem: NavigationHistoryItem = {
      path: location.pathname,
      timestamp: Date.now(),
      title: document.title
    };

    setHistory(prevHistory => {
      // Don't add duplicate consecutive entries
      if (prevHistory.length > 0 && prevHistory[0].path === newItem.path) {
        return prevHistory;
      }

      const newHistory = [newItem, ...prevHistory.slice(0, MAX_HISTORY_ITEMS - 1)];
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Error saving navigation history:', error);
      }

      return newHistory;
    });
  }, [location.pathname]);

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing navigation history:', error);
    }
  };

  const getRecentPages = (limit: number = 5) => {
    return history.slice(0, limit);
  };

  const getFrequentPages = (limit: number = 5) => {
    const pathCounts = history.reduce((acc, item) => {
      acc[item.path] = (acc[item.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([path, count]) => {
        const lastVisit = history.find(item => item.path === path);
        return {
          path,
          count,
          title: lastVisit?.title,
          timestamp: lastVisit?.timestamp || 0
        };
      });
  };

  const hasVisited = (path: string): boolean => {
    return history.some(item => item.path === path);
  };

  const getLastVisit = (path: string): NavigationHistoryItem | undefined => {
    return history.find(item => item.path === path);
  };

  return {
    history,
    clearHistory,
    getRecentPages,
    getFrequentPages,
    hasVisited,
    getLastVisit
  };
};