/**
 * Contracts Routes
 * Routes for contract management
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const Contracts = lazy(() => import('@/pages/Contracts'));
const ContractDetailsPage = lazy(() => import('@/components/contracts/ContractDetailsPage'));
const Quotations = lazy(() => import('@/pages/Quotations'));
const QuotationApproval = lazy(() => import('@/pages/QuotationApproval'));
const DuplicateContractsManager = lazy(() => import('@/components/contracts/DuplicateContractsManager'));
const DuplicateContractsDiagnostic = lazy(() => import('@/components/contracts/DuplicateContractsDiagnostic'));

export const contractsRoutes: RouteConfig[] = [
  {
    path: '/contracts',
    component: Contracts,
    lazy: true,
    exact: true,
    title: 'العقود',
    description: 'Contract management',
    group: 'contracts',
    priority: 25,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/contracts/:contractId',
    component: ContractDetailsPage,
    lazy: true,
    exact: true,
    title: 'تفاصيل العقد',
    description: 'Contract details',
    group: 'contracts',
    priority: 26,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/quotations',
    component: Quotations,
    lazy: true,
    exact: true,
    title: 'عروض الأسعار',
    description: 'Quotations',
    group: 'contracts',
    priority: 27,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/quotation-approval',
    component: QuotationApproval,
    lazy: true,
    exact: true,
    title: 'موافقة عروض الأسعار',
    description: 'Quotation approval',
    group: 'contracts',
    priority: 28,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/contracts/duplicates',
    component: DuplicateContractsManager,
    lazy: true,
    exact: true,
    title: 'إدارة العقود المكررة',
    description: 'Duplicate contracts manager',
    group: 'contracts',
    priority: 29,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/contracts/duplicates-diagnostic',
    component: DuplicateContractsDiagnostic,
    lazy: true,
    exact: true,
    title: 'تشخيص العقود المكررة',
    description: 'Duplicate contracts diagnostic',
    group: 'contracts',
    priority: 29,
    protected: true,
    layout: 'bento',
  },
];

export default contractsRoutes;

