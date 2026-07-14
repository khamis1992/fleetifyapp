# Quick Start Guide - Legal Case Automation

## Prerequisites Checklist

Before you begin, ensure you have:

- ✅ Node.js 20.x installed
- ✅ Access to Qatar court system credentials
- ✅ Customer data prepared in Excel format
- ✅ Required documents (PDF, DOCX, etc.)
- ✅ Stable internet connection

## Step 1: Prepare Customer Data (5 minutes)

### 1.1 Create Customer Folder

```bash
mkdir -p "data/customers/Ahmed Al-Mohammed"
```

### 1.2 Create Excel File

Create `data/customers/Ahmed Al-Mohammed/data.xlsx` with these columns:

| FirstName | FamilyName | Nationality | IDNumber | Mobile | Amount | Facts | Requests |
|-----------|------------|-------------|----------|--------|--------|-------|----------|
| Ahmed | Al-Mohammed | قطري | 29263400736 | 55123456 | 15000 | Your case facts... | Your requests... |

**Quick Tips:**
- Use exact column names (case-sensitive)
- Mobile: 8 digits only (e.g., 55123456)
- ID: 11 digits (e.g., 29263400736)
- Amount: Number only (no currency symbol)

## Step 2: Prepare Documents (5 minutes)

Place these files in the customer folder:

```
data/customers/Ahmed Al-Mohammed/
├── data.xlsx
├── المذكرة الشارحة.pdf           ✅ Required
├── المذكرة الشارحة.docx          ✅ Required
├── حافظة المستندات.pdf           ✅ Required
├── IBAN.pdf                      ✅ Required (or similar name)
├── بطاقة شخصية.pdf               ✅ Required (or similar name)
└── سجل تجاري.pdf                 ✅ Required (or similar name)
```

**Document Requirements:**
- المذكرة الشارحة: Need BOTH PDF and DOCX
- Other documents: PDF preferred, images accepted
- Filenames can be in Arabic or English

## Step 3: Configure Credentials (2 minutes)

### Option A: Environment Variables (Recommended)

Create `.env` file in project root:

```bash
# Qatar Court Credentials
QATAR_COURT_USERNAME=<court-username>
QATAR_COURT_PASSWORD=<court-password>
LEGAL_CASE_CONTACT_EMAIL=<contact-email>

# Headless Mode
HEADLESS=false
```

### Option B: Edit Config File

Edit `scripts/config/automation.config.ts`:

```typescript
credentials: {
  username: process.env.QATAR_COURT_USERNAME,
  password: process.env.QATAR_COURT_PASSWORD
}
```

## Step 4: Run Automation (1 minute setup, 5-10 minutes execution)

### First Run (Debug Mode - Recommended)

```bash
npm run automate:case:debug -- --customer="Ahmed Al-Mohammed"
```

**What happens:**
1. Browser opens (visible)
2. Automation starts
3. If CAPTCHA appears, solve it manually
4. Wait for completion (5-10 minutes)
5. Case submitted!

### Production Run (Headless)

```bash
npm run automate:case -- --customer="Ahmed Al-Mohammed" --headless=true
```

## Step 5: Monitor Execution

Watch the console output:

```
================================================================================
Qatar Court System - Legal Case Automation
================================================================================
Customer: Ahmed Al-Mohammed
Headless: false
================================================================================

[2025-01-24T10:30:45.123Z] Starting automation for customer: Ahmed Al-Mohammed
[2025-01-24T10:30:46.456Z] ✓ Customer data loaded successfully
[2025-01-24T10:30:47.789Z] ✓ Found 5 document types
[2025-01-24T10:30:50.123Z] ✓ Browser initialized
[2025-01-24T10:30:51.456Z] [Step 1] Login - Select National Authentication
[2025-01-24T10:30:55.789Z] ✓ [Step 1] Login - Select National Authentication - Completed
...
```

## CAPTCHA Handling

When CAPTCHA appears:

```
⚠️  CAPTCHA DETECTED
================================================================================
Please solve the CAPTCHA in the browser window.
The automation will resume automatically after the CAPTCHA is solved.
================================================================================
Waiting for CAPTCHA to be solved...
```

**What to do:**
1. Look at the browser window
2. Solve the CAPTCHA
3. Wait for automation to resume
4. Do not close the browser

## Verify Results

### Check Logs

```bash
# View latest log
ls -lt logs/automation/

# View customer log
cat "logs/automation/Ahmed Al-Mohammed-*.log"
```

### Check Screenshots

```bash
# View screenshots (if errors occurred)
ls -l logs/screenshots/Ahmed\ Al-Mohammed/
```

### Check Results

```bash
# View JSON result
cat "logs/results/Ahmed Al-Mohammed-*.json"
```

## Common Issues and Quick Fixes

### Issue 1: "Excel file not found"

**Quick Fix:**
```bash
# Check file exists
ls -la "data/customers/Ahmed Al-Mohammed/data.xlsx"

# Verify name matches exactly
```

### Issue 2: "Missing required documents"

**Quick Fix:**
```bash
# List documents in folder
ls -la "data/customers/Ahmed Al-Mohammed/"

# Ensure all required files exist
```

### Issue 3: "Element not found"

**Quick Fix:**
```bash
# Run in debug mode to see what's happening
npm run automate:case:debug -- --customer="Ahmed Al-Mohammed"
```

### Issue 4: CAPTCHA timeout

**Quick Fix:**
- Solve CAPTCHA faster (within 5 minutes)
- Ensure browser window is visible
- Don't interfere with automation

## Success Indicators

✅ **Successful Run:**
```
================================================================================
✓ AUTOMATION COMPLETED SUCCESSFULLY!
✓ Duration: 456 seconds
================================================================================
Result saved: logs/results/Ahmed Al-Mohammed-1737726645123.json
```

❌ **Failed Run:**
```
================================================================================
ERROR: AUTOMATION FAILED!
Error: Element not found: ...
================================================================================
```

## Next Steps

### After Successful Submission

1. **Check Case Reference**: Look for reference number in logs
2. **Save Reference**: Record for future tracking
3. **Verify Online**: Check Qatar court portal
4. **Archive Documents**: Move processed files to archive

### Process Multiple Customers

```bash
#!/bin/bash
# Create batch script

customers=("Ahmed Al-Mohammed" "Fatima Al-Ali" "Mohammed Al-Thani")

for customer in "${customers[@]}"; do
  echo "Processing: $customer"
  npm run automate:case -- --customer="$customer" --headless=false
  echo "Waiting 10 seconds before next customer..."
  sleep 10
done
```

## Tips for Best Results

### Before Running
- ✅ Test with debug mode first
- ✅ Use stable internet connection
- ✅ Close other browser windows
- ✅ Have credentials ready

### During Execution
- ✅ Don't interfere with browser
- ✅ Be ready for CAPTCHA
- ✅ Monitor console output
- ✅ Let it complete fully

### After Completion
- ✅ Check logs for errors
- ✅ Save case reference
- ✅ Archive documents
- ✅ Verify submission

## Time Estimates

| Task | Time |
|------|------|
| Setup customer folder | 5 minutes |
| Create Excel file | 5 minutes |
| Prepare documents | 5 minutes |
| Configure credentials | 2 minutes |
| Run automation | 5-10 minutes |
| **Total First Time** | **22-27 minutes** |
| **Subsequent Runs** | **5-10 minutes** |

## Need Help?

1. **Check Documentation**: `scripts/README-AUTOMATION.md`
2. **Excel Guide**: `scripts/EXCEL-TEMPLATE-GUIDE.md`
3. **Review Logs**: Check automation logs
4. **Run Debug Mode**: See what's happening in browser

## Example Complete Workflow

```bash
# 1. Create customer folder
mkdir -p "data/customers/Ahmed Al-Mohammed"

# 2. Add Excel file (manually create)
# data/customers/Ahmed Al-Mohammed/data.xlsx

# 3. Add documents (manually copy)
# المذكرة الشارحة.pdf
# المذكرة الشارحة.docx
# etc.

# 4. Set credentials (one time)
echo 'QATAR_COURT_USERNAME=<court-username>' >> .env
echo 'QATAR_COURT_PASSWORD=<court-password>' >> .env
echo 'LEGAL_CASE_CONTACT_EMAIL=<contact-email>' >> .env

# 5. Run automation
npm run automate:case:debug -- --customer="Ahmed Al-Mohammed"

# 6. Check results
cat logs/results/Ahmed\ Al-Mohammed-*.json
```

---

**You're ready to automate!** 🚀

Start with debug mode, then switch to headless once comfortable.

**Last Updated**: 2025-01-24
