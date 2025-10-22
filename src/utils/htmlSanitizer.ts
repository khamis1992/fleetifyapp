/**
 * HTML Sanitization Utility
 *
 * SECURITY NOTE: This file provides HTML sanitization to prevent XSS attacks.
 * For production use, it's HIGHLY RECOMMENDED to install and use DOMPurify:
 * npm install dompurify @types/dompurify
 *
 * Current implementation uses a basic approach with allow-list of safe tags.
 */

// TODO: Install DOMPurify for production use
// import DOMPurify from 'dompurify';

/**
 * Basic HTML sanitization using allow-list approach
 * Strips all HTML tags except those in the allow list
 *
 * IMPORTANT: This is a basic implementation. For production, use DOMPurify.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // For now, use a basic sanitization approach
  // This creates a temporary DOM element, sets innerHTML, and extracts text content
  // This removes all HTML tags and JavaScript

  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Sanitize HTML while preserving safe formatting tags
 * Allows basic formatting tags like <p>, <br>, <strong>, <em>, etc.
 *
 * IMPORTANT: This is a basic implementation. For production, use DOMPurify.
 */
export function sanitizeHtmlWithFormatting(html: string): string {
  if (!html) return '';

  // Safe tags that are allowed
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'span', 'div'
  ];

  // Create a temporary element
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove all script tags
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());

  // Remove all event handlers
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove event handler attributes (onclick, onerror, etc.)
    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
      if (attr.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attr.name);
      }
      // Remove javascript: URLs
      if (attr.value && attr.value.toLowerCase().includes('javascript:')) {
        element.removeAttribute(attr.name);
      }
    });

    // Remove elements not in allowed list
    if (!allowedTags.includes(element.tagName.toLowerCase())) {
      // Replace with text content to preserve the text
      const textNode = document.createTextNode(element.textContent || '');
      element.parentNode?.replaceChild(textNode, element);
    }
  });

  return temp.innerHTML;
}

/**
 * Sanitize HTML for display in templates
 * This function is specifically designed for template content
 * that may contain variable placeholders like {{variable_name}}
 */
export function sanitizeTemplateHtml(html: string): string {
  if (!html) return '';

  // First, preserve template variables
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: { placeholder: string; original: string }[] = [];

  let sanitized = html.replace(variableRegex, (match, variable) => {
    const placeholder = `__TEMPLATE_VAR_${variables.length}__`;
    variables.push({ placeholder, original: match });
    return placeholder;
  });

  // Sanitize the HTML
  sanitized = sanitizeHtmlWithFormatting(sanitized);

  // Restore template variables
  variables.forEach(({ placeholder, original }) => {
    sanitized = sanitized.replace(placeholder, original);
  });

  return sanitized;
}

/**
 * Check if string contains potentially dangerous content
 */
export function containsDangerousContent(html: string): boolean {
  if (!html) return false;

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<applet/i,
    /eval\(/i,
    /expression\(/i
  ];

  return dangerousPatterns.some(pattern => pattern.test(html));
}

/**
 * Escape HTML entities to prevent XSS
 * Use this when you want to display HTML as text
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };

  return text.replace(/&(?:amp|lt|gt|quot|#039);/g, entity => map[entity]);
}
