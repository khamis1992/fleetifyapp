# Property Form Hooks

<cite>
**Referenced Files in This Document**   
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx)
- [PropertyContractForm.tsx](file://src/components/property/PropertyContractForm.tsx)
- [common.schema.ts](file://src/schemas/common.schema.ts)
- [contract.schema.ts](file://src/schemas/contract.schema.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Property Form State Management](#property-form-state-management)
3. [Property Validation Rules](#property-validation-rules)
4. [Property Contract Form Integration](#property-contract-form-integration)
5. [Contract Validation and Business Logic](#contract-validation-and-business-logic)
6. [Address and Location Validation](#address-and-location-validation)
7. [Property Classification and Zoning](#property-classification-and-zoning)
8. [Rental Pricing and Financial Validation](#rental-pricing-and-financial-validation)
9. [Complex Property Hierarchies](#complex-property-hierarchies)
10. [Property Documentation and Compliance](#property-documentation-and-compliance)
11. [International Property Management](#international-property-management)

## Introduction
This document provides comprehensive documentation for property form state management hooks in the real estate management system. It details the implementation of validation logic for property creation and property contract workflows, covering specialized validation rules for real estate data. The documentation includes integration with PropertyContractForm and PropertyForm components, addressing validation for property characteristics, zoning regulations, lease terms, tenant information, and compliance requirements.

## Property Form State Management
The property form state management is implemented through React Hook Form with Zod validation resolver, providing a robust foundation for managing form state and validation in property creation workflows.

```mermaid
flowchart TD
Start([Form Initialization]) --> DefineSchema["Define Zod Schema"]
DefineSchema --> ConfigureForm["Configure react-hook-form with zodResolver"]
ConfigureForm --> SetDefaults["Set Default Values"]
SetDefaults --> HandleChanges["Handle Field Changes"]
HandleChanges --> ValidateInput["Validate Input Against Schema"]
ValidateInput --> ProcessData["Process Validated Data"]
ProcessData --> SubmitForm["Submit Form Data"]
SubmitForm --> End([Form Submission Complete])
```

**Diagram sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

**Section sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L1-L582)

## Property Validation Rules
The property form implements comprehensive validation rules for real estate data, ensuring data integrity and business rule compliance. The validation schema covers property characteristics, financial information, and location data.

```mermaid
classDiagram
class PropertyFormData {
+string property_name
+string property_code
+string address
+string area
+string property_type
+string status
+string condition_status
+string owner_id
+number area_size
+number bedrooms
+number bathrooms
+number parking_spaces
+boolean is_furnished
+boolean has_elevator
+boolean has_garden
+boolean has_swimming_pool
+number sale_price
+number rental_price
+string description
+string notes
+number latitude
+number longitude
}
class PropertyValidationRules {
+property_name : required
+property_code : required
+address : required
+area_size : min 1
+bedrooms : min 0
+bathrooms : min 0
+parking_spaces : min 0
+sale_price : min 0
+rental_price : min 0
}
PropertyFormData --> PropertyValidationRules : "follows"
```

**Diagram sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

**Section sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

## Property Contract Form Integration
The PropertyContractForm component integrates with the property management system to handle contract creation for rental and sale agreements. It manages tenant information, contract terms, and financial details with comprehensive validation.

```mermaid
sequenceDiagram
participant User as "User"
participant Form as "PropertyContractForm"
participant Validation as "Validation System"
participant Submit as "Submission Handler"
User->>Form : Fill contract details
Form->>Validation : Validate field input
Validation-->>Form : Return validation result
Form->>Form : Update UI with validation feedback
User->>Form : Submit form
Form->>Validation : Validate entire form
Validation-->>Form : Return form validation result
Form->>Submit : Submit validated data
Submit-->>User : Confirm submission
```

**Diagram sources**
- [PropertyContractForm.tsx](file://src/components/property/PropertyContractForm.tsx#L35-L69)

**Section sources**
- [PropertyContractForm.tsx](file://src/components/property/PropertyContractForm.tsx#L1-L491)

## Contract Validation and Business Logic
The contract validation system implements business logic for property contracts, including date validation, financial constraints, and contractual requirements. The validation ensures that contract start dates precede end dates and that financial amounts are non-negative.

```mermaid
flowchart TD
A([Contract Validation]) --> B{Contract Type}
B --> |Rental| C["Validate rental_amount > 0"]
B --> |Sale| D["Validate sale terms"]
C --> E{Date Validation}
D --> E
E --> F["start_date < end_date"]
F --> G{Financial Validation}
G --> H["rental_amount ≥ 0"]
G --> I["deposit_amount ≥ 0"]
G --> J["commission_amount ≥ 0"]
H --> K([Validation Complete])
I --> K
J --> K
```

**Diagram sources**
- [PropertyContractForm.tsx](file://src/components/property/PropertyContractForm.tsx#L35-L69)
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L1-L102)

**Section sources**
- [PropertyContractForm.tsx](file://src/components/property/PropertyContractForm.tsx#L35-L69)
- [contract.schema.ts](file://src/schemas/contract.schema.ts#L1-L102)

## Address and Location Validation
The system implements address validation through structured address fields and geolocation integration. Property addresses are validated for completeness, and location coordinates are captured through an integrated map picker component.

```mermaid
classDiagram
class AddressValidation {
+street : optional
+area : required
+block : optional
+building : optional
+floor : optional
+apartment : optional
+city : optional
+governorate : optional
+postal_code : optional
+country : default "Kuwait"
+is_primary : default false
}
class LocationCoordinates {
+latitude : number
+longitude : number
}
class PropertyForm {
+address : string
+area : string
+latitude : number
+longitude : number
}
PropertyForm --> AddressValidation : "implements"
PropertyForm --> LocationCoordinates : "includes"
```

**Diagram sources**
- [common.schema.ts](file://src/schemas/common.schema.ts#L20-L40)
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

**Section sources**
- [common.schema.ts](file://src/schemas/common.schema.ts#L20-L40)
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

## Property Classification and Zoning
The system supports multiple property types with specific classification rules. Property classification is validated against a predefined enumeration of property types, ensuring consistency in property categorization.

```mermaid
erDiagram
PROPERTY ||--o{ PROPERTY_TYPE : "has"
PROPERTY ||--o{ PROPERTY_STATUS : "has"
PROPERTY ||--o{ PROPERTY_CONDITION : "has"
PROPERTY_TYPE {
string apartment
string villa
string office
string shop
string warehouse
string land
}
PROPERTY_STATUS {
string available
string rented
string sold
string maintenance
string reserved
}
PROPERTY_CONDITION {
string excellent
string very_good
string good
string fair
string poor
}
PROPERTY {
string property_name
string property_code
string address
string area
string property_type
string status
string condition_status
string owner_id
number area_size
number bedrooms
number bathrooms
number parking_spaces
boolean is_furnished
boolean has_elevator
boolean has_garden
boolean has_swimming_pool
number sale_price
number rental_price
string description
string notes
number latitude
number longitude
}
```

**Diagram sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

**Section sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

## Rental Pricing and Financial Validation
The system implements financial validation rules for rental pricing, ensuring that rental amounts are non-negative and that pricing data is consistent with business requirements. The validation includes constraints for sale prices, rental prices, and deposit amounts.

```mermaid
flowchart TD
A([Financial Validation]) --> B{Property Type}
B --> |For Sale| C["Validate sale_price ≥ 0"]
B --> |For Rent| D["Validate rental_price ≥ 0"]
C --> E["Optional sale_price"]
D --> F["Optional rental_price"]
E --> G([Financial Validation Complete])
F --> G
H["deposit_amount ≥ 0"] --> G
I["commission_amount ≥ 0"] --> G
```

**Diagram sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

**Section sources**
- [PropertyForm.tsx](file://src/modules/properties/components/PropertyForm.tsx#L35-L65)

## Complex Property Hierarchies
The system supports complex property hierarchies through the building property type, which can contain multiple units. While the current implementation focuses on individual properties, the data model supports future expansion to handle buildings with multiple units and shared amenities.

```mermaid
classDiagram
class Property {
+string id
+string property_code
+string property_name
+string property_type
+string property_status
+string owner_id
+number area_sqm
+number bedrooms
+number bathrooms
+number parking_spaces
+boolean furnished
+string address
+any location_coordinates
+string[] images
+string[] documents
}
class Building {
+string id
+string property_code
+string property_name
+string property_type "building"
+string property_status
+string owner_id
+number total_floors
+number area_sqm
+string address
+any location_coordinates
}
class Unit {
+string id
+string property_code
+string property_name
+string property_type "apartment, villa, etc."
+string property_status
+string owner_id
+number area_sqm
+number bedrooms
+number bathrooms
+boolean furnished
+string address
}
Building "1" *-- "0..*" Unit : "contains"
Property <|-- Building
Property <|-- Unit
```

**Diagram sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

**Section sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

## Property Documentation and Compliance
The system supports property documentation and compliance requirements through document management features. While the current form implementation focuses on core property data, the underlying data model includes support for property images and documents, enabling compliance with regulatory requirements.

```mermaid
flowchart TD
A([Property Documentation]) --> B["Attach Images"]
A --> C["Upload Documents"]
A --> D["Track Expiry Dates"]
A --> E["Ensure Compliance"]
B --> F([Document Management])
C --> F
D --> F
E --> F
F --> G["Store in Documents Array"]
G --> H["Link to Property Record"]
```

**Diagram sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

**Section sources**
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

## International Property Management
The system is designed to support international property management with considerations for varying regulatory requirements. The data model includes country-specific fields and supports multiple languages, enabling adaptation to different regional requirements.

```mermaid
flowchart TD
A([International Support]) --> B["Country Field"]
A --> C["Localized Labels"]
A --> D["Currency Support"]
A --> E["Regulatory Variations"]
B --> F["Default: Kuwait"]
C --> G["Arabic/English"]
D --> H["QAR, KWD, USD, EUR, SAR, AED"]
E --> I["Adaptable Validation Rules"]
F --> J([International Property Management])
G --> J
H --> J
I --> J
```

**Diagram sources**
- [common.schema.ts](file://src/schemas/common.schema.ts#L20-L40)
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)

**Section sources**
- [common.schema.ts](file://src/schemas/common.schema.ts#L20-L40)
- [types/index.ts](file://src/modules/properties/types/index.ts#L1-L66)