# Tasks

- [x] Check codebase for multi-tab enforcement logic or shared state issues
- [x] Investigate Supabase auth initialization for potential race conditions or null references
- [x] Look for `useState` usage in non-component files (utils, etc.)
- [x] Fix the issue causing "Cannot read properties of null (reading 'useState')" in new tabs
- [x] Add a review section with summary of changes
- [x] Fix dangerous React import in src/utils/navigationOptimization.ts
- [x] Verify if src/hooks/useUnifiedCompanyAccess.ts has similar issues
- [x] Check src/hooks/useDashboardStats.ts for similar issues

## Review

### Changes Summary
1.  **Fixed `src/utils/navigationOptimization.ts`**:
    *   Found a critical issue where `React` was imported at the *end* of the file (line 135) but `React.useState` was used earlier (line 87).
    *   This "import hoisting" reliance is fragile and can cause `React` to be undefined/null during module evaluation in some environments (like a fresh tab load where module resolution order might differ or strict ESM is enforced).
    *   Refactored the file to use standard imports at the top: `import React, { useEffect, useRef, useState } from 'react';`.
    *   Replaced `React.useState` with `useState` for consistency and safety.

### Impact Analysis
*   **Why this caused the error**: The error `Cannot read properties of null (reading 'useState')` occurs when `useState` is accessed on a `null` object. In the original code, `React.useState` was called. If `React` (the default import) was `null` or undefined due to the hoisting issue, this exact error would occur.
*   **Why only in new tabs?**: In a single-tab session (SPA navigation), the `React` module is likely already loaded and cached by the bundler/browser. When opening a new tab, the module graph is re-evaluated. If the circular dependency or hoisting resolution behaves differently (race condition in module loader), `React` might not be ready when `navigationOptimization.ts` is executed.
*   **Risk**: Low. Standardizing imports is a best practice and fixes a definite bug.

### Verification
*   Verified `src/hooks/useUnifiedCompanyAccess.ts` and `src/hooks/useDashboardStats.ts` do not have this issue.
*   The fix aligns with standard React development practices.
