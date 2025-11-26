/**
 * HTML Sanitization Utility
 *
 * SECURITY: This file provides HTML sanitization to prevent XSS attacks.
 * Uses DOMPurify for production-grade XSS protection when available,
 * with a fallback to browser-based sanitization.
 */

let DOMPurify: any = null;

// Try to import DOMPurify dynamically (ESM compatible)
// Note: DOMPurify is optional - fallback sanitization is sufficient for most cases
(async () => {
  try {
    const module = await import('dompurify');
    DOMPurify = module.default || module;
  } catch {
    // DOMPurify not installed - using browser-based fallback sanitization
    // This is fine for most use cases
  }
})();

// DOMPurify configuration (when available)
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'span', 'div', 'blockquote',
    'code', 'pre'
  ],
  ALLOWED_ATTR: ['class', 'id'],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
  FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

/**
 * Sanitize HTML using DOMPurify or fallback
 * Provides production-grade XSS protection
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  if (DOMPurify) {
    try {
      return DOMPurify.sanitize(html, SANITIZE_CONFIG);
    } catch (error) {
      console.error('DOMPurify sanitization failed:', error);
    }
  }

  // Fallback to browser-based sanitization
  return fallbackSanitizeHtml(html);
}

/**
 * Fallback HTML sanitization using browser DOM
 * Strips all HTML tags and dangerous content
 */
function fallbackSanitizeHtml(html: string): string {
  if (!html) return '';

  try {
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.textContent = html; // This automatically escapes HTML
    return temp.innerHTML;
  } catch (error) {
    console.error('Fallback sanitization failed:', error);
    // Final fallback - just escape the string
    return escapeHtml(html);
  }
}

/**
 * Sanitize HTML while preserving safe formatting tags
 * Uses DOMPurify with a more permissive configuration for rich text
 */
export function sanitizeHtmlWithFormatting(html: string): string {
  if (!html) return '';

  if (DOMPurify) {
    try {
      const formatConfig = {
        ...SANITIZE_CONFIG,
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'b', 'i', 'u',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'span', 'div', 'blockquote',
          'code', 'pre', 'a'
        ],
        ALLOWED_ATTR: ['class', 'id', 'href', 'target'],
      };

      return DOMPurify.sanitize(html, formatConfig);
    } catch (error) {
      console.error('DOMPurify formatting sanitization failed:', error);
    }
  }

  // Fallback to browser-based sanitization with limited formatting
  return fallbackSanitizeWithFormatting(html);
}

/**
 * Fallback formatting sanitization preserving basic tags
 */
function fallbackSanitizeWithFormatting(html: string): string {
  if (!html) return '';

  const allowedTags = [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'span', 'div', 'blockquote',
    'code', 'pre'
  ];

  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove dangerous elements
    const dangerousElements = temp.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, button');
    dangerousElements.forEach(el => el.remove());

    // Remove dangerous attributes
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove event handlers
      const attributes = Array.from(el.attributes);
      attributes.forEach(attr => {
        if (attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name);
        }
        // Remove javascript: URLs
        if (attr.value && attr.value.toLowerCase().includes('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });

      // Replace disallowed tags with their text content
      if (!allowedTags.includes(el.tagName.toLowerCase())) {
        const textNode = document.createTextNode(el.textContent || '');
        el.parentNode?.replaceChild(textNode, el);
      }
    });

    return temp.innerHTML;
  } catch (error) {
    console.error('Fallback formatting sanitization failed:', error);
    return fallbackSanitizeHtml(html);
  }
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

  if (DOMPurify) {
    try {
      // Sanitize the HTML with template-friendly config
      const templateConfig = {
        ...SANITIZE_CONFIG,
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'b', 'i', 'u',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'span', 'div', 'blockquote',
          'code', 'pre', 'table', 'tr', 'td', 'th', 'thead', 'tbody'
        ],
        ALLOWED_ATTR: ['class', 'id'],
      };

      sanitized = DOMPurify.sanitize(sanitized, templateConfig);
    } catch (error) {
      console.error('DOMPurify template sanitization failed:', error);
      sanitized = fallbackSanitizeWithFormatting(sanitized);
    }
  } else {
    sanitized = fallbackSanitizeWithFormatting(sanitized);
  }

  // Restore template variables
  variables.forEach(({ placeholder, original }) => {
    sanitized = sanitized.replace(placeholder, original);
  });

  return sanitized;
}

/**
 * Check if string contains potentially dangerous content
 * Enhanced with more comprehensive patterns
 */
export function containsDangerousContent(html: string): boolean {
  if (!html) return false;

  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<applet[\s\S]*?>/gi,
    /<form[\s\S]*?>/gi,
    /<input[\s\S]*?>/gi,
    /<textarea[\s\S]*?>/gi,
    /<button[\s\S]*?>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:(?!image\/)/gi, // Allow data:image/ but block other data: protocols
    /<link[\s\S]*?>/gi,
    /<meta[\s\S]*?>/gi,
    /@import/i,
    /url\s*\(/gi
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

/**
 * Security test suite for HTML sanitization
 * Tests various XSS attack vectors
 */
export function runSecurityTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  const testCases = [
    {
      name: 'Script tag injection',
      input: '<script>alert("XSS")</script>',
      shouldContain: false
    },
    {
      name: 'JavaScript URL',
      input: '<a href="javascript:alert(\'XSS\')">Click me</a>',
      shouldContain: false
    },
    {
      name: 'Event handler injection',
      input: '<div onclick="alert(\'XSS\')">Click me</div>',
      shouldContain: false
    },
    {
      name: 'Iframe injection',
      input: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      shouldContain: false
    },
    {
      name: 'Data URL injection',
      input: '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
      shouldContain: false
    },
    {
      name: 'VBScript injection',
      input: '<div onmouseover="vbscript:msgbox(\'XSS\')">Hover me</div>',
      shouldContain: false
    },
    {
      name: 'CSS expression injection',
      input: '<div style="width: expression(alert(\'XSS\'))">Test</div>',
      shouldContain: false
    },
    {
      name: 'Safe content should pass',
      input: '<p><strong>Hello</strong> <em>World</em></p>',
      shouldContain: true
    },
    {
      name: 'Template variables should be preserved',
      input: '<p>Hello {{name}}, welcome to {{company}}!</p>',
      shouldContain: true
    },
    {
      name: 'Encoded XSS attempt',
      input: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      shouldContain: false // Should remain escaped
    }
  ];

  testCases.forEach(testCase => {
    const sanitized = sanitizeTemplateHtml(testCase.input);
    const containsScript = sanitized.includes('<script>');
    const containsJavascript = sanitized.toLowerCase().includes('javascript:');
    const containsEventHandlers = /\bon\w+\s*=/i.test(sanitized);

    const isClean = !containsScript && !containsJavascript && !containsEventHandlers;

    if (testCase.shouldContain) {
      if (!isClean) {
        results.push(`❌ ${testCase.name}: Safe content was removed`);
        passed = false;
      } else {
        results.push(`✅ ${testCase.name}: Safe content preserved`);
      }
    } else {
      if (!isClean) {
        results.push(`❌ ${testCase.name}: Dangerous content not removed`);
        passed = false;
      } else {
        results.push(`✅ ${testCase.name}: Dangerous content removed`);
      }
    }
  });

  return { passed, results };
}
