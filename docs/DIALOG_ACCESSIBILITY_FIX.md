# Dialog Accessibility Fixes

## Issues Found

### 1. Missing DialogTitle warnings
The Radix UI Dialog component requires DialogTitle for screen reader accessibility.

### 2. Missing Description warnings  
Dialogs should have either DialogDescription or aria-describedby for better accessibility.

## Solution

All `<DialogContent>` components must have:
1. `<DialogTitle>` - Required for accessibility
2. `<DialogDescription>` - Recommended (can be visually hidden if not needed visually)

## Implementation Pattern

### Basic Pattern (with visible title and description):
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title Here</DialogTitle>
      <DialogDescription>Description here</DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### Pattern for dialogs that don't need description:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title Here</DialogTitle>
      <DialogDescription className="sr-only">
        Accessible description for screen readers
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### Pattern for visually hidden title (if absolutely necessary):
```tsx
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <VisuallyHidden>
      <DialogTitle>Accessible Title</DialogTitle>
    </VisuallyHidden>
    <DialogDescription>Description</DialogDescription>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

## Common Locations to Check

Most dialogs are in:
- `src/components/contracts/*Dialog.tsx`
- `src/components/customers/*Dialog.tsx`
- `src/components/finance/*Dialog.tsx`
- `src/components/auth/*Dialog.tsx`

## Verification

Run the app and check browser console - no warnings should appear about:
- Missing DialogTitle
- Missing Description or aria-describedby

## Status

✅ Activities "leak" warning fixed - Changed from error to info log (it's filtering, not a leak)
⚠️ Dialog accessibility - Needs systematic check of all Dialog components

---

**Note**: The activities "data leak" was NOT actually a security issue - it was just filtering out unimportant technical logs like "query", "fetch_available_for_contracts", etc. The warning has been changed to an informational log.
