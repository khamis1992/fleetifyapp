# Delinquent Customer Cron Company Scope

## Problem

The active `update-delinquent-customers` pg_cron job calls
`update_delinquent_customers()` without a company. The hardened RPC accepts a
missing company only from a service-role API context, while a direct pg_cron
database session has no Supabase JWT role. The scheduled run therefore fails
with `A company is required` and leaves the delinquency cache stale.

## Decision

Keep the RPC authorization unchanged and replace only the cron command. The
job passes Fleetify's canonical company ID explicitly to
`public.update_delinquent_customers(uuid)`. This preserves company isolation,
avoids granting broader access to a `SECURITY DEFINER` function, and keeps the
existing daily schedule and job name.

The migration first verifies that the function and company exist, removes all
jobs with the old name by job ID, and schedules one canonical replacement. A
matching rollback restores the previous no-argument command.

## Verification

Static migration tests verify replacement ordering, explicit company scope,
preflight checks, and rollback coverage. Production verification checks the
stored cron command, invokes the company-scoped RPC once, and confirms a
successful refresh result and a current `last_updated_at` value.
