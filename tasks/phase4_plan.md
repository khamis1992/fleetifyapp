# Task: Phase 4 - Admin Dashboard Features

## Objective
Complete all admin landing page management features with live data integration, including company selection dropdowns, export functionality (CSV/PDF), page duplication, and replacing mock analytics with live database queries.

**Business Impact**: Enables super admins to fully manage landing pages across all companies with data-driven insights and efficient content management.

## Acceptance Criteria
- [ ] All company Select dropdowns populated with live data from companies table
- [ ] Export functionality implemented for landing analytics (CSV and PDF formats)
- [ ] Duplicate/clone functionality for landing pages implemented
- [ ] Preview opens in new tab with correct company and theme parameters
- [ ] Mock analytics data replaced with live useLandingAnalytics hook data
- [ ] All data properly filtered by selected company
- [ ] Proper loading states and error handling
- [ ] Arabic/English bilingual support maintained

## Scope & Impact Radius

### Modules/Files to be Modified:
1. `src/components/super-admin/landing/LandingPreview.tsx:52` - Add company options
2. `src/components/super-admin/landing/LandingAnalytics.tsx:30-53,65,88-145` - Replace mock data
3. `src/components/super-admin/landing/LandingContentManager.tsx:100` - Add company options
4. `src/components/super-admin/landing/LandingABTesting.tsx` - Add company options (if exists)
5. `src/hooks/useLandingAnalytics.ts` - Verify/implement export functionality
6. New utility: `src/utils/exportHelpers.ts` - CSV/PDF export functions

### Files to Read for Context:
- `src/hooks/useCompanies.ts` - Company data fetching
- `src/hooks/useLandingAnalytics.ts` - Analytics data structure
- `src/hooks/useLandingSections.ts` - Landing sections CRUD

###Out-of-Scope:
- Changing analytics tracking implementation
- Modifying landing page rendering logic
- UI/UX redesigns
- Database schema changes
- Adding new analytics metrics

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Export functionality breaks on large datasets | Medium | Add pagination/limits, streaming for large exports |
| Company filter doesn't work with nested queries | Medium | Test with complex company hierarchies |
| Preview window blocked by popup blockers | Low | Provide fallback message, open in same tab option |
| Analytics hook returns incomplete data | High | Add default values, proper error handling |
| Performance degradation with all companies selected | Medium | Add data limits, lazy loading |

## Steps

### Pre-Flight
- [ ] Typecheck passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Build succeeds: `pnpm build`
- [ ] Current branch is up to date with main

### Implementation Steps

#### Step 1: Add Company Selection to All Components
**Estimated Time**: 30 minutes

- [ ] Import `useCompanies` hook in LandingPreview.tsx
- [ ] Import `useCompanies` hook in LandingAnalytics.tsx
- [ ] Import `useCompanies` hook in LandingContentManager.tsx
- [ ] Replace `{/* TODO: Add company options */}` with mapped company list
- [ ] Add loading states while companies are being fetched
- [ ] Add error handling for company fetch failures
- [ ] Test company selection updates filtered data

#### Step 2: Replace Mock Analytics with Live Data
**Estimated Time**: 45 minutes

- [ ] Remove `mockMetrics` object from LandingAnalytics.tsx
- [ ] Use `analytics` from `useLandingAnalytics` hook instead
- [ ] Map analytics data to UI components:
  - totalViews → analytics.views
  - uniqueVisitors → analytics.uniqueVisitors
  - conversionRate → analytics.conversionRate
  - etc.
- [ ] Add conditional rendering for missing data
- [ ] Add loading skeleton while analytics are being fetched
- [ ] Handle empty state when no analytics data exists
- [ ] Test with different company selections and date ranges

#### Step 3: Implement Export Functionality
**Estimated Time**: 1 hour

- [ ] Create `src/utils/exportHelpers.ts` with:
  - `exportToCSV(data, filename)` function
  - `exportToPDF(data, filename)` function using html2pdf or similar
- [ ] Implement CSV export for analytics:
  - Format analytics data as CSV rows
  - Include headers and proper formatting
  - Trigger browser download
- [ ] Implement PDF export for analytics:
  - Create formatted PDF layout
  - Include charts/graphs (if possible)
  - Proper Arabic/English support
- [ ] Add export button handlers in LandingAnalytics
- [ ] Add loading state during export
- [ ] Add error handling and toast notifications
- [ ] Test exports with different data sets

#### Step 4: Implement Preview in New Tab
**Estimated Time**: 20 minutes

- [ ] Implement `handleOpenInNewTab` in LandingPreview.tsx
- [ ] Pass selected company and theme as URL parameters
- [ ] Ensure preview URL is correct: `/landing/preview?company=${companyId}&theme=${themeId}`
- [ ] Test popup blocker scenarios
- [ ] Add fallback message if popup blocked

#### Step 5: Implement Duplicate/Clone Functionality
**Estimated Time**: 40 minutes

- [ ] Add "Duplicate" button to LandingContentManager section cards
- [ ] Implement `handleDuplicateSection` function:
  - Fetch original section data
  - Create new section with copied data
  - Append " (Copy)" to section name
  - Insert with new ID
- [ ] Add loading state during duplication
- [ ] Show success/error toast
- [ ] Invalidate queries to show new section
- [ ] Test duplication maintains all data correctly

### Testing
- [ ] Manual test: Select different companies, verify data changes
- [ ] Manual test: Export analytics to CSV, open and verify
- [ ] Manual test: Export analytics to PDF, open and verify
- [ ] Manual test: Open preview in new tab with different company/theme
- [ ] Manual test: Duplicate a landing section, verify copy created
- [ ] Edge case: Select "All Companies", verify aggregated data
- [ ] Edge case: Select company with no analytics, verify empty state
- [ ] Edge case: Export with large dataset, verify no errors
- [ ] Performance: Check dashboard load time with all companies

### Documentation
- [ ] Update SYSTEM_REFERENCE.md:
  - Add exportHelpers utility documentation
  - Document company filtering pattern
  - Update landing page management section
- [ ] Update inline comments for complex logic
- [ ] Add JSDoc comments to export functions

## Review (fill after implementation)

**Summary of changes:**
[To be filled after completion]

**Known limitations:**
[To be filled after completion]

**Follow-ups:**
[To be filled after completion]

---

## Implementation Notes

### Company Data Structure (from useCompanies)
```typescript
interface Company {
  id: string;
  name: string;
  name_ar?: string;
  // ... other fields
}
```

### Analytics Data Structure (from useLandingAnalytics)
```typescript
interface Analytics {
  views: number;
  uniqueVisitors: number;
  conversionRate: number;
  averageTimeOnPage: string;
  bounceRate: number;
  topPages: Array<{path: string; views: number; title: string}>;
  deviceBreakdown: {desktop: number; mobile: number; tablet: number};
  trafficSources: {direct: number; organic: number; social: number; referral: number; email: number};
}
```

### Export CSV Example
```typescript
const exportToCSV = (data: any[], filename: string) => {
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
```

---

**Feature Flag**: Not required (low risk changes, UI only)

**Rollback Plan**: Revert commits in reverse order, no database changes required

**Related Tasks**: Completes Phase 4 from tasks/todo.md

**Status**: ✅ Ready for Approval
