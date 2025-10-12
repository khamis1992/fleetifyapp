# Financial Operations Hooks

<cite>
**Referenced Files in This Document**   
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts)
- [useCurrencyFormatter.ts](file://src/hooks/useCurrencyFormatter.ts)
- [client.ts](file://src/integrations/supabase/client.ts)
- [useFinancialAnalysis.ts](file://src/hooks/useFinancialAnalysis.ts)
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts) - *Added in recent commit*
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts) - *Added in recent commit*
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts) - *Added in recent commit*
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts) - *Added in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Added documentation for new financial analysis and AI capabilities
- Integrated invoice scanning and matching functionality
- Added bulk invoice generation system documentation
- Updated dependency analysis to include new hooks
- Enhanced performance considerations with new system analysis features
- Added new sections for AI-powered financial insights and automated invoice processing

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
This document provides comprehensive documentation for the financial operations custom hooks in FleetifyApp, focusing on accounting, payments, and financial reporting functionality. The system is designed to handle complex financial operations with robust validation, real-time updates, and integration with Supabase for data persistence. The hooks implement sophisticated financial logic while maintaining user-friendly interfaces and ensuring data integrity through comprehensive error handling and audit trails. Recent updates have expanded the system with AI-powered financial analysis, automated invoice matching, and bulk invoice generation capabilities.

## Project Structure
The financial operations hooks are organized within the src/hooks directory, with specialized hooks for chart of accounts management, payment processing, payment schedules, and financial reporting. These hooks integrate with Supabase for database operations and leverage React Query for state management and data fetching. The structure follows a modular approach, with each hook responsible for a specific financial domain while maintaining loose coupling through standardized interfaces. Recent additions include hooks for invoice matching, bulk invoice generation, and AI-powered financial analysis.

```mermaid
graph TD
A[Financial Hooks] --> B[useChartOfAccounts]
A --> C[usePayments]
A --> D[usePaymentSchedules]
A --> E[useEnhancedFinancialReports]
A --> F[useCurrencyFormatter]
A --> G[useInvoiceMatching]
A --> H[useBulkInvoiceGeneration]
A --> I[useFinancialSystemAnalysis]
A --> J[useFinancialAIAnalysis]
B --> K[Supabase Integration]
C --> K
D --> K
E --> K
G --> K
H --> K
I --> K
J --> K
F --> L[Number Formatting Utilities]
K --> M[Database]
```

**Diagram sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts)
- [useCurrencyFormatter.ts](file://src/hooks/useCurrencyFormatter.ts)
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts)
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts)
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts)
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts)

**Section sources**
- [src/hooks](file://src/hooks)

## Core Components
The financial operations system in FleetifyApp consists of six primary custom hooks that handle distinct aspects of financial management: useChartOfAccounts for managing the accounting hierarchy, usePayments for processing transactions, usePaymentSchedules for managing recurring payments, useEnhancedFinancialReports for generating comprehensive financial statements, useInvoiceMatching for automated invoice data matching, and useBulkInvoiceGeneration for batch invoice creation. Additionally, useFinancialSystemAnalysis provides comprehensive system health assessment, while useFinancialAIAnalysis delivers AI-powered financial insights. These hooks are built on React Query for efficient data fetching and caching, with comprehensive error handling and loading state management.

**Section sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts#L0-L43)
- [usePayments.ts](file://src/hooks/usePayments.ts#L0-L43)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts#L0-L43)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts#L0-L43)
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts#L0-L43)
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts#L0-L43)
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts#L0-L43)
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts#L0-L43)

## Architecture Overview
The financial operations architecture follows a clean separation of concerns, with custom hooks encapsulating business logic and data access patterns. Each hook provides a consistent interface with query functions for data retrieval and mutation functions for data modification. The architecture leverages Supabase as the backend service for data persistence, with real-time capabilities enabled for immediate financial updates. The hooks are designed to be composable, allowing multiple financial operations to be coordinated within components. New components for invoice processing and AI analysis integrate seamlessly with the existing architecture.

```mermaid
graph TD
A[UI Components] --> B[Custom Hooks]
B --> C[React Query]
C --> D[Supabase Client]
D --> E[Supabase Database]
D --> F[Real-time Subscriptions]
D --> G[Edge Functions]
B --> H[Validation & Formatting]
H --> I[Currency Formatter]
H --> J[Number Preferences]
E --> K[Audit Trail]
F --> A
G --> J[AI Analysis]
```

**Diagram sources**
- [client.ts](file://src/integrations/supabase/client.ts#L0-L16)
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts)

## Detailed Component Analysis

### Chart of Accounts Management
The useChartOfAccounts hook provides comprehensive functionality for managing hierarchical account structures in the financial system. It implements validation to prevent circular references and conflict detection to ensure data integrity. The hook retrieves account data from Supabase with proper filtering and sorting, maintaining the hierarchical relationships between parent and child accounts.

```mermaid
classDiagram
class ChartOfAccount {
+id : string
+company_id : string
+account_code : string
+account_name : string
+account_name_ar : string
+account_type : string
+account_subtype : string
+balance_type : string
+parent_account_id : string
+account_level : number
+is_header : boolean
+is_active : boolean
+is_system : boolean
+current_balance : number
+description : string
+sort_order : number
+created_at : string
+updated_at : string
}
class useChartOfAccounts {
+useQuery() : QueryResult
+useCreateAccount() : MutationResult
+useUpdateAccount() : MutationResult
+useDeleteAccount() : MutationResult
}
useChartOfAccounts --> ChartOfAccount : "manages"
useChartOfAccounts --> SupabaseClient : "uses"
```

**Diagram sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts#L43-L104)

**Section sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts#L0-L104)

### Payment Processing
The usePayments hook handles the complete lifecycle of payment transactions, from creation and validation to reconciliation and error handling. It implements robust error handling with user-friendly messages and provides loading states for all operations. The hook integrates with Supabase to persist payment data and supports filtering capabilities for retrieving specific payment records.

```mermaid
sequenceDiagram
participant Component as UI Component
participant Hook as usePayments
participant Supabase as Supabase Client
participant Database as Database
Component->>Hook : createPayment(paymentData)
Hook->>Hook : validate payment data
Hook->>Supabase : insert payment record
Supabase->>Database : execute insert
Database-->>Supabase : return result
Supabase-->>Hook : payment data or error
Hook->>Hook : handle success or error
Hook-->>Component : mutation result
```

**Diagram sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L122-L160)

**Section sources**
- [usePayments.ts](file://src/hooks/usePayments.ts#L0-L160)

### Payment Schedules Management
The usePaymentSchedules hook manages recurring payment plans with sophisticated date calculations and automatic invoice generation. It supports various installment plans (monthly, quarterly, semi-annual, annual) and handles the creation of multiple payment schedules with associated invoices. The hook implements comprehensive validation for installment counts and payment dates.

```mermaid
flowchart TD
Start([Create Payment Schedule]) --> ValidateInput["Validate Input Data"]
ValidateInput --> InputValid{"Valid Input?"}
InputValid --> |No| ReturnError["Return Validation Error"]
InputValid --> |Yes| CalculateDates["Calculate Payment Dates"]
CalculateDates --> CreateSchedules["Create Payment Schedules"]
CreateSchedules --> GenerateInvoices["Generate Invoices"]
GenerateInvoices --> PersistData["Persist to Database"]
PersistData --> InvalidateCache["Invalidate Query Cache"]
InvalidateCache --> ShowSuccess["Show Success Toast"]
ShowSuccess --> End([Schedule Created])
ReturnError --> End
```

**Diagram sources**
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts#L83-L126)

**Section sources**
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts#L0-L195)

### Financial Reporting
The useEnhancedFinancialReports hook enables the generation of complex financial statements with filtering and export capabilities. It supports multiple report types including income statements, balance sheets, and trial balances. The hook provides a standardized interface for retrieving financial data with proper internationalization support for Arabic and English labels.

```mermaid
classDiagram
class FinancialReportData {
+title : string
+titleAr : string
+sections : Array
+totalDebits : number
+totalCredits : number
+netIncome : number
+totalAssets : number
+totalLiabilities : number
+totalEquity : number
}
class useEnhancedFinancialReports {
+useQuery() : QueryResult
+useEnhancedCustomerFinancialSummary() : QueryResult
+useDetailedCustomerEnhancedData() : QueryResult
}
useEnhancedFinancialReports --> FinancialReportData : "returns"
useEnhancedFinancialReports --> SupabaseClient : "uses"
```

**Diagram sources**
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts#L0-L43)

**Section sources**
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts#L0-L365)

### Invoice Matching System
The useInvoiceMatching hook implements automated matching of OCR-extracted invoice data to existing contracts and customers. It uses a multi-stage matching algorithm that first attempts to match by contract number, then by customer name, and finally by amount and date range. The hook returns confidence scores and alternative matches to assist users in verifying the correct associations.

```mermaid
flowchart TD
A[Extracted Invoice Data] --> B{Contract Number?}
B --> |Yes| C[Search Contracts by Number]
B --> |No| D{Customer Name?}
C --> E[Exact Match Found?]
E --> |Yes| F[Return High Confidence Match]
E --> |No| G[Return Similar Contracts]
D --> |Yes| H[Search Customers by Name]
D --> |No| I{Amount & Date?}
H --> J[Find Active Contracts]
J --> K[Return Customer with Contracts]
I --> |Yes| L[Search Contracts by Amount]
L --> M[Return Amount-Based Matches]
I --> |No| N[No Matches Found]
```

**Diagram sources**
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts#L4-L162)

**Section sources**
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts#L0-L163)

### Bulk Invoice Generation
The useBulkInvoiceGeneration hook enables the creation of invoices in bulk from payments that lack associated invoices. It provides statistics on pending invoice creation and handles the batch processing of invoice generation with proper error handling and transaction management. The hook automatically links generated invoices to their corresponding contracts and payments.

```mermaid
sequenceDiagram
participant UI as User Interface
participant Hook as useBulkInvoiceGeneration
participant Supabase as Supabase Client
participant Database as Database
UI->>Hook : generateBulkInvoices()
Hook->>Supabase : get_payments_without_invoices_stats()
Supabase->>Database : Execute stats function
Database-->>Supabase : Return statistics
Supabase-->>Hook : Stats data
Hook->>Supabase : backfill_all_contract_invoices()
Supabase->>Database : Process batch invoices
Database-->>Supabase : Return results
Supabase-->>Hook : Processing results
Hook->>UI : Show success/failure toast
```

**Diagram sources**
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts#L29-L115)

**Section sources**
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts#L0-L115)

### Financial System Analysis
The useFinancialSystemAnalysis hook provides comprehensive assessment of the financial system's health by analyzing multiple metrics including chart of accounts completeness, entity linkage, cost center utilization, and operational activity. It calculates an overall score and identifies specific issues and improvement suggestions based on the analysis.

```mermaid
classDiagram
class FinancialSystemAnalysis {
+overallScore : number
+chartOfAccountsScore : number
+linkageScore : number
+costCentersScore : number
+operationsScore : number
+aiScore : number
+issues : Array
+suggestions : Array
+metrics : FinancialMetrics
}
class useFinancialSystemAnalysis {
+useQuery() : QueryResult
}
useFinancialSystemAnalysis --> FinancialSystemAnalysis : "returns"
useFinancialSystemAnalysis --> SupabaseClient : "uses"
```

**Diagram sources**
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts#L49-L154)

**Section sources**
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts#L0-L321)

### AI-Powered Financial Insights
The useFinancialAIAnalysis hook delivers advanced financial insights through AI-powered analysis. It takes the results from the financial system analysis and processes them through an Edge Function to generate comprehensive recommendations, risk assessments, and improvement strategies. The hook includes fallback logic to provide basic analysis when AI services are unavailable.

```mermaid
sequenceDiagram
participant UI as User Interface
participant Hook as useFinancialAIAnalysis
participant Supabase as Supabase Client
participant EdgeFunction as financial-analysis-ai
participant Database as Database
UI->>Hook : Request AI Analysis
Hook->>Supabase : Invoke Edge Function
Supabase->>EdgeFunction : Send analysis data
EdgeFunction->>EdgeFunction : Process with AI
EdgeFunction->>Supabase : Return AI results
Supabase-->>Hook : AI analysis or error
Hook->>Hook : Handle success or fallback
Hook-->>UI : Return AI insights
```

**Diagram sources**
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts#L34-L145)

**Section sources**
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts#L0-L145)

## Dependency Analysis
The financial operations hooks have a well-defined dependency structure, with each hook depending on core services like Supabase for data persistence and React Query for state management. The hooks are designed to be independent but can be composed together in components that require multiple financial capabilities. The dependency graph shows a clean separation of concerns with minimal circular dependencies. New hooks for invoice processing and AI analysis integrate with the same core services while adding specialized functionality.

```mermaid
graph TD
A[useChartOfAccounts] --> B[Supabase]
A --> C[React Query]
A --> D[useUnifiedCompanyAccess]
B --> E[Database]
C --> F[Query Cache]
D --> G[Company Context]
H[usePayments] --> B
H --> C
H --> D
I[usePaymentSchedules] --> B
I --> C
I --> D
J[useEnhancedFinancialReports] --> B
J --> C
J --> D
K[useCurrencyFormatter] --> L[useCompanyCurrency]
K --> M[currencyConfig]
K --> N[numberFormatter]
A --> K
H --> K
I --> K
J --> K
O[useInvoiceMatching] --> B
O --> C
P[useBulkInvoiceGeneration] --> B
P --> C
P --> D
Q[useFinancialSystemAnalysis] --> B
Q --> C
R[useFinancialAIAnalysis] --> B
R --> C
R --> S[Edge Functions]
```

**Diagram sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts)
- [useCurrencyFormatter.ts](file://src/hooks/useCurrencyFormatter.ts)
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts)
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts)
- [useFinancialSystemAnalysis.ts](file://src/hooks/useFinancialSystemAnalysis.ts)
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts)

**Section sources**
- [src/hooks](file://src/hooks)

## Performance Considerations
The financial operations hooks are optimized for performance with several key considerations. React Query's caching mechanism prevents unnecessary database queries by storing results and automatically handling cache invalidation when data changes. The hooks implement proper loading states and error boundaries to maintain UI responsiveness. For large financial datasets, the hooks support filtering and pagination to minimize data transfer. The system also handles offline operations by queuing mutations and synchronizing when connectivity is restored. The new bulk invoice generation and AI analysis features include batch processing and fallback mechanisms to ensure reliability under varying conditions.

**Section sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts)
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts)
- [useFinancialAIAnalysis.ts](file://src/hooks/useFinancialAIAnalysis.ts)

## Troubleshooting Guide
Common issues in the financial operations system typically relate to data validation, connectivity problems, or permission errors. The hooks implement comprehensive logging to aid in troubleshooting, with detailed console messages for each operation. For financial calculations, the system addresses floating-point precision issues by using appropriate decimal arithmetic in the database layer. Error messages are designed to be user-friendly while providing sufficient detail for developers to diagnose issues. The new invoice matching and bulk generation features include specific error handling for common scenarios such as ambiguous matches and processing failures.

**Section sources**
- [useChartOfAccounts.ts](file://src/hooks/useChartOfAccounts.ts)
- [usePayments.ts](file://src/hooks/usePayments.ts)
- [usePaymentSchedules.ts](file://src/hooks/usePaymentSchedules.ts)
- [useEnhancedFinancialReports.ts](file://src/hooks/useEnhancedFinancialReports.ts)
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts)
- [useBulkInvoiceGeneration.ts](file://src/hooks/useBulkInvoiceGeneration.ts)

## Conclusion
The financial operations custom hooks in FleetifyApp provide a robust and comprehensive solution for accounting, payments, and financial reporting. The system's modular architecture, with well-defined hooks for specific financial domains, enables maintainable and scalable financial functionality. Integration with Supabase ensures data persistence and real-time updates, while the use of React Query optimizes performance through efficient data fetching and caching. The hooks implement comprehensive validation, error handling, and user feedback mechanisms to ensure data integrity and a positive user experience. Recent additions of AI-powered analysis, automated invoice matching, and bulk processing capabilities significantly enhance the system's functionality and intelligence.