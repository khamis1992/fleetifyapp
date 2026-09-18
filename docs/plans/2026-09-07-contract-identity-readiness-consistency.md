# Contract identity readiness consistency

The signed lease was already selected and loaded, but filing readiness still
reported an unverified identity. Document selection recognized a complete exact
identity-number match; `toLegalIdentityVerification` copied the stale OCR
`mismatch` status into the loaded document. Thus the document ledger showed ready
while the filing checklist blocked the same evidence.

The shared `legalContractIdentityMatch` utility now supplies the existing effective
identity rule to both selection and verification. Normalization preserves the
original names, identity numbers and scan timestamp, and explains an exact-number
correction rather than repeating the old name error. Selection still rejects
superseded/quarantined evidence, conflicting active copies and unsupported types.

Migration `20260907131626` corrects only the reported contract's legacy result.
It requires the known document, a single active signed copy, prior OCR evidence,
the specific legal prose incorrectly extracted as a name, and an 11-digit number
matching both the extracted evidence and the current customer. The source file,
original OCR fields, customer and financial records are unchanged. One audit event
preserves before/after classification values; the matching rollback restores only
that classification if no subsequent verification has replaced it.

Verification: 51 tests passed across document selection, identity normalization,
filing readiness and batch filing. Full TypeScript and targeted ESLint checks passed.
The live page showed all preparation requirements complete after the code fix,
before the stored result was corrected. The database then confirmed `matched`,
active evidence, unchanged extraction, current-customer agreement and one audit event.
After reloading, the page showed 100% preparation readiness and 9/9 ready documents.
The production build passed (with the existing bundle-size warning).
