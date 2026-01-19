# UI Components

<cite>
**Referenced Files in This Document**   
- [button.tsx](file://src/components/ui/button.tsx)
- [card.tsx](file://src/components/ui/card.tsx)
- [dialog.tsx](file://src/components/ui/dialog.tsx)
- [form.tsx](file://src/components/ui/form.tsx)
- [table.tsx](file://src/components/ui/table.tsx)
- [navigation-menu.tsx](file://src/components/ui/navigation-menu.tsx)
- [tailwind.config.ts](file://tailwind.config.ts)
- [FeatureGate.tsx](file://src/components/common/FeatureGate.tsx)
- [PermissionGuard.tsx](file://src/components/common/PermissionGuard.tsx)
- [InvoiceCameraCapture.tsx](file://src/components/invoices/InvoiceCameraCapture.tsx) - *Added in recent commit*
- [InvoiceOCRResults.tsx](file://src/components/invoices/InvoiceOCRResults.tsx) - *Added in recent commit*
- [InvoiceMatchingView.tsx](file://src/components/invoices/InvoiceMatchingView.tsx) - *Added in recent commit*
- [InvoiceScannerDashboard.tsx](file://src/components/invoices/InvoiceScannerDashboard.tsx) - *Added in recent commit*
- [useInvoiceOCR.ts](file://src/hooks/useInvoiceOCR.ts) - *Added in recent commit*
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts) - *Added in recent commit*
- [invoiceOCR.ts](file://src/types/invoiceOCR.ts) - *Added in recent commit*
- [scan-invoice/index.ts](file://supabase/functions/scan-invoice/index.ts) - *Added in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Added new section for Invoice Scanning and OCR Components
- Added new section for OCR Data Processing and Matching
- Updated Table of Contents to include new sections
- Added references to new invoice scanning components and related files
- Added new Mermaid diagrams for OCR workflow and data flow

## Table of Contents
1. [Introduction](#introduction)
2. [Design System and Theming](#design-system-and-theming)
3. [Core UI Components](#core-ui-components)
4. [Component States and Animations](#component-states-and-animations)
5. [Accessibility and ARIA Compliance](#accessibility-and-aria-compliance)
6. [Responsive Behavior and Mobile Optimization](#responsive-behavior-and-mobile-optimization)
7. [Stateful Components and Context Integration](#stateful-components-and-context-integration)
8. [Usage Examples and Composition](#usage-examples-and-composition)
9. [Performance Considerations](#performance-considerations)
10. [Cross-Browser Compatibility](#cross-browser-compatibility)
11. [Invoice Scanning and OCR Components](#invoice-scanning-and-ocr-components)
12. [OCR Data Processing and Matching](#ocr-data-processing-and-matching)

## Introduction

The FleetifyApp UI Components library provides a comprehensive set of reusable primitives that form the foundation of the application's user interface. Located in `src/components/ui`, these components are built with React, Radix UI primitives, and Tailwind CSS, following modern design system principles. The library includes essential elements such as buttons, cards, dialogs, forms, tables, and navigation components that ensure consistency, accessibility, and responsiveness across the application.

These components are designed to be composable, theme-aware, and accessible by default, with built-in support for dark mode, responsive layouts, and internationalization. The implementation leverages React hooks, compound components, and utility-first styling to create a flexible and maintainable UI system that can be easily extended and customized.

**Section sources**
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)
- [card.tsx](file://src/components/ui/card.tsx#L1-L80)

## Design System and Theming

The UI components library is built on a robust design system powered by Tailwind CSS with extensive theming capabilities. The design system is configured in `tailwind.config.ts` and includes a comprehensive color palette, spacing system, typography hierarchy, and animation framework that ensures visual consistency across the application.

The theming system uses CSS variables to support dynamic theme switching, including light and dark modes. The configuration extends Tailwind's default theme with custom colors for primary, secondary, accent, success, warning, and destructive states, each with appropriate foreground and background variants. The system also includes mobile-specific colors and touch-friendly sizes to optimize the user experience on different devices.

```mermaid
classDiagram
class ThemeConfig {
+colors : object
+spacing : object
+borderRadius : object
+animation : object
+keyframes : object
+screens : object
}
class ColorPalette {
+primary : string
+secondary : string
+accent : string
+success : string
+warning : string
+destructive : string
+muted : string
}
class ResponsiveSystem {
+breakpoints : object
+container : object
+mobileSpacing : object
}
class AnimationSystem {
+transitions : object
+keyframes : object
+presets : object
}
ThemeConfig --> ColorPalette : "includes"
ThemeConfig --> ResponsiveSystem : "includes"
ThemeConfig --> AnimationSystem : "includes"
```

**Diagram sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)

## Core UI Components

### Button Component

The Button component is a versatile primitive that supports multiple variants, sizes, and states. It is implemented using the class-variance-authority (CVA) pattern for type-safe variant management and Radix UI's Slot component for seamless composition. The component supports various visual styles including default, destructive, outline, secondary, ghost, link, premium, success, and warning variants, each with appropriate hover and focus states.

```mermaid
classDiagram
class Button {
+variant : string
+size : string
+asChild : boolean
+className : string
+disabled : boolean
}
class ButtonVariants {
+default : string
+destructive : string
+outline : string
+secondary : string
+ghost : string
+link : string
+premium : string
+success : string
+warning : string
}
class ButtonSizes {
+default : string
+sm : string
+lg : string
+icon : string
}
Button --> ButtonVariants : "uses"
Button --> ButtonSizes : "uses"
Button --> Slot : "composes"
```

**Diagram sources**
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)

**Section sources**
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)

### Card Component

The Card component provides a container for grouping related content with a consistent visual style. It is implemented as a compound component with subcomponents for header, title, description, content, footer, and actions. The card features a subtle border, shadow, and background that adapts to the current theme, with appropriate spacing and typography hierarchy.

```mermaid
classDiagram
class Card {
+className : string
}
class CardHeader {
+className : string
}
class CardTitle {
+className : string
}
class CardDescription {
+className : string
}
class CardContent {
+className : string
}
class CardFooter {
+className : string
}
Card --> CardHeader : "contains"
Card --> CardContent : "contains"
CardFooter --> Card : "attached to"
CardHeader --> CardTitle : "contains"
CardHeader --> CardDescription : "contains"
```

**Diagram sources**
- [card.tsx](file://src/components/ui/card.tsx#L1-L80)

**Section sources**
- [card.tsx](file://src/components/ui/card.tsx#L1-L80)

### Dialog Component

The Dialog component provides a modal interface for displaying content that requires user attention. Built on Radix UI's Dialog primitive, it includes an overlay, content area, header, footer, title, and description with proper accessibility attributes. The dialog supports animations for entrance and exit, with different transitions for various screen sizes.

```mermaid
classDiagram
class Dialog {
+open : boolean
+onOpenChange : function
}
class DialogTrigger {
+asChild : boolean
}
class DialogPortal {
+container : HTMLElement
}
class DialogOverlay {
+className : string
}
class DialogContent {
+className : string
+maxWidth : string
}
class DialogHeader {
+className : string
}
class DialogFooter {
+className : string
}
class DialogTitle {
+className : string
}
class DialogDescription {
+className : string
}
Dialog --> DialogTrigger : "controlled by"
Dialog --> DialogPortal : "rendered in"
DialogPortal --> DialogOverlay : "contains"
DialogPortal --> DialogContent : "contains"
DialogContent --> DialogHeader : "contains"
DialogContent --> DialogFooter : "contains"
DialogHeader --> DialogTitle : "contains"
DialogHeader --> DialogDescription : "contains"
```

**Diagram sources**
- [dialog.tsx](file://src/components/ui/dialog.tsx#L1-L121)

**Section sources**
- [dialog.tsx](file://src/components/ui/dialog.tsx#L1-L121)

### Form Component

The Form component provides a robust system for building accessible and validated forms using react-hook-form. It is implemented as a compound component with subcomponents for form items, labels, controls, descriptions, and messages. The system integrates with React Context to provide error states and accessibility attributes to form elements.

```mermaid
classDiagram
class Form {
+form : UseFormReturn
}
class FormField {
+name : string
+control : Control
+render : function
}
class FormItem {
+id : string
}
class FormLabel {
+htmlFor : string
}
class FormControl {
+id : string
+aria-describedby : string
+aria-invalid : boolean
}
class FormDescription {
+id : string
}
class FormMessage {
+id : string
+error : FieldError
}
Form --> FormField : "contains"
FormField --> FormItem : "provides context"
FormItem --> FormLabel : "contains"
FormItem --> FormControl : "contains"
FormItem --> FormDescription : "contains"
FormItem --> FormMessage : "contains"
FormLabel --> FormControl : "labels"
FormDescription --> FormControl : "describes"
FormMessage --> FormControl : "validates"
```

**Diagram sources**
- [form.tsx](file://src/components/ui/form.tsx#L1-L177)

**Section sources**
- [form.tsx](file://src/components/ui/form.tsx#L1-L177)

### Table Component

The Table component provides a styled and accessible table structure with responsive behavior. It includes subcomponents for table, header, body, footer, rows, cells, and captions with appropriate styling and accessibility attributes. The implementation ensures proper keyboard navigation and screen reader support.

```mermaid
classDiagram
class Table {
+className : string
}
class TableHeader {
+className : string
}
class TableBody {
+className : string
}
class TableFooter {
+className : string
}
class TableRow {
+className : string
+selected : boolean
}
class TableHead {
+className : string
+textAlign : string
}
class TableCell {
+className : string
+textAlign : string
}
class TableCaption {
+className : string
}
Table --> TableHeader : "contains"
Table --> TableBody : "contains"
Table --> TableFooter : "contains"
TableHeader --> TableRow : "contains"
TableBody --> TableRow : "contains"
TableFooter --> TableRow : "contains"
TableRow --> TableHead : "contains"
TableRow --> TableCell : "contains"
Table --> TableCaption : "contains"
```

**Diagram sources**
- [table.tsx](file://src/components/ui/table.tsx#L1-L118)

**Section sources**
- [table.tsx](file://src/components/ui/table.tsx#L1-L118)

### Navigation Menu Component

The Navigation Menu component provides a hierarchical navigation system with support for dropdowns and viewport positioning. Built on Radix UI's NavigationMenu primitive, it includes triggers, content, links, and indicators with smooth animations and accessibility features.

```mermaid
classDiagram
class NavigationMenu {
+className : string
}
class NavigationMenuList {
+className : string
}
class NavigationMenuItem {
+value : string
}
class NavigationMenuTrigger {
+className : string
}
class NavigationMenuContent {
+className : string
}
class NavigationMenuLink {
+href : string
+active : boolean
}
class NavigationMenuViewport {
+className : string
}
class NavigationMenuIndicator {
+className : string
}
NavigationMenu --> NavigationMenuList : "contains"
NavigationMenuList --> NavigationMenuItem : "contains"
NavigationMenuItem --> NavigationMenuTrigger : "contains"
NavigationMenuItem --> NavigationMenuContent : "contains"
NavigationMenuTrigger --> NavigationMenuContent : "controls"
NavigationMenuContent --> NavigationMenuLink : "contains"
NavigationMenu --> NavigationMenuViewport : "contains"
NavigationMenu --> NavigationMenuIndicator : "contains"
```

**Diagram sources**
- [navigation-menu.tsx](file://src/components/ui/navigation-menu.tsx#L1-L129)

**Section sources**
- [navigation-menu.tsx](file://src/components/ui/navigation-menu.tsx#L1-L129)

## Component States and Animations

The UI components library implements a comprehensive system of states and animations to enhance user experience and provide visual feedback. States such as hover, focus, active, disabled, and loading are consistently applied across components with appropriate visual treatments.

The animation system is defined in `tailwind.config.ts` and includes keyframes and animation presets for common transitions such as accordion open/close, fade-in, scale-in, slide-up, and bubble-in effects. Mobile-specific animations like slide-in-bottom, slide-out-bottom, and swipe-reveal are also provided to optimize the touch interface experience.

```mermaid
flowchart TD
A[Component Render] --> B{State Check}
B --> |Default| C[Apply Base Styles]
B --> |Hover| D[Apply Hover Styles]
B --> |Focus| E[Apply Focus Styles]
B --> |Active| F[Apply Active Styles]
B --> |Disabled| G[Apply Disabled Styles]
B --> |Loading| H[Show Loading State]
C --> I[Check Animation State]
D --> I
E --> I
F --> I
G --> I
H --> I
I --> |Initial Render| J[Apply Entrance Animation]
I --> |State Change| K[Apply Transition Animation]
I --> |No Animation| L[Apply Static Styles]
J --> M[Render Component]
K --> M
L --> M
```

**Diagram sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)

## Accessibility and ARIA Compliance

The UI components library prioritizes accessibility with comprehensive ARIA attribute implementation and keyboard navigation support. Each component is designed to meet WCAG 2.1 AA standards and provides appropriate roles, states, and properties for screen readers and assistive technologies.

Buttons include proper type attributes and keyboard focus management. Forms implement aria-describedby to connect labels, descriptions, and error messages with their controls. Dialogs provide proper focus trapping and aria-modal attributes. Tables include appropriate header associations and navigation cues. Navigation menus support keyboard navigation with arrow keys and proper focus management.

```mermaid
flowchart TD
A[User Interaction] --> B{Input Method}
B --> |Mouse| C[Visual Feedback]
B --> |Keyboard| D[Focus Management]
B --> |Screen Reader| E[ARIA Attributes]
D --> F[Focus Ring]
D --> G[Tab Order]
D --> H[Keyboard Shortcuts]
E --> I[Role Attributes]
E --> J[State Attributes]
E --> K[Property Attributes]
E --> L[Live Regions]
C --> M[Component Response]
F --> M
G --> M
H --> M
I --> M
J --> M
K --> M
L --> M
M --> N[Accessibility Audit]
```

**Section sources**
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)
- [form.tsx](file://src/components/ui/form.tsx#L1-L177)
- [dialog.tsx](file://src/components/ui/dialog.tsx#L1-L121)

## Responsive Behavior and Mobile Optimization

The components are designed with responsive behavior as a core principle, adapting to different screen sizes and input methods. The responsive system is configured in `tailwind.config.ts` with breakpoints for mobile, tablet, and desktop views, including device-specific breakpoints for common mobile devices.

Mobile optimization includes touch-friendly target sizes (44px minimum), safe area insets for mobile browsers, and mobile-specific spacing and typography. The responsive-grid, responsive-container, and responsive-modal components provide layout primitives that automatically adapt to the viewport size.

```mermaid
graph TD
A[Viewport Size] --> B{Breakpoint}
B --> |Mobile| C[Apply Mobile Styles]
B --> |Tablet| D[Apply Tablet Styles]
B --> |Desktop| E[Apply Desktop Styles]
C --> F[Touch Targets ≥ 44px]
C --> G[Mobile Typography]
C --> H[Safe Area Insets]
C --> I[Vertical Layout]
D --> J[Medium Touch Targets]
D --> K[Tablet Typography]
D --> L[Grid Layout]
E --> M[Standard Target Sizes]
E --> N[Desktop Typography]
E --> O[Complex Layouts]
F --> P[Optimized UX]
G --> P
H --> P
I --> P
J --> P
K --> P
L --> P
M --> P
N --> P
O --> P
```

**Diagram sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)

**Section sources**
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)

## Stateful Components and Context Integration

### FeatureGate Component

The FeatureGate component controls access to premium features based on subscription status. It integrates with the FeatureFlagsContext and useFeatureAccess hook to determine feature availability, displaying either the protected content or an upgrade prompt.

```mermaid
sequenceDiagram
participant UI as User Interface
participant FeatureGate as FeatureGate Component
participant Hook as useFeatureAccess Hook
participant Context as FeatureFlagsContext
UI->>FeatureGate : Render with feature="premium"
FeatureGate->>Hook : Check access to feature
Hook->>Context : Request feature status
Context-->>Hook : Return feature data
Hook-->>FeatureGate : Return access status
alt Has Access
FeatureGate->>UI : Render children
else No Access
FeatureGate->>UI : Render upgrade prompt
end
```

**Diagram sources**
- [FeatureGate.tsx](file://src/components/common/FeatureGate.tsx#L1-L67)

**Section sources**
- [FeatureGate.tsx](file://src/components/common/FeatureGate.tsx#L1-L67)

### PermissionGuard Component

The PermissionGuard component provides role-based and permission-based access control, integrating with multiple context systems including AuthContext, CompanyContext, and FeatureFlagsContext. It supports complex authorization scenarios with fallback rendering and loading states.

```mermaid
sequenceDiagram
participant UI as User Interface
participant PermissionGuard as PermissionGuard Component
participant PermissionHook as usePermissionCheck
participant FeatureHook as useFeatureAccess
participant CompanyHook as useUnifiedCompanyAccess
UI->>PermissionGuard : Render with permission="delete_users"
PermissionGuard->>CompanyHook : Check company admin status
CompanyHook-->>PermissionGuard : Return admin status
PermissionGuard->>PermissionHook : Check permission
PermissionHook-->>PermissionGuard : Return permission status
PermissionGuard->>FeatureHook : Check feature access
FeatureHook-->>PermissionGuard : Return feature status
alt All Checks Pass
PermissionGuard->>UI : Render children
else Access Denied
PermissionGuard->>UI : Render access denied UI
end
```

**Diagram sources**
- [PermissionGuard.tsx](file://src/components/common/PermissionGuard.tsx#L1-L207)

**Section sources**
- [PermissionGuard.tsx](file://src/components/common/PermissionGuard.tsx#L1-L207)

## Usage Examples and Composition

The UI components are designed to be easily composed to create complex interfaces. Common composition patterns include form layouts with card containers, dialog modals with form content, and navigation menus with dropdown content.

For example, a settings panel might compose a Card with a Form containing multiple FormItems, each with labels, controls, and descriptions. A data management interface might combine a Table with responsive behavior, filtering controls, and action buttons in a responsive layout.

The asChild prop pattern allows components to inherit the behavior of their children while applying consistent styling, enabling seamless integration with third-party components or custom elements.

**Section sources**
- [card.tsx](file://src/components/ui/card.tsx#L1-L80)
- [form.tsx](file://src/components/ui/form.tsx#L1-L177)
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)

## Performance Considerations

The UI components library is optimized for performance with several key strategies. The implementation uses React.memo where appropriate to prevent unnecessary re-renders. The class-variance-authority library enables efficient conditional class name generation. The radix-ui primitives are designed for minimal re-renders and efficient state management.

The components avoid inline function creation in render methods and use stable callback references. The form system efficiently manages re-renders by only updating fields that have changed. The animation system uses CSS transitions and transforms for hardware-accelerated performance.

**Section sources**
- [button.tsx](file://src/components/ui/button.tsx#L1-L60)
- [form.tsx](file://src/components/ui/form.tsx#L1-L177)

## Cross-Browser Compatibility

The components are designed to work consistently across modern browsers including Chrome, Firefox, Safari, and Edge. The implementation relies on well-supported CSS features and progressive enhancement principles. For older browsers, the application includes compatibility checks and fallbacks through the CompatibilityManager in `src/lib/compatibilityManager.ts`.

The library uses standardized APIs and avoids browser-specific features, ensuring consistent behavior. The Tailwind CSS configuration targets modern browser versions, and the JavaScript code is transpiled to ensure compatibility with supported browser versions.

**Section sources**
- [compatibilityManager.ts](file://src/lib/compatibilityManager.ts#L1-L47)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L298)

## Invoice Scanning and OCR Components

The new invoice scanning and OCR system provides a comprehensive solution for digitizing paper invoices through image capture and optical character recognition. This system consists of several specialized UI components that work together to provide a seamless user experience for processing scanned invoices.

### InvoiceCameraCapture Component

The InvoiceCameraCapture component provides a user interface for capturing invoice images through either camera capture or file upload. It supports both mobile camera capture and gallery selection, with a preview interface for confirming the captured image before processing.

```mermaid
classDiagram
class InvoiceCameraCapture {
+onImageCapture : function
+onCancel : function
+preview : string
+capturedFile : File
}
class CameraInput {
+capture : string
+accept : string
}
class FileInput {
+accept : string
}
class Preview {
+aspectRatio : string
+objectFit : string
}
InvoiceCameraCapture --> CameraInput : "controls"
InvoiceCameraCapture --> FileInput : "controls"
InvoiceCameraCapture --> Preview : "displays"
```

**Diagram sources**
- [InvoiceCameraCapture.tsx](file://src/components/invoices/InvoiceCameraCapture.tsx#L1-L120)

**Section sources**
- [InvoiceCameraCapture.tsx](file://src/components/invoices/InvoiceCameraCapture.tsx#L1-L120)

### InvoiceOCRResults Component

The InvoiceOCRResults component displays the extracted data from the OCR process alongside the original invoice image. It provides a side-by-side comparison with editable fields for correcting any inaccuracies in the extracted data. The component also displays a confidence score for the OCR results.

```mermaid
classDiagram
class InvoiceOCRResults {
+data : ExtractedInvoiceData
+confidence : number
+imageUrl : string
+onChange : function
}
class ImagePreview {
+aspectRatio : string
+objectFit : string
}
class DataForm {
+invoice_number : string
+invoice_date : string
+customer_name : string
+contract_number : string
+total_amount : number
+notes : string
}
class ConfidenceBadge {
+color : string
+icon : Component
+text : string
}
InvoiceOCRResults --> ImagePreview : "contains"
InvoiceOCRResults --> DataForm : "contains"
InvoiceOCRResults --> ConfidenceBadge : "contains"
```

**Diagram sources**
- [InvoiceOCRResults.tsx](file://src/components/invoices/InvoiceOCRResults.tsx#L1-L135)

**Section sources**
- [InvoiceOCRResults.tsx](file://src/components/invoices/InvoiceOCRResults.tsx#L1-L135)

### InvoiceMatchingView Component

The InvoiceMatchingView component displays the results of the intelligent matching algorithm that attempts to associate the scanned invoice with existing customers and contracts in the system. It shows the best match with confidence score and provides alternative matches for user selection.

```mermaid
classDiagram
class InvoiceMatchingView {
+matchResult : InvoiceMatchResult
+onSelectMatch : function
+onCreateNew : function
}
class BestMatch {
+customer_name : string
+contract_number : string
+confidence : number
+match_reasons : string[]
}
class AlternativeMatches {
+list : Array
+confidence : number
+reason : string
}
class MatchActions {
+onSelectMatch : function
+onCreateNew : function
}
InvoiceMatchingView --> BestMatch : "displays"
InvoiceMatchingView --> AlternativeMatches : "displays"
InvoiceMatchingView --> MatchActions : "contains"
```

**Diagram sources**
- [InvoiceMatchingView.tsx](file://src/components/invoices/InvoiceMatchingView.tsx#L1-L142)

**Section sources**
- [InvoiceMatchingView.tsx](file://src/components/invoices/InvoiceMatchingView.tsx#L1-L142)

### InvoiceScannerDashboard Component

The InvoiceScannerDashboard component orchestrates the entire invoice scanning workflow through a multi-step interface. It manages the state transitions between capturing, processing, matching, and saving invoice data, providing a guided experience for users.

```mermaid
classDiagram
class InvoiceScannerDashboard {
+step : string
+imageFile : File
+extractedData : ExtractedInvoiceData
+confidence : number
+matchResult : InvoiceMatchResult
}
class CaptureStep {
+onImageCapture : function
}
class ResultsStep {
+handleDataChange : function
+handleProceedToMatching : function
}
class MatchingStep {
+handleSelectMatch : function
}
class SaveStep {
+handleSave : function
}
InvoiceScannerDashboard --> CaptureStep : "contains"
InvoiceScannerDashboard --> ResultsStep : "contains"
InvoiceScannerDashboard --> MatchingStep : "contains"
InvoiceScannerDashboard --> SaveStep : "contains"
```

**Diagram sources**
- [InvoiceScannerDashboard.tsx](file://src/components/invoices/InvoiceScannerDashboard.tsx#L1-L307)

**Section sources**
- [InvoiceScannerDashboard.tsx](file://src/components/invoices/InvoiceScannerDashboard.tsx#L1-L307)

## OCR Data Processing and Matching

The OCR data processing and matching system provides the backend functionality for extracting data from invoice images and associating them with existing records in the database. This system consists of custom hooks and type definitions that work with the UI components to provide a complete solution.

### useInvoiceOCR Hook

The useInvoiceOCR hook provides the interface between the UI components and the Supabase edge function that performs the actual OCR processing. It handles image conversion to base64, API invocation, and result parsing with appropriate error handling and user feedback.

```mermaid
sequenceDiagram
participant UI as InvoiceScannerDashboard
participant Hook as useInvoiceOCR
participant Supabase as Supabase Edge Function
participant Toast as Toast System
UI->>Hook : processImage(file)
Hook->>Hook : Convert image to base64
Hook->>Supabase : invoke('scan-invoice')
Supabase-->>Hook : Return OCR results
alt Success
Hook->>Toast : Show success toast
Hook->>UI : Return extracted data
else Error
Hook->>Toast : Show error toast
Hook->>UI : Return null
end
```

**Diagram sources**
- [useInvoiceOCR.ts](file://src/hooks/useInvoiceOCR.ts#L1-L75)

**Section sources**
- [useInvoiceOCR.ts](file://src/hooks/useInvoiceOCR.ts#L1-L75)

### useInvoiceMatching Hook

The useInvoiceMatching hook implements the intelligent matching algorithm that attempts to associate extracted invoice data with existing customers and contracts. It queries the database using multiple strategies including contract number matching, customer name matching, and amount/date range matching.

```mermaid
flowchart TD
A[Extracted Data] --> B{Matching Strategy}
B --> |Contract Number| C[Query Contracts by Number]
B --> |Customer Name| D[Query Customers by Name]
B --> |Amount & Date| E[Query Active Contracts by Amount]
C --> F[Calculate Confidence]
D --> F
E --> F
F --> G[Sort by Confidence]
G --> H[Return Best Match]
H --> I[InvoiceMatchingView]
```

**Diagram sources**
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts#L1-L163)

**Section sources**
- [useInvoiceMatching.ts](file://src/hooks/useInvoiceMatching.ts#L1-L163)

### OCR Data Types

The invoiceOCR.ts file defines the TypeScript interfaces for the OCR system, providing type safety for the data flow between components, hooks, and the backend. These types ensure consistency across the entire invoice scanning workflow.

```mermaid
classDiagram
class ExtractedInvoiceData {
+invoice_number : string
+invoice_date : string
+customer_name : string
+contract_number : string
+total_amount : number
+items : InvoiceItem[]
+notes : string
}
class InvoiceItem {
+description : string
+quantity : number
+unit_price : number
+total : number
}
class OCRResult {
+success : boolean
+data : ExtractedInvoiceData
+confidence : number
+raw_response : string
+error : string
}
class InvoiceMatchResult {
+confidence : number
+customer_id : string
+customer_name : string
+contract_id : string
+contract_number : string
+match_reasons : string[]
+alternatives : AlternativeMatch[]
}
class AlternativeMatch {
+customer_id : string
+customer_name : string
+contract_id : string
+contract_number : string
+confidence : number
+reason : string
}
class InvoiceOCRLog {
+id : string
+company_id : string
+invoice_id : string
+image_url : string
+ocr_confidence : number
+extracted_data : ExtractedInvoiceData
+matched_customer_id : string
+matched_contract_id : string
+match_confidence : number
+match_reasons : string[]
+processing_status : string
+error_message : string
+processed_by : string
+created_at : string
+updated_at : string
}
```

**Diagram sources**
- [invoiceOCR.ts](file://src/types/invoiceOCR.ts#L1-L59)

**Section sources**
- [invoiceOCR.ts](file://src/types/invoiceOCR.ts#L1-L59)

### OCR Edge Function

The scan-invoice edge function implements the server-side OCR processing using the Google Gemini 2.5 Flash model through the Lovable AI gateway. It receives base64-encoded images, processes them with AI, and returns structured JSON data with confidence scores.

```mermaid
sequenceDiagram
participant UI as Frontend
participant Supabase as Supabase
participant Lovable as Lovable AI Gateway
participant Gemini as Google Gemini
UI->>Supabase : invoke('scan-invoice')
Supabase->>Lovable : POST /v1/chat/completions
Lovable->>Gemini : Process image with OCR
Gemini-->>Lovable : Return extracted text
Lovable-->>Supabase : Return JSON response
Supabase-->>UI : Return structured data
```

**Diagram sources**
- [scan-invoice/index.ts](file://supabase/functions/scan-invoice/index.ts#L1-L183)

**Section sources**
- [scan-invoice/index.ts](file://supabase/functions/scan-invoice/index.ts#L1-L183)