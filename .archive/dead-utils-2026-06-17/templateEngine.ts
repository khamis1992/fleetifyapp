// ============================================================================
// Template Engine Utility
// ============================================================================

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  source?: string;
  default?: any;
}

export interface TemplateData {
  [key: string]: string | number | Date | undefined;
}

/**
 * Replace template variables with actual data
 * Supports {{variable}} syntax
 */
export function replaceTemplateVariables(
  template: string,
  data: TemplateData
): string {
  let result = template;

  // Replace all {{variable}} placeholders
  Object.keys(data).forEach((key) => {
    const value = data[key];
    let formattedValue = '';

    if (value === undefined || value === null) {
      formattedValue = '';
    } else if (value instanceof Date) {
      // Format dates in Arabic
      formattedValue = format(value, 'dd/MM/yyyy', { locale: ar });
    } else if (typeof value === 'number') {
      // Format numbers
      formattedValue = value.toLocaleString('ar-SA');
    } else {
      formattedValue = String(value);
    }

    // Replace {{key}} with formatted value
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, formattedValue);
  });

  // Handle {{current_date}} or {{today}} specially
  if (result.includes('{{current_date}}') || result.includes('{{today}}')) {
    const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });
    result = result.replace(/\{\{\s*current_date\s*\}\}/g, today);
    result = result.replace(/\{\{\s*today\s*\}\}/g, today);
  }

  return result;
}

/**
 * Validate required template variables
 */
export function validateTemplateVariables(
  variables: TemplateVariable[],
  data: TemplateData
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  variables
    .filter((v) => v.required)
    .forEach((variable) => {
      const value = data[variable.name];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.push(variable.label);
      }
    });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get default values for template variables
 */
export function getDefaultValues(variables: TemplateVariable[]): TemplateData {
  const defaults: TemplateData = {};

  variables.forEach((variable) => {
    if (variable.default !== undefined) {
      defaults[variable.name] = variable.default;
    } else if (variable.type === 'date' && variable.name === 'letter_date') {
      defaults[variable.name] = new Date().toISOString().split('T')[0];
    }
  });

  return defaults;
}

/**
 * Format document content for display
 */
export function formatDocumentContent(content: string): string {
  // Preserve line breaks and formatting
  return content
    .replace(/\n\n+/g, '\n\n') // Remove excessive line breaks
    .trim();
}

/**
 * Generate HTML for document preview
 */
export function generateDocumentHTML(
  content: string,
  title?: string
): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'وثيقة رسمية'}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.8;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      direction: rtl;
    }
    .document {
      white-space: pre-line;
      text-align: right;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    ${content}
  </div>
</body>
</html>
  `.trim();
}
