/**
 * Color utility functions for validation, conversion, and accessibility
 */

/**
 * Validates if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validates if a string is a valid CSS color (hex, rgb, hsl, named)
 */
export function isValidCssColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * Converts hex color to HSL format for CSS variables
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Expand shorthand hex (3 digits) to full form (6 digits)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Converts hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Calculates relative luminance of a color (for contrast checking)
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 * Returns value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if contrast ratio meets WCAG AA standards
 * @param ratio - Contrast ratio from getContrastRatio
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 */
export function meetsWcagAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? 3 : 4.5);
}

/**
 * Determines if contrast ratio meets WCAG AAA standards
 * @param ratio - Contrast ratio from getContrastRatio
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 */
export function meetsWcagAAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? 4.5 : 7);
}

/**
 * Gets contrast level description
 */
export function getContrastLevel(ratio: number): {
  level: 'fail' | 'aa' | 'aaa';
  label: string;
  variant: 'destructive' | 'default' | 'secondary';
} {
  if (ratio >= 7) {
    return { level: 'aaa', label: 'AAA (ممتاز)', variant: 'secondary' };
  } else if (ratio >= 4.5) {
    return { level: 'aa', label: 'AA (جيد)', variant: 'default' };
  } else {
    return { level: 'fail', label: 'غير مناسب', variant: 'destructive' };
  }
}

/**
 * Converts hex to uppercase with # prefix
 */
export function normalizeHexColor(color: string): string {
  if (!color) return '#000000';
  const clean = color.replace('#', '').toUpperCase();
  return `#${clean}`;
}

/**
 * Lightens or darkens a hex color
 * @param hex - Original hex color
 * @param percent - Percentage to lighten (positive) or darken (negative)
 */
export function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amount = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, rgb.r + amount));
  const G = Math.max(0, Math.min(255, rgb.g + amount));
  const B = Math.max(0, Math.min(255, rgb.b + amount));

  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}
