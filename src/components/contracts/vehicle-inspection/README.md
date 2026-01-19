# Vehicle Marking System - Free-Form Inspection

## Overview

The new **VehicleMarking** component provides a simple, intuitive free-form marking system for vehicle inspections. Users can click anywhere on a vehicle image to add marks indicating damage, scratches, or other issues.

## Key Features

- **Click-to-mark**: Simply click anywhere on the vehicle image to place a mark
- **Flexible input**: Optional condition type, severity, and photo upload
- **Required description**: Each mark must have a description of the issue
- **Responsive positioning**: Marks use percentage-based positioning for consistent display across screen sizes
- **Edit & delete**: Full CRUD operations on marks
- **Photo support**: Upload multiple photos per mark
- **Color-coded**: Marks are colored by condition type for quick visual reference

## Components

### VehicleMarking

Main component that displays the vehicle image and handles mark placement.

**Props:**
```typescript
interface VehicleMarkingProps {
  vehicleImage: string;        // Path to vehicle image
  marks: VehicleMark[];        // Array of existing marks
  onMarkAdd: (mark) => void;   // Callback when mark is added
  onMarkDelete: (id) => void;  // Callback when mark is deleted
  onMarkClick?: (mark) => void;// Optional callback for view mode
  mode?: 'add' | 'view';       // Interaction mode
  contractId?: string;         // For photo upload path
  className?: string;          // Additional CSS classes
}
```

**Usage:**
```tsx
<VehicleMarking
  vehicleImage="/images/vehicles/sedan-top-view.png"
  marks={marks}
  onMarkAdd={handleAddMark}
  onMarkDelete={handleDeleteMark}
  mode="add"
  contractId="contract-123"
/>
```

### MarkDialog

Dialog component for adding/editing mark details.

**Features:**
- Required description field
- Optional condition selection (scratch, dent, crack, broken, missing)
- Optional severity level (minor, moderate, severe)
- Optional photo upload
- Edit existing marks
- Delete marks

## Data Structure

```typescript
interface VehicleMark {
  id: string;                  // Unique identifier
  x: number;                   // X position (0-100%)
  y: number;                   // Y position (0-100%)
  description: string;         // Required description of issue
  condition?: ZoneCondition;   // Optional: scratch, dent, crack, broken, missing
  severity?: ZoneSeverity;     // Optional: minor, moderate, severe
  photo_urls: string[];        // Array of photo URLs
  created_at: string;          // ISO timestamp
  created_by: string;          // User ID who created the mark
}
```

## Color Scheme

Marks are color-coded by condition:
- **Scratch** (⚠): Yellow/Amber (#f59e0b)
- **Dent** (◐): Orange (#f97316)
- **Crack** (✕): Red (#ef4444)
- **Broken** (✖): Dark Red (#b91c1c)
- **Missing** (○): Gray (#6b7280)

## Integration Example

### Step 1: Add State

```tsx
const [vehicleMarks, setVehicleMarks] = useState<VehicleMark[]>([]);
```

### Step 2: Add Handlers

```tsx
const handleAddMark = (mark: Omit<VehicleMark, 'id' | 'created_at' | 'created_by'>) => {
  const { data: { user } } = await supabase.auth.getUser();

  const newMark: VehicleMark = {
    ...mark,
    id: Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString(),
    created_by: user?.id || '',
  };

  setVehicleMarks(prev => [...prev, newMark]);
};

const handleDeleteMark = (markId: string) => {
  setVehicleMarks(prev => prev.filter(m => m.id !== markId));
};
```

### Step 3: Render Component

```tsx
<VehicleMarking
  vehicleImage="/images/vehicles/sedan-top-view.png"
  marks={vehicleMarks}
  onMarkAdd={handleAddMark}
  onMarkDelete={handleDeleteMark}
  mode="add"
  contractId={contract.id}
/>
```

### Step 4: Save to Database

```tsx
// When submitting the form:
const { data: returnRecord } = await supabase
  .from('vehicle_inspections')
  .insert({
    // ... other fields
    visual_inspection_marks: vehicleMarks,
  });
```

## Migration from Zone-Based System

To migrate from the old zone-based system to the new free-form marking system:

### Remove These States:
- `vehicleType`
- `visualZones`
- `selectedZone`
- `isZoneDialogOpen`

### Remove These Handlers:
- `handleZoneClick`
- `handleZoneSave`
- `handleZoneDelete`

### Remove These Components:
- `<VisualVehicleDiagram />`
- `<VehicleConditionDialog />`

### Replace With:
```tsx
<VehicleMarking
  vehicleImage="/images/vehicles/sedan-top-view.png"
  marks={vehicleMarks}
  onMarkAdd={handleAddMark}
  onMarkDelete={handleDeleteMark}
  mode="add"
  contractId={contract.id}
/>
```

### Update Database Field:
Change `visual_inspection_zones` to `visual_inspection_marks` in your database schema and submission code.

## User Flow

1. **View vehicle image** - Clean vehicle diagram with no numbers or zones
2. **Click anywhere** - User clicks on the vehicle where there's damage
3. **Fill dialog** - Dialog opens with:
   - Description (required)
   - Condition type (optional)
   - Severity level (optional)
   - Photo upload (optional)
4. **Save mark** - Mark appears as colored dot on vehicle
5. **View list** - All marks shown in expandable list below image
6. **Edit/delete** - Click on mark or list item to edit or delete

## Accessibility

- Keyboard accessible mark selection
- ARIA labels on all interactive elements
- High contrast colors for marks
- Clear visual feedback for hover/focus states
- RTL support for Arabic interface

## Performance Considerations

- Marks use percentage-based positioning for responsive design
- Photo upload is asynchronous with progress feedback
- List is virtualized for large numbers of marks
- Animations use GPU-accelerated transforms

## Future Enhancements

Possible improvements for future versions:
- Draw custom shapes/polygons instead of just dots
- Add measurement tools (distance, area)
- Support for 360-degree vehicle views
- PDF export with marks overlay
- Mark templates for common damage types
- AI-powered damage detection suggestions

## Testing Checklist

- [ ] Add mark on different screen sizes
- [ ] Edit existing mark
- [ ] Delete mark
- [ ] Upload multiple photos
- [ ] Remove photo from mark
- [ ] Save with required field only (description)
- [ ] Save with all optional fields
- [ ] Try to save without description (should show error)
- [ ] Verify mark positioning is responsive
- [ ] Test in RTL mode (Arabic)
- [ ] Test keyboard navigation
- [ ] Verify color coding for each condition type
