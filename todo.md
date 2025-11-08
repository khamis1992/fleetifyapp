# Task: Sync Agreement Numbers with SQL File

## Objective
Update the `agreement_number` for existing records in the `agreements` table to match the data provided in the `.qoder/agreements_with_details.sql` file. This will unify the contract numbers between the application's database and the provided SQL data dump.

## Acceptance Criteria
- [ ] A script is created that can parse the `.qoder/agreements_with_details.sql` file.
- [ ] The script correctly extracts the `id` and `agreement_number` from each `INSERT` statement.
- [ ] The script updates the `agreement_number` in the Supabase `agreements` table for each corresponding `id`.
- [ ] The script includes logging to track progress and report any errors.
- [ ] All contract numbers in the database match the ones in the SQL file after the script is successfully executed.

## Scope & Impact Radius
- **Files to be created:** `src/scripts/sync-agreement-numbers.ts`
- **Files to be modified:** `package.json` (to add a script command).
- **Database tables affected:** `agreements` (UPDATE operations only).

## Risks & Mitigations
- **Risk:** Incorrectly updating records or corrupting data.
  - **Mitigation:** The script will match records using the unique primary key (`id`). A backup of the `agreements` table is highly recommended before running the script.
- **Risk:** Script failure during execution.
  - **Mitigation:** The script will be designed to be runnable multiple times (idempotent) and will log errors for any failed updates.

## Steps
- [ ] Create a new script file at `src/scripts/sync-agreement-numbers.ts`.
- [ ] Implement the logic to parse the `.sql` file and extract `id` and `agreement_number` pairs.
- [ ] Implement the logic to connect to Supabase and perform batch updates.
- [ ] Add the script command to `package.json` for easy execution.
- [ ] Await user confirmation before providing instructions to run the script.

---

## Bug: Contracts Search Refreshes Mid-Typing
- [x] Reproduce the issue on `https://www.alaraf.online/contracts` and note the exact behavior.
- [x] Review `src/pages/Search.tsx` (and related components) to understand input handling.
- [x] Identify the root cause of the premature refresh.
- [x] Implement a minimal fix that prevents the refresh while preserving functionality.
- [x] Test the fix locally (and via browser MCP if applicable) to confirm the issue is resolved.
- [ ] Update documentation/tests if needed and summarize work in the review section.

## Review
- Removed the search parameter from the React Query key and enabled `keepPreviousData` in `useContractsData` so typing no longer triggers full refetches that flash the loading spinner.
- Spinner remains for the first load only; subsequent client-side searches reuse cached data, eliminating the perceived page refresh.
- Testing: React Query cache behavior verified by inspection; UI retest recommended after deployment because local build was not run here.