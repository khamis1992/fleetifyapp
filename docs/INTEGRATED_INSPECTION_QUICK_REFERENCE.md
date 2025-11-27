# 🚀 Integrated Check-In/Check-Out - Quick Reference Card

One-page reference for developers implementing the integrated inspection system.

---

## 📦 Import Statements

```typescript
// Main Components
import { IntegratedVehicleInspection } from '@/components/vehicles';
import { 
  InspectionReminder, 
  InspectionStatusBadge,
  PendingInspectionsList 
} from '@/components/contracts/InspectionReminders';

// Hooks
import { useVehicleInspections, useInspectionComparison } from '@/hooks/useVehicleInspections';
import { useCreateInspection } from '@/hooks/useCreateInspection';

// Types
import type { VehicleInspection, DamageRecord } from '@/hooks/useVehicleInspections';
```

---

## 🎯 Common Use Cases

### 1. Add Check-In Dialog to Page

```typescript
const [showCheckIn, setShowCheckIn] = useState(false);

// Button
<Button onClick={() => setShowCheckIn(true)}>
  استلام المركبة
</Button>

// Dialog
<Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <IntegratedVehicleInspection
      contractId={contract.id}
      vehicleId={contract.vehicle_id}
      type="check_in"
      onComplete={() => {
        setShowCheckIn(false);
        toast.success('تم توثيق الاستلام');
      }}
    />
  </DialogContent>
</Dialog>
```

### 2. Add Automatic Reminder

```typescript
<InspectionReminder
  contract={contract}
  vehicle={contract.vehicle}
  onCheckInComplete={() => refetchContract()}
  onCheckOutComplete={() => closeContract()}
  persistent={true}
/>
```

### 3. Show Status Badge

```typescript
// Full badges
<InspectionStatusBadge contractId={contract.id} />

// Compact (for tables)
<InspectionStatusBadge contractId={contract.id} compact={true} />
```

### 4. Pending Inspections Widget

```typescript
const { data: contracts } = useContracts();

<PendingInspectionsList contracts={contracts || []} />
```

### 5. Block Action Without Check-In

```typescript
const { data: inspections } = useVehicleInspections({ contractId });
const hasCheckIn = inspections?.some(i => i.inspection_type === 'check_in');

const handleActivate = () => {
  if (!hasCheckIn) {
    toast.error('يجب إجراء فحص الاستلام أولاً');
    setShowCheckInDialog(true);
    return;
  }
  // Proceed with activation
};
```

---

## 📋 Props Reference

### IntegratedVehicleInspection

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `contractId` | string | - | ✅ |
| `vehicleId` | string | - | ✅ |
| `type` | 'check_in' \| 'check_out' | - | ✅ |
| `vehicle` | Object | undefined | ❌ |
| `contract` | Object | undefined | ❌ |
| `onComplete` | () => void | undefined | ❌ |
| `onCancel` | () => void | undefined | ❌ |
| `isReminder` | boolean | false | ❌ |

**Vehicle Object**:
```typescript
{
  plate_number: string;
  make: string;
  model: string;
  year?: number;
}
```

**Contract Object**:
```typescript
{
  contract_number: string;
  start_date: string;
  end_date: string;
  customer_name?: string;
}
```

### InspectionReminder

| Prop | Type | Required |
|------|------|----------|
| `contract` | Object | ✅ |
| `vehicle` | Object | ❌ |
| `onCheckInComplete` | () => void | ❌ |
| `onCheckOutComplete` | () => void | ❌ |
| `persistent` | boolean | ❌ |

**Contract Object** (required fields):
```typescript
{
  id: string;
  contract_number: string;
  vehicle_id: string;
  status: string;
  start_date: string;
  end_date: string;
  customer_name?: string;
}
```

---

## 🔧 Hooks Usage

### Fetch Inspections

```typescript
// All inspections for contract
const { data: inspections } = useVehicleInspections({ 
  contractId: 'xxx' 
});

// Only check-in
const { data: checkIns } = useVehicleInspections({ 
  contractId: 'xxx',
  inspectionType: 'check_in'
});

// Only check-out
const { data: checkOuts } = useVehicleInspections({ 
  contractId: 'xxx',
  inspectionType: 'check_out'
});

// By vehicle
const { data: vehicleInspections } = useVehicleInspections({ 
  vehicleId: 'yyy' 
});
```

### Get Comparison Data

```typescript
const { data: comparison } = useInspectionComparison(contractId);

if (comparison) {
  console.log('Fuel diff:', comparison.differences.fuel);
  console.log('Odometer diff:', comparison.differences.odometer);
  console.log('New damages:', comparison.newDamages);
}
```

### Create Inspection

```typescript
const createInspection = useCreateInspection();

await createInspection.mutateAsync({
  contract_id: contractId,
  vehicle_id: vehicleId,
  inspection_type: 'check_in',
  fuel_level: 100,
  odometer_reading: 50000,
  cleanliness_rating: 5,
  exterior_condition: [],
  interior_condition: [],
  notes: 'All good',
  customer_signature: 'base64...',
  photos: [file1, file2], // File[] array
});
```

---

## 🎨 Component States

### IntegratedVehicleInspection States

```typescript
// Loading
createInspection.isPending === true

// Error
createInspection.isError === true
createInspection.error.message

// Success
createInspection.isSuccess === true
```

### Validation States

```typescript
// Required fields
const isValid = 
  customerSignature !== null &&
  odometerReading > 0 &&
  photos.length > 0;

// Submit button
<Button disabled={!isValid || createInspection.isPending}>
  {createInspection.isPending ? 'جاري الحفظ...' : 'تأكيد الاستلام'}
</Button>
```

---

## 🔔 Notification Examples

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('تم توثيق استلام المركبة بنجاح');

// Error
toast.error('يرجى إضافة صورة واحدة على الأقل');

// Warning
toast.warning('يرجى إجراء فحص استلام المركبة');

// With action
toast.warning('يرجى إجراء فحص استلام المركبة', {
  description: 'العقد نشط ولكن لم يتم فحص الاستلام',
  action: {
    label: 'فحص الآن',
    onClick: () => setShowCheckInDialog(true),
  },
  duration: 10000,
});
```

---

## 📊 Data Structures

### VehicleInspection

```typescript
interface VehicleInspection {
  id: string;
  company_id: string;
  contract_id: string;
  vehicle_id: string;
  inspection_type: 'check_in' | 'check_out';
  inspected_by: string | null;
  inspection_date: string;
  
  // Measurements
  fuel_level: number | null;           // 0-100
  odometer_reading: number | null;      // km
  cleanliness_rating: number | null;    // 1-5
  
  // Condition
  exterior_condition: DamageRecord[];
  interior_condition: DamageRecord[];
  
  // Evidence
  photo_urls: string[];
  notes: string | null;
  customer_signature: string | null;   // Base64 PNG
  
  created_at: string;
}
```

### DamageRecord

```typescript
interface DamageRecord {
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}
```

### InspectionComparison

```typescript
interface InspectionComparison {
  checkIn: VehicleInspection;
  checkOut: VehicleInspection;
  differences: {
    fuel: number;        // Positive = increase, Negative = decrease
    odometer: number;    // Distance traveled in km
    cleanliness: number; // Stars difference
  };
  newDamages: DamageRecord[];
  hasNewDamages: boolean;
}
```

---

## 🎯 Conditional Rendering

### Show Different UI Based on Inspection Status

```typescript
const { data: inspections } = useVehicleInspections({ contractId });
const hasCheckIn = inspections?.some(i => i.inspection_type === 'check_in');
const hasCheckOut = inspections?.some(i => i.inspection_type === 'check_out');

// Render logic
{!hasCheckIn && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>يجب إجراء فحص الاستلام</AlertDescription>
  </Alert>
)}

{hasCheckIn && !hasCheckOut && isEnding && (
  <Alert>
    <Clock className="h-4 w-4" />
    <AlertDescription>يرجى إجراء فحص التسليم قريباً</AlertDescription>
  </Alert>
)}

{hasCheckIn && hasCheckOut && (
  <Badge variant="success">
    <CheckCircle className="h-3 w-3 ml-1" />
    اكتملت الفحوصات
  </Badge>
)}
```

---

## 🔍 Querying Patterns

### Check if Inspection Exists

```typescript
const { data: inspections } = useVehicleInspections({ contractId });
const hasCheckIn = inspections?.some(i => i.inspection_type === 'check_in');
```

### Get Latest Inspection

```typescript
const { data: inspections } = useVehicleInspections({ 
  contractId,
  inspectionType: 'check_in'
});
const latestCheckIn = inspections?.[0]; // Already sorted by date desc
```

### Count Inspections

```typescript
const { data: inspections } = useVehicleInspections({ vehicleId });
const checkInCount = inspections?.filter(i => i.inspection_type === 'check_in').length;
const checkOutCount = inspections?.filter(i => i.inspection_type === 'check_out').length;
```

---

## 📱 Responsive Patterns

### Mobile-Specific Rendering

```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';

const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Sheet open={show} onOpenChange={setShow}>
    <SheetContent side="bottom" className="h-[90vh]">
      <IntegratedVehicleInspection {...props} />
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={show} onOpenChange={setShow}>
    <DialogContent className="max-w-6xl">
      <IntegratedVehicleInspection {...props} />
    </DialogContent>
  </Dialog>
)}
```

---

## ⚡ Performance Tips

### Memoize Expensive Calculations

```typescript
const comparison = useMemo(() => {
  if (!checkIn || !checkOut) return null;
  
  return {
    fuelDiff: checkOut.fuel_level - checkIn.fuel_level,
    odometerDiff: checkOut.odometer_reading - checkIn.odometer_reading,
    // ... more calculations
  };
}, [checkIn, checkOut]);
```

### Lazy Load Components

```typescript
const IntegratedVehicleInspection = lazy(() => 
  import('@/components/vehicles/IntegratedVehicleInspection')
);

<Suspense fallback={<LoadingSpinner />}>
  <IntegratedVehicleInspection {...props} />
</Suspense>
```

### Debounce Search/Filter

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search, 300);

// Use debouncedSearch for filtering
```

---

## 🐛 Error Handling

### Try-Catch Pattern

```typescript
const handleSubmit = async () => {
  try {
    await createInspection.mutateAsync({...});
    toast.success('تم الحفظ بنجاح');
    onComplete?.();
  } catch (error) {
    console.error('Error creating inspection:', error);
    toast.error('حدث خطأ أثناء الحفظ');
  }
};
```

### Validation Before Submit

```typescript
const validate = () => {
  if (!customerSignature) {
    toast.error('يرجى إضافة توقيع العميل');
    return false;
  }
  
  if (odometerReading <= 0) {
    toast.error('يرجى إدخال قراءة العداد');
    return false;
  }
  
  if (photos.length === 0) {
    toast.error('يرجى إضافة صورة واحدة على الأقل');
    return false;
  }
  
  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;
  // Proceed with submission
};
```

---

## 🔐 Security Checklist

- ✅ All database queries filtered by `company_id`
- ✅ RLS policies enforce company isolation
- ✅ Storage paths include company ID
- ✅ Authenticated users only
- ✅ Customer signature is base64 encoded
- ✅ Photo URLs are public but hard to guess
- ✅ No sensitive data in URLs

---

## 📚 Documentation Links

- **Full Guide**: [INTEGRATED_INSPECTION_GUIDE.md](./INTEGRATED_INSPECTION_GUIDE.md)
- **Integration**: [INTEGRATED_INSPECTION_INTEGRATION_EXAMPLE.md](./INTEGRATED_INSPECTION_INTEGRATION_EXAMPLE.md)
- **Workflow**: [INTEGRATED_INSPECTION_WORKFLOW.md](./INTEGRATED_INSPECTION_WORKFLOW.md)
- **Summary**: [INTEGRATED_INSPECTION_SUMMARY.md](./INTEGRATED_INSPECTION_SUMMARY.md)

---

## 🚀 Quick Start (5 minutes)

1. **Import component**:
   ```typescript
   import { IntegratedVehicleInspection } from '@/components/vehicles';
   ```

2. **Add to page**:
   ```typescript
   <Dialog open={show} onOpenChange={setShow}>
     <DialogContent className="max-w-6xl">
       <IntegratedVehicleInspection
         contractId={contract.id}
         vehicleId={contract.vehicle_id}
         type="check_in"
         onComplete={() => setShow(false)}
       />
     </DialogContent>
   </Dialog>
   ```

3. **Test**:
   - Open dialog
   - Fill all fields
   - Capture photos
   - Sign
   - Submit

**Done!** ✅

---

*Version: 1.0.0 | Last Updated: 2025-10-26*
