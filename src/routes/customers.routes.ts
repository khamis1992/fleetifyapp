/**
 * Customers Routes
 * Routes for customer management and CRM
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const Customers = lazy(() => import('@/pages/customers/CustomersPageNew'));
const CustomersPageNew = lazy(() => import('@/pages/customers/CustomersPageNew'));
const CustomerDetailsPage = lazy(() => import('@/components/customers/CustomerDetailsPage'));
const CustomerDetailsPageNew = lazy(() => import('@/components/customers/CustomerDetailsPageNew'));
const CustomerCRM = lazy(() => import('@/pages/customers/CustomerCRMNew'));

export const customersRoutes: RouteConfig[] = [
  {
    path: '/customers',
    component: CustomersPageNew,
    lazy: true,
    exact: true,
    title: 'العملاء',
    description: 'Customer management',
    group: 'customers',
    priority: 20,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/customers/legacy',
    component: Customers,
    lazy: true,
    exact: true,
    title: 'العملاء (القديم)',
    description: 'Legacy customer management',
    group: 'customers',
    priority: 21,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/customers/:customerId',
    component: CustomerDetailsPageNew,
    lazy: true,
    exact: true,
    title: 'تفاصيل العميل',
    description: 'Customer details',
    group: 'customers',
    priority: 22,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/customers/:customerId/legacy',
    component: CustomerDetailsPage,
    lazy: true,
    exact: true,
    title: 'تفاصيل العميل (القديم)',
    description: 'Legacy customer details',
    group: 'customers',
    priority: 23,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/customer-crm',
    component: CustomerCRM,
    lazy: true,
    exact: true,
    title: 'إدارة علاقات العملاء',
    description: 'Customer relationship management',
    group: 'customers',
    priority: 24,
    protected: true,
    layout: 'bento',
  },
];

export default customersRoutes;

