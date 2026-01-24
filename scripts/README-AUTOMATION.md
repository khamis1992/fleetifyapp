# Legal Case Automation System

## Overview

Comprehensive Playwright-based automation system for submitting legal cases to Qatar's court system (https://adlsala.ada.gov.qa). This system automates the entire case submission workflow including authentication, case details entry, party information, document uploads, and final submission.

## Features

- ✅ Complete 30-step workflow automation
- ✅ Excel data integration for customer information
- ✅ Automatic Arabic amount conversion (numbers to words)
- ✅ CAPTCHA detection and handling with user pause
- ✅ Document uploads from customer folders
- ✅ Comprehensive error handling and retry logic
- ✅ Detailed logging and screenshot capture
- ✅ Headless and debug modes
- ✅ Progress tracking and reporting
- ✅ Validation of data and documents before execution

## Installation

The required dependencies are already installed in the project:

- `playwright` - Browser automation
- `xlsx` - Excel file parsing
- `tsx` - TypeScript execution

If Playwright browsers are not installed, run:

```bash
npx playwright install chromium
```

## Project Structure

```
scripts/
├── legal-case-automation.ts         # Main automation script
├── config/
│   └── automation.config.ts          # Configuration and credentials
├── utils/
│   ├── excelReader.ts                # Excel parsing utilities
│   ├── amountConverter.ts            # Arabic amount conversion
│   └── captchaHandler.ts             # CAPTCHA detection and handling
└── types/
    └── automation.types.ts           # TypeScript type definitions
```

## Data Structure

### Customer Folder Structure

Create a folder for each customer in `data/customers/{customerName}/`:

```
data/customers/
├── Ahmed Al-Mohammed/
│   ├── data.xlsx                     # Customer data file
│   ├── المذكرة الشارحة.pdf           # Memo (PDF)
│   ├── المذكرة الشارحة.docx          # Memo (DOCX)
│   ├── حافظة المستندات.pdf           # Portfolio
│   ├── IBAN.pdf                      # IBAN document
│   ├── بطاقة شخصية.pdf               # ID card
│   └── سجل تجاري.pdf                 # Commercial record
└── Fatima Al-Ali/
    ├── data.xlsx
    └── [... documents ...]
```

### Excel File Structure (data.xlsx)

The Excel file must contain the following columns:

| Column (English) | Column (Arabic) | Required | Description |
|-----------------|-----------------|----------|-------------|
| FirstName       | الاسم الأول     | ✅       | First name |
| FamilyName      | اسم العائلة     | ✅       | Family name |
| Nationality     | الجنسية         | ✅       | Nationality |
| IDNumber        | رقم الهوية      | ✅       | Qatari ID number |
| Mobile          | رقم الجوال      | ✅       | Mobile number |
| Amount          | المبلغ الإجمالي | ✅       | Claim amount (QAR) |
| Facts           | الوقائع         | ✅       | Case facts/description |
| Requests        | الطلبات         | ✅       | Court requests/claims |

**Example Excel Data:**

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Ahmed     | Al-Mohammed | قطري      | 29263400736 | 55123456 | 15000 | This is a contract dispute... | We request the court to order... |

### Required Documents

Each customer folder must contain:

1. **المذكرة الشارحة** - Legal memo (BOTH PDF and DOCX required)
2. **حافظة المستندات** - Document portfolio (PDF or DOCX)
3. **رقم الحساب الدولي (IBAN)** - IBAN document (PDF/image)
4. **بطاقة شخصية** - ID card (PDF/image)
5. **سجل تجاري** - Commercial record (PDF/image)

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Qatar Court Credentials
QATAR_COURT_USERNAME=29263400736
QATAR_COURT_PASSWORD=Khamees1992#

# Headless Mode (true/false)
HEADLESS=false
```

### Config File

Edit `scripts/config/automation.config.ts` to change:

- Court information
- Case types and classifications
- File paths
- Automation settings (timeouts, retries, etc.)
- Screenshot and log directories

## Usage

### Basic Usage

```bash
npm run automate:case -- --customer="Ahmed Al-Mohammed"
```

### Debug Mode (Browser Visible)

```bash
npm run automate:case:debug -- --customer="Ahmed Al-Mohammed"
# or
npm run automate:case -- --customer="Ahmed Al-Mohammed" --headless=false
```

### Headless Mode (Background)

```bash
npm run automate:case:headless -- --customer="Ahmed Al-Mohammed"
# or
npm run automate:case -- --customer="Ahmed Al-Mohammed" --headless=true
```

## Workflow Steps

The automation executes 30 steps across 7 phases:

### Phase 1: Authentication (Steps 1-4)
1. Login page - Select "الدخول عبر النظام التوثيق الوطني"
2. National Authentication - Enter credentials and handle CAPTCHA
3. Select user type: "مُتقاضي فرد" (Individual Plaintiff)
4. Ensure sidebar is visible

### Phase 2: Navigate to Case Creation (Step 5)
5. Click "إدارة الدعاوى" → "إنشاء دعوى"

### Phase 3: Court & Case Type (Step 6)
6. Fill court information:
   - المحكمة: محكمة الاستثمار والتجارة
   - نوع الإجراء: استثمار
   - درجة التقاضي: إبتدائي
   - النوع: عقود الخدمات التجارية
   - النوع الفرعي: عقود إيجار السيارات وخدمات الليموزين
   - الموضوع الفرعي: لا ينطبق
   - التصنيف: تجاري

### Phase 4: Case Details (Step 8)
8. Fill case details from Excel:
   - عنوان الدعوى: "مطالبة مالية-إيجار سيارة"
   - الوقائع: From Excel
   - الطلبات: From Excel
   - نوع المطالبة: قيمة المطالبة
   - المبلغ: From Excel
   - المبلغ الإجمالي كتابة: Auto-converted to Arabic words

### Phase 5: Add Defendant Party (Steps 9-19)
9-19. Fill party information:
   - Party classification: شخص طبيعي
   - Party capacity: المدعى عليه
   - Order: 1
   - Name: From Excel
   - Gender: ذكر
   - Nationality: From Excel
   - ID Type: رخصة مقيم
   - ID Number: From Excel
   - Address: "الجوحة - قطر"
   - Mobile: From Excel
   - Email: "khamis-1992@hotmail.com"

### Phase 6: Edit & Save Party (Steps 20-21)
20-21. Find party, edit, and save

### Phase 7: Upload Documents (Steps 23-27)
23. Upload المذكرة الشارحة (PDF + DOCX)
24. Upload حافظة المستندات
25. Upload IBAN document
26. Upload ID card
27. Upload commercial record

### Phase 8: Final Submission (Steps 28-30)
28-29. Click "التالي" (Next) twice
30. Click "اعتماد" (Submit) and capture case reference

## CAPTCHA Handling

The system automatically detects and handles CAPTCHAs:

1. **Detection**: System scans for common CAPTCHA elements
2. **Pause**: When CAPTCHA is detected, automation pauses
3. **User Action**: Console message prompts you to solve CAPTCHA
4. **Resume**: Automation continues automatically after CAPTCHA is solved

**Example Output:**
```
⚠️  CAPTCHA DETECTED
================================================================================
Please solve the CAPTCHA in the browser window.
The automation will resume automatically after the CAPTCHA is solved.
================================================================================
Waiting for CAPTCHA to be solved...
✓ CAPTCHA solved! Resuming automation...
```

## Logging and Screenshots

### Log Files

Logs are saved to: `logs/automation/{customerName}-{timestamp}.log`

**Example Log Entry:**
```
[2025-01-24T10:30:45.123Z] Starting automation for customer: Ahmed Al-Mohammed
[2025-01-24T10:30:46.456Z] ✓ Customer data loaded successfully
[2025-01-24T10:30:47.789Z] [Step 1] Login - Select National Authentication
[2025-01-24T10:30:50.123Z] ✓ [Step 1] Login - Select National Authentication - Completed
...
```

### Screenshots

Screenshots are automatically captured on errors and saved to:
`logs/screenshots/{customerName}/step-{stepNumber}-{timestamp}.png`

### Results

JSON results are saved to: `logs/results/{customerName}-{timestamp}.json`

**Result Structure:**
```json
{
  "success": true,
  "customerName": "Ahmed Al-Mohammed",
  "steps": [
    {
      "stepNumber": 1,
      "description": "Login - Select National Authentication",
      "status": "completed",
      "timestamp": "2025-01-24T10:30:50.123Z"
    }
  ],
  "errors": [],
  "timestamp": "2025-01-24T10:30:45.000Z",
  "duration": 45000
}
```

## Error Handling

The system includes comprehensive error handling:

### Retry Logic
- Elements are retried up to 3 times
- Exponential backoff between retries
- Configurable timeout and delay

### Validation Errors
**Missing Excel Data:**
```
Error: Missing required fields: FirstName, Mobile
```

**Missing Documents:**
```
Error: Missing required documents: المذكرة الشارحة (DOCX), IBAN document
```

### Runtime Errors
- Screenshot captured on error
- Detailed error message logged
- Graceful cleanup (browser closed)

## Troubleshooting

### Issue: "Excel file not found"
**Solution**: Check that:
1. Customer folder exists in `data/customers/`
2. Excel file is named `data.xlsx`
3. Path matches exactly (case-sensitive)

### Issue: "Missing required documents"
**Solution**: Verify:
1. All required documents exist in customer folder
2. Filenames match expected patterns (Arabic or English)
3. Both PDF and DOCX versions of memo exist

### Issue: "Element not found"
**Solution**:
1. Run in debug mode (`--headless=false`)
2. Check if page structure changed
3. Increase timeout in config
4. Take screenshot to see actual page state

### Issue: "CAPTCHA timeout"
**Solution**:
1. Ensure browser window is visible
2. Solve CAPTCHA quickly (5-minute timeout)
3. Check for multiple CAPTCHAs in sequence

### Issue: "Authentication failed"
**Solution**:
1. Verify credentials in `.env` or config
2. Check if username/password changed
3. Ensure account is not locked

## Best Practices

### Before Running
1. ✅ Verify customer data in Excel
2. ✅ Check all documents exist
3. ✅ Test with debug mode first
4. ✅ Ensure stable internet connection
5. ✅ Close unnecessary browser windows

### During Execution
1. ✅ Monitor console output
2. ✅ Be ready to solve CAPTCHAs
3. ✅ Don't interfere with browser window
4. ✅ Let automation complete fully

### After Execution
1. ✅ Check log files for errors
2. ✅ Verify case was submitted
3. ✅ Save case reference number
4. ✅ Review screenshots if errors occurred

## Advanced Usage

### Batch Processing

Create a batch script to process multiple customers:

```bash
#!/bin/bash
customers=("Ahmed Al-Mohammed" "Fatima Al-Ali" "Mohammed Al-Thani")

for customer in "${customers[@]}"; do
  echo "Processing: $customer"
  npm run automate:case -- --customer="$customer" --headless=false
  sleep 5
done
```

### Custom Selectors

If the court website changes, update selectors in the main script:

```typescript
// Example: Update login button selector
const loginButton = this.page!.locator('button:has-text("تسجيل دخول")').or(
  this.page!.locator('[data-testid="login-btn"]') // Add new selector
);
```

### Custom Validation

Add custom validation in `excelReader.ts`:

```typescript
export function validateMobileNumber(mobile: string): boolean {
  return /^5\d{7}$/.test(mobile); // Qatar mobile format
}
```

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Credentials**: Never commit credentials to version control
   - Use environment variables
   - Add `.env` to `.gitignore`
   - Rotate passwords regularly

2. **Data Protection**:
   - Customer data contains sensitive information
   - Encrypt Excel files if possible
   - Delete logs after use if needed
   - Don't share screenshots publicly

3. **Access Control**:
   - Limit access to automation scripts
   - Audit usage logs regularly
   - Use separate automation accounts

## Performance Optimization

### Speed Up Execution

```typescript
// In automation.config.ts
automation: {
  slowMo: 0,              // Remove delay between actions
  timeout: 10000,         // Reduce timeout
  headless: true          // Run headless
}
```

### Parallel Processing

Run multiple automations in parallel (use with caution):

```bash
npm run automate:case -- --customer="Customer 1" &
npm run automate:case -- --customer="Customer 2" &
```

## Support and Maintenance

### Version Control

Track automation script version and website changes:

```bash
git log scripts/legal-case-automation.ts
```

### Testing

Test after any website changes:

```bash
npm run automate:case:debug -- --customer="Test Customer"
```

### Updates

When website structure changes:
1. Run in debug mode
2. Identify failing steps
3. Update selectors
4. Test thoroughly
5. Commit changes

## Contributing

When adding features:

1. Follow existing code structure
2. Add TypeScript types
3. Include error handling
4. Update documentation
5. Test with real data

## License

This automation system is proprietary software for شركة العراف لتأجير السيارات (Al-Araf Car Rental).

---

**Last Updated**: 2025-01-24
**Version**: 1.0.0
**Maintainer**: Fleetify Development Team
