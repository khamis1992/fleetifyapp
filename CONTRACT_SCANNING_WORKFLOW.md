# 🔄 Contract Scanning Workflow

## Visual Flow Diagram

```mermaid
graph TB
    Start([User Opens Contract Page]) --> CreateBtn[Click 'Create New Contract']
    CreateBtn --> Wizard[Contract Wizard Opens]
    Wizard --> ScanBtn{Click 'Scan Contract'?}
    
    ScanBtn -->|Yes| Scanner[Scanner Dialog Opens]
    ScanBtn -->|No| ManualEntry[Manual Data Entry]
    
    Scanner --> ModeSelect{Select Input Mode}
    ModeSelect -->|Upload| UploadFile[Select Image from Device]
    ModeSelect -->|Camera| TakePhoto[Take Photo with Camera]
    
    UploadFile --> Preview[Preview Image]
    TakePhoto --> Preview
    
    Preview --> ExtractBtn[Click 'Extract Data']
    ExtractBtn --> Processing[AI Processing<br/>5-10 seconds]
    
    Processing --> AICall[GPT-4 Vision API<br/>Extracts Text & Data]
    AICall --> Parse[Parse JSON Response]
    Parse --> Validate[Validate & Clean Data]
    
    Validate --> Success{Extraction<br/>Successful?}
    Success -->|Yes| AutoFill[Auto-Fill Contract Form]
    Success -->|No| ErrorMsg[Show Error Message]
    
    ErrorMsg --> Retry{Retry?}
    Retry -->|Yes| Scanner
    Retry -->|No| ManualEntry
    
    AutoFill --> Review[Review Auto-Filled Data]
    Review --> Correct{Data<br/>Correct?}
    
    Correct -->|No| ManualFix[Manually Fix Errors]
    Correct -->|Yes| Complete[Complete Wizard Steps]
    ManualFix --> Complete
    ManualEntry --> Complete
    
    Complete --> Submit[Submit Contract]
    Submit --> End([Contract Created])
    
    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style Processing fill:#fff3cd
    style AICall fill:#d1ecf1
    style AutoFill fill:#d4edda
    style ErrorMsg fill:#f8d7da
```

---

## Detailed Step-by-Step Process

### Phase 1: Initiation
```
┌──────────────────────────────────────┐
│  1. User navigates to Contracts page │
│  2. Clicks "Create New Contract"     │
│  3. Contract Wizard dialog opens     │
└──────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Scan Contract? │
         └────────────────┘
         │              │
    ┌────┘              └────┐
    │                        │
    ▼                        ▼
 [YES]                    [NO]
Scan Mode              Manual Entry
```

### Phase 2: Image Capture
```
┌─────────────────────────────────────┐
│     Select Input Method:            │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ 📁 Upload    │  │ 📷 Camera   │ │
│  │   File       │  │   Capture   │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
           │                │
           └────────┬───────┘
                    │
                    ▼
           ┌────────────────┐
           │ Image Selected │
           │   & Previewed  │
           └────────────────┘
```

### Phase 3: OCR Processing
```
┌────────────────────────────────────────┐
│  OCR Processing Pipeline               │
│                                        │
│  1. Convert image to base64           │
│          │                             │
│          ▼                             │
│  2. Fetch OpenAI API key              │
│          │                             │
│          ▼                             │
│  3. Call GPT-4 Vision API             │
│     ┌─────────────────┐               │
│     │ AI Analyzes     │               │
│     │ Document Image  │               │
│     │ Extracts Text   │               │
│     │ Structures Data │               │
│     └─────────────────┘               │
│          │                             │
│          ▼                             │
│  4. Parse JSON response               │
│          │                             │
│          ▼                             │
│  5. Validate & clean data             │
│          │                             │
│          ▼                             │
│  6. Calculate confidence score        │
└────────────────────────────────────────┘
```

### Phase 4: Data Mapping & Auto-Fill
```
┌─────────────────────────────────────────┐
│  Extracted Data → Form Fields           │
│                                         │
│  contract_number    → contract_number   │
│  contract_date      → contract_date     │
│  monthly_rent       → monthly_amount    │
│  guarantee_amount   → guarantee_amount  │
│  start_date         → start_date        │
│  end_date           → end_date          │
│  customer_name      → (for matching)    │
│  vehicle_plate      → (for matching)    │
│                                         │
│  Auto-populated into Contract Wizard   │
└─────────────────────────────────────────┘
```

### Phase 5: Review & Submit
```
┌──────────────────────────────────┐
│  User Reviews Auto-Filled Data   │
│                                  │
│  ✓ Agreement Number: WRN-2025... │
│  ✓ Monthly Rent: 1,500 QAR      │
│  ✓ Duration: 30 months          │
│  ⚠ Customer: [Select from list] │
│  ⚠ Vehicle: [Select from list]  │
│                                  │
│  [Manual adjustments if needed]  │
└──────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   Submit    │
    │  Contract   │
    └─────────────┘
```

---

## State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: Wizard Opens
    
    Idle --> SelectingMode: Click Scan Button
    SelectingMode --> ImageCapture: Choose Upload/Camera
    
    ImageCapture --> Previewing: Image Selected
    Previewing --> Processing: Click Extract
    
    Processing --> Extracting: API Call in Progress
    Extracting --> Parsing: AI Response Received
    Parsing --> Validating: JSON Parsed
    
    Validating --> Success: Valid Data
    Validating --> Error: Invalid/No Data
    
    Success --> AutoFilled: Data Applied to Form
    Error --> Idle: Show Error, Reset
    
    AutoFilled --> Reviewing: User Reviews
    Reviewing --> Editing: Manual Corrections
    Editing --> Submitting: Data Validated
    
    Reviewing --> Submitting: Data OK
    Submitting --> [*]: Contract Created
    
    Error --> SelectingMode: User Retries
```

---

## Data Flow Architecture

```
┌──────────────┐
│   Browser    │
│  (Frontend)  │
└──────┬───────┘
       │
       │ 1. Image upload
       │
       ▼
┌──────────────────┐
│ ContractScanner  │◄─── User Interface Component
│     Dialog       │
└──────┬───────────┘
       │
       │ 2. Trigger extraction
       │
       ▼
┌──────────────────┐
│ useContractOCR   │◄─── React Hook (Business Logic)
│      Hook        │
└──────┬───────────┘
       │
       ├──► 3a. Convert to base64
       │
       ├──► 3b. Fetch API key
       │         │
       │         ▼
       │    ┌─────────────┐
       │    │  Supabase   │
       │    │  companies  │
       │    │   table     │
       │    └─────────────┘
       │
       ├──► 3c. Call OpenAI
       │         │
       │         ▼
       │    ┌──────────────┐
       │    │ OpenAI API   │
       │    │ GPT-4 Vision │
       │    └──────────────┘
       │
       └──► 3d. Return extracted data
                │
                ▼
       ┌──────────────────┐
       │ Contract Wizard  │◄─── Auto-fill form fields
       │   (Form State)   │
       └──────────────────┘
```

---

## Error Handling Flow

```
┌─────────────┐
│   Error     │
│  Occurred   │
└──────┬──────┘
       │
       ├──► Image too large
       │    └──► Show error: "File must be under 10MB"
       │
       ├──► Invalid format
       │    └──► Show error: "Only JPG, PNG, HEIC allowed"
       │
       ├──► API key missing
       │    └──► Show error: "OpenAI API not configured"
       │
       ├──► API call failed
       │    └──► Show error: "Network error, retry?"
       │
       ├──► Low confidence
       │    └──► Warning: "Please verify extracted data"
       │
       └──► No data extracted
            └──► Show error: "Could not read document"
                  │
                  ├──► [Retry] → Back to image capture
                  └──► [Manual Entry] → Skip to form
```

---

## Performance Optimization

```
┌─────────────────────────────────────┐
│  Optimization Strategies            │
│                                     │
│  1. Image Compression               │
│     - Resize large images           │
│     - Compress to optimal size      │
│     - Maintain readability          │
│                                     │
│  2. Lazy Loading                    │
│     - Load scanner only when needed │
│     - Defer API calls               │
│                                     │
│  3. Caching                         │
│     - Cache API key locally         │
│     - Reuse for session             │
│                                     │
│  4. Progress Indicators             │
│     - Show processing steps         │
│     - Real-time progress updates    │
│                                     │
│  5. Error Recovery                  │
│     - Retry mechanism               │
│     - Fallback to manual entry      │
└─────────────────────────────────────┘
```

---

This workflow ensures a smooth, user-friendly experience while maintaining data accuracy and system reliability.
