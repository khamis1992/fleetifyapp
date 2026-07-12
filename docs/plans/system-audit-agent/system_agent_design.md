# System-Wide Audit Agent Design

## Candidate Architecture

Recommended: a small daily orchestrator creates one run and dispatches bounded jobs to domain workers. Each worker detects invariant violations, emits typed findings, and may execute only repair commands registered in a server-side catalog. Every command validates company scope and accounting-period state, records before/after values, uses an authoritative transactional RPC, and stores rollback metadata.

The AI layer may classify ambiguous findings, select among registered commands, explain evidence, and prioritize work. It cannot generate arbitrary SQL or bypass database controls. Irreversible, closed-period, legal-identity, and low-confidence findings remain approval-gated.
