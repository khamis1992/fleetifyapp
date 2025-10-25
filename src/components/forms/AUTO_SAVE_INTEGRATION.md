# Form Auto-Save Integration Guide

Part of **K1 Fix #009** - Prevent data loss with automatic form drafts

## Quick Start

### Method 1: AutoSaveFormWrapper (Easiest)

Wrap your form with `AutoSaveFormWrapper`:

```tsx
import { AutoSaveFormWrapper } from '@/components/forms';
import { useState } from 'react';

function CustomerForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  return (
    <AutoSaveFormWrapper
      formId="customer-form"
      formValues={formData}
      onRestoreValues={(values) => setFormData(values)}
    >
      <form>
        <input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {/* More fields... */}
      </form>
    </AutoSaveFormWrapper>
  );
}
```

### Method 2: With react-hook-form

```tsx
import { useForm } from 'react-hook-form';
import { AutoSaveFormWrapper } from '@/components/forms';

function CustomerForm() {
  const { watch, reset, handleSubmit } = useForm();
  const formValues = watch(); // Get all form values

  const onSubmit = async (data) => {
    await saveToDatabase(data);
    // Clear draft after successful save
    clearDraft();
  };

  return (
    <AutoSaveFormWrapper
      formId="customer-form"
      formValues={formValues}
      onRestoreValues={(values) => reset(values)}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Form fields... */}
      </form>
    </AutoSaveFormWrapper>
  );
}
```

### Method 3: Custom Hook (Maximum Control)

```tsx
import { useFormDraft } from '@/hooks/useFormDraft';
import { DraftStatusIndicator } from '@/components/forms';

function CustomerForm() {
  const [formData, setFormData] = useState(initialData);

  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draftTimestamp,
    saveStatus
  } = useFormDraft({
    formId: 'customer-form',
    onDraftLoaded: (data) => {
      // Ask user if they want to restore
      if (confirm('Restore saved draft?')) {
        setFormData(data);
      }
    }
  });

  // Auto-save on every change
  useEffect(() => {
    saveDraft(formData);
  }, [formData]);

  const handleSubmit = async () => {
    await saveToDatabase(formData);
    clearDraft(); // Clear draft after successful save
  };

  return (
    <div>
      <DraftStatusIndicator
        saveStatus={saveStatus}
        hasDraft={hasDraft}
        draftTimestamp={draftTimestamp}
        onRestoreDraft={loadDraft}
        onDeleteDraft={clearDraft}
      />
      <form onSubmit={handleSubmit}>
        {/* Form fields... */}
      </form>
    </div>
  );
}
```

## Integration Checklist

### For EnhancedCustomerForm

1. Import wrapper:
```tsx
import { AutoSaveFormWrapper } from '@/components/forms';
```

2. Wrap form content:
```tsx
<Dialog>
  <DialogContent>
    <AutoSaveFormWrapper
      formId={`customer-form-${existingCustomerId || 'new'}`}
      formValues={watch()}
      onRestoreValues={(values) => reset(values)}
      onDraftCleared={() => console.log('Draft cleared')}
    >
      {/* Existing form content */}
    </AutoSaveFormWrapper>
  </DialogContent>
</Dialog>
```

3. Clear draft on successful submit:
```tsx
const onSubmit = async (data) => {
  await saveCustomer(data);
  clearDraft(); // Add this
  onSuccess();
};
```

### For VehicleForm

Same pattern as CustomerForm:

```tsx
<AutoSaveFormWrapper
  formId={`vehicle-form-${vehicleId || 'new'}`}
  formValues={formData}
  onRestoreValues={setFormData}
>
  {/* Existing form */}
</AutoSaveFormWrapper>
```

### For EnhancedContractForm

```tsx
<AutoSaveFormWrapper
  formId={`contract-form-${contractId || 'new'}`}
  formValues={contractData}
  onRestoreValues={(values) => setContractData(values)}
  indicatorPosition="top"
>
  {/* Wizard steps */}
</AutoSaveFormWrapper>
```

## Features

✅ **Auto-save every 30 seconds** (configurable)
✅ **Save on form blur** (1 second debounce)
✅ **Restore on page return** (with user prompt)
✅ **Visual save indicator** ("Saving...", "Saved")
✅ **Clear on successful submit**
✅ **Version control** (old drafts auto-cleared)
✅ **Multi-tab safe** (via localStorage)
✅ **Timestamp tracking**
✅ **Delete draft option**

## Props

### AutoSaveFormWrapper

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `formId` | `string` | Required | Unique form identifier |
| `formValues` | `T` | Required | Current form values object |
| `onRestoreValues` | `(values: T) => void` | Required | Callback to restore values |
| `autoSaveInterval` | `number` | `30000` | Auto-save interval (ms) |
| `enabled` | `boolean` | `true` | Enable/disable auto-save |
| `showIndicator` | `boolean` | `true` | Show draft status indicator |
| `indicatorPosition` | `'top' \| 'bottom'` | `'top'` | Indicator position |

### useFormDraft Hook

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formId` | `string` | Required | Unique form identifier |
| `autoSaveInterval` | `number` | `30000` | Auto-save interval (ms) |
| `enabled` | `boolean` | `true` | Enable/disable auto-save |
| `onDraftLoaded` | `(data: T) => void` | - | Called when draft loaded |
| `onDraftSaved` | `() => void` | - | Called after save |
| `onDraftCleared` | `() => void` | - | Called after clear |

## Best Practices

### 1. Unique Form IDs

Use unique IDs per form instance:

```tsx
// ✅ Good
formId={`customer-form-${customerId || 'new'}`}

// ❌ Bad (all customers share same draft)
formId="customer-form"
```

### 2. Clear Drafts After Success

Always clear drafts after successful submission:

```tsx
const handleSubmit = async (data) => {
  await saveToAPI(data);
  clearDraft(); // Don't forget this!
};
```

### 3. Debounce Form Changes

Avoid saving on every keystroke:

```tsx
// Built-in 1s debounce in AutoSaveFormWrapper
// Or customize:
useEffect(() => {
  const timer = setTimeout(() => saveDraft(data), 1000);
  return () => clearTimeout(timer);
}, [data]);
```

### 4. Handle Navigation

Clear drafts when user navigates away intentionally:

```tsx
const handleCancel = () => {
  if (confirm('Discard changes?')) {
    clearDraft();
    navigate('/customers');
  }
};
```

## Testing

### Manual Test Checklist

- [ ] Fill form partially
- [ ] Wait 30 seconds → See "Saved" indicator
- [ ] Refresh page → See "Restore draft?" prompt
- [ ] Click "Restore" → Form values populated
- [ ] Submit form → Draft cleared
- [ ] Fill form again
- [ ] Click "Delete draft" → Draft removed
- [ ] Navigate away and back → No restore prompt

### Edge Cases

- [ ] Multiple browser tabs (should share draft via localStorage)
- [ ] Page refresh during auto-save
- [ ] Corrupted localStorage data
- [ ] Form with nested objects/arrays
- [ ] Form with file uploads (not auto-saved)

## Performance

- Draft size limit: ~5MB per form (localStorage limit)
- Auto-save interval: 30s (configurable)
- Debounce delay: 1s (prevents excessive saves)
- No network calls (localStorage only)

## Troubleshooting

### Draft not restoring?

Check:
1. FormId is consistent
2. localStorage not cleared
3. Draft version matches (old drafts auto-cleared)

### Auto-save not working?

Check:
1. `enabled` prop is `true`
2. `formValues` is updating
3. No console errors
4. localStorage has space

### Indicator not showing?

Check:
1. `showIndicator` prop is `true`
2. `TooltipProvider` wraps app
3. Components imported correctly

## Migration Guide

### Before (No auto-save)

```tsx
function CustomerForm() {
  const [data, setData] = useState({});

  return (
    <form>
      <input value={data.name} onChange={...} />
    </form>
  );
}
```

### After (With auto-save)

```tsx
function CustomerForm() {
  const [data, setData] = useState({});

  return (
    <AutoSaveFormWrapper
      formId="customer-form"
      formValues={data}
      onRestoreValues={setData}
    >
      <form>
        <input value={data.name} onChange={...} />
      </form>
    </AutoSaveFormWrapper>
  );
}
```

**That's it!** Only 3 lines added. 🎉

## Related Files

- `src/hooks/useFormDraft.ts` - Core hook
- `src/components/forms/DraftStatusIndicator.tsx` - UI indicator
- `src/components/forms/AutoSaveFormWrapper.tsx` - Wrapper component

## Support

For issues or questions:
- Check console for `[FORM_DRAFT]` debug logs
- Verify localStorage in DevTools → Application tab
- Review this guide's troubleshooting section
