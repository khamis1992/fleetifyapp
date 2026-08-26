# Agent Audit Remediation — Evidence Notes

## Production baseline (read-only)

- Supabase project: `qwhunliohlkkahbspfiu`.
- `system_agent_runs`: 168؛ منها 117 بلا `initiated_by`.
- آخر ثلاث جولات ليلية أعادت النتيجة نفسها: 3,970 finding، منها 2,582 review و1,207 failed و177 repaired.
- آخر جولة كاملة: `cf21c3ce-6300-4d77-8e0b-4ba01afd2641`.
- عدد المفاتيح المنطقية المميزة المطلوب مراجعتها في آخر جولة: 2,582؛ المهام المفتوحة الحالية: 253 فقط.
- `system_agent_findings`: 110,997 تاريخياً؛ لا يجوز تفسير 74,987 review تاريخية على أنها backlog حالي.
- `taqadi_agent_jobs`: 15 `needs_human`، منها 14 `REVIEW_MISMATCH` وواحدة `FINAL_APPROVAL_REQUIRED`.
- تسعة جداول في `public` بلا RLS؛ يلزم تصنيفها إلى تشغيلية متعددة الشركات أو audit/backup داخلية قبل اختيار السياسة.
- مهام cron القديمة 1 و18 و23 و24 و25 و26 تحتوي نصوصاً تشبه JWT؛ لا تُنسخ قيمها في الوثائق أو السجلات.
- توجد جداول CTO قديمة غير فارغة لكنها متوقفة منذ 2026-01-06؛ التقرير الذي وصفها بأنها فارغة غير دقيق.
- `ingest-traffic-mail` موجود محلياً لكنه غير منشور ولا مجدول في الإنتاج.
- توجد إصدارات كثيرة منشورة من orchestrator/worker؛ v14 المنشور يحمل shared runtime أقدم من المحلي.

## Code observations

- مزامنة review findings تتم حالياً من المتصفح داخل `src/hooks/useSystemAuditDashboard.ts` بإدخال bulk واحد ثم أرشفة المهام القديمة.
- واجهة `SystemAuditAgentDashboard.tsx` توقف/تلغي task فقط، ولا تتحكم في agent run.
- لا يوجد RPC واضح لـ pause/cancel للوكيل.
- الـworker الحالي يستخدم `x-agent-secret` ويحتاج فحص حالة التحكم قبل claim وبين الدفعات.
- جدول cron يحتوي وكلاء متداخلين في الصحة القانونية/العقود والتدقيق الليلي، وبعضها mutating.

## Official Supabase guidance used

- Scheduling Edge Functions: `pg_cron` + `pg_net`، مع تخزين مفاتيح الاستدعاء في Vault.
- RLS: الجداول المكشوفة عبر Data API يجب أن تعتمد RLS؛ grants وRLS يعملان معاً، والجداول الداخلية تُنقل إلى schema خاص أو تُسحب صلاحياتها.
- دوال `security definer` ومسارات البحث تحتاج تضييقاً ومراجعة صلاحيات دقيقة.

## Decisions pending code/schema inspection

- الجداول التشغيلية من قائمة RLS مقابل جداول audit/backup الداخلية.
- آلية التنبيه الحالية التي يمكن إعادة استخدامها بدلاً من إنشاء قناة موازية.
- أفضل نقطة ربط لمهام Taqadi مع جدول `tasks` أو mapping مخصص.
- هل `ingest-traffic-mail` جاهز للنشر أم يحتاج حماية/تحقق إضافي.

