# React/TypeScript Application Developer Guide

This document provides a comprehensive developer guide for the React/TypeScript application built on Lovable platform, focusing on type safety, database integration, and error prevention.

## Project Overview

### Technology Stack

This application is built using:
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Platform**: Lovable (automated deployment and development)
- **State Management**: React hooks and context
- **UI Components**: Custom components with shadcn/ui

### Architecture Principles

1. **Type Safety First**: Comprehensive TypeScript coverage
2. **Database-Driven**: Supabase-first architecture with generated types
3. **Component-Based**: Modular, reusable React components
4. **Design System**: Consistent styling with semantic tokens
5. **Error Prevention**: Proactive error handling and validation

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── finance/         # Financial management components
│   ├── legal/           # Legal case management
│   └── shared/          # Shared business components
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
├── pages/               # Application pages/routes
├── lib/                 # Utility functions and configs
├── assets/              # Static assets
└── styles/              # Global styles and design system

docs/                    # Documentation
├── TYPE_SAFETY_GUIDE.md
├── DATABASE_SCHEMA_GUIDE.md
├── INTEGRATION_PATTERNS_GUIDE.md
└── ERROR_PREVENTION_GUIDE.md

scripts/                 # Development and validation scripts
├── schema-validator.js
└── type-checker.js
```

## Development Environment Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git for version control
- VS Code (recommended) with TypeScript extensions

### Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Configuration

```bash
# .env file
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development settings
VITE_ENABLE_DEBUG=true
VITE_API_BASE_URL=http://localhost:3000
```

## Type Safety and Development Standards

### TypeScript Configuration

Our `tsconfig.json` is configured for strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Database Type Integration

Always use generated Supabase types:

```typescript
import { Database } from '@/integrations/supabase/types';

// Extract table types
type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

// Use in components
interface CustomerListProps {
  customers: Customer[];
  onUpdate: (customer: CustomerUpdate) => void;
}
```

### Component Development Standards

```typescript
// Component structure
interface ComponentProps {
  // Required props first
  data: Customer;
  onAction: (id: string) => void;
  
  // Optional props last
  className?: string;
  variant?: 'default' | 'compact';
}

export function Component({ 
  data, 
  onAction, 
  className,
  variant = 'default' 
}: ComponentProps) {
  // Hooks at the top
  const [loading, setLoading] = useState(false);
  
  // Event handlers
  const handleClick = useCallback(() => {
    onAction(data.id);
  }, [onAction, data.id]);
  
  // Early returns for loading/error states
  if (!data) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className={cn("base-styles", className)}>
      {/* Component content */}
    </div>
  );
}
```

## Authentication and Authorization

### User Roles System

The application implements a comprehensive role-based access control (RBAC) system with the following roles:

#### Role Hierarchy
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',     // Platform-wide access
  COMPANY_ADMIN = 'company_admin', // Full company access
  MANAGER = 'manager',             // Department management
  SALES_AGENT = 'sales_agent',     // Sales operations
  EMPLOYEE = 'employee',           // Basic employee access
  VIEWER = 'viewer'                // Read-only access
}
```

#### Role Permissions Matrix

| Feature | Super Admin | Company Admin | Manager | Sales Agent | Employee | Viewer |
|---------|-------------|---------------|---------|-------------|----------|--------|
| Company Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| Financial Reports | ✅ | ✅ | ✅ | ❌ | ❌ | 👁️ |
| Customer Management | ✅ | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Contract Management | ✅ | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Payment Processing | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Legal Cases | ✅ | ✅ | ✅ | ❌ | ❌ | 👁️ |
| Vehicle Management | ✅ | ✅ | ✅ | ❌ | ❌ | 👁️ |
| Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | 👁️ |
| Chat/AI Assistant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*Managers can only manage users in their department

### Role-Based Component Access

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 6,
      [UserRole.COMPANY_ADMIN]: 5,
      [UserRole.MANAGER]: 4,
      [UserRole.SALES_AGENT]: 3,
      [UserRole.EMPLOYEE]: 2,
      [UserRole.VIEWER]: 1,
    };
    
    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];
    
    return userLevel >= requiredLevel;
  }, [user]);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;

    // Super admin has all permissions
    if (user.role === UserRole.SUPER_ADMIN) return true;

    // Check specific permissions based on role and resource
    return checkResourcePermission(user.role, resource, action);
  }, [user]);

  return {
    user,
    loading,
    checkRole,
    hasPermission,
    isAuthenticated: !!user,
  };
}

// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: { resource: string; action: string };
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback = <div>Access Denied</div> 
}: ProtectedRouteProps) {
  const { checkRole, hasPermission, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check role-based access
  if (requiredRole && !checkRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Database-Level Security (RLS)

```sql
-- Helper function to check user roles
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = $1 
    AND ur.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's company
CREATE OR REPLACE FUNCTION get_user_company(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM profiles 
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example RLS policy for customers table
CREATE POLICY "Company users can view customers" 
ON customers FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins and managers can manage customers" 
ON customers FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)
    )
  )
);
```

## Routing and Navigation

### Application Routes Structure

```typescript
// routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public routes
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      
      // Protected routes
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole={UserRole.EMPLOYEE}>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          
          // Customer Management
          {
            path: 'customers',
            element: (
              <ProtectedRoute 
                requiredPermission={{ resource: 'customers', action: 'read' }}
              >
                <CustomerRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <CustomerList /> },
              { path: 'new', element: <CreateCustomer /> },
              { path: ':id', element: <CustomerDetails /> },
              { path: ':id/edit', element: <EditCustomer /> },
            ],
          },
          
          // Financial Management
          {
            path: 'finance',
            element: (
              <ProtectedRoute requiredRole={UserRole.MANAGER}>
                <FinanceRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <FinanceDashboard /> },
              { path: 'obligations', element: <ObligationsList /> },
              { path: 'payments', element: <PaymentsList /> },
              { path: 'reports', element: <FinancialReports /> },
            ],
          },
          
          // Legal Management
          {
            path: 'legal',
            element: (
              <ProtectedRoute requiredRole={UserRole.MANAGER}>
                <LegalRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <LegalDashboard /> },
              { path: 'cases', element: <LegalCasesList /> },
              { path: 'contracts', element: <ContractsList /> },
              { path: 'documents', element: <DocumentsList /> },
            ],
          },
          
          // HR Management
          {
            path: 'hr',
            element: (
              <ProtectedRoute requiredRole={UserRole.MANAGER}>
                <HRRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <HRDashboard /> },
              { path: 'employees', element: <EmployeesList /> },
              { path: 'attendance', element: <AttendanceManagement /> },
              { path: 'payroll', element: <PayrollManagement /> },
            ],
          },
          
          // Vehicle Management
          {
            path: 'vehicles',
            element: (
              <ProtectedRoute requiredRole={UserRole.MANAGER}>
                <VehicleRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <VehiclesList /> },
              { path: 'maintenance', element: <MaintenanceSchedule /> },
              { path: 'tracking', element: <VehicleTracking /> },
            ],
          },
          
          // Settings (Company Admin only)
          {
            path: 'settings',
            element: (
              <ProtectedRoute requiredRole={UserRole.COMPANY_ADMIN}>
                <SettingsRoutes />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <GeneralSettings /> },
              { path: 'users', element: <UserManagement /> },
              { path: 'company', element: <CompanySettings /> },
              { path: 'billing', element: <BillingSettings /> },
            ],
          },
          
          // Chat/AI Assistant (All authenticated users)
          {
            path: 'chat',
            element: <ChatInterface />,
          },
        ],
      },
      
      // Public quotation approval
      {
        path: 'approve-quotation/:token',
        element: <QuotationApproval />,
      },
      
      // Error pages
      {
        path: '404',
        element: <NotFoundPage />,
      },
      {
        path: '*',
        element: <Navigate to="/404" replace />,
      },
    ],
  },
]);
```

### Layout Components

```typescript
// components/layouts/DashboardLayout.tsx
export function DashboardLayout() {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  
  const navigationItems = useMemo(() => [
    {
      title: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      visible: true,
    },
    {
      title: 'العملاء',
      icon: Users,
      href: '/dashboard/customers',
      visible: hasPermission('customers', 'read'),
    },
    {
      title: 'المالية',
      icon: DollarSign,
      href: '/dashboard/finance',
      visible: hasPermission('finance', 'read'),
    },
    {
      title: 'القانونية',
      icon: Scale,
      href: '/dashboard/legal',
      visible: hasPermission('legal', 'read'),
    },
    {
      title: 'الموارد البشرية',
      icon: UserCheck,
      href: '/dashboard/hr',
      visible: hasPermission('hr', 'read'),
    },
    {
      title: 'المركبات',
      icon: Car,
      href: '/dashboard/vehicles',
      visible: hasPermission('vehicles', 'read'),
    },
    {
      title: 'المساعد الذكي',
      icon: MessageSquare,
      href: '/dashboard/chat',
      visible: true,
    },
    {
      title: 'الإعدادات',
      icon: Settings,
      href: '/dashboard/settings',
      visible: hasPermission('settings', 'read'),
    },
  ], [hasPermission]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        navigationItems={navigationItems.filter(item => item.visible)}
        currentPath={location.pathname}
      />
      <main className="flex-1 overflow-auto">
        <Header user={user} />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

### Navigation Guards

```typescript
// hooks/useNavigationGuard.ts
export function useNavigationGuard() {
  const { hasPermission, checkRole } = useAuth();
  const navigate = useNavigate();

  const navigateWithPermission = useCallback((
    path: string,
    requiredPermission?: { resource: string; action: string },
    requiredRole?: UserRole
  ) => {
    // Check role requirement
    if (requiredRole && !checkRole(requiredRole)) {
      toast.error('ليس لديك صلاحية للوصول لهذه الصفحة');
      return false;
    }

    // Check permission requirement
    if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
      toast.error('ليس لديك صلاحية لتنفيذ هذا العمل');
      return false;
    }

    navigate(path);
    return true;
  }, [hasPermission, checkRole, navigate]);

  return { navigateWithPermission };
}

// Usage in components
function CustomerCard({ customer }: { customer: Customer }) {
  const { navigateWithPermission } = useNavigationGuard();

  const handleEdit = () => {
    navigateWithPermission(
      `/dashboard/customers/${customer.id}/edit`,
      { resource: 'customers', action: 'update' }
    );
  };

  return (
    <Card>
      <CardContent>
        <h3>{customer.name}</h3>
        <Button onClick={handleEdit}>تعديل</Button>
      </CardContent>
    </Card>
  );
}
```

### Route Parameters and State Management

```typescript
// hooks/useRouteState.ts
export function useRouteState<T>() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const updateRouteState = useCallback((updates: Partial<T>) => {
    const currentState = location.state as T || {};
    const newState = { ...currentState, ...updates };
    
    navigate(location.pathname + location.search, {
      state: newState,
      replace: true,
    });
  }, [location, navigate]);

  return {
    routeState: (location.state as T) || {},
    updateRouteState,
  };
}

// hooks/useSearchParams.ts
export function useSearchParams() {
  const [searchParams, setSearchParams] = useReactSearchParams();
  
  const updateSearchParam = useCallback((key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const getSearchParam = useCallback((key: string): string | null => {
    return searchParams.get(key);
  }, [searchParams]);

  return {
    searchParams,
    updateSearchParam,
    getSearchParam,
  };
}
```

### Role-Based Menu Configuration

```typescript
// config/menuConfig.ts
export const menuConfig: MenuConfig = {
  [UserRole.SUPER_ADMIN]: {
    sections: [
      {
        title: 'الإدارة العامة',
        items: [
          { title: 'جميع الشركات', path: '/admin/companies' },
          { title: 'إدارة النظام', path: '/admin/system' },
          { title: 'التقارير العامة', path: '/admin/reports' },
        ],
      },
      {
        title: 'الإدارة',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'العملاء', path: '/dashboard/customers' },
          { title: 'المالية', path: '/dashboard/finance' },
          { title: 'القانونية', path: '/dashboard/legal' },
          { title: 'الموارد البشرية', path: '/dashboard/hr' },
          { title: 'المركبات', path: '/dashboard/vehicles' },
        ],
      },
    ],
  },
  
  [UserRole.COMPANY_ADMIN]: {
    sections: [
      {
        title: 'الإدارة',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'العملاء', path: '/dashboard/customers' },
          { title: 'المالية', path: '/dashboard/finance' },
          { title: 'القانونية', path: '/dashboard/legal' },
          { title: 'الموارد البشرية', path: '/dashboard/hr' },
          { title: 'المركبات', path: '/dashboard/vehicles' },
        ],
      },
      {
        title: 'الإعدادات',
        items: [
          { title: 'إعدادات الشركة', path: '/dashboard/settings/company' },
          { title: 'إدارة المستخدمين', path: '/dashboard/settings/users' },
          { title: 'الفوترة', path: '/dashboard/settings/billing' },
        ],
      },
    ],
  },
  
  [UserRole.MANAGER]: {
    sections: [
      {
        title: 'الإدارة',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'العملاء', path: '/dashboard/customers' },
          { title: 'المالية', path: '/dashboard/finance' },
          { title: 'القانونية', path: '/dashboard/legal' },
          { title: 'الموارد البشرية', path: '/dashboard/hr' },
          { title: 'المركبات', path: '/dashboard/vehicles' },
        ],
      },
    ],
  },
  
  [UserRole.SALES_AGENT]: {
    sections: [
      {
        title: 'المبيعات',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'العملاء', path: '/dashboard/customers' },
          { title: 'العقود', path: '/dashboard/legal/contracts' },
          { title: 'المدفوعات', path: '/dashboard/finance/payments' },
        ],
      },
    ],
  },
  
  [UserRole.EMPLOYEE]: {
    sections: [
      {
        title: 'الموظف',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'الحضور', path: '/dashboard/hr/attendance' },
          { title: 'المساعد الذكي', path: '/dashboard/chat' },
        ],
      },
    ],
  },
  
  [UserRole.VIEWER]: {
    sections: [
      {
        title: 'عرض',
        items: [
          { title: 'لوحة التحكم', path: '/dashboard' },
          { title: 'التقارير', path: '/dashboard/reports' },
          { title: 'المساعد الذكي', path: '/dashboard/chat' },
        ],
      },
    ],
  },
};
```

### Breadcrumb Navigation

```typescript
// hooks/useBreadcrumbs.ts
export function useBreadcrumbs() {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];
    
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      const breadcrumbConfig = getBreadcrumbConfig(currentPath);
      if (breadcrumbConfig) {
        breadcrumbItems.push({
          title: breadcrumbConfig.title,
          path: currentPath,
          isLast: index === pathSegments.length - 1,
        });
      }
    });
    
    return breadcrumbItems;
  }, [location.pathname]);
  
  return breadcrumbs;
}

// components/Breadcrumbs.tsx
export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbs();
  
  if (breadcrumbs.length <= 1) return null;
  
  return (
    <nav className="breadcrumbs">
      {breadcrumbs.map((item, index) => (
        <span key={item.path} className="breadcrumb-item">
          {!item.isLast ? (
            <Link to={item.path}>{item.title}</Link>
          ) : (
            <span>{item.title}</span>
          )}
          {!item.isLast && <span className="separator"> / </span>}
        </span>
      ))}
    </nav>
  );
}
```

### Route-Based Feature Flags

```typescript
// hooks/useFeatureFlags.ts
export function useFeatureFlags() {
  const { user } = useAuth();
  const location = useLocation();
  
  const isFeatureEnabled = useCallback((featureName: string): boolean => {
    // Check user role permissions
    const userRole = user?.role;
    if (!userRole) return false;
    
    // Check route-based features
    const currentRoute = location.pathname;
    
    const featureConfig = getFeatureConfig(featureName);
    if (!featureConfig) return false;
    
    // Check role requirements
    if (featureConfig.requiredRoles && !featureConfig.requiredRoles.includes(userRole)) {
      return false;
    }
    
    // Check route requirements
    if (featureConfig.allowedRoutes && !featureConfig.allowedRoutes.some(route => 
      currentRoute.startsWith(route)
    )) {
      return false;
    }
    
    return true;
  }, [user, location]);
  
  return { isFeatureEnabled };
}
```

108

### Automated Quality Checks

We've implemented comprehensive quality checks to prevent TypeScript errors and maintain code quality:

```bash
# Run all quality checks
npm run quality-check

# Individual checks
npm run type-check        # TypeScript compilation
npm run validate-schema   # Database schema validation
npm run check-types       # Custom type consistency checking
npm run lint             # ESLint validation
npm run test             # Unit tests
```

### Pre-commit Validation

Before committing code, run:

```bash
npm run pre-commit
```

This runs:
1. TypeScript type checking
2. Schema validation
3. Type consistency checks
4. Linting
5. Unit tests

### Database Migration Workflow

1. **Plan Changes**: Document required database changes
2. **Create Migration**: Use Supabase migration tool
3. **Update Types**: Regenerate TypeScript types
4. **Update Code**: Modify application code to use new types
5. **Test**: Run all quality checks
6. **Deploy**: Deploy changes through Lovable platform

### Testing Strategy

```typescript
// Example test structure
describe('Customer Management', () => {
  describe('useCustomers hook', () => {
    it('should fetch customers successfully', async () => {
      const { result } = renderHook(() => useCustomers('company-id'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.customers).toEqual(expect.any(Array));
      expect(result.current.error).toBeNull();
    });
  });

  describe('CustomerForm component', () => {
    it('should validate required fields', async () => {
      render(<CustomerForm />);
      
      fireEvent.click(screen.getByText('Submit'));
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });
  });
});
```

## التطوير والتخصيص

### 1. إضافة مرادفات جديدة

```python
# في arabic_query_processor.py
def __init__(self):
    self.synonyms = {
        'vehicles': ['سيارة', 'مركبة', 'عربة', 'آلية', 'مركبة_جديدة'],
        'customers': ['عميل', 'زبون', 'مستأجر', 'عضو', 'مشترك_جديد'],
        # إضافة مرادفات جديدة هنا
    }
```

### 2. إضافة قوالب قانونية جديدة

```python
# في enhanced_unified_legal_ai_system.py
def __init__(self, db_config):
    self.legal_templates = {
        'new_category': {
            'title': 'عنوان القالب الجديد',
            'template': 'نص القالب مع {placeholder}',
            'keywords': ['كلمة1', 'كلمة2', 'كلمة3'],
            'confidence': 0.8
        }
    }
```

### 3. إضافة نوع استعلام جديد

```python
# في arabic_query_processor.py
class QueryType(Enum):
    VEHICLES = "vehicles"
    CUSTOMERS = "customers"
    PAYMENTS = "payments"
    NEW_TYPE = "new_type"  # نوع جديد

# إضافة منطق التصنيف
def classify_query_type(self, text: str, entities: List) -> QueryType:
    if any(keyword in text for keyword in ['كلمة_مفتاحية_جديدة']):
        return QueryType.NEW_TYPE
```

### 4. تخصيص استجابات قاعدة البيانات

```python
# في smart_query_engine.py
def build_sql_query(self, query_result: QueryResult) -> str:
    if query_result.query_type == QueryType.NEW_TYPE:
        return self._build_new_type_query(query_result)
    
def _build_new_type_query(self, query_result: QueryResult) -> str:
    # منطق بناء الاستعلام الجديد
    return "SELECT * FROM new_table WHERE condition"
```

## الاختبار والجودة

### 1. تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
python run_tests.py

# تشغيل اختبارات محددة
python -m pytest tests/test_arabic_query_processor.py -v

# اختبارات الأداء
python -m pytest tests/test_performance.py -v -s
```

### 2. فحص جودة الكود

```bash
# فحص التنسيق
black --check *.py

# فحص الأخطاء
flake8 --max-line-length=100 *.py

# تقرير التغطية
pytest --cov=. --cov-report=html
```

### 3. إضافة اختبارات جديدة

```python
# مثال على اختبار جديد
def test_new_feature(self, processor):
    """اختبار الميزة الجديدة"""
    result = processor.process_query('استفسار جديد')
    assert result.success == True
    assert result.query_type == QueryType.NEW_TYPE
```

## النشر والإنتاج

### 1. النشر باستخدام Docker

```bash
# بناء الصورة
docker build -t legal-ai:v2.0 .

# تشغيل الحاوية
docker run -p 8000:8000 --env-file .env legal-ai:v2.0

# أو استخدام docker-compose
docker-compose up -d
```

### 2. النشر على خادم الإنتاج

```bash
# تحديث الكود
git pull origin main

# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل الاختبارات
python run_tests.py

# إعادة تشغيل الخدمة
systemctl restart legal-ai-service
```

### 3. مراقبة الأداء

```bash
# فحص حالة الخدمة
curl http://localhost:8000/api/legal-ai/health

# فحص حالة النظام
curl http://localhost:8000/api/legal-ai/status

# مراقبة السجلات
tail -f /var/log/legal-ai/app.log
```

## الصيانة والتحسين

### 1. تحسين الأداء

**قاعدة البيانات:**
```sql
-- إضافة فهارس للاستعلامات السريعة
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_vehicles_maintenance ON vehicles(maintenance_status);
CREATE INDEX idx_payments_overdue ON payments(is_overdue);
```

**التخزين المؤقت:**
```python
# تحسين إعدادات Redis
redis_config = {
    'host': 'localhost',
    'port': 6379,
    'db': 0,
    'max_connections': 20,
    'socket_keepalive': True,
    'socket_keepalive_options': {}
}
```

### 2. مراقبة الأخطاء

```python
# إضافة تسجيل مفصل
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('legal_ai.log'),
        logging.StreamHandler()
    ]
)
```

### 3. النسخ الاحتياطي

```bash
# نسخ احتياطي لقاعدة البيانات
pg_dump -U username -h hostname database_name > backup.sql

# نسخ احتياطي للتكوين
tar -czf config_backup.tar.gz *.env *.conf *.yml
```

## استكشاف الأخطاء وحلها

### 1. مشاكل الاتصال بقاعدة البيانات

```python
# فحص الاتصال
def test_database_connection():
    try:
        response = supabase.table('customers').select('count').execute()
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
```

### 2. مشاكل معالجة النصوص العربية

```python
# فحص تشفير النص
def debug_text_processing(text):
    logger.info(f"Original text: {text}")
    logger.info(f"Encoding: {text.encode('utf-8')}")
    normalized = normalize_text(text)
    logger.info(f"Normalized: {normalized}")
```

### 3. مشاكل الأداء

```python
# قياس أوقات التنفيذ
import time
from functools import wraps

def measure_time(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        logger.info(f"{func.__name__} took {end-start:.3f}s")
        return result
    return wrapper
```

## الأمان والحماية

### 1. التحقق من الصلاحيات

```python
def verify_permissions(user_id: str, company_id: str) -> bool:
    # التحقق من صلاحيات المستخدم
    user = get_user(user_id)
    return user.company_id == company_id and user.has_legal_ai_access
```

### 2. تشفير البيانات الحساسة

```python
from cryptography.fernet import Fernet

def encrypt_sensitive_data(data: str) -> str:
    key = os.getenv('ENCRYPTION_KEY')
    f = Fernet(key)
    return f.encrypt(data.encode()).decode()
```

### 3. تسجيل العمليات

```python
def log_user_activity(user_id: str, query: str, response_type: str):
    activity_log = {
        'user_id': user_id,
        'timestamp': datetime.now(),
        'query': query[:100],  # أول 100 حرف فقط
        'response_type': response_type
    }
    # حفظ في قاعدة البيانات أو ملف السجل
```

## المساهمة في التطوير

### 1. إرشادات المساهمة

- اتبع معايير PEP 8 للكود Python
- اكتب اختبارات لأي ميزة جديدة
- وثق التغييرات في CHANGELOG.md
- استخدم رسائل commit واضحة

### 2. عملية المراجعة

1. إنشاء branch جديد للميزة
2. تطوير الميزة مع الاختبارات
3. تشغيل جميع الاختبارات
4. إنشاء Pull Request
5. مراجعة الكود
6. دمج التغييرات

### 3. معايير الجودة

- تغطية اختبارات > 80%
- جميع الاختبارات تنجح
- لا توجد تحذيرات من flake8
- الكود منسق بـ black

---

*آخر تحديث: أغسطس 2025*
*الإصدار: 2.0.0*

