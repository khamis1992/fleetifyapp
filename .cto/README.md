# 🤖 CTO Agent Protocol - FleetifyApp

> نظام متكامل لفرض معايير الجودة وتتبع القرارات

## 📋 نظرة عامة

CTO Agent Protocol هو نظام plug-and-play يُطبق معايير الجودة (SOLID, Tests, Coverage) قبل كل عملية نشر، ويسجل كل قرار في Supabase للتتبع الكامل.

---

## 🏗️ هيكل الملفات

```
.cto/
├── AGENT_PROFILE.md    # ملف تعريف الوكيل وصلاحياته
├── RULES.md            # قواعد الجودة التفصيلية
├── checklist.json      # قائمة الفحوصات قابلة للتكوين
└── README.md           # هذا الملف

.github/workflows/
├── cto-agent.yml       # GitHub Actions للتحقق والنشر
└── quality-checks.yml  # فحوصات الجودة الإضافية

supabase/migrations/
└── 20251127_cto_agent_audit.sql  # جداول التدقيق

src/pages/admin/
└── QualityDashboard.tsx  # لوحة تحكم الجودة
```

---

## 🚀 التشغيل السريع

### 1️⃣ إعداد Supabase

```bash
# تطبيق الـ migration
supabase db push
```

أو قم بتنفيذ الـ SQL يدوياً من `supabase/migrations/20251127_cto_agent_audit.sql`

### 2️⃣ إعداد GitHub Secrets

أضف إلى GitHub Secrets:
- `SUPABASE_URL` - رابط مشروع Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - مفتاح الخدمة
- `VERCEL_TOKEN` - توكن Vercel للنشر
- `VERCEL_ORG_ID` - معرف المنظمة
- `VERCEL_PROJECT_ID` - معرف المشروع

### 3️⃣ إعداد Local Enforcement

```bash
# تثبيت التبعيات
npm i -D husky @commitlint/{config-conventional,cli} lint-staged

# تهيئة Husky
npx husky init

# إنشاء hook
echo 'npx --yes commitlint --edit "$1"' > .husky/commit-msg
```

---

## 📊 المراحل

| المرحلة | الوصف | Blocking |
|---------|-------|----------|
| `static_analysis` | ESLint + TypeScript | ✅ نعم |
| `tests` | اختبارات الوحدة والتكامل | ✅ نعم |
| `coverage` | تغطية الكود ≥70% | ✅ نعم |
| `security` | فحص الثغرات والأسرار | ✅ نعم |
| `build` | بناء الإنتاج | ✅ نعم |
| `deploy_gate` | التحقق النهائي | ✅ نعم |

---

## 📈 الحدود القابلة للتكوين

```json
{
  "coverage_min": 70,
  "eslint_max_warnings": 10,
  "bundle_size_max_mb": 2,
  "build_time_max_min": 5,
  "file_loc_max": 500,
  "waiver_expiry_days": 7
}
```

---

## 🔍 سجل التدقيق

كل قرار يُسجل في جدول `cto_agent_audit`:

```sql
SELECT * FROM cto_agent_audit
WHERE run_id = 'github-run-12345'
ORDER BY created_at;
```

### الحقول:
- `run_id` - معرف التشغيل
- `stage` - المرحلة
- `status` - pass/fail/waived
- `severity` - critical/warning/info
- `details` - تفاصيل JSON
- `actor` - المنفذ

---

## 🚪 بوابة النشر

لا يُسمح بالنشر إلا بعد:
1. ✅ نجاح جميع الفحوصات
2. ✅ وجود سجل `approved` في `cto_deploy_gates`
3. ✅ عدم وجود waivers منتهية الصلاحية

---

## ⚠️ الاستثناءات (Waivers)

للحالات الاستثنائية:

```sql
INSERT INTO cto_waivers (rule_id, rule_name, reason, requested_by, expires_at)
VALUES ('R004', 'Coverage', 'Legacy code being refactored', 'dev@example.com', NOW() + INTERVAL '7 days');
```

---

## 📊 لوحة التحكم

الوصول: `/admin/quality`

تعرض:
- إحصائيات الجودة اليومية
- سجل التدقيق
- حالة بوابات النشر
- الاستثناءات النشطة

---

## 🔧 الأوامر المتاحة

```bash
# فحص الكود محلياً
npm run lint
npm run typecheck
npm test -- --coverage

# محاكاة CI محلياً
npm run build:ci
```

---

## 📞 الدعم

للمشاكل أو الاستفسارات:
1. راجع `RULES.md` للقواعد التفصيلية
2. تحقق من سجل التدقيق في Supabase
3. افتح Issue في GitHub

---

## 📜 السجل

| التاريخ | الإصدار | التغييرات |
|---------|---------|-----------|
| 2025-11-27 | 1.0.0 | الإصدار الأول |

---

**🤖 CTO Agent Protocol - Enforcing Quality, One Commit at a Time**

