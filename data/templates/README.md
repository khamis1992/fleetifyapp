# Excel Templates for Legal Case Management

## 📋 Available Templates

### 1. Customer Data Template (`customer-data-template.xlsx`)

Professional Excel template for importing customer data for legal cases in the Fleetify ERP system.

#### Features

- **3 Sheets Included:**
  1. **Customer Data** - Main data entry sheet with 4 sample rows
  2. **Instructions** - Detailed instructions in Arabic and English
  3. **Validation Rules** - Reference guide for data validation

#### Column Structure

| Column | English Header | Arabic Subtitle | Data Type | Required | Example |
|--------|----------------|----------------|-----------|----------|---------|
| A | FirstName | الاسم الأول | Text | Yes | أحمد |
| B | FamilyName | اسم العائلة | Text | Yes | محمد عبدالله |
| C | Nationality | الجنسية | Text | Yes | قطري |
| D | IDNumber | رقم الهوية | Text (11 digits) | Yes | 29263400736 |
| E | Mobile | رقم الجوال | Text (8 digits) | Yes | 66123456 |
| F | Amount | المبلغ الإجمالي | Number | Yes | 5500 |
| G | Facts | الوقائع | Long Text | Yes | Case description... |
| H | Requests | الطلبات | Long Text | Yes | Legal claims... |

#### Usage

1. **Download Template:**
   ```bash
   npm run create:template
   ```
   Or download from: `/data/templates/customer-data-template.xlsx`

2. **Fill Customer Data:**
   - Open the template in Excel or any spreadsheet software
   - Read the "Instructions" sheet for detailed guidance
   - Follow the "Validation Rules" sheet for data format requirements
   - Review sample data in rows 2-5 for examples
   - Replace sample data with actual customer data

3. **Import to System:**
   - Use the `readCustomerDataExcel()` function from `src/utils/document-export.ts`
   - Example:
     ```typescript
     import { readCustomerDataExcel } from '@/utils/document-export';

     const handleFileUpload = async (file: File) => {
       try {
         const customers = await readCustomerDataExcel(file);
         console.log(`Imported ${customers.length} customers`);
         // Process customer data...
       } catch (error) {
         console.error('Failed to import:', error);
       }
     };
     ```

#### Data Validation Rules

- **FirstName**: Arabic text only, no numbers or special characters
- **FamilyName**: Full family name in Arabic
- **Nationality**: Arabic nationality (قطري، مصري، سعودي، etc.)
- **IDNumber**: 11 digits for Qatari ID, no dashes or spaces
- **Mobile**: 8 digits starting with 3, 5, 6, or 7 (no country code)
- **Amount**: Positive integer numbers only (no currency symbols)
- **Facts**: Arabic text, 50-2000 characters, detailed case description
- **Requests**: Arabic text, numbered list of legal claims

#### Common Errors to Avoid

❌ **Wrong:** `+97466123456` (mobile with country code)
✅ **Correct:** `66123456`

❌ **Wrong:** `5,000` or `5000 QAR` (amount with formatting)
✅ **Correct:** `5000`

❌ **Wrong:** `Ahmed` (name in English)
✅ **Correct:** `أحمد`

❌ **Wrong:** `292-634-00736` (ID with dashes)
✅ **Correct:** `29263400736`

#### Programmatic Usage

##### Reading Excel File

```typescript
import { readCustomerDataExcel } from '@/utils/document-export';

// In a component
const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const customers = await readCustomerDataExcel(file);

    // Validate data
    const validCustomers = customers.filter(c =>
      c.firstName &&
      c.familyName &&
      c.idNumber.length === 11 &&
      c.mobile.length === 8
    );

    console.log(`Imported ${validCustomers.length} valid customers`);
  } catch (error) {
    console.error('Import failed:', error);
  }
};
```

##### Exporting to Excel

```typescript
import { exportCustomerDataToExcel, LegalCaseCustomerData } from '@/utils/document-export';

const customers: LegalCaseCustomerData[] = [
  {
    firstName: 'أحمد',
    familyName: 'محمد عبدالله',
    nationality: 'قطري',
    idNumber: '29263400736',
    mobile: '66123456',
    amount: 5500,
    facts: 'Case description...',
    requests: 'Legal claims...'
  }
];

exportCustomerDataToExcel(customers, 'legal-cases.xlsx');
```

##### Download Template

```typescript
import { downloadCustomerDataTemplate } from '@/utils/document-export';

// In a button click handler
const handleDownloadTemplate = () => {
  downloadCustomerDataTemplate();
};
```

## 🔧 Maintenance

### Regenerate Template

If you need to regenerate the template with updated formatting:

```bash
npm run create:template
```

This will create/update the template at:
`C:\Users\khamis\Desktop\fleetifyapp\data\templates\customer-data-template.xlsx`

### Template Script

The template generation script is located at:
`C:\Users\khamis\Desktop\fleetifyapp\scripts\create-excel-template.ts`

## 📊 File Structure

```
data/
└── templates/
    ├── customer-data-template.xlsx    # Main template file
    └── README.md                      # This file

scripts/
└── create-excel-template.ts           # Template generation script

src/
└── utils/
    └── document-export.ts             # Excel import/export utilities
```

## 🌐 Web Access

To make the template downloadable from the web application, ensure the `data/templates` directory is included in your Vite public assets or served through your backend API.

### Vite Configuration (if needed)

If the template isn't accessible, add to `vite.config.ts`:

```typescript
export default defineConfig({
  publicDir: 'data/templates', // Or copy to public/
  // ... other config
});
```

## 📝 License

This template is part of the Fleetify ERP system for شركة العراف لتأجير السيارات (Al-Araf Car Rental).

## 📞 Support

For issues or questions about the template:
1. Check the "Instructions" sheet in the template
2. Review the "Validation Rules" sheet
3. Contact the system administrator

---

**Last Updated:** January 24, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
