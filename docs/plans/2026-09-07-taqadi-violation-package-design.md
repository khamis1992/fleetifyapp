# Taqadi violation document requirements

The filing page excludes penalties without official evidence from a full financial claim, but the server package validator required two extra documents for any unpaid penalty. C-ALF-0061 reproduced the inconsistency with 49 unpaid records and no `violations_proof` attachment.

Use the existing canonical server claim statement to determine the traffic component and stored case scope. Do not accept a client count or scope override as authority. Require the generated statement and registered official evidence when traffic is included, when the case is traffic-only, or when the request itself contains traffic documents. Preserve the outer signed-contract identity and company checks, all other package requirements, and subsequent financial approval guards.

The browser shares one requirement predicate across readiness, packaging, and document controls. Empty proof arrays cannot satisfy a positive traffic claim. New payloads carry the registered proof ID; legacy payloads without that field remain compatible only when the database has official proof. Translate missing keys into actionable Arabic names. A read-only preflight button calls the same server validator without creating a filing job.

Alternatives rejected: forcing every rental claim to include penalties would change the current claim policy; removing violation requirements unconditionally would admit unsupported traffic claims.

Validation: PostgreSQL regression, positive/negative evidence and tenant cases, rollback, frontend tests, TypeScript and production build, then authenticated preflight on the reported contract before/after deployment. The migration updates validation only and has a matching rollback; it does not alter fines, balances or claim records.
