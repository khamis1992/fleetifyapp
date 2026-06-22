/**
 * FAB Actions Hook
 * Provides page-specific FAB configurations
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Users,
  Car,
  DollarSign,
  Receipt,
  FileEdit,
  UserPlus,
  Zap,
  Settings,
} from 'lucide-react';
import { useFAB } from '@/contexts/FABContext';
import type { FABAction } from '@/types/mobile';

interface UseFABActionsOptions {
  page: 'dashboard' | 'contracts' | 'customers' | 'fleet' | 'finance';
  onAddContract?: () => void;
  onAddCustomer?: () => void;
  onAddVehicle?: () => void;
  onNewTransaction?: () => void;
  onQuickActions?: () => void;
}

export function useFABActions(options: UseFABActionsOptions) {
  const { setConfig, resetConfig } = useFAB();
  const navigate = useNavigate();

  useEffect(() => {
    const config = getFABConfig(options, navigate);
    setConfig(config);

    // Cleanup: reset FAB config when component unmounts
    return () => {
      resetConfig();
    };
  }, [
    options.page,
    options.onAddContract,
    options.onAddCustomer,
    options.onAddVehicle,
    options.onNewTransaction,
    options.onQuickActions,
    setConfig,
    resetConfig,
    navigate,
  ]);
}

function getFABConfig(
  options: UseFABActionsOptions,
  navigate: ReturnType<typeof useNavigate>
) {
  switch (options.page) {
    case 'dashboard':
      return {
        primaryAction: {
          id: 'quick-actions',
          label: 'الإجراءات السريعة',
          icon: Zap,
          onClick: options.onQuickActions || (() => {}),
        },
        menuActions: [
          {
            id: 'add-contract',
            label: 'عقد جديد',
            icon: FileText,
            onClick: () => navigate('/contracts'),
          },
          {
            id: 'add-customer',
            label: 'عميل جديد',
            icon: UserPlus,
            onClick: () => navigate('/customers'),
          },
          {
            id: 'add-vehicle',
            label: 'مركبة جديدة',
            icon: Car,
            onClick: () => navigate('/fleet'),
          },
          {
            id: 'new-transaction',
            label: 'عملية مالية',
            icon: DollarSign,
            onClick: () => navigate('/finance/payments'),
          },
        ] as FABAction[],
      };

    case 'contracts':
      return {
        primaryAction: {
          id: 'add-contract',
          label: 'عقد جديد',
          icon: Plus,
          onClick: options.onAddContract || (() => {}),
        },
        menuActions: [
          {
            id: 'express-contract',
            label: 'عقد سريع',
            icon: Zap,
            onClick: options.onAddContract || (() => {}),
            variant: 'default',
          },
          {
            id: 'add-customer',
            label: 'عميل جديد',
            icon: UserPlus,
            onClick: () => navigate('/customers'),
            variant: 'outline',
          },
          {
            id: 'bulk-invoice',
            label: 'فواتير جماعية',
            icon: Receipt,
            onClick: () => {
              // This would trigger bulk invoice generation
              // Implementation depends on parent component
            },
            variant: 'outline',
          },
        ] as FABAction[],
      };

    case 'customers':
      return {
        primaryAction: {
          id: 'add-customer',
          label: 'عميل جديد',
          icon: Plus,
          onClick: options.onAddCustomer || (() => {}),
        },
        menuActions: [
          {
            id: 'quick-customer',
            label: 'عميل سريع',
            icon: Zap,
            onClick: options.onAddCustomer || (() => {}),
            variant: 'default',
          },
          {
            id: 'import-customers',
            label: 'استيراد عملاء',
            icon: FileText,
            onClick: () => {
              // Trigger import wizard
            },
            variant: 'outline',
          },
          {
            id: 'add-contract',
            label: 'عقد جديد',
            icon: FileEdit,
            onClick: () => navigate('/contracts'),
            variant: 'outline',
          },
        ] as FABAction[],
      };

    case 'fleet':
      return {
        primaryAction: {
          id: 'add-vehicle',
          label: 'مركبة جديدة',
          icon: Plus,
          onClick: options.onAddVehicle || (() => {}),
        },
        menuActions: [
          {
            id: 'quick-vehicle',
            label: 'مركبة سريعة',
            icon: Zap,
            onClick: options.onAddVehicle || (() => {}),
            variant: 'default',
          },
          {
            id: 'import-vehicles',
            label: 'استيراد مركبات',
            icon: FileText,
            onClick: () => {
              // Trigger CSV upload
            },
            variant: 'outline',
          },
          {
            id: 'maintenance',
            label: 'صيانة جديدة',
            icon: Settings,
            onClick: () => navigate('/fleet/maintenance'),
            variant: 'outline',
          },
        ] as FABAction[],
      };

    case 'finance':
      return {
        primaryAction: {
          id: 'new-transaction',
          label: 'عملية جديدة',
          icon: Plus,
          onClick: options.onNewTransaction || (() => {}),
        },
        menuActions: [
          {
            id: 'new-payment',
            label: 'دفعة جديدة',
            icon: DollarSign,
            onClick: () => navigate('/finance/payments'),
            variant: 'default',
          },
          {
            id: 'new-invoice',
            label: 'فاتورة جديدة',
            icon: Receipt,
            onClick: () => navigate('/finance/invoices'),
            variant: 'outline',
          },
          {
            id: 'journal-entry',
            label: 'قيد يومية',
            icon: FileEdit,
            onClick: () => navigate('/finance/journal-entries'),
            variant: 'outline',
          },
        ] as FABAction[],
      };

    default:
      return {
        hidden: true,
      };
  }
}
