# Feature 6.2 - Technical Implementation Guide

## 📁 File Structure

```
src/
├── components/legal/
│   ├── CaseStatusManager.tsx         (314 lines) - Status transitions
│   ├── CaseTimeline.tsx              (284 lines) - Timeline display
│   ├── TimelineEntryDialog.tsx       (277 lines) - Add manual entries
│   └── index.ts                      (Updated)   - Exports
│
└── pages/legal/
    └── LegalCasesTracking.tsx        (Updated)   - Integration
```

---

## 🔧 Component APIs

### CaseStatusManager

**Props**:
```typescript
interface CaseStatusManagerProps {
  caseId: string;                              // Unique case identifier
  currentStatus: string;                       // Current case status
  caseName: string;                            // Display name for dialog
  onStatusChange?: (newStatus: string, notes: string) => Promise<void>;
}
```

**Supported Statuses**:
```typescript
type CaseStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'notice_sent'
  | 'in_negotiation'
  | 'filed'
  | 'hearing_scheduled'
  | 'judgment_received'
  | 'execution'
  | 'settled'
  | 'closed_won'
  | 'closed_lost'
  | 'closed_withdrawn';
```

**Status Configuration**:
```typescript
interface StatusConfig {
  label: string;                      // Display label
  description: string;                // Status description
  variant: 'default' | 'secondary' | 'destructive' | 'outline';  // Badge style
  icon: React.ReactNode;              // Status icon
  allowedNextStatuses: CaseStatus[];  // Valid transitions
}
```

**Usage Example**:
```typescript
import CaseStatusManager from '@/components/legal/CaseStatusManager';

<CaseStatusManager
  caseId="case-123"
  currentStatus="pending_review"
  caseName="Collection Case #001"
  onStatusChange={async (newStatus, notes) => {
    // Call API to update case status
    await updateCaseStatus(caseId, newStatus, notes);
  }}
/>
```

---

### CaseTimeline

**Props**:
```typescript
interface CaseTimelineProps {
  caseId: string;                     // Unique case identifier
  entries: TimelineEntry[];           // Array of timeline entries
  onAddEntry?: () => void;            // Callback when "Add Entry" clicked
  isLoading?: boolean;                // Show loading state
}
```

**Timeline Entry Type**:
```typescript
interface TimelineEntry {
  id: string;                         // Unique entry ID
  type: 'auto' | 'manual';            // Entry type
  category: 'case_created' 
           | 'status_changed' 
           | 'payment_received' 
           | 'court_hearing' 
           | 'lawyer_call' 
           | 'customer_meeting';      // Event category
  title: string;                      // Entry title
  description: string;                // Detailed description
  date: string;                       // Date (YYYY-MM-DD format)
  timestamp: string;                  // Full timestamp (ISO 8601)
  performedBy: string;                // Person who performed action
  notes?: string;                     // Optional additional notes
}
```

**Usage Example**:
```typescript
import CaseTimeline from '@/components/legal/CaseTimeline';

const timelineEntries: TimelineEntry[] = [
  {
    id: '1',
    type: 'auto',
    category: 'case_created',
    title: 'Case Created',
    description: 'Legal case was created',
    date: '2025-10-20',
    timestamp: '2025-10-20T10:30:00Z',
    performedBy: 'System',
  },
  {
    id: '2',
    type: 'auto',
    category: 'status_changed',
    title: 'Status Changed',
    description: 'Case status updated',
    date: '2025-10-21',
    timestamp: '2025-10-21T15:45:00Z',
    performedBy: 'Sarah Johnson',
    notes: 'Legal review completed',
  },
];

<CaseTimeline
  caseId="case-123"
  entries={timelineEntries}
  onAddEntry={() => setShowDialog(true)}
  isLoading={false}
/>
```

---

### TimelineEntryDialog

**Props**:
```typescript
interface TimelineEntryDialogProps {
  open: boolean;                      // Dialog visibility
  onOpenChange: (open: boolean) => void;  // Callback to toggle dialog
  onSubmit?: (data: TimelineEntryFormData) => Promise<void>;  // Form submission
  caseId: string;                     // Current case ID
}
```

**Form Data Type**:
```typescript
interface TimelineEntryFormData {
  category: 'court_hearing' | 'lawyer_call' | 'customer_meeting';
  title: string;                      // Event title
  description: string;                // Event description
  date: string;                       // Event date (YYYY-MM-DD)
  time: string;                       // Event time (HH:MM 24-hour format)
  notes: string;                      // Additional notes
}
```

**Usage Example**:
```typescript
import TimelineEntryDialog from '@/components/legal/TimelineEntryDialog';

const [showDialog, setShowDialog] = useState(false);

<TimelineEntryDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  caseId="case-123"
  onSubmit={async (formData) => {
    const newEntry: TimelineEntry = {
      id: Date.now().toString(),
      type: 'manual',
      category: formData.category,
      title: formData.title,
      description: formData.description,
      date: formData.date,
      timestamp: `${formData.date}T${formData.time}`,
      performedBy: 'Current User Name',
      notes: formData.notes,
    };
    
    // Add to timeline
    setCaseTimeline([newEntry, ...caseTimeline]);
    
    // Optionally save to database
    // await saveCaseTimeline(caseId, newEntry);
  }}
/>
```

---

## 🔄 Integration in LegalCasesTracking

**State Management**:
```typescript
const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
const [showTimelineDialog, setShowTimelineDialog] = useState(false);
const [caseTimeline, setCaseTimeline] = useState<TimelineEntry[]>([]);
```

**Tab Structure**:
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="cases">Cases List</TabsTrigger>
    <TabsTrigger value="case-details">Case Details</TabsTrigger>
    <TabsTrigger value="delinquent">Delinquent Customers</TabsTrigger>
  </TabsList>

  <TabsContent value="cases">
    {/* Cases list with click handler */}
    <TableRow
      onClick={() => {
        setSelectedCaseId(legalCase.id);
        setActiveTab('case-details');
      }}
    >
      {/* Case data */}
    </TableRow>
  </TabsContent>

  <TabsContent value="case-details">
    <CaseStatusManager {...props} />
    <CaseTimeline {...props} />
  </TabsContent>
</Tabs>
```

---

## 🎨 Styling & Customization

### Status Badge Variants
```typescript
// Defined in CaseStatusManager
const STATUS_CONFIGS: Record<CaseStatus, StatusConfig> = {
  draft: {
    variant: 'secondary',  // Gray background
    // ...
  },
  pending_review: {
    variant: 'default',    // Primary color
    // ...
  },
  approved: {
    variant: 'default',    // Primary color
    // ...
  },
  closed_won: {
    variant: 'default',    // Primary color (success)
    // ...
  },
  closed_lost: {
    variant: 'destructive', // Red background
    // ...
  },
  closed_withdrawn: {
    variant: 'secondary',  // Gray background
    // ...
  },
  // ... other statuses
};
```

### Timeline Category Colors
```typescript
// Defined in CaseTimeline
const CATEGORY_CONFIG = {
  case_created: {
    color: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  },
  status_changed: {
    color: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
  },
  payment_received: {
    color: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  },
  court_hearing: {
    color: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
  },
  lawyer_call: {
    color: 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700',
  },
  customer_meeting: {
    color: 'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700',
  },
};
```

---

## 🔌 Database Integration (Optional)

### Create Timeline Table

```sql
CREATE TABLE case_timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Entry Details
  entry_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Event Timestamp
  event_date DATE NOT NULL,
  event_time TIME,
  event_timestamp TIMESTAMP NOT NULL,
  
  -- User Attribution
  performed_by UUID REFERENCES profiles(id),
  performed_by_name VARCHAR(255) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_type CHECK (entry_type IN ('auto', 'manual')),
  CONSTRAINT check_category CHECK (category IN (
    'case_created', 'status_changed', 'payment_received',
    'court_hearing', 'lawyer_call', 'customer_meeting'
  ))
);

-- Indexes
CREATE INDEX idx_timeline_case_id ON case_timeline_entries(case_id);
CREATE INDEX idx_timeline_event_date ON case_timeline_entries(event_date DESC);
CREATE INDEX idx_timeline_company_id ON case_timeline_entries(company_id);
CREATE INDEX idx_timeline_timestamp ON case_timeline_entries(event_timestamp DESC);

-- Enable RLS
ALTER TABLE case_timeline_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "users_can_view_own_company_timelines"
ON case_timeline_entries FOR ALL
USING (company_id = (SELECT company_id FROM auth.users WHERE auth.uid() = user_id));
```

### Fetch Timeline Entries

```typescript
import { supabase } from '@/integrations/supabase/client';

export const fetchCaseTimeline = async (caseId: string): Promise<TimelineEntry[]> => {
  const { data, error } = await supabase
    .from('case_timeline_entries')
    .select('*')
    .eq('case_id', caseId)
    .order('event_timestamp', { ascending: false });

  if (error) throw error;
  
  return data.map(entry => ({
    id: entry.id,
    type: entry.entry_type,
    category: entry.category,
    title: entry.title,
    description: entry.description,
    date: entry.event_date,
    timestamp: entry.event_timestamp,
    performedBy: entry.performed_by_name,
    notes: entry.notes,
  }));
};
```

### Save Timeline Entry

```typescript
export const createTimelineEntry = async (
  caseId: string,
  companyId: string,
  entry: TimelineEntry
): Promise<TimelineEntry> => {
  const { data, error } = await supabase
    .from('case_timeline_entries')
    .insert({
      case_id: caseId,
      company_id: companyId,
      entry_type: entry.type,
      category: entry.category,
      title: entry.title,
      description: entry.description,
      notes: entry.notes,
      event_date: entry.date,
      event_time: entry.timestamp.split('T')[1]?.substring(0, 5),
      event_timestamp: entry.timestamp,
      performed_by_name: entry.performedBy,
    })
    .select()
    .single();

  if (error) throw error;
  
  return entry;
};
```

### Update Case Status

```typescript
export const updateCaseStatus = async (
  caseId: string,
  companyId: string,
  newStatus: string,
  notes: string
): Promise<void> => {
  // Update case status
  const { error: updateError } = await supabase
    .from('legal_cases')
    .update({ case_status: newStatus })
    .eq('id', caseId);

  if (updateError) throw updateError;

  // Create timeline entry
  const timelineEntry: TimelineEntry = {
    id: Date.now().toString(),
    type: 'auto',
    category: 'status_changed',
    title: `Status Changed to ${newStatus}`,
    description: `Case status was updated to ${newStatus}`,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    performedBy: 'System',
    notes,
  };

  await createTimelineEntry(caseId, companyId, timelineEntry);
};
```

---

## 🧪 Testing Examples

### Test Status Change

```typescript
describe('CaseStatusManager', () => {
  it('should change case status', async () => {
    const { getByRole, getByText } = render(
      <CaseStatusManager
        caseId="test-case"
        currentStatus="pending_review"
        caseName="Test Case"
        onStatusChange={jest.fn()}
      />
    );

    // Click status button
    const approveButton = getByText('Approved');
    fireEvent.click(approveButton);

    // Check dialog appears
    expect(getByText('Change Case Status')).toBeInTheDocument();

    // Fill notes
    const notesField = getByRole('textbox');
    fireEvent.change(notesField, { target: { value: 'Test notes' } });

    // Submit
    const submitButton = getByText('Change Status');
    fireEvent.click(submitButton);

    // Verify callback called
    expect(onStatusChange).toHaveBeenCalledWith('approved', 'Test notes');
  });
});
```

### Test Timeline Display

```typescript
describe('CaseTimeline', () => {
  it('should display timeline entries', () => {
    const entries: TimelineEntry[] = [
      {
        id: '1',
        type: 'auto',
        category: 'case_created',
        title: 'Case Created',
        description: 'Case was created',
        date: '2025-10-20',
        timestamp: '2025-10-20T10:30:00Z',
        performedBy: 'System',
      },
    ];

    const { getByText } = render(
      <CaseTimeline caseId="test" entries={entries} />
    );

    expect(getByText('Case Created')).toBeInTheDocument();
    expect(getByText('Case was created')).toBeInTheDocument();
  });

  it('should filter timeline by search', () => {
    const entries: TimelineEntry[] = [
      { /* case_created */ },
      { /* status_changed */ },
      { /* court_hearing */ },
    ];

    const { getByPlaceholderText, getByText, queryByText } = render(
      <CaseTimeline caseId="test" entries={entries} />
    );

    const searchInput = getByPlaceholderText('Search entries...');
    fireEvent.change(searchInput, { target: { value: 'court' } });

    expect(getByText('Court Hearing')).toBeInTheDocument();
    expect(queryByText('Status Changed')).not.toBeInTheDocument();
  });
});
```

---

## 📊 Performance Considerations

### Timeline Entry Limits
- Recommended: Up to 100 entries per case
- Large cases: Consider pagination or virtual scrolling
- Archive: Move old entries to archive table after 1 year

### Query Optimization
```typescript
// Good - Ordered and limited
const { data } = await supabase
  .from('case_timeline_entries')
  .select('*')
  .eq('case_id', caseId)
  .order('event_timestamp', { ascending: false })
  .limit(50);

// Avoid - No order or limit
const { data } = await supabase
  .from('case_timeline_entries')
  .select('*')
  .eq('case_id', caseId);
```

### Caching Strategy
```typescript
// Use React Query for caching
import { useQuery } from '@tanstack/react-query';

export const useCaseTimeline = (caseId: string) => {
  return useQuery({
    queryKey: ['caseTimeline', caseId],
    queryFn: () => fetchCaseTimeline(caseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

## 🔒 Security Considerations

### Data Validation
- Always validate `caseId` belongs to user's company
- Sanitize text inputs
- Validate timestamps are realistic

### Permissions
- Check user role before allowing status changes
- Track who made changes for audit trail
- Restrict status transitions by user role

### RLS Policies
```sql
-- Ensure users only see their company's cases
CREATE POLICY "users_see_own_company_cases"
ON case_timeline_entries FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid()
));
```

---

## 🐛 Troubleshooting

### Issue: Status button not showing
- **Cause**: Status not in `allowedNextStatuses` config
- **Fix**: Check `STATUS_CONFIGS` in CaseStatusManager.tsx

### Issue: Timeline not updating
- **Cause**: `caseTimeline` state not being set
- **Fix**: Verify `setCaseTimeline` is called after status change

### Issue: Dialog not opening
- **Cause**: `showTimelineDialog` state not connected
- **Fix**: Check state and `onOpenChange` callback binding

### Issue: Form validation failing
- **Cause**: Required fields empty
- **Fix**: Ensure all required fields have values

---

## 📚 Related Components

- `LegalCaseCreationWizard` - Create new cases
- `AutoCreateCaseTriggersConfig` - Auto-creation settings
- `LegalCasesTracking` - Main page integration
- `EnhancedLegalAIInterface_v2` - AI legal assistant

---

## 🚀 Deployment Checklist

- [x] All components created and tested
- [x] TypeScript compilation successful
- [x] Components properly exported
- [x] Integration completed and tested
- [x] Database schema created (if using)
- [x] RLS policies configured (if using)
- [x] Error handling implemented
- [x] Loading states implemented
- [x] User guide created
- [x] Documentation complete

---

**Status**: ✅ Production Ready
**Last Updated**: October 26, 2025
