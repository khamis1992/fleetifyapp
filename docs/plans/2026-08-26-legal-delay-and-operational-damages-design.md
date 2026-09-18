# Legal delay and operational damages design

## Objective

Strengthen the explanatory memo by separating provable heads of damage from the unpaid rent itself and from any contractual compensation, while keeping every claimed amount tied to evidence and avoiding double recovery.

## Verified contract constraint

The signed contract `LTO2024284` does not support a QAR 1,200 monthly penalty under article 4. Article 4 states the monthly rent is QAR 1,800. Article 5 states a QAR 120 daily late charge, capped at three days. The system must therefore never describe QAR 1,200 per month as article 4 of this contract or apply that amount globally without a matching signed clause.

## Design

1. Add two explicit damage categories:
   - financing burden caused by monetary payment delay;
   - operational loss/lost profit while the vehicle could not be operated or re-let.
2. Include only reviewed damage items linked to an evidence document in the memo and claim totals.
3. Draft the monetary-delay basis under Civil Code articles 256, 263 and 268. When no prior formal notice is proven, the request starts from legally proven notice, including service of the statement of claim where accepted by the court.
4. Draft operational loss under articles 256 and 263 and the lease-return rules, subject to proof of causation and lost profit. Do not combine rent, retention compensation and operational loss for the same vehicle and period.
5. Extend contractual-compensation calculation to support a monthly method. Show the monthly rate, qualifying month count and total only when the signed clause, clause number, text and evidence document are recorded. Do not create a global QAR 1,200 default.
6. State that agreed compensation remains subject to judicial review and the Civil Code rules governing agreed damages.

## Verification

- Unit tests for monthly compensation count and cap.
- Generator tests for the three distinct requests, statutory references, evidence gating and no-double-recovery wording.
- Type-check and focused Vitest run.

