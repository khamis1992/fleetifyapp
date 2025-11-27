# Testing Guide for Intelligent Invoice Scanner

## Quick Test Checklist

### ✅ System Status Verification

1. **Development Server**: ✅ Running on http://localhost:8081/
2. **Edge Function**: ✅ Deployed (`scan-invoice`)
3. **Database Migration**: ✅ Applied 
4. **React Components**: ✅ Compiled successfully
5. **Routes**: ✅ Added to `/invoice-scanner`

### 🧪 Test Scenarios

#### Test 1: Basic Navigation
1. Open http://localhost:8081/
2. Login to the system
3. Navigate to `/invoice-scanner`
4. Verify the page loads with tabs: Scanner, History, Stats, Settings

#### Test 2: OCR Engine Configuration
1. Go to Scanner tab
2. Check OCR engine dropdown (Gemini, Google Vision, Hybrid)
3. Check language selection (Auto, Arabic, English)
4. Verify settings are saved

#### Test 3: Mock Invoice Processing
1. Upload any image file (PNG/JPG)
2. Watch progress indicator
3. Check if OCR function is called
4. Verify results display (even if processing fails, UI should handle gracefully)

#### Test 4: Fuzzy Matching Utilities
```typescript
// Test in browser console (F12):
import { calculateNameSimilarity } from '/src/utils/fuzzyMatching.ts';

// Test cases:
const testCases = [
  ['محمد أحمد', 'Mohammed Ahmed'],  // Should be high similarity
  ['خالد سالم', 'Khalid Salem'],     // Should be high similarity  
  ['احمد علي', 'Ahmad Ali'],        // Should be high similarity
  ['random name', 'محمد احمد']       // Should be low similarity
];
```

#### Test 5: Database Tables
```sql
-- Verify tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'invoice%';

-- Expected tables:
-- invoice_scans
-- invoice_scanning_settings  
-- custom_transliterations
-- invoice_matching_feedback
```

### 🔧 Development Testing Commands

```bash
# Check function deployment
npx supabase functions list

# Test function locally (if needed)
npx supabase functions serve scan-invoice

# Check migration status
npx supabase migration list

# Run development server
npm run dev
```

### 📊 Expected Test Results

#### UI Components
- ✅ Invoice scanner page loads
- ✅ File upload interface works
- ✅ Progress indicators display
- ✅ Tabs navigate properly
- ✅ Statistics show placeholder data

#### Edge Function
- ✅ Function deployed successfully
- ✅ Accepts image uploads
- ✅ Returns structured JSON responses
- ✅ Handles errors gracefully

#### Database
- ✅ All tables created
- ✅ RLS policies active
- ✅ Functions available
- ✅ Indexes created

#### Fuzzy Matching
- ✅ Arabic text normalization
- ✅ Transliteration mapping
- ✅ Similarity calculations
- ✅ Context extraction

### 🐛 Common Issues & Solutions

#### Issue 1: Function Not Found
```bash
Solution: Redeploy function
npx supabase functions deploy scan-invoice
```

#### Issue 2: Database Connection
```bash
Solution: Check Supabase credentials
npm run db:status
```

#### Issue 3: TypeScript Errors
```bash
Solution: Check imports and types
npm run type-check
```

#### Issue 4: UI Not Loading
```bash
Solution: Clear cache and rebuild
npm run build:clean && npm run dev
```

### 🎯 Success Criteria

#### Minimum Viable Product (MVP)
- [ ] Page loads without errors
- [ ] Can upload image files
- [ ] OCR function processes requests
- [ ] Results display in UI
- [ ] Database operations work

#### Full Feature Set
- [ ] Multiple OCR engines work
- [ ] Language detection works
- [ ] Fuzzy matching operates
- [ ] Customer matching functions
- [ ] Statistics calculate correctly
- [ ] Feedback system works

### 📝 Test Data

#### Sample Arabic Names for Testing
```
محمد أحمد الخالدي
خالد سالم المطيري  
أحمد علي الشمري
فاطمة محمد العجمي
نور عبدالله الرشيد
```

#### Sample English Equivalents
```
Mohammed Ahmed Al-Khalidi
Khalid Salem Al-Mutairi
Ahmad Ali Al-Shamri
Fatima Mohammed Al-Ajmi
Noor Abdullah Al-Rasheed
```

#### Sample Car Numbers
```
Arabic: أ ب ج 123, د هـ و 456
English: ABC-123, DEF-456, GHI-789
Mixed: أ ب 123, ABC د هـ
```

### 🚀 Production Readiness

#### Before Production Deployment
1. Set environment variables (API keys)
2. Configure OCR engine quotas
3. Set appropriate confidence thresholds
4. Test with real invoice images
5. Verify security permissions
6. Setup monitoring and alerts

#### Performance Benchmarks
- OCR processing: < 8 seconds
- Fuzzy matching: < 1 second  
- UI response: < 200ms
- Database queries: < 100ms

### 📞 Support Information

#### Technical Support
- **Documentation**: See INTELLIGENT_INVOICE_SCANNER_IMPLEMENTATION.md
- **Code Location**: `/src/components/IntelligentInvoiceScanner.tsx`
- **Edge Function**: `/supabase/functions/scan-invoice/index.ts` 
- **Database Schema**: `/supabase/migrations/20251012150000_intelligent_invoice_scanning.sql`

#### Contact Information
- **System Status**: Check development server console
- **Function Logs**: Supabase dashboard > Functions > scan-invoice
- **Database Logs**: Supabase dashboard > Database > Logs

---

**Status**: ✅ System Ready for Testing
**Last Updated**: October 12, 2025
**Version**: 1.0.0