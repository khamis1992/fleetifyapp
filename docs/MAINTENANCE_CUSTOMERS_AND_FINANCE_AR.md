# صيانة بيانات العملاء والفواتير

هذا المستند يوضح أوامر الصيانة التي تمنع رجوع مشكلتين ظهرتا في الإنتاج:

- عملاء بدون اسم عربي رسمي أو جنسية عربية.
- فواتير عليها توزيعات دفعات أعلى من قيمة الفاتورة.

## تدقيق بيانات العملاء العربية

يشغل الأمر التالي تدقيقاً مباشراً على قاعدة البيانات وينتج تقارير داخل مجلد `output`:

```bash
npm run customers:audit-arabic-data
npm run customers:verify-arabic-data-audit
```

يقرأ الأمر إعدادات Supabase من `.env` أو `.env.taqadi-agent` باستخدام هذه المفاتيح:

- `VITE_SUPABASE_URL` أو `TAQADI_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` أو `TAQADI_SUPABASE_SERVICE_ROLE_KEY`

المخرجات المهمة:

- `output/customer-arabic-data-current-summary.json`: ملخص الأرقام.
- `output/customer-arabic-data-current-audit.csv`: كل العملاء الذين لديهم نقص بيانات.
- `output/customer-arabic-data-active-issues.csv`: العملاء الذين لديهم عقود نشطة ونقص بيانات. هذا هو ملف العمل اليومي للموظفين.

ابدأ دائماً من `active_contract_customers_with_issues` أو ملف `customer-arabic-data-active-issues.csv`، لأنهما يمثلان العملاء الذين لديهم عقود نشطة وما زالت بياناتهم الرسمية ناقصة.

أهم أعمدة ملف العمل اليومي:

- `active_contracts`: العقود النشطة المرتبطة بالعميل.
- `issues_ar`: وصف النقص بالعربي.
- `required_action`: الإجراء المطلوب من الموظف قبل رفع دعوى أو تحديث بيانات العميل.

لا يتم تعبئة الجنسية أو الاسم العربي بالتخمين. يجب أخذ البيانات من الهوية أو الجواز أو مستند رسمي.

أمر `customers:verify-arabic-data-audit` لا يتصل بقاعدة البيانات. هو يتأكد أن ملف العملاء النشطين موجود، يفتح في Excel بترميز عربي صحيح، يحتوي أعمدة الإجراء المطلوبة، وعدد صفوفه مطابق للملخص.

## تطبيق حماية قاعدة البيانات

بعد استكمال مراجعة البيانات القديمة، يمكن تطبيق الحماية التي تمنع إدخال أو تحديث عميل بدون بيانات عربية رسمية:

```bash
npm run customers:apply-arabic-data-guard
```

يتطلب الأمر متغير البيئة التالي:

```bash
SUPABASE_ACCESS_TOKEN
```

يجب أن يكون التوكن من Supabase Management API وبصلاحية `database_write`. يمكن تجربة الأمر بدون تطبيق فعلي:

```bash
npm run customers:apply-arabic-data-guard -- --dry-run
```

إذا تعذر استخدام Management API، استخدم الملف اليدوي في Supabase SQL Editor:

```text
supabase/manual/20260806120022_apply_customer_official_arabic_data_guard.sql
```

## فحص الفواتير الزائدة

لفحص الفواتير التي عليها توزيع دفعات أعلى من قيمة الفاتورة:

```bash
npm run finance:repair-overpaid-invoices
```

هذا الأمر dry-run فقط، وينشئ تقريراً داخل `reports`.

إذا أظهر التقرير حالات تحتاج إصلاحاً، راجع التقرير أولاً ثم طبق:

```bash
npm run finance:repair-overpaid-invoices:apply
```

الإصلاح لا يحذف الدفعات ولا يفك ربطها بالكامل. هو يخفض توزيع الفاتورة إلى قيمة الفاتورة فقط، ويترك الفرق الزائد كرصيد غير مخصص قابل للمراجعة.

## تحقق بعد الصيانة

بعد أي تطبيق مالي أو حماية بيانات، شغل:

```bash
npm run finance:ci:required
npm run type-check
```

للتأكد من سلامة النظام والتقارير المالية.
