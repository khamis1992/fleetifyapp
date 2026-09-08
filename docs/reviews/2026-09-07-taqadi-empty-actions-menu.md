# Empty Taqadi actions menu

The reported contract `727a7b69-b2a8-43cc-9589-602da0d28001` (AGR-202504-417240) has a filing job in `needs_human / submission_uncertain` with `SUBMISSION_UNCERTAIN`: approval was attempted but a valid reference-bearing receipt was not observed. The additional-actions trigger was rendered for every job, while its only children were a conditional retry and a portal link limited to filed jobs. Both were absent in this state.

The menu now always provides a portal link and an explicit read-only refresh of the job, events, artifacts and case. The uncertain-submission primary action opens Taqadi for verification instead of displaying a disabled button. The ordinary resume guidance is hidden in this state because resume is not offered. Existing retry/cancellation restrictions and the job's stored state are preserved.

Changed components: `TaqadiAutomationPanel.tsx` and new `TaqadiJobActionsMenu.tsx`. Three new menu interaction tests cover uncertain submissions, ordinary states, optional retries and pending refresh. The related payload and stop-control suites passed as well (29 tests total). Full application and Node TypeScript checks passed. No database changes or submission/retry actions were performed.

Verified in the user's in-app browser on the reported contract: the menu displayed **فتح تقاضي للتحقق من الطلب** and **تحديث حالة العملية**. Selecting refresh returned **تم تحديث حالة العملية وسجل الوكيل والمرفقات**. The misleading resume notice was absent. Browser error logs were empty during this check. Changes are available in the local development app; no Vercel deployment was performed.
