# Vite Dependency Conflict Fix

## Problem
The project had an npm dependency conflict:
- `vite@^7.1.5` was incompatible with `@vitejs/plugin-react-swc@^3.5.0`
- `@vitejs/plugin-react-swc@3.5.0` only supports Vite v4 or v5 (peer dependency: `vite@"^4 || ^5"`)
- This caused `npm install` to fail with ERESOLVE errors

## Solution Applied

### Changes Made:

1. **Downgraded Vite to v5.4.1** (from v7.1.5)
   - Changed in `package.json`: `"vite": "^5.4.1"`
   - This version is compatible with `@vitejs/plugin-react-swc@^3.5.0`
   - Matches lovable.dev recommended setup (Vite 5.4.1)

2. **Removed `@vitejs/plugin-react`** from dependencies
   - This was the standard React plugin compatible with Vite 7
   - Not needed since we're using `@vitejs/plugin-react-swc`

3. **Updated `vite.config.ts`**
   - Changed import from `@vitejs/plugin-react` to `@vitejs/plugin-react-swc`
   - Simplified react plugin configuration (removed babel plugins)
   - Now matches lovable.dev's recommended configuration

4. **Removed lock files** for clean install
   - Deleted `package-lock.json`
   - Deleted `bun.lockb`

## Why This Configuration?

According to the LOVABLE_COMPATIBILITY_GUIDE.md, lovable.dev uses:
- **Vite 5.4.1** (not v7)
- **@vitejs/plugin-react-swc** (for better performance with SWC compiler)

This configuration ensures compatibility when deploying to lovable.dev.

## How to Verify

After pulling these changes:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify versions
npm list vite @vitejs/plugin-react-swc

# Test build
npm run build

# Test dev server
npm run dev
```

## Expected Results

- ✅ `npm install` should complete without ERESOLVE errors
- ✅ Vite should be version 5.4.x (compatible range)
- ✅ `@vitejs/plugin-react-swc` should be version 3.x (compatible range)
- ✅ Build and dev server should work correctly
- ✅ Project remains compatible with lovable.dev

## References

- LOVABLE_COMPATIBILITY_GUIDE.md (lines 10-12, 25-47)
- `@vitejs/plugin-react-swc` peer dependencies: `vite@"^4 || ^5"`
- lovable.dev recommended stack: Vite 5.4.1, @vitejs/plugin-react-swc
