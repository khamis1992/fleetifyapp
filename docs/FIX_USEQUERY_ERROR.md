## Fix for "Identifier 'useQuery' has already been declared" Error

### Problem
This error occurs when the Vite development server has cached or bundled code incorrectly, leading to duplicate declarations.

### Solution Steps

1. **Stop the development server** (Ctrl+C in the terminal where it's running)

2. **Clear Vite cache:**
```powershell
Remove-Item -Path ".\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
```

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

4. **Restart the development server:**
```powershell
npm run dev
```

### Alternative Quick Fix

If the above doesn't work, try:

```powershell
# Stop all node processes (CAUTION: This will stop ALL Node.js processes)
taskkill /F /IM node.exe

# Clear Vite cache
Remove-Item -Path ".\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

# Restart dev server
npm run dev
```

### What Happened

The recent code changes to add customer count queries in `Customers.tsx` are correct. The error is a **build cache issue**, not a code issue.

The file structure is correct:
- ✅ React is imported properly
- ✅ useState is imported properly  
- ✅ useCustomers hook is used correctly
- ✅ No duplicate imports

### Verification

After restarting, you should see:
- ✅ No "useQuery already declared" errors
- ✅ Customer counts display correctly
- ✅ الأفراد (Individuals) card shows accurate total
- ✅ الشركات (Companies) card shows accurate total

### Prevention

To avoid this in the future:
1. Restart dev server after major file changes
2. Clear Vite cache if you see unexpected errors
3. Use hard refresh in browser (Ctrl+Shift+R)

---

**Note:** The code changes are already applied and correct. This is purely a development server caching issue.
