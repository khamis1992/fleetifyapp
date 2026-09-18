# Agent Safety Production Migration Reconciliation

تاريخ الفحص: 28 أغسطس 2026. هذا المستند مبني على قراءة سجل المشروع المرتبط
`qwhunliohlkkahbspfiu` ونسخة `supabase migration fetch` معزولة؛ لم تُجرَ أي
كتابة على قاعدة الإنتاج.

## الخلاصة

التقرير المرفق كان محقاً في وجود فجوة إنتاجية، لكنه لم يعد دقيقاً في اعتبار كل
المكونات غير منشورة. سبع قدرات أساسية منشورة تحت أرقام ترحيل مختلفة أو على
مرحلتين. المفقود فعلاً هو ثلاث حزم فقط:

1. `20260827152147_integrity_guard_pack.sql`
2. `20260827204249_agent_safety_kernel.sql`
3. `20260828113000_agent_failure_containment_and_escalation.sql`

فحص `npm run agents:verify-safety` عند `2026-08-28T01:01:27.439Z` أعطى
`passed: 13`, `failed: 72`, `total: 85`, `ready: false`. لا تعني الـ 72 فشلاً
وجود 72 ترحيلاً ناقصاً؛ معظمها أعمدة وRPCs و37 سياسة وكيل و13 هوية آلة تعتمد على الحزم
الثلاث أعلاه.

## مطابقة المحتوى المحلي بالإنتاج

| القدرة المحلية | الحالة في الإنتاج | المطابقة / القرار |
|---|---|---|
| `26091101_legal_filing_readiness_guards` | منشورة على مرحلتين | الأساس `26112943`، والتشديد/الفهرس `26120655`. الفروقات الوظيفية في الأساس أُضيفت بالترحيل الثاني. |
| `26095500_harden_legal_filing_guard_privileges` | مطابقة بنيوياً | `26120655_harden_legal_filing_guard_privileges`؛ الفرق فقط empty statement أضافه fetch. |
| `27111617_repair_contract_vehicle_identity_integrity` | مطابقة بنيوياً | `27144751_repair_contract_vehicle_identity_integrity`. |
| `27152147_integrity_guard_pack` | غير موجودة | لا توجد بصمة ولا anchors لحارس الهوية/المال/canonical/close-only. يلزم نشرها. |
| `27155145_agent_owned_legal_filing_approval` | مطابقة بنيوياً | `27194329_agent_owned_legal_filing_approval`. |
| `27155633_fix_delinquent_customer_cron_company_scope` | مطابقة بنيوياً وبنفس الرقم | موجودة. |
| `27172506_automatic_formal_notice_agent` | مطابقة بنيوياً وبنفس الرقم | موجودة، ومعها فهارس FK في `27172747`. |
| `27200727_automatic_missing_contract_pdf_requests` | منشورة على مرحلتين | الأساس `27202216`، وصلاحية trigger للخدمة فقط في `27202602`. |
| `27203500_harden_missing_contract_pdf_trigger_function` | مطابقة بنيوياً | `27202602_harden_missing_contract_pdf_trigger_function`. |
| `27204249_agent_safety_kernel` | غير موجودة | لا جداول safety ولا RPC invocation v2 على الإنتاج. يلزم نشرها. |
| `28113000_agent_failure_containment_and_escalation` | غير موجودة | لا execution ledger ولا upload tokens ولا evidence lifecycle/aggregate health. يلزم نشرها. |

أداة المطابقة هي `npm run agents:audit-migration-history`. وهي تتجاهل الـ empty
SQL statements التي يعيد `migration fetch` تكوينها، وتعرض semantic candidates
للمقارنة اليدوية بدلاً من إعلان تطابق كاذب.

## بيان النشر الآمن

أُنشئت نسخة معزولة من سجل الإنتاج وأُضيفت إليها الملفات الثلاثة فقط، ثم نُفذ:

```text
npx supabase db push --dry-run --include-all
```

والنتيجة اقترحت الملفات الثلاثة أعلاه فقط. هذا يثبت سلامة **اختيار** الملفات،
ولا يعد تطبيقاً أو canary ولا يثبت خلو البيانات القديمة من التعارضات.

لا تستخدم `supabase migration repair` عشوائياً، ولا تعِد تطبيق الملفات السبعة
المطابقة. الملفات ذات الختم المختلف يجب أن تبقى موثقة بهذه الخريطة؛ تغيير
history يدوياً يحتاج قراراً منفصلاً ونسخة احتياطية.

## بوابات التنفيذ

1. إيقاف كل جدول وكيل يكتب، والتأكد أن تقاضي ليس داخل عملية رفع.
2. تطبيق الملفات الثلاثة بالترتيب أعلاه داخل مسار migrations المتحكم به.
   أول ملف يفشل ذرياً إذا اكتشف أرقام هوية متطابقة بعد التطبيع، فلا يجوز تجاوز
   الفشل أو حذف preflight.
3. نشر Edge Functions التي تستخدم `_shared/agent.ts` ووكلاء PDF/الإعذار/الإسناد.
4. تشغيل `npm run agents:verify-safety`؛ لا استئناف إن لم تكن `ready: true`.
5. تستدعي بوابة الصحة `get_agent_safety_data_health_v1` داخل PostgreSQL وتعيد
   أعداد التعارضات فقط. لا تُنقل أرقام الهوية أو مسارات الملفات للعملية المحلية.
6. canary لشركة واحدة لكل كاتب، ثم فحص ledger/postcondition وعدم تكرار واتساب
   أو وجود أكثر من دليل عقد active/matched.

## ما لم يُنفذ بعد

- لم تُطبق الترحيلات الثلاثة على الإنتاج.
- لم تُنشر إصدارات Edge الجديدة ضمن هذه المراجعة.
- لم يُستأنف أي جدول مجدول ولم يُنفذ canary كتابي.
- يتطلب ذلك اعتماداً تشغيلياً صريحاً لأن الإجراء يغير مخطط الإنتاج وسلوك الوكلاء.
