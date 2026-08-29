# تغطية أخطاء وكلاء Fleetify

**التاريخ:** 28 أغسطس 2026  
**الغرض:** تحويل تقرير حادثة ربط عقد ألياس إلى ضوابط تنفيذية قابلة للاختبار، مع حل نظامي لكل سيناريو بدلاً من الاعتماد على تعليمات الوكيل.

## قاعدة القبول

لا يعد السيناريو مغطى إلا إذا وُجد واحد على الأقل من الآتي: قيد/trigger في قاعدة البيانات، بوابة RPC ذرية، منع في التكامل الخارجي مع إثبات لاحق، أو مسار تصعيد دائم ومكرر بأمان. فحص الواجهة أو prompt وحده لا يُعد حاجزاً.

الحالة في هذا المستند تصف **الفرع المحلي**. الهجرات الجديدة ليست دليلاً على أن الإنتاج حُدّث. فحص الإنتاج للقراءة فقط عند `2026-08-28T02:05:56.168Z` أعطى `passed: 14`, `failed: 81`, `total: 95`, `ready: false`. النجاحات الحالية تشمل اتصال PostgREST، سجل هويات الاستدعاء، تسع هويات آلة شركة-محددة، تحديث كاش المتعثرين، وتنبيه التشغيل التجميعي؛ أما نواة الأمان، الربط القانوني canonical، تطبيع الهوية الجديد، إغلاق المراجعات close-only، سجل أوامر واتساب المحكوم، وسياسات تعطيل المسارات العامة القديمة فليست منشورة. مطابقة migration history أثبتت أن طلب PDF والإعذار والجاهزية القانونية الأساسية منشورة تحت أختام مختلفة، بينما الفجوة الفعلية ثلاث حزم موثقة في `agent-audit-remediation/production-migration-reconciliation.md`. أمر القبول المعتمد هو `npm run agents:verify-safety` ويجب أن ينتهي بـ `ready: true` بعد النشر.

تضم المصفوفة `156` سيناريو خطأ. يفحص الأمر `npm run agents:audit-scenarios` تفرد المعرفات ووجود مرجع تنفيذي قابل للتتبع لكل صف.

## مطابقة التقرير المرفق

| جزء التقرير | التغطية الحالية | الملاحظة |
|---|---|---|
| A1–A6: ربط المستند والهوية | DOC-01 إلى DOC-21 | أضيفت حماية لم يذكرها التقرير: منع تبديل صف الدليل أو bytes التخزين بعد `matched` وحجر التعارضات القديمة بلا تخمين |
| B1–B6: الجاهزية وتقاضي | TAQ-01 إلى TAQ-17 | الاعتماد آلي كما طلب المستخدم، لكن CAPTCHA/PIN/غياب نوع هوية يتوقف fail-closed لأن التخمين ليس حلاً آمناً |
| C1–C5: واتساب والإشعارات | PDF-01 إلى PDF-16 وNOT-01 إلى NOT-14 | التصعيد 48h، webhook، رابط توكن أحادي الاستخدام، وcooldown كلها مغطاة |
| D1–D3: الأخطاء المالية | FIN-01 إلى FIN-18 | الكاتب المالي القديم متقاعد؛ العلاقات المتناقضة تُرفض، والحالات الملتبسة تبقى review-only |
| E1–E4: الحوكمة | GOV-01 إلى GOV-27 | هوية مستقلة، kill switch، leases، budgets، execution ledger، عزل الشركة، كتالوج كامل، وتنبيهات deduplicated وفحص صحة بلا تسريب PII |
| طبقة الاختبار/staging | اختبارات محلية + parser + production canary gate | لا يوجد مشروع staging خارجي مثبت في المستودع؛ لذلك يمنع runbook الاستئناف قبل canary شركة واحدة و`ready: true` |

تنبيه زمني: قول التقرير إن مسار طلب PDF الأساسي «غير مطبق» أصبح غير دقيق جزئياً؛ جداول الطلبات والمستلمين والتسليمات موجودة الآن على الإنتاج. غير المنشور هو طبقة التوكن الآمن/التصعيد ونواة الأمان والربط القانوني الجديدة.

## 1. الهوية والمستندات

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| DOC-01 | ربط ملف عقد سابق لأنه يحمل اللوحة نفسها | اللوحة مرشح فقط؛ `matched` يتطلب هوية دقيقة، وربط المستند يصبح ثابتاً | `agent_safety_kernel.sql`، `legal-contract-identity.ts` |
| DOC-02 | نقل `contract_id` لمستند موقّع بعد رفعه | trigger يرفض نقل المستند بين العقود | `guard_signed_contract_evidence_integrity_v1` + `trg_00_guard_signed_contract_binding_v1` |
| DOC-03 | إعادة استخدام `file_path` نفسه لعقدين | trigger يرفض مسار التخزين المعاد استخدامه | `SIGNED_CONTRACT_FILE_REUSED_ACROSS_CONTRACTS` |
| DOC-04 | رفع مباشر من سكربت يتجاوز الواجهة | العمود يبدأ `pending` ولا يدخل الجاهزية قبل التحقق، والحارس يمنع ترقية `matched` بلا دليل هوية مباشر | `20260810083154_add_legal_contract_identity_verification.sql` + `guard_signed_contract_evidence_integrity_v1` |
| DOC-05 | قبول `pending` أو `unverified` كعقد قانوني | اختيار الواجهة وRPC الجاهزية يقبلان `matched` فقط | `contractDocumentSelection.ts`، `get_legal_transfer_readiness_v1` |
| DOC-06 | بقاء OCR غير محسوم إلى الأبد | انتهاء بعد 24 ساعة، `expired_unverified` ثم quarantine وطلب نسخة | `expire_unverified_signed_contracts_v1` |
| DOC-07 | OCR ضعيف يطابق اسماً بالخطأ | تحت 0.70 يلزم رقم هوية دقيق، وإلا يرفض trigger المطابقة | `LOW_OCR_QUALITY_REQUIRES_EXACT_ID_EVIDENCE` |
| DOC-08 | الاسم متشابه جزئياً فقط | النتيجة `unverified` لا `matched` | `assessLegalContractIdentity` واختباراته |
| DOC-09 | الاسم مطابق والرقم الشخصي مختلف | التعارض الأقوى يحول المستند إلى `mismatch` | `legal-contract-identity.ts` |
| DOC-10 | وجود نسختين matched فعالتين | إيقاف الجاهزية؛ لا اختيار صامت للأحدث | `ambiguous_multiple_active_matched_documents` |
| DOC-11 | إلغاء نسخة قديمة بلا تحديد بديل | `superseded` يتطلب successor فعالاً مطابقاً لنفس العقد والشركة | `SUPERSEDED_EVIDENCE_REQUIRES_SUCCESSOR` |
| DOC-12 | عزل مستند بلا سبب | quarantine يتطلب سبباً مسجلاً | `QUARANTINED_EVIDENCE_REQUIRES_REASON` |
| DOC-13 | ملف صحيح مرتبط بشركة أخرى | كل الاستعلامات والحواجز تتحقق من `company_id` والعقد معاً | `lawsuit_preparations_direct_source_document_fkey` + RLS |
| DOC-14 | `sourceDocumentId` مفقود في payload تقاضي | payload غير جاهز ولا يُرسل | `validate_taqadi_filing_payload_v1` |
| DOC-15 | `sourceDocumentId` مشوه وليس UUID | يعامل كمفقود بدلاً من إسقاط العملية بخطأ cast | `document ->> 'sourceDocumentId'` + UUID regex |
| DOC-16 | تجهيز الدعوى يشير لمستند عقد آخر | FK مركب `(company_id,contract_id,source_document_id)` | `lawsuit_preparations_direct_source_document_fkey` |
| DOC-17 | حذف مستند استُخدم كمصدر قضية | `ON DELETE RESTRICT` يحفظ الدليل | `lawsuit_preparations_direct_source_document_fkey` |
| DOC-18 | وثيقة alias لعقد مدمج | لا تقبل إلا برابط canonical مؤكد بنفس العميل/المركبة/التاريخ ومن دون حقائق مالية على alias | `contract_document_canonical_links` |
| DOC-19 | تغيير مسار الملف أو نوع المستند بعد نجاح مطابقة الهوية | صف الدليل الموقّع يصبح ثابت الشركة والعقد والمسار والنوع؛ الاستبدال يتطلب صفاً ورفعاً وفحصاً جديداً | `SIGNED_CONTRACT_EVIDENCE_IMMUTABLE` |
| DOC-20 | استبدال bytes خلف نفس مسار التخزين أو حذفها مع بقاء الصف `matched` | سياسات Storage تمنع UPDATE/DELETE لأي نسخة موقعة مطابقة؛ الأدلة المعتمدة append-only | سياسات `storage.objects` في هجرة containment |
| DOC-21 | بيانات الإنتاج القديمة تحتوي عدة نسخ `matched/active` ولا يوجد رقم هوية أو مرجع دعوى يميز إحداها بأمان | حجر جميع المرشحين المتعارضين وفتح طلب PDF موثق؛ لا يختار النظام الأحدث أو الأعلى جودة بالحدس | `20260828141115_close_agent_safety_production_gaps.sql` |

## 2. طلب PDF وواتساب والخصوصية

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| PDF-01 | لا توجد نسخة موقعة | إنشاء طلب دائم وإرسال تلقائي للأرقام الثلاثة | `missing-contract-pdf-agent` |
| PDF-02 | إعادة تشغيل الوكيل ترسل الطلب بلا نهاية | صف طلب واحد مفتوح + تسليم مستقل لكل مستلم + حد 5 محاولات | migration `20260827200727` |
| PDF-03 | إرسال بيانات العميل في رسالة داخلية | الرسالة لا تحتوي اسم العميل ولا اللوحة | `message.ts` واختباره |
| PDF-04 | رابط الرفع يكشف الشركة/العقد في URL | توكن عشوائي 256-bit، والمخزن هو SHA-256 فقط | `missing_contract_pdf_upload_tokens` |
| PDF-05 | استخدام رابط الرفع مرتين | claim ذري ثم consume مرة واحدة | `claim_missing_contract_pdf_upload_token_v1` + `consume_missing_contract_pdf_upload_token_v1` |
| PDF-06 | رفعان متزامنان بالتوكن نفسه | claim nonce يمنع الطلب الثاني لمدة محدودة | `upload_already_in_progress` |
| PDF-07 | رفع ملف ليس PDF | تحقق MIME وامتداد وتوقيع `%PDF-` | `upload-missing-contract-pdf/index.ts` |
| PDF-08 | ملف ضخم أو استنزاف تخزين | سقف 15MB | `MAX_FILE_BYTES` |
| PDF-09 | فشل DB بعد رفع الملف | حذف تعويضي للمستند ومسار التخزين اللذين أنشأهما الطلب نفسه فقط | `upload-missing-contract-pdf/index.ts` |
| PDF-10 | رفع نسخة خاطئة ثم إعادة رسالة فوراً في حلقة | cooldown ساعتان، ثم 24 ساعة بعد 3 mismatches | `track_missing_contract_pdf_mismatch_v1` |
| PDF-11 | ثلاث نسخ خاطئة متتالية | مهمة عاجلة للمراجعة اليدوية مع dedupe | `contract-pdf-repeated-mismatch:` |
| PDF-12 | لم يصل PDF خلال 48 ساعة | تصعيد دائم، ثلاث مرات كحد أقصى كل 48 ساعة | `escalate_stale_missing_contract_pdf_requests_v1` |
| PDF-13 | الطلب اكتمل لكن مهمة التصعيد بقيت مفتوحة | إغلاق task مرة واحدة وتسجيل `escalation_closed_at` | `escalation_closed_at` |
| PDF-14 | مزود واتساب يقبل بعض المستلمين فقط | كل مستلم له نتيجة مستقلة؛ لا تعميم نجاح المجموعة | `missing_contract_pdf_deliveries` + `missing-contract-pdf-agent/index.ts` |
| PDF-15 | انقطاع الوكيل بعد claim | استرجاع المطالبات العالقة بعد المهلة وإعادة آمنة | `Recovered a stale delivery claim` في `missing-contract-pdf-agent/index.ts` |
| PDF-16 | فشل ملف صالح للتحقق ثم بقي الرابط محجوزاً 10 دقائق | تحرير claim بالـ nonce في مسار الخطأ كي يستطيع صاحب الرابط المحاولة فوراً | `release_missing_contract_pdf_upload_token_claim_v1` |
| PDF-17 | بيانات مزود واتساب ثابتة داخل JavaScript المتصفح | لا توجد بيانات مزود في الواجهة؛ العميل يستدعي Edge فقط | `whatsappWebSender.ts` + اختبار inventory |
| PDF-18 | endpoint مستندات يقبل رقماً وPDF عشوائياً ويرفعه إلى bucket عام | المسار القديم متقاعد 410 ولا يرفع أو يرسل أي ملف | `send-whatsapp-document/index.ts` |
| PDF-19 | مستخدم عادي يرسل رسالة قانونية أو مالية بأي غرض | كل غرض له أدوار مسموحة ويُتحقق من JWT الحقيقي | `purposePolicy` + `authorizePrivilegedCompanyActor` |
| PDF-20 | تمرير قضية/عميل من شركة أخرى مع `companyId` صحيح | Edge يثبت ملكية الكيان للشركة قبل إنشاء أمر الإرسال | `assertEntityOwnership` |
| PDF-21 | نقر مزدوج أو إعادة HTTP ترسل نفس النص مرتين | مفتاح request فريد ومفتاح dedupe مشتق لخمس دقائق مع قيدين فريدين | `outbound_whatsapp_commands` |
| PDF-22 | سجل التدقيق نفسه يسرّب الرقم أو نص الرسالة | لا يخزن إلا آخر 4 أرقام وSHA-256 للرقم والنص | `recipient_last4`, `recipient_hash`, `message_hash` |
| PDF-23 | المزود قبل الرسالة لكن تحديث سجل التدقيق فشل، ثم أعاد المستخدم الإرسال | يبقى الأمر pending فيمنع dedupe الإرسال الثاني ولا يُعلن نجاحاً غير موثق | `completeCommand` + حالة `pending` |
| PDF-24 | مفاتيح المزود مخزنة في `whatsapp_settings` وتصل للمتصفح عبر `select('*')` | تصفير القيم التاريخية وtrigger يرفض إعادة تخزينها؛ المصدر الوحيد Edge secrets | `reject_browser_whatsapp_credentials_v1` |
| PDF-25 | endpoint يتلقى PDF قانونياً خاماً ويستخدم service role ثم يعيد رابط bucket عام بلا قضية أو عقد | endpoint اليتيم متقاعد 410؛ الرفع محصور في مسارات العقد/القضية التي تثبت الملكية | `LEGACY_PUBLIC_LEGAL_DOCUMENT_UPLOAD_RETIRED` |

## 3. الإعذار القانوني

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| NOT-01 | رفع دعوى بلا إعذار سابق | وكيل تلقائي ينشئ ويرسل إعذار الدين المستحق | `legal-notice-agent` |
| NOT-02 | الإرسال لرقم غير صالح | تطبيع قطري ورفض غير الصالح، بلا تخمين رقم | `normalizeWhatsAppPhone` |
| NOT-03 | سُدد الدين قبل الإرسال | إعادة قراءة الفواتير والرصيد الحي ثم إلغاء job | `get_automatic_formal_notice_live_invoices_v1` |
| NOT-04 | تغير المبلغ بين الإنشاء والإرسال | لا يرسل النص القديم؛ يفشل مؤقتاً ويعاد بناؤه في التشغيل التالي | `Live balance changed before dispatch` |
| NOT-05 | إعادة نفس الإعذار | مفتاح cycle فريد لكل عقد ونوع إعذار | `legal_notice_agent_jobs` unique cycle |
| NOT-06 | timeout بعد قبول المزود | حفظ provider message id قبل finalize؛ التشغيل التالي لا يعيد الإرسال | مسار `provider_message_id` |
| NOT-07 | اعتبار قبول المزود تسليماً | `sent` منفصلة عن `delivery_confirmed` | webhook + `formal_notice_proof` |
| NOT-08 | webhook مكرر/متأخر | انتقالات رتيبة idempotent ولا ترجع حالة التسليم | `ultramsg-ack-webhook` |
| NOT-09 | مزود واتساب مربوط webhook مختلف | الوكيل يوقف الإرسال بدلاً من خطف تكامل قائم | `ensureAcknowledgementWebhook` |
| NOT-10 | تكرار فشل المزود بلا سقف | حد ثلاث محاولات ثم يبقى فشلاً مرئياً | `Number(existing.attempts || 0) >= 3` |
| NOT-11 | سجل يقول sent قبل إثبات النتيجة | mutation تسجل فقط بعد provider id ونجاح finalize | `dispatch_formal_payment_notice` postcondition |
| NOT-12 | فشل جزئي يختفي كنجاح كامل | التشغيل ينتهي `NOTICE_PARTIAL_FAILURE` وHTTP 207 | `finishAgentExecution` |
| NOT-13 | وكيل التذكيرات يقرأ فواتير كل الشركات لأن `companyId` غير مطلوب | كل تشغيل يتطلب شركة مصرحاً بها ويضيف مرشح الشركة قبل تحميل أي فاتورة | `.eq("company_id", companyId)` في `process-payment-reminders` |
| NOT-14 | أربع وظائف cron قديمة تستدعي bulk sender متقاعداً فتفشل دائماً أو تعود لاحقاً لتكرر الرسائل | إلغاء الوظائف الأربع وجدولة pipeline واحدة ذات claim/finalize دائم | `whatsapp-reminder-day10-legal-action` + `claim_automated_invoice_reminder_delivery` |

## 4. تقاضي ورفع الدعوى

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| TAQ-01 | snapshot قديم للمبالغ/المذكرة | freshness hash والتحقق من الحالة المجمدة قبل التنفيذ | migration `20260827155145` |
| TAQ-02 | مستخدم والوكيل يبدآن نفس الرفع | job idempotency + claim/lease | `taqadi_filing_jobs` |
| TAQ-03 | نوع هوية غير موجود في النافذة | allowlist؛ إن لم يوجد تطابق يتوقف بسبب محدد | `inferTaqadiIdType`, party workflow |
| TAQ-04 | تعبئة الحقول بترتيب خاطئ | selectors مسماة + قراءة راجعة قبل الانتقال | `taqadi-page.ts` |
| TAQ-05 | تغير واجهة المحكمة | selector mismatch يوقف المهمة ويحفظ screenshot/event | `selector-healer.ts` + `diagnostics.ts` |
| TAQ-06 | CAPTCHA | لا محاولات عمياء؛ يتوقف كحالة تدخل خارجي | `CAPTCHA_REQUIRED` في `taqadi-page.ts` |
| TAQ-07 | PIN خاطئ ثلاث مرات | يمنع الإرسال الآلي الثالث؛ الحد 2 لكل process | `SMART_CARD_PIN_RETRY_LIMIT` |
| TAQ-08 | الوكيل يتوقف عند زر الاعتماد | الاعتماد server-owned وآلي بعد اجتياز كل postconditions | `approve_taqadi_reviewed_legal_file_v1` |
| TAQ-09 | نقر الاعتماد ولم يصل إيصال | لا تسجل القضية submitted بلا رقم/إيصال نهائي | `recover_receipt` + `filing_receipt` |
| TAQ-10 | انقطاع بعد الإرسال وقبل حفظ النتيجة | يتحول إلى تحقق من الإرسال ولا ينفذ retry أعمى | `verify_submission` + `restart-recovery.ts` |
| TAQ-11 | مصدر العقد تغير بعد إنشاء job | payload source id يعاد التحقق منه عند حد DB | `validate_taqadi_filing_payload_v1` |
| TAQ-12 | قضية مرتبطة بعميل غير عميل العقد | trigger يرفضها ويملأ العميل فقط من العقد | `guard_legal_case_contract_identity` |
| TAQ-13 | endpoint قديم ينشئ قضية من مبلغ متأخر مباشرة بلا إعذار ولا عقد موقع ولا جاهزية تقاضي | endpoint متقاعد ويرجع 410؛ البديل يمر بالإعذار ثم بوابة تقاضي | `Legacy automatic legal-case trigger retired` |
| TAQ-14 | واجهة `auto-submit-taqadi` تقبل payload حر وتفتح المتصفح بلا ربط بالقضية أو مستند canonical | الواجهة متقاعدة 410؛ الرفع الوحيد عبر `taqadi_filing_jobs` وبوابات PostgreSQL | `LEGACY_TAQADI_BYPASS_RETIRED` في `auto-submit-taqadi` |
| TAQ-15 | وكيل Manus يرسل بيانات الدعوى لطرف خارجي بلا تحقق من الشركة والهوية والإعذار | الواجهة متقاعدة 410 ولا تنشئ مهمة خارجية؛ البديل هو العامل المحلي المحكوم | `LEGACY_TAQADI_BYPASS_RETIRED` في `manus-taqadi` |
| TAQ-16 | واجهة Browserbase القديمة تنشئ جلسة من بيانات خام وتتجاوز طابور الاعتماد الآلي | الواجهة متقاعدة 410؛ الاستئناف والإرسال النهائي داخل عامل تقاضي المقيّد | `LEGACY_TAQADI_BYPASS_RETIRED` في `taqadi-automation` |
| TAQ-17 | صف مهمة تقاضي يحمل `contract_id` صحيحاً لكن لا يحمل مرجع تجهيز الدعوى أو يحمل مستنداً من عقد آخر | عمودان مباشران مع FK مركب وtrigger يشتق الرابط من payload ثم يرفض المهمة قبل إدخالها إن لم يكن المستند `matched/active` لنفس الشركة والعقد | `hydrate_and_guard_taqadi_filing_links_v1` |

## 5. المال والفوترة والتحصيل

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| FIN-01 | فاتورة بلا عقد | المدقق يفتح finding؛ لا يربط إلا من دليل دفعة مباشر غير ملتبس | `invoice.missing_contract_with_payment_evidence` |
| FIN-02 | دفعة مكتملة بلا تخصيص | تبقى unallocated/customer advance، ولا تعتبر فاتورة مدفوعة | `payment.allocation_missing` في `systemAuditAgentRules.test.ts` |
| FIN-03 | تخصيص دفعة لفاتورة عقد آخر | رفض DB للشركة/العميل/العقد | `validate_payment_allocation_row`, integrity guard |
| FIN-04 | payment.invoice_id يخالف contract_id | trigger يرفض ويستكمل القيم الناقصة فقط من نفس الفاتورة | `guard_payment_invoice_identity` |
| FIN-05 | allocation يشير لفاتورة محذوفة | رفض الكتابة وكشف السجل القديم كـ finding | `payment.allocation_broken_invoice_target` |
| FIN-06 | تخصيص يتجاوز رصيد الدفعة أو الفاتورة | RPC ذرية تقفل الصفوف وتتحقق من المتبقي | `replace_payment_invoice_allocations` |
| FIN-07 | إعادة محاولة تنشئ قيداً مزدوجاً | مفاتيح idempotency وبوابات journal ذرية | `idempotency_key` في بوابات الإصلاح المالي |
| FIN-08 | قيد غير متوازن | لا يقبل إلا سطرين فأكثر وتساوي المدين والدائن | `journal-entry-ai-reviewer/index.ts` + `system_agent_apply_financial_repair` |
| FIN-09 | الترحيل على حساب رئيسي | رفض `is_header=true` أو مستوى أقل من 3 | `is_header = false` + `account_level >= 3` |
| FIN-10 | due date بنمط M+1 القديم | trigger يفرض اليوم الأول من شهر الفاتورة نفسه | `trg_enforce_invoice_date_first_of_month` |
| FIN-11 | إصلاح مالي واسع من `safe-auto-repair` القديم | المسار متقاعد ويرجع 410؛ rollback التاريخي فقط متاح | `safe-auto-repair/index.ts` |
| FIN-12 | وكيلان ماليان يكتبان الصفوف نفسها | الكاتب الحي الوحيد هو system-audit versioned control plane | `20260827095000_retire_overlapping_legacy_mutating_agents.sql` + `system_mutation` |
| FIN-13 | أكثر من 100 إصلاح في تشغيل تدقيق | trigger يوقف run عند mutation budget | `trg_guard_system_agent_repair_budget` |
| FIN-14 | إصلاح بلا before/after مختلفين | trigger يرفضه | `SYSTEM_AGENT_REPAIR_REQUIRES_DISTINCT_BEFORE_AFTER` |
| FIN-15 | شروط PDF تختلف عن الرسم المالي وفيه دفعات | لا auto-apply؛ مهمة مراجعة مالية | `buildReconciliationScenario` |
| FIN-16 | فشل بعد نجاح جزئي | بوابات الإصلاح معاملات ذرية وrollback metadata | `system_agent_repairs` |
| FIN-17 | مولد الفواتير المجدول يعمل باسم لا يطابق policy أو بلا شركة فيفلت من kill switch ويعالج كل الشركات | توحيد الهوية إلى `generate-monthly-invoices`، إلزام الشركة، وهوية Vault مستقلة وجدولة محكومة | `agent_secret_generate_monthly_invoices` |
| FIN-18 | مراجع استيراد إكسل يكتب versions/findings/runs خارج kill switch أو يتداخل مع مراجع مالية أخرى | مرحلتا plan/complete تمران بهوية `excel-import-ai-reviewer` ونطاق الشركة وlease مجموعة المراجعة المالية وتغلقان التشغيل نجاحاً أو فشلاً | `authorizeGovernedAgent` في `excel-import-ai-review` |
| FIN-19 | cron الإهلاك يستدعي endpoint غير موجود فيتعطل الإهلاك بصمت | endpoint محكوم جديد يستدعي RPC الذرية ويتحقق من القيد والتراكم ثم يسجل mutation | `monthly-vehicle-depreciation` + `process_vehicle_depreciation_monthly_agent_v1` |
| FIN-20 | backfill تاريخي يعالج آلاف العقود بسر مشترك أو يعاد تشغيله بلا حوكمة | JWT مدير/محاسب + policy/lease + سقف 200 لكل طلب، ولا سر مشترك | `historical-invoice-backfill` |

## 6. العقود والأسطول والعملاء والمخالفات

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| OPS-01 | عقد نشط ومركبته متاحة | حارس حالة الأسطول يعيد الاشتقاق من الإشغال الحي | `deriveVehicleStatus`/fleet guard |
| OPS-02 | عقد قانوني يحرر المركبة بلا تسليم | الحالة القانونية تبقى إشغالاً ما لم توجد عودة مثبتة | `20260827152147_integrity_guard_pack.sql` |
| OPS-03 | مركبة لها عقدان شاغلان | منع التفعيل المتعارض وكشفها كتعارض حرج | `20260827111617_repair_contract_vehicle_identity_integrity.sql` |
| OPS-04 | عقد بلا مركبة | finding؛ لا تخمين مركبة باللوحة | `system-audit-orchestrator/index.ts` |
| OPS-05 | اختلاف شكل اللوحة | تطبيع الأرقام والمسافات والرموز قبل المقارنة | `normalize_vehicle_plate` |
| OPS-06 | رقم شخصي عربي/فارسي/لاتيني مكرر | تطبيع إلى أرقام لاتينية ثم unique داخل الشركة | `normalize_national_id` + unique index |
| OPS-07 | duplicate detector يدمج بالاسم فقط | اقتراح مراجعة؛ الرقم الشخصي الدقيق هو الحاجز القاطع | policy `national_id_exact_or_review` |
| OPS-08 | موزع العقود يسجل نجاحاً بعد خسارة race | update مشروط ثم `select/maybeSingle`; لا سجل ولا عدّ بلا صف | `smart-contract-assigner` |
| OPS-09 | موزع العقود يغير دفعة ضخمة | سقف 25 للإسناد و10 لإعادة التوازن | `clampLimit` |
| OPS-10 | نقل عقد له اتصالات حديثة أثناء rebalance | يستبعد العقد ذا النشاط الحديث | `smart-contract-assigner/index.ts` |
| OPS-11 | بريد مخالفة مكرر | lock/dedupe بالمصدر قبل الكتابة | `20260827097000_lock_traffic_mail_synchronization.sql` |
| OPS-12 | أكثر من عقد يغطي تاريخ المخالفة | review؛ لا اختيار الأحدث تخميناً | `violation-inbox-processor/index.ts` |
| OPS-13 | استدعاء معالج العقد بلا مصادقة ثم تسجيل بيانات العميل والعقد الخام | يطلب `companyId` ومستخدماً مخولاً، ويمر عبر سياسة الوكيل، والسجل لا يحتوي بيانات العقد الخام | `authorizeGovernedAgent` في `intelligent-contract-processor/index.ts` |
| OPS-14 | تحويل رقم من 7–9 أرقام إلى قطر أو تفسير `08/09/2026` تلقائياً | لا تخمين؛ يقبل رقماً قطرياً واضحاً فقط ويرفض التاريخ ثنائي التفسير | `intelligent-contract-processor/validation.ts` + `intelligentContractProcessorValidation.test.ts` |
| OPS-15 | مبلغ سالب أو نص مثل `1-2` يتحول جزئياً إلى رقم صالح | parser يقبل رقماً كاملاً فقط بعد إزالة تنسيق العملة والفواصل، ويرفض السالب وInfinity | `validateAndFixAmount` |
| OPS-16 | الوكيل يغير القيم المقترحة رغم أن `autoApplyFixes` غير مطلوب | يحتفظ بالتصحيح كمقترح، ولا يغير `contract_data` إلا عند القيمة الصريحة true | `options.autoApplyFixes === true` |
| OPS-17 | تاريخ نهاية العقد أقدم من البداية رغم صلاحية كل تاريخ منفرداً | مقارنة التاريخين بعد التطبيع تضيف خطأ مانعاً | `تاريخ نهاية العقد يسبق تاريخ البداية` |
| OPS-18 | دمج عميل ينقل بعض الجداول ثم يفشل جدول لاحق ويترك هوية منقسمة | كل عمليات إعادة الربط وحالة العميل والمقترح تنفذ داخل RPC PostgreSQL واحدة؛ أي قيد يفشل يعيد المعاملة كلها | `apply_customer_merge_proposal_v1` |
| OPS-19 | مقترح OCR يعدّل العميل ثم يفشل تعديل العقد أو تحديث حالة المقترح، أو تغيّرت القيمة الحالية بعد المراجعة | RPC واحدة تقفل المقترح والعميل والعقد، تعيد فحص الشركة والهوية والثقة والقيم الحالية والحقول المسموحة، ثم تطبق الكل ذرياً أو تتراجع بالكامل | `apply_customer_id_scan_proposal_v1` |
| OPS-20 | مقترح OCR يحمل الحقل نفسه مرتين بقيمتين مختلفتين ويعتمد آخر ترتيب مصادفة | إعادة التحقق داخل RPC ترفض أي حقل مكرر قبل تنفيذ أي تحديث | `CUSTOMER_ID_PROPOSAL_DUPLICATE_FIELD` |
| OPS-21 | إيقاف cron لوكيل التدقيق القديم لكن بقاء وضع apply قابلاً للاستدعاء اليدوي | `daily-audit-agent` يسمح dry-run فقط ويرجع 410 لأي apply؛ الكاتب الوحيد هو المنسق الحالي | `Legacy daily-audit writer retired` |
| OPS-22 | فشل التعرف على مستخدم ماسح الفاتورة فيحفظ OCR تحت شركة افتراضية أو يطابق عملاء شركة أخرى | لا توجد شركة افتراضية؛ يلزم JWT صالح وعضوية شركة فعالة ويُرفض الطلب 401/403 قبل الاستعلام أو الحفظ | `Active company membership required` في `scan-invoice` |
| OPS-23 | مزامن بريد المخالفات يستخدم سراً مشتركاً خارج سجل هويات الوكلاء ويتجاوز kill switch | الاستدعاء الآلي يمر فقط عبر `traffic-mail-ingest` وVault والـlease الموحد؛ الاستدعاء اليدوي يتطلب مدير شركة | `authorizeScheduledAgent` في `ingest-traffic-mail` |
| OPS-24 | تنويعات اللوحة أو تاريخها تطابق مركبتين فيختار الوكيل أول صف | يجلب مرشحين ويحوّل الرسالة إلى مراجعة عند تعدد المركبات؛ لا يكتب مخالفة على مركبة مخمنة | `ambiguous_vehicle_plate` |
| OPS-25 | عقدان يغطيان تاريخ المخالفة فيربط الوكيل المخالفة بأحدثهما عشوائياً | يجلب حتى مرشحين، ويسجل إشعار مراجعة مع المعرفات ولا ينشئ الربط المالي/القانوني | `ambiguous_contract_on_violation_date` |
| OPS-26 | webhook قديم للمخالفات يقبل أي Bearer شكلياً، يطابق اللوحة ضبابياً، وينشئ عميلاً افتراضياً عند غياب العقد | المسار متقاعد 410؛ الإدخال محصور في مزامن البريد أو صندوق المخالفات المحكومين | `LEGACY_TRAFFIC_FINE_WEBHOOK_RETIRED` |

## 7. الحوكمة والمراجعات والاستعادة

| ID | الخطأ المحتمل | حل النظام | الدليل التنفيذي |
|---|---|---|---|
| GOV-01 | تشغيل بهوية حساب بشري | سر مستقل و`agent_id` وrequest id لكل وكيل مجدول | `agent_invocation_registry` + Vault |
| GOV-02 | وكيل غير مسجل | fail closed | `verify_scheduled_agent_invocation_v2` |
| GOV-03 | kill switch غير متاح | `enabled=false` يمنع الاستدعاء التالي | `agent_safety_policies` |
| GOV-04 | تشغيلان في conflict group نفسه | lease يجعل الثاني `busy` | `agent_invocation_leases` |
| GOV-05 | قفل مات بعد crash | `expires_at` يسمح باسترداد آمن | `agent_invocation_leases` |
| GOV-06 | عملية كتابة عالية الأثر بلا trace | تفعيل ledger تدريجي للكاتب بعد دمج finish/mutation؛ مفعل الآن لطلب PDF والإعذار والإسناد | `execution_ledger_enabled`, `agent_execution_*` |
| GOV-07 | تجاوز mutation budget | يتحول التشغيل إلى blocked ويرفض التغيير التالي | `record_agent_mutation_v1` |
| GOV-08 | 110 آلاف finding جديدة | سقف 5,000 افتراضياً مع advisory lock لكل run | `trg_guard_system_agent_finding_budget` |
| GOV-09 | فشل التشغيل لكن يبقى running | وكلاء الإرسال والإسناد يغلقون run في catch؛ lease يبقى fallback للبقية | `finishAgentExecution` |
| GOV-10 | close-review ينشئ finding جديدة | وظيفة close-only منفصلة ومقيدة؛ لا scanner داخلها | safety policy `close_only` |
| GOV-11 | finding تختفي لحظة ثم تغلق | نافذة grace قبل الإغلاق | `20260827093000_server_side_system_audit_review_task_sync.sql` |
| GOV-12 | finding ترجع بعد الإغلاق | dedupe key ثابت يعيد فتح/ينشئ المهمة الصحيحة | `sync_system_audit_review_tasks_v1` |
| GOV-13 | وكيل قديم يُعاد جدولته | السياسة `retired`/disabled ترفض هويته حتى لو عاد cron | `safe-auto-repair` + `enabled = false` |
| GOV-14 | فشل متكرر يولد عاصفة تنبيهات | task key ثابت وتحديث نفس المهمة | `upsert_agent_operational_alert_task_v1` |
| GOV-15 | rollback يحذف بيانات أعمال | rollback الجديد يزيل طبقة الأمان والأعمدة التابعة فقط | `20260828113000_agent_failure_containment_and_escalation.rollback.sql` |
| GOV-16 | مستخدم مسجل يمرر `company_id` لشركة أخرى إلى RPC قانونية ذات `SECURITY DEFINER` | كل غلاف قانوني يتحقق من العضوية الفعالة أو دور `super_admin` قبل أي قراءة أو كتابة | `COMPANY_SCOPE_DENIED` في أربع بوابات قانونية |
| GOV-17 | عاملان في نفس run يتجاوزان سقف الإصلاح/finding بالتزامن | advisory transaction lock على `run_id` قبل العد والإدخال | `pg_advisory_xact_lock` |
| GOV-18 | فاحص الجاهزية يجلب أرقام الهوية أو مسارات الملفات إلى جهاز التشغيل كي يعد التعارضات | العد يتم داخل PostgreSQL بواسطة RPC للخدمة فقط، ولا يرجع إلا اسم المقياس وعدد المخالفات | `get_agent_safety_data_health_v1` + `agents:verify-safety` |
| GOV-19 | استدعاء يدوي أو service-role يتجاوز kill switch وسياسة التعارض لأن التحقق كان للمجدول فقط | كل استدعاء موثوق يمر من RPC الخدمة نفسه ويأخذ lease قبل العمل | `authorizeGovernedAgent` + `begin_trusted_agent_invocation_v1` |
| GOV-20 | إضافة وكيل جديد للكتالوج من دون أن يختبره فاحص الإنتاج | قائمة القبول تشمل كامل كتالوج السياسات، وتفشل عند غياب أي سياسة أو RPC حوكمة | `REQUIRED_AGENTS` في `verify-agent-safety-readiness.mjs` + `agentSafetyKernel.test.ts` |
| GOV-21 | مستخدم شركة يمرر معرّف كيان تابع لشركة أخرى إلى وكيل يعمل بمفتاح الخدمة | يلزم `companyId`، تثبت العضوية، وكل قراءة للكيان تقيد بـ`company_id` قبل التحليل | `authorizeAgent(req, companyId, true)` + فلاتر الشركة في وكلاء المراجعة |
| GOV-22 | الوكيل ينهي العمل لكن يبقى lease حتى نهاية المهلة فيظهر `busy` كاذباً | جميع الوكلاء الحية التي تفتح lease تستدعي `finishAgentExecution` في النجاح والفشل، وRPC التحرير يعمل حتى بلا run تفصيلي | `finish_agent_execution_v1` + اختبارات containment |
| GOV-23 | إعادة إرسال HTTP بنفس `requestId` أثناء بقاء التشغيل الأول يسمح بتنفيذين متوازيين | الاستدعاء الموثوق الثاني يسجل `duplicate` ويرجع false؛ لا يعد إعادة الطلب تفويضاً جديداً | `same_request_already_claimed` في `begin_trusted_agent_invocation_v1` |
| GOV-24 | السياسة تصف وكيلاً كـ`propose` رغم أنه يطبق دمجاً أو تعديلاً مالياً أو ينشئ مخالفة آلياً | كل كاتب فعلي مصنف `auto_apply` في كتالوج الحوكمة ويخضع لحواجزه الموافقة | `autonomousWriter` في `agentSafetyKernel.test.ts` |
| GOV-25 | اسم السياسة أو schedule يشير لإصدار قديم بينما cron يستدعي اسماً آخر، فيظهر الوكيل محكوماً على الورق فقط | المطابقة الآلية تربط هوية runtime الفعلية بالسياسة والـVault والفاحص، ومنها orchestrator v14 | `agentGovernanceInventory.test.ts` |
| GOV-26 | مفتاح مزود واتساب ثابت داخل كود وكيل تقرير وقد يتسرب أو يبقى صالحاً بعد التسريب | إزالة القيم الثابتة، تقاعد مرسلي التقارير القدامى، وإلزام تدوير السر الخارجي قبل بديل محكوم | `Legacy daily WhatsApp report agent retired` + `Deno.env.get('ULTRAMSG_TOKEN')` |
| GOV-27 | rollback يعيد تشغيل cron أو secret قديم معروف الخطر | rollback يوقف الهويات والوظائف الجديدة ولا يعيد المسارات المشتركة أو التقارير القديمة | `intentionally not` في rollback containment |
| GOV-28 | إنشاء حساب يثق بـ`user_id` المرسل أو يعيد تعيين كلمة مرور مستخدم موجود | JWT فعلي وصلاحية مدير، منع تصعيد الأدوار، وعدم تغيير كلمة مرور هوية موجودة | `create-user-account` + `finalize_user_account_creation_v1` |
| GOV-29 | فشل ربط الموظف بعد إنشاء Auth user يترك حساباً يتيماً | تعويض بحذف هوية Auth التي أنشأها الطلب فقط | `createdAuthUser` compensation |
| GOV-30 | نقل مستخدم بين الشركات متاح لأي authenticated ويعدل جداول جزئياً | RPC واحدة لـsuper_admin فقط، تمنع self/superadmin transfer وتنفذ ذرياً | `transfer_user_to_company` في containment |
| GOV-31 | مجمع مراقبة قديم يقبل payload مصطنعاً ثم يكتب بمفتاح الخدمة | endpoint متقاعد 410؛ الإدخال البديل webhook موقّع | `LEGACY_MONITORING_COLLECTOR_RETIRED` |
| GOV-32 | endpoint OCR/AI يعتمد فقط على إعداد `verify_jwt` وقد يصبح عاماً عند تغير config | اثنا عشر endpoint تتحقق صراحة من JWT وعضوية شركة فعالة داخل الكود قبل إرسال البيانات للمزود | `authorizeActiveCompanyUser` |
| GOV-33 | إضافة Edge Function جديدة تستخدم service role أو مزوداً خارجياً من دون إدراجها في مراجعة الحوكمة | فحص CI يكتشف كل حد مميز ويَفشل عند أي وظيفة غير مصنفة أو سر ثابت/اتصال مزود من المتصفح | `scripts/audit-privileged-edge-boundaries.mjs` |

## اختبارات القبول المنفذة محلياً

- `agentFailureContainment.test.ts`: الميزانيات، دورة OCR، تضارب الوثائق، FK، التوكن أحادي الاستخدام، التصعيد، PIN، postconditions، تقاعد الكاتب القديم والـ rollback.
- `contractDocumentSelection.test.ts`: لا pending، لا superseded/quarantined، ولا أكثر من active matched.
- `message.test.ts`: رسالة طلب PDF لا تكشف اسم العميل أو اللوحة.
- `smart-card-pin-script.test.ts`: حد محاولتي PIN.
- `type-check`: يمر منفصلاً عن البناء.
- اختبارات الحوكمة المركزة الأربعة: 40/40، وتشمل حوكمة الاستدعاء اليدوي، تحرير leases، ذرية دمج العملاء وتطبيق مقترحات OCR، وحدود إرسال واتساب.
- اختبارات المطالب الأصلية (`integrityGuardPack`, كاش المتعثرين، حالة الأسطول، وقواعد التدقيق المالي): 78/78؛ عولج توقع كان يختار أول finding للدفعة بدل finding البنك المحدد عندما يجتمع الاثنان.
- حزمة Vitest الكاملة: 1504/1504 عبر 195 ملفاً، وتشمل 61 محاكاة تفصيلية لبوابة تقاضي.
- فحص السيناريوهات: 156/156، بلا معرفات مكررة وبلا صف يفتقد دليلاً تنفيذياً.
- محلل PostgreSQL (`pglast`): يقرأ هجرتي نواة الأمان والـ containment وملفي rollback بلا أخطاء syntax.
- `agents:verify-safety`: فاحص إنتاج للقراءة فقط، لا يطبع مفاتيح أو أسماء أو أرقام هوية أو مسارات ملفات.

## بوابة الإنتاج المتبقية

1. حل اختلاف migration history بين المستودع والإنتاج دون `repair` عشوائي.
2. dry-run المعزول مكتمل ويقترح الحزم الثلاث فقط: `20260827152147` و`20260827204249` و`20260828113000`.
3. نشر قاعدة البيانات أولاً، ثم Edge Functions، ثم تشغيل healthcheck واحد لكل وكيل.
4. تشغيل `npm run agents:verify-safety` وإيقاف الإطلاق إذا لم تكن النتيجة `ready: true`؛ الفحص الحالي يفشل لأن الإنتاج لم يستلم النواة الجديدة.
5. مراقبة تشغيل كامل: لا `blocked` غير متوقع، لا duplicate sends، لا مستند قانوني بلا source id، ولا تجاوز للسقوف.
