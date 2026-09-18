# Professional balance sheet visual fixture

Only synthetic company and ledger data are used. The actual report component,
presentation rules, PDF/Excel exports, and A4 pagination code are imported.
The hooks are replaced with an in-memory store; all database entry points throw.

From the repository root:

```powershell
npx vite --config tests/visual/professional-balance-sheet/vite.config.mts
```

Open <http://127.0.0.1:4193/?lang=ar&state=draft&asOf=2026-08-31&compare=2025-12-31>.

Query parameters:

- `lang=ar` or `lang=en`.
- `state=draft`: live report, preparer controls and one saved draft.
- `state=approved`: selects the synthetic approved version automatically.
- `state=reviewer`: selects the draft as an independent reviewer; confirmations
  and at least 20 characters of review notes enable the real approval button.
- `state=error`: read failure; Refresh recovers the synthetic report.
- `state=blocked`: unclassified asset, blocking finding.
- `state=currency`: missing company currency, blocking finding.
- `state=readonly`: view/export without save/approve permissions.
- `state=voided`: selects the cancelled version automatically.
- `state=loading`: loading report.
- `asOf=2025-12-31&compare=2024-12-31`: test different requested dates.

The visible A4 buttons call the actual `renderBalanceSheetPages` function.
The stress button adds 42 account rows, an exceptionally long account name, and
long preparation notes. The output displays page count and actual browser
vertical/horizontal overflow measurements for every page. All pages are visible
below it for screenshots. Standard report export controls also produce synthetic
PDF/Excel downloads or the native print dialog.

Useful selectors: `[data-testid="balance-sheet-report"]`, `#preview-normal`,
`#preview-stress`, `#pagination-result`, `.fixture-preview .bs-page`.

Click the actual application PDF or Excel button to inspect the produced blob in
`#download-result`. A test-only wrapper preserves `URL.createObjectURL` and the
native download, while displaying MIME type and byte size. PDF evidence includes
the `%PDF-` signature, successful parsing with `pdf-lib`, page count and dimensions
in points/millimetres. Excel evidence includes the ZIP container signature. The
most recent four observed downloads remain visible.
