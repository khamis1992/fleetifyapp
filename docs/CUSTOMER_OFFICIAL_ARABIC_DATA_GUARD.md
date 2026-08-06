# Customer Official Arabic Data Guard

This guard prevents new or edited official customer identity data from being saved without Arabic customer names and Arabic nationality.

## Why This Exists

Customer records are used in contracts, employee workspace, legal transfer, reports, and lawsuit preparation. Missing Arabic names or Arabic nationality can cause incorrect legal documents and broken workflow steps.

## Application Layers

- Frontend forms validate Arabic official data before save.
- CSV/customer import rejects incomplete Arabic official data.
- Employee workspace blocks legal transfer until official Arabic data is complete.
- Database trigger protects inserts and official identity-field updates once applied in production.

## Production Apply

The normal command is:

```bash
npx supabase db push
```

If this is blocked by remote/local migration-history drift, run the manual SQL in Supabase SQL Editor:

```text
supabase/manual/20260806120022_apply_customer_official_arabic_data_guard.sql
```

Run the `VERIFY` query at the bottom of that file. The expected result is:

```text
has_arabic_text_exists: true
enforcement_function_exists: true
trigger_exists: true
```

## Rollback

Use only if the database guard must be removed:

```text
supabase/manual/20260806120022_rollback_customer_official_arabic_data_guard.sql
```

After rollback, `trigger_still_exists` should be `false`.
