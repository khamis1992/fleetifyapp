# Sidebar workspace redesign

Light white/sage navigation matching the dashboard and customer workspace. Replaces the multi-accent sidebar with a compact brand header, department filter, hierarchical links and a fixed utility/account footer.

## Integration

- Existing navigation destinations extracted without changing their paths; existing admin-only audit link and employee workspace restrictions retained.
- Arabic search ignores vowel marks, tatweel and alef variants. Matching children retain their parent context; empty results have a clear reset action.
- Current-page matching uses the longest matching route segment so fleet subpages and CRM do not also mark their parent list links as current.
- Desktop collapse is controlled by BentoLayout, persists locally and releases content width. Clicking a collapsed group expands the sidebar and reveals its children.
- Mobile uses the existing Radix Sheet with modal focus containment, accessible title/description, Escape dismissal, close button, focus restoration and close-on-navigation.
- Global search uses the dedicated event introduced by the dashboard; help preserves context-sensitive tours. Recent pages, profile and sign-out remain accessible.
- Kept concurrent finance navigation/layout integration intact. No schema changes or deployment.

## Verification

- Eight sidebar tests cover route specificity, Arabic filtering, active descendants, empty search recovery, admin visibility, employee restrictions, collapse expansion and mobile close callbacks.
- Dashboard/search regression tests included in the final test run.
- Authenticated browser checks: expanded and collapsed desktop appearance (272/80px), corresponding content margins (296/104px), filtering, collapsed-group expansion, mobile at 390 × 844, successful navigation to customers with drawer dismissal, Escape and focus restoration.
- TypeScript, focused ESLint and production build run separately.
