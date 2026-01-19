# Form State Hooks

<cite>
**Referenced Files in This Document**   
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [useVehicleFormValidation.ts](file://src/hooks/useVehicleFormValidation.ts)
- [useEnhancedForm.ts](file://src/hooks/useEnhancedForm.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)
- [contract.schema.ts](file://src/schemas/contract.schema.ts)
- [useCompatibleForm.ts](file://src/hooks/useCompatibleForm.ts)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
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
This document provides a comprehensive analysis of form state management custom hooks in FleetifyApp, focusing on advanced form validation, state handling, and submission workflows. The system implements specialized hooks for managing complex business forms including contracts, customers, and vehicles, with features like conditional validation, duplicate checking, and real-time feedback. The documentation covers the implementation patterns, integration strategies, and optimization techniques used throughout the application.

## Project Structure
The form state management system is organized within the `src/hooks` directory, with specialized hooks for different business domains. The architecture follows a modular pattern where each form type has its dedicated validation hook, while sharing common utilities and patterns across the codebase.

```mermaid
graph TB
subgraph "Form State Management"
H1[useContractFormValidation]
H2[useCustomerFormValidation]
H3[useVehicleFormValidation]
H4[useEnhancedForm]
H5[useCompatibleForm]
end
subgraph "Validation Schemas"
S1[customer.schema.ts]
S2[contract.schema.ts]
S3[payment.schema.ts]
end
subgraph "UI Components"
C1[CustomerFormWithDuplicateCheck]
C2[EnhancedCustomerForm]
C3[ContractWizard]
C4[VehicleForm]
end
H1 --> S2
H2 --> S1
H3 --> S3
H4 --> H5
C1 --> H2
C2 --> H2
C3 --> H1
C4 --> H3
```

**Diagram sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [useVehicleFormValidation.ts](file://src/hooks/useVehicleFormValidation.ts)

## Core Components
The form state management system in FleetifyApp consists of several specialized custom hooks that handle complex form validation, state management, and submission workflows. These hooks provide a consistent API pattern across different form types while accommodating domain-specific requirements. The core components include `useContractFormValidation` for multi-step contract forms, `useCustomerFormValidation` for customer creation with duplicate checking, `useVehicleFormValidation` for vehicle data entry, and `useEnhancedForm` for advanced form features.

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [useVehicleFormValidation.ts](file://src/hooks/useVehicleFormValidation.ts)
- [useEnhancedForm.ts](file://src/hooks/useEnhancedForm.ts)

## Architecture Overview
The form state management architecture in FleetifyApp follows a composable hook pattern where each form type has its dedicated validation hook that encapsulates domain-specific business rules. These hooks integrate with React Hook Form for basic form state management while adding layers of custom validation logic, real-time feedback, and submission handling. The system employs a consistent interface across all form hooks, making it easier for developers to work with different form types while maintaining type safety through TypeScript interfaces.

```mermaid
graph TD
A[Form Component] --> B[Custom Form Hook]
B --> C[React Hook Form]
B --> D[Validation Schema]
B --> E[API Services]
B --> F[State Management]
C --> G[Form State]
D --> H[Business Rules]
E --> I[Duplicate Check]
E --> J[Availability Check]
F --> K[Draft Saving]
F --> L[Change Tracking]
G --> M[UI Rendering]
H --> N[Real-time Validation]
I --> O[Warning Messages]
J --> P[Error Prevention]
K --> Q[Auto-save]
L --> R[Undo/Redo]
```

**Diagram sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useEnhancedForm.ts](file://src/hooks/useEnhancedForm.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)

## Detailed Component Analysis

### useContractFormValidation Analysis
The `useContractFormValidation` hook manages form state for multi-step contract forms with conditional validation rules. It implements a comprehensive validation system that checks required fields, date relationships, and amount constraints. The hook supports conditional validation based on contract type, providing warnings when vehicle selection is recommended but not required. It maintains a set of touched fields to provide contextual feedback and implements debounced validation to optimize performance.

```mermaid
classDiagram
class useContractFormValidation {
+data : Partial<ContractFormData>
+validateOnChange : boolean
+validateOnBlur : boolean
+validationResult : FormValidationResult
+requiredFields : string[]
+validateForm() : FormValidationResult
+validateSingleField(field, value) : ValidationResult
+markFieldTouched(field) : void
+getFieldStatus(field) : FieldStatus
+clearFieldValidation(field) : void
}
class ContractFormData {
+contract_number : string
+customer_id : string
+vehicle_id : string | null
+contract_type : string
+contract_date : string
+start_date : string
+end_date : string
+contract_amount : number
+monthly_amount : number
+description : string | null
+terms : string | null
+status : string
+created_by : string
+cost_center_id : string | null
}
class FormValidationError {
+field : keyof ContractFormData
+message : string
+severity : 'error' | 'warning'
}
class FormValidationResult {
+isValid : boolean
+errors : FormValidationError[]
+warnings : FormValidationError[]
+touchedFields : Set<string>
}
useContractFormValidation --> ContractFormData : "validates"
useContractFormValidation --> FormValidationResult : "returns"
FormValidationResult --> FormValidationError : "contains"
```

**Diagram sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)

### useCustomerFormValidation Analysis
The `useCustomerFormValidation` hook handles customer creation forms with duplicate checking and account integration. It integrates with the `useCustomerDuplicateCheck` hook to detect potential duplicate customers in real-time based on national ID, passport number, phone, and email. The validation system includes checks for expired identification documents and corporate/individual customer requirements. The hook manages the complex state transitions between duplicate detection, warning display, and forced creation workflows.

```mermaid
sequenceDiagram
participant Form as CustomerForm
participant Hook as useCustomerFormValidation
participant DuplicateCheck as useCustomerDuplicateCheck
participant API as Backend API
participant UI as User Interface
Form->>Hook : Submit customer data
Hook->>DuplicateCheck : Check for duplicates
DuplicateCheck->>API : Query duplicate customers
API-->>DuplicateCheck : Return potential duplicates
DuplicateCheck-->>Hook : Notify duplicate status
alt Duplicates Found
Hook->>UI : Show duplicate warning
UI->>User : Display DuplicateCustomerDialog
User->>UI : Choose action (proceed/modify)
UI->>Hook : Confirm proceed with duplicates
Hook->>Hook : Set forceCreate flag
else No Duplicates
Hook->>Hook : Continue validation
end
Hook->>Hook : Validate document expiry
alt Expired Documents
Hook->>UI : Show expiry error
UI->>User : Prevent submission
else Valid Documents
Hook->>API : Submit customer data
API-->>Hook : Return creation result
Hook-->>Form : Notify success/failure
end
```

**Diagram sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

**Section sources**
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

### useVehicleFormValidation Analysis
The `useVehicleFormValidation` hook manages vehicle data entry forms with condition-based requirements. It implements validation rules for vehicle attributes such as year, seating capacity, and identification numbers. The hook ensures data integrity by validating numeric ranges and required fields while providing real-time feedback on form completeness. It integrates with company context to ensure vehicles are associated with valid company IDs and checks user permissions before allowing vehicle creation or modification.

```mermaid
flowchart TD
Start([Form Submission]) --> ValidateRequired["Validate Required Fields"]
ValidateRequired --> PlateValid{"Plate Number Valid?"}
PlateValid --> |No| ReturnError["Throw 'Plate number required'"]
PlateValid --> |Yes| MakeValid{"Make Provided?"}
MakeValid --> |No| ReturnError["Throw 'Manufacturer required'"]
MakeValid --> |Yes| ModelValid{"Model Provided?"}
ModelValid --> |No| ReturnError["Throw 'Model required'"]
ModelValid --> |Yes| YearValid{"Valid Year?"}
YearValid --> |No| ReturnError["Throw 'Year must be between 1990 and current+1'"]
YearValid --> |Yes| CapacityValid{"Valid Seating Capacity?"}
CapacityValid --> |No| ReturnError["Throw 'Capacity must be 1-50'"]
CapacityValid --> |Yes| CompanyValid{"Valid Company ID?"}
CompanyValid --> |No| ReturnError["Throw 'Company ID missing'"]
CompanyValid --> |Yes| PermissionValid{"User Has Permission?"}
PermissionValid --> |No| ReturnError["Throw 'Login required'"]
PermissionValid --> |Yes| ProcessData["Prepare Vehicle Data"]
ProcessData --> ConvertTypes["Convert Strings to Numbers"]
ConvertTypes --> SetDefaults["Set Default Values"]
SetDefaults --> Submit["Submit to API"]
Submit --> Success["Show Success Toast"]
ReturnError --> ShowError["Show Error Toast"]
Success --> End([Form Reset])
ShowError --> End
```

**Diagram sources**
- [VehicleForm.tsx](file://src/components/fleet/VehicleForm.tsx)

**Section sources**
- [VehicleForm.tsx](file://src/components/fleet/VehicleForm.tsx)

### useEnhancedForm Analysis
The `useEnhancedForm` hook provides advanced form features like draft saving and change tracking. It extends the basic form functionality with capabilities for auto-saving form state, tracking changes for audit purposes, and supporting undo/redo operations. The hook integrates with local storage or backend services to persist form drafts, allowing users to resume their work later. It also implements performance optimizations to minimize re-renders and improve responsiveness during data entry.

```mermaid
classDiagram
class useEnhancedForm {
+formState : FormState
+draftId : string
+autoSaveInterval : number
+changeHistory : Change[]
+currentHistoryIndex : number
+enableDraftSaving : boolean
+enableChangeTracking : boolean
+saveDraft() : Promise<void>
+loadDraft(draftId) : Promise<FormState>
+clearDraft(draftId) : Promise<void>
+undo() : void
+redo() : void
+trackChange(change : Change) : void
+getChangeSummary() : ChangeSummary
+isFormDirty() : boolean
}
class FormState {
+values : Record<string, any>
+touched : Set<string>
+validation : ValidationResult
+timestamp : Date
+userId : string
+sessionId : string
}
class Change {
+field : string
+oldValue : any
+newValue : any
+timestamp : Date
+userId : string
+action : 'update' | 'create' | 'delete'
}
class ChangeSummary {
+totalChanges : number
+changedFields : string[]
+firstChanged : Date
+lastChanged : Date
+userChanges : Map<string, number>
}
useEnhancedForm --> FormState : "manages"
useEnhancedForm --> Change : "tracks"
useEnhancedForm --> ChangeSummary : "generates"
```

**Diagram sources**
- [useEnhancedForm.ts](file://src/hooks/useEnhancedForm.ts)

**Section sources**
- [useEnhancedForm.ts](file://src/hooks/useEnhancedForm.ts)

## Dependency Analysis
The form state management system has well-defined dependencies between components, following a clean architecture pattern. The custom form hooks depend on validation schemas for business rules, React Hook Form for basic form state management, and API services for data validation. The UI components depend on the form hooks for state and validation, creating a unidirectional data flow. The system minimizes circular dependencies by using interface segregation and dependency inversion principles.

```mermaid
graph TD
A[Form Components] --> B[Custom Form Hooks]
B --> C[React Hook Form]
B --> D[Validation Schemas]
B --> E[API Services]
C --> F[Form State]
D --> G[Business Rules]
E --> H[Data Validation]
F --> I[UI Rendering]
G --> J[Validation Logic]
H --> K[External Checks]
I --> A
J --> B
K --> B
```

**Diagram sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCustomerDuplicateCheck.ts](file://src/hooks/useCustomerDuplicateCheck.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)

## Performance Considerations
The form state management system implements several optimization techniques to ensure responsive user experiences. These include debounced validation to prevent excessive API calls, memoized form configurations to reduce re-renders, and selective state updates to minimize performance overhead. The system uses React's useCallback and useMemo hooks extensively to prevent unnecessary re-creations of functions and values. For large forms, the validation is performed incrementally rather than all at once, providing faster feedback to users.

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [useCompatibleForm.ts](file://src/hooks/useCompatibleForm.ts)
- [useDebounce.ts](file://src/hooks/useDebounce.ts)

## Troubleshooting Guide
Common issues with the form state management system typically involve validation timing, duplicate detection delays, or state synchronization problems. For validation performance issues, ensure that debounced validation is properly configured and that expensive operations are not performed on every keystroke. When duplicate customers are not detected, verify that the `useCustomerDuplicateCheck` hook is receiving updated form data and that the debounce interval is appropriate. For state synchronization issues between form components and hooks, check that the form state is being properly propagated and that there are no conflicting state updates.

**Section sources**
- [useContractFormValidation.ts](file://src/hooks/useContractFormValidation.ts)
- [CustomerFormWithDuplicateCheck.tsx](file://src/components/customers/CustomerFormWithDuplicateCheck.tsx)
- [EnhancedCustomerForm.tsx](file://src/components/customers/EnhancedCustomerForm.tsx)

## Conclusion
The form state management system in FleetifyApp provides a robust foundation for handling complex business forms with advanced validation, duplicate checking, and state management capabilities. By implementing specialized custom hooks for different form types, the system maintains a consistent API while accommodating domain-specific requirements. The architecture promotes reusability, testability, and maintainability through clear separation of concerns and well-defined interfaces. Future enhancements could include more sophisticated change tracking, improved offline support for draft saving, and enhanced accessibility features for users with disabilities.