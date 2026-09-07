# Employee workspace actions and subviews

Arabic-first redesign of `/employee-workspace`, extending the previous shell redesign to the work inside it. Direction: deep green, ivory, restrained gold, Cairo typography, numbered form sections, readable action labels, visible selection/focus states, and responsive layouts.

## Coverage

- Five work views: priorities, monthly collections, assigned contracts, tasks, communication history.
- Quick actions, contract file entry, customer groups, invoice expansion, contract filters, task rows, activity timeline, export and notification controls.
- Employee dialogs: calls (including recording/analysis controls), follow-ups, notes, daily closeout, customer identity completion, task details/reply, contract details, cancellation, bulk unassignment.
- Shared workflows use a React presentation context that follows portals: contract creation and its customer form, signed document scanning, payment/invoice selection and receipt controls, legal readiness and employee legal review, unassignment, feature tours. Their presentation outside the employee provider stays unchanged.
- Payment step indicator and accessible invoice checkbox: mouse events avoid double toggling; Space changes the existing selection state. No changes to invoice balances, payment authorization, save handlers, or database schema.
- Daily closeout keeps all fields and counters visible, grouped into day details, activity/results, and final review. Anchor navigation and persistent footer simplify long forms.

## Verification

- TypeScript checks passed.
- ESLint on edited components passed without errors.
- 20 tests passed: portal/context isolation, disabled actions, note validation and selected contract payload, follow-up date and cancel behavior, existing administration views and employee invoice calculations.
- Browser review at desktop and 390 × 844: quick forms, contract details, payment selection/details, signed scanning, cancellation, identity completion, closeout anchor navigation, all three contract wizard stages, nested quick-customer form and all five work tabs. No live save/payment/cancellation/recording/upload was performed.
- Measured no horizontal overflow in the redesigned collection content or inspected dialogs; normalized checkbox visuals retain their surrounding clickable labels. Browser error log was empty at final review.
- Production build passed. Verified 15 key presentation selectors survive production CSS pruning. Existing dependency size/dynamic-import warnings are unchanged in scope.
- Live legal readiness showed an existing financial source verification warning and disabled Next for the inspected contract. The guard is preserved. Further legal steps cannot be exercised on that record until readiness succeeds.
- Task list is empty and unassignment is permission-restricted for the current account; their markup/actions were checked in source. No synthetic production records were created for visual testing.

Build verification and final responsive corrections are completed in this task; deployment is outside this UI request.
