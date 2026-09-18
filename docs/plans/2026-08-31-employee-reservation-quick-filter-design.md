# Employee-reserved vehicle quick filter

## Decision

Use the canonical `reserved_employee` vehicle status for the quick filter labelled
`محجوزة لموظف`. The previous chip mixed the employee-reservation status with the
unrelated `reserved` counter, although `reserved` is not a valid value in the
database `vehicle_status` enum.

## Data flow

`useFleetStatus` counts `reserved_employee` rows as `reservedEmployee`. The fleet
page displays that count and sends `reserved_employee` to `useVehiclesPaginated`
when the user confirms the quick filter. The paginated query then applies an exact
status equality filter.

## Verification

- Unit-test the `reserved_employee` counter.
- Confirm the quick chip displays the correct label and count.
- Apply the chip and confirm the current list count matches the employee-reserved
  count.
