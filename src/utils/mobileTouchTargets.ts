/**
 * Mobile Touch Target Standards & Utilities
 * 
 * Ensures all interactive elements meet minimum touch target sizes:
 * - iOS: 44x44 points
 * - Android: 48x48 dp
 * - Minimum spacing between targets: 8px
 * 
 * Reference:
 * - WCAG 2.5.5 Target Size
 * - Apple HIG: Touch Target Size
 * - Material Design 3: Touch targets
 */

export const TOUCH_TARGETS = {
  // Minimum recommended sizes (platform agnostic)
  MINIMUM: 44, // iOS standard
  RECOMMENDED: 48, // Android standard
  COMFORTABLE: 56, // Extra comfortable for older users
  LARGE: 64, // For primary actions

  // Minimum spacing between targets
  SPACING_MIN: 8,
  SPACING_RECOMMENDED: 12,
  SPACING_COMFORTABLE: 16,

  // Padding for text within targets
  PADDING_HORIZONTAL: 16, // px
  PADDING_VERTICAL: 12, // px
} as const;

export type TouchTargetSize = keyof Omit<
  typeof TOUCH_TARGETS,
  'SPACING_MIN' | 'SPACING_RECOMMENDED' | 'SPACING_COMFORTABLE' | 'PADDING_HORIZONTAL' | 'PADDING_VERTICAL'
>;

/**
 * Validate if an element meets touch target requirements
 */
export function validateTouchTarget(element: HTMLElement): {
  valid: boolean;
  width: number;
  height: number;
  message: string;
  recommendations?: string[];
} {
  const rect = element.getBoundingClientRect();
  const isValid =
    rect.width >= TOUCH_TARGETS.MINIMUM &&
    rect.height >= TOUCH_TARGETS.MINIMUM;

  const recommendations: string[] = [];

  if (rect.width < TOUCH_TARGETS.MINIMUM) {
    recommendations.push(
      `Width too small: ${rect.width}px. Minimum: ${TOUCH_TARGETS.MINIMUM}px`
    );
  }

  if (rect.height < TOUCH_TARGETS.MINIMUM) {
    recommendations.push(
      `Height too small: ${rect.height}px. Minimum: ${TOUCH_TARGETS.MINIMUM}px`
    );
  }

  return {
    valid: isValid,
    width: rect.width,
    height: rect.height,
    message: isValid
      ? `✓ Touch target valid: ${rect.width}x${rect.height}px`
      : `✗ Touch target too small: ${rect.width}x${rect.height}px`,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

/**
 * Audit all interactive elements on the page
 */
export function auditTouchTargets(): {
  total: number;
  valid: number;
  invalid: number;
  issues: Array<{
    element: HTMLElement;
    selector: string;
    size: { width: number; height: number };
    message: string;
  }>;
  summary: string;
} {
  const selectors = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '.clickable',
    'input[type="checkbox"]',
    'input[type="radio"]',
    'select',
  ];

  const elements = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
  );

  const issues: Array<{
    element: HTMLElement;
    selector: string;
    size: { width: number; height: number };
    message: string;
  }> = [];

  elements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const validation = validateTouchTarget(el);

    if (!validation.valid) {
      let selector = el.tagName.toLowerCase();
      if (el.id) selector += `#${el.id}`;
      else if (el.className) selector += `.${el.className.split(' ').join('.')}`;

      issues.push({
        element: el,
        selector,
        size: { width: validation.width, height: validation.height },
        message: validation.message,
      });
    }
  });

  const valid = elements.length - issues.length;

  return {
    total: elements.length,
    valid,
    invalid: issues.length,
    issues,
    summary: `${valid}/${elements.length} interactive elements meet touch target standards (${Math.round(
      (valid / elements.length) * 100
    )}%)`,
  };
}

/**
 * Get Tailwind classes for touch target sizes
 */
export const TOUCH_TARGET_CLASSES = {
  MINIMUM: 'min-h-[44px] min-w-[44px]',
  RECOMMENDED: 'min-h-12 min-w-12',
  COMFORTABLE: 'min-h-14 min-w-14',
  LARGE: 'min-h-16 min-w-16',

  // With padding
  BUTTON_SM: 'h-10 px-4 py-2 rounded-md', // 40px - still acceptable
  BUTTON_MD: 'h-12 px-4 py-3 rounded-lg', // 48px - recommended
  BUTTON_LG: 'h-14 px-6 py-3.5 rounded-lg', // 56px - comfortable
  BUTTON_XL: 'h-16 px-8 py-4 rounded-xl', // 64px - large

  // Icons with padding (common pattern)
  ICON_BUTTON_SM: 'h-10 w-10 rounded-md', // 40px
  ICON_BUTTON_MD: 'h-12 w-12 rounded-lg', // 48px
  ICON_BUTTON_LG: 'h-14 w-14 rounded-lg', // 56px

  // Form inputs
  INPUT_DEFAULT: 'h-12 px-4 py-3 rounded-lg', // 48px height
  INPUT_COMFORTABLE: 'h-14 px-4 py-3.5 rounded-lg', // 56px height

  // Spacing between targets
  SPACING_SM: 'gap-2',
  SPACING_MD: 'gap-3',
  SPACING_LG: 'gap-4',
} as const;

/**
 * React hook to get touch target utilities based on device
 */
export function useTouchTargets() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return {
    buttonClass: isMobile ? TOUCH_TARGET_CLASSES.BUTTON_MD : TOUCH_TARGET_CLASSES.BUTTON_SM,
    inputClass: TOUCH_TARGET_CLASSES.INPUT_DEFAULT,
    iconButtonClass: isMobile ? TOUCH_TARGET_CLASSES.ICON_BUTTON_MD : TOUCH_TARGET_CLASSES.ICON_BUTTON_SM,
    spacingClass: isMobile ? TOUCH_TARGET_CLASSES.SPACING_MD : TOUCH_TARGET_CLASSES.SPACING_SM,
  };
}

/**
 * Helper to get minimum touch target padding
 */
export function getTouchPadding(size: 'sm' | 'md' | 'lg' = 'md') {
  const padding = {
    sm: `${TOUCH_TARGETS.PADDING_VERTICAL - 4}px ${TOUCH_TARGETS.PADDING_HORIZONTAL - 4}px`,
    md: `${TOUCH_TARGETS.PADDING_VERTICAL}px ${TOUCH_TARGETS.PADDING_HORIZONTAL}px`,
    lg: `${TOUCH_TARGETS.PADDING_VERTICAL + 4}px ${TOUCH_TARGETS.PADDING_HORIZONTAL + 4}px`,
  };
  return padding[size];
}

/**
 * Enable debug mode for touch targets (development only)
 */
export function enableTouchTargetDebug() {
  if (process.env.NODE_ENV !== 'development') return;

  const auditResults = auditTouchTargets();

  console.group('🎯 Touch Target Audit');
  console.log(`Total interactive elements: ${auditResults.total}`);
  console.log(`Valid touch targets: ${auditResults.valid}`);
  console.log(`Invalid touch targets: ${auditResults.invalid}`);
  console.log(`Coverage: ${Math.round((auditResults.valid / auditResults.total) * 100)}%`);

  if (auditResults.issues.length > 0) {
    console.group('❌ Issues found:');
    auditResults.issues.forEach((issue) => {
      console.warn(
        `${issue.message} - ${issue.selector}`,
        issue.element
      );
    });
    console.groupEnd();
  }

  console.groupEnd();

  // Highlight invalid elements
  auditResults.issues.forEach((issue) => {
    const element = issue.element as HTMLElement;
    element.style.outline = '2px dashed red';
    element.style.outlineOffset = '2px';
  });
}

/**
 * Disable touch target debug highlighting
 */
export function disableTouchTargetDebug() {
  document.querySelectorAll('[style*="outline"]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }
  });
}
