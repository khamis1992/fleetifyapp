import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AIChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    return { isOpen: false, openChat: () => {}, closeChat: () => {}, toggleChat: () => {} };
  }
  return context;
};

export const AIChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <AIChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
    </AIChatContext.Provider>
  );
};
