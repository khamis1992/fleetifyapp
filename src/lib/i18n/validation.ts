/**
 * Translation Validation Framework
 *
 * Comprehensive validation system for translation completeness,
 * consistency, and quality across all supported languages.
 *
 * @author FleetifyApp Development Team
 * @version 1.0.0
 */

import { SupportedLanguage, TRANSLATION_NAMESPACES } from './config';
import { SUPPORTED_LANGUAGES } from './config';

export interface TranslationValidationResult {
  language: SupportedLanguage;
  namespace: string;
  status: 'complete' | 'incomplete' | 'missing' | 'invalid';
  missingKeys: string[];
  emptyValues: string[];
  inconsistentFormatting: string[];
  issues: ValidationIssue[];
  completeness: number; // percentage
  lastValidated: string;
}

export interface ValidationIssue {
  type: 'missing' | 'empty' | 'formatting' | 'length' | 'consistency' | 'quality';
  severity: 'error' | 'warning' | 'info';
  key: string;
  message: string;
  suggestion?: string;
  context?: any;
}

export interface TranslationKeyInfo {
  key: string;
  value: string;
  hasInterpolation: boolean;
  hasHtml: boolean;
  hasPlural: boolean;
  characterCount: number;
  wordCount: number;
  estimatedTokens: number;
  namespace: string;
}

export interface ValidationConfig {
  // Completeness thresholds
  completenessThreshold: number; // percentage
  maxLengthVariation: number; // percentage variation from English

  // Quality checks
  checkForEmptyValues: boolean;
  checkForPlaceholders: boolean;
  checkForHtmlTags: boolean;
  checkForConsistency: boolean;
  checkForLength: boolean;

  // Cultural validation
  checkCulturalAppropriateness: boolean;
  checkContextualAccuracy: boolean;

  // Technical validation
  checkInterpolationSyntax: boolean;
  checkPluralization: boolean;
  checkForHardcodedText: boolean;
}

export class TranslationValidator {
  private config: ValidationConfig;
  private baseLanguage: SupportedLanguage = 'en';
  private cache: Map<string, TranslationValidationResult> = new Map();

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      completenessThreshold: 95,
      maxLengthVariation: 30,
      checkForEmptyValues: true,
      checkForPlaceholders: true,
      checkForHtmlTags: true,
      checkForConsistency: true,
      checkForLength: true,
      checkCulturalAppropriateness: true,
      checkContextualAccuracy: true,
      checkInterpolationSyntax: true,
      checkForPluralization: true,
      checkForHardcodedText: true,
      ...config
    };
  }

  // Validate all translations for all languages
  async validateAllTranslations(): Promise<TranslationValidationResult[]> {
    const results: TranslationValidationResult[] = [];
    const languages = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];
    const namespaces = Object.values(TRANSLATION_NAMESPACES);

    for (const language of languages) {
      for (const namespace of namespaces) {
        const result = await this.validateLanguageNamespace(language, namespace);
        results.push(result);
      }
    }

    return results;
  }

  // Validate specific language and namespace
  async validateLanguageNamespace(
    language: SupportedLanguage,
    namespace: string
  ): Promise<TranslationValidationResult> {
    const cacheKey = `${language}-${namespace}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Load translations (in a real app, this would be loaded from files/API)
      const translations = await this.loadTranslations(language, namespace);
      const baseTranslations = await this.loadTranslations(this.baseLanguage, namespace);

      const result = this.performValidation(language, namespace, translations, baseTranslations);
      result.lastValidated = new Date().toISOString();

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      const errorResult: TranslationValidationResult = {
        language,
        namespace,
        status: 'invalid',
        missingKeys: [],
        emptyValues: [],
        inconsistentFormatting: [],
        issues: [{
          type: 'missing',
          severity: 'error',
          key: 'namespace',
          message: `Failed to load translations: ${error}`
        }],
        completeness: 0,
        lastValidated: new Date().toISOString()
      };

      this.cache.set(cacheKey, errorResult);
      return errorResult;
    }
  }

  // Perform actual validation logic
  private performValidation(
    language: SupportedLanguage,
    namespace: string,
    translations: Record<string, string>,
    baseTranslations: Record<string, string>
  ): TranslationValidationResult {
    const issues: ValidationIssue[] = [];
    const missingKeys: string[] = [];
    const emptyValues: string[] = [];
    const inconsistentFormatting: string[] = [];

    const baseKeys = Object.keys(baseTranslations);
    const translatedKeys = Object.keys(translations);

    // Check for missing keys
    for (const key of baseKeys) {
      if (!translatedKeys.includes(key)) {
        missingKeys.push(key);
        issues.push({
          type: 'missing',
          severity: 'error',
          key,
          message: `Translation key '${key}' is missing in ${language}`,
          suggestion: `Add translation for key '${key}'`
        });
      }
    }

    // Check for empty or invalid values
    for (const [key, value] of Object.entries(translations)) {
      const baseValue = baseTranslations[key];

      if (this.config.checkForEmptyValues && (!value || value.trim() === '')) {
        emptyValues.push(key);
        issues.push({
          type: 'empty',
          severity: 'error',
          key,
          message: `Translation for key '${key}' is empty in ${language}`,
          suggestion: `Provide a translation for key '${key}'`
        });
      }

      if (baseValue) {
        // Check for placeholder consistency
        if (this.config.checkForPlaceholders) {
          this.validatePlaceholders(key, baseValue, value, issues, language);
        }

        // Check for HTML tag consistency
        if (this.config.checkForHtmlTags) {
          this.validateHtmlTags(key, baseValue, value, issues, language);
        }

        // Check for length consistency
        if (this.config.checkForLength) {
          this.validateLength(key, baseValue, value, issues, language);
        }

        // Check for interpolation syntax
        if (this.config.checkInterpolationSyntax) {
          this.validateInterpolation(key, baseValue, value, issues, language);
        }
      }
    }

    // Calculate completeness
    const totalKeys = baseKeys.length;
    const completedKeys = totalKeys - missingKeys.length - emptyValues.length;
    const completeness = totalKeys > 0 ? Math.round((completedKeys / totalKeys) * 100) : 0;

    // Determine status
    let status: TranslationValidationResult['status'] = 'complete';
    if (missingKeys.length > 0 || emptyValues.length > 0) {
      status = completeness === 0 ? 'missing' : 'incomplete';
    } else if (issues.some(issue => issue.severity === 'error')) {
      status = 'incomplete';
    }

    return {
      language,
      namespace,
      status,
      missingKeys,
      emptyValues,
      inconsistentFormatting,
      issues,
      completeness,
      lastValidated: new Date().toISOString()
    };
  }

  // Validate placeholder consistency
  private validatePlaceholders(
    key: string,
    baseValue: string,
    translatedValue: string,
    issues: ValidationIssue[],
    language: SupportedLanguage
  ): void {
    const basePlaceholders = this.extractPlaceholders(baseValue);
    const translatedPlaceholders = this.extractPlaceholders(translatedValue);

    const missingPlaceholders = basePlaceholders.filter(p => !translatedPlaceholders.includes(p));
    const extraPlaceholders = translatedPlaceholders.filter(p => !basePlaceholders.includes(p));

    if (missingPlaceholders.length > 0) {
      issues.push({
        type: 'formatting',
        severity: 'error',
        key,
        message: `Missing placeholders in ${language}: ${missingPlaceholders.join(', ')}`,
        suggestion: `Add missing placeholders: ${missingPlaceholders.map(p => `{{${p}}}`).join(', ')}`
      });
    }

    if (extraPlaceholders.length > 0) {
      issues.push({
        type: 'formatting',
        severity: 'warning',
        key,
        message: `Extra placeholders in ${language}: ${extraPlaceholders.join(', ')}`,
        suggestion: `Remove extra placeholders: ${extraPlaceholders.map(p => `{{${p}}}`).join(', ')}`
      });
    }
  }

  // Validate HTML tag consistency
  private validateHtmlTags(
    key: string,
    baseValue: string,
    translatedValue: string,
    issues: ValidationIssue[],
    language: SupportedLanguage
  ): void {
    const baseTags = this.extractHtmlTags(baseValue);
    const translatedTags = this.extractHtmlTags(translatedValue);

    const missingTags = baseTags.filter(tag => !translatedTags.includes(tag));
    const extraTags = translatedTags.filter(tag => !baseTags.includes(tag));

    if (missingTags.length > 0) {
      issues.push({
        type: 'formatting',
        severity: 'error',
        key,
        message: `Missing HTML tags in ${language}: ${missingTags.join(', ')}`,
        suggestion: `Add missing HTML tags: ${missingTags.join(', ')}`
      });
    }

    if (extraTags.length > 0) {
      issues.push({
        type: 'formatting',
        severity: 'warning',
        key,
        message: `Extra HTML tags in ${language}: ${extraTags.join(', ')}`,
        suggestion: `Remove extra HTML tags: ${extraTags.join(', ')}`
      });
    }
  }

  // Validate length consistency
  private validateLength(
    key: string,
    baseValue: string,
    translatedValue: string,
    issues: ValidationIssue[],
    language: SupportedLanguage
  ): void {
    const baseLength = baseValue.length;
    const translatedLength = translatedValue.length;
    const lengthVariation = Math.abs(((translatedLength - baseLength) / baseLength) * 100);

    if (lengthVariation > this.config.maxLengthVariation) {
      issues.push({
        type: 'length',
        severity: 'warning',
        key,
        message: `Translation length varies by ${lengthVariation.toFixed(1)}% from English (${baseLength} -> ${translatedLength} chars)`,
        suggestion: 'Consider shortening or lengthening the translation for better UI fit'
      });
    }
  }

  // Validate interpolation syntax
  private validateInterpolation(
    key: string,
    baseValue: string,
    translatedValue: string,
    issues: ValidationIssue[],
    language: SupportedLanguage
  ): void {
    // Check for malformed i18next interpolation
    const interpolationPattern = /\{\{([^}]+)\}\}/g;
    const baseMatches = Array.from(baseValue.matchAll(interpolationPattern));
    const translatedMatches = Array.from(translatedValue.matchAll(interpolationPattern));

    if (baseMatches.length !== translatedMatches.length) {
      issues.push({
        type: 'formatting',
        severity: 'error',
        key,
        message: `Interpolation syntax mismatch in ${language}`,
        suggestion: 'Ensure all interpolation variables match the English version'
      });
    }
  }

  // Extract placeholders from text
  private extractPlaceholders(text: string): string[] {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  }

  // Extract HTML tags from text
  private extractHtmlTags(text: string): string[] {
    const matches = text.match(/<[^>]+>/g);
    return matches ? [...new Set(matches)] : [];
  }

  // Load translations (mock implementation - in real app would load from files/API)
  private async loadTranslations(language: SupportedLanguage, namespace: string): Promise<Record<string, string>> {
    // This is a mock implementation
    // In a real application, you would load the actual translation files
    try {
      const response = await fetch(`/locales/${language}/${namespace}.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Failed to load translations for ${language}/${namespace}:`, error);
    }

    // Return empty object if loading fails
    return {};
  }

  // Get validation summary for all languages
  getValidationSummary(results: TranslationValidationResult[]): {
    totalNamespaces: number;
    completeCount: number;
    incompleteCount: number;
    missingCount: number;
    invalidCount: number;
    averageCompleteness: number;
    languagesWithIssues: SupportedLanguage[];
  } {
    const totalNamespaces = results.length;
    const completeCount = results.filter(r => r.status === 'complete').length;
    const incompleteCount = results.filter(r => r.status === 'incomplete').length;
    const missingCount = results.filter(r => r.status === 'missing').length;
    const invalidCount = results.filter(r => r.status === 'invalid').length;

    const averageCompleteness = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.completeness, 0) / results.length)
      : 0;

    const languagesWithIssues = [...new Set(
      results
        .filter(r => r.issues.length > 0)
        .map(r => r.language)
    )] as SupportedLanguage[];

    return {
      totalNamespaces,
      completeCount,
      incompleteCount,
      missingCount,
      invalidCount,
      averageCompleteness,
      languagesWithIssues
    };
  }

  // Generate validation report
  generateValidationReport(results: TranslationValidationResult[]): string {
    const summary = this.getValidationSummary(results);

    let report = `# Translation Validation Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- Total Namespaces: ${summary.totalNamespaces}\n`;
    report += `- Complete: ${summary.completeCount} (${Math.round((summary.completeCount / summary.totalNamespaces) * 100)}%)\n`;
    report += `- Incomplete: ${summary.incompleteCount}\n`;
    report += `- Missing: ${summary.missingCount}\n`;
    report += `- Invalid: ${summary.invalidCount}\n`;
    report += `- Average Completeness: ${summary.averageCompleteness}%\n\n`;

    if (summary.languagesWithIssues.length > 0) {
      report += `## Languages with Issues\n\n`;
      for (const language of summary.languagesWithIssues) {
        report += `- ${SUPPORTED_LANGUAGES[language].name} (${language})\n`;
      }
      report += `\n`;
    }

    // Detailed issues by language
    const issuesByLanguage = results.reduce((acc, result) => {
      if (!acc[result.language]) {
        acc[result.language] = [];
      }
      acc[result.language].push(result);
      return acc;
    }, {} as Record<SupportedLanguage, TranslationValidationResult[]>);

    for (const [language, langResults] of Object.entries(issuesByLanguage)) {
      report += `## ${SUPPORTED_LANGUAGES[language as SupportedLanguage].name} (${language})\n\n`;

      for (const result of langResults) {
        report += `### ${result.namespace} - ${result.status.toUpperCase()}\n\n`;
        report += `- Completeness: ${result.completeness}%\n`;
        report += `- Missing Keys: ${result.missingKeys.length}\n`;
        report += `- Empty Values: ${result.emptyValues.length}\n`;
        report += `- Total Issues: ${result.issues.length}\n\n`;

        if (result.issues.length > 0) {
          report += `#### Issues\n\n`;
          for (const issue of result.issues) {
            report += `- **${issue.severity.toUpperCase()}**: ${issue.message}\n`;
            if (issue.suggestion) {
              report += `  - Suggestion: ${issue.suggestion}\n`;
            }
            report += `  - Key: \`${issue.key}\`\n\n`;
          }
        }
      }
    }

    return report;
  }

  // Clear validation cache
  clearCache(): void {
    this.cache.clear();
  }

  // Export validation results to JSON
  exportResults(results: TranslationValidationResult[]): string {
    return JSON.stringify({
      summary: this.getValidationSummary(results),
      results,
      exportDate: new Date().toISOString()
    }, null, 2);
  }
}

// Singleton instance
export const translationValidator = new TranslationValidator();

// Hook for React components
export const useTranslationValidation = () => {
  return {
    validator: translationValidator,
    validateAll: () => translationValidator.validateAllTranslations(),
    validateLanguage: (language: SupportedLanguage, namespace: string) =>
      translationValidator.validateLanguageNamespace(language, namespace),
    generateReport: (results: TranslationValidationResult[]) =>
      translationValidator.generateValidationReport(results),
    clearCache: () => translationValidator.clearCache()
  };
};

export default TranslationValidator;