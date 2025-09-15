# Database Tables

<cite>
**Referenced Files in This Document**   
- [contract.schema.ts](file://src/schemas/contract.schema.ts)
- [customer.schema.ts](file://src/schemas/customer.schema.ts)
- [payment.schema.ts](file://src/schemas/payment.schema.ts)
- [types.ts](file://src/integrations/supabase/types.ts)
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql)
- [20250829220100_fix_customer_accounts.sql](file://supabase/migrations/20250829220100_fix_customer_accounts.sql)
- [20250829220200_complete_customer_account_fix.sql](file://supabase/migrations/20250829220200_complete_customer_account_fix.sql)
- [20250829210000_final_contract_creation_fix.sql](file://supabase/migrations/20250829210000_final_contract_creation_fix.sql)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Entity Relationships](#core-entity-relationships)
3. [Contracts Table](#contracts-table)
4. [Customers Table](#customers-table)
5. [Vehicles Table](#vehicles-table)
6. [Properties Table](#properties-table)
7. [Financial Accounts Table](#financial-accounts-table)
8. [Employees Table](#employees-table)
9. [Payments Table](#payments-table)
10. [Data Validation and Business Rules](#data-validation-and-business-rules)
11. [Indexing and Performance Considerations](#indexing-and-performance-considerations)
12. [Data Lifecycle and Retention Policies](#data-lifecycle-and-retention-policies)
13. [Security and Access Control](#security-and-access-control)

## Introduction
This document provides comprehensive documentation for the core database tables in FleetifyApp, detailing entity relationships, field definitions, data types, constraints, and business rules implemented in the PostgreSQL schema via Supabase migrations. The system is designed to manage contracts, customers, vehicles, properties, financial accounts, employees, and payments with robust data validation, referential integrity, and security controls.

The database schema supports a multi-tenant architecture with company-level isolation and implements Row Level Security (RLS) policies to ensure data privacy. The system includes comprehensive audit logging, approval workflows, and automated accounting entries to support financial operations.

**Section sources**
- [types.ts](file://src/integrations/supabase/types.ts#L1-L100)

## Core Entity Relationships
The FleetifyApp database schema implements a normalized relational model with well-defined relationships between core entities. The primary entities include contracts, customers, vehicles, properties, financial accounts, employees, and payments, all organized within a company-based multi-tenant architecture.

```mermaid
erDiagram
COMPANY {
uuid id PK
string name
string currency
jsonb customer_account_settings
timestamp created_at
timestamp updated_at
}
CUSTOMER {
uuid id PK
uuid company_id FK
string customer_type
string first_name
string last_name
string company_name
string phone
string email
timestamp created_at
timestamp updated_at
}
CONTRACT {
uuid id PK
uuid company_id FK
uuid customer_id FK
uuid vehicle_id FK
string contract_number
string contract_type
date start_date
date end_date
numeric total_amount
string status
timestamp created_at
timestamp updated_at
}
VEHICLE {
uuid id PK
uuid company_id FK
string vehicle_number
string make
string model
string year
string status
timestamp created_at
timestamp updated_at
}
PROPERTY {
uuid id PK
uuid company_id FK
string property_name
string property_type
string address
string status
timestamp created_at
timestamp updated_at
}
EMPLOYEE {
uuid id PK
uuid company_id FK
string first_name
string last_name
string position
string email
string phone
timestamp created_at
timestamp updated_at
}
PAYMENT {
uuid id PK
uuid company_id FK
uuid customer_id FK
uuid contract_id FK
string payment_number
date payment_date
numeric amount
string payment_method
string allocation_status
string processing_status
timestamp created_at
timestamp updated_at
}
CHART_OF_ACCOUNTS {
uuid id PK
uuid company_id FK
string account_code
string account_name
string account_type
string balance_type
boolean is_active
boolean can_link_customers
timestamp created_at
timestamp updated_at
}
CUSTOMER_ACCOUNT {
uuid id PK
uuid customer_id FK
uuid company_id FK
uuid account_id FK
boolean is_default
string currency
boolean is_active
timestamp created_at
timestamp updated_at
}
JOURNAL_ENTRY {
uuid id PK
uuid company_id FK
string entry_number
date entry_date
string description
numeric total_debit
numeric total_credit
string entry_status
string entry_type
uuid source_id
timestamp created_at
timestamp updated_at
}
PAYMENT_ALLOCATION {
uuid id PK
uuid payment_id FK
string allocation_type
uuid target_id
numeric amount
timestamp allocated_date
string allocation_method
timestamp created_at
timestamp updated_at
}
APPROVAL_WORKFLOW {
uuid id PK
uuid company_id FK
string name
string entity_type
jsonb conditions
jsonb steps
boolean enabled
timestamp created_at
timestamp updated_at
}
AUDIT_LOG {
uuid id PK
uuid company_id FK
uuid user_id
string user_name
string action_type
string entity_type
uuid entity_id
string message
timestamp timestamp
}
COMPANY ||--o{ CUSTOMER : "has"
COMPANY ||--o{ CONTRACT : "has"
COMPANY ||--o{ VEHICLE : "has"
COMPANY ||--o{ PROPERTY : "has"
COMPANY ||--o{ EMPLOYEE : "has"
COMPANY ||--o{ PAYMENT : "has"
COMPANY ||--o{ CHART_OF_ACCOUNTS : "has"
COMPANY ||--o{ JOURNAL_ENTRY : "has"
COMPANY ||--o{ APPROVAL_WORKFLOW : "has"
COMPANY ||--o{ AUDIT_LOG : "has"
CUSTOMER ||--o{ CONTRACT : "signs"
CUSTOMER ||--o{ PAYMENT : "makes"
CUSTOMER ||--o{ CUSTOMER_ACCOUNT : "has"
CONTRACT ||--o{ PAYMENT : "receives"
CONTRACT ||--o{ JOURNAL_ENTRY : "generates"
CONTRACT ||--o{ PAYMENT_ALLOCATION : "is_target_of"
PAYMENT ||--o{ PAYMENT_ALLOCATION : "has"
PAYMENT ||--o{ JOURNAL_ENTRY : "generates"
CHART_OF_ACCOUNTS ||--o{ CUSTOMER_ACCOUNT : "links_to"
CHART_OF_ACCOUNTS ||--o{ JOURNAL_ENTRY_LINES : "used_in"
JOURNAL_ENTRY ||--o{ JOURNAL_ENTRY_LINES : "contains"
JOURNAL_ENTRY ||--o{ APPROVAL_REQUESTS : "requires"
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L1-L1000)
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L1-L100)

## Contracts Table
The contracts table serves as the central entity for managing agreements between the company and customers, supporting various contract types including rental, lease, service, and maintenance agreements. Each contract is uniquely identified by a contract number and maintains comprehensive metadata about the agreement terms, financial details, and status.

The table enforces critical business rules through constraints and triggers, ensuring data integrity and consistency. Contracts are linked to customers, vehicles (for vehicle-related contracts), and financial records, creating a comprehensive audit trail of business transactions.

```mermaid
erDiagram
CONTRACT {
uuid id PK
uuid company_id FK
uuid customer_id FK
uuid vehicle_id FK
string contract_number UK
string contract_type
date start_date
date end_date
string status
numeric total_amount
string currency
string payment_terms
text notes
text terms_and_conditions
timestamp created_at
timestamp updated_at
}
CONTRACT_VEHICLE {
uuid id PK
uuid contract_id FK
uuid vehicle_id FK
numeric daily_rate
numeric monthly_rate
numeric deposit_amount
date start_date
date end_date
string status
numeric mileage_limit
numeric excess_mileage_rate
text notes
timestamp created_at
timestamp updated_at
}
CONTRACT_PAYMENT_SCHEDULE {
uuid id PK
uuid contract_id FK
date due_date
numeric amount
text description
boolean is_deposit
boolean is_paid
date paid_date
uuid payment_id FK
numeric late_fee
string status
timestamp created_at
timestamp updated_at
}
CONTRACT_TERMS {
uuid id PK
uuid contract_id FK
boolean insurance_required
numeric insurance_amount
numeric security_deposit
numeric late_fee_percentage
integer grace_period_days
numeric mileage_limit_per_day
numeric excess_mileage_fee
string fuel_policy
numeric additional_driver_fee
text cancellation_policy
text damage_policy
string maintenance_responsibility
timestamp created_at
timestamp updated_at
}
JOURNAL_ENTRY {
uuid id PK
uuid company_id FK
string entry_number UK
date entry_date
text description
string entry_status
string entry_type
uuid source_id FK
numeric total_debit
numeric total_credit
timestamp created_at
timestamp updated_at
}
APPROVAL_REQUEST {
uuid id PK
uuid company_id FK
uuid workflow_id FK
uuid entity_id FK
string entity_type
integer current_step
string status
uuid requested_by FK
timestamp requested_at
timestamp created_at
timestamp updated_at
}
CONTRACT ||--o{ CONTRACT_VEHICLE : "contains"
CONTRACT ||--o{ CONTRACT_PAYMENT_SCHEDULE : "has"
CONTRACT ||--o{ CONTRACT_TERMS : "has"
CONTRACT ||--o{ JOURNAL_ENTRY : "generates"
CONTRACT ||--o{ APPROVAL_REQUEST : "requires_approval"
CONTRACT ||--|| CUSTOMER : "signed_by"
CONTRACT ||--|| VEHICLE : "covers"
```

**Diagram sources**
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L1-L50)
- [types.ts](file://src/integrations/supabase/types.ts#L1000-L2000)

**Section sources**
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L1-L103)
- [20250829210000_final_contract_creation_fix.sql](file://supabase/migrations/20250829210000_final_contract_creation_fix.sql#L1-L100)

## Customers Table
The customers table manages customer information with support for both individual and corporate customers. The schema includes comprehensive contact details, identification information, and financial data such as credit limits. The table is designed to support multi-tenant operations with company-level isolation.

Customer records are linked to financial accounts through the customer_accounts table, enabling proper accounting integration. The system supports automatic creation of customer accounts based on company settings, ensuring consistent financial tracking across all customer transactions.

```mermaid
erDiagram
CUSTOMER {
uuid id PK
uuid company_id FK
string customer_type
string first_name
string last_name
string company_name
string phone UK
string email UK
string national_id
string passport_number
string license_number
date date_of_birth
date national_id_expiry
date license_expiry
numeric credit_limit
text notes
boolean is_active
timestamp created_at
timestamp updated_at
}
CUSTOMER_ACCOUNT {
uuid id PK
uuid customer_id FK
uuid company_id FK
uuid account_id FK
boolean is_default
string currency
boolean is_active
timestamp created_at
timestamp updated_at
}
PAYMENT {
uuid id PK
uuid company_id FK
uuid customer_id FK
string payment_number UK
date payment_date
numeric amount
string payment_method
string reference_number
string currency
text notes
string allocation_status
string processing_status
timestamp created_at
timestamp updated_at
}
INVOICE {
uuid id PK
uuid company_id FK
uuid customer_id FK
string invoice_number UK
date invoice_date
date due_date
numeric total_amount
string currency
string status
timestamp created_at
timestamp updated_at
}
ACCOUNTING_PERIOD {
uuid id PK
uuid company_id FK
string period_name
date start_date
date end_date
string status
timestamp created_at
timestamp updated_at
}
CUSTOMER ||--o{ CUSTOMER_ACCOUNT : "has"
CUSTOMER ||--o{ PAYMENT : "makes"
CUSTOMER ||--o{ INVOICE : "receives"
CUSTOMER ||--o{ ACCOUNTING_PERIOD : "active_in"
```

**Diagram sources**
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L1-L50)
- [types.ts](file://src/integrations/supabase/types.ts#L2000-L3000)

**Section sources**
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L1-L75)
- [20250829220200_complete_customer_account_fix.sql](file://supabase/migrations/20250829220200_complete_customer_account_fix.sql#L1-L100)

## Vehicles Table
The vehicles table manages vehicle inventory with comprehensive details about each vehicle's specifications, status, and maintenance history. Each vehicle record includes identification information, technical specifications, and operational status.

The table supports integration with contracts, enabling the system to track which vehicles are currently under agreement and their associated terms. Vehicle records are also linked to maintenance schedules and service history, providing a complete view of each vehicle's lifecycle.

```mermaid
erDiagram
VEHICLE {
uuid id PK
uuid company_id FK
string vehicle_number UK
string vin UK
string make
string model
string year
string color
string fuel_type
string transmission
string status
numeric odometer
date last_service_date
date next_service_date
numeric service_interval
text notes
timestamp created_at
timestamp updated_at
}
VEHICLE_CONDITION {
uuid id PK
uuid vehicle_id FK
date inspection_date
string inspector_id
numeric exterior_condition
numeric interior_condition
numeric mechanical_condition
text damage_description
text recommendations
jsonb photos
timestamp created_at
timestamp updated_at
}
MAINTENANCE_RECORD {
uuid id PK
uuid vehicle_id FK
date service_date
string service_type
string service_provider
numeric cost
text description
text parts_replaced
numeric odometer_reading
text technician_notes
timestamp created_at
timestamp updated_at
}
CONTRACT_VEHICLE {
uuid id PK
uuid contract_id FK
uuid vehicle_id FK
numeric daily_rate
numeric monthly_rate
numeric deposit_amount
date start_date
date end_date
string status
timestamp created_at
timestamp updated_at
}
VEHICLE_INSURANCE {
uuid id PK
uuid vehicle_id FK
string policy_number UK
string insurance_company
date start_date
date end_date
numeric premium
text coverage_details
text notes
timestamp created_at
timestamp updated_at
}
VEHICLE ||--o{ VEHICLE_CONDITION : "has"
VEHICLE ||--o{ MAINTENANCE_RECORD : "has"
VEHICLE ||--o{ CONTRACT_VEHICLE : "used_in"
VEHICLE ||--o{ VEHICLE_INSURANCE : "has"
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L3000-L4000)

## Properties Table
The properties table manages real estate assets with detailed information about each property's characteristics, location, and status. The schema supports various property types including residential, commercial, and industrial properties.

Property records are linked to contracts for lease agreements, enabling the system to track occupancy, rental terms, and payment schedules. The table also supports integration with maintenance requests and service history, providing comprehensive property management capabilities.

```mermaid
erDiagram
PROPERTY {
uuid id PK
uuid company_id FK
string property_name
string property_type
string address
string city
string state
string zip_code
string country
numeric area
integer bedrooms
integer bathrooms
string construction_type
string status
text description
jsonb features
jsonb photos
timestamp created_at
timestamp updated_at
}
PROPERTY_CONTRACT {
uuid id PK
uuid property_id FK
uuid contract_id FK
date occupancy_date
date vacate_date
text tenant_notes
timestamp created_at
timestamp updated_at
}
MAINTENANCE_REQUEST {
uuid id PK
uuid property_id FK
string request_type
text description
string status
date requested_date
date completed_date
numeric cost
text technician_notes
timestamp created_at
timestamp updated_at
}
PROPERTY_INSPECTION {
uuid id PK
uuid property_id FK
date inspection_date
string inspector_id
numeric structural_rating
numeric electrical_rating
numeric plumbing_rating
numeric hvac_rating
text findings
text recommendations
jsonb photos
timestamp created_at
timestamp updated_at
}
PROPERTY_DOCUMENT {
uuid id PK
uuid property_id FK
string document_type
string file_name
string file_path
string file_size
string mime_type
timestamp uploaded_at
timestamp created_at
timestamp updated_at
}
PROPERTY ||--o{ PROPERTY_CONTRACT : "has"
PROPERTY ||--o{ MAINTENANCE_REQUEST : "has"
PROPERTY ||--o{ PROPERTY_INSPECTION : "has"
PROPERTY ||--o{ PROPERTY_DOCUMENT : "has"
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L4000-L5000)

## Financial Accounts Table
The financial accounts table (chart_of_accounts) implements a comprehensive chart of accounts for financial management. The schema supports hierarchical account structures with multiple levels and various account types including assets, liabilities, equity, revenue, and expenses.

Accounts can be linked to customers, vendors, and other entities, enabling detailed financial tracking and reporting. The table includes attributes for account classification, balance type, and linking capabilities, supporting complex accounting requirements.

```mermaid
erDiagram
CHART_OF_ACCOUNTS {
uuid id PK
uuid company_id FK
string account_code UK
string account_name
string account_name_ar
string account_type
string account_subtype
string balance_type
integer account_level
boolean is_active
boolean is_header
boolean is_system
boolean can_link_customers
boolean can_link_vendors
uuid parent_account_id FK
text description
timestamp created_at
timestamp updated_at
}
CUSTOMER_ACCOUNT {
uuid id PK
uuid customer_id FK
uuid company_id FK
uuid account_id FK
boolean is_default
string currency
boolean is_active
timestamp created_at
timestamp updated_at
}
VENDOR_ACCOUNT {
uuid id PK
uuid vendor_id FK
uuid company_id FK
uuid account_id FK
boolean is_default
string currency
boolean is_active
timestamp created_at
timestamp updated_at
}
JOURNAL_ENTRY_LINES {
uuid id PK
uuid journal_entry_id FK
uuid account_id FK
numeric debit_amount
numeric credit_amount
text description
integer line_number
timestamp created_at
timestamp updated_at
}
ACCOUNTING_TEMPLATE {
uuid id PK
uuid company_id FK
string name
string description
string template_type
jsonb conditions
jsonb entries
boolean enabled
integer priority
timestamp created_at
timestamp updated_at
}
CHART_OF_ACCOUNTS ||--o{ CUSTOMER_ACCOUNT : "linked_to"
CHART_OF_ACCOUNTS ||--o{ VENDOR_ACCOUNT : "linked_to"
CHART_OF_ACCOUNTS ||--o{ JOURNAL_ENTRY_LINES : "used_in"
CHART_OF_ACCOUNTS ||--o{ ACCOUNTING_TEMPLATE : "referenced_in"
CHART_OF_ACCOUNTS }o--|| CHART_OF_ACCOUNTS : "parent_child"
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L5000-L6000)

## Employees Table
The employees table manages employee information with comprehensive details about each employee's role, contact information, and employment status. The schema supports organizational hierarchy through manager relationships and department assignments.

Employee records are linked to various system functions including approvals, time tracking, and access control. The table includes fields for authentication, role-based access, and audit trails of employee activities.

```mermaid
erDiagram
EMPLOYEE {
uuid id PK
uuid company_id FK
string first_name
string last_name
string email UK
string phone
string position
string department
uuid manager_id FK
date hire_date
date termination_date
string employment_status
string employee_type
string pay_grade
numeric salary
string currency
string tax_id
string national_id
string passport_number
string bank_account
string bank_name
string iban
boolean is_active
timestamp created_at
timestamp updated_at
}
USER_ROLES {
uuid id PK
uuid employee_id FK
string role_name
boolean is_primary
timestamp assigned_at
timestamp created_at
timestamp updated_at
}
DEPARTMENT {
uuid id PK
uuid company_id FK
string department_name
string department_code
uuid manager_id FK
text description
boolean is_active
timestamp created_at
timestamp updated_at
}
ATTENDANCE_RECORD {
uuid id PK
uuid employee_id FK
date work_date
time clock_in
time clock_out
numeric hours_worked
string status
text notes
timestamp created_at
timestamp updated_at
}
PAYROLL_RECORD {
uuid id PK
uuid employee_id FK
date payroll_period
numeric gross_pay
numeric deductions
numeric net_pay
string currency
string status
timestamp processed_at
timestamp created_at
timestamp updated_at
}
EMPLOYEE ||--o{ USER_ROLES : "has"
EMPLOYEE ||--o{ ATTENDANCE_RECORD : "has"
EMPLOYEE ||--o{ PAYROLL_RECORD : "has"
EMPLOYEE ||--|| EMPLOYEE : "reports_to"
EMPLOYEE ||--|| DEPARTMENT : "belongs_to"
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L6000-L7000)

## Payments Table
The payments table manages all financial transactions including customer receipts, vendor payments, and invoice settlements. The schema supports multiple payment methods and complex allocation rules for distributing payments across multiple contracts, invoices, or obligations.

The table includes comprehensive tracking of payment status, processing information, and audit trails. Payments are linked to journal entries for automated accounting integration and to approval workflows for financial controls.

```mermaid
erDiagram
PAYMENT {
uuid id PK
uuid company_id FK
uuid customer_id FK
uuid vendor_id FK
uuid contract_id FK
uuid invoice_id FK
uuid purchase_order_id FK
string payment_number UK
date payment_date
numeric amount
string payment_method
string reference_number
string check_number
string bank_account
string currency
text notes
string allocation_status
string processing_status
string processing_notes
numeric linking_confidence
timestamp created_at
timestamp updated_at
}
PAYMENT_ALLOCATION {
uuid id PK
uuid payment_id FK
string allocation_type
uuid target_id FK
numeric amount
timestamp allocated_date
string allocation_method
text notes
timestamp created_at
timestamp updated_at
}
JOURNAL_ENTRY {
uuid id PK
uuid company_id FK
string entry_number UK
date entry_date
text description
string entry_status
string entry_type
uuid source_id FK
numeric total_debit
numeric total_credit
timestamp created_at
timestamp updated_at
}
APPROVAL_REQUEST {
uuid id PK
uuid company_id FK
uuid workflow_id FK
uuid entity_id FK
string entity_type
integer current_step
string status
uuid requested_by FK
timestamp requested_at
timestamp created_at
timestamp updated_at
}
PAYMENT ||--o{ PAYMENT_ALLOCATION : "has"
PAYMENT ||--o{ JOURNAL_ENTRY : "generates"
PAYMENT ||--o{ APPROVAL_REQUEST : "requires_approval"
PAYMENT ||--|| CUSTOMER : "from"
PAYMENT ||--|| VENDOR : "to"
PAYMENT ||--|| CONTRACT : "applies_to"
PAYMENT ||--|| INVOICE : "settles"
```

**Diagram sources**
- [payment.schema.ts](file://src/schemas/payment.schema.ts#L1-L50)
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L100-L200)

**Section sources**
- [payment.schema.ts](file://src/schemas/payment.schema.ts#L1-L88)
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L1-L470)

## Data Validation and Business Rules
The FleetifyApp database implements comprehensive data validation and business rules through constraints, triggers, and application-level validation. These rules ensure data integrity, enforce business logic, and prevent invalid states across all core entities.

The system uses a combination of database constraints (CHECK, UNIQUE, NOT NULL), triggers for automated processes, and application-level validation schemas to provide robust data quality controls. Business rules are implemented in both the database layer and application layer to ensure consistency across all access methods.

```mermaid
flowchart TD
A[Data Entry] --> B{Validation Layer}
B --> C[Application Level Validation]
C --> D[Zod Schema Validation]
D --> E[Business Logic Validation]
E --> F[Database Level Validation]
F --> G[NOT NULL Constraints]
F --> H[CHECK Constraints]
F --> I[UNIQUE Constraints]
F --> J[Foreign Key Constraints]
F --> K[Triggers and Functions]
G --> L[Data Integrity]
H --> L
I --> L
J --> L
K --> L
L --> M[Valid Data]
N[Contract Creation] --> O{Validation Rules}
O --> P[Start Date < End Date]
O --> Q[Total Amount > 0]
O --> R[Customer Exists]
O --> S[Vehicle Available]
O --> T[No Overlapping Contracts]
P --> U[Valid Contract]
Q --> U
R --> U
S --> U
T --> U
V[Payment Processing] --> W{Validation Rules}
W --> X[Amount > 0]
W --> Y[Valid Payment Method]
W --> Z[Linked to Valid Entity]
AA[Allocation Rules Applied]
AB[Journal Entry Created]
X --> AC[Valid Payment]
Y --> AC
Z --> AC
AA --> AC
AB --> AC
```

**Diagram sources**
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L50-L100)
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L50-L75)
- [payment.schema.ts](file://src/schemas/payment.schema.ts#L50-L88)

**Section sources**
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L1-L103)
- [customer.schema.ts](file://src/schemas/customer.schema.ts#L1-L75)
- [payment.schema.ts](file://src/schemas/payment.schema.ts#L1-L88)

## Indexing and Performance Considerations
The FleetifyApp database implements strategic indexing to optimize query performance for high-traffic tables and common access patterns. The indexing strategy balances read performance with write overhead, focusing on the most critical query paths.

Primary keys, foreign keys, and frequently queried columns are indexed to support efficient joins and filtering. Composite indexes are used for multi-column queries, and partial indexes are employed for filtered data access patterns. The system also uses functional indexes for case-insensitive searches and date-based queries.

```mermaid
erDiagram
INDEX_STRATEGY {
string table_name
string index_name
string column_list
string index_type
string usage_pattern
string performance_impact
}
TABLE_INDEX {
string table_name PK
string index_name PK
string columns
string type
boolean is_unique
boolean is_primary
text description
}
QUERY_PATTERN {
string pattern_id PK
string description
string example_query
string affected_tables
string recommended_indexes
numeric frequency
numeric impact_score
}
PERFORMANCE_METRIC {
string metric_id PK
string table_name
string index_name
numeric read_performance
numeric write_overhead
numeric storage_cost
timestamp measured_at
}
TABLE_INDEX ||--o{ INDEX_STRATEGY : "implements"
QUERY_PATTERN ||--o{ TABLE_INDEX : "benefits_from"
PERFORMANCE_METRIC ||--o{ TABLE_INDEX : "measures"
```

**Diagram sources**
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L400-L470)
- [types.ts](file://src/integrations/supabase/types.ts#L7000-L8000)

## Data Lifecycle and Retention Policies
The FleetifyApp system implements comprehensive data lifecycle management with defined retention policies for each major entity. The policies balance legal requirements, business needs, and storage efficiency while ensuring data integrity and auditability.

Active records are maintained with full functionality, while historical records are preserved for reporting and compliance purposes. The system supports data archival and deletion workflows with proper approvals and audit trails to ensure compliance with data protection regulations.

```mermaid
stateDiagram-v2
[*] --> Active
Active --> Historical : End of lifecycle
Historical --> Archived : Retention period expired
Archived --> Deleted : Archive retention expired
Deleted --> [*] : Permanent removal
state Active {
[*] --> CurrentOperations
CurrentOperations --> Updates : Edit
Updates --> CurrentOperations : Save
CurrentOperations --> DeleteRequest : Mark for deletion
}
state Historical {
[*] --> ReadOnly
ReadOnly --> ArchiveRequest : Retention expired
}
state Archived {
[*] --> Stored
Stored --> DeleteRequest : Archive expired
}
state Deleted {
[*] --> Logged
Logged --> Purged : Final removal
}
```

**Diagram sources**
- [types.ts](file://src/integrations/supabase/types.ts#L8000-L9000)

## Security and Access Control
The FleetifyApp database implements robust security and access control through Row Level Security (RLS) policies, role-based access control, and comprehensive audit logging. The system ensures data isolation between companies in the multi-tenant architecture while providing granular control over data access within each organization.

All sensitive operations are logged in the audit_logs table, providing a complete trail of data modifications, access attempts, and system events. The system supports various user roles with different permission levels, from super administrators to read-only users.

```mermaid
graph TD
A[User Authentication] --> B{User Role}
B --> C[Super Admin]
B --> D[Company Admin]
B --> E[Manager]
B --> F[Accountant]
B --> G[Employee]
B --> H[Read Only]
C --> I[Full Access]
D --> J[Company Data Access]
E --> K[Department Access]
F --> L[Financial Data Access]
G --> M[Own Data Access]
H --> N[Read Only Access]
I --> O[Database Operations]
J --> O
K --> O
L --> O
M --> O
N --> O
O --> P[Audit Logging]
P --> Q[Audit Logs Table]
Q --> R[Compliance Reporting]
Q --> S[Security Monitoring]
Q --> T[Incident Investigation]
```

**Diagram sources**
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L300-L400)
- [types.ts](file://src/integrations/supabase/types.ts#L9000-L10000)

**Section sources**
- [20250117000000_professional_payment_system.sql](file://supabase/migrations/20250117000000_professional_payment_system.sql#L1-L470)
- [types.ts](file://src/integrations/supabase/types.ts#L1-L13339)