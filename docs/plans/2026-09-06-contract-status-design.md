# Contract status workspace

Redesign the shared status dialog used by the contract register and details page.
Arabic is the default and the whole workspace uses RTL. Follow the contract editor
with warm white, dark green typography, a quiet summary rail and fixed actions.

Use visible radio choices rather than a hidden select. Keep the existing allowed
transitions, five-character suspension/cancellation reason and ten-character legal
reversal reason. Show the current contract/customer/vehicle, the chosen transition,
and its relevant impact. A review stage precedes the final command. Cancellation
must have a successful impact check for the same contract, with required transfer
authorization and explicit consent. Failed checks offer a retry.

Reuse the existing status mutation, legal reversal service and cancellation impact
panel. No database migration or new financial rules. Retain failed drafts, block
duplicate submission and stale open snapshots, and distinguish a confirmed write
from a failed subsequent refresh. Confirm discarding an unsaved choice/reason.

Verify transition availability, reasons, review-before-write, cancellation loading,
missing data, transfer consent, legal routing, duplicate submission, failed writes
and refresh failures. Inspect desktop/mobile layouts without changing a real status.

## Verification

- 18 status interaction tests and 5 existing renewal/status hook tests pass.
- Full TypeScript checks pass; focused ESLint and diff whitespace checks pass.
- Production build passes, with existing large-bundle and dependency warnings.
- Inspected desktop options, cancellation consent, review and narrow mobile
  layouts using isolated fixtures; opened the final dialog in the live local app.
  No actual contract status was changed.
- Scoped `overflow: clip` prevents focus scrolling the entire dialog and clipping
  its header on mobile; only its content area scrolls.
- A missing closing brace in the concurrently edited TasksPage blocked Vite and
  was corrected without changing its behavior. Its missing stylesheet subsequently
  became available, allowing the full build to complete.
