# C4 Model Architecture Documentation

**Version**: 2.0
**Last Updated**: November 21, 2025
**Model**: FleetifyApp Fleet Management System

---

## C4 Model Overview

The C4 model provides a hierarchical set of diagrams to describe software architecture:

1. **Level 1: System Context** - Big picture view of the system
2. **Level 2: Container Diagram** - High-level technology choices
3. **Level 3: Component Diagram** - Internal structure of containers
4. **Level 4: Code Diagram** - Detailed code structure (if needed)

---

## Level 1: System Context

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    ┌─────────────────────────────────────┐ │
│                                    │         FLEETIFY APP              │ │
│                                    │                                     │ │
│                                    │  Fleet Management System         │ │
│  ┌─────────────────┐                 │  - Contract Management            │ │
│  │   FLEET         │ ◄──────────────► │  - Vehicle Tracking              │ │
│  │   MANAGERS     │                 │  - Financial Operations           │ │
│  │                 │                 │  - Customer Management           │ │
│  │ • Operations   │                 │  - Compliance & Reporting        │ │
│  │ • Vehicles     │                 │                                     │ │
│  │ • Contracts    │                 └─────────────────────────────────────┘ │
│  │ • Billing      │                                 ▲                         │
│  └─────────────────┘                                 │                         │
│                                                        │                         │
│  ┌─────────────────┐                 ┌─────────────┴─────────────┐         │
│  │   CUSTOMERS     │ ◄──────────────► │                             │         │
│  │                 │                 │         USES                 │         │
│  │ • Clients       │                 │                             │         │
│  │ • Drivers       │                 │                             │         │
│  │ • Vehicle Owners│                 │                             │         │
│  │ • Leasing Co.   │                 │                             │         │
│  └─────────────────┘                 └─────────────────────────────────────┘ │
│                                                        ▲                         │
│                                                        │                         │
│  ┌─────────────────┐                 ┌─────────────────────┐               │
│  │  ADMIN USERS    │ ◄──────────────► │                     │               │
│  │                 │                 │         MANAGES       │               │
│  │ • System Admin  │                 │                     │               │
│  │ • Finance Team  │                 │                     │               │
│  │ • Compliance    │                 │                     │               │
│  └─────────────────┘                 └─────────────────────┘               │
│                                                                                │
│  EXTERNAL SYSTEMS                                                        │
│  ┌─────────────────┐                 ┌─────────────────────┐               │
│  │   SUPABASE      │ ◄──────────────► │    EXTERNAL APIS   │               │
│  │                 │                 │                     │               │
│  │ • Database      │                 │ • Payment Gateways   │               │
│  │ • Auth Service  │                 │ • Traffic Authorities │               │
│  │ • Storage       │                 │ • Legal Services     │               │
│  │ • Realtime      │                 │ • Exchange Rate APIs │               │
│  └─────────────────┘                 └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### System Description

**FleetifyApp** is a comprehensive fleet management system that serves various stakeholders in the transportation and logistics industry. The system enables efficient management of vehicle fleets, customer contracts, financial operations, and regulatory compliance.

### Key Stakeholders

- **Fleet Managers**: Daily operations and fleet oversight
- **Customers**: Clients, drivers, vehicle owners, and leasing companies
- **Admin Users**: System administrators, finance teams, and compliance officers
- **External Systems**: Payment gateways, traffic authorities, and legal services

---

## Level 2: Container Diagram

### Container Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    ┌─────────────────────────────────────┐ │
│                                    │         WEB APPLICATION           │ │
│                                    │            (React SPA)           │ │
│  ┌─────────────────┐                 │                                     │ │
│  │   USERS         │ ◄──────────────► │ • Responsive UI                   │ │
│  │  (Web/Mobile)   │                 │ • Progressive Web App             │ │
│  └─────────────────┘                 │ • Single Page Application        │ │
│              ▲                        │ • TypeScript + Tailwind CSS       │ │
│              │                        └─────────────────────────────────────┘ │
│              │                                                        │
│  ┌─────────────────┐                 ┌─────────────────────┐             │
│  │   MOBILE APP    │ ◄──────────────► │   MOBILE WEB APP    │             │
│  │  (Capacitor)    │                 │   (PWA + Capacitor) │             │
│  │                 │                 │                     │             │
│  │ • Android/iOS   │                 │ • Service Workers    │             │
│  │ • Native APIs   │                 │ • IndexedDB Storage  │             │
│  │ • Offline Cap   │                 │ • Touch Optimized    │             │
│  └─────────────────┘                 └─────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    ┌─────────────────────────────────────┐ │
│                                    │      BACKEND API                   │ │
│                                    │     (Supabase Platform)           │ │
│                                    │                                     │ │
│                                    │ • RESTful APIs                    │ │
│                                    │ • Realtime Subscriptions          │ │
│                                    │ • Edge Functions                   │ │
│                                    │ • Authentication Service           │ │
│                                    └─────────────────────────────────────┘ │
│                                      ▲         ▲         ▲               │
│                                      │         │         │               │
│  ┌─────────────────┐                 │         │         │               │
│  │   DATABASE      │ ◄──────────────┘         │         │               │
│  │  (PostgreSQL)   │                           │         │               │
│  │                 │                           │         │               │
│  │ • Structured    │                           │         │               │
│  │   Data          │                           │         │               │
│  │ • Row-Level     │                           │         │               │
│  │   Security      │                           │         │               │
│  │ • ACID          │                           │         │               │
│  │   Transactions  │                           │         │               │
│  └─────────────────┘                           │         │               │
│                                                │         │               │
│  ┌─────────────────┐                           │         │               │
│  │   FILE STORAGE  │ ◄─────────────────────────┘         │               │
│  │  (Supabase S3)  │                                     │               │
│  │                 │                                     │               │
│  │ • Document     │                                     │               │
│  │   Management    │                                     │               │
│  │ • Image         │                                     │               │
│  │   Storage       │                                     │               │
│  │ • CDN           │                                     │               │
│  │   Distribution  │                                     │               │
│  └─────────────────┘                                     │               │
│                                                            │               │
│  ┌─────────────────┐                                      │               │
│  │   AUTH SERVICE  │ ◄─────────────────────────────────────┘               │
│  │  (Supabase Auth)│                                                      │
│  │                 │                                                      │
│  │ • User          │                                                      │
│  │   Authentication│                                                      │
│  │ • Multi-Factor  │                                                      │
│  │ • Session       │                                                      │
│  │   Management    │                                                      │
│  │ • Social        │                                                      │
│  │   Logins        │                                                      │
│  └─────────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Container Descriptions

#### Web Application (React SPA)
- **Technology**: React 18, TypeScript, Vite, Tailwind CSS
- **Purpose**: Primary user interface for desktop and laptop users
- **Responsibilities**:
  - User interface rendering
  - Client-side routing and state management
  - Progressive Web App capabilities
  - Responsive design for various screen sizes

#### Mobile Web App (PWA + Capacitor)
- **Technology**: React, Service Workers, IndexedDB, Capacitor
- **Purpose**: Native mobile experience with offline capabilities
- **Responsibilities**:
  - Touch-optimized user interface
  - Offline data synchronization
  - Native device API integration
  - App store deployment

#### Backend API (Supabase Platform)
- **Technology**: Node.js (Edge Functions), PostgreSQL, RESTful APIs
- **Purpose**: Business logic and data management
- **Responsibilities**:
  - API request handling and validation
  - Business logic implementation
  - Data transformation and processing
  - Real-time data synchronization

#### Database (PostgreSQL)
- **Technology**: PostgreSQL 15 with Supabase extensions
- **Purpose**: Persistent data storage
- **Responsibilities**:
  - Structured data storage
  - Transaction management
  - Data integrity enforcement
  - Row-level security implementation

#### File Storage (Supabase S3)
- **Technology**: AWS S3 compatible storage via Supabase
- **Purpose**: Document and media file storage
- **Responsibilities**:
  - Document management and versioning
  - Image storage and optimization
  - CDN distribution for performance
  - Secure file access control

#### Auth Service (Supabase Auth)
- **Technology**: JWT-based authentication service
- **Purpose**: User authentication and authorization
- **Responsibilities**:
  - User registration and login
  - Multi-factor authentication
  - Session management
  - Social authentication integration

---

## Level 3: Component Diagram

### Frontend Components Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB APPLICATION                              │
│                              (React + TypeScript)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                           PRESENTATION LAYER                           │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │    PAGES    │ │  LAYOUTS     │ │ COMPONENTS  │ │    HOOKS    │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ Dashboard   │ │ Header       │ │ UI Primitives│ │ State Mgmt  │ │ │
│  │  │ Fleet       │ │ Sidebar      │ │ Forms       │ │ API Calls   │ │ │
│  │  │ Finance     │ │ MobileNav   │ │ Charts      │ │ Utils       │ │ │
│  │  │ Contracts   │ │ AuthLayout  │ │ Tables      │ │ Business    │ │ │
│  │  │ Customers   │ │ ErrorBoundary│ │ Modals      │ │ Mobile     │ │ │
│  │  │ Reports     │ │ Loading     │ │ Lists       │ │            │ │ │
│  │  │ Settings    │ │             │ │ Grids       │ │            │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   ▲                                       │
│                                   │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                            SERVICES LAYER                              │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │   DOMAIN    │ │ INFRASTRUCT  │ │ INTEGRATION │ │ PLATFORM    │ │ │
│  │  │  SERVICES   │ │   SERVICES   │ │  SERVICES   │ │  SERVICES   │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ Fleet Mgmt  │ │ API Cache    │ │ Supabase    │ │ I18n        │ │ │
│  │  │ Financial   │ │ Performance  │ │ Payment GW  │ │ Mobile      │ │ │
│  │  │ Contracts   │ │ Monitoring   │ │ Complience  │ │ Audit       │ │ │
│  │  │ Customers   │ │ Error Handler│ │ External    │ │ Theme       │ │ │
│  │  │ Reporting   │ │ Logging     │ │ APIs        │ │ Notification│ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                             DATA LAYER                                 │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │    API      │ │     HTTP     │ │   WEBSOCKET │ │   STORAGE   │ │ │
│  │  │   CLIENT    │ │    CLIENT    │ │   CLIENT    │ │   CLIENT    │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ Supabase    │ │ Fetch API   │ │ Supabase    │ │ IndexedDB   │ │ │
│  │  │ Client      │ │ Axios       │ │ Realtime   │ │ Local       │ │ │
│  │  │ Auth        │ │ Interceptor │ │ Subscriptions│ │ Storage     │ │ │
│  │  │ Queries     │ │ Error Handling│ │ WebSocket  │ │ Cache       │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Components Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                  │
│                           (Supabase Platform)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                          EDGE FUNCTIONS                                  │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │   AUTH      │ │   BUSINESS   │ │ INTEGRATION │ │  UTILITIES  │ │ │
│  │  │ MIDDLEWARE  │ │    LOGIC    │ │ ENDPOINTS   │ │ ENDPOINTS   │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ JWT Validate │ │ Fleet Calc  │ │ Payment Web │ │ File Upload │ │ │
│  │  │ RBAC Check   │ │ Financial   │ │ Hooks       │ │ Email Send  │ │ │
│  │  │ Rate Limit   │ │ Processing  │ │ External    │ │ Report Gen  │ │ │
│  │  │ Audit Log    │ │ Validation  │ │ Sync        │ │ Notif Send  │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         DATABASE LAYER                                  │ │
│  │                        (PostgreSQL + Extensions)                        │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │   SCHEMA     │ │  FUNCTIONS   │ │  TRIGGERS   │ │   VIEWS     │ │ │
│  │  │  DESIGN      │ │ & STORED PROC│ │             │ │             │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ Core Tables │ │ Business    │ │ Audit Trail │ │ Reporting   │ │ │
│  │  │ Indexes     │ │ Logic       │ │ Data Sync   │ │ Analytics   │ │ │
│  │  │ Constraints │ │ Data Transform│ │ Notifications│ │ Aggregation │ │ │
│  │  │ RLS Policies│ │ Validation  │ │ History     │ │ Security    │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         STORAGE LAYER                                   │ │
│  │                        (Supabase Storage)                               │ │
│  │                                                                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │  DOCUMENTS   │ │    IMAGES    │ │   BACKUPS   │ │  CDN/EDGE   │ │ │
│  │  │             │ │             │ │             │ │             │ │ │
│  │  │ Contracts    │ │ Vehicle     │ │ Database    │ │ Global      │ │ │
│  │  │ Legal Docs   │ │ Photos      │ │ Snapshots   │ │ Distribution│ │ │
│  │  │ Reports      │ │ Documents   │ │ Point-in-Time│ │ Caching     │ │ │
│  │  │ Invoices     │ │ Logos       │ │ Incremental │ │ Optimization│ │ │
│  │  │ Receipts     │ │ Signatures  │ │ Backups     │ │ Compression │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Frontend Components

**Presentation Layer**:
- **Pages**: Route-level components representing application screens
- **Layouts**: Reusable page structure components (headers, sidebars, footers)
- **Components**: Reusable UI primitives and business-specific components
- **Hooks**: Custom React hooks for state management and business logic

**Services Layer**:
- **Domain Services**: Business logic specific to different domains
- **Infrastructure Services**: Cross-cutting concerns (caching, logging, monitoring)
- **Integration Services**: External API integrations and third-party services
- **Platform Services**: Platform-specific functionality (mobile, i18n, themes)

#### Backend Components

**Edge Functions**:
- **Auth Middleware**: Authentication and authorization logic
- **Business Logic**: Domain-specific business rules and calculations
- **Integration Endpoints**: External system integrations
- **Utility Endpoints**: Common functionality (file upload, email, notifications)

**Database Layer**:
- **Schema Design**: Table structures, indexes, and constraints
- **Functions & Stored Procedures**: Database-level business logic
- **Triggers**: Automated data validation and audit logging
- **Views**: Pre-computed queries for reporting and analytics

---

## Technology Decisions

### Frontend Technology Stack

```typescript
// Core Technologies
const frontendStack = {
  framework: "React 18.3.1",
  language: "TypeScript 5.x",
  build: "Vite 5.x",
  styling: "Tailwind CSS + Shadcn/ui",
  state: "TanStack Query + React Context",
  routing: "React Router 6.30.1",
  forms: "React Hook Form + Zod",
  testing: "Vitest + Testing Library"
};

// Mobile Platform
const mobileStack = {
  platform: "Capacitor 6.2.1",
  pwa: "Service Workers + IndexedDB",
  native: "Android SDK + iOS SDK",
  deployment: "App Store + Google Play + Enterprise"
};
```

### Backend Technology Stack

```typescript
// Backend Platform
const backendStack = {
  platform: "Supabase",
  database: "PostgreSQL 15",
  auth: "Supabase Auth",
  storage: "Supabase Storage + AWS S3",
  realtime: "Supabase Realtime",
  functions: "Supabase Edge Functions (Node.js)",
  monitoring: "Sentry + Custom monitoring"
};
```

### Integration Patterns

```typescript
// API Integration
const integrationPatterns = {
  authentication: "JWT with refresh tokens",
  authorization: "RBAC + Row-Level Security",
  caching: "Multi-level (browser, edge, server)",
  offline: "Service Workers + IndexedDB + Background Sync",
  realTime: "WebSocket subscriptions",
  fileUpload: "Direct to S3 with signed URLs"
};
```

---

## Data Flow Architecture

### Request Flow

```
Client Request
    ▼
[Web/Mobile App]
    ▼
[HTTP Request] → [API Gateway]
    ▼
[Auth Check] → [Rate Limit] → [Audit Log]
    ▼
[Business Logic] → [Data Validation]
    ▼
[Database Query] → [Response Formatting]
    ▼
[Caching Layer] → [Response] → [Client]
```

### Real-time Data Flow

```
Database Change
    ▼
[Supabase Trigger]
    ▼
[Realtime Engine]
    ▼
[WebSocket Connection]
    ▼
[Client Subscription]
    ▼
[UI Update] → [Cache Invalidation]
```

### Offline Data Flow

```
Client Action
    ▼
[IndexedDB Storage]
    ▼
[Background Sync Queue]
    ▼
[When Online]
    ▼
[Server Synchronization]
    ▼
[Conflict Resolution]
    ▼
[Local Cache Update]
```

---

## Security Architecture

### Authentication Flow

```
User Login
    ▼
[Credentials Validation]
    ▼
[Supabase Auth]
    ▼
[MFA Challenge (if enabled)]
    ▼
[JWT Token Generation]
    ▼
[Secure Token Storage]
    ▼
[Authenticated Session]
```

### Authorization Flow

```
API Request
    ▼
[JWT Token Validation]
    ▼
[User Session Check]
    ▼
[RBAC Permission Check]
    ▼
[Row-Level Security]
    ▼
[Resource Access Granted/Denied]
    ▼
[Audit Log Entry]
```

---

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CACHING ARCHITECTURE                             │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   BROWSER   │  │    EDGE     │  │   SERVER    │  │  DATABASE  │     │
│  │    CACHE    │  │    CACHE    │  |    CACHE    │  |   CACHE    │     │
│  │             │  │             │  │             │  │             │     │
│  │ Service     │  │ CDN         │  │ Redis       │  │ Query Plan  │     │
│  │ Worker      │  │ Vercel Edge │  │ Supabase    │  │ Materialized│     │
│  │ IndexedDB   │  │ Cache       │  │ Functions    │  │ Views       │     │
│  │ Memory      │  │ Static      │  │ Application  │  │ Indexes     │     │
│  │ Storage     │  │ Assets      │  │ Memory      │  │ Connections │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Optimization Techniques

```typescript
// Performance Optimization Strategies
const performanceOptimizations = {
  frontend: {
    codeSplitting: "Route-based and component-based",
    lazyLoading: "Components and routes",
    memoization: "React.memo, useMemo, useCallback",
    bundleOptimization: "Tree shaking and compression"
  },

  backend: {
    queryOptimization: "Indexes and query analysis",
    requestDeduplication: "200ms window deduplication",
    batching: "Bulk operations",
    caching: "Multi-level caching strategy"
  },

  database: {
    indexing: "Strategic index placement",
    queryPlans: "Query optimization and analysis",
    connectionPooling: "Efficient connection management",
    materializedViews: "Pre-computed complex queries"
  }
};
```

---

## Monitoring & Observability

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MONITORING ARCHITECTURE                           │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  FRONTEND   │  │    API      │  │  DATABASE   │  │ INFRASTRUCTURE│     │
│  │ MONITORING  │  │ MONITORING  │  │ MONITORING  │  │ MONITORING  │     │
│  │             │  │             │  │             │  │             │     │
│  │ Core Web    │  │ Response    │  │ Query       │  │ Server      │     │
│  │ Vitals      │  │ Times       │  │ Performance │  │ Metrics     │     │
│  │ User Exp    │  │ Error Rates  │  │ Connections │  │ CPU/Memory  │     │
│  │ Bundle Size │  │ Throughput   │  │ Index Usage │  │ Disk I/O    │     │
│  │ Lighthouse  │  │ Health Chk  │  │ Lock Analysis│  │ Network    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  |                          CENTRALIZED MONITORING                        │ │
│  |                                                                     │ │
│  |  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ | │
│  |  │    SENTRY    │ │  GRAFANA    │ │ PROMETHEUS  │ │ ALERTMANAGER│ | │
│  |  │             │ │             │ │             │ │             │ | │
│  |  │ Error Track │ │ Dashboard   │ │ Metrics     │ │ Alerting    │ | │
│  |  │ Performance │ | Visualization│ | Collection  │ │ Notification│ | │
│  │  │ User Sessions│ │ Analytics   │ | Time Series │ │ Escalation  │ | │
│  │  │ Release     │ │ Alerting    │ │ Aggregation │ │ Routing     │ | │
│  │  │ Tracking    │ │ Reporting   │ │ Querying    │ │ Silencing   │ | │
│  |  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ | │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Performance Indicators

```typescript
// Performance KPIs
const performanceKPIs = {
  // Frontend Metrics
  coreWebVitals: {
    LCP: "< 2.5s (Largest Contentful Paint)",
    FID: "< 100ms (First Input Delay)",
    CLS: "< 0.1 (Cumulative Layout Shift)"
  },

  // API Performance
  apiMetrics: {
    responseTime: "< 500ms (95th percentile)",
    throughput: "> 1000 requests/second",
    errorRate: "< 0.1%",
    availability: "99.9%"
  },

  // Database Performance
  databaseMetrics: {
    queryTime: "< 100ms (95th percentile)",
    cacheHitRate: "> 95%",
    connectionEfficiency: "> 90%",
    deadlockRate: "< 0.01%"
  },

  // Business Metrics
  businessMetrics: {
    userEngagement: "> 80% daily active users",
    taskCompletion: "> 95% successful operations",
    systemUptime: "> 99.9% availability",
    customerSatisfaction: "> 4.5/5 rating"
  }
};
```

---

## Deployment Architecture

### Container Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                           │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   DEVELOPMENT   │  │     STAGING     │  │   PRODUCTION    │         │
│  │   ENVIRONMENT   │  │   ENVIRONMENT   │  |   ENVIRONMENT   │         │
│  │                 │  │                 │  │                 │         │
│  │ Local Dev      │  │ Production-like │  │ Production      │         │
│  │ Hot Reload     │  │  Environment   │  │  Infrastructure │         │
│  │ Debug Mode     │  │ Staging DB      │  │ Live Database  │         │
│  │ Mock Services  │  │ Live APIs      │  │ Live APIs      │         │
│  │ Full Logging   │  │ Integration    │  │ Full Monitoring │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  |                           CI/CD PIPELINE                               | │
│  |                                                                     | │
│  |  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ | │
│  |  │   Git   │ │   Build  │ │   Test   │ │Security │ │Deploy   │ | │
│  |  │   Push  │ │   Stage  │ │   Stage  │ │   Scan   │ │  Stage  │ | │
│  |  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ | │
│  |       │         │         │         │         │         | │
│  |       ▼         ▼         ▼         ▼         ▼         | │
│  |  ┌─────────────────────────────────────────────────────────────┐ | │
│  |  |                AUTOMATED DEPLOYMENT PIPELINE                | | │
│  |  |                                                             | | │
│  |  │ 1. Code Quality Checks (ESLint, Prettier, TypeScript)     | | │
│  |  │ 2. Automated Testing (Unit, Integration, E2E)             | | │
│  |  │ 3. Security Scanning (Dependencies, Code Analysis)         | | │
│  |  │ 4. Build Optimization (Bundle Analysis, Compression)      | | │
│  |  │ 5. Environment Deployment (Staging → Production)          | | │
│  |  │ 6. Health Checks & Rollback (Automated Validation)        | | │
│  |  │ 7. Monitoring & Alerting (Production Readiness)           | | │
│  |  └─────────────────────────────────────────────────────────────┘ | │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Infrastructure Components

```typescript
// Infrastructure Configuration
const infrastructure = {
  hosting: {
    web: "Vercel (Global CDN)",
    database: "Supabase (Managed PostgreSQL)",
    storage: "AWS S3 (via Supabase)",
    monitoring: "Sentry + Grafana"
  },

  deployment: {
    pipeline: "GitHub Actions",
    strategy: "Blue-Green Deployment",
    rollback: "Automated on failure",
    environments: ["Development", "Staging", "Production"]
  },

  scaling: {
    web: "Auto-scaling (Vercel)",
    database: "Read replicas + Connection pooling",
    storage: "CDN + Automatic optimization",
    monitoring: "Real-time alerting"
  }
};
```

---

## Evolution Roadmap

### Future Architecture Enhancements

#### Phase 1: Microservices Migration (Q1 2026)
```
Current Monolith → Microservices Architecture

┌─────────────────┐ → ┌─────────────────┐
│  Fleetify App   │ → │ Service Mesh     │
│                 │   │                 │
│ • Single Unit   │   │ • API Gateway   │
│ • Monolithic    │   │ • Auth Service  │
│ • Shared DB     │   │ • Fleet Service │
│                 │   │ • Finance Svc   │
└─────────────────┘   │ • Contract Svc  │
                      │ • Customer Svc  │
                      └─────────────────┘
```

#### Phase 2: Advanced Analytics (Q2 2026)
```
Current Analytics → ML-Powered Analytics

┌─────────────────┐ → ┌─────────────────┐
│  Basic Reports  │ → │  Predictive      │
│                 │   │  Analytics       │
│ • Manual Reports│   │                 │
│ • Historical    │   │ • ML Models     │
│ • Static Charts │   │ • Predictions   │
│                 │   │ • Anomaly Detect│
└─────────────────┘   │ • Real-time     │
                      └─────────────────┘
```

#### Phase 3: IoT Integration (Q3 2026)
```
Current Manual Tracking → IoT Telematics

┌─────────────────┐ → ┌─────────────────┐
│ Manual Data     │ → │  IoT Telematics  │
│ Entry           │   │                 │
│ • Manual Updates│   │ • Real-time GPS  │
│ • Delayed Info │   │ • Sensor Data   │
│ • Human Error   │   │ • Predictive    │
│                 │   │   Maintenance   │
└─────────────────┘   └─────────────────┘
```

---

## Conclusion

The C4 model documentation provides a comprehensive view of the FleetifyApp architecture across different levels of abstraction. This architecture supports:

- **Scalability**: Designed for growth and expansion
- **Maintainability**: Clear separation of concerns and modular design
- **Performance**: Optimized for speed and efficiency
- **Security**: Defense-in-depth security architecture
- **Flexibility**: Adaptable to changing business requirements
- **Future-Readiness**: Roadmap for microservices and advanced features

The architecture has successfully delivered:

- 40-60% API performance improvement
- Multi-platform deployment (web, PWA, native mobile)
- Comprehensive security and compliance features
- Real-time collaboration capabilities
- International market readiness

This documentation serves as a living reference for the development team, architects, and stakeholders, ensuring continued alignment with business goals and technical excellence.

---

**Document Information**
- **Version**: 2.0
- **Last Updated**: November 21, 2025
- **Next Review**: February 21, 2026
- **Maintainer**: Fleetify Architecture Team
- **Reviewers**: CTO, Head of Engineering, Lead Developers