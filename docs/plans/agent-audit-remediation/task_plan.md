# Agent Audit Remediation — Task Plan

## Goal

إغلاق المشكلات المثبتة في تقرير تدقيق الوكلاء وبيانات الإنتاج، مع حماية بيانات الشركات، منع التشغيل أو الكتابة المكررة، وإتاحة تحكم تشغيلي ومراقبة يمكن الاعتماد عليهما.

## Scope rules

- لا تُعدَّل ملفات المذكرة القانونية أو أعمال المستخدم غير المرتبطة بهذه المعالجة.
- كل تغيير في قاعدة البيانات له migration وrollback مطابقان.
- لا يُنشر تغيير إلى الإنتاج قبل فحص الأثر، واختبار محلي مناسب، وdry-run عندما يكون متاحاً.
- لا تُحذف بيانات تاريخية؛ تُعزل أو تُؤرشف أو تُسحب صلاحياتها أولاً.
- لا تُكتب أسرار أو JWT داخل SQL أو Git أو سجلات التشغيل.

## Phases

| Phase | Deliverable | Status |
|---|---|---|
| 0 | تصميم، خط أساس، مصفوفة مخاطر وخطة رجوع | completed |
| 1 | RLS/Grants آمنة وإزالة الأسرار المضمنة من cron | completed |
| 2 | مزامنة مراجعات الوكيل من الخادم، idempotent ومقفلة | production-verified; 2,643 open tasks linked |
| 3 | مالك تشغيل + pause/cancel/kill switch + فحص العامل | production-verified |
| 4 | منع تداخل الوكلاء والكتابات المكررة وفصل أوقات الحراس | production-verified |
| 5 | تحويل حالات تقاضي التي تحتاج تدخلاً إلى مهام قابلة للمتابعة | production-verified; 15 tasks linked |
| 6 | تنبيهات ومراقبة وتشغيل استقبال البريد المروري بعد فحص الإعداد | alerts production-verified; mail capability deployed, Graph schedule gated |
| 7 | هوية Vault مستقلة لكل وكيل مجدول + سجل استدعاء بلا أسرار | production-verified; 7 isolated identities |
| 8 | تنظيف الإصدارات القديمة، تحديث الوثائق، اختبارات ونشر متدرج | rollout applied; two-night observation and old-release deletion remain |

## Acceptance criteria

- لا توجد جداول تشغيلية مكشوفة في `public` بلا RLS أو سحب grants.
- لا تحتوي أوامر cron النشطة أو تعريفاتها المصدريّة على JWT خام.
- كل finding حالي يحتاج مراجعة يرتبط بمهمة واحدة فقط، ويمكن إعادة المزامنة بلا تكرار.
- يستطيع المستخدم المخوّل إيقاف الوكيل مؤقتاً أو طلب إلغاء run، والعامل يحترم الطلب بين الدفعات.
- لا يعمل مساران mutating على الكيان نفسه بلا قفل/ملكية واضحة.
- تظهر حالات Taqadi `needs_human` كعمل قابل للتعيين والتتبع.
- للتنبيهات قواعد واضحة للفشل، تراكم الطابور، وتعطل المجدول.
- لا يقبل أي وكيل مجدول السر المشترك القديم؛ لكل وكيل هوية Vault مستقلة وسجل استدعاء لا يحفظ السر.
- تمر اختبارات النوع والبناء والاختبارات المستهدفة ومراجعة الأمان قبل الإغلاق.

## Error log

| Time | Error | Resolution |
|---|---|---|
| 2026-08-27 | تعذر فتح `supabase.com/changelog.md` بسبب نوع المحتوى | استُخدم بحث وثائق Supabase الرسمي، ووثائق Scheduling Edge Functions وRLS وpg_net |
| 2026-08-27 | منع sandbox إنشاء `.git/index.lock` عند حفظ وثائق التصميم | تُطلب صلاحية Git المقيّدة لحفظ هذه الملفات الثلاثة فقط، دون إدراج تغييرات المستخدم الأخرى |
| 2026-08-27 | رُفض تفعيل مزامنة مهام المراجعة المجدولة على الإنتاج بسبب الإنشاء/الإلغاء واسع الأثر | فُصلت foundation للقراءة فقط عن التفعيل الكتابي؛ يلزم عرض preview عددي والحصول على موافقة صريحة قبل تشغيل الدفعة والـcron |
| 2026-08-27 | موصل SQL للقراءة لا يملك EXECUTE على preview RPC المقيدة بـservice_role | أُبقيت الصلاحية مقيدة كما ينبغي، واستُخرج الأثر نفسه باستعلام CTE للقراءة فقط |
| 2026-08-27 | فشل `rg` في PowerShell عند تمرير مسار migration يحتوي wildcard مباشرة | استُخدم مرشح `rg -g "20260711*.sql"` بدلاً من wildcard داخل المسار |
| 2026-08-27 | احتوى تعبير بحث مركب عن `profiles` على أقواس غير متوازنة | أُعيد البحث بتعبيرين نصيين بسيطين ثم جرى التحقق من مخطط `profiles` في ملف الأنواع |
| 2026-08-27 | لم يطابق أول patch لواجهات hook السياق المتوقع | قُسم التعديل إلى patchين صغيرين بعد قراءة الأسطر الفعلية، ثم مرّ فحص TypeScript |
| 2026-08-27 | مُنع esbuild داخل sandbox من قراءة `vitest.config.ts` | أُعيد الاختبار المستهدف بصلاحية تنفيذ مقيدة لـ`npx vitest run` فقط |
| 2026-08-27 | كان عدّ فحوص التحكم في الاختبار أعلى بواحد من الاستدعاءات الفعلية | صُحح الاختبار ليتحقق من 5 نقاط مباشرة و3 نقاط callback داخل الحفظ والإصلاح |
| 2026-08-27 | رفضت المراجعة الآلية تطبيق control plane على الإنتاج لغياب تفويض صريح بمفاتيح الإلغاء والطوارئ | أُبقيت الهجرة محلية ولم تُنشر الدوال أو الواجهة؛ سيُطلب إقرار صريح بالأثر التشغيلي قبل التطبيق |
| 2026-08-27 | رُفض استعلام يعرض مقتطفات أوامر cron لاحتمال احتوائها أسراراً | استُبدل باستعلام metadata فقط: الاسم، الجدول، الحالة؛ لم تُقرأ الأوامر أو الأسرار |
| 2026-08-27 | لا توجد قاعدة Supabase محلية لأن Docker daemon غير متاح | استُخدمت مطابقة مخطط الإنتاج للقراءة فقط، واختبارات static مستهدفة؛ سيبقى تطبيق migration نفسه هو فحص SQL الذري النهائي بعد الموافقة |
| 2026-08-27 | تكرر خطأ wildcard في مسار Windows أثناء فحص أمان migrations | ثُبت استخدام `rg -g '2026082709*.sql'` في الفحص التالي وسُجل الخطأ لمنع تكراره |
| 2026-08-27 | فشل patch مجمع لأن اسم حالة الاختبار الفعلي اختلف عن السياق المتوقع | لم يُطبّق patch جزئياً؛ قُسم إلى تعديلات صغيرة ثم تحقق كل تعديل على حدة |
| 2026-08-27 | تعذر على esbuild قراءة `vite.config.ts` داخل sandbox أثناء بناء الإنتاج | أُعيد `npm run build:ci` بصلاحية تنفيذ مقيدة ونجح البناء بالكامل |
| 2026-08-27 | رفض PowerShell pipeline مباشر بعد `foreach` أثناء فحص أزواج rollback | جُمعت النتائج أولاً في `$pairRows` ثم عُرضت؛ تأكد وجود rollback لكل migrations الاثنتي عشرة |
| 2026-08-27 | طُبق جزء من patch متعدد الملفات قبل أن يتوقف عند سياق مختلف في `contract-id-scanner` | قُرئت الملفات الثلاثة بعد الفشل، وثُبتت التعديلات المطبقة، ثم اكتمل الملف المتبقي في patch مستقل |
| 2026-08-27 | فشل تعبير `rg` مركب أثناء فحص دوال المصادقة بسبب اقتباس PowerShell | استُخدمت عدة أنماط `-e` مستقلة وتأكد اختفاء السر المشترك من ملفات Edge |
| 2026-08-27 | لا يتوفر Deno محلياً لفحص Edge Functions | استُخدم esbuild لتحليل الملفات التسعة مع external imports؛ احتاج التشغيل خارج sandbox ثم نجح `EDGE_PARSE_OK` |
| 2026-08-27 | اكتُشفت نافذة واحدة لتطبيق Grok Bot، لكن جلسة قراءة حالة التطبيق أُوقفت برسالة `aborted` | التزاماً بتعليمات التحكم بالتطبيق لم تُكرَّر محاولة الإدخال في هذه الجولة، ولم يُغيَّر أو يُعطَّل أي وكيل Grok؛ يلزم فحص جديد ناجح وموافقة صريحة قبل أي تغيير تشغيلي خارجي |
| 2026-08-27 | فشل أول تشغيل لاختبارات تقاضي لأن sandbox منع esbuild من قراءة `vitest.config.ts` | أُعيد التشغيل بصلاحية `npx vitest run` المقيّدة ونجحت اختبارات الهجرة والبوابة |
| 2026-08-27 | أعادت محاولة فحص Grok Bot اكتشاف النافذة وفتحها، لكن تغير حالة النافذة/إدخال المستخدم قاطع التقاط الحالة ثم أوقف الدور | لم تُرسل أي نقرة أو كتابة ولم يتغير أي وكيل؛ أُوقف التحكم بالتطبيق فور المقاطعة وفق تعليمات المهارة |
| 2026-08-27 | فشل تعبير `rg` مركب أثناء فحص `autoApply` بسبب اقتباس PowerShell | أُعيد الفحص بأنماط `-e` مستقلة؛ لم يبق السر المشترك أو `autoApply: true` في نطاق القطع الجديد |
| 2026-08-27 | رفضت صلاحيات الإنتاج `UPDATE cron.job` المباشر في هجرة تعطيل الوكلاء المتداخلين | استُبدل التعديل بـ`cron.alter_job` في الهجرة والـrollback، ثم طُبقت الهجرة بنجاح |
| 2026-08-27 | فشلت المحاولة الأولى لهجرة هويات Vault لأن PL/pgSQL لا يسمح بجمع row variable وقيمة أخرى في قائمة `INTO` واحدة | فُصل تحميل سجل الهوية عن قراءة سر Vault؛ بقيت الجداول السبعة متوقفة أثناء التصحيح ثم اكتمل القطع بنجاح |
| 2026-08-27 | توقعت ثلاثة اختبارات ثابتة صيغة `UPDATE cron.job` القديمة | حُدثت لتتحقق من `cron.alter_job` المسموح، ثم نجحت حزمة الوكلاء والبريد 47/47 |

## Production rollout evidence — 2026-08-27

- Preflight: zero active system-agent jobs, system-agent runs, or Taqadi filing writes.
- Review synchronization: 2,643 open linked review tasks; server sync scheduled every 15 minutes.
- Taqadi: 15 linked open tasks (12 safe retry candidates, 2 substantive party/data reviews, 1 final approval).
- Controls: five cancellation/ownership columns and eight service-only control/claim/finish functions are live.
- Overlap: `daily-audit-agent` and `safe-auto-repair` are inactive; legal guard runs at `20 3 * * *`.
- Identities: seven enabled registry rows, seven distinct Vault names, seven Vault-backed active schedules, zero legacy shared-secret references.
- Mail: state, idempotency, and notice tables plus synchronization lease are live with RLS; `ingest-traffic-mail` is deployed but intentionally unscheduled until Microsoft Graph secrets are configured. Grok remains an optional mail layer, not a core dependency.
- Verification: 47 targeted tests, TypeScript checks, and the production Vite build passed.
