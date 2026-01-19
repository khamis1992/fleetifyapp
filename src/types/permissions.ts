// Permission types and interfaces for the user management system

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'accountant' | 'fleet_manager' | 'sales_agent' | 'employee';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  level: 'read' | 'write' | 'admin';
  icon?: string;
  isSystemLevel?: boolean;
}

export interface PermissionCategory {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[];
  canAssignRoles?: UserRole[];
  companyScoped?: boolean; // Indicates if permissions are scoped to the user's company
}

export interface UserPermissionState {
  userId: string;
  employeeId: string;
  roles: UserRole[];
  customPermissions: string[];
  restrictions: string[];
  lastModified: string;
  modifiedBy: string;
}

export interface PermissionChangeRequest {
  id: string;
  userId: string;
  employeeId: string;
  requestedBy: string;
  requestType: 'role_change' | 'permission_add' | 'permission_remove';
  currentRoles: UserRole[];
  requestedRoles: UserRole[];
  currentPermissions: string[];
  requestedPermissions: string[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  expiresAt: string;
}

// Default permission categories
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'hr',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    description: 'Employee management, payroll, attendance',
    icon: 'Users',
    color: 'blue',
    order: 1
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    nameAr: 'المالية والمحاسبة',
    description: 'Financial transactions, reporting, budgets',
    icon: 'DollarSign',
    color: 'green',
    order: 2
  },
  {
    id: 'operations',
    name: 'Operations',
    nameAr: 'العمليات',
    description: 'Daily operations, contracts, customers',
    icon: 'Settings',
    color: 'purple',
    order: 3
  },
  {
    id: 'fleet',
    name: 'Fleet Management',
    nameAr: 'إدارة الأسطول',
    description: 'Vehicle management, maintenance, tracking',
    icon: 'Car',
    color: 'cyan',
    order: 4
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    nameAr: 'التقارير والتحليلات',
    description: 'Generate and view reports',
    icon: 'BarChart3',
    color: 'orange',
    order: 5
  },
  {
    id: 'legal',
    name: 'Legal Department',
    nameAr: 'القسم القانوني',
    description: 'Legal cases, documents, correspondence',
    icon: 'Scale',
    color: 'indigo',
    order: 6
  },
  {
    id: 'admin',
    name: 'System Administration',
    nameAr: 'إدارة النظام',
    description: 'System settings, user management',
    icon: 'Shield',
    color: 'red',
    order: 7
  }
];

// Default permissions
export const PERMISSIONS: Permission[] = [
  // HR Permissions
  {
    id: 'hr.employees.read',
    name: 'View Employees',
    description: 'View employee information',
    category: PERMISSION_CATEGORIES[0],
    level: 'read'
  },
  {
    id: 'hr.employees.write',
    name: 'Manage Employees',
    description: 'Create, update, delete employees',
    category: PERMISSION_CATEGORIES[0],
    level: 'write'
  },
  {
    id: 'hr.payroll.read',
    name: 'View Payroll',
    description: 'View payroll information',
    category: PERMISSION_CATEGORIES[0],
    level: 'read'
  },
  {
    id: 'hr.payroll.write',
    name: 'Manage Payroll',
    description: 'Process payroll, generate pay slips',
    category: PERMISSION_CATEGORIES[0],
    level: 'write'
  },
  {
    id: 'hr.attendance.read',
    name: 'View Attendance',
    description: 'View attendance records',
    category: PERMISSION_CATEGORIES[0],
    level: 'read'
  },
  {
    id: 'hr.attendance.write',
    name: 'Manage Attendance',
    description: 'Record and manage attendance',
    category: PERMISSION_CATEGORIES[0],
    level: 'write'
  },
  {
    id: 'attendance.clock_in',
    name: 'Clock In/Out',
    description: 'Record personal attendance times',
    category: PERMISSION_CATEGORIES[0],
    level: 'write'
  },

  // Finance Permissions
  {
    id: 'finance.view',
    name: 'View Finance Section',
    description: 'Access to finance dashboard and overview',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.accounts.view',
    name: 'View Chart of Accounts',
    description: 'View chart of accounts',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.accounts.write',
    name: 'Manage Chart of Accounts',
    description: 'Create, update, delete accounts',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.ledger.view',
    name: 'View General Ledger',
    description: 'View general ledger entries',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.ledger.write',
    name: 'Manage General Ledger',
    description: 'Create and manage journal entries',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  // Journal Entry Workflow Permissions
  {
    id: 'finance.journal.create_draft',
    name: 'Create Draft Journal Entries',
    description: 'Create journal entries in draft status',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.journal.submit_for_review',
    name: 'Submit Journal Entries for Review',
    description: 'Submit draft journal entries for review',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.journal.review',
    name: 'Review Journal Entries',
    description: 'Review and approve/reject journal entries',
    category: PERMISSION_CATEGORIES[1],
    level: 'admin'
  },
  {
    id: 'finance.journal.approve',
    name: 'Approve Journal Entries',
    description: 'Approve reviewed journal entries',
    category: PERMISSION_CATEGORIES[1],
    level: 'admin'
  },
  {
    id: 'finance.journal.post',
    name: 'Post Journal Entries',
    description: 'Post approved journal entries to ledger',
    category: PERMISSION_CATEGORIES[1],
    level: 'admin'
  },
  {
    id: 'finance.journal.reverse',
    name: 'Reverse Posted Journal Entries',
    description: 'Reverse posted journal entries',
    category: PERMISSION_CATEGORIES[1],
    level: 'admin'
  },
  {
    id: 'finance.journal.cancel',
    name: 'Cancel Journal Entries',
    description: 'Cancel journal entries at any stage',
    category: PERMISSION_CATEGORIES[1],
    level: 'admin'
  },
  {
    id: 'finance.journal.view_all_statuses',
    name: 'View All Journal Entry Statuses',
    description: 'View journal entries in all workflow statuses',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.treasury.view',
    name: 'View Treasury',
    description: 'View treasury and bank information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.treasury.write',
    name: 'Manage Treasury',
    description: 'Manage bank accounts and transactions',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.costcenters.view',
    name: 'View Cost Centers',
    description: 'View cost center information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.cost_centers.view',
    name: 'View Cost Centers (Alternative)',
    description: 'View cost center information (alternative naming)',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.costcenters.write',
    name: 'Manage Cost Centers',
    description: 'Create and manage cost centers',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.reports.view',
    name: 'View Financial Reports',
    description: 'View financial reports and analytics',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.assets.view',
    name: 'View Fixed Assets',
    description: 'View fixed assets information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.assets.write',
    name: 'Manage Fixed Assets',
    description: 'Create and manage fixed assets',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.budgets.view',
    name: 'View Budgets',
    description: 'View budget information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.budgets.write',
    name: 'Manage Budgets',
    description: 'Create and manage budgets',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.vendors.view',
    name: 'View Vendors',
    description: 'View vendor information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.vendors.write',
    name: 'Manage Vendors',
    description: 'Create and manage vendors',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.analysis.view',
    name: 'View Financial Analysis',
    description: 'View financial analysis and insights',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.invoices.read',
    name: 'View Invoices',
    description: 'View invoice information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.invoices.view',
    name: 'View Invoices (Alternative)',
    description: 'View invoice information (alternative naming)',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.invoices.write',
    name: 'Manage Invoices',
    description: 'Create, update, delete invoices',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },
  {
    id: 'finance.payments.read',
    name: 'View Payments',
    description: 'View payment information',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.payments.view',
    name: 'View Payments (Alternative)',
    description: 'View payment information (alternative naming)',
    category: PERMISSION_CATEGORIES[1],
    level: 'read'
  },
  {
    id: 'finance.payments.write',
    name: 'Manage Payments',
    description: 'Process payments and receipts',
    category: PERMISSION_CATEGORIES[1],
    level: 'write'
  },

  // Operations Permissions
  {
    id: 'operations.contracts.read',
    name: 'View Contracts',
    description: 'View contract information',
    category: PERMISSION_CATEGORIES[2],
    level: 'read'
  },
  {
    id: 'operations.contracts.write',
    name: 'Manage Contracts',
    description: 'Create, update, delete contracts',
    category: PERMISSION_CATEGORIES[2],
    level: 'write'
  },
  {
    id: 'operations.customers.read',
    name: 'View Customers',
    description: 'View customer information',
    category: PERMISSION_CATEGORIES[2],
    level: 'read'
  },
  {
    id: 'operations.customers.write',
    name: 'Manage Customers',
    description: 'Create, update, delete customers',
    category: PERMISSION_CATEGORIES[2],
    level: 'write'
  },

  // Fleet Management Permissions
  {
    id: 'fleet.vehicles.read',
    name: 'View Vehicles',
    description: 'View vehicle information and status',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'fleet.vehicles.write',
    name: 'Manage Vehicles',
    description: 'Add, update, delete vehicles',
    category: PERMISSION_CATEGORIES[3],
    level: 'write'
  },
  {
    id: 'fleet.maintenance.read',
    name: 'View Maintenance',
    description: 'View vehicle maintenance records',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'fleet.maintenance.write',
    name: 'Manage Maintenance',
    description: 'Schedule and manage vehicle maintenance',
    category: PERMISSION_CATEGORIES[3],
    level: 'write'
  },
  {
    id: 'fleet.dispatch.read',
    name: 'View Dispatch',
    description: 'View vehicle dispatch and assignments',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'fleet.dispatch.write',
    name: 'Manage Dispatch',
    description: 'Assign and manage vehicle dispatch',
    category: PERMISSION_CATEGORIES[3],
    level: 'write'
  },
  {
    id: 'fleet.tracking.read',
    name: 'View Vehicle Tracking',
    description: 'View vehicle location and tracking data',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'fleet.documents.read',
    name: 'View Vehicle Documents',
    description: 'View vehicle registration, insurance, permits',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'fleet.documents.write',
    name: 'Manage Vehicle Documents',
    description: 'Upload and manage vehicle documents',
    category: PERMISSION_CATEGORIES[3],
    level: 'write'
  },

  // Reports Permissions
  {
    id: 'reports.financial.read',
    name: 'Financial Reports',
    description: 'View financial reports',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'reports.hr.read',
    name: 'HR Reports',
    description: 'View HR reports',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },
  {
    id: 'reports.operations.read',
    name: 'Operations Reports',
    description: 'View operations reports',
    category: PERMISSION_CATEGORIES[3],
    level: 'read'
  },

  // Legal Permissions
  {
    id: 'legal.cases.read',
    name: 'View Legal Cases',
    description: 'View legal case information',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'read'
  },
  {
    id: 'legal.cases.write',
    name: 'Manage Legal Cases',
    description: 'Create, update, delete legal cases',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'write'
  },
  {
    id: 'legal.documents.read',
    name: 'View Legal Documents',
    description: 'View legal case documents',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'read'
  },
  {
    id: 'legal.documents.write',
    name: 'Manage Legal Documents',
    description: 'Upload, update, delete legal documents',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'write'
  },
  {
    id: 'legal.correspondence.read',
    name: 'View Legal Correspondence',
    description: 'View legal correspondence',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'read'
  },
  {
    id: 'legal.correspondence.write',
    name: 'Manage Legal Correspondence',
    description: 'Create and manage legal correspondence',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'write'
  },
  {
    id: 'legal.payments.read',
    name: 'View Legal Payments',
    description: 'View legal case payments and billing',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'read'
  },
  {
    id: 'legal.payments.write',
    name: 'Manage Legal Payments',
    description: 'Process legal fees and expenses',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'write'
  },
  {
    id: 'legal.reports.read',
    name: 'View Legal Reports',
    description: 'View legal department reports',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'legal')!,
    level: 'read'
  },

  // Admin Permissions
  {
    id: 'admin.users.read',
    name: 'View Users',
    description: 'View user accounts',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'read'
  },
  {
    id: 'admin.users.write',
    name: 'Manage Users',
    description: 'Create, update, delete user accounts',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'write'
  },
  {
    id: 'admin.roles.read',
    name: 'View Roles',
    description: 'View role assignments',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'read'
  },
  {
    id: 'admin.roles.write',
    name: 'Manage Roles',
    description: 'Assign and manage user roles',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'write'
  },
  {
    id: 'admin.settings.read',
    name: 'View Settings',
    description: 'View system settings',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'read'
  },
  {
    id: 'admin.settings.write',
    name: 'Manage Settings',
    description: 'Modify system settings',
    category: PERMISSION_CATEGORIES.find(c => c.id === 'admin')!,
    level: 'write',
    isSystemLevel: true
  }
];

// Role permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    role: 'super_admin',
    permissions: PERMISSIONS.map(p => p.id),
    canAssignRoles: ['super_admin', 'company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee']
  },
  company_admin: {
    role: 'company_admin',
    permissions: PERMISSIONS.map(p => p.id), // Company Admin has all permissions within their company scope
    canAssignRoles: ['manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee'],
    companyScoped: true
  },
  manager: {
    role: 'manager',
    permissions: PERMISSIONS.filter(p => 
      !p.isSystemLevel && 
      !p.id.includes('admin.') &&
      p.level !== 'admin'
    ).map(p => p.id),
    canAssignRoles: ['sales_agent', 'employee']
  },
  accountant: {
    role: 'accountant',
    permissions: PERMISSIONS.filter(p => 
      p.id.includes('finance.') ||
      p.id.includes('reports.financial') ||
      p.id.includes('hr.payroll') ||
      p.id.includes('operations.contracts.read') ||
      p.id.includes('operations.customers.read') ||
      p.id === 'attendance.clock_in'
    ).map(p => p.id),
    canAssignRoles: []
  },
  fleet_manager: {
    role: 'fleet_manager',
    permissions: PERMISSIONS.filter(p => 
      p.id.includes('fleet.') ||
      p.id.includes('operations.contracts.read') ||
      p.id.includes('operations.customers.read') ||
      p.id.includes('reports.operations') ||
      p.id.includes('finance.invoices.read') ||
      p.id.includes('finance.payments.read') ||
      p.id === 'attendance.clock_in'
    ).map(p => p.id),
    canAssignRoles: ['employee']
  },
  sales_agent: {
    role: 'sales_agent',
    permissions: PERMISSIONS.filter(p => 
      p.id.includes('operations.') || 
      p.id.includes('finance.invoices') ||
      p.id.includes('finance.payments') ||
      p.id.includes('reports.operations') ||
      p.id.includes('legal.cases.read') ||
      p.id.includes('legal.correspondence.read') ||
      p.id === 'attendance.clock_in'
    ).map(p => p.id),
    canAssignRoles: []
  },
  employee: {
    role: 'employee',
    permissions: PERMISSIONS.filter(p => 
      (p.level === 'read' && !p.id.includes('admin.') && !p.isSystemLevel) ||
      p.id === 'attendance.clock_in'
    ).map(p => p.id),
    canAssignRoles: []
  }
};