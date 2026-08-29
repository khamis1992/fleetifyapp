# Verified customer email as the defendant contact source

## Decision

The operator confirmed that the email stored in `customers.email` is the correct
email for every customer, including the shared value `info@gmail.com`. The legal
workflow therefore treats the customer record as the source of truth when the
litigation profile declares `defendant_contact_source = 'customer_record'` and
`defendant_email_status = 'verified'`.

The claimant and representative email remains a separate configuration value:
`khamis-1992@hotmail.com`. It is never copied into defendant data.

## Data flow

1. The customer record supplies the defendant email dynamically.
2. The litigation profile records that the email is verified and sourced from
   the customer record; it does not need to duplicate the email value.
3. Memo generation and Taqadi payload generation resolve the same canonical
   contact value.
4. Existing litigation profiles linked to customers with syntactically valid
   emails are backfilled to `verified` and `customer_record`.
5. Database filing guards validate the current customer email at filing time.

## Safety and verification

- A profile marked `unavailable` never receives a fallback email.
- A profile marked `verified` may use the customer email only when its source is
  `customer_record` and the current value is syntactically valid.
- Manual/contract/national-address sources continue to require an explicit
  profile email and their existing evidence rules.
- Tests cover resolution, memo readiness, Taqadi payload equality and migration
  constraints. Production verification checks contract `LTO2024284` directly.
