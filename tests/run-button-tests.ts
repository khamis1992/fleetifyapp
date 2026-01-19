#!/usr/bin/env tsx

import { chromium } from 'playwright';
import { testAllButtons, testButtonAccessibility, testButtonPerformance, generateTestReport, monitorConsoleErrors } from './utils/test-helpers.js';
import fs from 'fs';
import path from 'path';

/**
 * Standalone test runner for dashboard button testing
 * This can be run independently to test the fleetifyapp dashboard buttons
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
  },
  testUser: {
    email: 'test@fleetify.com',
    password: 'testpassword123',
  },
};

async function main() {
  console.log('🚀 Starting FleetifyApp Dashboard Button Testing Suite\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: TEST_CONFIG.viewports.desktop,
    recordVideo: { dir: 'test-videos/' },
  });

  try {
    const page = await context.newPage();
    const errors = monitorConsoleErrors(page);

    // Test 1: Application access and navigation
    console.log('🔐 Testing application access...');
    try {
      // Try to navigate to the main page first
      await page.goto(TEST_CONFIG.baseUrl);
      await page.waitForLoadState('networkidle');

      // Check if we can access the app (it might auto-redirect or show login)
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      // Try to access dashboard directly
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Check for auth form if login is required
      const authForm = page.locator('form').first();
      if (await authForm.isVisible()) {
        console.log('🔑 Authentication form detected, attempting to bypass for testing...');

        // Try demo/trial access if available
        const demoButton = page.locator('button').filter({ hasText: /demo|trial|guest/i }).first();
        if (await demoButton.isVisible()) {
          await demoButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Demo/Trial access granted');
        } else {
          console.log('⚠️ No demo access found, continuing with current state...');
        }
      } else {
        console.log('✅ Dashboard accessed successfully');
      }

      // Wait for any loading to complete
      await page.waitForTimeout(3000);

    } catch (error) {
      console.log('❌ Application access test failed:', error);
      // Continue with testing anyway
    }

    // Test 2: Button functionality on desktop
    console.log('\n🖥️ Testing button functionality on desktop...');
    const desktopResults = await testAllButtons(page);
    console.log(`Found ${desktopResults.totalButtons} buttons`);

    // Test 3: Accessibility testing
    console.log('\n♿ Testing button accessibility...');
    const accessibilityResults = await testButtonAccessibility(page);
    console.log(`Accessibility: ${accessibilityResults.passCount} passed, ${accessibilityResults.violations.length} violations`);

    // Test 4: Performance testing
    console.log('\n⚡ Testing button performance...');
    const performanceResults = await testButtonPerformance(page);
    console.log(`Average click time: ${performanceResults.averageClickTime.toFixed(0)}ms`);

    // Test 5: Responsive testing
    console.log('\n📱 Testing responsive behavior...');
    const responsiveResults = [];

    for (const [device, viewport] of Object.entries(TEST_CONFIG.viewports)) {
      console.log(`Testing ${device} view (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      const results = await testAllButtons(page);
      responsiveResults.push({ device, viewport, ...results });
    }

    // Test 6: Console error monitoring
    console.log('\n🔍 Checking for console errors...');
    const finalErrors = monitorConsoleErrors(page);
    console.log(`Console errors detected: ${finalErrors.length}`);

    // Generate comprehensive report
    console.log('\n📋 GENERATING COMPREHENSIVE REPORT...\n');
    const mainReport = generateTestReport(desktopResults);

    // Add responsive analysis
    const responsiveAnalysis = responsiveResults.map(r =>
      `${r.device}: ${r.workingButtons}/${r.totalButtons} working (${((r.workingButtons/r.totalButtons)*100).toFixed(1)}%)`
    ).join('\n');

    // Add performance analysis
    const performanceAnalysis = `
Performance Summary:
• Average response time: ${performanceResults.averageClickTime.toFixed(0)}ms
• Slow buttons (>2s): ${performanceResults.slowButtons.length}
• Network requests triggered: ${performanceResults.networkRequests.length}
`;

    // Add accessibility analysis
    const accessibilityAnalysis = `
Accessibility Summary:
• Buttons passing accessibility tests: ${accessibilityResults.passCount}
• Violations: ${accessibilityResults.violations.length}
• Warnings: ${accessibilityResults.warnings.length}
${accessibilityResults.violations.length > 0 ? '\nViolations:\n' + accessibilityResults.violations.map(v => `  • ${v}`).join('\n') : ''}
${accessibilityResults.warnings.length > 0 ? '\nWarnings:\n' + accessibilityResults.warnings.map(w => `  • ${w}`).join('\n') : ''}
`;

    // Add console error analysis
    const errorAnalysis = `
Console Errors:
• Total errors: ${finalErrors.length}
${finalErrors.length > 0 ? finalErrors.map(e => `  • ${e}`).join('\n') : '✅ No console errors detected'}
`;

    // Combine all reports
    const fullReport = `
${mainReport}

📱 RESPONSIVE TESTING RESULTS:
${responsiveAnalysis}

${performanceAnalysis}

${accessibilityAnalysis}

${errorAnalysis}

🔧 SPECIFIC RECOMMENDATIONS:
${generateSpecificRecommendations(desktopResults, responsiveResults, accessibilityResults, performanceResults, finalErrors)}
`;

    // Write report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = `dashboard-button-test-report-${timestamp}.md`;

    fs.writeFileSync(reportFile, fullReport);
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);

    // Print summary
    console.log('\n🎯 EXECUTIVE SUMMARY:');
    console.log(`✅ Working buttons: ${desktopResults.workingButtons}/${desktopResults.totalButtons} (${((desktopResults.workingButtons/desktopResults.totalButtons)*100).toFixed(1)}%)`);
    console.log(`❌ Broken buttons: ${desktopResults.brokenButtons}`);
    console.log(`⚠️ Buttons with issues: ${desktopResults.buttonsWithIssues}`);
    console.log(`♿ Accessibility violations: ${accessibilityResults.violations.length}`);
    console.log(`⚡ Performance issues: ${performanceResults.slowButtons.length}`);
    console.log(`🔍 Console errors: ${finalErrors.length}`);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

function generateSpecificRecommendations(
  desktopResults: any,
  responsiveResults: any[],
  accessibilityResults: any,
  performanceResults: any,
  errors: string[]
): string {
  const recommendations: string[] = [];

  // Functionality recommendations
  if (desktopResults.brokenButtons > 0) {
    recommendations.push(`• Fix ${desktopResults.brokenButtons} broken buttons with JavaScript errors`);
  }

  if (desktopResults.buttonsWithIssues > 0) {
    recommendations.push(`• Review ${desktopResults.buttonsWithIssues} buttons for proper enabled/disabled states`);
  }

  // Accessibility recommendations
  if (accessibilityResults.violations.length > 0) {
    recommendations.push(`• Address ${accessibilityResults.violations.length} accessibility violations (WCAG compliance)`);
  }

  if (accessibilityResults.warnings.length > 0) {
    recommendations.push(`• Fix ${accessibilityResults.warnings.length} accessibility warnings for better user experience`);
  }

  // Performance recommendations
  if (performanceResults.averageClickTime > 1000) {
    recommendations.push(`• Optimize button performance - average response time is ${performanceResults.averageClickTime.toFixed(0)}ms (target: <1000ms)`);
  }

  if (performanceResults.slowButtons.length > 0) {
    recommendations.push(`• Investigate ${performanceResults.slowButtons.length} slow buttons (response time >2000ms)`);
  }

  // Responsive recommendations
  const responsiveIssues = responsiveResults.filter(r => r.workingButtons < r.totalButtons * 0.9);
  if (responsiveIssues.length > 0) {
    recommendations.push(`• Fix responsive design issues on: ${responsiveIssues.map(r => r.device).join(', ')}`);
  }

  // Error recommendations
  if (errors.length > 0) {
    recommendations.push(`• Resolve ${errors.length} JavaScript/console errors`);
  }

  if (recommendations.length === 0) {
    return '✅ All tests passed! No critical issues found.';
  }

  return recommendations.join('\n');
}

// Run the tests
main().catch(console.error);