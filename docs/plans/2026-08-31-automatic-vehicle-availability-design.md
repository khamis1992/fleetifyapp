# Automatic vehicle availability

## Decision

The stored vehicle status remains the UI source of truth, but PostgreSQL derives it from live operational evidence whenever a contract, maintenance record, or reservation changes. The existing hourly contract-status job covers date-only contract expiry.

Priority is:

1. Preserve hard physical/legal states: municipality, police station, accident, stolen, out of service, and employee custody.
2. Open maintenance means `maintenance`.
3. A current occupying contract means `rented`. Occupying includes active or suspended contracts, and legal contracts whose vehicle has not been returned.
4. A current reservation means `street_52`; a manager-confirmed Street 52 assignment is also preserved.
5. Otherwise an active vehicle is `available`.

An imported reconciliation row may remain as evidence, but `target_status = rented` can no longer keep a vehicle rented without a current occupying contract. The migration closes stale rented assignments as the affected vehicle status changes and backfills the current inconsistent rows with an audit trail.

## UI and verification

The vehicle details page must never fall back to the newest cancelled contract when rendering “current contract”. It uses the same current-period and occupancy rules as the database-facing behavior.

Tests cover active, suspended, returned legal, cancelled, future, and expired contracts; migration tests cover trigger wiring, protected states, the stale-rented backfill, privilege revocation, and rollback guards. Production verification compares every rented vehicle against current contracts, maintenance, and reservations and rechecks the vehicle details page.
