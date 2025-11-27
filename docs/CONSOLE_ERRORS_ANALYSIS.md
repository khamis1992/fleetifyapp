# Console Errors Analysis & Fixes

## 🔴 Critical Errors

### 1. React Hooks Order Violation - FleetAvailabilityWidget
**Error**: `Rendered more hooks than during the previous render`
**Location**: `src/components/dashboard/car-rental/FleetAvailabilityWidget.tsx:237`
**Cause**: Conditional hook usage or hooks being called in loops/conditions
**Impact**: Component crashes and renders error boundary

**Fix Required**: Review FleetAvailabilityWidget and ensure:
- All hooks are called at the top level
- No conditional hook calls
- No hooks inside loops
- Hook order remains consistent between renders

### 2. WebSocket HMR Connection Error
**Error**: `WebSocket connection to 'ws://localhost:8080' failed: ERR_CONNECTION_REFUSED`
**Cause**: Vite HMR trying to connect to port 8080 instead of 8081
**Impact**: HMR not working properly
**Fix**: Already configured in vite.config.ts - this is a warning, not blocking

### 3. Supabase 400 Errors
**Errors**:
- `payments` query with `property_contracts` join - 400 error
- `property_contracts` with filters - 400 error

**Cause**: Invalid Supabase query syntax or missing foreign keys
**Impact**: Dashboard widgets showing no data

---

## ⚠️ Warnings

### 4. Excessive Console Logging
**Issue**: Too many debug logs (100+ per page load)
**Logs Found**:
- `🔧 [getCompanyScopeContext]` - Called 50+ times
- `🔧 [MODULE_CONFIG]` - Called 30+ times  
- `🔍 [usePayments]` - Called 20+ times
- `🚗 [EnhancedContractForm]` - Called 15+ times

**Impact**: Performance degradation, console clutter
**Fix**: Use centralized logger with proper log levels

### 5. Framer Motion Container Warning
**Warning**: `Please ensure that the container has a non-static position`
**Impact**: Animation scroll offset calculations may be incorrect
**Fix**: Add `position: relative` to framer-motion containers

### 6. PWA Install Prompt (3x duplicate logs)
**Issue**: PWA install prompt registered 3 times
**Impact**: Minor - just duplicate logs
**Fix**: Check PWA initialization in multiple components

---

## 📊 Console Log Statistics

- **Total console messages**: 200+
- **Errors**: 12+
- **Warnings**: 3
- **Debug logs**: 180+
- **Info logs**: 5

---

## 🔧 Recommended Fixes Priority

### Priority 1: Fix React Hooks Error
File: `src/components/dashboard/car-rental/FleetAvailabilityWidget.tsx`
This is causing component crashes.

### Priority 2: Reduce Debug Logging
Files to update:
- `src/lib/companyScope.ts` - Remove/reduce `getCompanyScopeContext` logs
- `src/modules/core/hooks/useModuleConfig.ts` - Use logger with appropriate levels
- `src/hooks/usePayments.ts` - Reduce diagnostic logs
- `src/components/contracts/EnhancedContractForm.tsx` - Remove excessive logs

### Priority 3: Fix Supabase Queries
Investigate and fix:
- `payments` query with property_contracts join
- `property_contracts` filtering query

### Priority 4: Fix Framer Motion Warning
Add proper container positioning in affected components

---

## 🎯 Next Steps

1. Fix FleetAvailabilityWidget hooks order
2. Replace console.log with centralized logger
3. Fix Supabase query errors
4. Remove duplicate PWA initialization
5. Add position: relative to motion containers
