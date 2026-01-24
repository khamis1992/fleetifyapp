# Legal Case Automation - Workflow Visualization

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LEGAL CASE AUTOMATION SYSTEM                   │
│                    Qatar Court System Integration                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌───────────────┐      ┌──────────────────┐
│   Customer   │──────│  Excel Files  │──────│  Automation      │
│   Data       │      │  + Documents  │      │  Script          │
└──────────────┘      └───────────────┘      └────────┬─────────┘
                                                        │
                                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     PHASE 1: AUTHENTICATION                      │
├──────────────────────────────────────────────────────────────────┤
│  Step 1: Login Page                                              │
│    └─ Select "الدخول عبر النظام التوثيق الوطني"                 │
│    └─ Click "متابعة"                                             │
│                                                                  │
│  Step 2: National Authentication                                  │
│    ├─ Enter username: 29263400736                                │
│    ├─ Enter password: ********                                   │
│    ├─ Click "أنا لست روبوت"                                      │
│    └─ Click "استمر"                                              │
│    ⚠️  PAUSE if CAPTCHA detected                                 │
│                                                                  │
│  Step 3: User Type Selection                                     │
│    ├─ Select "مُتقاضي فرد"                                       │
│    └─ Click "تسجيل دخول"                                         │
│                                                                  │
│  Step 4: Sidebar                                                 │
│    └─ Ensure sidebar visible                                     │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  PHASE 2: NAVIGATION                             │
├──────────────────────────────────────────────────────────────────┤
│  Step 5: Navigate to Case Creation                               │
│    ├─ Click "إدارة الدعاوى"                                      │
│    └─ Click "إنشاء دعوى"                                         │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              PHASE 3: COURT & CASE TYPE                          │
├──────────────────────────────────────────────────────────────────┤
│  Step 6: Fill Court Information                                  │
│    ├─ المحكمة: محكمة الاستثمار والتجارة                        │
│    ├─ نوع الإجراء: استثمار                                      │
│    ├─ درجة التقاضي: إبتدائي                                      │
│    ├─ النوع: عقود الخدمات التجارية                               │
│    ├─ النوع الفرعي: عقود إيجار السيارات...                      │
│    ├─ الموضوع الفرعي: لا ينطبق                                  │
│    └─ التصنيف: تجاري                                            │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                 PHASE 4: CASE DETAILS                            │
├──────────────────────────────────────────────────────────────────┤
│  Step 8: Fill Case Details (from Excel)                          │
│    ├─ عنوان الدعوى: "مطالبة مالية-إيجار سيارة"                │
│    ├─ الوقائع: [From Excel]                                     │
│    ├─ الطلبات: [From Excel]                                     │
│    ├─ نوع المطالبة: قيمة المطالبة                               │
│    ├─ المبلغ: [From Excel - e.g., 15000]                        │
│    └─ المبلغ الإجمالي كتابة: "خمسة عشر ألف ريال..." (auto)     │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              PHASE 5: ADD DEFENDANT PARTY                        │
├──────────────────────────────────────────────────────────────────┤
│  Step 9:  Click "إضافة طرف"                                      │
│  Step 10: تصنيف الطرف: شخص طبيعي                                │
│  Step 11: صفة الطرف: المدعى عليه                                │
│  Step 12: الترتيب: 1                                             │
│  Step 13: Family Name: [From Excel]                              │
│          First Name: [From Excel]                                │
│  Step 14: الجنس: ذكر                                             │
│  Step 15: Nationality: [From Excel]                              │
│  Step 16: Card Type: رخصة مقيم                                  │
│          ID Number: [From Excel]                                 │
│  Step 17: Translator: لا                                         │
│          Heir: لا                                                │
│          Address: "الجوحة - قطر"                                 │
│  Step 18: Mobile: [From Excel]                                   │
│          Email: "khamis-1992@hotmail.com"                        │
│  Step 19: Click Save                                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│               PHASE 6: EDIT & SAVE PARTY                         │
├──────────────────────────────────────────────────────────────────┤
│  Step 20: Find party "خميس الجبر"                                │
│          Click Edit under Actions                                │
│  Step 21: Scroll down and click Save                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              PHASE 7: UPLOAD DOCUMENTS                           │
├──────────────────────────────────────────────────────────────────┤
│  Step 23: Upload Memo (2 files)                                  │
│    ├─ المذكرة الشارحة.pdf                                       │
│    └─ المذكرة الشارحة.docx                                      │
│                                                                  │
│  Step 24: Upload Portfolio (1 file)                              │
│    └─ حافظة المستندات.pdf                                       │
│                                                                  │
│  Step 25: Upload IBAN (1 file)                                   │
│    └─ IBAN.pdf                                                   │
│                                                                  │
│  Step 26: Upload ID Card (1 file)                                │
│    └─ بطاقة شخصية.pdf                                           │
│                                                                  │
│  Step 27: Upload Commercial Record (1 file)                      │
│    └─ سجل تجاري.pdf                                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│               PHASE 8: FINAL SUBMISSION                          │
├──────────────────────────────────────────────────────────────────┤
│  Step 28: Click "التالي" (first time)                            │
│  Step 29: Click "التالي" (second time)                           │
│  Step 30: Click "اعتماد" (Submit)                                │
│          ✓ Capture case reference number                         │
│          ✓ Save final report                                     │
│          ✓ Automation Complete!                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────────┐
│  CUSTOMER FOLDER     │
│  {customerName}/     │
└──────────┬───────────┘
           │
           ├──────────────┬──────────────┬──────────────┐
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ data.xlsx│   │  Memo    │   │Portfolio │   │IBAN/ID/CR│
    └─────┬────┘   └─────┬────┘   └─────┬────┘   └─────┬────┘
          │              │              │              │
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌─────────────────────────────────────────────────────┐
    │           VALIDATION LAYER                          │
    │  • Excel structure check                            │
    │  • Required fields verification                     │
    │  • Document existence validation                    │
    │  • Format validation (mobile, ID, amount)           │
    └─────────────────────┬───────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │  AUTOMATION ENGINE      │
            │  • Playwright Browser   │
            │  • Step Execution       │
            │  • Error Handling       │
            │  • CAPTCHA Detection    │
            │  • Logging              │
            └─────────────┬───────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │  QATAR COURT SYSTEM     │
            │  adlsala.ada.gov.qa     │
            └─────────────┬───────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │  OUTPUT & LOGGING       │
            │  • Console logs         │
            │  • Error screenshots    │
            │  • JSON results         │
            │  • Case reference       │
            └─────────────────────────┘
```

## Error Handling Flow

```
┌────────────────┐
│  START STEP    │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Execute Action│
└────────┬───────┘
         │
    ┌────┴────┐
    │ SUCCESS?│
    └────┬────┘
         │
    ┌────┴──────────┐
    │               │
   YES              NO
    │               │
    ▼               ▼
┌────────┐   ┌─────────────┐
│Log Step│   │Retry Counter│
└────────┘   └──────┬──────┘
                    │
              ┌─────┴─────┐
              │ < 3 tries?│
              └─────┬─────┘
                    │
               ┌────┴────┐
               │         │
              YES        NO
               │         │
               ▼         ▼
         ┌─────────┐  ┌────────────┐
         │Wait 2s  │  │Screenshot  │
         │Retry    │  │Log Error   │
         └────┬────┘  │Skip/Fail   │
              │       └────────────┘
              └───────┤
                      ▼
              ┌────────────────┐
              │  CONTINUE/STOP  │
              └────────────────┘
```

## CAPTCHA Handling Flow

```
┌─────────────────────┐
│  Before Each Step   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Scan for CAPTCHA   │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │DETECTED?│
      └────┬────┘
           │
      ┌────┴────────┐
      │             │
     NO            YES
      │             │
      ▼             ▼
┌─────────┐   ┌──────────────┐
│Continue │   │PAUSE Script  │
└─────────┘   │Show Alert    │
              │Take Screenshot│
              └──────┬───────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Wait for User    │
          │ (solve CAPTCHA)  │
          └─────────┬────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ Check Every 2s   │
          │ - CAPTCHA gone?  │
          │ - Page changed?  │
          └─────────┬────────┘
                    │
              ┌─────┴─────┐
              │ RESOLVED? │
              └─────┬─────┘
                    │
              ┌─────┴──────┐
              │            │
             NO           YES
              │            │
              ▼            ▼
      ┌──────────┐   ┌──────────┐
      │Timeout 5m│   │Resume    │
      │or Continue│  │Continue  │
      └──────────┘   └──────────┘
```

## File System Structure

```
fleetifyapp/
│
├── scripts/
│   ├── legal-case-automation.ts      ← Main automation script
│   ├── config/
│   │   └── automation.config.ts     ← Configuration
│   ├── utils/
│   │   ├── excelReader.ts           ← Excel parsing
│   │   ├── amountConverter.ts       ← Arabic numbers
│   │   └── captchaHandler.ts        ← CAPTCHA handling
│   ├── types/
│   │   └── automation.types.ts      ← TypeScript types
│   ├── README-AUTOMATION.md         ← Full documentation
│   ├── EXCEL-TEMPLATE-GUIDE.md      ← Excel guide
│   ├── QUICK-START.md               ← Quick start
│   ├── WORKFLOW-VISUALIZATION.md    ← This file
│   └── AUTOMATION-SUMMARY.md        ← Summary
│
├── data/
│   └── customers/                   ← Customer data (NOT in git)
│       ├── Ahmed Al-Mohammed/
│       │   ├── data.xlsx            ← Customer data
│       │   ├── المذكرة الشارحة.pdf
│       │   ├── المذكرة الشارحة.docx
│       │   ├── حافظة المستندات.pdf
│       │   ├── IBAN.pdf
│       │   ├── بطاقة شخصية.pdf
│       │   └── سجل تجاري.pdf
│       └── Fatima Al-Ali/
│           └── ...
│
├── logs/                            ← Logs (NOT in git)
│   ├── automation/
│   │   ├── Ahmed Al-Mohammed-2025-01-24.log
│   │   └── Fatima Al-Ali-2025-01-24.log
│   ├── screenshots/
│   │   ├── Ahmed Al-Mohammed/
│   │   │   ├── step-1-2025-01-24.png
│   │   │   └── step-5-2025-01-24.png
│   │   └── Fatima Al-Ali/
│   └── results/
│       ├── Ahmed Al-Mohammed-1737726645123.json
│       └── Fatima Al-Ali-1737726789012.json
│
├── .env                             ← Credentials (NOT in git)
│   QATAR_COURT_USERNAME=29263400736
│   QATAR_COURT_PASSWORD=********
│   HEADLESS=false
│
└── package.json                     ← NPM scripts
    automate:case
    automate:case:headless
    automate:case:debug
```

## Timeline Visualization

```
AUTOMATION EXECUTION TIMELINE
─────────────────────────────

0:00  └─ Start
         ├─ Initialize browser
         ├─ Load customer data
         └─ Validate documents

0:30  └─ Phase 1: Authentication (Steps 1-4)
         ├─ Login page
         ├─ Enter credentials
         ├─ ⚠️  Handle CAPTCHA (if present)
         └─ Select user type

3:00  └─ Phase 2-3: Navigation & Court Info (Steps 5-6)
         ├─ Navigate to case creation
         └─ Fill court details

5:00  └─ Phase 4: Case Details (Step 8)
         ├─ Fill case information
         ├─ Convert amount to Arabic
         └─ Format claims

6:00  └─ Phase 5: Add Party (Steps 9-19)
         ├─ Click add party
         ├─ Fill all party details
         └─ Save party

9:00  └─ Phase 6: Edit Party (Steps 20-21)
         ├─ Find party
         ├─ Edit details
         └─ Save changes

10:00 └─ Phase 7: Upload Documents (Steps 23-27)
         ├─ Upload memo (PDF + DOCX)
         ├─ Upload portfolio
         ├─ Upload IBAN
         ├─ Upload ID card
         └─ Upload commercial record

13:00 └─ Phase 8: Submit (Steps 28-30)
         ├─ Click next (twice)
         ├─ Submit case
         └─ Capture reference

14:00 └─ Complete ✓

Total Time: 10-15 minutes (without CAPTCHA)
           12-18 minutes (with 1-2 CAPTCHAs)
```

## Success Criteria Checklist

```
PRE-EXECUTION:
□ Customer folder exists
□ Excel file with correct structure
□ All 6 required documents present
□ Credentials configured (.env or config)
□ Playwright browsers installed
□ Stable internet connection

DURING EXECUTION:
□ Browser launches successfully
□ Authentication completes
□ Court system accessible
□ All 30 steps execute
□ CAPTCHA handled (if present)
□ Documents upload successfully
□ Case submitted
□ Reference number captured

POST-EXECUTION:
□ Log file created
□ JSON result saved
□ No critical errors
□ Case reference recorded
□ Screenshots saved (if errors)
□ Customer data archived

SUCCESS INDICATORS:
✓ All steps completed
✓ Reference number obtained
✓ No error screenshots
✓ Case visible in court portal
✓ Data matches Excel
✓ Documents uploaded
```

---

**This visualization helps understand:**
1. Complete workflow (30 steps)
2. Data flow between components
3. Error handling mechanisms
4. CAPTCHA handling process
5. File system organization
6. Execution timeline
7. Success criteria

Use this as a reference when troubleshooting or explaining the system to others.
