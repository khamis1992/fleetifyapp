# 🚀 Quick Reference Guide
# دليل المرجع السريع - إدارة الدعاوى القانونية

> Print this guide for quick reference during case submission

---

## 📋 30-Step Checklist

### ✅ Phase 1: Authentication (Steps 1-4)

- [ ] **Step 1:** Select "الدخول عبر نظام التوثيق الوطني" → Click "متابعة"
- [ ] **Step 2:** Login with credentials → Click "أنا لست روبوت" → Click "استمر"
- [ ] **Step 3:** Select "مُتقاضي فرد" → Click "تسجيل دخول"
- [ ] **Step 4:** Ensure sidebar is visible

---

### ✅ Phase 2: Navigation (Step 5)

- [ ] **Step 5:** Click "إدارة الدعاوى" → Click "إنشاء دعوى"

---

### ✅ Phase 3: Court & Case Type (Step 6)

| Field | Selection |
|-------|-----------|
| المحكمة | محكمة الاستثمار والتجارة |
| نوع الإجراء | استثمار |
| درجة التقاضي | إبتدائي |
| النوع | عقود الخدمات التجارية |
| النوع الفرعي | عقود إيجار السيارات وخدمات الليموزين |
| الموضوع الفرعي | لا ينطبق |
| التصنيف | تجاري |

- [ ] **Step 6:** Fill all selections → Click "التالي"

---

### ✅ Phase 4: Case Details (Step 8)

| Field | Source |
|-------|--------|
| عنوان الدعوى | مطالبة مالية-إيجار سيارة (FIXED) |
| الوقائع | From Excel |
| الطلبات | From Excel |
| نوع المطالبة | قيمة المطالبة |
| المبلغ | From Excel (المبلغ الإجمالي) |
| المبلغ الإجمالي كتابة | Convert to Arabic words |

- [ ] **Step 8:** Fill all fields → Click "التالي"

---

### ✅ Phase 5: Defendant Party (Steps 9-19)

#### Step 9: Start
- [ ] Click "إضافة طرف"

#### Step 10: Party Classification
| Field | Selection |
|-------|-----------|
| تصنيف الطرف | شخص طبيعي |
| صفة الطرف | المدعى عليه |
| الترتيب | 1 |

#### Step 11-18: Party Information
| Field | Source | Value |
|-------|--------|-------|
| اسم العائلة | Excel | (from file) |
| الاسم | Excel | (from file) |
| النوع | Fixed | ذكر |
| الجنسية | Excel | (from file) |
| نوع البطاقة | Fixed | رخصة مقيم |
| رقم البطاقة | Excel | (from file) |
| مطلوب مترجم؟ | Fixed | لا |
| وارث؟ | Fixed | لا |
| العنوان | Fixed | الجوحة - قطر |
| رقم الهاتف | Excel | (from file) |
| البريد الإلكتروني | Fixed | khamis-1992@hotmail.com |

- [ ] **Step 19:** Click "حفظ"

#### Step 20-21: Edit & Save
- [ ] Find "خميس الجبر" in parties list
- [ ] Click "تعديل" under Actions
- [ ] Scroll down → Click "حفظ"

---

### ✅ Phase 6: Document Upload (Steps 23-27)

For each document:
1. Click "إضافة وثيقة"
2. Select document type
3. Upload file(s)
4. Wait for confirmation

| # | Document Type | Files | Format |
|---|---------------|-------|--------|
| 1 | المذكرة الشارحة | 2 files | PDF + DOCX |
| 2 | حافظة المستندات | 1 file | PDF |
| 3 | رقم الحساب الدولي (IBAN) | 1 file | PDF |
| 4 | بطاقة شخصية | 1 file | PDF |
| 5 | سجل تجاري | 1 file | PDF |

- [ ] **All 5 documents uploaded** (6 files total)

---

### ✅ Phase 7: Final Submission (Steps 28-30)

- [ ] **Step 28:** Click "التالي"
- [ ] **Step 29:** Click "التالي" (review page)
- [ ] **Step 30:** Click "اعتماد" ✅

---

## 🎯 One-Page Summary

### Manual Process Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                    CASE SUBMISSION FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [1-4] LOGIN (5 min)                                       │
│  ├── Select authentication method                          │
│  ├── Enter credentials                                     │
│  ├── Solve CAPTCHA (if appears)                            │
│  └── Select user type                                      │
│                                                             │
│  [5] NAVIGATE (1 min)                                      │
│  └── Case Management → Create Case                         │
│                                                             │
│  [6] COURT INFO (2 min)                                    │
│  └── Select court, type, classification                    │
│                                                             │
│  [8] CASE DETAILS (5 min)                                  │
│  ├── Title: Fixed                                          │
│  ├── Facts: Excel                                          │
│  ├── Requests: Excel                                       │
│  ├── Amount: Excel                                         │
│  └── Amount in words: Convert                              │
│                                                             │
│  [9-19] DEFENDANT (10 min)                                 │
│  ├── Add party                                             │
│  ├── Fill personal info (Excel + Fixed)                    │
│  ├── Save                                                  │
│  ├── Edit party                                            │
│  └── Save (no changes)                                     │
│                                                             │
│  [23-27] DOCUMENTS (10 min)                                │
│  └── Upload 5 documents (6 files)                          │
│                                                             │
│  [28-30] SUBMIT (3 min)                                    │
│  ├── Next                                                  │
│  ├── Next (review)                                         │
│  └── Approve (اعتماد) ✅                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Total Time: ~35 minutes (manual) / ~10 minutes (automated)
```

---

## 🤖 Automation Command

```bash
# Standard execution
npm run automate:case:debug -- --customer="Customer Name"

# Headless (background)
npm run automate:case:headless -- --customer="Customer Name"
```

---

## 📁 File Structure

```
data/customers/{customer}/
├── data.xlsx                    # Customer data
├── المذكرة الشارحة.pdf         # Legal memo (PDF)
├── المذكرة الشارحة.docx        # Legal memo (DOCX)
├── حافظة المستندات.pdf         # Document portfolio
├── IBAN.pdf                    # IBAN document
├── بطاقة شخصية.pdf             # ID card
└── سجل تجاري.pdf               # Commercial registration
```

---

## 📊 Excel Required Columns

| Column | Required | Example |
|--------|----------|---------|
| FirstName | ✅ | أحمد |
| FamilyName | ✅ | محمد |
| Nationality | ✅ | قطري |
| IDNumber | ✅ | 29263400736 |
| Mobile | ✅ | 66123456 |
| Amount | ✅ | 5000 |
| Facts | ✅ | (long text) |
| Requests | ✅ | (long text) |

---

## 🔐 Fixed Values

Never change these values:

```yaml
Title: "مطالبة مالية-إيجار سيارة"
Claim Type: "قيمة المطالبة"
Gender: "ذكر"
Translator Required: "لا"
Heir: "لا"
Address: "الجوحة - قطر"
Email: "khamis-1992@hotmail.com"
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Login failed | Check credentials in `.env` |
| Excel error | Verify all columns exist |
| File not found | Check folder structure |
| CAPTCHA | Solve manually, script pauses |
| Element not found | Wait longer, check page |

---

## 📞 Quick Help

1. **Login issues:** Verify credentials manually first
2. **Excel problems:** Check required columns
3. **Missing files:** Ensure all 6 files exist
4. **CAPTCHA:** Normal behavior, solve and continue
5. **Script fails:** Check logs in `logs/` folder

---

## ✨ Tips

1. ✅ Prepare all files before starting
2. ✅ Test automation with one customer first
3. ✅ Keep `.env` file secure and private
4. ✅ Run automation in debug mode first
5. ✅ Save case reference number after submission
6. ✅ Archive customer folders after completion

---

**Last Updated:** January 2025
**Version:** 1.0

For detailed documentation, see: `LEGAL-CASE-SUBMISSION-WORKFLOW.md`
