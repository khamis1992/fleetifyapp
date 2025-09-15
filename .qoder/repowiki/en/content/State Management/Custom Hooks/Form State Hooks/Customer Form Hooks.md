# Customer Form Hooks

<cite>
**Referenced Files in This Document**   
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides a comprehensive analysis of the customer form state management system, focusing on the `useCustomerFormValidation` implementation through integrated hooks and components. The system supports customer creation and editing workflows with real-time duplicate detection, automatic account creation, and robust validation logic. It integrates deeply with business rules for customer identification, contact information, tax details, and financial settings while ensuring accessibility and performance at scale.

## Project Structure
The customer form ecosystem is organized under the `src/components/customers/` directory, with supporting hooks in `src/hooks/` and schema definitions in `src/schemas/`. The architecture follows a modular pattern separating concerns between UI presentation, state management, validation logic, and backend integration.

```mermaid
graph TB
subgraph "Components"
C1[CustomerFormWithDuplicateCheck]
C2[EnhancedCustomerForm]
C3[DuplicateCustomerDialog]
C4[AccountingSettings]
C5[AccountLinking]
end
subgraph "Hooks"
H1[useCustomerDuplicateCheck]
H2[useEnhancedCustomers]
H3[useCustomerOperations]
end
subgraph "Schemas"
S1[customer.schema.ts]
end
C1 --> H1
C2 --> C1
C2 --> H2
C2 --> S1
C4 --> C2
C5 --> C2
H1 --> S1
```

**Diagram sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)

**Section sources**
- [src/components/customers](file://src/components/customers)
- [src/hooks](file://src/hooks)
- [src/schemas](file://src/schemas)

## Core Components
The customer form system centers around two primary components: `EnhancedCustomerForm` as the main interface and `CustomerFormWithDuplicateCheck` as the duplicate detection wrapper. These are supported by validation schemas and custom hooks that manage state, validation, and side effects.

**Section sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

## Architecture Overview
The customer form architecture implements a layered approach combining React Hook Form for state management, Zod for schema validation, and React Query for asynchronous operations. The system uses a step-based wizard pattern with conditional rendering based on customer type and context.

```mermaid
sequenceDiagram
participant UI as EnhancedCustomerForm
participant Wrapper as CustomerFormWithDuplicateCheck
participant Hook as useCustomerDuplicateCheck
participant API as Supabase RPC
participant DB as Database
UI->>UI : Initialize form with react-hook-form
UI->>Wrapper : Pass customer data on change
Wrapper->>Hook : Trigger duplicate check (debounced)
Hook->>API : Call check_duplicate_customer RPC
API->>DB : Query customers table
DB-->>API : Return potential duplicates
API-->>Hook : Return filtered results
Hook-->>Wrapper : Update duplicate status
Wrapper->>UI : Show warning or allow proceed
UI->>UI : Validate form with Zod schema
UI->>UI : Submit to useCustomerOperations
```

**Diagram sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

## Detailed Component Analysis

### EnhancedCustomerForm Analysis
The `EnhancedCustomerForm` component implements a multi-step wizard for customer creation and editing. It supports different contexts (standalone, contract, invoice) and adapts its workflow accordingly. The form uses react-hook-form with Zod resolver for validation and includes mock data generation for testing.

#### For Object-Oriented Components:
```mermaid
classDiagram
class EnhancedCustomerForm {
+mode : 'create'|'edit'|'inline'
+editingCustomer : any
+onSuccess : (customer) => void
+currentStep : string
+completedSteps : string[]
+hasDuplicates : boolean
+forceCreate : boolean
-form : UseFormReturn
-watchedValues : any
-customerType : string
+onSubmit(data)
+nextStep()
+previousStep()
+handleDuplicateDetected(detected)
+handleProceedWithDuplicates()
+generateMockData()
}
class CustomerFormWithDuplicateCheck {
+customerData : CustomerData
+onDuplicateDetected : (has) => void
+onProceedWithDuplicates : () => void
+enableRealTimeCheck : boolean
+excludeCustomerId : string
-showDuplicateDialog : boolean
-showInlineWarning : boolean
-debouncedCustomerData : CustomerData
}
class AccountingSettings {
+control : Control
+customerType : string
+setValue : Function
+getValues : Function
}
class AccountLinking {
+control : Control
+customerType : string
+customerName : string
+companyName : string
}
EnhancedCustomerForm --> CustomerFormWithDuplicateCheck : "uses for duplicate detection"
EnhancedCustomerForm --> AccountingSettings : "renders in accounting step"
EnhancedCustomerForm --> AccountLinking : "renders in linking step"
EnhancedCustomerForm --> react-hook-form : "uses for form state"
EnhancedCustomerForm --> zodResolver : "uses for validation"
```

**Diagram sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)

#### For API/Service Components:
```mermaid
sequenceDiagram
participant Form as EnhancedCustomerForm
participant Hook as useCustomerOperations
participant RPC as Supabase RPC
participant DB as Database
Form->>Form : User fills form and submits
Form->>Form : Validate with Zod schema
alt Has duplicates and not forced
Form->>Form : Show error, block submission
else Valid or forced
Form->>Hook : mutateAsync with customer data
Hook->>RPC : create_customer RPC call
RPC->>DB : Insert into customers table
DB-->>RPC : Return new customer
RPC-->>Hook : Return result
Hook-->>Form : Resolve promise
Form->>Form : Reset form, call onSuccess
end
```

**Diagram sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [useCustomerOperations.ts](file://src/hooks/business/useCustomerOperations.ts)

#### For Complex Logic Components:
```mermaid
flowchart TD
Start([Form Initialization]) --> StepNav["Initialize step navigation"]
StepNav --> ContextCheck{"Context Check"}
ContextCheck --> |standalone| ShowAllSteps["Show all steps including accounting & linking"]
ContextCheck --> |contract| HideAccounting["Hide accounting & linking steps"]
ContextCheck --> |invoice| HideLinking["Hide linking step"]
ShowAllSteps --> RenderForm
HideAccounting --> RenderForm
HideLinking --> RenderForm
RenderForm --> FieldWatch["Watch national_id field"]
FieldWatch --> AutoFill{"national_id changed?"}
AutoFill --> |Yes| FillLicense["Auto-fill license_number"]
AutoFill --> |No| Continue
FillLicense --> Continue
Continue --> SubmitValidation["On Submit: Validate expired documents"]
SubmitValidation --> ExpiredCheck{"Any expired documents?"}
ExpiredCheck --> |Yes| ShowError["Show error, block submission"]
ExpiredCheck --> |No| DuplicateCheck{"Has duplicates?"}
DuplicateCheck --> |Yes| ForceCheck{"Force create?"}
ForceCheck --> |No| BlockSubmit["Block submission, show error"]
ForceCheck --> |Yes| ProceedSubmit["Proceed with force_create flag"]
DuplicateCheck --> |No| ProceedSubmit
ProceedSubmit --> APIcall["Call createCustomer API"]
APIcall --> Success["Reset form, call onSuccess"]
APIcall --> Error["Show error toast"]
ShowError --> End
BlockSubmit --> End
Success --> End
Error --> End
```

**Diagram sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L1-L74)

**Section sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L1-L74)

### CustomerFormWithDuplicateCheck Analysis
The `CustomerFormWithDuplicateCheck` component provides real-time duplicate detection functionality that wraps around customer forms. It uses debounced input checking to minimize API calls and displays both inline warnings and modal dialogs for duplicate records.

#### For Object-Oriented Components:
```mermaid
classDiagram
class CustomerFormWithDuplicateCheck {
+customerData : CustomerData
+onDuplicateDetected : (has) => void
+onProceedWithDuplicates : () => void
+enableRealTimeCheck : boolean
+excludeCustomerId : string
-showDuplicateDialog : boolean
-showInlineWarning : boolean
-debouncedCustomerData : CustomerData
-duplicateCheck : DuplicateCheckResult
-isLoading : boolean
}
class useCustomerDuplicateCheck {
+customerData : CustomerData
+enabled : boolean
+excludeCustomerId : string
-queryKey : string[]
-queryFn : async () => DuplicateCheckResult
-enabled : boolean condition
-staleTime : 0
}
class DuplicateCustomerDialog {
+open : boolean
+onOpenChange : (open) => void
+duplicates : DuplicateCustomer[]
+onProceedAnyway : () => void
+allowProceed : boolean
}
CustomerFormWithDuplicateCheck --> useCustomerDuplicateCheck : "uses for checking"
CustomerFormWithDuplicateCheck --> DuplicateCustomerDialog : "renders when needed"
CustomerFormWithDuplicateCheck --> Alert : "displays inline warning"
```

**Diagram sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

#### For API/Service Components:
```mermaid
sequenceDiagram
participant Form as CustomerFormWithDuplicateCheck
participant Hook as useCustomerDuplicateCheck
participant Debounce as useDebounce
participant RPC as Supabase RPC
participant DB as Database
Form->>Debounce : Pass customerData
Debounce-->>Form : Return debouncedCustomerData after 500ms
Form->>Hook : Execute query with debounced data
Hook->>RPC : Call check_duplicate_customer with parameters
RPC->>DB : SELECT FROM customers WHERE matches
DB-->>RPC : Return duplicate records
RPC-->>Hook : Return DuplicateCheckResult
Hook-->>Form : Update query result
Form->>Form : Filter duplicates (exclude current customer)
Form->>Form : Update showInlineWarning state
alt Has duplicates
Form->>Form : Show inline alert with View/Proceed buttons
Form->>Form : Render DuplicateCustomerDialog
else No duplicates
Form->>Form : Hide warnings
end
```

**Diagram sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

**Section sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

## Dependency Analysis
The customer form system has well-defined dependencies between components, hooks, and external services. The architecture ensures separation of concerns while maintaining tight integration where needed.

```mermaid
graph TD
A[EnhancedCustomerForm] --> B[CustomerFormWithDuplicateCheck]
B --> C[useCustomerDuplicateCheck]
C --> D[Supabase RPC]
D --> E[Database]
A --> F[react-hook-form]
A --> G[zodResolver]
A --> H[customer.schema]
A --> I[useCustomerOperations]
I --> D
A --> J[AccountingSettings]
A --> K[AccountLinking]
C --> L[useUnifiedCompanyAccess]
L --> M[Auth Context]
style A fill:#f9f,stroke:#333
style C fill:#bbf,stroke:#333
style D fill:#f96,stroke:#333
```

**Diagram sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

**Section sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

## Performance Considerations
The system implements several performance optimizations to handle large customer databases and network latency:

1. **Debounced duplicate checking**: Uses `useDebounce` hook with 500ms delay to prevent excessive API calls during typing
2. **Conditional querying**: Only enables duplicate check when relevant fields have values
3. **Fresh data policy**: Sets `staleTime: 0` to ensure always fresh duplicate checks
4. **Server-side filtering**: Leverages Supabase RPC function `check_duplicate_customer` to minimize data transfer
5. **Client-side filtering**: Filters results to current company and excludes current customer ID
6. **Efficient rendering**: Uses React.memo and proper dependency arrays to prevent unnecessary re-renders

The system is designed to scale to large customer databases by pushing filtering logic to the database layer and minimizing payload size. Network latency is mitigated through debouncing and optimistic UI patterns.

**Section sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

## Troubleshooting Guide
Common issues and their solutions in the customer form system:

1. **Duplicate warnings not appearing**: Verify that `enableRealTimeCheck` is true and required fields (national_id, phone, email, company_name) have values
2. **False duplicate positives**: Check that `excludeCustomerId` is properly passed in edit mode
3. **Performance issues with large databases**: Ensure the database has proper indexes on search fields (national_id, phone, email, company_name)
4. **Validation errors not displaying**: Confirm Zod schema refinements are correctly configured for customer type requirements
5. **Account creation not triggering**: Verify context is set to 'standalone' and autoCreateAccounts flag is enabled
6. **Expired document validation failing**: Check date comparison logic handles timezone differences correctly

Edge cases like merging duplicate records are handled through the `DuplicateCustomerDialog` component, while legacy data import considerations are managed through the `force_create` flag in the creation schema.

**Section sources**
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx#L1-L792)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx#L1-L135)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts#L1-L122)

## Conclusion
The customer form state management system provides a robust, scalable solution for customer creation and editing with integrated duplicate detection and account creation workflows. By combining React Hook Form, Zod validation, and React Query with a well-structured component hierarchy, the system delivers a seamless user experience while maintaining data integrity. The architecture supports real-time validation, accessibility features, and performance optimizations for large datasets, making it suitable for enterprise-level applications.