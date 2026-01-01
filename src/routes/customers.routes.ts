/**
 * Customers Routes
 * Routes for customer management and CRM
 * 
 * ملاحظة: تم حذف صفحات تفاصيل العميل المنفصلة
 * يتم عرض التفاصيل في Side Panel داخل صفحة العملاء
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const Customers = lazy(() => import('@/pages/Customers'));
const CustomersPageNew = lazy(() => import('@/pages/customers/CustomersPageNew'));
const CustomerCRM = lazy(() => import('@/pages/customers/CustomerCRMNew'));
// Redirect component for old customer details URLs
const CustomerDetailsRedirect = lazy(() => import('@/components/customers/CustomerDetailsRedirect'));

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
  // Redirect old customer details URLs to customers list
  {
    path: '/customers/:customerId',
    component: CustomerDetailsRedirect,
    lazy: true,
    exact: true,
    title: 'إعادة توجيه',
    description: 'Redirect to customers list',
    group: 'customers',
    priority: 22,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/customers/:customerId/legacy',
    component: CustomerDetailsRedirect,
    lazy: true,
    exact: true,
    title: 'إعادة توجيه',
    description: 'Redirect to customers list',
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

