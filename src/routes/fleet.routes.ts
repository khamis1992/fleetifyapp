/**
 * Fleet Management Routes
 * Routes for vehicle management, maintenance, violations, etc.
 */

import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy loaded components
const Fleet = lazy(() => import('@/pages/fleet/FleetPageNew'));
const FleetPageNew = lazy(() => import('@/pages/fleet/FleetPageRedesigned'));
const VehicleDetailsPage = lazy(() => import('@/components/fleet/VehicleDetailsPage'));
const VehicleDetailsPageNew = lazy(() => import('@/components/fleet/VehicleDetailsPageNew'));
const Maintenance = lazy(() => import('@/pages/fleet/MaintenanceRedesigned'));
const TrafficViolations = lazy(() => import('@/pages/fleet/TrafficViolationsRedesigned'));
const TrafficViolationPayments = lazy(() => import('@/pages/fleet/TrafficViolationPayments'));
const FleetReports = lazy(() => import('@/pages/fleet/FleetReports'));
const DispatchPermits = lazy(() => import('@/pages/fleet/DispatchPermits'));
const ReservationSystem = lazy(() => import('@/pages/fleet/ReservationSystem'));
const VehicleInstallments = lazy(() => import('@/pages/VehicleInstallments'));

export const fleetRoutes: RouteConfig[] = [
  {
    path: '/fleet',
    component: FleetPageNew,
    lazy: true,
    exact: true,
    title: 'إدارة الأسطول',
    description: 'Fleet management',
    group: 'fleet',
    priority: 30,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/legacy',
    component: Fleet,
    lazy: true,
    exact: true,
    title: 'إدارة الأسطول (القديم)',
    description: 'Legacy fleet management',
    group: 'fleet',
    priority: 31,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/vehicles/:vehicleId',
    component: VehicleDetailsPageNew,
    lazy: true,
    exact: true,
    title: 'تفاصيل المركبة',
    description: 'Vehicle details',
    group: 'fleet',
    priority: 32,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/vehicles/:vehicleId/legacy',
    component: VehicleDetailsPage,
    lazy: true,
    exact: true,
    title: 'تفاصيل المركبة (القديم)',
    description: 'Legacy vehicle details',
    group: 'fleet',
    priority: 33,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/maintenance',
    component: Maintenance,
    lazy: true,
    exact: true,
    title: 'الصيانة',
    description: 'Vehicle maintenance',
    group: 'fleet',
    priority: 34,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/traffic-violations',
    component: TrafficViolations,
    lazy: true,
    exact: true,
    title: 'المخالفات المرورية',
    description: 'Traffic violations',
    group: 'fleet',
    priority: 35,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/traffic-violation-payments',
    component: TrafficViolationPayments,
    lazy: true,
    exact: true,
    title: 'مدفوعات المخالفات',
    description: 'Traffic violation payments',
    group: 'fleet',
    priority: 36,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/reports',
    component: FleetReports,
    lazy: true,
    exact: true,
    title: 'تقارير الأسطول',
    description: 'Fleet reports',
    group: 'fleet',
    priority: 37,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/dispatch-permits',
    component: DispatchPermits,
    lazy: true,
    exact: true,
    title: 'تصاريح الحركة',
    description: 'Dispatch permits',
    group: 'fleet',
    priority: 38,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/reservation-system',
    component: ReservationSystem,
    lazy: true,
    exact: true,
    title: 'نظام الحجوزات',
    description: 'Reservation system',
    group: 'fleet',
    priority: 40,
    protected: true,
    layout: 'bento',
  },
  {
    path: '/fleet/vehicle-installments',
    component: VehicleInstallments,
    lazy: true,
    exact: true,
    title: 'أقساط المركبات',
    description: 'Vehicle installments',
    group: 'fleet',
    priority: 41,
    protected: true,
    layout: 'bento',
  },
];

export default fleetRoutes;

