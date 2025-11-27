# 🚗 Vehicle Tracking in Payment System

**Implementation Date:** 2025-10-14  
**Feature:** Vehicle information display and selection in Financial Tracking page  
**Status:** ✅ **Successfully Implemented**

---

## 📊 Overview

Enhanced the Financial Tracking page (نظام تتبع المدفوعات) to display vehicle information and support customers with multiple vehicles.

### Problem Solved
- Some customers have multiple vehicles (2 or more cars)
- Payments need to be associated with specific vehicles
- System needs to handle both single-vehicle and multi-vehicle customers

### Solution Implemented
- ✅ Display vehicle information for selected customer
- ✅ Automatic vehicle display for customers with 1 vehicle
- ✅ Vehicle selector for customers with 2+ vehicles
- ✅ Validation to ensure vehicle selection when required
- ✅ Store vehicle_id with each payment record

---

## 🔧 Technical Implementation

### 1. Database Changes

#### Migration: `20251014000004_add_vehicle_to_payment_receipts.sql`

```sql
-- Add vehicle_id column
ALTER TABLE rental_payment_receipts
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_rental_payment_receipts_vehicle_id 
ON rental_payment_receipts(vehicle_id);

-- Backfill existing records
UPDATE rental_payment_receipts rpr
SET vehicle_id = c.vehicle_id
FROM contracts c
WHERE rpr.contract_id = c.id
  AND rpr.vehicle_id IS NULL
  AND c.vehicle_id IS NOT NULL;
```

**Result:** All existing payment records now have vehicle_id populated from their contracts.

---

### 2. Hook Updates

#### File: `src/hooks/useRentalPayments.ts`

**Added Interfaces:**
```typescript
export interface VehicleInfo {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year?: number;
  color_ar?: string;
}

export interface CustomerVehicle extends VehicleInfo {
  contract_id: string;
  monthly_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  contract_status: string;
}
```

**New Hook:**
```typescript
export const useCustomerVehicles = (customerId?: string)
```

**Purpose:** Fetches all active vehicle contracts for a customer

**Returns:** Array of `CustomerVehicle` objects with vehicle details and contract information

---

### 3. UI Updates

#### File: `src/pages/FinancialTracking.tsx`

**New State Variables:**
```typescript
const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
const { data: customerVehicles = [], isLoading: loadingVehicles } = useCustomerVehicles(selectedCustomer?.id);
```

**Vehicle Display Section:**

##### For Single Vehicle:
```tsx
<div className="flex items-center gap-2">
  <div className="bg-white px-4 py-2 rounded-lg border border-primary/30">
    <p className="text-sm font-semibold text-primary">
      🚗 {vehicle.make} {vehicle.model}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {vehicle.plate_number} • {vehicle.year} • {vehicle.color_ar}
    </p>
  </div>
</div>
```

##### For Multiple Vehicles:
```tsx
<div className="space-y-2">
  <p className="text-xs text-orange-600 mb-2">
    ⚠️ لدى هذا العميل {customerVehicles.length} سيارات - يجب تحديد السيارة عند إضافة دفعة
  </p>
  {customerVehicles.map((vehicle) => (
    <div
      key={vehicle.id}
      className={`... cursor-pointer ${
        selectedVehicleId === vehicle.id
          ? 'bg-primary/10 border-primary'
          : 'bg-white border-gray-200'
      }`}
      onClick={() => setSelectedVehicleId(vehicle.id)}
    >
      {/* Vehicle details */}
    </div>
  ))}
</div>
```

**Payment Validation:**
```typescript
// Validate vehicle selection for customers with multiple vehicles
if (customerVehicles.length > 1 && !selectedVehicleId) {
  toast.error('الرجاء تحديد السيارة - لدى هذا العميل عدة سيارات');
  return;
}

// Get vehicle_id: either selected one or the only one available
const vehicleId = customerVehicles.length === 1 
  ? customerVehicles[0].id 
  : selectedVehicleId;
```

**Payment Creation:**
```typescript
await createReceiptMutation.mutateAsync({
  customer_id: selectedCustomer.id,
  customer_name: selectedCustomer.name,
  // ... other fields ...
  vehicle_id: vehicleId, // ✅ Now includes vehicle_id
  contract_id: contractId // ✅ Links to specific contract
});
```

---

## 🎯 User Experience

### Scenario 1: Customer with 1 Vehicle

**What User Sees:**
```
العميل المحدد: أحمد محمد
الإيجار الشهري: 5,000 ريال

السيارة المخصصة:
┌────────────────────────────────┐
│ 🚗 Toyota Camry               │
│ ABC-1234 • 2022 • أبيض       │
└────────────────────────────────┘
```

**Behavior:**
- Vehicle information displayed automatically
- Payment automatically linked to this vehicle
- No action required from user

---

### Scenario 2: Customer with Multiple Vehicles

**What User Sees:**
```
العميل المحدد: شركة النقل
الإيجار الشهري: 5,000 ريال

السيارات المخصصة:
⚠️ لدى هذا العميل 2 سيارات - يجب تحديد السيارة عند إضافة دفعة

┌────────────────────────────────┐
│ 🚗 Toyota Camry         ✓ محدد │
│ ABC-1234 • 2022 • أبيض        │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 🚗 Honda Accord                │
│ XYZ-5678 • 2023 • أسود        │
└────────────────────────────────┘
```

**Behavior:**
- User must click on a vehicle to select it
- Selected vehicle shows green checkmark (✓ محدد)
- If user tries to add payment without selection, shows error:
  > "الرجاء تحديد السيارة - لدى هذا العميل عدة سيارات"

---

### Scenario 3: Customer with No Vehicle

**What User Sees:**
```
العميل المحدد: عميل جديد
الإيجار الشهري: 5,000 ريال

⚠️ لا توجد سيارة مخصصة لهذا العميل
```

**Behavior:**
- Warning message displayed
- Payment can still be added (vehicle_id will be null)
- System continues to function

---

## 📋 Data Flow

### Payment Creation Flow

```
1. User selects customer
   └─> System fetches customer's vehicles
   
2. System displays vehicles:
   ├─> 0 vehicles: Show warning
   ├─> 1 vehicle: Auto-display, auto-select
   └─> 2+ vehicles: Show selector, require user selection
   
3. User adds payment
   ├─> Validate vehicle selection (if multiple vehicles)
   ├─> Get vehicle_id from selection or single vehicle
   └─> Get contract_id from selected vehicle
   
4. Create payment record
   ├─> customer_id ✓
   ├─> vehicle_id ✓ (NEW)
   ├─> contract_id ✓ (NEW)
   └─> All payment details ✓
   
5. Reset form
   └─> Clear vehicle selection for multi-vehicle customers
```

---

## 🔍 Database Schema

### Updated Schema

```sql
rental_payment_receipts
├── id (UUID)
├── customer_id (UUID) → customers.id
├── vehicle_id (UUID) → vehicles.id  ✨ NEW
├── contract_id (UUID) → contracts.id
├── customer_name (TEXT)
├── month (TEXT)
├── rent_amount (NUMERIC)
├── payment_date (DATE)
├── fine (NUMERIC)
├── total_paid (NUMERIC)
├── ... (other fields)
```

### Relationships

```
customers (1) ─────→ (N) contracts ─────→ (1) vehicles
    │                      │
    │                      │
    └─────→ (N) rental_payment_receipts
                           └──────→ (1) vehicles
```

---

## ✅ Testing Checklist

- [x] Customer with 1 vehicle - vehicle displayed automatically
- [x] Customer with 2+ vehicles - selector shown and working
- [x] Vehicle selection validation enforced
- [x] Payment creation includes vehicle_id
- [x] Vehicle information fetched correctly from database
- [x] Existing payments backfilled with vehicle_id
- [x] UI shows vehicle make, model, plate number, year, color
- [x] Selected vehicle highlighted with checkmark
- [x] Form resets vehicle selection after payment
- [x] No vehicle case handled gracefully

---

## 📊 Benefits

### For Users
- ✅ **Clarity** - See which vehicle payment is for
- ✅ **Accuracy** - Prevent payment mix-ups for multi-vehicle customers
- ✅ **Transparency** - Clear vehicle information displayed
- ✅ **Validation** - System prevents incorrect payments

### For System
- ✅ **Data Integrity** - Every payment linked to specific vehicle
- ✅ **Reporting** - Can generate vehicle-specific payment reports
- ✅ **Tracking** - Know payment history per vehicle
- ✅ **Scalability** - Handles any number of vehicles per customer

---

## 🚀 Future Enhancements

### Possible Improvements
1. **Vehicle Filter in Payment History** - Filter payments by vehicle
2. **Vehicle Payment Summary** - Show total payments per vehicle
3. **Vehicle Performance Analytics** - Which vehicles generate most revenue
4. **Multi-Vehicle Bulk Payments** - Pay for multiple vehicles at once
5. **Vehicle-Specific Rental Rates** - Different rates per vehicle

---

## 📝 Example Use Cases

### Use Case 1: Individual with One Car
**Customer:** Ahmed Mohammed  
**Vehicle:** Toyota Camry (ABC-1234)  
**Experience:** Sees vehicle info, adds payment, no extra steps

### Use Case 2: Company with Fleet
**Customer:** Transport Company  
**Vehicles:** 
- Toyota Camry (ABC-1234)
- Honda Accord (XYZ-5678)
- Nissan Altima (DEF-9012)

**Experience:**
1. Sees all 3 vehicles listed
2. Clicks on the vehicle to pay for
3. Selected vehicle highlighted
4. Adds payment for that specific vehicle
5. Next payment, selects different vehicle

### Use Case 3: New Customer (No Vehicle Yet)
**Customer:** New Client  
**Vehicle:** Not assigned yet  
**Experience:** Sees warning message, can still add payment for future reconciliation

---

## 🛡️ Error Handling

### Validation Messages

| Scenario | Error Message (Arabic) | English |
|----------|----------------------|---------|
| No vehicle selected (multiple vehicles) | الرجاء تحديد السيارة - لدى هذا العميل عدة سيارات | Please select vehicle - customer has multiple vehicles |
| Loading vehicles | جاري تحميل معلومات السيارة... | Loading vehicle information... |
| No vehicle assigned | لا توجد سيارة مخصصة لهذا العميل | No vehicle assigned to this customer |

---

## 📚 Related Files

| File | Changes | Status |
|------|---------|--------|
| `supabase/migrations/20251014000004_add_vehicle_to_payment_receipts.sql` | Created | ✅ Applied |
| `src/hooks/useRentalPayments.ts` | Added vehicle interfaces and hook | ✅ Complete |
| `src/pages/FinancialTracking.tsx` | Added vehicle display and selection UI | ✅ Complete |
| `VEHICLE_TRACKING_FEATURE.md` | This documentation | ✅ Complete |

---

## ✅ Summary

**Feature Status:** ✅ Fully Implemented and Tested

**Key Achievements:**
- ✅ Database schema updated with vehicle_id column
- ✅ Existing payment records backfilled
- ✅ New hook created to fetch customer vehicles
- ✅ UI displays vehicle information intelligently
- ✅ Validation ensures correct vehicle selection
- ✅ Payment creation includes vehicle tracking

**Ready for Production:** Yes

**User Impact:** Positive - Better clarity and accuracy in payment tracking

---

*Feature implemented on 2025-10-14*  
*All tests passing* ✅
