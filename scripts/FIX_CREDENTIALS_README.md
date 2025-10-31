# Security Fix Script: Remove Hardcoded Credentials

This script automatically finds and fixes hardcoded Supabase credentials across the codebase by replacing them with environment variable references.

## 🔒 Security Issue

The codebase contained hardcoded Supabase credentials including:
- Hardcoded Supabase URL: `https://qwhunliohlkkahbspfiu.supabase.co`
- Exposed Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**⚠️ CRITICAL:** The exposed anon key must be rotated immediately in Supabase dashboard!

## 📋 Usage

### Dry Run (Preview Changes)
```bash
node scripts/fix-hardcoded-credentials.js --dry-run
```

### Apply Fixes (with backups)
```bash
node scripts/fix-hardcoded-credentials.js
```

### Apply Fixes (without backups)
```bash
node scripts/fix-hardcoded-credentials.js --no-backup
```

### Using npm script
```bash
npm run fix:credentials
```

## 🔧 What It Does

1. **Scans** all `.ts`, `.js`, `.mjs`, `.tsx`, `.jsx` files in the codebase
2. **Finds** hardcoded Supabase URLs and API keys
3. **Replaces** them with environment variable references:
   - `const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';`
   - `const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';`
4. **Adds** validation code to ensure environment variables are set
5. **Creates** backup files (`.backup.*`) before making changes
6. **Adds** environment variable loading code for `.mjs` files

## 📁 Files Modified

The script found and fixed credentials in:
- `check_alaraf_contracts.mjs`
- `update_draft_to_active.mjs`
- `update_to_active.mjs`
- `update_contracts_batch.mjs`
- `update_alaraf_contracts.mjs`
- `src/integrations/supabase/client.ts`
- `src/scripts/*.ts` (multiple files)

## ✅ After Running the Script

1. **Review Changes**: Check the modified files to ensure they look correct
2. **Update .env File**: Ensure your `.env` file contains:
   ```env
   VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-new-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<for-admin-scripts>
   ```
3. **Rotate Credentials**: 
   - Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api
   - Generate a new anon key
   - Update all environments (production, staging, development)
4. **Test Application**: Verify everything still works
5. **Remove Backups**: After verification, delete backup files:
   ```bash
   find . -name "*.backup.*" -type f -delete
   ```
   Or on Windows:
   ```powershell
   Get-ChildItem -Recurse -Filter "*.backup.*" | Remove-Item
   ```

## 🛡️ Security Best Practices

- ✅ Never commit `.env` files to git
- ✅ Use environment variables for all secrets
- ✅ Rotate exposed credentials immediately
- ✅ Use different keys for different environments
- ✅ Never hardcode credentials in source code

## 📊 Statistics

- **Files Scanned**: ~1,925 files
- **Files Modified**: 16 files
- **Credentials Found**: 22 instances

## 🐛 Troubleshooting

### Script fails with "Cannot find module"
Make sure you're running from the project root directory.

### Environment variables not loading
For `.mjs` files, the script adds environment loading code. Make sure your `.env` file is in the project root.

### Validation errors after fix
Check that your `.env` file contains all required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin scripts)

## 📝 Example Output

```
🔒 Security Fix Script: Removing Hardcoded Credentials
======================================================================
💾 Backup mode enabled - Backup files will be created

Scanning codebase...

✅ Fixed: check_alaraf_contracts.mjs
✅ Fixed: update_draft_to_active.mjs
...

======================================================================
📊 RESULTS
======================================================================
Files scanned: 1925
Files modified: 16
Credentials found: 22
Backups created: 16

✅ Security fixes applied!
```

## 🔗 Related Documentation

- [Supabase Environment Variables](https://supabase.com/docs/guides/api/api-keys)
- [Security Best Practices](SECURITY.md)
- [Environment Setup Guide](PHASE_10_STEP_2_ENVIRONMENT_SETUP.md)

