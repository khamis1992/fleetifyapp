# Excel Template Guide for Legal Case Automation

## Overview

This guide explains how to create the Excel data file for the legal case automation system.

## File Location

Place your Excel file at:
```
data/customers/{customerName}/data.xlsx
```

## Required Columns

The Excel file must have a header row with the following columns (English or Arabic):

### Column Specifications

| English Column | Arabic Column | Data Type | Required | Example | Notes |
|---------------|---------------|-----------|----------|---------|-------|
| FirstName | الاسم الأول | Text | ✅ Yes | Ahmed | First name only |
| FamilyName | اسم العائلة | Text | ✅ Yes | Al-Mohammed | Family/last name |
| Nationality | الجنسية | Text | ✅ Yes | قطري | Nationality in Arabic |
| IDNumber | رقم الهوية | Text | ✅ Yes | 29263400736 | 11-digit Qatari ID |
| Mobile | رقم الجوال | Text | ✅ Yes | 55123456 | 8-digit Qatar mobile |
| Amount | المبلغ الإجمالي | Number | ✅ Yes | 15000 | Amount in QAR |
| Facts | الوقائع | Text | ✅ Yes | Contract dispute... | Case facts |
| Requests | الطلبات | Text | ✅ Yes | We request... | Court claims |

## Sample Excel Data

### Example 1: Complete Data

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Ahmed | Al-Mohammed | قطري | 29263400736 | 55123456 | 15000 | تم إبرام عقد إيجار سيارة بين الطرفين بتاريخ 2024-01-01 وقد امتنع المستأجر عن سداد الإيجار المستحق منذ ثلاثة أشهر رغم التذكير المتكرر | نطالب المحكمة الموقرة بالحكم على المدعى عليه بأداء مبلغ 15,000 ريال قطري قيمة الإيجار المتأخر مع الفوائد القانونية والمصاريف |

### Example 2: English Columns

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Fatima | Al-Ali | Qatari | 28512345678 | 66789012 | 25000 | Rental contract signed on 2024-03-15. Vehicle returned with damages. Lessee refuses to pay repair costs. | We request the court to order the defendant to pay 25,000 QAR for vehicle damages plus legal interest and court fees |

## Field Validation Rules

### FirstName (الاسم الأول)
- **Type**: Text
- **Length**: 2-50 characters
- **Cannot be empty**
- **No special characters** (except hyphen, apostrophe)
- **Examples**: Ahmed, Mohammed, Fatima, Maryam

### FamilyName (اسم العائلة)
- **Type**: Text
- **Length**: 2-50 characters
- **Cannot be empty**
- **Can include "Al-", "El-" prefix**
- **Examples**: Al-Mohammed, Al-Thani, Al-Ali, Al-Mansoori

### Nationality (الجنسية)
- **Type**: Text
- **Recommended**: Arabic format
- **Cannot be empty**
- **Common values**:
  - قطري (Qatari)
  - مصري (Egyptian)
  - سوري (Syrian)
  - أردني (Jordanian)
  - لبناني (Lebanese)

### IDNumber (رقم الهوية)
- **Type**: Text or Number
- **Length**: Exactly 11 digits
- **Cannot be empty**
- **Format**: Qatari ID number
- **Example**: 29263400736

### Mobile (رقم الجوال)
- **Type**: Text
- **Length**: 8 digits
- **Cannot be empty**
- **Must start with**: 3, 5, 6, or 7
- **Format**: Qatar mobile number
- **Examples**: 55123456, 66789012, 33123456

### Amount (المبلغ الإجمالي)
- **Type**: Number
- **Cannot be empty**
- **Minimum**: 0.01
- **Maximum**: 999,999,999.99
- **Currency**: QAR (implied)
- **Examples**: 15000, 25000.50, 100000

### Facts (الوقائع)
- **Type**: Text
- **Cannot be empty**
- **Length**: Up to 4000 characters
- **Language**: Arabic or English
- **Content**: Case facts and background
- **Tips**:
  - Be concise but thorough
  - Include dates and amounts
  - Mention breach terms
  - Reference contract if applicable

### Requests (الطلبات)
- **Type**: Text
- **Cannot be empty**
- **Length**: Up to 4000 characters
- **Language**: Arabic or English
- **Content**: What you're asking the court to order
- **Tips**:
  - State specific amount requested
  - Include legal interest if applicable
  - Mention court fees
  - Be clear and specific

## Creating the Excel File

### Method 1: Microsoft Excel

1. Open Microsoft Excel
2. Create new workbook
3. Add header row with column names
4. Fill in customer data
5. Save as `data.xlsx`

### Method 2: Google Sheets

1. Open Google Sheets
2. Add header row with column names
3. Fill in customer data
4. File → Download → Microsoft Excel (.xlsx)
5. Rename to `data.xlsx`

### Method 3: LibreOffice Calc

1. Open LibreOffice Calc
2. Create new spreadsheet
3. Add header row and data
4. File → Save As → Excel 2007-365 (.xlsx)
5. Save as `data.xlsx`

## Common Mistakes to Avoid

### ❌ Wrong Column Names

**Wrong**:
- First_Name (underscore instead of no separator)
- First Name (space in Arabic column)
- الاسم الاول (missing Arabic letter ي)

**Correct**:
- FirstName or الاسم الأول
- FamilyName or اسم العائلة

### ❌ Invalid Mobile Format

**Wrong**:
- +97455123456 (includes country code)
- 551-2345 (includes dash)
- 5512345 (only 7 digits)

**Correct**:
- 55123456
- 66789012

### ❌ Amount as Text

**Wrong**:
- "15,000" (includes comma)
- "15,000.00 QAR" (includes currency)
- "15000 ر.ق" (Arabic currency symbol)

**Correct**:
- 15000
- 15000.50
- 25000

### ❌ Empty Fields

**Wrong**:
- Leaving Facts blank
- Leaving Requests blank
- Using "N/A" or "None"

**Correct**:
- Always provide facts and requests
- Be specific and detailed

## Testing Your Excel File

### Manual Validation Checklist

Before running automation, verify:

```
□ All required columns exist
□ Column names are correct (English or Arabic)
□ At least one row of data
□ All fields are filled
□ Mobile number is 8 digits
□ ID number is 11 digits
□ Amount is a number (not text)
□ Facts and requests are not empty
□ File is saved as .xlsx (not .xls)
```

### Automated Validation

The automation script will validate:

```bash
npm run automate:case -- --customer="Test Customer"
```

**Output examples:**

✅ Success:
```
✓ Customer data loaded successfully
✓ All validations passed
```

❌ Error:
```
Error: Missing required fields: Mobile, IDNumber
```

## Templates

### Minimal Template (Copy & Paste)

Create a new Excel file with this header row:

```
FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests
```

### Complete Template (With Sample Data)

```
FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests
Ahmed | Al-Mohammed | قطري | 29263400736 | 55123456 | 15000 | Your case facts here... | Your court requests here...
```

## Advanced Features

### Multiple Customers

You can create multiple Excel files for different customers:

```
data/customers/
├── Customer 1/
│   └── data.xlsx
├── Customer 2/
│   └── data.xlsx
└── Customer 3/
    └── data.xlsx
```

### Batch Processing

Create a simple script to process multiple customers:

```bash
#!/bin/bash
for customer in "Customer 1" "Customer 2" "Customer 3"; do
  npm run automate:case -- --customer="$customer"
done
```

## Language Support

The system supports both English and Arabic column names. You can mix them:

**Mixed Example**:
| FirstName | اسم العائلة | Nationality | رقم الهوية | Mobile | المبلغ الإجمالي | Facts | الطلبات |
|-----------|------------|-------------|------------|--------|----------------|-------|---------|

## Troubleshooting

### Issue: "Excel file not found"

**Causes**:
1. Wrong file location
2. Wrong filename
3. File not saved

**Solution**:
```
✅ Check: data/customers/{customerName}/data.xlsx
✅ Verify spelling matches exactly
✅ Ensure file is saved (not just open)
```

### Issue: "Failed to read Excel file"

**Causes**:
1. Corrupted file
2. Wrong format (.xls instead of .xlsx)
3. File is password protected

**Solution**:
```
✅ Use .xlsx format (not .xls)
✅ Remove password protection
✅ Re-create file if corrupted
```

### Issue: "Missing required fields"

**Causes**:
1. Wrong column names
2. Empty cells
3. Extra spaces in column names

**Solution**:
```
✅ Use exact column names (no extra spaces)
✅ Fill all required fields
✅ Check for typos in column names
```

## Support

For issues with Excel template:

1. Check this guide first
2. Review error messages
3. Verify file format
4. Test with sample data

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0
