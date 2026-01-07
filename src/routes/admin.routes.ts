/**
 * Admin Routes
 * Routes for super admin and system management
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
const SuperAdminDashboard = lazy(() => import('@/pages/super-admin/Dashboard'));
const QualityDashboard = lazy(() => import('@/pages/admin/QualityDashboard'));
const SuperAdminCompanies = lazy(() => import('@/pages/super-admin/Companies'));
const CreateCompany = lazy(() => import('@/pages/super-admin/CreateCompany'));
const SuperAdminUsers = lazy(() => import('@/pages/super-admin/Users'));
const SuperAdminSettings = lazy(() => import('@/pages/super-admin/Settings'));
const SuperAdminSupport = lazy(() => import('@/pages/super-admin/Support'));
const SuperAdminPayments = lazy(() => import('@/pages/super-admin/Payments'));
const SuperAdminReports = lazy(() => import('@/pages/super-admin/Reports'));
const LandingManagement = lazy(() => import('@/pages/super-admin/LandingManagement'));

export const adminRoutes: RouteConfig[] = [
  {
    path: '/super-admin',
    component: SuperAdmin,
    lazy: true,
    exact: true,
    title: 'Super Admin',
    description: 'Super admin login',
    group: 'admin',
    priority: 100,
    protected: false,
    layout: 'none',
  },
  {
    path: '/super-admin/dashboard',
    component: SuperAdminDashboard,
    lazy: true,
    exact: true,
    title: 'لوحة تحكم المدير',
    description: 'Super admin dashboard',
    group: 'admin',
    priority: 101,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/quality-dashboard',
    component: QualityDashboard,
    lazy: true,
    exact: true,
    title: 'لوحة الجودة',
    description: 'Quality dashboard',
    group: 'admin',
    priority: 102,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/companies',
    component: SuperAdminCompanies,
    lazy: true,
    exact: true,
    title: 'إدارة الشركات',
    description: 'Company management',
    group: 'admin',
    priority: 103,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/companies/create',
    component: CreateCompany,
    lazy: true,
    exact: true,
    title: 'إنشاء شركة',
    description: 'Create company',
    group: 'admin',
    priority: 104,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/users',
    component: SuperAdminUsers,
    lazy: true,
    exact: true,
    title: 'إدارة المستخدمين',
    description: 'User management',
    group: 'admin',
    priority: 105,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/settings',
    component: SuperAdminSettings,
    lazy: true,
    exact: true,
    title: 'إعدادات النظام',
    description: 'System settings',
    group: 'admin',
    priority: 106,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/support',
    component: SuperAdminSupport,
    lazy: true,
    exact: true,
    title: 'إدارة الدعم',
    description: 'Support management',
    group: 'admin',
    priority: 107,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/payments',
    component: SuperAdminPayments,
    lazy: true,
    exact: true,
    title: 'المدفوعات والاشتراكات',
    description: 'Payments and subscriptions',
    group: 'admin',
    priority: 108,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/reports',
    component: SuperAdminReports,
    lazy: true,
    exact: true,
    title: 'تقارير النظام',
    description: 'System reports',
    group: 'admin',
    priority: 109,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
  {
    path: '/super-admin/landing-management',
    component: LandingManagement,
    lazy: true,
    exact: true,
    title: 'إدارة الصفحات المقصودة',
    description: 'Landing page management',
    group: 'admin',
    priority: 110,
    protected: true,
    requiredRole: 'super_admin',
    layout: 'admin',
  },
];

export default adminRoutes;


// Debug route for mobile troubleshooting
export const debugRoute: RouteConfig = {
  path: '/debug-logs',
  component: lazy(() => import('@/pages/DebugLogs')),
  title: 'Debug Logs',
  requiresAuth: true,
  layout: 'default',
  meta: {
    showInMenu: false,
  },
};
