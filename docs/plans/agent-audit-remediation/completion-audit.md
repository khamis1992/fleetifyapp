# Agent Audit Remediation — Requirement Completion Audit

Authoritative source: `C:\Users\khamis\Desktop\FLEETIFY-AGENTS-AUDIT-REPORT.md`.

Status vocabulary:

- **production-verified**: current production evidence proves the issue is fixed.
- **prepared-and-verified**: implementation and local tests are complete, but the production-changing rollout is intentionally not activated without explicit approval.
- **external-blocked**: resolution depends on credentials, an external application state, or a separate operational approval.

| # | Reported issue | Current status | Evidence / remaining gate |
|---|---|---|---|
| 1 | No owner, pause, cancellation, or kill switch | production-verified | Company-scoped control tables, immutable events, owner assignment, cooperative cancellation, dashboard actions, and worker checkpoints are live. |
| 2 | Overlapping nightly writes | production-verified | `daily-audit-agent` and `safe-auto-repair` schedules are inactive; legal guard is staggered; all seven retained schedules obey the same company control gate. |
| 3 | Review backlog is repeatedly emitted and stale tasks disappear | production-verified | Server-side idempotent sync is live and linked 2,643 current open review tasks; stale closure retains the two-full-run grace. |
| 4 | Two repair ledgers mutate the same entities | production-verified | Legacy `safe-auto-repair` is unscheduled while history remains; canonical repairs stay in `system_agent_repairs`. |
| 5 | Fifteen Taqadi jobs are stuck | production-verified | Exactly 15 durable tasks are linked: 12 safe retries, 2 substantive reviews, and 1 final approval. |
| 6 | Outlook traffic mail is not scheduled | capability-production-verified / credentials-blocked | Schema, RLS, parser, lease, watermark, idempotency, and Edge function are live. The local branch replaces `MOI_MAIL_SECRET` with a dedicated Vault identity and v2 invoker; scheduling remains intentionally off until Microsoft Graph OAuth and a manual canary succeed. |
| 7 | Version and timezone naming drift | production-verified / local-verified | Production dispatch RPCs target v14/v12 canonical sources; config maps aliases to those sources; dashboard returns `Asia/Riyadh` and `03:30`, and UI labels that value as Riyadh time. |
| 8 | Grok chat agents are undescribed, duplicated, and overlap writes | external-blocked | One Grok Bot window was detected, but read-only state capture ended `aborted`. No external agent was changed. A successful inventory and explicit approval are required before stopping or merging agents. |
| 9 | Raw JWTs in cron commands | production-verified | Production check found zero active cron commands containing raw JWTs after Vault migration. |
| 10 | RLS disabled on nine public tables | production-verified | All nine have RLS; five internal tables are service-only and four operational tables have company-scoped policies. |
| 11 | No operational failure alerts | production-verified | Deduplicated task alerts cover recent failures, stalled jobs, and stale/error traffic mail every ten minutes. |
| 12 | Shared machine identity and weak provenance | production-verified / rollout-prepared | Nine generated Vault identities are live. The local rollout adds four identities (system audit, invoices, reminders, traffic mail), policy/lease enforcement, and request-level audit events without secret values. |

## Verification evidence

- حزمة Vitest الكاملة نجحت 1504/1504 عبر 195 ملفاً، ومنها 61 اختباراً لسلوك بوابة تقاضي.
- مصفوفة الأخطاء نجحت 154/154 بلا معرف مكرر أو دليل تنفيذي مفقود.
- TypeScript application and node configurations passed.
- Production Vite build passed after the application changes.
- Modified Edge TypeScript parses successfully with esbuild (`EDGE_PARSE_OK`).
- The company-scoped contract-term candidate SQL was executed read-only against production and returned only the requested company.
- Every prepared migration has a matching rollback; operational rollbacks retain historical audit evidence.

## تدقيق المطالب التشغيلية السبعة الأصلية

هذه الحالة تفصل عمداً بين اكتمال التطوير وبين وجود الحاجز على الإنتاج. فحص
`npm run agents:verify-safety` بتاريخ 28 أغسطس 2026 أعطى `14/95` شروط ناجحة
(`ready: false`)؛ لذلك لا تُعامل الهجرات المحلية كحماية إنتاجية بعد.

أثبتت مطابقة المحتوى أن سبع قدرات منشورة تحت أرقام مختلفة، وأن الفجوة الفعلية
محصورة في `integrity_guard_pack` و`agent_safety_kernel` و`failure_containment`.
انظر `production-migration-reconciliation.md`.

| المطلب | الفرع المحلي | الإنتاج الحالي | بوابة الاكتمال |
|---|---|---|---|
| ربط عقد المجلد/اللوحة ونسخة العقد الموقعة | مكتمل: canonical link لا ينقل الملف، وربط النسخة المطابقة يصبح ثابتاً ولا يعتمد على اللوحة وحدها | `contract_document_canonical_links` ونواة evidence الجديدة غير موجودتين | نشر `20260827152147` ثم هجرتي safety/containment وفحص النسخ القائمة |
| حالة الأسطول من الإشغال الحي | مكتمل: active/legal يبقي المركبة مشغولة، ولا تحرير بلا عودة مثبتة | توجد ضوابط أقدم، لكن حزمة التكامل الجديدة لم تُقبل عبر فاحص النشر بعد | canary لحالات active/legal/returned ثم فحص عدم وجود مركبتين شاغلتين |
| تطبيع اللوحة والرقم الشخصي ومنع التكرار | مكتمل مع فشل preflight إذا كانت البيانات القديمة متعارضة | RPC `normalize_national_id` الجديدة غير موجودة | تنظيف التعارضات إن ظهرت ثم unique index/trigger واختبار إدخال مكرر |
| فاتورة بلا عقد، دفعة بلا تخصيص، وربط خاطئ | مكتمل: findings review-only وحواجز DB تمنع علاقات شركة/عميل/عقد متناقضة | حزمة `integrity_guard_pack` غير منشورة | نشر الحراس وتشغيل تقرير read-only قبل تمكين أي repair |
| تطابق القضية والعقد وتحديث كاش المتعثرين من الحساب الحي | مكتمل: القضية ترث عميل العقد، والـ cron شركة-محدد | دالة `update_delinquent_customers` موجودة، أما حارس القضية الجديد فلم يثبت نشره | نشر الحارس ثم canary قضية متطابقة ومحاولة تعارض مرفوضة وفحص cron |
| إغلاق المراجعات القديمة دون توليد findings | مكتمل: close-only، نافذة غياب تشغيلين، ولا INSERT إلى tasks/findings | RPC `close_stale_system_audit_reviews_v1` غير موجودة | نشرها وتشغيل dry-run/شركة واحدة والتحقق أن `created=0` و`refreshed=0` |
| تصريف/إقفال المراجعات القديمة فقط | نفس مسار close-only؛ لا يوجد وكيل ماسح داخله | غير منشور | نفس البوابة السابقة مع dedupe وإعادة فتح finding إذا عاد فعلياً |

## Remaining completion gates

1. Secure Microsoft Graph configuration, followed by one manual status/sync check before scheduling the governed v2 mail invoker; the old MOI shared secret must not be restored.
2. A successful read-only Grok Bot inventory before changing any external Grok agent; Grok remains allowed as an additional mail layer.
3. Two observed nightly cycles after rollout before any separate deletion of old Edge release slugs.
