/**
 * Voice Input Helpers
 * Utilities for voice-to-text functionality
 */

import type { VoiceLanguage, VoicePrivacyConsent } from '@/types/mobile';

/**
 * Check if Web Speech API is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Get SpeechRecognition constructor
 */
export function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;

  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

/**
 * Get browser compatibility info
 */
export function getBrowserCompatibility() {
  if (typeof window === 'undefined') {
    return { supported: false, browser: 'unknown' };
  }

  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isEdge = /Edge/.test(userAgent);

  return {
    supported: isSpeechRecognitionSupported(),
    browser: isChrome ? 'chrome' : isSafari ? 'safari' : isEdge ? 'edge' : 'other',
    isChrome,
    isSafari,
    isEdge,
  };
}

/**
 * Get supported languages for speech recognition
 */
export function getSupportedLanguages(): VoiceLanguage[] {
  // Web Speech API supports many languages, but we focus on Arabic and English
  return ['ar-SA', 'en-US'];
}

/**
 * Format language code for display
 */
export function formatLanguageName(lang: VoiceLanguage): string {
  const names: Record<VoiceLanguage, string> = {
    'ar-SA': 'العربية',
    'en-US': 'English',
  };
  return names[lang] || lang;
}

/**
 * Check if user has granted microphone permission
 */
export async function checkMicrophonePermission(): Promise<PermissionState | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return 'unsupported';
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    // Permissions API not supported or query failed
    return 'unsupported';
  }
}

/**
 * Request microphone access
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone access denied:', error);
    return false;
  }
}

/**
 * Get or create privacy consent
 */
export function getVoicePrivacyConsent(): VoicePrivacyConsent | null {
  try {
    const stored = localStorage.getItem('voice_privacy_consent');
    if (!stored) return null;

    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get consent:', error);
    return null;
  }
}

/**
 * Save privacy consent
 */
export function saveVoicePrivacyConsent(granted: boolean): void {
  const consent: VoicePrivacyConsent = {
    granted,
    timestamp: Date.now(),
    version: '1.0',
  };

  try {
    localStorage.setItem('voice_privacy_consent', JSON.stringify(consent));
  } catch (error) {
    console.error('Failed to save consent:', error);
  }
}

/**
 * Check if privacy consent is valid
 */
export function hasValidConsent(): boolean {
  const consent = getVoicePrivacyConsent();
  if (!consent) return false;

  // Consent is valid if granted and not older than 1 year
  const age = Date.now() - consent.timestamp;
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  return consent.granted && age < oneYear;
}

/**
 * Clean transcript text
 */
export function cleanTranscript(text: string): string {
  return text
    .trim()
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing punctuation duplicates
    .replace(/([.!?,])\1+/g, '$1');
}

/**
 * Parse voice command
 */
export function parseVoiceCommand(transcript: string, language: VoiceLanguage): {
  command: string | null;
  params: string[];
} {
  const cleaned = cleanTranscript(transcript.toLowerCase());

  // Arabic commands
  if (language === 'ar-SA') {
    const arabicCommands: Record<string, RegExp> = {
      'navigate_dashboard': /(?:افتح|اذهب إلى|انتقل إلى)\s*(?:لوحة التحكم|الرئيسية)/,
      'navigate_contracts': /(?:افتح|اذهب إلى)\s*العقود/,
      'navigate_customers': /(?:افتح|اذهب إلى)\s*العملاء/,
      'navigate_fleet': /(?:افتح|اذهب إلى)\s*(?:الأسطول|المركبات)/,
      'navigate_finance': /(?:افتح|اذهب إلى)\s*(?:المالية|الحسابات)/,
      'new_contract': /(?:أضف|أنشئ|سجل)\s*عقد\s*(?:جديد)?/,
      'new_customer': /(?:أضف|أنشئ|سجل)\s*عميل\s*(?:جديد)?/,
      'search': /(?:ابحث عن|بحث)\s+(.+)/,
    };

    for (const [command, regex] of Object.entries(arabicCommands)) {
      const match = cleaned.match(regex);
      if (match) {
        return { command, params: match.slice(1) };
      }
    }
  }

  // English commands
  if (language === 'en-US') {
    const englishCommands: Record<string, RegExp> = {
      'navigate_dashboard': /(?:open|go to|navigate to)\s*(?:dashboard|home)/,
      'navigate_contracts': /(?:open|go to)\s*contracts/,
      'navigate_customers': /(?:open|go to)\s*customers/,
      'navigate_fleet': /(?:open|go to)\s*fleet/,
      'navigate_finance': /(?:open|go to)\s*finance/,
      'new_contract': /(?:add|create|new)\s*contract/,
      'new_customer': /(?:add|create|new)\s*customer/,
      'search': /(?:search for|find)\s+(.+)/,
    };

    for (const [command, regex] of Object.entries(englishCommands)) {
      const match = cleaned.match(regex);
      if (match) {
        return { command, params: match.slice(1) };
      }
    }
  }

  return { command: null, params: [] };
}

/**
 * Get error message for speech recognition errors
 */
export function getSpeechErrorMessage(error: any): string {
  const errorMessages: Record<string, string> = {
    'no-speech': 'لم يتم اكتشاف صوت. حاول مرة أخرى.',
    'audio-capture': 'لا يمكن الوصول إلى الميكروفون.',
    'not-allowed': 'تم رفض إذن الوصول إلى الميكروفون.',
    'network': 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت.',
    'aborted': 'تم إلغاء التسجيل.',
    'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة.',
    'bad-grammar': 'خطأ في معالجة الصوت.',
    'language-not-supported': 'اللغة المحددة غير مدعومة.',
  };

  const errorType = error?.error || 'unknown';
  return errorMessages[errorType] || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

/**
 * Format recording duration
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if voice input should be available
 */
export function shouldEnableVoiceInput(): boolean {
  return (
    isSpeechRecognitionSupported() &&
    hasValidConsent()
  );
}
