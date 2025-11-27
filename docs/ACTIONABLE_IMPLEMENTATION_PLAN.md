# Fleetify System - Actionable Implementation Plan
## Based on Comprehensive Architecture & Design Review

**Document Version:** 1.0  
**Created:** 2025-10-12  
**Status:** Active Development  
**System Version:** 3.0+ (Unified Architecture)

---

## 📋 Executive Summary

This implementation plan provides a detailed, actionable roadmap for completing the Fleetify fleet and enterprise management system according to the comprehensive architecture and design specifications. The plan is organized into 11 distinct phases with 51 specific tasks.

### Current System Status

✅ **Completed Components:**
- UnifiedFinancialDashboard (Financial System)
- EnhancedContractForm (Contract Management)
- EnhancedCustomerForm (Customer Management)
- UnifiedPaymentForm (Payment Processing)
- useVehicleMaintenance hook (Fleet Maintenance)

❌ **Missing Critical Component:**
- **EnhancedLegalAIInterface_v2** (Legal AI System) - **HIGH PRIORITY**

### System Architecture Overview

```
Fleetify System Architecture
├── Frontend Layer (React 18 + TypeScript)
│   ├── Unified Components (Single entry point per domain)
│   ├── Custom Hooks (Business logic encapsulation)
│   └── Shared UI Components (Radix UI + Tailwind)
├── Backend Services
│   ├── Supabase (PostgreSQL + Real-time + Storage)
│   ├── OpenAI API (Legal AI functionality)
│   └── External Integrations (Payment gateways, Gov APIs)
└── Mobile Layer (Capacitor for iOS/Android)
```

---

## 🎯 Implementation Phases

### PHASE 1: Architecture Verification
**Duration:** 2-3 days  
**Priority:** HIGH  
**Dependencies:** None

#### Objectives
- Verify existing unified components match design specifications
- Identify any architectural deviations
- Document current implementation status

#### Tasks Breakdown

**Task 1.1: UnifiedFinancialDashboard Verification**
```typescript
// File: src/components/finance/UnifiedFinancialDashboard.tsx
// Verify:
✓ Tabs implementation (Alerts, Analytics, Reports, Insights)
✓ Financial metrics display
✓ Integration with FinancialAlertsSystem
✓ Integration with AdvancedFinancialReports
✓ PayrollIntegrationCard integration
✓ PendingJournalEntriesManager integration
✓ UnifiedPaymentForm integration
```

**Acceptance Criteria:**
- [ ] All 4 tabs are functional
- [ ] Financial metrics load correctly
- [ ] Payment form integration works
- [ ] Real-time data updates functioning
- [ ] Mobile responsive design verified

**Task 1.2: EnhancedContractForm Verification**
```typescript
// File: src/components/contracts/EnhancedContractForm.tsx
// Verify:
✓ Customer selection with blacklist checking
✓ Vehicle availability validation
✓ Payment schedule generation
✓ Journal entry creation
✓ Approval workflow integration
✓ Document management
```

**Acceptance Criteria:**
- [ ] Customer validation working correctly
- [ ] Vehicle availability check functioning
- [ ] Contract calculations accurate
- [ ] Approval workflow triggers properly
- [ ] Documents save successfully

**Task 1.3: EnhancedCustomerForm Verification**
```typescript
// File: src/components/customers/EnhancedCustomerForm.tsx
// Verify:
✓ Customer creation with account integration
✓ Duplicate checking
✓ Financial account auto-creation
✓ Document upload capability
✓ Blacklist management
```

**Acceptance Criteria:**
- [ ] Customer accounts auto-created in chart of accounts
- [ ] Duplicate detection working
- [ ] Document upload functional
- [ ] Financial integration verified

**Task 1.4: useVehicleMaintenance Hook Verification**
```typescript
// File: src/hooks/useVehicles.ts (contains useVehicleMaintenance)
// Verify:
✓ Maintenance record CRUD operations
✓ Company-scoped queries
✓ Real-time updates
✓ Integration with vehicle status
```

**Acceptance Criteria:**
- [ ] Maintenance records query correctly
- [ ] Company isolation working
- [ ] Vehicle status updates correctly
- [ ] React Query cache properly configured

---

### PHASE 2: Legal AI System Implementation
**Duration:** 5-7 days  
**Priority:** CRITICAL  
**Dependencies:** Phase 1 completion

#### Context
The Legal AI System is documented in `README_LEGAL_AI_V2.md` but **not yet implemented**. This is a critical missing component that provides intelligent legal consultancy for fleet companies.

#### System Requirements

**Core Features:**
- Natural language query processing
- Customer data integration
- Legal document generation
- Risk analysis and scoring
- Multi-country legal framework support (Kuwait, Saudi Arabia, Qatar)

**Performance Targets:**
- Response time: < 0.01 seconds
- Document accuracy: 95%+
- API cost savings: 75%
- System uptime: 99.9%

#### Implementation Steps

**Task 2.1: Create Directory Structure**
```bash
mkdir -p src/components/legal
mkdir -p src/api/legal-ai-v2
```

**Expected Structure:**
```
src/
├── components/
│   └── legal/
│       ├── EnhancedLegalAIInterface_v2.tsx
│       ├── LegalAIConsultant.tsx
│       ├── APIKeySettings.tsx
│       ├── LegalDocumentGenerator.tsx
│       ├── RiskAnalyzer.tsx
│       └── index.ts
├── hooks/
│   ├── useLegalAI.ts
│   ├── useLegalAIStats.ts
│   └── useSmartLegalClassifier.ts (exists)
└── api/
    └── legal-ai-v2/
        ├── intelligent_database_integration.py
        ├── contextual_analysis_engine.py
        ├── custom_legal_document_generator.py
        └── unified_legal_ai_system.py
```

**Task 2.2: Implement EnhancedLegalAIInterface_v2.tsx**

**Component Specification:**
```typescript
interface LegalAIInterfaceProps {
  companyId: string;
  onDocumentGenerated?: (document: LegalDocument) => void;
  onRiskAnalysis?: (analysis: RiskAnalysis) => void;
}

export const EnhancedLegalAIInterface_v2: React.FC<LegalAIInterfaceProps> = ({
  companyId,
  onDocumentGenerated,
  onRiskAnalysis
}) => {
  // Features to implement:
  // 1. Chat interface for natural language queries
  // 2. Customer search and selection
  // 3. Real-time risk analysis
  // 4. Document preview and generation
  // 5. Multi-country legal framework selection
  // 6. AI response streaming
  // 7. Context-aware suggestions
  
  return (
    <Card>
      <Tabs defaultValue="consultation">
        <TabsList>
          <TabsTrigger value="consultation">استشارة قانونية</TabsTrigger>
          <TabsTrigger value="documents">الوثائق</TabsTrigger>
          <TabsTrigger value="risk">تحليل المخاطر</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="consultation">
          {/* Intelligent chat interface */}
        </TabsContent>
        
        <TabsContent value="documents">
          {/* Document generation interface */}
        </TabsContent>
        
        <TabsContent value="risk">
          {/* Risk analysis dashboard */}
        </TabsContent>
        
        <TabsContent value="settings">
          <APIKeySettings />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
```

**Key Features to Implement:**

1. **Intelligent Query Processing**
```typescript
const processQuery = async (query: string, context: CustomerContext) => {
  // 1. Classify query type (legal advice, document generation, risk analysis)
  // 2. Extract customer information from query
  // 3. Fetch relevant data from database
  // 4. Generate AI response with context
  // 5. Return structured response with metadata
};
```

2. **Customer Data Integration**
```typescript
const fetchCustomerContext = async (customerId: string) => {
  const { data } = await supabase
    .from('customers')
    .select(`
      *,
      contracts(*),
      payments(*),
      traffic_violations(*),
      legal_cases(*)
    `)
    .eq('id', customerId)
    .single();
    
  return data;
};
```

3. **Risk Scoring Algorithm**
```typescript
interface RiskFactors {
  paymentDelay: number;      // Days late
  unpaidAmount: number;      // Total outstanding
  violationCount: number;    // Traffic violations
  contractHistory: number;   // Number of contracts
  litigationHistory: number; // Past legal cases
}

const calculateRiskScore = (factors: RiskFactors): number => {
  // Algorithm based on design doc specifications
  const weights = {
    paymentDelay: 0.35,
    unpaidAmount: 0.30,
    violationCount: 0.20,
    contractHistory: 0.10,
    litigationHistory: 0.05
  };
  
  // Normalize and calculate weighted score (0-100)
  // Return risk score
};
```

4. **Legal Document Templates**
```typescript
const documentTemplates = {
  legal_warning: {
    kuwait: 'قانون رقم 67 لسنة 1980...',
    saudi: 'نظام المعاملات المدنية...',
    qatar: 'القانون المدني القطري...'
  },
  payment_claim: {
    kuwait: 'وفقاً للقانون التجاري الكويتي...',
    // ...
  },
  contract_termination: {
    // ...
  }
};
```

**Acceptance Criteria:**
- [ ] Chat interface functional with streaming responses
- [ ] Customer search and selection working
- [ ] Risk analysis calculates correctly
- [ ] Documents generate with actual customer data
- [ ] Multi-country support implemented
- [ ] API key management secure
- [ ] Response time < 1 second
- [ ] Error handling comprehensive

**Task 2.3: Create Legal System Hooks**

**useLegalAI.ts:**
```typescript
export const useLegalAI = (companyId: string) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processQuery = useMutation({
    mutationFn: async (query: string) => {
      // Call OpenAI API or backend service
      // Process response
      // Return structured data
    },
    onSuccess: (data) => {
      // Log to legal_consultations table
      // Update analytics
    }
  });
  
  const generateDocument = useMutation({
    mutationFn: async (params: DocumentParams) => {
      // Generate legal document
      // Save to legal_documents table
    }
  });
  
  return {
    processQuery,
    generateDocument,
    isProcessing,
    apiKey,
    setApiKey
  };
};
```

**useLegalAIStats.ts:**
```typescript
export const useLegalAIStats = (companyId: string) => {
  return useQuery({
    queryKey: ['legal-ai-stats', companyId],
    queryFn: async () => {
      const [consultations, documents, cases] = await Promise.all([
        supabase.from('legal_consultations')
          .select('*')
          .eq('company_id', companyId),
        supabase.from('legal_documents')
          .select('*')
          .eq('company_id', companyId),
        supabase.from('legal_cases')
          .select('*')
          .eq('company_id', companyId)
      ]);
      
      return {
        totalConsultations: consultations.data?.length || 0,
        totalDocuments: documents.data?.length || 0,
        activeCases: cases.data?.filter(c => c.status === 'active').length || 0,
        avgResponseTime: calculateAvgResponseTime(consultations.data),
        costSavings: calculateCostSavings(consultations.data)
      };
    }
  });
};
```

**Task 2.4: Create Supporting Components**

**APIKeySettings.tsx:**
```typescript
export const APIKeySettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const testConnection = async () => {
    // Test OpenAI API connection
    // Show success/error message
  };
  
  const saveApiKey = async () => {
    // Encrypt and save API key securely
    // Store in localStorage or secure backend
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات API</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          type="password" 
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <Button onClick={testConnection}>اختبار الاتصال</Button>
        <Button onClick={saveApiKey}>حفظ</Button>
      </CardContent>
    </Card>
  );
};
```

**Task 2.5: Create Index Export File**
```typescript
// src/components/legal/index.ts
export { EnhancedLegalAIInterface_v2 } from './EnhancedLegalAIInterface_v2';
export { LegalAIConsultant } from './LegalAIConsultant';
export { APIKeySettings } from './APIKeySettings';
export { LegalDocumentGenerator } from './LegalDocumentGenerator';
export { RiskAnalyzer } from './RiskAnalyzer';
```

---

### PHASE 3: System Integration
**Duration:** 3-4 days  
**Priority:** HIGH  
**Dependencies:** Phase 1, Phase 2

#### Objectives
- Integrate all unified components into main application
- Update routing configuration
- Verify inter-component communication
- Test data flow between modules

**Task 3.1: Create/Update Legal.tsx Page**

**File:** `src/pages/Legal.tsx` or `src/pages/dashboards/LegalDashboard.tsx`

```typescript
import React from 'react';
import { EnhancedLegalAIInterface_v2 } from '@/components/legal';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const Legal = () => {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;
  
  if (!companyId) {
    return <div>الرجاء تسجيل الدخول</div>;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>المستشار القانوني الذكي</CardTitle>
          <CardDescription>
            نظام متقدم للاستشارات القانونية وإدارة القضايا
          </CardDescription>
        </CardHeader>
      </Card>
      
      <EnhancedLegalAIInterface_v2 
        companyId={companyId}
        onDocumentGenerated={(doc) => {
          // Handle document generation
          console.log('Document generated:', doc);
        }}
        onRiskAnalysis={(analysis) => {
          // Handle risk analysis
          console.log('Risk analysis:', analysis);
        }}
      />
    </div>
  );
};
```

**Acceptance Criteria:**
- [ ] Legal page accessible from main navigation
- [ ] Legal AI interface loads without errors
- [ ] Proper authentication and authorization
- [ ] Mobile responsive layout

**Task 3.2: Verify Finance Page Integration**

**File:** `src/pages/Finance.tsx`

```typescript
// Verify this file properly imports and uses:
import { UnifiedFinancialDashboard } from '@/components/finance';

// And renders:
<UnifiedFinancialDashboard />
```

**Acceptance Criteria:**
- [ ] Finance page uses UnifiedFinancialDashboard
- [ ] No duplicate financial components imported
- [ ] All financial features accessible
- [ ] Real-time updates working

**Task 3.3: Verify Customers Page Integration**

**File:** `src/pages/Customers.tsx`

```typescript
// Verify EnhancedCustomerForm is properly integrated
import { EnhancedCustomerForm } from '@/components/customers';

// Usage in customer creation/editing
<EnhancedCustomerForm 
  open={showForm}
  onOpenChange={setShowForm}
  preselectedCustomerId={selectedCustomerId}
/>
```

**Acceptance Criteria:**
- [ ] Customer form uses EnhancedCustomerForm
- [ ] Financial account integration working
- [ ] Duplicate checking functional
- [ ] Document management operational

**Task 3.4: Update App.tsx Routing**

**File:** `src/App.tsx`

```typescript
// Add legal route if missing
import { Legal } from '@/pages/Legal';

// In routes configuration:
<Route path="/legal" element={<Legal />} />
<Route path="/legal/cases" element={<LegalCases />} />
<Route path="/legal/documents" element={<LegalDocuments />} />
```

**Verify all unified system routes:**
```typescript
const routes = [
  { path: '/finance', component: Finance, icon: DollarSign },
  { path: '/legal', component: Legal, icon: Scale },
  { path: '/contracts', component: Contracts, icon: FileText },
  { path: '/customers', component: Customers, icon: Users },
  { path: '/fleet', component: Fleet, icon: Car },
];
```

**Acceptance Criteria:**
- [ ] All unified system routes defined
- [ ] Navigation menu updated
- [ ] Proper route protection implemented
- [ ] Breadcrumb navigation working

---

### PHASE 4: Payment System Enhancement
**Duration:** 2-3 days  
**Priority:** MEDIUM  
**Dependencies:** Phase 1

**Task 4.1: Review UnifiedPaymentForm**

**File:** `src/components/finance/UnifiedPaymentForm.tsx`

**Current Features to Verify:**
```typescript
interface UnifiedPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'customer_payment' | 'vendor_payment';
  onSuccess?: () => void;
  onCancel?: () => void;
  options?: {
    autoCreateJournalEntry?: boolean;
    requireApproval?: boolean;
    enableNotifications?: boolean;
    showJournalPreview?: boolean;
  };
}
```

**Enhancements Needed:**
1. Multi-invoice payment allocation
2. Partial payment handling
3. Payment method validation
4. Receipt generation
5. SMS/Email notification integration

**Acceptance Criteria:**
- [ ] Payment form handles all scenarios
- [ ] Journal entries created automatically
- [ ] Payment allocation logic correct
- [ ] Receipt generation working
- [ ] Notification system integrated

**Task 4.2: SmartPaymentAllocation Integration**

**File:** `src/components/finance/SmartPaymentAllocation.tsx`

**Features to Implement:**
- Intelligent invoice matching
- FIFO/LIFO allocation strategies
- Partial payment distribution
- Credit note application
- Outstanding balance calculation

**Task 4.3: PaymentLinkingTroubleshooter**

**Purpose:** Diagnose and fix payment linking issues

**Features:**
- Detect orphaned payments
- Re-link payments to correct invoices
- Fix journal entry inconsistencies
- Generate reconciliation reports

---

### PHASE 5: Database Schema Verification
**Duration:** 3-4 days  
**Priority:** HIGH  
**Dependencies:** None (can run in parallel)

**Task 5.1: Verify Table Existence**

**Script to Create:**
```sql
-- verify_tables.sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count,
  (SELECT COUNT(*) FROM information_schema.table_constraints 
   WHERE table_name = t.table_name AND constraint_type = 'PRIMARY KEY') as has_pk
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Tables (160+):**
```
Core:
- companies
- profiles
- user_roles
- employees

Financial (20+ tables):
- chart_of_accounts
- journal_entries
- journal_entry_lines
- payments
- payment_allocations
- invoices
- budget_items
- cost_centers
- financial_reports
- bank_transactions
- treasury_transactions
- purchase_orders
- vendors

Legal (10+ tables):
- legal_cases
- legal_documents
- court_sessions
- legal_fees
- legal_consultations
- legal_correspondence

Customer & Contracts (15+ tables):
- customers
- customer_documents
- blacklisted_customers
- contracts
- contract_payment_schedules
- contract_documents

Fleet (25+ tables):
- vehicles
- vehicle_maintenance
- vehicle_documents
- vehicle_dispatch_permits
- vehicle_return_forms
- vehicle_insurance
- vehicle_pricing
- traffic_violations

Property (15+ tables):
- properties
- property_owners
- property_contracts
- property_tenants
- property_maintenance

HR (10+ tables):
- employees
- attendance_records
- leave_requests
- payroll_records
```

**Acceptance Criteria:**
- [ ] All 160+ tables verified
- [ ] All tables have primary keys
- [ ] All tables have company_id column (for multi-tenancy)
- [ ] All foreign keys properly defined

**Task 5.2: Verify RLS Policies**

**For each table, verify:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'customers';

-- Check policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customers';
```

**Expected RLS Pattern:**
```sql
-- Example for customers table
CREATE POLICY "company_isolation" ON customers
FOR ALL TO authenticated
USING (company_id = (auth.jwt() ->> 'user_metadata')::json ->> 'company_id');
```

**Acceptance Criteria:**
- [ ] RLS enabled on all tables
- [ ] Company isolation policy on all multi-tenant tables
- [ ] No data leakage between companies
- [ ] Performance impact acceptable

**Task 5.3: Verify Legal System Tables**

**Critical Legal Tables:**
```sql
-- legal_consultations
CREATE TABLE IF NOT EXISTS legal_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  query TEXT NOT NULL,
  response TEXT,
  query_type VARCHAR(50),
  risk_score DECIMAL(5,2),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- legal_documents
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  document_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  template_used VARCHAR(100),
  country_law VARCHAR(20),
  generated_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- legal_cases
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  case_number VARCHAR(100) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  case_type VARCHAR(50),
  status VARCHAR(20),
  court_name VARCHAR(200),
  filing_date DATE,
  hearing_date DATE,
  amount_claimed DECIMAL(15,3),
  currency VARCHAR(3),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Legal tables created with proper schema
- [ ] Indexes on foreign keys
- [ ] Triggers for audit logging
- [ ] Sample data for testing

**Task 5.4: Create Database Functions**

**Function 1: Calculate Customer Risk Score**
```sql
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(
  p_customer_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_payment_delay INTEGER;
  v_unpaid_amount DECIMAL;
  v_violation_count INTEGER;
  v_risk_score DECIMAL;
BEGIN
  -- Calculate payment delay
  SELECT COALESCE(MAX(CURRENT_DATE - due_date), 0)
  INTO v_payment_delay
  FROM payments
  WHERE customer_id = p_customer_id
  AND status = 'pending';
  
  -- Calculate unpaid amount
  SELECT COALESCE(SUM(amount), 0)
  INTO v_unpaid_amount
  FROM invoices
  WHERE customer_id = p_customer_id
  AND status = 'unpaid';
  
  -- Count violations
  SELECT COUNT(*)
  INTO v_violation_count
  FROM traffic_violations tv
  JOIN contracts c ON c.vehicle_id = tv.vehicle_id
  WHERE c.customer_id = p_customer_id
  AND tv.status = 'pending';
  
  -- Calculate weighted risk score (0-100)
  v_risk_score := 
    (v_payment_delay * 0.35) +
    (LEAST(v_unpaid_amount / 100, 30) * 0.30) +
    (LEAST(v_violation_count * 5, 20) * 0.20);
  
  RETURN LEAST(v_risk_score, 100);
END;
$$ LANGUAGE plpgsql;
```

**Function 2: Generate Legal Document**
```sql
CREATE OR REPLACE FUNCTION generate_legal_document(
  p_customer_id UUID,
  p_document_type VARCHAR,
  p_country VARCHAR
) RETURNS JSON AS $$
DECLARE
  v_customer RECORD;
  v_document JSON;
BEGIN
  -- Fetch customer data
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id;
  
  -- Generate document based on type and country
  -- Return structured document data
  
  RETURN v_document;
END;
$$ LANGUAGE plpgsql;
```

---

### PHASE 6: Testing & Validation
**Duration:** 4-5 days  
**Priority:** HIGH  
**Dependencies:** Phases 1-5

**Task 6.1: Unit Tests for UnifiedFinancialDashboard**

**Test File:** `src/components/finance/__tests__/UnifiedFinancialDashboard.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { UnifiedFinancialDashboard } from '../UnifiedFinancialDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('UnifiedFinancialDashboard', () => {
  it('should render all tabs', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UnifiedFinancialDashboard />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });
  
  it('should load financial metrics', async () => {
    // Test metric cards display
    // Test data loading
    // Test error handling
  });
  
  it('should open payment form', async () => {
    // Test payment form dialog
  });
});
```

**Test Coverage Requirements:**
- Component rendering: 100%
- Data loading: 100%
- User interactions: 90%+
- Error scenarios: 100%

**Task 6.2: Unit Tests for EnhancedLegalAIInterface_v2**

**Test Scenarios:**
1. Query processing
2. Customer search
3. Document generation
4. Risk analysis calculation
5. API key validation
6. Error handling

**Task 6.3: Integration Tests**

**Payment Flow Test:**
```typescript
describe('Payment Flow Integration', () => {
  it('should create payment and journal entry', async () => {
    // 1. Open UnifiedPaymentForm
    // 2. Fill in payment details
    // 3. Submit payment
    // 4. Verify journal entry created
    // 5. Verify customer balance updated
    // 6. Verify notifications sent
  });
});
```

**Contract Creation Test:**
```typescript
describe('Contract Creation Workflow', () => {
  it('should create contract with all integrations', async () => {
    // 1. Open EnhancedContractForm
    // 2. Select customer
    // 3. Select vehicle
    // 4. Generate payment schedule
    // 5. Create journal entries
    // 6. Update vehicle status
    // 7. Send notifications
  });
});
```

**Task 6.4: End-to-End Testing**

Use Cypress or Playwright for E2E tests:

```typescript
// cypress/e2e/legal-system.cy.ts
describe('Legal AI System E2E', () => {
  it('should complete legal consultation workflow', () => {
    cy.login();
    cy.visit('/legal');
    cy.get('[data-testid="query-input"]').type('تحليل مخاطر العميل أحمد');
    cy.get('[data-testid="submit-query"]').click();
    cy.get('[data-testid="risk-score"]').should('be.visible');
    cy.get('[data-testid="generate-document"]').click();
    cy.get('[data-testid="document-preview"]').should('exist');
  });
});
```

**Acceptance Criteria:**
- [ ] 80%+ test coverage for critical paths
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests for major workflows
- [ ] Performance tests passing

---

### PHASE 7: Performance Optimization
**Duration:** 3-4 days  
**Priority:** MEDIUM  
**Dependencies:** Phase 6

**Task 7.1: Code Splitting Implementation**

**Lazy Load Routes:**
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load heavy components
const UnifiedFinancialDashboard = lazy(() => 
  import('@/components/finance').then(m => ({ 
    default: m.UnifiedFinancialDashboard 
  }))
);

const EnhancedLegalAIInterface_v2 = lazy(() =>
  import('@/components/legal').then(m => ({
    default: m.EnhancedLegalAIInterface_v2
  }))
);

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <UnifiedFinancialDashboard />
</Suspense>
```

**Expected Impact:**
- Initial bundle size reduction: 40-50%
- Faster initial page load: 60-70%
- Better code splitting by route

**Task 7.2: React Query Optimization**

**Configure Caching Strategy:**
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Implement Smart Prefetching:**
```typescript
// Prefetch related data
const prefetchCustomerData = async (customerId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomer(customerId)
  });
  
  await queryClient.prefetchQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: () => fetchCustomerContracts(customerId)
  });
};
```

**Task 7.3: Database Query Optimization**

**Create Indexes:**
```sql
-- Financial queries
CREATE INDEX idx_payments_customer_status 
ON payments(customer_id, status, payment_date);

CREATE INDEX idx_invoices_customer_date 
ON invoices(customer_id, invoice_date, status);

-- Legal queries
CREATE INDEX idx_legal_consultations_company_date 
ON legal_consultations(company_id, created_at DESC);

-- Contract queries
CREATE INDEX idx_contracts_customer_status 
ON contracts(customer_id, status, start_date);
```

**Optimize Heavy Queries:**
```sql
-- Before: N+1 query problem
SELECT * FROM customers;
-- Then for each customer:
SELECT * FROM contracts WHERE customer_id = ?;

-- After: Join with aggregation
SELECT 
  c.*,
  COUNT(ct.id) as contract_count,
  SUM(CASE WHEN ct.status = 'active' THEN 1 ELSE 0 END) as active_contracts
FROM customers c
LEFT JOIN contracts ct ON c.id = ct.customer_id
GROUP BY c.id;
```

**Acceptance Criteria:**
- [ ] Bundle size reduced by 40%+
- [ ] Initial load time < 3 seconds
- [ ] Query response time < 500ms
- [ ] Database indexes created
- [ ] No N+1 query issues

---

### PHASE 8: Security & Compliance
**Duration:** 3-4 days  
**Priority:** HIGH  
**Dependencies:** All previous phases

**Task 8.1: RLS Policy Audit**

**Verify Every Table:**
```sql
-- Script to audit all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Test Data Isolation:**
```typescript
// Test script
const testCompanyIsolation = async () => {
  // Login as Company A user
  const { data: companyAData } = await supabase
    .from('customers')
    .select('*');
    
  // Login as Company B user
  const { data: companyBData } = await supabase
    .from('customers')
    .select('*');
    
  // Verify no overlap
  const overlap = companyAData.filter(a => 
    companyBData.some(b => b.id === a.id)
  );
  
  expect(overlap.length).toBe(0);
};
```

**Task 8.2: API Key Encryption**

**Implement Secure Storage:**
```typescript
// src/lib/encryption.ts
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY!;

export const encryptApiKey = (apiKey: string): string => {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
};

export const decryptApiKey = (encrypted: string): string => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Usage in APIKeySettings
const saveApiKey = async (apiKey: string) => {
  const encrypted = encryptApiKey(apiKey);
  localStorage.setItem('openai_api_key', encrypted);
};

const getApiKey = (): string => {
  const encrypted = localStorage.getItem('openai_api_key');
  return encrypted ? decryptApiKey(encrypted) : '';
};
```

**Task 8.3: Audit Logging System**

**Create Audit Log Table:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_date 
ON audit_logs(company_id, created_at DESC);
```

**Implement Audit Logging:**
```typescript
// src/hooks/useAuditLog.ts
export const useAuditLog = () => {
  const logAction = async (
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: any
  ) => {
    await supabase.from('audit_logs').insert({
      company_id: user.company_id,
      user_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: changes?.old,
      new_values: changes?.new,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent
    });
  };
  
  return { logAction };
};

// Usage
const { logAction } = useAuditLog();
await updateCustomer(customerId, newData);
await logAction('UPDATE', 'customer', customerId, { old: oldData, new: newData });
```

**Task 8.4: Input Validation**

**Create Validation Schemas:**
```typescript
// src/schemas/customer.schema.ts
import { z } from 'zod';

export const customerSchema = z.object({
  first_name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100)
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط'),
  
  last_name: z.string()
    .min(2)
    .max(100)
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/),
  
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .optional(),
  
  phone: z.string()
    .regex(/^[+]?[0-9]{8,15}$/, 'رقم الهاتف غير صحيح'),
  
  civil_id: z.string()
    .length(12, 'الرقم المدني يجب أن يكون 12 رقم')
    .regex(/^[0-9]+$/, 'الرقم المدني يجب أن يحتوي على أرقام فقط'),
});

// Usage in form
const form = useForm({
  resolver: zodResolver(customerSchema),
  defaultValues: customerData
});
```

**SQL Injection Prevention:**
```typescript
// ✅ Safe - Using parameterized queries
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('civil_id', userInput); // Supabase handles sanitization

// ❌ Unsafe - Never construct raw SQL
const query = `SELECT * FROM customers WHERE civil_id = '${userInput}'`;
```

**XSS Prevention:**
```typescript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

const SafeContent = ({ html }: { html: string }) => {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

**Acceptance Criteria:**
- [ ] All RLS policies tested and verified
- [ ] API keys encrypted at rest
- [ ] Audit logging implemented for sensitive operations
- [ ] Input validation on all forms
- [ ] XSS and SQL injection prevention verified
- [ ] Security audit passed

---

### PHASE 9: Documentation Updates
**Duration:** 2-3 days  
**Priority:** MEDIUM  
**Dependencies:** Phases 1-8

**Task 9.1: Update DEVELOPER_GUIDE.md**

**Content to Add:**
```markdown
## Unified Component Architecture

### Financial System
- **Entry Point:** `UnifiedFinancialDashboard`
- **Location:** `src/components/finance/UnifiedFinancialDashboard.tsx`
- **Usage:**
  ```typescript
  import { UnifiedFinancialDashboard } from '@/components/finance';
  
  <UnifiedFinancialDashboard />
  ```

### Legal AI System
- **Entry Point:** `EnhancedLegalAIInterface_v2`
- **Location:** `src/components/legal/EnhancedLegalAIInterface_v2.tsx`
- **Features:**
  - Intelligent query processing
  - Customer data integration
  - Legal document generation
  - Risk analysis
  
[Continue for all systems...]
```

**Task 9.2: Create API Documentation**

**File:** `docs/API_DOCUMENTATION.md`

**Structure:**
```markdown
# Fleetify API Documentation

## Financial System APIs

### UnifiedFinancialDashboard

#### Props
- None (uses context for company ID)

#### Methods
- `refreshData()`: Manually refresh financial data
- `exportReport(type)`: Export financial report

#### Events
- `onPaymentCreated`: Triggered when payment is created
- `onReportGenerated`: Triggered when report is generated

## Legal AI System APIs

### EnhancedLegalAIInterface_v2

#### Props
```typescript
interface LegalAIInterfaceProps {
  companyId: string;
  onDocumentGenerated?: (document: LegalDocument) => void;
  onRiskAnalysis?: (analysis: RiskAnalysis) => void;
}
```

#### Methods
- `processQuery(query: string)`: Process legal query
- `generateDocument(params)`: Generate legal document
- `analyzeRisk(customerId)`: Analyze customer risk

[Continue...]
```

**Task 9.3: Update UNIFIED_SYSTEM_STATUS.md**

**Add Legal AI System:**
```markdown
## حالة النظام الموحد - Unified System Status

### النظام القانوني الموحد ✅ (مكتمل)
- **النظام الرئيسي**: `EnhancedLegalAIInterface_v2.tsx`
- **الميزات**:
  - ✅ معالجة الاستفسارات الذكية
  - ✅ تكامل بيانات العملاء
  - ✅ إنشاء الوثائق القانونية
  - ✅ تحليل المخاطر
  - ✅ دعم متعدد الدول (الكويت، السعودية، قطر)
- **الأداء**:
  - ⚡ زمن الاستجابة: < 0.01 ثانية
  - 🎯 دقة الوثائق: 95%+
  - 💰 توفير التكلفة: 75%
- **الصفحات المحدثة**: `Legal.tsx`, `LegalDashboard.tsx`

### حالة التوحيد النهائية: 100% مكتمل 🎉 🚀

- ✅ توحيد الأنظمة المالية
- ✅ توحيد الأنظمة القانونية (جديد!)
- ✅ توحيد أنظمة العقود والعملاء
- ✅ توحيد أنظمة الصيانة
- ✅ توحيد أنظمة الدفع
```

**Task 9.4: Create Integration Guide**

**File:** `docs/INTEGRATION_GUIDE.md`

```markdown
# Third-Party Integration Guide

## Payment Gateway Integration

### Supported Gateways
- MyFatoorah (Kuwait)
- Tap Payments (Gulf region)
- Stripe (International)

### Integration Steps
1. Configure payment gateway credentials
2. Implement webhook handlers
3. Map payment methods
4. Test payment flow

[Detailed steps...]

## Government API Integration

### Kuwait Traffic Department
- Fetch violation data
- Submit appeals
- Track payment status

### Saudi Arabia Absher
- Verify identity
- Check vehicle registration
- Validate licenses

[Continue...]
```

**Acceptance Criteria:**
- [ ] DEVELOPER_GUIDE updated with all unified components
- [ ] API documentation complete and accurate
- [ ] UNIFIED_SYSTEM_STATUS reflects current state
- [ ] Integration guide covers major third-party systems
- [ ] Code examples tested and working

---

### PHASE 10: Mobile Compatibility
**Duration:** 3-4 days  
**Priority:** MEDIUM  
**Dependencies:** Phases 1-8

**Task 10.1: Mobile Responsive Design**

**Test All Unified Components:**
```typescript
// Test responsive breakpoints
const breakpoints = {
  mobile: 375,   // iPhone SE
  tablet: 768,   // iPad
  desktop: 1024, // Desktop
  wide: 1440     // Wide desktop
};

// Test each component at each breakpoint
describe('Responsive Design Tests', () => {
  Object.entries(breakpoints).forEach(([device, width]) => {
    it(`should render correctly on ${device} (${width}px)`, () => {
      cy.viewport(width, 800);
      cy.visit('/finance');
      // Verify layout
      // Verify navigation
      // Verify all features accessible
    });
  });
});
```

**Implement Mobile-Specific UI:**
```typescript
// src/components/finance/MobileFinancialDashboard.tsx
export const MobileFinancialDashboard = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return (
      <div className="mobile-dashboard">
        {/* Simplified mobile layout */}
        <Tabs orientation="horizontal">
          {/* Bottom tab navigation */}
        </Tabs>
      </div>
    );
  }
  
  return <UnifiedFinancialDashboard />;
};
```

**Task 10.2: Capacitor Integration Testing**

**Test Native Features:**
```typescript
// src/__tests__/capacitor.test.ts
import { Camera, Filesystem, Geolocation } from '@capacitor/core';

describe('Capacitor Integration', () => {
  it('should access camera for document scanning', async () => {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri
    });
    
    expect(photo.webPath).toBeDefined();
  });
  
  it('should save files to device', async () => {
    await Filesystem.writeFile({
      path: 'test.txt',
      data: 'test data',
      directory: Directory.Documents
    });
    
    const file = await Filesystem.readFile({
      path: 'test.txt',
      directory: Directory.Documents
    });
    
    expect(file.data).toBe('test data');
  });
});
```

**Build Mobile Apps:**
```bash
# iOS
npm run build:mobile
npx cap sync ios
npx cap open ios
# Build in Xcode

# Android
npm run build:mobile
npx cap sync android
npx cap open android
# Build in Android Studio
```

**Task 10.3: Offline Support**

**Implement Service Worker:**
```typescript
// public/service-worker.js
const CACHE_NAME = 'fleetify-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Critical assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**Implement Offline Queue:**
```typescript
// src/lib/offlineQueue.ts
import { openDB } from 'idb';

const db = await openDB('offline-queue', 1, {
  upgrade(db) {
    db.createObjectStore('pending-actions');
  }
});

export const queueAction = async (action: any) => {
  await db.put('pending-actions', action, Date.now());
};

export const processPendingActions = async () => {
  const actions = await db.getAll('pending-actions');
  
  for (const action of actions) {
    try {
      await executeAction(action);
      await db.delete('pending-actions', action.timestamp);
    } catch (error) {
      console.error('Failed to process action:', error);
    }
  }
};
```

**Acceptance Criteria:**
- [ ] All components mobile-responsive
- [ ] Touch gestures working
- [ ] Native features accessible (camera, GPS, files)
- [ ] Offline mode functional for critical features
- [ ] Mobile app builds successfully for iOS and Android

---

### PHASE 11: Deployment Preparation
**Duration:** 3-4 days  
**Priority:** HIGH  
**Dependencies:** All previous phases

**Task 11.1: Production Environment Configuration**

**Environment Variables:**
```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=encrypted-key
VITE_APP_VERSION=3.0.0
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=your-sentry-dsn

# API Settings
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Feature Flags
VITE_ENABLE_LEGAL_AI=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
```

**Build Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
          'finance': ['src/components/finance/UnifiedFinancialDashboard.tsx'],
          'legal': ['src/components/legal/EnhancedLegalAIInterface_v2.tsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

**Task 11.2: CI/CD Pipeline**

**GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run linter
        run: npm run lint
        
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build application
        run: npm run build
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Task 11.3: Database Migration Scripts**

**Migration Strategy:**
```sql
-- migrations/production/001_add_legal_tables.sql
BEGIN;

-- Create legal_consultations table
CREATE TABLE IF NOT EXISTS legal_consultations (
  -- [Schema from Phase 5]
);

-- Create indexes
CREATE INDEX idx_legal_consultations_company_date 
ON legal_consultations(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE legal_consultations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY company_isolation ON legal_consultations
FOR ALL TO authenticated
USING (company_id = (auth.jwt() ->> 'user_metadata')::json ->> 'company_id');

COMMIT;
```

**Migration Runner:**
```typescript
// scripts/run-migrations.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, '../migrations/production');
  const files = fs.readdirSync(migrationsDir).sort();
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Migration failed: ${file}`, error);
      process.exit(1);
    }
    
    console.log(`Migration completed: ${file}`);
  }
};

runMigrations().catch(console.error);
```

**Task 11.4: Final QA Testing**

**QA Checklist:**
```markdown
## Pre-Deployment QA Checklist

### Functional Testing
- [ ] All unified components load without errors
- [ ] User authentication and authorization working
- [ ] Financial system: All features functional
- [ ] Legal AI system: Query processing working
- [ ] Contract creation: Complete workflow tested
- [ ] Payment processing: All payment types working
- [ ] Customer management: CRUD operations functional
- [ ] Fleet management: Vehicle tracking working

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks detected
- [ ] Mobile performance acceptable

### Security Testing
- [ ] RLS policies enforced
- [ ] No data leakage between companies
- [ ] API keys encrypted
- [ ] Input validation working
- [ ] XSS/SQL injection prevented

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome)

### Mobile Testing
- [ ] iOS app builds successfully
- [ ] Android app builds successfully
- [ ] Native features working
- [ ] Offline mode functional

### Accessibility
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] Color contrast ratios meet standards

### Data Integrity
- [ ] Database migrations successful
- [ ] No data loss during migration
- [ ] All relationships intact
- [ ] Backup and restore tested
```

**Load Testing:**
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://app.fleetify.com/api/customers

# Using k6
k6 run --vus 100 --duration 30s load-test.js
```

**Load Test Script:**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failures
  },
};

export default function() {
  const res = http.get('https://app.fleetify.com/api/dashboard');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Acceptance Criteria:**
- [ ] All QA tests passing
- [ ] Load tests meet performance targets
- [ ] Security audit passed
- [ ] Cross-browser compatibility verified
- [ ] Mobile apps tested on physical devices
- [ ] Production environment configured
- [ ] CI/CD pipeline functional
- [ ] Database migrations tested
- [ ] Rollback plan documented

---

## 📊 Progress Tracking

### Phase Completion Status

| Phase | Status | Progress | Est. Duration | Actual Duration | Notes |
|-------|--------|----------|---------------|-----------------|-------|
| Phase 1: Architecture Verification | ⏳ Pending | 0% | 2-3 days | - | - |
| Phase 2: Legal AI System | ⏳ Pending | 0% | 5-7 days | - | Critical priority |
| Phase 3: System Integration | ⏳ Pending | 0% | 3-4 days | - | - |
| Phase 4: Payment Enhancement | ⏳ Pending | 0% | 2-3 days | - | - |
| Phase 5: Database Verification | ⏳ Pending | 0% | 3-4 days | - | - |
| Phase 6: Testing & Validation | ⏳ Pending | 0% | 4-5 days | - | - |
| Phase 7: Performance Optimization | ⏳ Pending | 0% | 3-4 days | - | - |
| Phase 8: Security & Compliance | ⏳ Pending | 0% | 3-4 days | - | - |
| Phase 9: Documentation | ⏳ Pending | 0% | 2-3 days | - | - |
| Phase 10: Mobile Compatibility | ⏳ Pending | 0% | 3-4 days | - | - |
| Phase 11: Deployment Prep | ⏳ Pending | 0% | 3-4 days | - | - |

**Total Estimated Duration:** 33-45 working days (7-9 weeks)

### Task Status Legend
- ⏳ **Pending**: Not started
- 🔄 **In Progress**: Currently being worked on
- ✅ **Complete**: Finished and verified
- ⚠️ **Blocked**: Waiting on dependencies
- ❌ **Failed**: Needs rework

---

## 🎯 Critical Path

The critical path for this implementation is:

```
Phase 1 (Architecture) 
  → Phase 2 (Legal AI) 
    → Phase 3 (Integration) 
      → Phase 5 (Database) 
        → Phase 8 (Security) 
          → Phase 11 (Deployment)
```

**Total Critical Path Duration:** ~25-35 days

Other phases can run in parallel or be scheduled around the critical path.

---

## 🚀 Quick Start Guide

### For Developers Starting Implementation

1. **Read this document thoroughly**
2. **Review the design document** (`design.md`)
3. **Check current system status** (`UNIFIED_SYSTEM_STATUS.md`)
4. **Start with Phase 1** (Architecture Verification)
5. **Follow phases sequentially** unless parallel work is indicated
6. **Update task status** as you progress
7. **Run tests** after each phase completion
8. **Document any deviations** from the plan

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/phase-X-task-Y

# 3. Work on task
# [Your implementation]

# 4. Run tests
npm test

# 5. Commit changes
git add .
git commit -m "Phase X Task Y: [Description]"

# 6. Push and create PR
git push origin feature/phase-X-task-Y

# 7. Update task status in this document
```

---

## 📞 Support & Resources

### Documentation
- **Architecture Design**: `design.md`
- **System Status**: `UNIFIED_SYSTEM_STATUS.md`
- **Developer Guide**: `DEVELOPER_GUIDE.md`
- **Legal AI Docs**: `README_LEGAL_AI_V2.md`

### External Resources
- **React Documentation**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/docs

### Team Communication
- Use GitHub Issues for bugs and feature requests
- Use Pull Requests for code review
- Document major decisions in this file
- Keep task status updated

---

## ✅ Definition of Done

A phase is considered complete when:

- [ ] All tasks in the phase are finished
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No blocking issues remaining
- [ ] Performance targets met
- [ ] Security requirements satisfied

---

**Document maintained by:** Development Team  
**Last updated:** 2025-10-12  
**Next review:** After Phase 2 completion  

