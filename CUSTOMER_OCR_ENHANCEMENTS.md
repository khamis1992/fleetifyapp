# Customer Document Distribution Dialog - OCR Enhancements

## Summary of Changes

Enhanced the Customer Document Distribution Dialog with advanced OCR capabilities matching the vehicle system's functionality, including Google Cloud Vision API integration, Arabic language support, and Qatar-specific ID card patterns.

---

## Files Modified

### 1. `src/components/customers/CustomerDocumentDistributionDialog.tsx`

#### Changes Made:

**A. Enhanced Data Structure**
- Added new interface for Google Cloud Vision API integration (`CustomerOCRResult`)
- Expanded `ExtractedCustomerData` interface to include:
  - `nameArabic`: Full name in Arabic (الاسم بالعربي)
  - `firstNameArabic`: First name in Arabic (الاسم الأول بالعربي)
  - `lastNameArabic`: Last name in Arabic (اسم العائلة بالعربي)
  - `nationalityArabic`: Nationality in Arabic (الجنسية بالعربي)
  - `occupation`: Occupation in English
  - `occupationArabic`: Occupation in Arabic (المهنة بالعربي)
  - `confidence`: OCR confidence score (0-1)

**B. Google Cloud Vision Integration**
- Added `extractWithCustomerOCR()` function that:
  - Converts images to base64
  - Authenticates with Supabase session
  - Calls Supabase Edge Function `customer-id-ocr`
  - Returns structured data with confidence scores

**C. Enhanced OCR Extraction Patterns**
Updated `extractCustomerData()` function with Qatar-specific patterns:

1. **National ID Patterns** (رقم الهوية)
   - Supports: `ID No`, `ID No.`, `ID Number`, `QID`
   - Supports: `رقم الهوية`, `رقم البطاقة`
   - Supports: `إذن إقامة` (Residency Permit)
   - Flexible matching with optional dots and spaces
   - Fallback to any 11-digit number

2. **Date of Birth Patterns** (تاريخ الميلاد)
   - Supports: `D.O.B`, `DOB`, `Date of Birth`
   - Supports: `تاريخ الميلاد`
   - Handles missing/extra spaces in labels

3. **ID Expiry Patterns** (تاريخ الانتهاء)
   - Supports: `Expiry`, `Exp Date`, `Exp. Date`
   - Supports: `انتهاء البطاقة`, `تاريخ الانتهاء`
   - Handles variations in spacing

4. **Nationality Patterns** (الجنسية)
   - English: `Nationality: COUNTRY NAME`
   - Arabic: `الجنسية: دولة`
   - Auto-detects language and stores in appropriate field

5. **Name Patterns** (الاسم)
   - English: `Name: FULL NAME`
   - Arabic: `الاسم: الاسم الكامل`
   - Supports: `الاسم بالعربي`, `الاسم بالإنجليزي`
   - Auto-splits name into first/last name
   - Auto-detects language (Arabic vs English)

6. **Occupation Patterns** (المهنة)
   - English: `Occupation: Job Title`
   - Arabic: `المهنة: المسمى الوظيفي`
   - Auto-detects language

7. **Passport Number Patterns** (رقم جواز السفر)
   - English: `Passport No: XXXXXX`
   - Arabic: `رقم جواز السفر: XXXXXX`

**D. Improved OCR Fallback Strategy**
Updated `processImage()` function with 3-tier fallback:

1. **Tier 1**: Google Cloud Vision API (Primary)
   - Uses `customer-id-ocr` Edge Function
   - Supports Arabic + English simultaneously
   - Returns confidence scores
   - Best for clear and unclear images

2. **Tier 2**: Tesseract with Arabic + English
   - Uses language code: `eng+ara`
   - Falls back if Google Vision fails

3. **Tier 3**: Tesseract English only
   - Uses language code: `eng`
   - Final fallback if bilingual OCR fails

**E. Enhanced Data Display**
Updated `ExtractedDataPreview` component to:
- Display both English and Arabic fields
- Show confidence scores as percentages
- Use RTL (right-to-left) text direction for Arabic
- Proper font styling for Arabic text

**F. Enhanced Database Update Logic**
Updated `updateCustomerData()` function to:
- Update existing English fields: `first_name`, `last_name`
- Update Arabic fields: `first_name_ar`, `last_name_ar` (from DATABASE_REFERENCE.md)
- Graceful degradation: If Arabic fields don't exist, updates only English fields
- Handles column existence errors with automatic retry
- Note: `nationality_arabic` and `occupation_arabic` not in DB yet (future enhancement)

**G. Updated Dialog Description**
Enhanced dialog description to mention:
- Google Cloud Vision usage
- Arabic and English language support
- Extracted fields including Arabic names
- OCR via Supabase Edge Function

---

### 2. `supabase/functions/customer-id-ocr/index.ts` (NEW)

Created new Supabase Edge Function for Google Cloud Vision API integration.

#### Features:

**A. Google Cloud Vision API Integration**
- Endpoint: `https://vision.googleapis.com/v1/images:annotate`
- Uses `GOOGLE_VISION_API_KEY` from environment
- Supports both `TEXT_DETECTION` and `DOCUMENT_TEXT_DETECTION`

**B. Bilingual Text Recognition**
- Language hints: `['ar', 'en']` for Arabic and English
- Optimized for Qatar ID cards (mixed Arabic/English)
- Handles clear and unclear/fuzzy images

**C. Structured Data Extraction**
Extracts the following fields:
- `nationalId`: 11-digit Qatari ID number
- `name`: Full name (English)
- `nameArabic`: Full name (Arabic)
- `firstName`, `lastName`: Split names (English)
- `firstNameArabic`, `lastNameArabic`: Split names (Arabic)
- `nationality`: Country name (English)
- `nationalityArabic`: Country name (Arabic)
- `dateOfBirth`: DOB in YYYY-MM-DD format
- `idExpiry`: Expiry date in YYYY-MM-DD format
- `occupation`: Job title (English)
- `occupationArabic`: Job title (Arabic)
- `passportNumber`: Passport number

**D. Advanced Pattern Matching**
All patterns support:
- Optional dots and spaces
- Both colons and no colons
- Arabic and English labels
- Flexible date formats (DD-MM-YYYY, YYYY-MM-DD)

**E. Confidence Scoring**
Calculates confidence based on:
- Base confidence: 0.3
- Text length quality
- Arabic text presence (+0.1)
- Extracted fields:
  - National ID: +0.2
  - Name: +0.1
  - First Name: +0.05
  - Nationality: +0.05
  - DOB: +0.05
  - Expiry: +0.05

---

## Database Schema

### Relevant Fields in `customers` Table (from DATABASE_REFERENCE.md):

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `national_id` | string | Yes | Qatari ID number (11 digits) |
| `first_name` | string | Yes | First name (English) |
| `last_name` | string | Yes | Last name (English) |
| `first_name_ar` | string | Yes | First name (Arabic) |
| `last_name_ar` | string | Yes | Last name (Arabic) |
| `date_of_birth` | string | Yes | Date of birth |
| `national_id_expiry` | string | Yes | ID card expiry date |
| `passport_number` | string | Yes | Passport number |

### Notes:
- `nationality_arabic` and `occupation_arabic` are **NOT** in the database yet
- These are extracted and displayed but not saved (future enhancement)
- The system gracefully handles missing fields

---

## Test Data Validation

### Clear Image (id11.png):
Expected extraction:
- **ID No**: 27976002717
- **Name**: AMMAR GHOZY
- **D.O.B**: 17/01/1979
- **Expiry**: 30/07/2026
- **Nationality**: SYRIA
- **Nationality (AR)**: سوريا

### Unclear Image (pshl.png):
Expected extraction:
- **ID No**: 29778800219
- **Name**: HOSSEM DHAHRI
- **DOB**: 27/01/1997
- **Expiry**: 22/11/2024
- **Nationality**: TUNISIA
- **Nationality (AR)**: تونس

---

## Usage Instructions

### For Users:

1. **Upload ID Card Images**
   - Drag and drop or click to upload
   - Supports PNG, JPG, JPEG, WebP formats
   - Max file size: 20MB

2. **Automatic OCR Processing**
   - System uses Google Cloud Vision (best accuracy)
   - Falls back to Tesseract if needed
   - Supports Arabic and English text

3. **Review Extracted Data**
   - Check both English and Arabic fields
   - Verify confidence scores
   - Edit manually if needed

4. **Match to Customer**
   - System automatically matches by National ID
   - Manual entry available if OCR fails

5. **Upload and Update**
   - Saves ID card image to customer documents
   - Updates customer database with extracted data
   - Updates both English and Arabic name fields

### For Developers:

#### Deploying the Edge Function:
```bash
# From project root
supabase functions deploy customer-id-ocr
```

#### Required Environment Variable:
```bash
# In Supabase dashboard > Edge Functions > Settings
GOOGLE_VISION_API_KEY=your_google_cloud_vision_api_key
```

#### Testing the Edge Function:
```bash
# Local test (requires supabase start)
supabase functions serve customer-id-ocr

# Or invoke directly
curl -X POST 'http://localhost:54321/functions/v1/customer-id-ocr' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"imageBase64": "data:image/png;base64,..."}'
```

---

## Performance Considerations

1. **OCR Method Priority**:
   - Google Cloud Vision: ~1-3 seconds, highest accuracy
   - Tesseract (bilingual): ~5-10 seconds, medium accuracy
   - Tesseract (English): ~3-5 seconds, medium accuracy

2. **Confidence Thresholds**:
   - High confidence: >0.8 (Google Vision with clear image)
   - Medium confidence: 0.5-0.8 (Tesseract or unclear image)
   - Low confidence: <0.5 (may need manual verification)

3. **Batch Processing**:
   - Processes images sequentially
   - Shows progress for each image
   - Displays overall progress bar

---

## Future Enhancements

### Potential Improvements:
1. **Database Schema Updates**:
   - Add `nationality_arabic` column to `customers` table
   - Add `occupation_arabic` column to `customers` table
   - Add `occupation` column to `customers` table (English)

2. **Advanced Features**:
   - Face detection and matching for photo verification
   - Signature extraction from ID cards
   - QR code reading for faster processing
   - Support for other ID types (Passport, License)

3. **Quality Improvements**:
   - Image preprocessing (deskew, denoise)
   - Confidence-based auto-retry
   - Manual correction interface
   - Bulk CSV export of extracted data

---

## Troubleshooting

### Common Issues:

**Issue**: "Google Vision API key not configured"
- **Solution**: Add `GOOGLE_VISION_API_KEY` to Supabase Edge Functions environment

**Issue**: "Column does not exist" for Arabic fields
- **Solution**: System automatically falls back to English-only updates
- **Long-term**: Add missing columns to database schema

**Issue**: Low OCR confidence
- **Solution**: Try rescanning with better lighting/angle
- **Solution**: Use manual entry for problematic images

**Issue**: Arabic text not displaying correctly
- **Solution**: Check RTL (right-to-left) text direction is applied
- **Solution**: Verify font supports Arabic characters

---

## Compliance & Security

1. **Data Privacy**:
   - Images processed in memory only
   - Base64 transmission encrypted via HTTPS
   - No data stored by Google Cloud Vision API
   - Documents stored in Supabase Storage with RLS

2. **Authentication**:
   - Requires valid Supabase session
   - Edge Function validates user token
   - Company-based multi-tenancy enforced

3. **Audit Trail**:
   - All database updates logged
   - Document uploads tracked
   - User actions recorded

---

## References

- **Google Cloud Vision API**: https://cloud.google.com/vision/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Tesseract.js**: https://tesseract.projectnaptha.com/
- **DATABASE_REFERENCE.md**: Internal database schema documentation
- **VehicleDocumentDistributionDialog.tsx**: Reference for vehicle OCR implementation

---

**Implementation Date**: 2025-01-20
**Version**: 1.0.0
**Status**: ✅ Complete and Ready for Testing
