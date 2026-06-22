/**
 * GLM AI Service
 * Integration with GLM-4 (GLM) language model for intelligent document generation
 */

import { logger } from '@/lib/logger';

interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

interface GLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * GLM Service Class
 * Handles communication with GLM-4 API for intelligent document generation
 */
export class GLMService {
  private config: GLMConfig | null = null;
  private baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor() {
    this.loadConfig();
  }

  /**
   * Load GLM configuration from system settings
   */
  private async loadConfig(): Promise<void> {
    try {
      // Try to get API key from localStorage first
      const storedKey = localStorage.getItem('glm_api_key');
      const storedModel = localStorage.getItem('glm_model') || 'glm-4';
      
      if (storedKey) {
        this.config = {
          apiKey: storedKey,
          model: storedModel,
          temperature: 0.7,
          maxTokens: 4000,
        };
        logger.info('GLM_CONFIG', 'Configuration loaded from localStorage');
        return;
      }

      // If not in localStorage, try to fetch from database
      // Note: This requires a settings table to store API keys
      logger.warn('GLM_CONFIG', 'No API key found in localStorage');
    } catch (error) {
      logger.error('GLM_CONFIG', 'Failed to load configuration', error);
    }
  }

  /**
   * Save GLM configuration
   */
  async saveConfig(apiKey: string, model: string = 'glm-4'): Promise<void> {
    try {
      localStorage.setItem('glm_api_key', apiKey);
      localStorage.setItem('glm_model', model);
      
      this.config = {
        apiKey,
        model,
        temperature: 0.7,
        maxTokens: 4000,
      };
      
      logger.info('GLM_CONFIG', 'Configuration saved', { model });
    } catch (error) {
      logger.error('GLM_CONFIG', 'Failed to save configuration', error);
      throw error;
    }
  }

  /**
   * Check if GLM is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.apiKey;
  }

  /**
   * Generate document content using GLM
   */
  async generateDocument(
    template: string,
    context: {
      documentType: string;
      recipient?: string;
      companyInfo?: any;
      additionalData?: Record<string, any>;
    },
    options?: {
      temperature?: number;
      includeSuggestions?: boolean;
    }
  ): Promise<GLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GLM not configured. Please provide API key.',
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context.documentType);
      const userPrompt = this.buildUserPrompt(template, context);

      const messages: GLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Add suggestions to prompt if requested
      if (options?.includeSuggestions) {
        messages.push({
          role: 'user',
          content: '\n\nبعد إنشاء الكتاب، يرجى توفير:\n\n1. اقتراحات لتحسين محتوى الكتاب\n2. اقتراحات للتنسيق والعرض\n3. تحقق من صحة المعلومات القانونية',
        });
      }

      const response = await this.callGLMAPI(messages, options?.temperature);

      if (response.success && response.content) {
        // Extract document content and suggestions if available
        const content = this.parseResponse(response.content);
        
        return {
          success: true,
          content: content.document,
        };
      }

      return response;
    } catch (error) {
      logger.error('GLM_GENERATE', 'Failed to generate document', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل في توليد الكتاب',
      };
    }
  }

  /**
   * Improve existing document
   */
  async improveDocument(
    originalDocument: string,
    documentType: string,
    improvements: string[]
  ): Promise<GLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GLM not configured. Please provide API key.',
      };
    }

    try {
      const systemPrompt = `أنت مساعد ذكي في كتابة الكتب الرسمية للشركات في قطر.
مهمتك تحسين وتطوير الكتب الرسمية.
يجب أن تحافظ على الطابع الرسمي واللغة العربية السليمة.
نوع الكتاب: ${documentType}`;

      const userPrompt = `الكتاب الأصلي:
${originalDocument}

المطلوب:
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

يرجى تحسين الكتاب مع الحفاظ على الطابع الرسمي.`;

      const messages: GLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.callGLMAPI(messages);

      return {
        success: response.success,
        content: response.content,
        error: response.error,
      };
    } catch (error) {
      logger.error('GLM_IMPROVE', 'Failed to improve document', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل في تحسين الكتاب',
      };
    }
  }

  /**
   * Suggest field values for document
   */
  async suggestFieldValues(
    documentType: string,
    context: {
      companyId?: string;
      customerId?: string;
      contractId?: string;
      vehicleId?: string;
    }
  ): Promise<GLMResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GLM not configured. Please provide API key.',
      };
    }

    try {
      const systemPrompt = `أنت مساعد ذكي في كتابة الكتب الرسمية للشركات في قطر.
مهمتك اقتراح قيم مناسبة للحقول في نماذج الكتب.
يجب أن تكون القيم واقعية ومناسبة للسياق القانوني.`;

      const userPrompt = `نوع الكتاب: ${documentType}

السياق:
${context.companyId ? `- معرف الشركة: ${context.companyId}` : ''}
${context.customerId ? `- معرف العميل: ${context.customerId}` : ''}
${context.contractId ? `- معرف العقد: ${context.contractId}` : ''}
${context.vehicleId ? `- معرف المركبة: ${context.vehicleId}` : ''}

يرجى اقتراح قيم واقعية ومناسبة للحقول التالية (إذا كان مناسبًا):
1. اسم المستلم
2. العنوان
3. رقم الهاتف
4. التاريخ
5. أية تفاصيل أخرى ذات صلة

يرجى الرد بصيغة JSON فقط:
{
  "recipient_name": "اقتراح الاسم",
  "address": "العنوان المقترح",
  "phone": "رقم الهاتف المقترح",
  "date": "التاريخ المقترح",
  "suggestions": ["اقتراح إضافي 1", "اقتراح إضافي 2"]
}`;

      const messages: GLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.callGLMAPI(messages, 0.3); // Lower temperature for more deterministic results

      return response;
    } catch (error) {
      logger.error('GLM_SUGGEST', 'Failed to suggest values', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل في اقتراح القيم',
      };
    }
  }

  /**
   * Call GLM API
   */
  private async callGLMAPI(
    messages: GLMMessage[],
    temperature?: number
  ): Promise<GLMResponse> {
    if (!this.config) {
      return {
        success: false,
        error: 'GLM configuration not loaded',
      };
    }

    try {
      const requestBody = {
        model: this.config.model,
        messages: messages,
        temperature: temperature ?? this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('GLM_API', `API Error: ${response.status}`, errorText);
        return {
          success: false,
          error: `GLM API Error: ${response.status}`,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: 'No content in GLM response',
        };
      }

      return {
        success: true,
        content,
      };
    } catch (error) {
      logger.error('GLM_API', 'Failed to call API', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل في الاتصال بـ GLM',
      };
    }
  }

  /**
   * Build system prompt for document generation
   */
  private buildSystemPrompt(documentType: string): string {
    return `أنت مساعد ذكي متخصص في كتابة الكتب الرسمية للشركات في قطر.
مهمتك كتابة كتب رسمية احترافية ومتسمة قانونياً.

القواعد المهمة:
1. استخدام اللغة العربية الفصحى مع صحة القواعد النحوية
2. الحفاظ على الطابع الرسمي للمخاطبات
3. التأكد من صحة المعلومات القانونية المذكورة
4. استخدام المصطلحات القانونية واللائحية المناسبة
5. التنسيق المناسب للمخاطبات الرسمية
6. احترام الخصوصية والسرية

نوع الكتاب: ${documentType}

يرجى كتابة الكتاب بشكل احترافي ومتسم.`;
  }

  /**
   * Build user prompt from template and context
   */
  private buildUserPrompt(
    template: string,
    context: {
      documentType: string;
      recipient?: string;
      companyInfo?: any;
      additionalData?: Record<string, any>;
    }
  ): string {
    let prompt = `قالب الكتاب:
${template}

`;

    if (context.recipient) {
      prompt += `\nالمخاطب: ${context.recipient}\n`;
    }

    if (context.companyInfo) {
      prompt += `\nمعلومات الشركة:\n`;
      prompt += `- الاسم: ${context.companyInfo.name_ar || ''}\n`;
      prompt += `- العنوان: ${context.companyInfo.address || ''}\n`;
      prompt += `- الهاتف: ${context.companyInfo.phone || ''}\n`;
    }

    if (context.additionalData && Object.keys(context.additionalData).length > 0) {
      prompt += `\nبيانات إضافية:\n`;
      Object.entries(context.additionalData).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
    }

    prompt += `\nيرجى كتابة الكتاب الكامل بناءً على القالب والبيانات المذكورة أعلاه، مع الحفاظ على الطابع الرسمي.`;

    return prompt;
  }

  /**
   * Parse GLM response to extract document
   */
  private parseResponse(content: string): { document: string; suggestions?: string[] } {
    try {
      // Try to parse JSON if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.document || parsed.content) {
          return {
            document: parsed.document || parsed.content,
            suggestions: parsed.suggestions,
          };
        }
      }

      // If not JSON, return content as-is
      return {
        document: content,
      };
    } catch {
      // Return content as-is if parsing fails
      return {
        document: content,
      };
    }
  }

  /**
   * Test GLM connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'GLM not configured. Please provide API key.',
      };
    }

    try {
      const testMessages: GLMMessage[] = [
        {
          role: 'user',
          content: 'اختبار الاتصال. يرجى الرد بكلمة "نجح".',
        },
      ];

      const response = await this.callGLMAPI(testMessages, 0.1);

      if (response.success && response.content) {
        return {
          success: true,
          message: 'GLM connection successful',
        };
      }

      return {
        success: false,
        message: response.error || 'GLM connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'فشل في اختبار الاتصال',
      };
    }
  }
}

// Export singleton instance
export const glmService = new GLMService();

