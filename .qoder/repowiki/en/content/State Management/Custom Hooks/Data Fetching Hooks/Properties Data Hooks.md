# Properties Data Hooks

<cite>
**Referenced Files in This Document**   
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts)
- [types/index.ts](file://src/modules/properties/types/index.ts)
- [PropertiesMap.tsx](file://src/pages/PropertiesMap.tsx)
- [PropertyFilters.tsx](file://src/modules/properties/components/PropertyFilters.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Core Implementation](#core-implementation)
3. [Query Structure and Filtering](#query-structure-and-filtering)
4. [Integration with React Query](#integration-with-react-query)
5. [Map Integration and Location-Based Filtering](#map-integration-and-location-based-filtering)
6. [Data Synchronization and Conflict Resolution](#data-synchronization-and-conflict-resolution)
7. [Leasing and Maintenance Data Handling](#leasing-and-maintenance-data-handling)
8. [Performance Optimization](#performance-optimization)
9. [Data Transformation Patterns](#data-transformation-patterns)

## Introduction
The `useProperties` hook provides a comprehensive solution for fetching and managing real estate portfolio data within the Fleetify application. This documentation details the implementation of property data retrieval with advanced filtering capabilities, map integration, and efficient data handling patterns. The system supports complex queries for property type, status, and financial performance, while leveraging React Query for optimal data caching across various property views and dashboards.

## Core Implementation
The `useProperties` hook serves as the primary interface for retrieving property data from the Supabase backend. It implements a robust query system that supports multiple filtering parameters and returns structured property data with related owner information.

```mermaid
flowchart TD
A["useProperties Hook"] --> B["React Query Configuration"]
B --> C["Query Key: ['properties', filters]"]
B --> D["Query Function"]
D --> E["Supabase Client"]
E --> F["Properties Table"]
F --> G["Property Owners Relationship"]
D --> H["Filter Application"]
H --> I["Search Filtering"]
H --> J["Property Type Filtering"]
H --> K["Status Filtering"]
H --> L["Price Range Filtering"]
D --> M["Error Handling"]
M --> N["Console Logging"]
M --> O["Error Throwing"]
A --> P["Return: UseQueryResult<Property[]>"]
```

**Diagram sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L1-L39)

**Section sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L1-L156)

## Query Structure and Filtering
The hook supports a comprehensive filtering system through the `PropertySearchFilters` interface, enabling precise data retrieval based on multiple criteria including property type, status, location, and financial parameters.

```mermaid
classDiagram
class PropertySearchFilters {
+search : string
+property_type : PropertyType | PropertyType[]
+property_status : PropertyStatus | PropertyStatus[]
+area : string
+min_rent : number
+max_rent : number
+min_area : number
+max_area : number
+rooms_count : number
+owner_id : string
+furnished : boolean
+has_parking : boolean
}
class PropertyType {
+residential
+commercial
+industrial
+land
+warehouse
+office
+retail
+villa
+apartment
+building
}
class PropertyStatus {
+available
+rented
+for_sale
+maintenance
+reserved
+sold
}
PropertySearchFilters --> PropertyType : "references"
PropertySearchFilters --> PropertyStatus : "references"
```

**Diagram sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L356)

The filtering system implements the following query patterns:
- **Text search**: Uses `ilike` operator with wildcards across property name, Arabic name, and property code
- **Type filtering**: Supports both single values and arrays via `eq` and `in` operators
- **Status filtering**: Implements array support for multiple status values
- **Price ranges**: Applies `gte` and `lte` conditions for minimum and maximum rent
- **Area ranges**: Uses `gte` and `lte` for minimum and maximum area in square meters
- **Boolean filters**: Handles furnished status and parking availability

**Section sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L10-L85)

## Integration with React Query
The implementation leverages React Query for efficient data caching, automatic refetching, and state management across the application's property views and dashboards.

```mermaid
sequenceDiagram
participant Component as "Properties Component"
participant Hook as "useProperties Hook"
participant ReactQuery as "React Query"
participant Supabase as "Supabase Backend"
Component->>Hook : Call useProperties(filters)
Hook->>ReactQuery : Query with key ['properties', filters]
ReactQuery->>ReactQuery : Check cache for matching key
alt Cache hit
ReactQuery-->>Hook : Return cached data
Hook-->>Component : Return UseQueryResult
else Cache miss
ReactQuery->>Hook : Execute queryFn
Hook->>Supabase : Build and execute query
Supabase-->>Hook : Return property data
Hook-->>ReactQuery : Cache result with query key
ReactQuery-->>Component : Return UseQueryResult
end
Note over ReactQuery,Supabase : Automatic cache invalidation on data changes
```

**Diagram sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L3-L156)

The React Query integration provides several key benefits:
- **Automatic caching**: Data is cached based on the query key, which includes the filter parameters
- **Deduplication**: Multiple components requesting the same data with identical filters share the same query
- **Background refetching**: Stale data is automatically refreshed in the background
- **Error handling**: Built-in error states and retry mechanisms
- **Loading states**: Automatic management of loading and success states

**Section sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L3-L156)

## Map Integration and Location-Based Filtering
The system integrates with Leaflet for interactive map visualization of properties, enabling location-based filtering and spatial data representation.

```mermaid
flowchart TD
A["PropertiesMap Component"] --> B["useProperties Hook"]
B --> C["Property Data with Coordinates"]
C --> D["Map Data Transformation"]
D --> E["Filtered Properties"]
E --> F["Leaflet Map Rendering"]
F --> G["Custom Markers"]
G --> H["Status-Based Colors"]
H --> I["Selected Property Highlighting"]
F --> J["Popup Information"]
J --> K["Property Details"]
J --> L["Rental Information"]
A --> M["Filter Controls"]
M --> N["Type Filter"]
M --> O["Status Filter"]
M --> P["Text Search"]
N --> B
O --> B
P --> B
```

**Diagram sources**
- [PropertiesMap.tsx](file://src/pages/PropertiesMap.tsx#L0-L480)

The map integration features:
- **Dynamic marker rendering**: Properties are displayed as custom markers with status-based colors
- **Interactive filtering**: Users can filter properties by type, status, and text search
- **Property selection**: Clicking on markers or list items highlights the selected property
- **Popup information**: Detailed property information is displayed in interactive popups
- **Legend display**: Visual legend explains marker colors and property statuses

**Section sources**
- [PropertiesMap.tsx](file://src/pages/PropertiesMap.tsx#L25-L63)

## Data Synchronization and Conflict Resolution
The system implements robust data synchronization patterns to ensure consistency between the frontend and backend, with appropriate conflict resolution strategies.

```mermaid
flowchart LR
A["Frontend Changes"] --> B["Optimistic Updates"]
B --> C["Immediate UI Feedback"]
C --> D["Background Sync"]
D --> E["Supabase Database"]
E --> F["Conflict Detection"]
F --> G{"Conflict?"}
G --> |Yes| H["Conflict Resolution Strategy"]
G --> |No| I["Success"]
H --> J["Last Write Wins"]
H --> K["Merge Strategies"]
H --> L["User Resolution"]
I --> M["Cache Invalidation"]
M --> N["React Query Refetch"]
```

While the current implementation focuses on data retrieval, the architecture supports future synchronization features through:
- **Query key invalidation**: Strategic cache invalidation patterns for data consistency
- **Error boundaries**: Comprehensive error handling for failed requests
- **Retry mechanisms**: Automatic retry of failed queries
- **Data validation**: Type safety through TypeScript interfaces

**Section sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L100-L120)

## Leasing and Maintenance Data Handling
The property data system supports leasing operations and maintenance tracking through integrated data structures and related entities.

```mermaid
erDiagram
PROPERTY ||--o{ CONTRACT : "has"
PROPERTY ||--o{ MAINTENANCE : "has"
PROPERTY ||--o{ PAYMENT : "has"
PROPERTY ||--|| OWNER : "owned by"
PROPERTY {
string id PK
string property_code
string property_name
string property_type
string property_status
number rental_price
number area_sqm
boolean furnished
json location_coordinates
boolean is_active
}
CONTRACT {
string id PK
string property_id FK
string tenant_id
string contract_number
string contract_type
date start_date
date end_date
number rental_amount
string status
boolean is_active
}
MAINTENANCE {
string id PK
string property_id FK
string maintenance_number
string maintenance_type
string status
string priority
date requested_date
date scheduled_date
date completion_date
number estimated_cost
number actual_cost
boolean is_active
}
PAYMENT {
string id PK
string property_id FK
string contract_id FK
string tenant_id
string payment_type
number amount
date due_date
date payment_date
string status
}
OWNER {
string id PK
string owner_code
string full_name
string phone
string email
boolean is_active
}
```

**Diagram sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L356)

The system supports leasing operations through:
- **Contract integration**: Properties are linked to lease contracts with tenants
- **Payment tracking**: Rental payments are associated with specific properties
- **Maintenance workflows**: Properties can have multiple maintenance records
- **Owner management**: Properties are assigned to specific owners

**Section sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L356)

## Performance Optimization
The implementation includes several performance optimization techniques to handle large property portfolios efficiently.

```mermaid
flowchart TD
A["Large Property Portfolio"] --> B["Query Optimization"]
B --> C["Selective Field Selection"]
C --> D["Only required fields"]
B --> E["Index Utilization"]
E --> F["Database indexes on key fields"]
A --> G["Caching Strategy"]
G --> H["React Query Caching"]
H --> I["Query key includes filters"]
G --> J["Stale-while-revalidate"]
A --> K["Data Transformation"]
K --> L["Client-side filtering"]
K --> M["Memoized computations"]
A --> N["Lazy Loading"]
N --> O["Pagination support"]
N --> P["Infinite scrolling"]
```

**Diagram sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L1-L156)

Key performance optimizations include:
- **Efficient queries**: Selective field retrieval and proper indexing
- **Caching**: React Query's intelligent caching with filter-based keys
- **Client-side filtering**: Initial server filtering followed by client-side refinement
- **Memoization**: Cached computations for derived data
- **Connection pooling**: Supabase connection management

**Section sources**
- [useProperties.ts](file://src/modules/properties/hooks/useProperties.ts#L10-L85)

## Data Transformation Patterns
The system implements consistent data transformation patterns from backend APIs to UI components, ensuring type safety and predictable data structures.

```mermaid
flowchart LR
A["Supabase API"] --> B["Raw Property Data"]
B --> C["TypeScript Interface"]
C --> D["Property Interface"]
D --> E["Data Transformation"]
E --> F["Formatted for UI"]
F --> G["PropertiesMap Component"]
F --> H["PropertyTable Component"]
F --> I["PropertyCard Component"]
subgraph "Data Transformation"
E1["Null handling"]
E2["Currency formatting"]
E3["Date formatting"]
E4["Status mapping"]
E5["Type translation"]
end
E --> E1
E --> E2
E --> E3
E --> E4
E --> E5
```

**Diagram sources**
- [PropertiesMap.tsx](file://src/pages/PropertiesMap.tsx#L25-L63)

The data transformation pipeline includes:
- **Type safety**: Comprehensive TypeScript interfaces for all property data
- **Null handling**: Graceful handling of optional fields
- **Currency formatting**: Integration with currency formatter hook
- **Status mapping**: Translation of status codes to display labels
- **Search optimization**: Text search across multiple property fields
- **Relationship loading**: Eager loading of related owner data

**Section sources**
- [PropertiesMap.tsx](file://src/pages/PropertiesMap.tsx#L25-L63)