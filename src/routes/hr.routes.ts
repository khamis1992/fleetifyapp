/**
 * HR Routes
 * Routes for human resources management
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const Employees = lazy(() => import('@/pages/hr/Employees'));
const UserManagement = lazy(() => import('@/pages/hr/UserManagement'));
const Attendance = lazy(() => import('@/pages/hr/Attendance'));
const LeaveManagement = lazy(() => import('@/pages/hr/LeaveManagement'));
const LocationSettings = lazy(() => import('@/pages/hr/LocationSettings'));
const Payroll = lazy(() => import('@/pages/hr/Payroll'));
const HRReports = lazy(() => import('@/pages/hr/Reports'));
const HRSettings = lazy(() => import('@/pages/hr/Settings'));

export const hrRoutes: RouteConfig[] = [
  {
    path: '/hr/employees',
    component: Employees,
    lazy: true,
    exact: true,
    title: 'إدارة الموظفين',
    description: 'Employee management',
    group: 'hr',
    priority: 70,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/users',
    component: UserManagement,
    lazy: true,
    exact: true,
    title: 'إدارة المستخدمين',
    description: 'User management',
    group: 'hr',
    priority: 71,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/attendance',
    component: Attendance,
    lazy: true,
    exact: true,
    title: 'الحضور والانصراف',
    description: 'Attendance tracking',
    group: 'hr',
    priority: 72,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/leave-management',
    component: LeaveManagement,
    lazy: true,
    exact: true,
    title: 'إدارة الإجازات',
    description: 'Leave management',
    group: 'hr',
    priority: 73,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/location-settings',
    component: LocationSettings,
    lazy: true,
    exact: true,
    title: 'إعدادات المواقع',
    description: 'Location settings',
    group: 'hr',
    priority: 74,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/payroll',
    component: Payroll,
    lazy: true,
    exact: true,
    title: 'الرواتب',
    description: 'Payroll',
    group: 'hr',
    priority: 75,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/reports',
    component: HRReports,
    lazy: true,
    exact: true,
    title: 'تقارير الموارد البشرية',
    description: 'HR reports',
    group: 'hr',
    priority: 76,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/hr/settings',
    component: HRSettings,
    lazy: true,
    exact: true,
    title: 'إعدادات الموارد البشرية',
    description: 'HR settings',
    group: 'hr',
    priority: 77,
    protected: true,
    layout: 'bento',
  },
];

export default hrRoutes;

