╔══════════════════════════════════════════════════════════════════════════════╗
║                    QUICK FIX: Financial Tracking Errors                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

📍 CURRENT ERROR:
   "new row violates row-level security policy for table rental_payment_receipts"

🔧 FIX IN 3 STEPS:

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Open Supabase Dashboard → SQL Editor                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Run these SQL files (in order):                                      │
│                                                                               │
│   1. fix-rpc-functions.sql          ← Fixes column name errors               │
│   2. fix-rental-receipts-rls.sql    ← Fixes RLS INSERT policy ⭐ THIS ONE   │
│   3. create-customer-function.sql   ← (Optional) Better customer creation    │
│                                                                               │
│ How to run:                                                                   │
│   • New Query                                                                 │
│   • Copy file contents                                                        │
│   • Paste                                                                     │
│   • Click RUN                                                                 │
│   • Wait for success message                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Test                                                                  │
│                                                                               │
│   • Refresh browser (Ctrl+F5)                                                │
│   • Go to Financial Tracking page                                            │
│   • Try creating a rental receipt                                            │
│   • Should work! ✅                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

📋 WHAT EACH FILE FIXES:

┌─────────────────────────────────────────┬─────────────────────────────────────┐
│ File                                    │ What It Fixes                        │
├─────────────────────────────────────────┼─────────────────────────────────────┤
│ fix-rpc-functions.sql                   │ • monthly_payment → monthly_amount  │
│                                         │ • payment_month → payment_date      │
│                                         │ • Outstanding balance queries       │
│                                         │ • Unpaid months queries             │
├─────────────────────────────────────────┼─────────────────────────────────────┤
│ fix-rental-receipts-rls.sql ⭐          │ • RLS INSERT policy                 │
│                                         │ • RLS SELECT policy                 │
│                                         │ • Allows creating receipts          │
│                                         │ • YOUR CURRENT ERROR ←              │
├─────────────────────────────────────────┼─────────────────────────────────────┤
│ create-customer-function.sql (Optional) │ • Atomic customer creation          │
│                                         │ • Bypasses RLS issues               │
│                                         │ • Faster & more reliable            │
└─────────────────────────────────────────┴─────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

⚡ FASTEST FIX (30 seconds):

   Just run file #2 (fix-rental-receipts-rls.sql) to fix your current error!
   
   The other files fix additional issues you'll encounter later.

═══════════════════════════════════════════════════════════════════════════════

❓ TROUBLESHOOTING:

   Q: Still getting RLS error?
   A: • Hard refresh browser (Ctrl+Shift+Delete)
      • Check SQL ran without errors
      • Verify you're logged in

   Q: Column errors persist?
   A: • Run fix-rpc-functions.sql
      • Check for "DROP FUNCTION" success messages

   Q: Customer creation fails?
   A: • Run create-customer-function.sql
      • Or wait for slower fallback method

═══════════════════════════════════════════════════════════════════════════════

📁 All files are in: c:\Users\khamis\Desktop\fleetifyapp-3\

   • fix-rpc-functions.sql
   • fix-rental-receipts-rls.sql  
   • create-customer-function.sql
   • COMPLETE-DATABASE-FIX-GUIDE.md  ← Detailed instructions
   • SUPABASE-SQL-TO-RUN.md          ← Earlier guide

═══════════════════════════════════════════════════════════════════════════════

✅ After fixing, your Financial Tracking will:
   • Load customer data ✓
   • Show outstanding balances ✓
   • Display unpaid months ✓
   • Create payment receipts ✓ ← Your current issue
   • Export to Excel ✓
   • Print receipts ✓

╔══════════════════════════════════════════════════════════════════════════════╗
║                          Ready to Fix? Let's Go! 🚀                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
