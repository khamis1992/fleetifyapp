/**
 * Legal Document Template Engine
 * Handles variable replacement and document generation
 */

import type {
  DocumentTemplate,
  TemplateRenderContext,
  TemplateRenderResult,
  VariableValue,
} from '@/types/legal-document-generator';

// ============================================================================
// Arabic Utilities
// ============================================================================

/**
 * Convert Western Arabic numerals to Eastern Arabic numerals
 */
export function toArabicNumerals(num: string | number): string {
  const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const easternNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  return String(num).replace(/[0-9]/g, (d) =>
    easternNumerals[westernNumerals.indexOf(d)]
  );
}

/**
 * Format date in Arabic
 */
export function formatDateAr(date: Date): string {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${toArabicNumerals(day)} ${month} ${toArabicNumerals(year)}`;
}

/**
 * Format date in English
 */
export function formatDateEn(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format number in Arabic
 */
export function formatNumberAr(num: number): string {
  return toArabicNumerals(
    num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format currency in Arabic
 */
export function formatCurrencyAr(amount: number, currency: string = 'SAR'): string {
  return `${formatNumberAr(amount)} ${currency}`;
}

// ============================================================================
// Template Variable Replacer
// ============================================================================

/**
 * Replace variables in template with actual values
 */
export function replaceVariables(
  template: string,
  data: Record<string, VariableValue>,
  context?: Partial<TemplateRenderContext>
): string {
  let result = template;

  // Get current date if not provided
  const currentDate = context?.currentDate || new Date();

  // Add default system variables
  const systemVars: Record<string, VariableValue> = {
    current_date: formatDateAr(currentDate),
    current_date_en: formatDateEn(currentDate),
    current_time: currentDate.toLocaleTimeString('ar-SA'),
    current_year: toArabicNumerals(currentDate.getFullYear()),
    current_month: toArabicNumerals(currentDate.getMonth() + 1),
    current_day: toArabicNumerals(currentDate.getDate()),
    company_name: context?.company?.name_ar || '',
    company_name_en: context?.company?.name_en || '',
    company_address: context?.company?.address || '',
    company_phone: context?.company?.phone || '',
    company_email: context?.company?.email || '',
    sender_name: context?.user?.name_ar || '',
    sender_name_en: context?.user?.name_en || '',
    sender_title: context?.user?.title || '',
  };

  // Merge system vars with user data (user data takes precedence)
  const allData = { ...systemVars, ...data };

  // Replace variables in the format {{variable_name}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = allData[variableName];

    if (value === null || value === undefined) {
      return match; // Keep the placeholder if value is missing
    }

    // Format based on value type
    if (value instanceof Date) {
      return formatDateAr(value);
    }

    if (typeof value === 'number') {
      return formatNumberAr(value);
    }

    return String(value);
  });

  return result;
}

// ============================================================================
// Template Renderer
// ============================================================================

/**
 * Render a document template with provided data
 */
export function renderTemplate(
  template: DocumentTemplate,
  data: Record<string, VariableValue>,
  context?: Partial<TemplateRenderContext>
): TemplateRenderResult {
  const errors: string[] = [];

  // Validate required variables
  for (const variable of template.variables) {
    if (variable.required && !data[variable.name]) {
      errors.push(`Missing required variable: ${variable.label}`);
    }
  }

  // Render subject
  const subject = template.subject_template
    ? replaceVariables(template.subject_template, data, context)
    : '';

  // Render body
  const body = replaceVariables(template.body_template, data, context);

  // Generate HTML preview
  const html = generateHtmlPreview(
    subject,
    body,
    template.footer_template,
    context
  );

  return {
    subject,
    body,
    html,
    errors,
  };
}

// ============================================================================
// HTML Preview Generator
// ============================================================================

/**
 * Generate HTML preview of the document
 */
export function generateHtmlPreview(
  subject: string,
  body: string,
  footer: string | null | undefined,
  context?: Partial<TemplateRenderContext>
): string {
  const companyName = context?.company?.name_ar || 'شركة العراف';
  const currentDate = formatDateAr(context?.currentDate || new Date());

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .document {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      padding: 25mm;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }

    .company-name {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .company-name-en {
      font-size: 12pt;
      color: #666;
      margin-bottom: 10px;
    }

    .document-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      font-size: 11pt;
    }

    .subject {
      background: #f9f9f9;
      padding: 15px;
      margin-bottom: 20px;
      border-right: 4px solid #333;
      font-weight: bold;
    }

    .greeting {
      margin-bottom: 15px;
    }

    .body {
      text-align: justify;
      white-space: pre-line;
      line-height: 2;
    }

    .body p {
      margin-bottom: 15px;
    }

    .closing {
      margin-top: 30px;
      text-align: left;
    }

    .signature {
      margin-top: 50px;
      text-align: center;
    }

    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      padding-top: 10px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .document {
        box-shadow: none;
        padding: 20mm;
      }
    }

    @media (max-width: 768px) {
      .document {
        padding: 15mm;
      }

      .document-info {
        flex-direction: column;
        gap: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="company-name">${companyName}</div>
      ${context?.company?.name_en ? `<div class="company-name-en">${context.company.name_en}</div>` : ''}
    </div>

    <div class="document-info">
      <div>التاريخ: ${currentDate}</div>
      ${context?.user?.name ? `<div>المرسل: ${context.user.name}</div>` : ''}
    </div>

    ${subject ? `<div class="subject">الموضوع: ${subject}</div>` : ''}

    <div class="body">
      ${body.replace(/\n/g, '<br>')}
    </div>

    <div class="closing">
      وتفضلوا بقبول فائق التقدير والاحترام،،
    </div>

    <div class="signature">
      <div class="signature-line">
        ${context?.user?.name || '................................'}
      </div>
      <div>${context?.user?.title || 'المسمى الوظيفي'}</div>
    </div>

    ${footer ? `<div class="footer">${footer}</div>` : ''}
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Variable Value Formatter
// ============================================================================

/**
 * Format a variable value for display
 */
export function formatVariableValue(
  value: VariableValue,
  type: string
): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'date':
      return value instanceof Date ? formatDateAr(value) : String(value);
    case 'number':
      return typeof value === 'number' ? formatNumberAr(value) : String(value);
    case 'checkbox':
      return value ? '✓ نعم' : '✗ لا';
    default:
      return String(value);
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate variable data against template requirements
 */
export function validateTemplateData(
  template: DocumentTemplate,
  data: Record<string, VariableValue>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const variable of template.variables) {
    const value = data[variable.name];

    // Check required
    if (variable.required && (value === null || value === undefined || value === '')) {
      errors[variable.name] = `${variable.label} مطلوب`;
      continue;
    }

    // Skip validation if value is empty and not required
    if (!value) continue;

    // Type-specific validation
    if (variable.validation) {
      for (const rule of variable.validation) {
        switch (rule.type) {
          case 'minLength':
            if (typeof value === 'string' && value.length < rule.value) {
              errors[variable.name] = rule.message;
            }
            break;
          case 'maxLength':
            if (typeof value === 'string' && value.length > rule.value) {
              errors[variable.name] = rule.message;
            }
            break;
          case 'pattern':
            if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
              errors[variable.name] = rule.message;
            }
            break;
          case 'min':
            if (typeof value === 'number' && value < rule.value) {
              errors[variable.name] = rule.message;
            }
            break;
          case 'max':
            if (typeof value === 'number' && value > rule.value) {
              errors[variable.name] = rule.message;
            }
            break;
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Template Preview
// ============================================================================

/**
 * Generate a quick preview of what the template looks like
 */
export function generateTemplatePreview(template: DocumentTemplate): string {
  const previewData: Record<string, VariableValue> = {};

  // Generate sample data based on variable types
  for (const variable of template.variables) {
    switch (variable.type) {
      case 'text':
        previewData[variable.name] = variable.placeholder || '[نص]';
        break;
      case 'number':
        previewData[variable.name] = variable.placeholder || '123';
        break;
      case 'date':
        previewData[variable.name] = new Date();
        break;
      case 'textarea':
        previewData[variable.name] = variable.placeholder || '[نص طويل]';
        break;
      case 'select':
        previewData[variable.name] = variable.options?.[0] || '[خيار]';
        break;
      default:
        previewData[variable.name] = `[${variable.label}]`;
    }
  }

  const result = renderTemplate(template, previewData);

  return result.html;
}
