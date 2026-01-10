# Payment Service API Documentation

## نظرة عامة

توثيق شامل لـ Payment System APIs، بما في ذلك جميع الخدمات والوظائف والـ types.

---

## PaymentService

الخدمة الرئيسية لإدارة المدفوعات.

### createPayment()

إنشاء دفعة جديدة.

```typescript
interface PaymentCreationData {
  company_id: string;
  customer_id: string;
  contract_id?: string;
  invoice_id?: string;
  payment_date: string; // ISO 8601
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'cheque' | 'online_payment' | 'wallet' | 'other';
  payment_type?: 'rental_income' | 'security_deposit' | 'utility_payment' | 'maintenance_fee' | 'late_fee' | 'penalty' | 'refund' | 'other_income' | 'expense_payment';
  transaction_type?: 'income' | 'expense';
  reference_number?: string;
  agreement_number?: string;
  check_number?: string;
  bank_id?: string;
  notes?: string;
  created_by?: string;
  idempotency_key?: string;
  create_invoice?: boolean;
}

interface PaymentCreationResult {
  success: boolean;
  payment?: Payment;
  error?: string;
  errors?: string[];
}
```

**المعاملات**:
- `paymentData` - بيانات إنشاء الدفعة

**العودة**:
- `Promise<PaymentCreationResult>`

**مثال**:

```typescript
const result = await paymentService.createPayment({
  company_id: 'company-123',
  customer_id: 'customer-456',
  payment_date: new Date().toISOString(),
  amount: 1000,
  payment_method: 'cash',
  payment_type: 'rental_income',
  transaction_type: 'income',
  idempotency_key: 'unique-key-123'
});

if (result.success) {
  console.log('Payment created:', result.payment);
} else {
  console.error('Error:', result.error);
}
```

---

### processPayment()

معالجة دفعة (ربط، فاتورة، إلخ).

```typescript
interface PaymentProcessingResult {
  success: boolean;
  payment?: Payment;
  error?: string;
}
```

**المعاملات**:
- `paymentId` - معرف الدفعة

**العودة**:
- `Promise<PaymentProcessingResult>`

**مثال**:

```typescript
const result = await paymentService.processPayment('payment-789');

if (result.success) {
  console.log('Payment processed:', result.payment);
} else {
  console.error('Error:', result.error);
}
```

---

### allocatePayment()

ربط دفعة بعقد أو فاتورة.

```typescript
interface AllocationResult {
  success: boolean;
  payment?: Payment;
  error?: string;
}
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `targetId` - معرف العقد أو الفاتورة
- `targetType` - 'contract' أو 'invoice'

**العودة**:
- `Promise<AllocationResult>`

**مثال**:

```typescript
const result = await paymentService.allocatePayment('payment-789', 'contract-123', 'contract');
```

---

### validatePayment()

التحقق من صحة بيانات الدفعة.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

**المعاملات**:
- `paymentData` - بيانات الدفعة للتحقق

**العودة**:
- `Promise<ValidationResult>`

---

### updatePaymentStatus()

تحديث حالة الدفعة.

```typescript
interface StatusUpdateResult {
  success: boolean;
  payment?: Payment;
  error?: string;
}
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `newStatus` - الحالة الجديدة (اختياري)
- `newProcessingStatus` - حالة المعالجة الجديدة (اختياري)
- `notes` - ملاحظات (اختياري)

**العودة**:
- `Promise<StatusUpdateResult>`

---

## PaymentLinkingService

خدمة موحدة لربط المدفوعات.

### findMatchingSuggestions()

البحث عن اقتراحات الربط.

```typescript
interface PaymentMatchSuggestion {
  targetType: 'invoice' | 'contract';
  targetId: string;
  confidence: number; // 0-100
  reason: string;
}
```

**المعاملات**:
- `payment` - كائن الدفعة

**العودة**:
- `Promise<PaymentMatchSuggestion[]>`

**مثال**:

```typescript
const suggestions = await paymentLinkingService.findMatchingSuggestions(payment);
// [
//   {
//     targetType: 'invoice',
//     targetId: 'invoice-123',
//     confidence: 95,
//     reason: 'Reference number match: INV-1234'
//   },
//   ...
// ]
```

---

### attemptAutoMatch()

محاولة المطابقة التلقائية.

```typescript
interface PaymentMatchResult {
  success: boolean;
  payment?: Payment;
  error?: string;
}
```

**المعاملات**:
- `payment` - كائن الدفعة

**العودة**:
- `Promise<PaymentMatchResult | null>` (null if no match)

---

### matchPayment()

ربط يدوي.

```typescript
async matchPayment(
  paymentId: string,
  targetType: 'invoice' | 'contract',
  targetId: string
): Promise<PaymentMatchResult>
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `targetType` - نوع الهدف
- `targetId` - معرف الهدف

**العودة**:
- `Promise<PaymentMatchResult>`

---

## PaymentStateMachine

إدارة حالات المدفوعات.

### transitionPaymentState()

انتقال إلى حالة جديدة.

```typescript
async transitionPaymentState(
  paymentId: string,
  newStatus?: PaymentStatus,
  newProcessingStatus?: ProcessingStatus,
  notes?: string
): Promise<Payment>
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `newStatus` - الحالة الجديدة (اختياري)
- `newProcessingStatus` - حالة المعالجة الجديدة (اختياري)
- `notes` - ملاحظات (اختياري)

**العودة**:
- `Promise<Payment>`

---

### markAsProcessing()

وضع الدفعة في حالة المعالجة.

```typescript
async markAsProcessing(paymentId: string): Promise<Payment>
```

---

### markAsCompleted()

إكمال الدفعة.

```typescript
async markAsCompleted(paymentId: string): Promise<Payment>
```

---

### markAsFailed()

إفشال الدفعة.

```typescript
async markAsFailed(paymentId: string, reason: string): Promise<Payment>
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `reason` - سبب الفشل

---

### markForRetry()

وضع الدفعة لإعادة المحاولة.

```typescript
async markForRetry(paymentId: string): Promise<Payment>
```

---

### markAsCancelled()

إلغاء الدفعة.

```typescript
async markAsCancelled(paymentId: string): Promise<Payment>
```

---

## PaymentQueueService

إدارة قائمة انتظار المدفوعات.

### addPaymentToQueue()

إضافة دفعة للقائمة.

```typescript
interface QueuedPayment {
  payment_id: string;
  queue_type: 'processing' | 'retry' | 'manual_review';
  attempts: number;
  error_message: string | null;
  next_attempt_at: string | null;
}
```

**المعاملات**:
- `paymentId` - معرف الدفعة
- `queueType` - نوع القائمة
- `errorMessage` - رسالة الخطأ (اختياري)

**العودة**:
- `Promise<QueuedPayment | null>`

---

### processQueue()

معالجة المدفوعات في القائمة.

```typescript
async processQueue(): Promise<void>
```

**ملاحظة**: يتم استدعائها بواسطة Job Scheduler (كل 5 دقائق).

---

### getManualReviewPayments()

الحصول على المدفوعات المطلوبة للمراجعة.

```typescript
async getManualReviewPayments(): Promise<Payment[]>
```

---

### removeFromQueue()

إزالة دفعة من القائمة.

```typescript
async removeFromQueue(paymentId: string): Promise<void>
```

---

## PaymentTransactionService

إدارة المعاملات والاسترجاع.

### executeInTransaction()

تنفيذ عمل داخل transaction مع إعادة المحاولة.

```typescript
async executeInTransaction<T>(
  operation: () => Promise<T>,
  transactionId: string
): Promise<T>
```

**المعاملات**:
- `operation` - العمل المطلوب تنفيذه
- `transactionId` - معرف المعاملة

**العودة**:
- `Promise<T>`

**مثال**:

```typescript
const result = await paymentTransactionService.executeInTransaction(async () => {
  // Complex operations
  await operation1();
  await operation2();
  
  return finalResult;
}, 'transaction-123');
```

---

## PaymentNumberGenerator

توليد أرقام المدفوعات.

### generatePaymentNumber()

إنشاء رقم دفعة جديد.

```typescript
interface PaymentNumberFormat {
  prefix?: string;
  separator?: string;
  serialLength?: number;
}

interface NumberGenerationResult {
  success: boolean;
  number: string;
  error?: string;
}
```

**المعاملات**:
- `companyId` - معرف الشركة
- `options` - خيارات التنسيق (اختياري)

**العودة**:
- `Promise<NumberGenerationResult>`

**مثال**:

```typescript
const result = await paymentNumberGenerator.generatePaymentNumber('company-123');
// { success: true, number: 'PAY-0001' }
```

---

### validatePaymentNumber()

التحقق من صحة رقم الدفعة.

```typescript
validatePaymentNumber(number: string): boolean
```

---

## InvoiceNumberGenerator

توليد أرقام الفواتير.

### generateInvoiceNumber()

إنشاء رقم فاتورة جديد.

```typescript
interface InvoiceNumberFormat {
  prefix?: string;
  separator?: string;
  serialLength?: number;
}

interface NumberGenerationResult {
  success: boolean;
  number: string;
  error?: string;
}
```

**المعاملات**:
- `companyId` - معرف الشركة
- `options` - خيارات التنسيق (اختياري)

**العودة**:
- `Promise<NumberGenerationResult>`

**مثال**:

```typescript
const result = await invoiceNumberGenerator.generateInvoiceNumber('company-123');
// { success: true, number: 'INV-0001' }
```

---

### validateInvoiceNumber()

التحقق من صحة رقم الفاتورة.

```typescript
validateInvoiceNumber(number: string): boolean
```

---

## CustomerDetailsService

خدمة تفاصيل العملاء.

### getCustomerDetails()

الحصول على تفاصيل العميل.

```typescript
interface CustomerDetails {
  id: string;
  companyId: string;
  customerType: 'individual' | 'company';
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  companyName?: string;
  companyNameAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  preferredContactMethod: 'phone' | 'whatsapp' | 'email';
}
```

**المعاملات**:
- `customerId` - معرف العميل

**العودة**:
- `Promise<CustomerDetails | null>`

---

### updateCustomerDetails()

تحديث تفاصيل العميل.

```typescript
async updateCustomerDetails(
  customerId: string,
  updates: Partial<Omit<CustomerDetails, 'id' | 'companyId' | 'customerType'>>
): Promise<{ success: boolean; error?: string }>
```

---

### searchCustomers()

البحث عن العملاء.

```typescript
interface CustomerSearchResult {
  customers: CustomerDetails[];
  totalCount: number;
  page: number;
  pageSize: number;
}

async searchCustomers(
  companyId: string,
  options: {
    query?: string;
    customerType?: 'individual' | 'company';
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<CustomerSearchResult>
```

---

## NotificationService

خدمة الإشعارات.

### sendPaymentReceipt()

إرسال إيصال دفعة.

```typescript
async sendPaymentReceipt(
  customerId: string,
  payment: Payment,
  channels?: Array<'whatsapp' | 'sms' | 'email'>,
  autoSend?: boolean
): Promise<{ success: boolean; errors: string[] }>
```

**المعاملات**:
- `customerId` - معرف العميل
- `payment` - كائن الدفعة
- `channels` - القنوات (اختياري، افتراضي: ['whatsapp', 'email'])
- `autoSend` - إرسال تلقائي (اختياري، افتراضي: true)

**العودة**:
- `Promise<{ success: boolean; errors: string[] }>`

---

## AccountingService

خدمة المحاسبة.

### updateAccountBalancesForPayment()

تحديث أرصدة الحسابات.

```typescript
async updateAccountBalancesForPayment(payment: Payment): Promise<void>
```

---

### createJournalEntryForPayment()

إنشاء قيد محاسبي.

```typescript
async createJournalEntryForPayment(payment: Payment): Promise<void>
```

---

## LateFeeCalculator

حساب رسوم التأخير.

### calculateLateFee()

حساب رسوم التأخير لدفعة.

```typescript
async calculateLateFee(payment: Payment): Promise<number>
```

**المعاملات**:
- `payment` - كائن الدفعة

**العودة**:
- `Promise<number>` - المبلغ المحسوب

---

### applyLateFeesToOverduePayments()

تطبيق رسوم التأخير على جميع المدفوعات المتأخرة.

```typescript
async applyLateFeesToOverduePayments(): Promise<void>
```

**ملاحظة**: يتم استدعائها بواسطة Job Scheduler (يومياً).

---

## LateFeeRulesService

خدمة قواعد رسوم التأخير.

### createRule()

إنشاء قاعدة جديدة.

```typescript
interface LateFeeRule {
  company_id: string;
  contract_id?: string;
  rule_name: string;
  description?: string;
  fee_type: 'fixed_amount' | 'percentage_daily' | 'percentage_monthly';
  amount?: number;
  percentage?: number;
  grace_period_days?: number;
  max_amount?: number;
  min_amount?: number;
  is_active: boolean;
  priority: number;
}

async createRule(ruleData: Omit<LateFeeRule, 'id' | 'created_at' | 'updated_at'>): Promise<LateFeeRule>
```

---

### getApplicableRules()

الحصول على القواعد المطبقة.

```typescript
async getApplicableRules(companyId: string, contractId?: string): Promise<LateFeeRule[]>
```

---

### updateRule()

تحديث قاعدة.

```typescript
async updateRule(ruleId: string, updates: Partial<LateFeeRule>): Promise<LateFeeRule>
```

---

### deactivateRule()

إلغاء تفعيل قاعدة.

```typescript
async deactivateRule(ruleId: string): Promise<LateFeeRule>
```

---

## BankReconciliationService

خدمة التسوية البنكية.

### importBankTransactions()

استيراد سجلات البنوك.

```typescript
interface BankTransaction {
  company_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  bank_account_id: string;
  reference_number?: string;
  external_id?: string;
  reconciliation_status: 'unreconciled' | 'partially_reconciled' | 'reconciled';
}

async importBankTransactions(
  companyId: string,
  transactionsData: any[]
): Promise<BankTransaction[]>
```

---

### autoReconcile()

مطابقة تلقائية.

```typescript
async autoReconcile(companyId: string): Promise<{ matched: number; unmatched: number }>
```

---

### manualReconcile()

مطابقة يدوية.

```typescript
async manualReconcile(bankTransactionId: string, paymentId: string): Promise<void>
```

---

## PaymentAnalyticsService

خدمة التحليلات والتقارير.

### getPaymentKPIs()

الحصول على KPIs للمدفوعات.

```typescript
interface PaymentKPIs {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  averagePaymentAmount: number;
  paymentCount: number;
  onTimePaymentRate: number;
  overduePaymentCount: number;
  totalLateFeesCollected: number;
}

async getPaymentKPIs(companyId: string, startDate: string, endDate: string): Promise<PaymentKPIs>
```

---

## DataQualityService

خدمة جودة البيانات.

### reportIssue()

إبلاغ عن مشكلة جودة البيانات.

```typescript
interface DataQualityIssue {
  company_id: string;
  entity_type: string;
  entity_id: string;
  issue_type: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

async reportIssue(issueData: Omit<DataQualityIssue, 'id' | 'created_at' | 'updated_at'>): Promise<DataQualityIssue>
```

---

### runChecksForEntity()

تشغيل فحوصص جودة البيانات.

```typescript
async runChecksForEntity(companyId: string, entityType: string, entityId: string, entityData: any): Promise<void>
```

---

## OverdueManagementService

خدمة إدارة المتأخرات.

### calculateOverdueContracts()

حساب العقود المتأخرة.

```typescript
async calculateOverdueContracts(
  companyId: string,
  options: {
    asOfDate?: string;
    minDaysOverdue?: number;
    includeInactiveContracts?: boolean;
  }
): Promise<{
  contracts: OverdueContract[];
  summary: {
    totalOverdue: number;
    totalValueOverdue: number;
    statusBreakdown: any;
  };
}>
```

---

### sendOverdueReminders()

إرسال تذكيرات المتأخرات.

```typescript
async sendOverdueReminders(
  companyId: string,
  options: {
    contracts?: string[];
    channels?: Array<'whatsapp' | 'sms' | 'email'>;
    force?: boolean;
  }
): Promise<{ sentCount: number; errors: string[] }>
```

---

### getOverdueSummary()

الحصول على ملخص المتأخرات.

```typescript
interface OverdueSummary {
  companyId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalContracts: number;
  totalOverdue: number;
  totalValueOverdue: number;
  statusBreakdown: any;
  actionsTaken: any;
  estimatedCollectionRate: number;
  predictedCollectionAmount: number;
  calculatedAt: string;
}

async getOverdueSummary(companyId: string, options: { startDate?: string; endDate?: string } = {}): Promise<OverdueSummary>
```

---

## Types & Enums

### PaymentStatus

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  VOIDED = 'voided'
}
```

### ProcessingStatus

```typescript
enum ProcessingStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  ALLOCATING = 'allocating',
  RECONCILING = 'reconciling',
  JOURNALING = 'journaling',
  NOTIFYING = 'notifying',
  MANUAL_REVIEW = 'manual_review',
  CANCELLED = 'cancelled'
}
```

### PaymentMethod

```typescript
enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CHEQUE = 'cheque',
  ONLINE_PAYMENT = 'online_payment',
  WALLET = 'wallet',
  OTHER = 'other'
}
```

### PaymentType

```typescript
enum PaymentType {
  RENTAL_INCOME = 'rental_income',
  SECURITY_DEPOSIT = 'security_deposit',
  UTILITY_PAYMENT = 'utility_payment',
  MAINTENANCE_FEE = 'maintenance_fee',
  LATE_FEE = 'late_fee',
  PENALTY = 'penalty',
  REFUND = 'refund',
  OTHER_INCOME = 'other_income',
  EXPENSE_PAYMENT = 'expense_payment'
}
```

### AllocationStatus

```typescript
enum AllocationStatus {
  UNALLOCATED = 'unallocated',
  PARTIALLY_ALLOCATED = 'partially_allocated',
  ALLOCATED = 'allocated'
}
```

### ReconciliationStatus

```typescript
enum ReconciliationStatus {
  UNRECONCILED = 'unreconciled',
  PARTIALLY_RECONCILED = 'partially_reconciled',
  RECONCILED = 'reconciled'
}
```

---

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|-----------|
| `PAYMENT_EXISTS` | Payment with same idempotency key exists | Use existing payment |
| `CUSTOMER_NOT_FOUND` | Customer not found | Verify customer_id |
| `CONTRACT_NOT_FOUND` | Contract not found | Verify contract_id |
| `INVOICE_NOT_FOUND` | Invoice not found | Verify invoice_id |
| `INVALID_AMOUNT` | Amount invalid | Must be positive |
| `INVALID_STATE_TRANSITION` | Invalid state transition | Check allowed transitions |
| `OVERPAYMENT` | Payment exceeds due amount | Check balance before payment |

---

## Best Practices

### 1. Always use idempotency keys
```typescript
const paymentData = {
  // ...
  idempotency_key: generateUUID()
};
```

### 2. Validate before processing
```typescript
const validationResult = await paymentService.validatePayment(paymentData);
if (!validationResult.valid) {
  // Handle errors
}
```

### 3. Use transactions for complex operations
```typescript
await paymentTransactionService.executeInTransaction(async () => {
  // Multiple operations
}, 'transaction-id');
```

### 4. Handle errors gracefully
```typescript
try {
  const result = await paymentService.createPayment(data);
  if (!result.success) {
    // Show user-friendly error
  }
} catch (error) {
  // Log and show error
}
```

### 5. Monitor payment queues
```typescript
// Check queue size regularly
const queueSize = await paymentQueueService.getQueueSize();
```

---

## Rate Limits

- **Create Payment**: 100 requests/minute per company
- **Process Payment**: 50 requests/minute per company
- **Search Payments**: 200 requests/minute per company

---

## Support

For issues, contact:
- **Tech Lead**: [اسم]
- **Email**: [email]
- **Slack**: [#payments]
