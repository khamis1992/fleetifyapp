# Visual Regression Testing Guide

## Overview

Visual regression testing ensures that UI changes don't introduce unintended visual bugs. This document explains how to run and manage visual tests in the FleetifyApp.

## Quick Start

### Running Visual Tests

```bash
# Run all visual regression tests
npm run visual:test

# Update snapshots (when changes are intentional)
npm run visual:update

# Generate HTML report
npm run visual:report

# Show help
npm run visual:help
```

### Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. In another terminal, run visual tests:
```bash
npm run visual:test
```

## Configuration

### Visual Test Config

The main configuration is in `playwright.visual.config.ts`:

- **Multiple Viewports**: Tests run on desktop, tablet, and mobile
- **Multiple Themes**: Light and dark mode testing
- **RTL Support**: Arabic/RTL layout testing
- **Threshold**: 0.2 (20%) pixel difference tolerance

### Test Files

Visual tests are in the `tests/e2e/` directory with `.visual.spec.ts` suffix:

- `dashboard.visual.spec.ts` - Dashboard UI tests
- `contracts.visual.spec.ts` - Contracts UI tests
- `forms.visual.spec.ts` - Form component tests

## Writing Visual Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Component Visual Tests', () => {
  test('component matches baseline', async ({ page }) => {
    // Navigate to component
    await page.goto('/component-path');

    // Wait for component to load
    await page.waitForSelector('[data-testid="component"]');

    // Take screenshot
    await expect(page).toHaveScreenshot('component-name.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
```

### Best Practices

1. **Always use data-testid** for stable selectors:
```tsx
<div data-testid="contract-card">...</div>
```

2. **Wait for loading states**:
```typescript
await page.waitForLoadState('networkidle');
```

3. **Disable animations** for consistency:
```typescript
await expect(page).toHaveScreenshot('component.png', {
  animations: 'disabled',
});
```

4. **Test multiple states**:
```typescript
// Test loading state
await expect(page.locator('[data-testid="loading"]')).toBeVisible();
await expect(page).toHaveScreenshot('loading.png');

// Test loaded state
await page.waitForSelector('[data-testid="content"]');
await expect(page).toHaveScreenshot('loaded.png');
```

## Managing Snapshots

### Snapshot Directory

Snapshots are stored in `__snapshots__/`:
```
__snapshots__/
├── contracts/
│   ├── contracts-list.png
│   ├── contract-form.png
│   └── contract-details.png
├── dashboard/
│   ├── dashboard-full.png
│   └── dashboard-widgets.png
└── forms/
    ├── login-form.png
    └── validation-errors.png
```

### Updating Snapshots

When UI changes are intentional:

1. Run tests to see what changed:
```bash
npm run visual:test
```

2. Review changes in the HTML report

3. Update snapshots if changes are correct:
```bash
npm run visual:update
```

### Ignoring Changes

For dynamic content, use the VisualTestWrapper:

```tsx
import { VisualTestWrapper, useVisualTest } from '@/components/ui/VisualTestWrapper';

function MyComponent() {
  const { isVisualTesting, getTestTimestamp } = useVisualTest();

  return (
    <VisualTestWrapper data-testid="my-component">
      <div>Last updated: {getTestTimestamp()}</div>
    </VisualTestWrapper>
  );
}
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/visual-tests.yml`:

```yaml
name: Visual Tests

on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run visual tests
        run: npm run visual:test

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-test-results
          path: |
            playwright-report/
            test-results/
```

## Troubleshooting

### Common Issues

1. **Tests fail due to loading times**
   - Increase wait times
   - Use `waitForLoadState('networkidle')`

2. **Flaky tests due to animations**
   - Use `animations: 'disabled'` option
   - Add VisualTestWrapper to components

3. **Different screen resolutions**
   - Tests run on fixed viewport sizes
   - Use consistent fonts

4. **Dynamic content causing failures**
   - Mock API responses for consistent data
   - Use test fixtures

### Debugging Tips

1. **Run tests in debug mode**:
```bash
npx playwright test --debug
```

2. **Run single test**:
```bash
npx playwright test tests/e2e/dashboard.visual.spec.ts -g "dashboard layout"
```

3. **Update only specific snapshots**:
```bash
# Set environment variable for specific test
VISUAL_TEST=true npx playwright test --update-snapshots
```

## Best Practices

### Do
- ✅ Use semantic `data-testid` attributes
- ✅ Test multiple viewport sizes
- ✅ Test loading and error states
- ✅ Mock dynamic content
- ✅ Review changes before updating snapshots
- ✅ Write descriptive test names

### Don't
- ❌ Use CSS selectors that can change
- ❌ Ignore all failures without review
- ❌ Test elements with unpredictable content
- ❌ Skip mobile/responsive testing
- ❌ Update snapshots without understanding changes

## Advanced Usage

### Custom Screenshot Options

```typescript
await expect(page).toHaveScreenshot('component.png', {
  // Clip to specific area
  clip: { x: 0, y: 0, width: 500, height: 300 },

  // Ignore specific elements
  ignoreElements: [page.locator('[data-testid="dynamic-content"]')],

  // Custom threshold
  threshold: 0.1,
});
```

### Comparing Specific Regions

```typescript
const widget = page.locator('[data-testid="revenue-widget"]');
await expect(widget).toHaveScreenshot('revenue-widget.png');
```

### Testing Component Variations

```typescript
const themes = ['light', 'dark'];
for (const theme of themes) {
  await page.evaluate((t) => {
    document.body.setAttribute('data-theme', t);
  }, theme);

  await expect(page).toHaveScreenshot(`theme-${theme}.png`);
}
```

## Performance Considerations

- Visual tests can be slow - run them in CI/CD, not locally
- Use selective testing during development
- Consider running visual tests only on main branch
- Implement visual testing for critical paths first

## Integration with Manual Testing

1. **Review visual test failures in PR reviews**
2. **Use visual tests as regression safety net**
3. **Complement with manual exploratory testing**
4. **Update design system components with visual tests**

## Resources

- [Playwright Visual Testing](https://playwright.dev/docs/test-screenshots)
- [Visual Regression Best Practices](https://github.com/YousefED/Visual-Regression-Testing-Guide)
- [FleetifyApp Design System](./DESIGN_SYSTEM.md)