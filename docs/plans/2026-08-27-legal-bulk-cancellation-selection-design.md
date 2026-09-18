# Legal bulk cancellation selection

## Goal

Make the bulk action on the legal cases register accurately cancel eligible cases while preserving terminal legal records.

## Design

- Treat cases with a `closed` or `cancelled` workflow stage, or a `closed`/`cancelled` case status, as terminal.
- Disable selection for terminal cases and exclude them from select-all.
- Label the action as cancellation rather than deletion because the audit record is retained.
- Keep the confirmation dialog open while the RPC is pending.
- Use the counts returned by `cancel_legal_cases_v1` for success and informational messages instead of assuming every submitted ID changed.

## Verification

- Terminal case `CASE-26-0013` renders with a disabled checkbox.
- Active cases remain selectable and open the bulk confirmation dialog.
- TypeScript type-check and focused ESLint complete without errors.
- No browser console errors are produced by the updated interaction.
