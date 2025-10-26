# Contract Amendment System - Integration Guide

## 🚀 Quick Integration into Contracts Page

### Step 1: Import Components

```typescript
// In src/pages/Contracts.tsx or src/components/contracts/ContractDetailsDialog.tsx
import { ContractAmendmentForm } from '@/components/contracts/ContractAmendmentForm';
import { ContractAmendmentsList } from '@/components/contracts/ContractAmendmentsList';
import { FileEdit } from 'lucide-react';
```

### Step 2: Add State

```typescript
const [showAmendmentForm, setShowAmendmentForm] = useState(false);
const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
```

### Step 3: Add Amendment Button (in Contract Actions)

```typescript
// Add to contract actions dropdown or toolbar
<Button
  onClick={() => {
    setSelectedContract(contract);
    setShowAmendmentForm(true);
  }}
  disabled={contract.status !== 'active'}
  variant="outline"
  size="sm"
>
  <FileEdit className="h-4 w-4 mr-2" />
  تعديل العقد
</Button>

// Add tooltip for disabled state
{contract.status !== 'active' && (
  <p className="text-xs text-muted-foreground mt-1">
    يمكن تعديل العقود النشطة فقط
  </p>
)}
```

### Step 4: Add Amendment Form Dialog

```typescript
{/* Add after contract details dialog */}
{selectedContract && (
  <ContractAmendmentForm
    open={showAmendmentForm}
    onOpenChange={setShowAmendmentForm}
    contract={selectedContract}
    onSuccess={() => {
      // Refresh contracts list
      refetch();
      toast({
        title: '✅ تم إنشاء التعديل',
        description: 'سيتم مراجعته من قبل الإدارة',
      });
    }}
  />
)}
```

### Step 5: Add Amendments Tab (Optional - in Contract Details)

```typescript
<Tabs defaultValue="details" className="w-full">
  <TabsList>
    <TabsTrigger value="details">التفاصيل</TabsTrigger>
    <TabsTrigger value="payments">الدفعات</TabsTrigger>
    <TabsTrigger value="amendments">
      التعديلات
      <Badge variant="secondary" className="mr-2">
        {amendmentsCount}
      </Badge>
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="details">
    {/* Existing details */}
  </TabsContent>
  
  <TabsContent value="payments">
    {/* Existing payments */}
  </TabsContent>
  
  <TabsContent value="amendments">
    <ContractAmendmentsList contractId={contract.id} />
  </TabsContent>
</Tabs>
```

---

## 📊 Complete Example - Contract Details Dialog

```typescript
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileEdit, Edit } from 'lucide-react';
import { ContractAmendmentForm } from '@/components/contracts/ContractAmendmentForm';
import { ContractAmendmentsList } from '@/components/contracts/ContractAmendmentsList';
import type { Contract } from '@/types/contracts';

interface ContractDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onRefresh?: () => void;
}

export const ContractDetailsDialog: React.FC<ContractDetailsDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onRefresh
}) => {
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);

  if (!contract) return null;

  const canAmend = contract.status === 'active';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>تفاصيل العقد: {contract.contract_number}</DialogTitle>
              
              {/* Amendment Button */}
              {canAmend && (
                <Button
                  onClick={() => setShowAmendmentForm(true)}
                  variant="outline"
                  size="sm"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  تعديل العقد
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">التفاصيل</TabsTrigger>
              <TabsTrigger value="payments">الدفعات</TabsTrigger>
              <TabsTrigger value="amendments">التعديلات</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Existing contract details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم العقد</p>
                  <p className="font-medium">{contract.contract_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge>{contract.status}</Badge>
                </div>
                {/* Add more fields */}
              </div>
            </TabsContent>

            <TabsContent value="payments">
              {/* Existing payments list */}
            </TabsContent>

            <TabsContent value="amendments" className="space-y-4">
              {/* Amendments List */}
              <ContractAmendmentsList contractId={contract.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Amendment Form Dialog */}
      <ContractAmendmentForm
        open={showAmendmentForm}
        onOpenChange={setShowAmendmentForm}
        contract={contract}
        onSuccess={() => {
          onRefresh?.();
          setShowAmendmentForm(false);
        }}
      />
    </>
  );
};
```

---

## 🎯 In Contracts List/Table

```typescript
// Add to contract actions column
const columns = [
  // ... other columns
  {
    id: 'actions',
    cell: ({ row }) => {
      const contract = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => viewContract(contract)}>
              <Eye className="h-4 w-4 mr-2" />
              عرض
            </DropdownMenuItem>
            
            {contract.status === 'active' && (
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedContract(contract);
                  setShowAmendmentForm(true);
                }}
              >
                <FileEdit className="h-4 w-4 mr-2" />
                تعديل العقد
              </DropdownMenuItem>
            )}
            
            {/* Other actions */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
```

---

## 📱 Mobile View Integration

```typescript
// In mobile contract card
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{contract.contract_number}</CardTitle>
      <Badge>{contract.status}</Badge>
    </div>
  </CardHeader>
  <CardContent>
    {/* Contract info */}
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => viewDetails(contract)}>
      عرض
    </Button>
    {contract.status === 'active' && (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          setSelectedContract(contract);
          setShowAmendmentForm(true);
        }}
      >
        <FileEdit className="h-4 w-4 mr-2" />
        تعديل
      </Button>
    )}
  </CardFooter>
</Card>
```

---

## 🔔 Notifications Setup (Optional)

```typescript
// Show badge for pending amendments requiring approval
const { data: pendingAmendments } = useQuery({
  queryKey: ['pending-amendments'],
  queryFn: async () => {
    const { data } = await supabase
      .from('contract_amendments')
      .select('count')
      .eq('status', 'pending');
    return data;
  }
});

// In sidebar or header
<Button variant="ghost" className="relative">
  <FileEdit className="h-5 w-5" />
  {pendingAmendments && pendingAmendments.count > 0 && (
    <Badge className="absolute -top-1 -right-1" variant="destructive">
      {pendingAmendments.count}
    </Badge>
  )}
</Button>
```

---

## 🎨 Styling Tips

### Amendment Button Variants

```typescript
// Primary action
<Button onClick={() => setShowAmendmentForm(true)}>
  <FileEdit className="h-4 w-4 mr-2" />
  تعديل العقد
</Button>

// Secondary action
<Button variant="outline" onClick={() => setShowAmendmentForm(true)}>
  <FileEdit className="h-4 w-4 mr-2" />
  تعديل
</Button>

// Icon only (for mobile)
<Button variant="ghost" size="icon" onClick={() => setShowAmendmentForm(true)}>
  <FileEdit className="h-4 w-4" />
</Button>
```

---

## ⚙️ Database Setup

### Run Migration

```bash
# Via Supabase CLI
supabase migration up

# Or in Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/20250126100000_create_contract_amendments.sql
# 3. Run the script
```

### Verify Installation

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%amendment%';

-- Should return:
-- contract_amendments
-- amendment_change_log

-- Check functions
SELECT proname FROM pg_proc 
WHERE proname LIKE '%amendment%';

-- Should return:
-- generate_amendment_number
-- apply_contract_amendment
-- track_amendment_changes
```

---

## 🧪 Testing

### 1. Create Test Amendment

```typescript
// Test amendment creation
const testAmendment = {
  contract_id: 'test-contract-uuid',
  amendment_type: 'extend_duration',
  amendment_reason: 'Test extension',
  original_values: { end_date: '2025-06-30' },
  new_values: { end_date: '2025-09-30' },
  requires_customer_signature: false
};

createAmendment(testAmendment);
```

### 2. Check Change Tracking

```sql
-- Verify change logs created
SELECT 
  acl.field_name,
  acl.old_value,
  acl.new_value,
  acl.change_impact
FROM amendment_change_log acl
JOIN contract_amendments ca ON ca.id = acl.amendment_id
WHERE ca.contract_id = 'test-contract-uuid'
ORDER BY acl.created_at DESC;
```

### 3. Test Approval Flow

```typescript
// Approve amendment
approveReject({
  amendment_id: 'test-amendment-uuid',
  action: 'approve',
  notes: 'Test approval'
});

// Apply amendment
applyAmendment('test-amendment-uuid');

// Verify contract updated
const { data: updatedContract } = await supabase
  .from('contracts')
  .select('end_date')
  .eq('id', 'test-contract-uuid')
  .single();

console.log('New end date:', updatedContract.end_date); // Should be 2025-09-30
```

---

## 📊 Monitoring & Analytics

### Track Amendment Usage

```sql
-- Amendments by type
SELECT 
  amendment_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM contract_amendments
GROUP BY amendment_type
ORDER BY count DESC;

-- Average approval time
SELECT 
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_hours
FROM contract_amendments
WHERE status = 'approved';

-- Most amended contracts
SELECT 
  c.contract_number,
  COUNT(ca.id) as amendment_count
FROM contracts c
LEFT JOIN contract_amendments ca ON ca.contract_id = c.id
GROUP BY c.id, c.contract_number
ORDER BY amendment_count DESC
LIMIT 10;
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Amendment Button Not Showing

**Cause**: Contract status is not 'active'

**Solution**:
```typescript
// Check contract status before showing button
{contract.status === 'active' && (
  <Button onClick={() => setShowAmendmentForm(true)}>
    تعديل العقد
  </Button>
)}
```

### Issue 2: Permission Denied

**Cause**: User role is not manager+

**Solution**:
```sql
-- Check user role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- Grant manager role if needed
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'manager');
```

### Issue 3: Changes Not Tracked

**Cause**: original_values and new_values are identical

**Solution**:
```typescript
// Ensure values are different
const hasChanges = JSON.stringify(original_values) !== JSON.stringify(new_values);

if (!hasChanges) {
  toast({
    title: 'لا توجد تغييرات',
    description: 'لم يتم إجراء أي تعديلات',
    variant: 'destructive'
  });
  return;
}
```

---

## ✅ Integration Checklist

- [ ] Import components in Contracts page
- [ ] Add amendment button to contract actions
- [ ] Add state for selected contract & form visibility
- [ ] Add ContractAmendmentForm dialog
- [ ] Add ContractAmendmentsList (optional - in details view)
- [ ] Run database migration
- [ ] Verify RLS policies work
- [ ] Test amendment creation
- [ ] Test approval workflow
- [ ] Test apply functionality
- [ ] Add user permissions
- [ ] Test with different roles
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test on mobile view

---

**Ready to Use!** 🎉

The Contract Amendment System is now fully integrated and ready for production use.

For detailed API documentation, see `CONTRACT_AMENDMENT_SYSTEM_GUIDE.md`
