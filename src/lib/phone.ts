// Phone utilities for normalizing and formatting numbers for WhatsApp
import { normalizeArabicDigits } from "@/utils/numberFormatter";

export const normalizeDigits = (input: string = ''): string => {
  return normalizeArabicDigits(input);
};

export const cleanPhone = (input: string = ''): string => {
  const normalized = normalizeDigits(input);
  // Keep + and digits, remove all other characters including spaces, dashes, parentheses
  return normalized.replace(/[^+\d]/g, '');
};

// Minimal mapping focusing on GCC; extend if needed
const COUNTRY_DIAL_CODES: Record<string, string> = {
  // Qatar
  'qatar': '974',
  'قطر': '974',
  // Kuwait
  'kuwait': '965',
  'الكويت': '965',
  // Saudi Arabia
  'saudi arabia': '966',
  'saudi': '966',
  'المملكة العربية السعودية': '966',
  'السعودية': '966',
  // United Arab Emirates
  'uae': '971',
  'united arab emirates': '971',
  'الإمارات': '971',
  'الامارات': '971',
  // Oman
  'oman': '968',
  'عمان': '968',
  // Bahrain
  'bahrain': '973',
  'البحرين': '973',
};

export const mapCountryToDialCode = (country?: string): string | undefined => {
  if (!country) return undefined;
  const key = country.trim().toLowerCase();
  return COUNTRY_DIAL_CODES[key];
};

export const formatPhoneForWhatsApp = (phone?: string, companyCountry?: string) => {
  if (!phone) return { e164: '', waNumber: '' };
  let cleaned = cleanPhone(phone);

  // Remove leading 00 and spaces
  cleaned = cleaned.replace(/^00/, '+');

  // Determine dial code
  const dial = mapCountryToDialCode(companyCountry);

  // If already starts with +, assume correct; else prepend company dial if available
  if (cleaned.startsWith('+')) {
    const digits = cleaned.replace(/\D/g, '');
    return { e164: `+${digits}`, waNumber: digits };
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  const withDial = dial ? `${dial}${digitsOnly.replace(/^0+/, '')}` : digitsOnly;
  return { e164: `+${withDial}`, waNumber: withDial };
};
