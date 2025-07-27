// Permission types and interfaces for the user management system

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'sales_agent' | 'employee';

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
    id: 'reports',
    name: 'Reports & Analytics',
    nameAr: 'التقارير والتحليلات',
    description: 'Generate and view reports',
    icon: 'BarChart3',
    color: 'orange',
    order: 4
  },
  {
    id: 'admin',
    name: 'System Administration',
    nameAr: 'إدارة النظام',
    description: 'System settings, user management',
    icon: 'Shield',
    color: 'red',
    order: 5
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

  // Admin Permissions
  {
    id: 'admin.users.read',
    name: 'View Users',
    description: 'View user accounts',
    category: PERMISSION_CATEGORIES[4],
    level: 'read'
  },
  {
    id: 'admin.users.write',
    name: 'Manage Users',
    description: 'Create, update, delete user accounts',
    category: PERMISSION_CATEGORIES[4],
    level: 'write'
  },
  {
    id: 'admin.roles.read',
    name: 'View Roles',
    description: 'View role assignments',
    category: PERMISSION_CATEGORIES[4],
    level: 'read'
  },
  {
    id: 'admin.roles.write',
    name: 'Manage Roles',
    description: 'Assign and manage user roles',
    category: PERMISSION_CATEGORIES[4],
    level: 'write',
    isSystemLevel: true
  },
  {
    id: 'admin.settings.read',
    name: 'View Settings',
    description: 'View system settings',
    category: PERMISSION_CATEGORIES[4],
    level: 'read'
  },
  {
    id: 'admin.settings.write',
    name: 'Manage Settings',
    description: 'Modify system settings',
    category: PERMISSION_CATEGORIES[4],
    level: 'write',
    isSystemLevel: true
  }
];

// Role permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    role: 'super_admin',
    permissions: PERMISSIONS.map(p => p.id),
    canAssignRoles: ['super_admin', 'company_admin', 'manager', 'sales_agent', 'employee']
  },
  company_admin: {
    role: 'company_admin',
    permissions: PERMISSIONS.filter(p => !p.isSystemLevel).map(p => p.id),
    canAssignRoles: ['manager', 'sales_agent', 'employee']
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
  sales_agent: {
    role: 'sales_agent',
    permissions: PERMISSIONS.filter(p => 
      p.id.includes('operations.') || 
      p.id.includes('finance.invoices') ||
      p.id.includes('finance.payments') ||
      p.id.includes('reports.operations') ||
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