# Manual signed-contract identity review

Contract details expose an Arabic manual-review button on directly owned signed
contract files. The dialog loads an authorized preview, displays the current
customer and prior extraction, and asks the reviewer for the identity number
read from the signed contract, a reason, and explicit confirmation of the tenant
and contract. The observed number must match the current customer on the server.

The authenticated RPC is a security-invoker facade over a private, authorized
command. Only active company profiles with administration/manager/legal roles
can preview or approve. It locks the source records and requires the preview's
revision to remain current. Inactive/quarantined, foreign, unsigned and ambiguous
approved evidence is rejected. Repeating a completed save is idempotent.

Approval stores the human observation as the effective verified identity, leaves
the original extracted name intact, and preserves the complete previous document
in a private append-only review row and the audit log. The reviewer profile and
timestamp are saved on the document. Existing exact-identity and company guards
remain enabled. A trigger prevents late OCR updates from replacing an approved
human decision. It allows unrelated document changes and a new recorded review.

The successful mutation invalidates and broadcasts the shared document change,
refreshing contract documents and lawsuit readiness. No client-only status patch
is used. Other missing requirements retain their own readiness conditions.

Rollback disables new approvals and retains decisions, audits and OCR protection.
Verification uses isolated PostgreSQL fixtures for authorization, stale previews,
identity conflicts, replay and late OCR, plus React tests for the actual form and
shared invalidation. Real customer documents are not manually approved as tests.

Deployed as migration `20260907133016`. Nine PostgreSQL tests and seventeen React
and synchronization tests passed, as did full type checking, targeted ESLint and
the production build. Browser verification opened the real signed PDF beside the
customer data and confirmed the save button stays disabled until review inputs
and attestation are present. The preview was closed without saving an approval.
Production grants confirmed no anonymous RPC access and no authenticated table
read/write grants. The advisor's informational no-policy notice is intentional:
the private review table uses default-deny RLS and is accessible only to the owner
through the authorized command.
