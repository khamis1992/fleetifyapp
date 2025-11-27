# Fleetify API Documentation

**Version**: 1.0.0  
**Last Updated**: September 1, 2025

---

## Table of Contents

1. [Legal AI System API](#legal-ai-system-api)
2. [Payment System API](#payment-system-api)
3. [Financial Dashboard API](#financial-dashboard-api)
4. [Security & Audit API](#security--audit-api)
5. [Performance Monitoring API](#performance-monitoring-api)

---

## Legal AI System API

### Components

#### EnhancedLegalAIInterface_v2

Main interface for Legal AI operations.

**Import:**
```typescript
import { EnhancedLegalAIInterface_v2 } from '@/components/legal';
```

**Props:**
```typescript
interface LegalAIInterfaceProps {
  companyId: string;                                    // Required: Company identifier
  onDocumentGenerated?: (document: LegalDocument) => void;  // Optional: Document callback
  onRiskAnalysis?: (analysis: RiskAnalysis) => void;        // Optional: Risk callback
}
```

**Usage:**
```typescript
<EnhancedLegalAIInterface_v2
  companyId={companyId}
  onDocumentGenerated={(doc) => console.log('Generated:', doc)}
  onRiskAnalysis={(analysis) => console.log('Risk:', analysis)}
/>
```

### Hooks

#### useLegalAI

Core business logic for Legal AI operations.

**Import:**
```typescript
import { useLegalAI } from '@/hooks/useLegalAI';
```

**API:**
```typescript
const {
  processQuery,        // Process legal query
  generateDocument,    // Generate legal document
  analyzeRisk,        // Analyze customer risk
  isProcessing,       // Loading state
  apiKey,            // Current API key
  setApiKey          // Set API key
} = useLegalAI(companyId);
```

**Methods:**

**processQuery()**
```typescript
await processQuery({
  query: string,           // Legal query in Arabic
  country: 'kuwait' | 'saudi' | 'qatar',
  customerId?: string
}): Promise<{
  id: string,
  response: string,
  riskScore?: number
}>
```

**generateDocument()**
```typescript
await generateDocument({
  documentType: 'legal_warning_kuwait' | 'payment_claim_kuwait' | ...,
  customerId: string,
  country: 'kuwait' | 'saudi' | 'qatar',
  data: Record<string, any>
}): Promise<LegalDocument>
```

**analyzeRisk()**
```typescript
await analyzeRisk({
  customerId: string
}): Promise<{
  score: number,
  factors: RiskFactors,
  recommendations: string[]
}>
```

---

## Payment System API

### Components

#### UnifiedPaymentForm

Unified form for all payment types.

**Import:**
```typescript
import { UnifiedPaymentForm } from '@/components/finance';
```

**Props:**
```typescript
interface UnifiedPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'customer_payment' | 'vendor_payment' | 'invoice_payment';
  mode?: 'create' | 'edit' | 'view';
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  contractId?: string;
  initialData?: any;
  onSuccess?: (payment: any) => void;
  onCancel?: () => void;
  options?: {
    autoCreateJournalEntry?: boolean;
    requireApproval?: boolean;
    enableNotifications?: boolean;
    showJournalPreview?: boolean;
  };
}
```

**Usage:**
```typescript
<UnifiedPaymentForm
  open={isOpen}
  onOpenChange={setIsOpen}
  type="customer_payment"
  customerId={customerId}
  onSuccess={(payment) => console.log('Created:', payment)}
  options={{
    autoCreateJournalEntry: true,
    requireApproval: false,
    showJournalPreview: true
  }}
/>
```

#### SmartPaymentAllocation

Smart allocation of payments to obligations.

**Import:**
```typescript
import { SmartPaymentAllocation } from '@/components/finance';
```

**Props:**
```typescript
interface SmartPaymentAllocationProps {
  paymentId: string;
  customerId: string;
  paymentAmount: number;
  onAllocationComplete?: () => void;
}
```

**Strategies:**
- `fifo`: First In, First Out
- `lifo`: Last In, First Out
- `priority`: By days overdue
- `amount`: Smallest first

### Hooks

#### usePaymentOperations

Payment business logic.

**Import:**
```typescript
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
```

**API:**
```typescript
const {
  createPayment,       // Create payment mutation
  updatePayment,       // Update payment mutation
  approvePayment,      // Approve payment mutation
  cancelPayment,       // Cancel payment mutation
  generateJournalPreview,  // Generate journal preview
  isCreating,         // Creating state
  isUpdating,         // Updating state
  canCreatePayments,  // Permission check
  canApprovePayments  // Permission check
} = usePaymentOperations(options);
```

**Methods:**

**createPayment.mutateAsync()**
```typescript
await createPayment.mutateAsync({
  payment_number: string,
  payment_date: string,
  amount: number,
  payment_method: 'cash' | 'check' | 'bank_transfer' | ...,
  type: 'receipt' | 'payment',
  customer_id?: string,
  vendor_id?: string,
  // ... other fields
});
```

---

## Financial Dashboard API

### Components

#### UnifiedFinancialDashboard

Main financial dashboard with 4 tabs.

**Import:**
```typescript
import { UnifiedFinancialDashboard } from '@/components/finance';
```

**Features:**
- Financial alerts
- Analytics charts
- Report generation
- AI insights

**No props required** - Uses company context internally.

---

## Security & Audit API

### Encryption Service

**Import:**
```typescript
import { 
  encryptionService, 
  apiKeyManager,
  secureStorage 
} from '@/lib/encryption';
```

#### API Key Manager

**Store API Key:**
```typescript
await apiKeyManager.storeApiKey(
  apiKey: string,
  userId: string,
  provider: string = 'openai'
): Promise<void>
```

**Retrieve API Key:**
```typescript
const key = await apiKeyManager.getApiKey(
  userId: string,
  provider: string = 'openai'
): Promise<string | null>
```

**Get Masked Key:**
```typescript
const masked = apiKeyManager.getMaskedApiKey(
  provider: string = 'openai'
): string | null
// Returns: "sk-****...****xyz"
```

### Audit Logger

**Import:**
```typescript
import { auditLogger } from '@/lib/auditLogger';
```

#### Methods

**Log Generic Event:**
```typescript
await auditLogger.log({
  event_type: AuditEventType,
  severity: 'low' | 'medium' | 'high' | 'critical',
  company_id: string,
  action: string,
  details?: Record<string, any>,
  success: boolean
});
```

**Log Specific Events:**
```typescript
// Authentication
await auditLogger.logAuth('login', userId, details);

// Payments
await auditLogger.logPayment('created', paymentId, companyId, details);

// Contracts
await auditLogger.logContract('approved', contractId, companyId, details);

// Legal AI
await auditLogger.logLegalAI('consultation', companyId, details);

// Security
await auditLogger.logSecurityEvent('unauthorized_access_attempt', details);
```

**Query Logs:**
```typescript
const logs = await auditLogger.queryLogs({
  companyId: string,
  userId?: string,
  eventType?: AuditEventType,
  startDate?: string,
  endDate?: string,
  severity?: AuditSeverity,
  limit?: number
});
```

**Get Summary:**
```typescript
const summary = await auditLogger.getAuditSummary(
  companyId: string,
  days: number = 30
);
```

---

## Performance Monitoring API

### Legal AI Performance Monitor

**Import:**
```typescript
import { legalAIPerformanceMonitor } from '@/lib/legalAIPerformance';
```

#### Methods

**Track Query:**
```typescript
// Start tracking
const tracking = legalAIPerformanceMonitor.startQuery(
  queryId: string,
  queryType: 'consultation' | 'document' | 'risk_analysis',
  country: string
);

// End tracking
const metrics = legalAIPerformanceMonitor.endQuery(tracking, {
  success: boolean,
  tokensUsed: number,
  costUSD: number,
  customerId?: string,
  errorMessage?: string
});
```

**Get Statistics:**
```typescript
const stats = legalAIPerformanceMonitor.getStats(
  timeRange: 'hour' | 'day' | 'week' | 'all'
);
// Returns: { totalQueries, successfulQueries, averageDuration, totalCost, ... }
```

**Get Performance Report:**
```typescript
const report = legalAIPerformanceMonitor.getPerformanceReport();
```

### Query Client

**Import:**
```typescript
import { 
  queryClient, 
  cacheKeys, 
  staleTimeConfig,
  invalidateFinancialQueries 
} from '@/lib/queryClient';
```

#### Cache Keys

```typescript
// Financial data
cacheKeys.finance.overview(companyId)
cacheKeys.finance.payments(companyId)

// Legal data
cacheKeys.legal.consultations(companyId)
cacheKeys.legal.documents(companyId)

// Static data
cacheKeys.static.banks(companyId)
cacheKeys.static.costCenters(companyId)
```

#### Invalidation

```typescript
// Invalidate financial queries
invalidateFinancialQueries(companyId);

// Invalidate legal queries
invalidateLegalQueries(companyId);

// Invalidate contract queries
invalidateContractQueries(companyId);
```

---

## Database Functions

### Legal AI Functions

Available via Supabase RPC:

**Calculate Risk Score:**
```typescript
const { data, error } = await supabase
  .rpc('calculate_customer_risk_score', {
    p_customer_id: customerId
  });
// Returns: number (0-100)
```

**Get Consultation Stats:**
```typescript
const { data, error } = await supabase
  .rpc('get_legal_consultation_stats', {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate
  });
```

**Get Customer Legal History:**
```typescript
const { data, error } = await supabase
  .rpc('get_customer_legal_history', {
    p_customer_id: customerId
  });
```

### Audit Functions

**Get Audit Logs:**
```typescript
const { data, error } = await supabase
  .rpc('get_audit_logs', {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_event_type: eventType,
    p_severity: severity,
    p_limit: 100
  });
```

**Get Audit Summary:**
```typescript
const { data, error } = await supabase
  .rpc('get_audit_summary', {
    p_company_id: companyId,
    p_days: 30
  });
```

---

## TypeScript Types

### Legal AI Types

```typescript
interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  country: string;
  status: string;
  created_at: string;
}

interface RiskAnalysis {
  score: number;
  factors: {
    paymentDelay: number;
    unpaidAmount: number;
    violationCount: number;
    contractHistory: number;
    litigationHistory: number;
  };
  recommendations: string[];
}
```

### Payment Types

```typescript
interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type: 'receipt' | 'payment';
  payment_status: 'pending' | 'completed' | 'cancelled';
  customer_id?: string;
  vendor_id?: string;
  company_id: string;
}
```

### Audit Types

```typescript
type AuditEventType = 
  | 'user_login'
  | 'payment_created'
  | 'contract_approved'
  | 'legal_consultation'
  | ... // 20+ event types

type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AuditLogEntry {
  id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  company_id?: string;
  action: string;
  details?: Record<string, any>;
  success: boolean;
  created_at: string;
}
```

---

## Best Practices

### Error Handling

Always wrap API calls in try-catch:

```typescript
try {
  const result = await processQuery({ query, country });
  // Handle success
} catch (error) {
  console.error('Query failed:', error);
  toast.error('حدث خطأ في المعالجة');
}
```

### Performance

Use React Query for caching:

```typescript
const { data, isLoading } = useQuery({
  queryKey: cacheKeys.legal.consultations(companyId),
  queryFn: fetchConsultations,
  staleTime: staleTimeConfig.moderate
});
```

### Security

Always encrypt sensitive data:

```typescript
// Store API key encrypted
await apiKeyManager.storeApiKey(apiKey, userId);

// Log sensitive operations
await auditLogger.logSensitiveOperation('api_key_updated', companyId);
```

---

## Support

For issues or questions:
- Check the DEVELOPER_GUIDE.md
- Review test files for usage examples
- Contact: development@fleetify.com
