import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * Finance Context
 * إدارة السياق المالي عبر التطبيق للحفاظ على حالة المستخدم وتدفق العمليات
 */

export type FinanceRole = 'cashier' | 'accountant' | 'manager' | 'admin';
export type FinanceWorkflow = 
  | 'receive_payment'
  | 'create_invoice'
  | 'pay_vendor'
  | 'journal_entry'
  | 'month_end_close'
  | null;

// Context data type definition
export type FinanceContextData = {
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  lastAmount?: number;
  lastAccount?: string;
};

interface FinanceContextState {
  // User Role
  userRole: FinanceRole;
  setUserRole: (role: FinanceRole) => void;

  // Current Workflow
  currentWorkflow: FinanceWorkflow;
  setCurrentWorkflow: (workflow: FinanceWorkflow) => void;
  workflowData: Record<string, any>;
  updateWorkflowData: (data: Record<string, any>) => void;
  clearWorkflow: () => void;

  // Context (للحفاظ على السياق عند التنقل)
  context: FinanceContextData;

  updateContext: (newContext: Partial<FinanceContextData>) => void;
  clearContext: () => void;

  // Recent Activities
  recentActivities: Activity[];
  addActivity: (activity: Activity) => void;

  // Quick Access
  frequentAccounts: string[];
  updateFrequentAccounts: (accountId: string) => void;
}

interface Activity {
  id: string;
  type: 'payment' | 'invoice' | 'journal_entry' | 'report';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  action?: () => void;
}

const FinanceContext = createContext<FinanceContextState | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<FinanceRole>('accountant');
  const [currentWorkflow, setCurrentWorkflow] = useState<FinanceWorkflow>(null);
  const [workflowData, setWorkflowData] = useState<Record<string, any>>({});
  const [context, setContext] = useState<FinanceContextState['context']>({});
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [frequentAccounts, setFrequentAccounts] = useState<string[]>([]);

  const updateWorkflowData = useCallback((data: Record<string, any>) => {
    setWorkflowData(prev => ({ ...prev, ...data }));
  }, []);

  const clearWorkflow = useCallback(() => {
    setCurrentWorkflow(null);
    setWorkflowData({});
  }, []);

  const updateContext = useCallback((newContext: Partial<FinanceContextState['context']>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const clearContext = useCallback(() => {
    setContext({});
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setRecentActivities(prev => [activity, ...prev.slice(0, 9)]); // Keep last 10
  }, []);

  const updateFrequentAccounts = useCallback((accountId: string) => {
    setFrequentAccounts(prev => {
      const updated = [accountId, ...prev.filter(id => id !== accountId)];
      return updated.slice(0, 5); // Keep top 5
    });
  }, []);

  // OPTIMIZATION: Memoize context value to prevent unnecessary re-renders
  const value = useMemo<FinanceContextState>(() => ({
    userRole,
    setUserRole,
    currentWorkflow,
    setCurrentWorkflow,
    workflowData,
    updateWorkflowData,
    clearWorkflow,
    context,
    updateContext,
    clearContext,
    recentActivities,
    addActivity,
    frequentAccounts,
    updateFrequentAccounts,
  }), [
    userRole,
    currentWorkflow,
    workflowData,
    context,
    recentActivities,
    frequentAccounts,
    updateWorkflowData,
    clearWorkflow,
    updateContext,
    clearContext,
    addActivity,
    updateFrequentAccounts,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinanceContext = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within FinanceProvider');
  }
  return context;
};

// Hook للحصول على دور المستخدم المالي
export const useFinanceRole = () => {
  const { userRole } = useFinanceContext();
  return userRole;
};

// Hook للعمليات (Workflows)
export const useFinanceWorkflow = () => {
  const {
    currentWorkflow,
    setCurrentWorkflow,
    workflowData,
    updateWorkflowData,
    clearWorkflow,
  } = useFinanceContext();

  return {
    currentWorkflow,
    startWorkflow: setCurrentWorkflow,
    workflowData,
    updateData: updateWorkflowData,
    completeWorkflow: clearWorkflow,
  };
};

