# Redesigned Journal Entry Card Component

## Overview

The `RedesignedJournalEntryCard` component is a modern, visually appealing implementation of the journal entry display that follows the new design specification provided in the task. It replaces the previous complex implementation with a clean, collapsible card design that enhances user experience.

## Features

1. **Modern Card Design**: Clean, shadowed cards with smooth hover effects
2. **Collapsible Details**: Click on the header to expand/collapse entry details
3. **Responsive Layout**: Works well on both desktop and mobile devices
4. **Status Badges**: Color-coded status indicators (مرحل, مسودة, ملغى)
5. **Currency Formatting**: Proper formatting of amounts with the company's currency
6. **Bilingual Support**: Full Arabic/English support with RTL layout
7. **Detailed Entry View**: Expandable table view showing all journal entry lines

## Component Structure

### Props

```typescript
interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
  updated_at: string;
  journal_entry_lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  line_description?: string | null;
  line_number: number;
  account_id: string;
  journal_entry_id: string;
  cost_center_id?: string | null;
  created_at: string;
  updated_at: string;
  chart_of_accounts?: {
    id: string;
    company_id: string;
    account_code: string;
    account_name: string;
    account_name_ar?: string | null;
    account_type: string;
    account_level: number;
    parent_account_id?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

interface RedesignedJournalEntryCardProps {
  entry: JournalEntry;
}
```

### Usage

```tsx
import { RedesignedJournalEntryCard } from '@/components/finance/RedesignedJournalEntryCard';

// In your component
{journalEntries?.map((entry) => (
  <RedesignedJournalEntryCard key={entry.id} entry={entry} />
))}
```

## Design Elements

### Color Scheme
- **Primary**: Indigo (#6366f1) for headers and interactive elements
- **Status Colors**:
  - Posted (مرحل): Green background with dark green text
  - Draft (مسودة): Yellow background with dark yellow text
  - Cancelled (ملغي): Blue background with dark blue text
- **Amount Colors**:
  - Debit (مدين): Green text (#16a34a)
  - Credit (دائن): Red text (#dc2626)

### Typography
- **Headers**: Bold, larger text for entry numbers
- **Body**: Clean, readable text with appropriate sizing
- **Amounts**: Monospace font for numerical values

### Interactive Elements
- **Expand/Collapse**: Clickable header with chevron icon that rotates
- **Hover Effects**: Cards lift slightly with enhanced shadow on hover
- **Buttons**: Ghost-style buttons for actions with clear visual feedback

## Implementation Details

### State Management
The component uses React's `useState` hook to manage the expanded/collapsed state:

```typescript
const [isExpanded, setIsExpanded] = useState(false);
```

### Event Handling
Clicking on the card header toggles the details view:

```tsx
<div 
  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 cursor-pointer"
  onClick={() => setIsExpanded(!isExpanded)}
>
```

### Conditional Rendering
The details section is only rendered when `isExpanded` is true:

```tsx
{isExpanded && (
  <div className="p-5 bg-gray-50 rounded-b-xl">
    {/* Details content */}
  </div>
)}
```

## Integration with Fleetify System

### Currency Formatting
The component uses the existing `useCurrencyFormatter` hook to ensure consistency with the rest of the system:

```typescript
const { formatCurrency } = useCurrencyFormatter();
```

### Data Structure Compatibility
The component is designed to work with the existing journal entry data structure from the Supabase database, handling nullable fields appropriately.

### Styling
The component uses Tailwind CSS classes that follow the existing design system, ensuring visual consistency with other components in the application.

## Testing

The component includes comprehensive unit tests covering:
1. Initial rendering of summary information
2. Expand/collapse functionality
3. Display of detailed entry lines
4. Proper formatting of amounts and dates
5. Status badge rendering

## Demo Page

A demo page is available at `/finance/journal-entries-demo` that showcases the component with sample data.

## Future Enhancements

1. **Animation**: Add smooth animations for expand/collapse transitions
2. **Keyboard Navigation**: Improve accessibility with keyboard support
3. **Printing**: Add print-specific styles for journal entries
4. **Export Options**: Integrate with existing export functionality