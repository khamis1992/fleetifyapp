/**
 * Automated Accessibility Testing Utilities
 *
 * Provides comprehensive accessibility testing utilities for WCAG AA compliance
 * including automated checks, validation, and reporting.
 */

export interface AccessibilityViolation {
  rule: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  element: Element;
  target: string[];
  failureSummary: string;
  help?: string;
  helpUrl?: string;
}

export interface AccessibilityTestResult {
  component: string;
  timestamp: string;
  violations: AccessibilityViolation[];
  passes: number;
  violationsCount: number;
  score: number;
  recommendations: string[];
}

export interface ColorContrastResult {
  element: Element;
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  fontSize: 'normal' | 'large';
  level: 'AA' | 'AAA' | 'fail';
}

/**
 * Comprehensive accessibility testing class
 */
export class AccessibilityTester {
  private axeCore: any = null;

  constructor() {
    this.initializeAxe();
  }

  /**
   * Initialize axe-core for accessibility testing
   */
  private async initializeAxe(): Promise<void> {
    try {
      // Dynamic import for axe-core
      this.axeCore = await import('axe-core');
    } catch (error) {
      console.warn('axe-core not available, using fallback testing methods');
    }
  }

  /**
   * Run comprehensive accessibility tests
   */
  async runAccessibilityTest(
    component: HTMLElement,
    componentName: string
  ): Promise<AccessibilityTestResult> {
    let violations: AccessibilityViolation[] = [];

    if (this.axeCore) {
      // Use axe-core for comprehensive testing
      const axeResults = await this.axeCore.run(component);
      violations = this.processAxeResults(axeResults);
    } else {
      // Fallback to custom testing methods
      violations = await this.runCustomTests(component);
    }

    const passes = await this.countPasses(component);
    const violationsCount = violations.length;
    const score = this.calculateAccessibilityScore(passes, passes + violationsCount);
    const recommendations = this.generateRecommendations(violations);

    return {
      component: componentName,
      timestamp: new Date().toISOString(),
      violations,
      passes,
      violationsCount,
      score,
      recommendations,
    };
  }

  /**
   * Process axe-core results into our format
   */
  private processAxeResults(axeResults: any): AccessibilityViolation[] {
    return axeResults.violations.map((violation: any): AccessibilityViolation => ({
      rule: violation.id,
      description: violation.description,
      impact: violation.impact,
      element: violation.nodes[0].element,
      target: violation.nodes[0].target,
      failureSummary: violation.nodes[0].failureSummary,
      help: violation.help,
      helpUrl: violation.helpUrl,
    }));
  }

  /**
   * Run custom accessibility tests when axe-core is not available
   */
  private async runCustomTests(component: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];

    // Test for missing alt text
    violations.push(...this.testMissingAltText(component));

    // Test for missing form labels
    violations.push(...this.testMissingFormLabels(component));

    // Test for color contrast
    violations.push(...this.testColorContrast(component));

    // Test for keyboard accessibility
    violations.push(...this.testKeyboardAccessibility(component));

    // Test for ARIA attributes
    violations.push(...this.testAriaAttributes(component));

    // Test for heading structure
    violations.push(...this.testHeadingStructure(component));

    return violations;
  }

  /**
   * Test for missing alt text on images
   */
  private testMissingAltText(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const images = component.querySelectorAll('img');

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');

      // Skip decorative images with role="none" or alt=""
      if (role === 'none' || alt === '') {
        return;
      }

      if (!alt) {
        violations.push({
          rule: 'image-alt',
          description: 'Images must have alternate text',
          impact: 'critical',
          element: img,
          target: [`img:nth-of-type(${index + 1})`],
          failureSummary: 'Element does not have an alt attribute',
          help: 'Provide meaningful alt text for the image or use alt="" for decorative images',
          helpUrl: 'https://webaim.org/techniques/alttext/',
        });
      }
    });

    return violations;
  }

  /**
   * Test for missing form labels
   */
  private testMissingFormLabels(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const formElements = component.querySelectorAll('input, textarea, select');

    formElements.forEach((element, index) => {
      const id = element.getAttribute('id');
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const type = (element as HTMLInputElement).type;

      // Skip hidden inputs and submit/reset buttons
      if (type === 'hidden' || type === 'submit' || type === 'reset') {
        return;
      }

      // Check if element has proper label
      const hasLabel = id ?
        component.querySelector(`label[for="${id}"]`) :
        (ariaLabel || ariaLabelledBy);

      if (!hasLabel) {
        violations.push({
          rule: 'label',
          description: 'Form elements must have labels',
          impact: 'serious',
          element,
          target: [`${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`],
          failureSummary: 'Form element does not have a label',
          help: 'Add a label element, aria-label, or aria-labelledby attribute',
          helpUrl: 'https://webaim.org/techniques/forms/',
        });
      }
    });

    return violations;
  }

  /**
   * Test color contrast ratios
   */
  private testColorContrast(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const textElements = component.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label');

    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const foreground = styles.color;
      const background = styles.backgroundColor;
      const fontSize = parseFloat(styles.fontSize);

      if (foreground && background && background !== 'rgba(0, 0, 0, 0)') {
        const ratio = this.calculateContrastRatio(foreground, background);
        const isLarge = fontSize >= 18;
        const passesAA = isLarge ? ratio >= 3 : ratio >= 4.5;

        if (!passesAA) {
          violations.push({
            rule: 'color-contrast',
            description: 'Text must have sufficient color contrast',
            impact: 'serious',
            element,
            target: [`*:nth-child(${index + 1})`],
            failureSummary: `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA requirement`,
            help: `Increase contrast ratio to ${isLarge ? '3:1' : '4.5:1'} for WCAG AA compliance`,
            helpUrl: 'https://webaim.org/resources/contrastchecker/',
          });
        }
      }
    });

    return violations;
  }

  /**
   * Test keyboard accessibility
   */
  private testKeyboardAccessibility(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const interactiveElements = component.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');

      // Check for negative tabindex without good reason
      if (tabIndex === '-1' && element.tagName !== 'BUTTON') {
        violations.push({
          rule: 'keyboard',
          description: 'Interactive elements must be keyboard accessible',
          impact: 'serious',
          element,
          target: [`*:nth-child(${index + 1})`],
          failureSummary: 'Element has tabindex="-1" making it unreachable by keyboard',
          help: 'Remove tabindex="-1" or provide keyboard alternative',
          helpUrl: 'https://webaim.org/techniques/keyboard/',
        });
      }
    });

    return violations;
  }

  /**
   * Test ARIA attributes
   */
  private testAriaAttributes(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const elementsWithAria = component.querySelectorAll('[aria-*]');

    elementsWithAria.forEach((element, index) => {
      // Check for invalid ARIA attributes
      const role = element.getAttribute('role');
      const ariaHidden = element.getAttribute('aria-hidden');

      // Check for ARIA hidden on focusable element
      if (ariaHidden === 'true' && element.tabIndex >= 0) {
        violations.push({
          rule: 'aria-hidden-focus',
          description: 'ARIA hidden elements should not be focusable',
          impact: 'serious',
          element,
          target: [`*:nth-child(${index + 1})`],
          failureSummary: 'Element has aria-hidden="true" but is focusable',
          help: 'Remove aria-hidden or tabindex from the element',
          helpUrl: 'https://www.w3.org/TR/wai-aria-1.1/#aria-hidden',
        });
      }

      // Check for invalid roles
      if (role && !this.isValidRole(role)) {
        violations.push({
          rule: 'aria-valid-role',
          description: 'ARIA role must be valid',
          impact: 'moderate',
          element,
          target: [`*:nth-child(${index + 1})`],
          failureSummary: `Invalid ARIA role: ${role}`,
          help: 'Use a valid ARIA role or remove the role attribute',
          helpUrl: 'https://www.w3.org/TR/wai-aria-1.1/#role_definitions',
        });
      }
    });

    return violations;
  }

  /**
   * Test heading structure
   */
  private testHeadingStructure(component: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const headings = component.querySelectorAll('h1, h2, h3, h4, h5, h6');

    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.substring(1));

      // Check for skipped heading levels
      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        violations.push({
          rule: 'heading-order',
          description: 'Heading levels should not be skipped',
          impact: 'moderate',
          element: heading,
          target: [`h${currentLevel}:nth-of-type(${index + 1})`],
          failureSummary: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          help: 'Use sequential heading levels (h1, h2, h3, etc.)',
          helpUrl: 'https://webaim.org/techniques/semanticstructure/',
        });
      }

      previousLevel = currentLevel;
    });

    return violations;
  }

  /**
   * Calculate color contrast ratio
   */
  private calculateContrastRatio(foreground: string, background: string): number {
    const rgb1 = this.hexToRgb(foreground);
    const rgb2 = this.hexToRgb(background);

    if (!rgb1 || !rgb2) return 1;

    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Convert color to RGB
   */
  private hexToRgb(color: string): { r: number; g: number; b: number } | null {
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return null;

    return {
      r: parseInt(rgb[0]),
      g: parseInt(rgb[1]),
      b: parseInt(rgb[2]),
    };
  }

  /**
   * Calculate relative luminance
   */
  private getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Check if ARIA role is valid
   */
  private isValidRole(role: string): boolean {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'checkbox',
      'columnheader', 'combobox', 'command', 'complementary', 'composite', 'contentinfo',
      'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
      'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem',
      'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
      'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search',
      'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'summary', 'tab',
      'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
      'tree', 'treegrid', 'treeitem', 'widget'
    ];

    return validRoles.includes(role);
  }

  /**
   * Count accessibility passes
   */
  private async countPasses(component: HTMLElement): Promise<number> {
    // This is a simplified count - in a real implementation,
    // you'd count elements that pass various accessibility checks
    const elements = component.querySelectorAll('*');
    return Math.max(0, elements.length - 10); // Simplified calculation
  }

  /**
   * Calculate accessibility score
   */
  private calculateAccessibilityScore(passes: number, total: number): number {
    if (total === 0) return 100;
    return Math.round((passes / total) * 100);
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: AccessibilityViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.rule === 'image-alt')) {
      recommendations.push('Add descriptive alt text to all meaningful images');
    }

    if (violations.some(v => v.rule === 'label')) {
      recommendations.push('Ensure all form inputs have proper labels');
    }

    if (violations.some(v => v.rule === 'color-contrast')) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
    }

    if (violations.some(v => v.rule === 'keyboard')) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }

    if (violations.some(v => v.rule.startsWith('aria-'))) {
      recommendations.push('Review and fix ARIA attribute implementations');
    }

    if (violations.some(v => v.rule === 'heading-order')) {
      recommendations.push('Maintain proper heading hierarchy (don\'t skip levels)');
    }

    return recommendations;
  }

  /**
   * Generate accessibility report
   */
  generateReport(testResults: AccessibilityTestResult[]): string {
    const overallScore = Math.round(
      testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length
    );
    const totalViolations = testResults.reduce((sum, result) => sum + result.violationsCount, 0);

    let report = `# Accessibility Test Report\n\n`;
    report += `**Overall Score:** ${overallScore}/100\n`;
    report += `**Total Violations:** ${totalViolations}\n`;
    report += `**Components Tested:** ${testResults.length}\n\n`;

    // Group violations by impact level
    const criticalViolations = testResults.flatMap(r => r.violations.filter(v => v.impact === 'critical'));
    const seriousViolations = testResults.flatMap(r => r.violations.filter(v => v.impact === 'serious'));
    const moderateViolations = testResults.flatMap(r => r.violations.filter(v => v.impact === 'moderate'));

    if (criticalViolations.length > 0) {
      report += `## Critical Issues (${criticalViolations.length})\n\n`;
      criticalViolations.forEach(v => {
        report += `- **${v.rule}:** ${v.description}\n`;
        report += `  - ${v.failureSummary}\n`;
      });
      report += '\n';
    }

    if (seriousViolations.length > 0) {
      report += `## Serious Issues (${seriousViolations.length})\n\n`;
      seriousViolations.forEach(v => {
        report += `- **${v.rule}:** ${v.description}\n`;
        report += `  - ${v.failureSummary}\n`;
      });
      report += '\n';
    }

    if (moderateViolations.length > 0) {
      report += `## Moderate Issues (${moderateViolations.length})\n\n`;
      moderateViolations.forEach(v => {
        report += `- **${v.rule}:** ${v.description}\n`;
        report += `  - ${v.failureSummary}\n`;
      });
      report += '\n';
    }

    // Component details
    report += `## Component Details\n\n`;
    testResults.forEach(result => {
      report += `### ${result.component}\n`;
      report += `- Score: ${result.score}/100\n`;
      report += `- Violations: ${result.violationsCount}\n`;
      if (result.recommendations.length > 0) {
        report += `- Recommendations: ${result.recommendations.join(', ')}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

/**
 * Quick accessibility checker for development
 */
export const quickAccessibilityCheck = async (
  component: HTMLElement
): Promise<{
  passed: boolean;
  issues: string[];
  suggestions: string[];
}> => {
  const tester = new AccessibilityTester();
  const result = await tester.runAccessibilityTest(component, 'component');

  return {
    passed: result.violationsCount === 0,
    issues: result.violations.map(v => v.description),
    suggestions: result.recommendations,
  };
};

// Export singleton instance
export const accessibilityTester = new AccessibilityTester();

export default accessibilityTester;