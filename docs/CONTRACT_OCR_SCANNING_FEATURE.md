# 📸 Contract OCR Scanning Feature

## Overview

The Contract OCR (Optical Character Recognition) Scanning feature allows users to automatically extract data from physical rental agreement documents by taking a photo or uploading an image. This dramatically speeds up contract creation by eliminating manual data entry.

---

## ✨ Key Features

### 1. **Multiple Input Methods**
- 📷 **Camera Capture**: Take a photo directly using device camera
- 📁 **File Upload**: Upload existing images (JPG, PNG, HEIC)

### 2. **AI-Powered Data Extraction**
- Uses **GPT-4 Omni** (Vision API) for accurate Arabic text recognition
- Extracts structured data from rental agreements
- Supports both printed and handwritten text
- Handles Arabic language contracts

### 3. **Extracted Data Fields**

#### Agreement Information
- Agreement Number
- Agreement Date  
- Agreement Type

#### Customer Information
- Full Name
- Civil ID Number
- Phone Number
- Nationality
- Address

#### Vehicle Information
- Make/Manufacturer
- Model
- Plate Number
- Chassis Number
- Year

#### Financial Terms
- Monthly Rent Amount
- Guarantee/Security Deposit
- Contract Duration (in months)
- Start Date
- End Date

### 4. **Auto-Fill Contract Form**
- Automatically populates the contract wizard with extracted data
- Intelligent field mapping
- Preserves data for manual verification

---

## 🚀 How to Use

### Step 1: Open Contract Creation
1. Navigate to **Contracts** page
2. Click **"إنشاء عقد جديد"** (Create New Contract)
3. The Contract Wizard dialog will open

### Step 2: Scan Agreement
1. Click the **"مسح عقد"** (Scan Contract) button in the wizard header
2. Scanner dialog will appear with two options:
   - **رفع ملف** (Upload File): Select image from device
   - **التقاط صورة** (Take Photo): Use camera directly

### Step 3: Select Image
- **For Upload**: Choose an image file from your device
- **For Camera**: Allow camera access and take a photo
- Supported formats: JPG, PNG, HEIC
- Max file size: 10MB

### Step 4: Extract Data
1. Preview the selected image
2. Click **"استخراج البيانات"** (Extract Data)
3. Wait for AI processing (typically 5-10 seconds)
4. Progress bar shows extraction status

### Step 5: Review & Complete
- Extracted data automatically fills the contract form
- Review all fields for accuracy
- Manually adjust any incorrect or missing data
- Complete remaining wizard steps
- Submit the contract

---

## 🎯 Best Practices for Optimal Results

### Image Quality
✅ **DO:**
- Use good lighting (natural light is best)
- Ensure document is flat and not wrinkled
- Capture the entire document in one frame
- Hold camera steady (avoid blur)
- Take photo perpendicular to document (avoid angles)

❌ **DON'T:**
- Take photos in dim lighting
- Include shadows or reflections
- Crop parts of the document
- Use very low resolution images
- Take photos at extreme angles

### Document Preparation
- Lay document flat on a contrasting surface
- Remove any objects covering the text
- Ensure all text is clearly visible
- For multi-page contracts, scan the main page with key details

---

## 🔧 Technical Details

### Architecture

```
┌─────────────────┐
│  User Interface │
│  (Scanner UI)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  useContractOCR │  ◄─── Hook for OCR processing
│     Hook        │
└────────┬────────┘
         │
         ├──► Convert image to base64
         │
         ├──► Fetch OpenAI API key from Supabase
         │
         ├──► Call GPT-4 Vision API
         │
         ├──► Parse JSON response
         │
         └──► Validate and clean data
                    │
                    ▼
         ┌──────────────────┐
         │  Contract Wizard  │
         │  (Auto-filled)    │
         └──────────────────┘
```

### Files Created

1. **`ContractScannerDialog.tsx`**
   - UI component for scanning interface
   - Handles file selection and preview
   - Shows progress and results
   - Location: `src/components/contracts/`

2. **`useContractOCR.ts`**
   - Custom React hook for OCR functionality
   - Manages API calls to OpenAI
   - Data extraction and validation logic
   - Location: `src/hooks/`

3. **`ContractWizard.tsx`** (Updated)
   - Added scan button in header
   - Integrated scanner dialog
   - Auto-fill logic for extracted data

---

## 📊 Data Mapping

The OCR system maps extracted data to contract form fields as follows:

| Extracted Field | Contract Form Field | Type |
|----------------|-------------------|------|
| `contract_number` | `contract_number` | string |
| `contract_date` | `contract_date` | date |
| `agreement_type` | `contract_type` | string |
| `start_date` | `start_date` | date |
| `end_date` | `end_date` | date |
| `contract_duration_months` | `duration_months` | number |
| `monthly_rent` | `monthly_amount` | number |
| `guarantee_amount` | `guarantee_amount` | number |
| `customer_name` | `scanned_customer_name` | string (for matching) |
| `customer_civil_id` | `scanned_customer_id` | string (for matching) |
| `customer_phone` | `scanned_customer_phone` | string (for matching) |
| `vehicle_make` | `scanned_vehicle_make` | string (for matching) |
| `vehicle_model` | `scanned_vehicle_model` | string (for matching) |
| `vehicle_plate` | `scanned_vehicle_plate` | string (for matching) |

---

## 🔒 Security & Privacy

### API Key Management
- OpenAI API key is stored securely in Supabase
- Retrieved from `companies.settings.openai_api_key`
- Not exposed in client-side code
- Company-level configuration

### Data Processing
- Images are processed client-side before upload
- Base64 encoding for secure transmission
- No images are stored permanently
- Data is extracted and immediately discarded

### Access Control
- Requires authenticated user
- Company-level RLS policies apply
- Only authorized users can create contracts

---

## 💡 Tips & Tricks

### For Individual Customers
- Ensure first and last names are clearly visible
- Civil ID number should be complete and readable
- Phone number format should be consistent

### For Company Customers
- Company name should be prominently displayed
- Look for company commercial registration
- Verify company contact information

### For Financial Data
- Amounts should have clear decimal points
- Currency symbols may be extracted
- Verify all financial calculations manually

### For Vehicle Information
- Plate numbers should follow standard format
- Make/Model should be in Arabic or English
- Chassis number (VIN) should be complete

---

## ⚠️ Common Issues & Solutions

### Issue: Low Confidence Score
**Solution:**
- Retake photo with better lighting
- Ensure document is flat and unwrinkled
- Use a higher resolution camera
- Clean camera lens

### Issue: Missing Fields
**Solution:**
- Verify all information is visible in image
- Check if text is handwritten (may be harder to read)
- Manually enter missing information
- Some fields may not be on every contract type

### Issue: Incorrect Data
**Solution:**
- Always review extracted data before submitting
- Manually correct any errors
- For critical fields (amounts, dates), double-check source document

### Issue: API Error
**Solution:**
- Check OpenAI API key is configured correctly
- Verify internet connection
- Check Supabase company settings
- Contact system administrator

---

## 📈 Future Enhancements

### Planned Features
- [ ] Multi-page document scanning
- [ ] Automatic customer/vehicle matching from database
- [ ] Batch scanning for multiple contracts
- [ ] OCR confidence scoring per field
- [ ] Support for more document types (invoices, receipts)
- [ ] Offline OCR capability
- [ ] Auto-rotation and perspective correction
- [ ] Document quality pre-check

### Potential Improvements
- Enhanced Arabic handwriting recognition
- Support for different contract templates
- Integration with document management system
- Audit trail for OCR operations
- Machine learning model fine-tuning for better accuracy

---

## 🆘 Support

### For Users
- Contact your system administrator for OpenAI API key configuration
- Refer to this documentation for usage instructions
- Report issues through the system feedback form

### For Administrators
- Ensure OpenAI API key is configured in Supabase
- Monitor API usage and costs in OpenAI dashboard
- Set appropriate rate limits if needed
- Review extracted data quality regularly

---

## 📝 Version History

### Version 1.0.0 (2025-10-25)
- Initial release
- Basic OCR functionality with GPT-4 Vision
- Support for Arabic rental agreements
- Auto-fill contract wizard
- Upload and camera capture modes

---

## 🔗 Related Documentation

- [Contract Management Guide](./CONTRACT_MANAGEMENT.md)
- [OpenAI API Configuration](./OPENAI_API_SETUP.md)
- [Supabase Settings](./SUPABASE_CONFIGURATION.md)

---

**Built with ❤️ for Fleetify ERP System**
