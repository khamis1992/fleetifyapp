# 🔧 Integration Example: Adding Integrated Inspection to Contract Pages

This guide shows **step-by-step** how to integrate the new Integrated Vehicle Inspection system into your existing contract pages.

---

## 📍 Integration Points

1. **Contract Details Page** - Main location
2. **Contract List Page** - Status badges
3. **Dashboard** - Pending inspections widget
4. **Contract Activation** - Mandatory check-in

---

## 1️⃣ Contract Details Page Integration

### File: `src/pages/ContractDetails.tsx` or similar

```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, FileText } from 'lucide-react';

// NEW IMPORTS
import { IntegratedVehicleInspection } from '@/components/vehicles';
import { 
  InspectionReminder, 
  InspectionStatusBadge 
} from '@/components/contracts/InspectionReminders';

export function ContractDetailsPage() {
  const { contractId } = useParams();
  const { data: contract } = useContract(contractId);
  
  // NEW STATE
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* NEW: Automatic Reminder */}
      <InspectionReminder
        contract={contract}
        vehicle={contract.vehicle}
        onCheckInComplete={() => {
          // Refresh contract data
          queryClient.invalidateQueries(['contracts', contractId]);
        }}
        onCheckOutComplete={() => {
          // Refresh and maybe close contract
          queryClient.invalidateQueries(['contracts', contractId]);
        }}
        persistent={true}
      />

      {/* Contract Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>عقد رقم: {contract.contract_number}</CardTitle>
            {/* NEW: Inspection Status Badges */}
            <InspectionStatusBadge contractId={contractId} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing contract details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">العميل</p>
              <p className="font-medium">{contract.customer?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المركبة</p>
              <p className="font-medium">{contract.vehicle?.plate_number}</p>
            </div>
            {/* ... more fields ... */}
          </div>
        </CardContent>
      </Card>

      {/* Tabs with NEW Inspection Tabs */}
      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="payments">الدفعات</TabsTrigger>
          {/* NEW TABS */}
          <TabsTrigger value="check-in">
            <ClipboardCheck className="h-4 w-4 ml-2" />
            استلام المركبة
          </TabsTrigger>
          <TabsTrigger value="check-out">
            <ClipboardCheck className="h-4 w-4 ml-2" />
            تسليم المركبة
          </TabsTrigger>
        </TabsList>

        {/* Existing Tabs */}
        <TabsContent value="details">
          {/* Your existing contract details */}
        </TabsContent>

        <TabsContent value="payments">
          {/* Your existing payments list */}
        </TabsContent>

        {/* NEW: Check-In Tab */}
        <TabsContent value="check-in">
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={() => setShowCheckIn(true)}
                size="lg"
                className="w-full"
              >
                <ClipboardCheck className="h-5 w-5 ml-2" />
                بدء فحص الاستلام
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NEW: Check-Out Tab */}
        <TabsContent value="check-out">
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={() => setShowCheckOut(true)}
                size="lg"
                className="w-full"
              >
                <ClipboardCheck className="h-5 w-5 ml-2" />
                بدء فحص التسليم
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NEW: Check-In Dialog */}
      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <IntegratedVehicleInspection
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_in"
            vehicle={{
              plate_number: contract.vehicle?.plate_number,
              make: contract.vehicle?.make,
              model: contract.vehicle?.model,
              year: contract.vehicle?.year,
            }}
            contract={{
              contract_number: contract.contract_number,
              start_date: contract.start_date,
              end_date: contract.end_date,
              customer_name: contract.customer?.full_name,
            }}
            onComplete={() => {
              setShowCheckIn(false);
              toast.success('تم توثيق استلام المركبة بنجاح');
              queryClient.invalidateQueries(['contracts', contractId]);
            }}
            onCancel={() => setShowCheckIn(false)}
          />
        </DialogContent>
      </Dialog>

      {/* NEW: Check-Out Dialog */}
      <Dialog open={showCheckOut} onOpenChange={setShowCheckOut}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <IntegratedVehicleInspection
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_out"
            vehicle={{
              plate_number: contract.vehicle?.plate_number,
              make: contract.vehicle?.make,
              model: contract.vehicle?.model,
              year: contract.vehicle?.year,
            }}
            contract={{
              contract_number: contract.contract_number,
              start_date: contract.start_date,
              end_date: contract.end_date,
              customer_name: contract.customer?.full_name,
            }}
            onComplete={() => {
              setShowCheckOut(false);
              toast.success('تم توثيق تسليم المركبة بنجاح');
              queryClient.invalidateQueries(['contracts', contractId]);
            }}
            onCancel={() => setShowCheckOut(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 2️⃣ Contract List Page Integration

### File: `src/pages/Contracts.tsx` or similar

```typescript
import { InspectionStatusBadge } from '@/components/contracts/InspectionReminders';

export function ContractsListPage() {
  const { data: contracts } = useContracts();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>رقم العقد</TableHead>
          <TableHead>العميل</TableHead>
          <TableHead>المركبة</TableHead>
          <TableHead>الحالة</TableHead>
          {/* NEW COLUMN */}
          <TableHead>الفحوصات</TableHead>
          <TableHead>الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts?.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell>{contract.contract_number}</TableCell>
            <TableCell>{contract.customer?.full_name}</TableCell>
            <TableCell>{contract.vehicle?.plate_number}</TableCell>
            <TableCell>
              <Badge>{contract.status}</Badge>
            </TableCell>
            {/* NEW: Inspection Status */}
            <TableCell>
              <InspectionStatusBadge 
                contractId={contract.id} 
                compact={true}  // Compact view for table
              />
            </TableCell>
            <TableCell>
              {/* Actions */}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 3️⃣ Dashboard Widget Integration

### File: `src/pages/Dashboard.tsx` or similar

```typescript
import { PendingInspectionsList } from '@/components/contracts/InspectionReminders';
import { useContracts } from '@/hooks/useContracts';

export function Dashboard() {
  const { data: contracts } = useContracts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Existing dashboard widgets */}
      <Card>
        <CardHeader>
          <CardTitle>الإحصائيات</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your stats */}
        </CardContent>
      </Card>

      {/* NEW: Pending Inspections Widget */}
      <div className="lg:col-span-2">
        <PendingInspectionsList 
          contracts={contracts || []} 
        />
      </div>
    </div>
  );
}
```

---

## 4️⃣ Contract Activation Integration

### File: Contract activation logic (wherever it's located)

```typescript
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { IntegratedVehicleInspection } from '@/components/vehicles';

function ContractActivationButton({ contract }) {
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const { data: inspections } = useVehicleInspections({ 
    contractId: contract.id 
  });

  const hasCheckIn = inspections?.some(i => i.inspection_type === 'check_in');

  const handleActivate = async () => {
    // Check if check-in exists
    if (!hasCheckIn) {
      toast.error('يجب إجراء فحص استلام المركبة أولاً');
      setShowCheckInDialog(true);
      return;
    }

    // Proceed with activation
    try {
      await updateContract({ 
        id: contract.id, 
        status: 'active' 
      });
      toast.success('تم تفعيل العقد بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تفعيل العقد');
    }
  };

  return (
    <>
      <Button 
        onClick={handleActivate}
        disabled={contract.status === 'active'}
      >
        تفعيل العقد
      </Button>

      {/* Check-In Dialog (if needed) */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent className="max-w-6xl">
          <IntegratedVehicleInspection
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_in"
            vehicle={contract.vehicle}
            contract={contract}
            onComplete={() => {
              setShowCheckInDialog(false);
              // Auto-activate after check-in
              handleActivate();
            }}
            isReminder={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 5️⃣ Contract Actions Menu Integration

### Add to existing actions dropdown

```typescript
import { ClipboardCheck } from 'lucide-react';

function ContractActionsMenu({ contract }) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          الإجراءات
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Existing actions */}
        <DropdownMenuItem onClick={() => viewContract(contract.id)}>
          عرض التفاصيل
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editContract(contract.id)}>
          تعديل
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* NEW: Inspection Actions */}
        <DropdownMenuItem onClick={() => setShowCheckIn(true)}>
          <ClipboardCheck className="h-4 w-4 ml-2" />
          فحص الاستلام
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowCheckOut(true)}>
          <ClipboardCheck className="h-4 w-4 ml-2" />
          فحص التسليم
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Dialogs */}
      {/* ... same as examples above ... */}
    </DropdownMenu>
  );
}
```

---

## 🎨 Styling Tips

### Make Inspection Tabs Stand Out

```typescript
<TabsTrigger 
  value="check-in"
  className="data-[state=active]:bg-green-100"
>
  <ClipboardCheck className="h-4 w-4 ml-2" />
  استلام المركبة
</TabsTrigger>

<TabsTrigger 
  value="check-out"
  className="data-[state=active]:bg-blue-100"
>
  <ClipboardCheck className="h-4 w-4 ml-2" />
  تسليم المركبة
</TabsTrigger>
```

### Highlight Pending Status

```typescript
// In contract card
{!hasCheckIn && contract.status === 'active' && (
  <Badge variant="destructive" className="animate-pulse">
    فحص الاستلام مطلوب
  </Badge>
)}
```

---

## 📱 Mobile Optimization

### Use Bottom Sheet for Mobile

```typescript
import { Sheet, SheetContent } from '@/components/ui/sheet';

// On mobile, use Sheet instead of Dialog
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Sheet open={showCheckIn} onOpenChange={setShowCheckIn}>
    <SheetContent side="bottom" className="h-[90vh]">
      <IntegratedVehicleInspection {...props} />
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
    <DialogContent className="max-w-6xl">
      <IntegratedVehicleInspection {...props} />
    </DialogContent>
  </Dialog>
)}
```

---

## ✅ Testing After Integration

### Checklist

- [ ] Check-in dialog opens from contract details
- [ ] Check-out dialog opens from contract details
- [ ] Reminder appears for active contracts without check-in
- [ ] Reminder appears for ending contracts without check-out
- [ ] Status badges show in contract list
- [ ] Pending inspections widget shows on dashboard
- [ ] Contract activation blocked without check-in
- [ ] Mobile camera works on phone
- [ ] Comparison view shows for check-out
- [ ] All photos upload successfully

---

## 🐛 Common Issues

### Issue: "Cannot find module IntegratedVehicleInspection"

**Solution**: Make sure you're importing from the correct path:
```typescript
import { IntegratedVehicleInspection } from '@/components/vehicles';
// NOT from '@/components/vehicles/IntegratedVehicleInspection'
```

### Issue: Reminder not appearing

**Solution**: Check that:
1. Contract has correct status
2. `persistent={true}` is set
3. No check-in inspection exists (for check-in reminder)
4. Contract is ending soon (for check-out reminder)

### Issue: Dialog too small on desktop

**Solution**: Set proper max width:
```typescript
<DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
```

---

## 📊 Analytics Integration

### Track inspection events

```typescript
import { analytics } from '@/lib/analytics';

function handleInspectionComplete(type: 'check_in' | 'check_out') {
  analytics.track('Inspection Completed', {
    type,
    contractId: contract.id,
    hasPhotos: photos.length > 0,
    hasDamages: damageNotes.length > 0,
  });
}
```

---

## 🎉 You're Done!

After following this guide, your contracts will have:
- ✅ Integrated inspection workflows
- ✅ Automatic reminders
- ✅ Status tracking
- ✅ Mobile photo capture
- ✅ Side-by-side comparisons

**Next Steps**:
1. Test on a staging environment
2. Train users on new workflow
3. Monitor completion rates
4. Gather user feedback

---

*Ready to integrate!* 🚀
