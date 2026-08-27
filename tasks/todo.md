# Payment Import Contract Matching Bug Fix

## Problem Summary
Excel/payment imports matched historical payments onto a 1-day cancelled manual stub contract (C-ALF-0063) while the real multi-year lease on the same plate (LTO2024284, created_via=desktop_folder_import) had zero payments.

## Root Cause
The `scoreContractMatch` function in `ExcelPaymentImport.tsx` does not:
- Filter or penalize short-duration contracts (1-day stubs)
- Prefer longer active leases over cancelled stubs
- Consider `created_via` field to prefer desktop_folder_import leases
- Check if a better (longer) contract exists before matching to a stub

## Tasks

- [ ] 1. Update MatchedContract type to include created_via field
- [ ] 2. Add created_via to the contract fetch query
- [ ] 3. Add contract duration calculation helper
- [ ] 4. Update scoreContractMatch to penalize short contracts
- [ ] 5. Add preference scoring for desktop_folder_import contracts
- [ ] 6. Add preference scoring for active/under_legal_procedure status
- [ ] 7. Add filter to prevent matching to <=3 day contracts when longer exist
- [ ] 8. Write regression test for C-ALF-0063 vs LTO2024284 scenario
- [ ] 9. Test the changes
- [ ] 10. Create git branch and commit
- [ ] 11. Push and create PR

## Implementation Details

### Score Adjustments
- **Contract duration >= 90 days**: +20 points
- **Contract duration >= 365 days**: +30 points (total +50)
- **created_via = 'desktop_folder_import'**: +25 points
- **status = 'under_legal_procedure'**: +15 points (in addition to existing active +5)
- **Contract duration <= 3 days AND status = 'cancelled'**: -500 points (effectively disqualifies)

### Hard Filter
Before returning best match, if best match has duration <= 3 days, check if any alternative with duration > 3 days exists with score > 0. If yes, choose the longer one instead.

## Review Section
(To be filled after completion)
