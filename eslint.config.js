import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // تخفيف قواعد TypeScript المتشددة مؤقتاً
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      // إصلاح قاعدة no-unused-expressions
      '@typescript-eslint/no-unused-expressions': ['error', { 
        allowShortCircuit: true, 
        allowTernary: true,
        allowTaggedTemplates: true 
      }],
      // إضافة قواعد مفيدة
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
    },
  },
)

