import React, { createContext, useContext, useState } from 'react';

interface CustomerViewContextType {
  viewAllCustomers: boolean;
  setViewAllCustomers: (value: boolean) => void;
}

const CustomerViewContext = createContext<CustomerViewContextType | undefined>(undefined);

export const useCustomerViewContext = () => {
  const context = useContext(CustomerViewContext);
  if (context === undefined) {
    throw new Error('useCustomerViewContext must be used within a CustomerViewProvider');
  }
  return context;
};

interface CustomerViewProviderProps {
  children: React.ReactNode;
}

export const CustomerViewProvider: React.FC<CustomerViewProviderProps> = ({ children }) => {
  const [viewAllCustomers, setViewAllCustomers] = useState(false);

  const value: CustomerViewContextType = {
    viewAllCustomers,
    setViewAllCustomers,
  };

  return (
    <CustomerViewContext.Provider value={value}>
      {children}
    </CustomerViewContext.Provider>
  );
};