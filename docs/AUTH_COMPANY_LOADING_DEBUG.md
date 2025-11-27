# Auth Company Loading Debug Guide

## 🔍 Current Investigation

**Issue**: User "khamis-1992@hotmail.com" getting error:
```
🚨 [getCompanyFilter] SECURITY: User has no company association - blocking access
{userId: '2a2b3a8a-35dd-4251-a8ba-09f70538c920', email: 'khamis-1992@hotmail.com'}
```

## ✅ Database Verification (CONFIRMED CORRECT)

### User Profile Exists ✅
```sql
SELECT p.*, c.name 
FROM profiles p 
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.user_id = '2a2b3a8a-35dd-4251-a8ba-09f70538c920';

Result:
- id: 320f8030-ee98-4f9f-bab8-7341e80cd588
- user_id: 2a2b3a8a-35dd-4251-a8ba-09f70538c920
- company_id: 24bc0b21-4e2d-4413-9842-31719a3669f4
- company_name: العراف لتاجير السيارات
- first_name: KHAMIS
- last_name: AL-JABOR
```

### User Roles Exist ✅
```sql
SELECT role FROM user_roles 
WHERE user_id = '2a2b3a8a-35dd-4251-a8ba-09f70538c920';

Result:
- role: company_admin
```

### RLS Functions Work ✅
```sql
SELECT get_user_company('2a2b3a8a-35dd-4251-a8ba-09f70538c920'::uuid);

Result:
- company_id: 24bc0b21-4e2d-4413-9842-31719a3669f4
```

**Conclusion**: The database has ALL the correct data! ✅

## 🐛 The Problem

The issue is NOT in the database - it's in how the frontend is loading/processing the auth user data.

### Hypothesis:
One of these is happening:
1. **RLS blocking the company join**: Profile query succeeds but companies relationship is filtered out by RLS
2. **Query syntax issue**: The Supabase query isn't correctly joining the companies table
3. **Timing issue**: Company data loads but gets lost/overwritten during auth flow
4. **Type mismatch**: Company data exists but isn't being properly assigned to authUser object

## 🔧 Debug Logging Added

### In `src/lib/auth.ts` (getCurrentUser function):

#### 1. Query Results Logging
```typescript
console.log('📝 [AUTH] Query results:', {
  hasProfile: !!profile,
  profileCompanyId: profile?.company_id,
  profileCompanies: profile?.companies,  // The joined companies object
  hasEmployeeCompany: !!employeeCompany,
  employeeCompanyId: employeeCompany?.company_id,
  rolesCount: roles?.length || 0
});
```

**What to look for**:
- `hasProfile`: Should be `true`
- `profileCompanyId`: Should be `"24bc0b21-4e2d-4413-9842-31719a3669f4"`
- `profileCompanies`: Should be an object `{ id, name, name_ar, ... }`
- If `profileCompanies` is `null` or `undefined` → RLS is blocking the join!

#### 2. Profile Error Logging
```typescript
if (profileError) {
  console.warn('📝 [AUTH] Profile fetch error:', {
    code: profileError.code,
    message: profileError.message,
    details: profileError.details,
    hint: profileError.hint
  });
}
```

**What to look for**:
- Any error codes like `42501` (permission denied)
- Error messages about RLS policies

#### 3. Missing Company Warning
```typescript
if (!companyId) {
  console.error('🚨 [AUTH] WARNING: User has no company association!', {
    userId: user.id,
    email: user.email,
    hasProfile: !!profile,
    hasEmployeeRecord: !!employeeCompany
  });
}
```

## 🧪 Testing Instructions

### After Deployment (2-3 minutes):

1. **Clear browser cache completely**
   - Or use Incognito/Private window

2. **Open browser DevTools** (F12)
   - Go to Console tab
   - Clear console

3. **Navigate to**: https://fleetifyapp.vercel.app

4. **Login with**:
   - Email: khamis-1992@hotmail.com
   - Password: 123456789

5. **Watch the console logs** - you'll see:
   ```
   📝 [AUTH] Starting getCurrentUser...
   📝 [AUTH] Fetching profile for user: 2a2b3a8a-35dd-4251-a8ba-09f70538c920
   📝 [AUTH] Parallel queries completed in XXms
   📝 [AUTH] Query results: { ... }  ← IMPORTANT!
   📝 [AUTH] User loaded in XXms: { ... }
   ```

6. **Check the "Query results" log**:
   - Expand the object
   - Look at all the values
   - Screenshot or copy the full output

## 🎯 Possible Outcomes

### Scenario A: profileCompanies is NULL
**Meaning**: RLS is blocking the company join

**Solution**: Modify RLS policy on companies table to allow users to see their own company during auth

**Fix**:
```sql
-- Update RLS policy to allow company access during profile fetch
CREATE POLICY "Users can view company via profile" ON companies
FOR SELECT USING (
  id IN (
    SELECT company_id FROM profiles WHERE user_id = auth.uid()
  )
);
```

### Scenario B: profileCompanies exists but not assigned
**Meaning**: Logic error in assigning company to authUser

**Solution**: Fix the assignment logic in `getCurrentUser`

**Fix**: Check lines 165-182 in `auth.ts`

### Scenario C: profileError exists
**Meaning**: The profile query is failing

**Solution**: Fix the query or RLS on profiles table

### Scenario D: Everything looks correct in logs but still fails
**Meaning**: Issue is in `companyScope.ts` or `AuthContext.tsx`

**Solution**: Add logging to those files as well

## 📋 Information to Collect

Please provide:

1. **Full console logs** from login to error
2. **Screenshot** of the "Query results" object expanded
3. **Network tab**: Filter by "profiles" and show the response
4. **Any error messages** (red text in console)

## 🔄 Next Steps

Based on the logs, we'll:
1. Identify exactly where company data is lost
2. Apply targeted fix
3. Verify resolution

---

**Status**: 🔄 Debugging deployed, waiting for test results  
**Commit**: 2e454a1a  
**Last Updated**: 2025-10-25  
**Priority**: Critical - Blocking user access
