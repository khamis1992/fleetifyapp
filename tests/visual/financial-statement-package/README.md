# Synthetic financial statement export QA

Run from the repository root:

```powershell
npx vite --config tests/visual/financial-statement-package/vite.config.mts
```

Open `http://127.0.0.1:4194/?lang=ar&status=draft` or `?lang=en&status=approved`. Add `stress=true` for long statement labels and notes, or `findings=true` for incomplete disclosures. `status=voided` shows cancelled versions and `status=preview` an unsaved package.

Use `?view=ui&lang=ar` for the actual production React UI, and `?view=ui&lang=en&actor=reviewer` for the separate reviewer flow. Its hooks and services use in-memory synthetic data. Saves, approvals, voids and period locks are confined to the fixture and disappear on reload. `error=true` simulates a source read failure.

The harness uses the production exporter and global application CSS with fixed synthetic data. It makes no Supabase calls. The visible pagination result reports measured overflow for each portrait/landscape A4 page. PDF and Excel buttons invoke real production downloads; the test-only observer parses the PDF page geometry and checks the XLSX ZIP signature while preserving downloads.

`fixtureData.ts` is pure and can also be imported by service and UI tests. Its comparative statement periods intentionally differ: position at 2025-12-31 and performance/cash movements during 2025-01-01 through 2025-08-31.
