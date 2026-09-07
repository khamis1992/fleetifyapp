# Contract editing workspace

User requested redesign and development of the contract editing page. The current
entry points in the contract register and details page open SimpleContractWizard.
The chosen direction follows the new contract file: warm white, deep green type,
teal actions, generous form spacing, and an always-visible change summary.

Instead of carrying the creation wizard into editing, provide a dedicated editor
with two stages: editing and review. Group the existing contract facts, vehicle,
extension and notes; show before/after values and the derived extension amount.
Keep customer, start date, type and monthly price as reference data because the
existing quick-edit command does not permit changing them. Vehicle/extension
changes are available only for active contracts with monthly rent, matching the
existing command. Notes remain editable. No database or financial rules change.

Capture the contract snapshot and version when the editor opens. Preserve it
through background refetches, route notes-only and amendment changes through the
existing services, prevent empty/duplicate submissions, and retain the draft on
failure. Confirm abandoning unsaved changes; refresh related readers after a
confirmed save without treating a refresh failure as a failed write.

Implementation is confined to a new contract-edit module, an entry-point switch
in SimpleContractWizard and focused tests. Existing creation and the separate
approval-based amendment form remain independent. Support Arabic/English, RTL,
keyboard access and narrow screens. Validate with service-behavior tests, type
checking, build and browser inspection without saving a real contract.

## Verification

- 10 editor interaction tests pass, including version conflicts, duplicate save
  protection, discard confirmation, legal-contract notes, replacement vehicles,
  language switching and a failed refresh after a successful write.
- 13 quick-edit service tests and 2 extension calculation tests pass.
- Full app and node TypeScript checks pass; focused ESLint reports no findings.
- Production build succeeds (existing bundle-size and dependency warnings).
- Inspected the live editor on desktop and at a narrow mobile viewport, including
  review and undo with an unsaved note. No contract was saved during inspection.
- Desktop fields scroll independently of the summary; mobile sections stack and
  keep actions visible. The editor opens in Arabic on every visit, independent of
  browser or detected locale. English is available only by an explicit local
  switch, which preserves the draft and handles the application's global RTL CSS
  without changing account preferences.
