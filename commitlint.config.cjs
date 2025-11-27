/**
 * Commitlint Configuration
 * Enforces Conventional Commits format
 * 
 * Valid commit types:
 * - feat: A new feature
 * - fix: A bug fix
 * - docs: Documentation changes
 * - style: Code style changes (formatting, etc.)
 * - refactor: Code refactoring
 * - perf: Performance improvements
 * - test: Adding or updating tests
 * - build: Build system changes
 * - ci: CI configuration changes
 * - chore: Other changes (deps, etc.)
 * - revert: Reverting previous commit
 * 
 * Format: type(scope): description
 * Example: feat(auth): add login functionality
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    // Type must be lowercase
    'type-case': [2, 'always', 'lower-case'],
    
    // Type must not be empty
    'type-empty': [2, 'never'],
    
    // Allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'perf',     // Performance
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI/CD
        'chore',    // Maintenance
        'revert',   // Revert commit
        'wip',      // Work in progress (for development branches)
      ],
    ],
    
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    
    // Subject max length
    'subject-max-length': [2, 'always', 100],
    
    // Header max length
    'header-max-length': [2, 'always', 120],
    
    // Body max line length
    'body-max-line-length': [2, 'always', 200],
    
    // Footer max line length
    'footer-max-line-length': [2, 'always', 200],
    
    // Scope rules
    'scope-case': [2, 'always', 'lower-case'],
    'scope-enum': [
      1, // Warning only (not blocking)
      'always',
      [
        // Core modules
        'auth',
        'dashboard',
        'fleet',
        'customers',
        'contracts',
        'finance',
        'reports',
        'settings',
        
        // Features
        'payments',
        'invoices',
        'maintenance',
        'violations',
        'reservations',
        
        // Infrastructure
        'db',
        'api',
        'ui',
        'build',
        'deps',
        'config',
        'ci',
        
        // Other
        'i18n',
        'a11y',
        'security',
        'perf',
      ],
    ],
  },
  
  // Custom error messages
  prompt: {
    messages: {
      skip: '(اضغط Enter للتخطي)',
      max: 'الحد الأقصى %d حرف',
      min: 'الحد الأدنى %d حرف',
      emptyWarning: 'لا يمكن أن يكون فارغاً',
      upperLimitWarning: 'أكثر من الحد المسموح',
      lowerLimitWarning: 'أقل من الحد المطلوب',
    },
    questions: {
      type: {
        description: 'اختر نوع التغيير:',
        enum: {
          feat: { description: '✨ ميزة جديدة', title: 'Features' },
          fix: { description: '🐛 إصلاح خطأ', title: 'Bug Fixes' },
          docs: { description: '📚 توثيق', title: 'Documentation' },
          style: { description: '💎 تنسيق الكود', title: 'Styles' },
          refactor: { description: '📦 إعادة هيكلة', title: 'Refactoring' },
          perf: { description: '🚀 تحسين الأداء', title: 'Performance' },
          test: { description: '🧪 اختبارات', title: 'Tests' },
          build: { description: '🛠 نظام البناء', title: 'Build' },
          ci: { description: '⚙️ CI/CD', title: 'CI' },
          chore: { description: '♻️ صيانة', title: 'Chores' },
          revert: { description: '🗑 تراجع', title: 'Reverts' },
        },
      },
      scope: {
        description: 'نطاق التغيير (اختياري):',
      },
      subject: {
        description: 'وصف مختصر للتغيير:',
      },
      body: {
        description: 'وصف تفصيلي (اختياري):',
      },
      breaking: {
        description: 'هل هذا تغيير جذري (Breaking Change)؟',
      },
      issues: {
        description: 'رقم Issue المرتبط (اختياري):',
      },
    },
  },
};

