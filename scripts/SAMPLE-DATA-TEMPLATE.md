# Sample Data Template for Legal Case Automation

## Quick Template Reference

### Excel Data Template

Create `data/customers/{customerName}/data.xlsx` with these exact columns:

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|

### Sample Customer 1: Contract Dispute (Arabic)

**Customer:** Ahmed Al-Mohammed

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Ahmed | Al-Mohammed | قطري | 29263400736 | 55123456 | 15000 | تم إبرام عقد إيجار سيارة بين الطرفين بتاريخ 2024-01-01 بمبلغ 5000 ريال قطري شهرياً. وقد قام المستأجر باستلام السيارة والتوقيع على العقد. ومنذ شهر أبريل 2024، امتنع المستأجر عن سداد الإيجار المستحق رغم التذكير المتكرر عبر الهاتف ورسائل الواتساب. المبلغ المتأخر حالياً يبلغ 15000 ريال قطري (ثلاثة أشهر). | نطالب المحكمة الموقرة بالحكم على المدعى عليه بأداء مبلغ 15000 ريال قطري قيمة الإيجار المتأخر، مع الفوائد القانونية المستحقة حتى تاريخ السداد الكامل، فضلاً عن المصاريف القضائية ومقابل أتعاب المحاماة. |

### Sample Customer 2: Vehicle Damage (English)

**Customer:** Fatima Al-Ali

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Fatima | Al-Ali | Qatari | 28512345678 | 66789012 | 25000 | Rental contract No. CR-2024-1234 signed on 2024-03-15 between parties. Vehicle: Toyota Camry 2023, Plate: 123456. Vehicle returned on 2024-06-15 with significant damages including: (1) Front bumper scratches, (2) Broken left mirror, (3) Interior stains. Repair cost estimated at 25,000 QAR by authorized dealer. Lessee refuses to pay despite acknowledging responsibility. | We request the court to order the defendant to pay 25,000 QAR for vehicle damages and repair costs, plus legal interest at 5% annually from the date of filing until full payment, along with court fees and legal expenses. |

### Sample Customer 3: Late Payment (Mixed Arabic/English)

**Customer:** Mohammed Al-Thani

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Mohammed | Al-Thani | قطري | 27598765432 | 33123456 | 18500.50 | عقد إيجار سيارة رقم 456 بتاريخ 2024-02-01. Rental contract No. 456 dated 2024-02-01. Monthly rent: 6,166.83 QAR. المدعى عليه متأخر عن السداد لمدة 3 أشهر. Defendant is late for 3 months. Total outstanding: 18,500.50 QAR despite multiple reminders. | نطالب بالمبلغ المستحق Plus legal costs. We request payment of 18,500.50 QAR plus legal interest and court fees. |

## Field Value Examples

### FirstName (الاسم الأول)
- Ahmed, Mohammed, Fatima, Maryam, Abdullah
- أحمد، محمد، فاطمة، مريم، عبد الله

### FamilyName (اسم العائلة)
- Al-Mohammed, Al-Thani, Al-Ali, Al-Mansoori, Al-Kuwari
- آل محمد، آل ثاني، آل علي، آل المنصور، آل الكواري

### Nationality (الجنسية)
- قطري (Qatari)
- مصري (Egyptian)
- سوري (Syrian)
- أردني (Jordanian)
- لبناني (Lebanese)

### IDNumber (رقم الهوية)
- Format: 11 digits
- Examples:
  - 29263400736
  - 28512345678
  - 27598765432

### Mobile (رقم الجوال)
- Format: 8 digits, starts with 3/5/6/7
- Examples:
  - 55123456
  - 66789012
  - 33123456
  - 77987654

### Amount (المبلغ الإجمالي)
- Format: Number, no currency symbol
- Examples:
  - 15000
  - 25000
  - 18500.50
  - 100000

### Facts (الوقائع) - Templates

**Template 1: Non-Payment**
```
تم إبرام عقد إيجار سيارة بين الطرفين بتاريخ [DATE] بمبلغ [AMOUNT] ريال قطري شهرياً. وقد قام المستأجر باستلام السيارة والتوقيع على العقد. ومنذ شهر [MONTH]，امتنع المستأجر عن سداد الإيجار المستحق رغم التذكير المتكرر. المبلغ المتأخر حالياً يبلغ [AMOUNT] ريال قطري.
```

**Template 2: Vehicle Damage**
```
عقد إيجار رقم [CONTRACT_NO] بتاريخ [DATE]. السيارة: [VEHICLE_DETAILS]. أعيدت السيارة بتاريخ [RETURN_DATE] مع أضرار جسيمة تشمل: [LIST DAMAGES]. تقدر تكلفة الإصلاح بمبلغ [AMOUNT] ريال قطري. يرفض المستأجر الدفع رغم اعترافه بالمسؤولية.
```

**Template 3: Contract Violation**
```
تم التعاقد بتاريخ [DATE] لاستئجار سيارة [VEHICLE_TYPE]. خالف المدعى عليه بنود العقد من خلال [VIOLATION_DETAILS]. تسبب هذا في خسائر مالية قدرها [AMOUNT] ريال قطري. تم إرسال إشعار رسمي بتاريخ [NOTICE_DATE] دون استجابة.
```

### Requests (الطلبات) - Templates

**Template 1: Simple Payment Request**
```
نطالب المحكمة الموقرة بالحكم على المدعى عليه بأداء مبلغ [AMOUNT] ريال قطري، مع الفوائد القانونية المستحقة حتى تاريخ السداد الكامل، فضلاً عن المصاريف القضائية.
```

**Template 2: Detailed Request**
```
نطالب المحكمة الموقرة بـ:
1. إلزام المدعى عليه بأداء مبلغ [AMOUNT] ريال قطري قيمة الدين المستحق.
2. أداء الفوائد القانونية بواقع [RATE]% سنوياً من تاريخ المطالبة وحتى السداد الكامل.
3. تحميل المدعى عليه المصاريف القضائية ومقابل أتعاب المحاماة.
4. أي حكم آخر تراه المحكمة مناسباً.
```

**Template 3: English Template**
```
We request the court to:
1. Order the defendant to pay [AMOUNT] QAR for outstanding debt.
2. Pay legal interest at [RATE]% annually from filing date until full payment.
3. Cover all court fees and legal expenses.
4. Any other relief the court deems appropriate.
```

## Complete Excel File Example

### Download/Create Excel File

**Method 1: Copy to Excel**
```
FirstName    | FamilyName    | Nationality | IDNumber      | Mobile    | Amount   | Facts    | Requests
Ahmed        | Al-Mohammed   | قطري       | 29263400736   | 55123456  | 15000    | [facts]  | [requests]
```

**Method 2: Import from CSV**
```csv
FirstName,FamilyName,Nationality,IDNumber,Mobile,Amount,Facts,Requests
Ahmed,Al-Mohammed,قطري,29263400736,55123456,15000,"تم إبرام عقد...","نطالب المحكمة..."
```

**Method 3: Google Sheets**
1. Create new sheet
2. Add headers
3. Fill data
4. File → Download → Excel (.xlsx)

## Amount Conversion Examples

The system automatically converts amounts to Arabic words:

| Amount | Arabic Words (المبلغ الإجمالي كتابة) |
|--------|-------------------------------------|
| 100 | مائة ريال قطري فقط |
| 1500 | ألف وخمسمائة ريال قطري فقط |
| 15000 | خمسة عشر ألف ريال قطري فقط |
| 15000.50 | خمسة عشر ألف ريال وخمسون درهماً فقط |
| 100000 | مائة ألف ريال قطري فقط |
| 1500000 | مليون وخمسمائة ألف ريال قطري فقط |

## Document File Examples

### Required Documents

Create these files in customer folder:

```
data/customers/Ahmed Al-Mohammed/
├── المذكرة الشارحة.pdf
├── المذكرة الشارحة.docx
├── حافظة المستندات.pdf
├── IBAN.pdf
├── بطاقة شخصية.pdf
└── سجل تجاري.pdf
```

### Alternative Document Names (English)

These are also acceptable:

```
data/customers/Ahmed Al-Mohammed/
├── Legal Memo.pdf
├── Legal Memo.docx
├── Document Portfolio.pdf
├── Bank IBAN.pdf
├── Qatari ID.pdf
└── Commercial Registration.pdf
```

### Alternative Document Names (Mixed)

System recognizes both Arabic and English:

- المذكرة الشارحة / Legal Memo / Memo
- حافظة المستندات / Document Portfolio / Portfolio
- IBAN / رقم الحساب الدولي / Bank Account
- بطاقة شخصية / ID Card / Qatari ID / الهوية
- سجل تجاري / Commercial Registration / CR

## Validation Examples

### ✅ Valid Data

| Field | Example | Valid? |
|-------|---------|--------|
| FirstName | Ahmed | ✅ |
| FamilyName | Al-Mohammed | ✅ |
| IDNumber | 29263400736 | ✅ (11 digits) |
| Mobile | 55123456 | ✅ (8 digits, starts with 5) |
| Amount | 15000 | ✅ (number) |
| Facts | Contract dispute... | ✅ (not empty) |
| Requests | We request... | ✅ (not empty) |

### ❌ Invalid Data

| Field | Example | Valid? | Issue |
|-------|---------|--------|-------|
| FirstName | Ahmed123 | ❌ | Contains numbers |
| IDNumber | 2926340073 | ❌ | Only 10 digits |
| Mobile | +97455123456 | ❌ | Has country code |
| Mobile | 551-2345 | ❌ | Has dash |
| Amount | "15,000" | ❌ | Has comma and quotes |
| Amount | "15000 ر.ق" | ❌ | Has currency symbol |
| Facts | [empty] | ❌ | Cannot be empty |

## Real-World Scenarios

### Scenario 1: Car Rental Non-Payment

**Business Case:**
- Customer: Ahmed Al-Mohammed
- Contract: CR-2024-456
- Vehicle: Toyota Camry 2023
- Monthly Rent: 5,000 QAR
- Period Outstanding: 3 months
- Total Due: 15,000 QAR

**Excel Entry:**
```
FirstName: Ahmed
FamilyName: Al-Mohammed
Nationality: قطري
IDNumber: 29263400736
Mobile: 55123456
Amount: 15000
Facts: تم إبرام عقد إيجار سيارة رقم CR-2024-456 بتاريخ 2024-01-01...
Requests: نطالب بأداء مبلغ 15000 ريال قطري...
```

### Scenario 2: Vehicle Damage

**Business Case:**
- Customer: Fatima Al-Ali
- Contract: CR-2024-789
- Vehicle: Lexus LX570 2024
- Damage: Front bumper, scratches, interior damage
- Repair Cost: 25,000 QAR

**Excel Entry:**
```
FirstName: Fatima
FamilyName: Al-Ali
Nationality: قطري
IDNumber: 28512345678
Mobile: 66789012
Amount: 25000
Facts: عقد إيجار رقم CR-2024-789. أعيدت السيارة بأضرار...
Requests: نطالب بتكاليف الإصلاح البالغة 25000 ريال...
```

## Tips for Creating Quality Data

### Do's ✅

1. **Be Specific in Facts**
   - Include exact dates
   - Reference contract numbers
   - List specific violations
   - Mention communication attempts

2. **Be Clear in Requests**
   - Specify exact amount
   - Mention legal interest
   - Include court fees
   - Number your requests

3. **Use Correct Formats**
   - Mobile: 8 digits only
   - ID: 11 digits only
   - Amount: Number only
   - Date: YYYY-MM-DD or DD/MM/YYYY

### Don'ts ❌

1. **Don't Use Vague Language**
   - "He didn't pay" → "He failed to pay the rent of 5,000 QAR for 3 months"
   - "The car is damaged" → "The vehicle has a scratched front bumper (estimated repair: 3,000 QAR)"

2. **Don't Leave Fields Empty**
   - Facts: Must provide case background
   - Requests: Must state what you want

3. **Don't Include Irrelevant Information**
   - Stay focused on the legal claim
   - Don't include emotional language
   - Stick to facts and figures

## Testing Your Data

### Pre-Flight Checklist

Before running automation:

```
□ Excel file saved as .xlsx (not .xls)
□ All column names are correct
□ All required fields filled
□ Mobile: 8 digits, no country code
□ ID: 11 digits
□ Amount: Number only, no currency
□ Facts: Detailed case description
□ Requests: Clear claims
□ All 6 documents present
□ Documents in correct folder
□ Filenames match expected patterns
```

### Quick Validation Command

After preparing data, test validation:

```bash
npm run automate:case -- --customer="Test Customer" --headless=true
```

If validation passes, you'll see:
```
✓ Customer data loaded successfully
✓ Found 6 document types
✓ All validations passed
```

---

**Need More Examples?**

Refer to:
- `scripts/README-AUTOMATION.md` - Full documentation
- `scripts/EXCEL-TEMPLATE-GUIDE.md` - Excel guide
- `scripts/QUICK-START.md` - Quick start guide

**Last Updated**: 2025-01-24
