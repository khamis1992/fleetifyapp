# Payments Hooks

<cite>
**Referenced Files in This Document**   
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [SmartPaymentAllocation.tsx](file://src/components/finance/SmartPaymentAllocation.tsx)
- [paymentAllocationEngine.ts](file://src/utils/paymentAllocationEngine.ts)
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts)
- [payment.schema.ts](file://src/schemas/payment.schema.ts)
- [20250829092603_auto_generated_migration.sql](file://supabase/migrations/20250829092603_auto_generated_migration.sql)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Payment Hooks](#core-payment-hooks)
3. [Payment Schedules Management](#payment-schedules-management)
4. [Smart Payment Allocation](#smart-payment-allocation)
5. [Payment Processing Workflow](#payment-processing-workflow)
6. [Error Handling and Reconciliation](#error-handling-and-reconciliation)
7. [Offline-First Architecture](#offline-first-architecture)
8. [Integration with Multiple Payment Methods](#integration-with-multiple-payment-methods)
9. [Currency Conversion and Financial Compliance](#currency-conversion-and-financial-compliance)
10. [Conclusion](#conclusion)

## Introduction
The payment processing system in FleetifyApp provides a comprehensive suite of React hooks and utilities for managing financial transactions with full audit trails. This documentation details the implementation of `usePayments`, `usePaymentSchedules`, and the smart allocation engine that automatically applies payments to outstanding invoices. The system supports multiple payment methods, currency conversion, and operates with an offline-first approach using React Query's mutation cache and background sync capabilities.

## Core Payment Hooks

The `usePayments` hook provides a robust interface for creating, updating, and voiding payment transactions with comprehensive filtering capabilities. It integrates with Supabase for real-time data synchronization and includes built-in error handling and retry mechanisms.

```mermaid
flowchart TD
A["usePayments Hook"] --> B["Authentication Check"]
B --> C["Company ID Validation"]
C --> D["Build Supabase Query"]
D --> E["Apply Filters"]
E --> F["Execute Query"]
F --> G{"Success?"}
G --> |Yes| H["Return Payment Data"]
G --> |No| I["Throw Error with Message"]
H --> J["Enable React Query Caching"]
I --> K["Log Error and Retry"]
```

**Diagram sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)

**Section sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)

## Payment Schedules Management

The `usePaymentSchedules` hook enables management of recurring payments with customizable frequency, start/end dates, and prorated calculations. It supports filtering by status, overdue status, and contract ID, providing a flexible interface for subscription-based billing models.

```mermaid
classDiagram
class usePaymentSchedules {
+filters : PaymentScheduleFilters
+queryKey : string[]
+queryFn() : Promise<PaymentSchedule[]>
+enabled : boolean
}
class PaymentScheduleFilters {
+status : string
+overdue : boolean
+contractId : string
}
class PaymentSchedule {
+id : string
+contract_id : string
+due_date : string
+amount : number
+status : 'pending' | 'completed' | 'skipped'
+created_at : string
}
usePaymentSchedules --> PaymentScheduleFilters : "accepts"
usePaymentSchedules --> PaymentSchedule : "returns"
```

**Diagram sources**
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts#L36-L90)

**Section sources**
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts#L36-L90)

## Smart Payment Allocation

The smart allocation engine automatically applies payments to outstanding invoices using the `useSmartPaymentAllocation` hook. It supports multiple allocation strategies including FIFO (First-In, First-Out), highest interest first, and nearest due date first. The engine calculates confidence scores and provides suggestions for optimal payment distribution.

```mermaid
sequenceDiagram
participant UI as "User Interface"
participant Hook as "useSmartPaymentAllocation"
participant Engine as "PaymentAllocationEngine"
participant DB as "Supabase Database"
UI->>Hook : initiateSmartAllocation(paymentId, amount)
Hook->>Engine : allocatePayment(paymentData)
Engine->>DB : suggest_payment_allocation(customer_id, amount)
DB-->>Engine : JSONB with allocation suggestions
Engine->>Hook : return AllocationResult
Hook->>UI : update UI with allocation results
UI->>DB : confirm allocation (create journal entries)
```

**Diagram sources**
- [SmartPaymentAllocation.tsx](file://src/components/finance/SmartPaymentAllocation.tsx#L43-L77)
- [paymentAllocationEngine.ts](file://src/utils/paymentAllocationEngine.ts#L0-L61)
- [20250829092603_auto_generated_migration.sql](file://supabase/migrations/20250829092603_auto_generated_migration.sql#L0-L41)

**Section sources**
- [SmartPaymentAllocation.tsx](file://src/components/finance/SmartPaymentAllocation.tsx#L43-L77)
- [paymentAllocationEngine.ts](file://src/utils/paymentAllocationEngine.ts#L0-L61)

## Payment Processing Workflow

The payment processing workflow integrates multiple hooks and services to create a seamless experience from payment creation to reconciliation. The professional payment system orchestrates smart linking, allocation, and journal entry creation in a transactional manner.

```mermaid
flowchart LR
A["Create Payment"] --> B["Smart Linking to Contracts"]
B --> C["Smart Allocation to Invoices"]
C --> D["Journal Entry Creation"]
D --> E["Audit Trail Logging"]
E --> F["Update Customer Balance"]
F --> G["Generate Receipt"]
subgraph "Error Handling"
H["Insufficient Funds"] --> I["Hold Payment"]
J["Duplicate Payment"] --> K["Merge or Refund"]
L["Reconciliation Issues"] --> M["Manual Review Queue"]
end
```

**Diagram sources**
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts#L403-L434)
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts#L224-L265)

**Section sources**
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts#L224-L434)

## Error Handling and Reconciliation

The system addresses common payment error states through comprehensive validation and reconciliation processes. Insufficient funds trigger payment holds, duplicate payments are detected through unique transaction ID checks, and reconciliation issues with bank statements are flagged for manual review.

```mermaid
stateDiagram-v2
[*] --> Idle
Idle --> Processing : "Payment Created"
Processing --> Success : "Fully Allocated"
Processing --> Partial : "Partially Allocated"
Processing --> Failed : "Validation Error"
Failed --> Retry : "Retry After Fix"
Partial --> Completed : "Remaining Amount Paid"
Success --> Reconciled : "Bank Statement Match"
Reconciled --> [*]
Failed --> ManualReview : "Requires Human Intervention"
ManualReview --> Resolved : "Issue Addressed"
Resolved --> Success
```

**Diagram sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)
- [payment.schema.ts](file://src/schemas/payment.schema.ts)

**Section sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)

## Offline-First Architecture

The payment system implements an offline-first approach using React Query's mutation cache and background sync capabilities. Payments can be created, updated, or voided while offline, with changes automatically synchronized when connectivity is restored.

```mermaid
flowchart TD
A["User Action"] --> B{"Online?"}
B --> |Yes| C["Immediate API Call"]
B --> |No| D["Store in Mutation Cache"]
D --> E["Update Local UI"]
E --> F["Background Sync Monitor"]
F --> G{"Connection Restored?"}
G --> |Yes| H["Sync with Server"]
G --> |No| I["Wait for Connection"]
H --> J["Resolve Conflicts"]
J --> K["Update Cache"]
K --> L["Emit Sync Events"]
```

**Diagram sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts)

**Section sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)

## Integration with Multiple Payment Methods

The system supports integration with multiple payment methods including bank transfer, credit card, and cash. Each payment method has specific validation rules and processing workflows, with automatic currency conversion for international transactions.

```mermaid
erDiagram
PAYMENT ||--o{ PAYMENT_METHOD : uses
PAYMENT ||--o{ CURRENCY_CONVERSION : requires
PAYMENT ||--o{ AUDIT_TRAIL : generates
PAYMENT {
string id PK
string payment_method FK
string currency
number amount
string status
datetime payment_date
string company_id
string customer_id
string contract_id
string invoice_id
}
PAYMENT_METHOD {
string id PK
string method_name
boolean is_active
json processing_rules
string company_id
}
CURRENCY_CONVERSION {
string id PK
string from_currency
string to_currency
number rate
datetime effective_date
string source
}
AUDIT_TRAIL {
string id PK
string entity_type
string entity_id
string action
json before_state
json after_state
string user_id
datetime timestamp
string company_id
}
```

**Diagram sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)
- [payment.schema.ts](file://src/schemas/payment.schema.ts)

**Section sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L47-L153)

## Currency Conversion and Financial Compliance

Currency conversion is handled through a dedicated service that integrates with external exchange rate APIs and maintains a local cache for offline access. The system ensures financial compliance by maintaining complete audit trails of all transactions and adhering to accounting standards for revenue recognition.

```mermaid
flowchart LR
A["Payment in Foreign Currency"] --> B["Check Local Conversion Cache"]
B --> C{"Rate Exists?"}
C --> |Yes| D["Apply Cached Rate"]
C --> |No| E["Fetch Rate from External API"]
E --> F["Store in Cache"]
F --> D
D --> G["Convert to Base Currency"]
G --> H["Create Dual-Currency Journal Entry"]
H --> I["Log Audit Trail"]
I --> J["Ensure Compliance with Accounting Standards"]
```

**Diagram sources**
- [paymentAllocationEngine.ts](file://src/utils/paymentAllocationEngine.ts#L210-L248)
- [useProfessionalPaymentSystem.ts](file://src/hooks/useProfessionalPaymentSystem.ts)

**Section sources**
- [paymentAllocationEngine.ts](file://src/utils/paymentAllocationEngine.ts#L210-L248)

## Conclusion
The payment processing hooks in FleetifyApp provide a comprehensive, robust, and user-friendly system for managing financial transactions. With support for recurring payments, smart allocation, multiple payment methods, and offline operation, the system meets the needs of modern financial applications while maintaining strict compliance and audit requirements. The modular design allows for easy extension and customization to meet specific business requirements.