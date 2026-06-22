/**
 * Security Test Utility
 *
 * This file contains tests to verify that our security measures are working properly.
 * Run these tests to ensure XSS protection and environment security.
 */

import {
  sanitizeHtml,
  sanitizeHtmlWithFormatting,
  sanitizeTemplateHtml,
  containsDangerousContent,
  runSecurityTests
} from '@/utils/htmlSanitizer';
import { getSupabaseConfig, getOpenAIConfig, getEnvironmentConfig } from '@/lib/env';

/**
 * Test XSS Protection
 */
export function testXSSProtection(): { passed: boolean; results: string[] } {
  console.log('🔒 Testing XSS Protection...');

  const testCases = [
    {
      name: 'Script tag injection',
      input: '<script>alert("XSS")</script><p>Safe content</p>',
      expectClean: true
    },
    {
      name: 'JavaScript URL',
      input: '<a href="javascript:alert(\'XSS\')">Click me</a>',
      expectClean: true
    },
    {
      name: 'Event handler injection',
      input: '<div onclick="alert(\'XSS\')" onmouseover="dangerous()">Click me</div>',
      expectClean: true
    },
    {
      name: 'Iframe injection',
      input: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      expectClean: true
    },
    {
      name: 'Data URL injection',
      input: '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
      expectClean: true
    },
    {
      name: 'VBScript injection',
      input: '<div onmouseover="vbscript:msgbox(\'XSS\')">Hover me</div>',
      expectClean: true
    },
    {
      name: 'CSS expression injection',
      input: '<div style="width: expression(alert(\'XSS\'))">Test</div>',
      expectClean: true
    },
    {
      name: 'Safe HTML should pass',
      input: '<p><strong>Hello</strong> <em>World</em></p>',
      expectClean: false // Should not be considered dangerous
    },
    {
      name: 'Template variables should be preserved',
      input: '<p>Hello {{name}}, welcome to {{company}}!</p>',
      expectClean: false // Should not be considered dangerous
    }
  ];

  const results: string[] = [];
  let allPassed = true;

  testCases.forEach(testCase => {
    // Test dangerous content detection
    const isDangerous = containsDangerousContent(testCase.input);

    if (testCase.expectClean && isDangerous) {
      results.push(`✅ ${testCase.name}: Correctly detected dangerous content`);
    } else if (!testCase.expectClean && isDangerous) {
      results.push(`❌ ${testCase.name}: False positive - safe content flagged as dangerous`);
      allPassed = false;
    } else if (testCase.expectClean && !isDangerous) {
      results.push(`❌ ${testCase.name}: Failed to detect dangerous content`);
      allPassed = false;
    } else {
      results.push(`✅ ${testCase.name}: Safe content correctly identified`);
    }

    // Test sanitization
    const sanitized = sanitizeHtmlWithFormatting(testCase.input);
    const hasScript = sanitized.includes('<script>');
    const hasJavascript = sanitized.toLowerCase().includes('javascript:');
    const hasEventHandlers = /\bon\w+\s*=/i.test(sanitized);

    const isClean = !hasScript && !hasJavascript && !hasEventHandlers;

    if (testCase.expectClean) {
      if (isClean) {
        results.push(`✅ ${testCase.name}: Sanitization successful`);
      } else {
        results.push(`❌ ${testCase.name}: Sanitization failed - dangerous content remains`);
        allPassed = false;
      }
    } else {
      // For safe content, check if formatting is preserved
      const hasFormatting = sanitized.includes('<strong>') || sanitized.includes('<em>');
      if (hasFormatting) {
        results.push(`✅ ${testCase.name}: Safe formatting preserved`);
      } else {
        results.push(`⚠️ ${testCase.name}: Safe formatting removed (may be acceptable)`);
      }
    }
  });

  // Test template preservation
  const templateTest = sanitizeTemplateHtml('<p>Hello {{name}}, <strong>welcome</strong>!</p>');
  const hasVariables = templateTest.includes('{{name}}');
  const hasFormatting = templateTest.includes('<strong>');

  if (hasVariables && hasFormatting) {
    results.push('✅ Template variables and formatting preserved');
  } else {
    results.push('❌ Template sanitization failed');
    allPassed = false;
  }

  console.log('XSS Protection Test Results:');
  results.forEach(result => console.log('  ' + result));

  return { passed: allPassed, results };
}

/**
 * Test Environment Variable Security
 */
export function testEnvironmentSecurity(): { passed: boolean; results: string[] } {
  console.log('🔧 Testing Environment Variable Security...');

  const results: string[] = [];
  let allPassed = true;

  try {
    // Test Supabase config
    const supabaseConfig = getSupabaseConfig();
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      results.push('✅ Supabase configuration loaded successfully');

      // Check for obvious credentials in URL (basic check)
      if (supabaseConfig.url.includes('password') || supabaseConfig.url.includes('secret')) {
        results.push('⚠️ Warning: Supabase URL may contain sensitive information');
      }
    } else {
      results.push('❌ Supabase configuration missing required fields');
      allPassed = false;
    }

    // Test OpenAI config
    const openaiConfig = getOpenAIConfig();
    if (openaiConfig.hasKey) {
      results.push('✅ OpenAI API key is available');

      // Check if key looks reasonable (basic format check)
      if (openaiConfig.apiKey && openaiConfig.apiKey.length < 20) {
        results.push('⚠️ Warning: OpenAI API key appears to be too short');
      }
    } else {
      results.push('ℹ️ OpenAI API key not configured (optional)');
    }

    // Test environment config
    const envConfig = getEnvironmentConfig();
    if (envConfig.isDevelopment || envConfig.isProduction) {
      results.push(`✅ Environment mode detected: ${envConfig.mode}`);
    } else {
      results.push('⚠️ Warning: Could not determine environment mode');
    }

    // Test feature flags
    const testFeature = isFeatureEnabled('TEST_FEATURE');
    results.push(`ℹ️ Test feature flag status: ${testFeature}`);

  } catch (error) {
    results.push(`❌ Environment configuration error: ${error}`);
    allPassed = false;
  }

  console.log('Environment Security Test Results:');
  results.forEach(result => console.log('  ' + result));

  return { passed: allPassed, results };
}

/**
 * Run all security tests
 */
export function runAllSecurityTests(): { passed: boolean; results: string[] } {
  console.log('🛡️ Running Complete Security Test Suite...\n');

  const xssResults = testXSSProtection();
  const envResults = testEnvironmentSecurity();
  const domPurifyResults = runSecurityTests();

  const allResults = [
    '\n=== XSS Protection Tests ===',
    ...xssResults.results,
    '\n=== Environment Security Tests ===',
    ...envResults.results,
    '\n=== DOMPurify Security Tests ===',
    ...domPurifyResults.results
  ];

  const allPassed = xssResults.passed && envResults.passed && domPurifyResults.passed;

  console.log('\n=== Final Security Test Results ===');
  console.log(`Overall Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

  return {
    passed: allPassed,
    results: allResults
  };
}

/**
 * Quick security check for development
 */
export function quickSecurityCheck(): boolean {
  try {
    const { passed } = runSecurityTests();
    return passed;
  } catch (error) {
    console.error('Quick security check failed:', error);
    return false;
  }
}