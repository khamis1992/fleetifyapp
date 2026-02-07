# Fix: Hide customers with open legal cases from delinquency page

## Problem
When clicking "فتح قضية" (open case) on the delinquency page, the customer's contract status is updated to `under_legal_procedure`, but the customer still appears in the delinquency list.

## Fix Plan

- [ ] **1. Dynamic calculation path** — Remove `'under_legal_procedure'` from the contract status filter in `useDelinquentCustomers.ts` (line 305)
- [ ] **2. Cached data path** — Filter out rows with `contract_status = 'under_legal_procedure'` in the cached data processing

## Review

### Changes Made (1 file: `src/hooks/useDelinquentCustomers.ts`)

1. **Dynamic calculation path (line 305)** — Removed `'under_legal_procedure'` from the `.in('status', ...)` filter. Contracts with open legal cases are no longer fetched.

2. **Cached data path (after line 190)** — Added filter to exclude rows where `contract_status = 'under_legal_procedure'`. Cached data that includes old legal procedure entries is now filtered out.

### How it works
When "فتح قضية رسمية" is clicked, `convertToOfficialCase()` updates the contract status to `'under_legal_procedure'`. Now, both the cached and dynamic paths in `useDelinquentCustomers` exclude contracts with this status, so the customer disappears from the delinquency list.
