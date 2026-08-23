# Desktop Archive Folder Convention
## تنظيم ملفات العقود على سطح المكتب

This document describes the recommended folder structure for organizing rental contract documents on Desktop computers to improve matching accuracy and reduce legal filing errors.

## Purpose / الهدف

After the Murad / C-ALF-0096 incident (contract sent to legal without a verified signed lease), we need a systematic way to:
1. Identify which contracts have matched signed leases
2. Flag contracts that need manual review before legal transfer
3. Maintain a clear audit trail for contract document organization

## Folder Structure / بنية المجلدات

Create three subfolders under your main contracts folder (e.g., `Desktop/عقود/`):

```
Desktop/
  └── عقود/                    (Main contracts folder)
      ├── مربوطة/              (Matched - Successfully linked)
      ├── بلا_عقد/             (No contract - Missing signed lease)
      └── تحتاج_مراجعة/        (Needs review - Manual check required)
```

### 1. مربوطة (Matched)
**English:** Successfully Matched/Linked

**Purpose:** Contracts where the signed lease has been successfully uploaded to the system and matched to the correct contract record.

**Criteria:**
- Contract document uploaded to `contract_documents` table
- `document_type` is `signed_contract` or `signed_contract_image`
- Customer ID, QID, or contract number extracted and matched
- Ready for legal transfer if needed

**Actions:**
- Move contract file here AFTER successful upload and verification
- These contracts can safely proceed to legal/Taqadi if required
- Regular maintenance: verify file names match system records

### 2. بلا_عقد (No Contract)
**English:** Missing Signed Lease

**Purpose:** Contracts where the physical signed lease document is missing or not yet obtained.

**Criteria:**
- Customer signed digitally or signature not captured
- Physical contract lost or not returned
- Awaiting customer to provide signed copy
- Cannot proceed to legal transfer

**Actions:**
- Contact customer to obtain signed copy
- Block legal transfer until resolved
- May require re-signing or affidavit if original is permanently lost

### 3. تحتاج_مراجعة (Needs Review)
**English:** Needs Manual Review

**Purpose:** Contracts with ambiguous matching or requiring human verification.

**Criteria:**
- Multiple possible matches in system
- Plate number matches but QID/contract number doesn't
- Scanned document quality issues
- Customer changed vehicles mid-contract
- Name variations (Arabic/English) causing match uncertainty

**Actions:**
- Manual review by legal/operations staff
- Verify customer identity independently
- May need to request clearer document scan
- Once verified, move to "مربوطة" or resolve issues

## File Naming Convention / تسمية الملفات

To improve automatic matching, use this naming pattern:

```
[ContractNumber]_[CustomerQID]_[PlateNumber]_signed.pdf
```

Examples:
- `C-ALF-0096_28012345678_12345_signed.pdf`
- `RC-2024-001_29087654321_ABC123_signed.pdf`

**Arabic equivalents:**
```
[رقم_العقد]_[رقم_الهوية]_[رقم_اللوحة]_موقع.pdf
```

## Important Safety Notes / ملاحظات السلامة المهمة

⚠️ **DO NOT:**
- Delete original files
- Move files automatically without human verification
- Trust plate-only matching for legal transfers
- Skip customer identity verification

✅ **DO:**
- Keep backups of all contract documents
- Verify customer identity through multiple data points (QID + contract number + customer name)
- Document any manual corrections or overrides
- Review the "تحتاج_مراجعة" folder weekly

## Integration with Fleetify System

The system now enforces these requirements:

1. **Legal Transfer Guard:** Cannot convert to `under_legal_procedure` without `signed_contract` document
2. **Identity Verification:** Must verify customer identity via `customer_verification_tasks`
3. **Gap List:** View `/legal/contracts-without-signed-lease` to see contracts needing attention
4. **Taqadi Queue:** Disabled until signed lease verification passes

## Workflow / سير العمل

1. **On Contract Activation:**
   - System prompts for signed lease upload
   - If not uploaded immediately, warn user that legal transfer will be blocked

2. **On Document Receipt:**
   - Scan or photograph signed contract
   - Upload to Fleetify via contract documents section
   - System attempts automatic matching
   - If successful → Move physical file to "مربوطة"
   - If uncertain → Move to "تحتاج_مراجعة"
   - If missing → Keep in "بلا_عقد" and follow up with customer

3. **Before Legal Transfer:**
   - System checks for signed lease in `contract_documents`
   - Verifies identity through `customer_verification_tasks`
   - If both pass → Allow legal transfer
   - If either fails → Block with clear Arabic message

4. **Weekly Maintenance:**
   - Review "تحتاج_مراجعة" folder
   - Follow up on "بلا_عقد" cases
   - Verify "مربوطة" folder matches system records

## Helper Scripts (Optional)

Optional PowerShell and Node.js scripts are available in the `scripts/` folder to assist with organizing these files. These scripts:

- **DO NOT** automatically move files (safety first!)
- **SUGGEST** which folder each file should go to based on filename analysis
- **VALIDATE** that file names follow the convention
- **REPORT** on files that need human review

To use:
```bash
# PowerShell (Windows)
.\scripts\organize-desktop-contracts.ps1 -ScanPath "C:\Users\YourName\Desktop\عقود"

# Node.js (Cross-platform)
node scripts/organize-desktop-contracts.js --scan "Desktop/عقود"
```

## Questions / أسئلة

For questions about this convention, contact:
- Legal Team: legal@alaraf.online
- Operations: ops@alaraf.online
- Technical Support: support@alaraf.online

---

**Document Version:** 1.0  
**Created:** 2026-08-23  
**Last Updated:** 2026-08-23  
**Related:** Signed Lease Verification Guards Implementation
