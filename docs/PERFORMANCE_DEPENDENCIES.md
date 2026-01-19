# Performance Optimization - Required Dependencies

**Date:** October 12, 2025  
**Status:** Installation Required Before Full Deployment

---

## 📦 Dependencies to Install

### Virtual Scrolling (react-window)

**Purpose:** Efficiently render large lists with 100+ items  
**Impact:** Smooth scrolling performance for customer, contract, and vehicle lists

```bash
npm install react-window
npm install --save-dev @types/react-window
```

**Usage Example:**
```typescript
import { VirtualList } from '@/components/common/VirtualList';

<VirtualList
  items={customers}
  itemHeight={100}
  height={600}
  renderItem={(customer, index, style) => (
    <CustomerCard customer={customer} style={style} />
  )}
/>
```

---

### Bundle Analyzer (rollup-plugin-visualizer)

**Purpose:** Visualize bundle composition and identify large chunks  
**Impact:** Help optimize bundle sizes and identify bloat

```bash
npm install --save-dev rollup-plugin-visualizer
```

**Activation:**
1. Open `/vite.config.ts`
2. Uncomment the `visualizer` import and plugin configuration
3. Run: `npm run build`
4. Open: `dist/stats.html`

**Already Configured:** ✅ (Just needs installation)

---

## 🔧 Optional But Recommended

### Performance Monitoring (Lighthouse CI)

**Purpose:** Automated performance testing in CI/CD  
**Impact:** Catch performance regressions before deployment

```bash
npm install --save-dev @lhci/cli
```

**Configuration:** Create `.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173/'],
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.75 }],
        'categories:accessibility': ['warn', { minScore: 0.90 }]
      }
    }
  }
};
```

**Usage:**
```bash
npx lhci autorun
```

---

### Error Tracking (Sentry)

**Purpose:** Production error monitoring and performance tracking  
**Impact:** Catch and fix issues quickly in production

```bash
npm install @sentry/react
```

**Basic Setup:**
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## 📋 Installation Checklist

### Immediate Installation (Required)

- [ ] Install react-window
  ```bash
  npm install react-window @types/react-window
  ```

- [ ] Install bundle analyzer
  ```bash
  npm install --save-dev rollup-plugin-visualizer
  ```

- [ ] Uncomment visualizer in vite.config.ts

- [ ] Test build and verify bundles
  ```bash
  npm run build
  ```

### Optional Installation (Recommended)

- [ ] Install Lighthouse CI
  ```bash
  npm install --save-dev @lhci/cli
  ```

- [ ] Create `.lighthouserc.js` configuration

- [ ] Add Lighthouse to CI/CD pipeline

- [ ] Install Sentry (if using)
  ```bash
  npm install @sentry/react
  ```

- [ ] Configure Sentry with DSN

---

## 🧪 Verification Steps

### After Installing react-window

1. Import VirtualList component:
   ```typescript
   import { VirtualList } from '@/components/common/VirtualList';
   ```

2. Test with a large dataset (100+ items)

3. Verify smooth scrolling performance

4. Check memory usage stays stable

### After Installing Bundle Analyzer

1. Build the project:
   ```bash
   npm run build
   ```

2. Check that `dist/stats.html` is generated

3. Open in browser and review:
   - Bundle sizes
   - Largest chunks
   - Dependency tree

4. Identify optimization opportunities

---

## 📊 Expected Package.json Changes

After installation, your `package.json` should include:

```json
{
  "dependencies": {
    "react-window": "^1.8.10",
    "@sentry/react": "^7.x.x"
  },
  "devDependencies": {
    "@types/react-window": "^1.8.8",
    "rollup-plugin-visualizer": "^5.12.0",
    "@lhci/cli": "^0.12.0"
  }
}
```

---

## 🚨 Troubleshooting

### Issue: react-window TypeScript errors

**Solution:**
```bash
npm install --save-dev @types/react-window
```

### Issue: visualizer not generating stats.html

**Solution:**
1. Check vite.config.ts - ensure visualizer is uncommented
2. Verify installation: `npm ls rollup-plugin-visualizer`
3. Try clean build: `rm -rf dist && npm run build`

### Issue: Lighthouse CI fails

**Solution:**
1. Ensure server is running: `npm run preview`
2. Check port matches configuration (default: 4173)
3. Run manually first: `npx lhci collect`

---

## 🔗 Related Documentation

- VirtualList Usage: See `/src/components/common/VirtualList.tsx`
- Bundle Analysis: See `/vite.config.ts` comments
- Performance Guide: See `/PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md`
- Quick Start: See `/docs/PERFORMANCE_QUICK_START.md`

---

## ⚠️ Important Notes

1. **Virtual Scrolling:**
   - Only use for lists with 100+ items
   - Fixed-height items perform better
   - Mobile requires adjusted heights

2. **Bundle Analyzer:**
   - Run after every major change
   - Set size budgets to prevent bloat
   - Focus on largest chunks first

3. **Monitoring:**
   - Set up before production deployment
   - Configure alerts for critical metrics
   - Review regularly (weekly)

---

**Last Updated:** October 12, 2025  
**Status:** Ready for Installation  
**Priority:** High (Required for Virtual Scrolling & Bundle Analysis)
