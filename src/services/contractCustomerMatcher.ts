/**
 * Contract Customer Matcher Service
 * Intelligently matches extracted contract data to existing customers
 */

import { supabase } from '@/integrations/supabase/client';

export interface CustomerMatch {
  customerId: string;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  customer: {
    id: string;
    name: string;
    qatariId?: string;
    phone?: string;
    licenseNumber?: string;
    type: 'individual' | 'company';
  };
}

export interface CustomerSearchParams {
  qatariId?: string;
  name?: string;
  phoneNumbers?: string[];
  licenseNumber?: string;
}

/**
 * Main function to match customer from extracted data
 */
export async function matchCustomer(
  params: CustomerSearchParams,
  companyId: string
): Promise<CustomerMatch | null> {
  const matches: CustomerMatch[] = [];

  // Priority 1: Exact Qatari ID match (highest confidence)
  if (params.qatariId) {
    const qatariIdMatch = await matchByQatariId(params.qatariId, companyId);
    if (qatariIdMatch) {
      matches.push(qatariIdMatch);
    }
  }

  // Priority 2: Exact name match (medium-high confidence)
  if (params.name) {
    const nameMatches = await matchByName(params.name, companyId);
    matches.push(...nameMatches);
  }

  // Priority 3: Phone number match (medium confidence)
  if (params.phoneNumbers && params.phoneNumbers.length > 0) {
    const phoneMatches = await matchByPhoneNumbers(params.phoneNumbers, companyId);
    matches.push(...phoneMatches);
  }

  // Priority 4: License number match (medium confidence)
  if (params.licenseNumber) {
    const licenseMatch = await matchByLicenseNumber(params.licenseNumber, companyId);
    if (licenseMatch) {
      matches.push(licenseMatch);
    }
  }

  // Return best match or null
  if (matches.length === 0) {
    return null;
  }

  // Sort by confidence priority
  const confidencePriority = { high: 3, medium: 2, low: 1 };
  matches.sort((a, b) => confidencePriority[b.confidence] - confidencePriority[a.confidence]);

  return matches[0];
}

/**
 * Match by Qatari ID (exact match)
 */
async function matchByQatariId(
  qatariId: string,
  companyId: string
): Promise<CustomerMatch | null> {
  try {
    const normalizedId = normalizeQatariId(qatariId);

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name_ar, last_name_ar, first_name, last_name, qatari_id, phone, license_number, customer_type')
      .eq('company_id', companyId)
      .eq('qatari_id', normalizedId)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const customer = data[0];
    return {
      customerId: customer.id,
      confidence: 'high',
      matchReason: 'رقم الهوية القطرية',
      customer: {
        id: customer.id,
        name: customer.first_name_ar || customer.first_name || '',
        qatariId: customer.qatari_id || undefined,
        phone: customer.phone || undefined,
        licenseNumber: customer.license_number || undefined,
        type: customer.customer_type === 'company' ? 'company' : 'individual',
      },
    };
  } catch (error) {
    console.error('Error matching by Qatari ID:', error);
    return null;
  }
}

/**
 * Match by name (fuzzy match)
 */
async function matchByName(
  name: string,
  companyId: string
): Promise<CustomerMatch[]> {
  try {
    const normalizedName = normalizeArabicName(name);

    // First try exact match
    const { data: exactMatches, error: exactError } = await supabase
      .from('customers')
      .select('id, first_name_ar, last_name_ar, first_name, last_name, qatari_id, phone, license_number, customer_type')
      .eq('company_id', companyId)
      .or(`first_name_ar.ilike.${normalizedName},last_name_ar.ilike.${normalizedName},first_name.ilike.${name},last_name.ilike.${name}`)
      .limit(5);

    if (exactError) {
      console.error('Error matching by name:', exactError);
      return [];
    }

    const matches: CustomerMatch[] = [];

    if (exactMatches && exactMatches.length > 0) {
      for (const customer of exactMatches) {
        const fullNameAr = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
        const fullNameEn = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

        // Check if names are very similar
        const similarity = calculateNameSimilarity(normalizedName, fullNameAr);
        const similarityEn = calculateNameSimilarity(name.toLowerCase(), fullNameEn.toLowerCase());

        const highestSimilarity = Math.max(similarity, similarityEn);

        if (highestSimilarity >= 0.8) {
          matches.push({
            customerId: customer.id,
            confidence: highestSimilarity >= 0.95 ? 'high' : 'medium',
            matchReason: 'اسم العميل',
            customer: {
              id: customer.id,
              name: fullNameAr || fullNameEn,
              qatariId: customer.qatari_id || undefined,
              phone: customer.phone || undefined,
              licenseNumber: customer.license_number || undefined,
              type: customer.customer_type === 'company' ? 'company' : 'individual',
            },
          });
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Error matching by name:', error);
    return [];
  }
}

/**
 * Match by phone numbers
 */
async function matchByPhoneNumbers(
  phoneNumbers: string[],
  companyId: string
): Promise<CustomerMatch[]> {
  try {
    const normalizedPhones = phoneNumbers.map(p => normalizePhoneNumber(p)).filter(Boolean);

    if (normalizedPhones.length === 0) {
      return [];
    }

    const matches: CustomerMatch[] = [];

    for (const phone of normalizedPhones) {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name_ar, last_name_ar, first_name, last_name, qatari_id, phone, license_number, customer_type')
        .eq('company_id', companyId)
        .eq('phone', phone)
        .limit(1);

      if (error || !data || data.length === 0) {
        continue;
      }

      const customer = data[0];
      const fullNameAr = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
      const fullNameEn = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

      matches.push({
        customerId: customer.id,
        confidence: 'medium',
        matchReason: 'رقم الهاتف',
        customer: {
          id: customer.id,
          name: fullNameAr || fullNameEn,
          qatariId: customer.qatari_id || undefined,
          phone: customer.phone || undefined,
          licenseNumber: customer.license_number || undefined,
          type: customer.customer_type === 'company' ? 'company' : 'individual',
        },
      });
    }

    return matches;
  } catch (error) {
    console.error('Error matching by phone numbers:', error);
    return [];
  }
}

/**
 * Match by license number
 */
async function matchByLicenseNumber(
  licenseNumber: string,
  companyId: string
): Promise<CustomerMatch | null> {
  try {
    const normalizedLicense = licenseNumber.trim();

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name_ar, last_name_ar, first_name, last_name, qatari_id, phone, license_number, customer_type')
      .eq('company_id', companyId)
      .eq('license_number', normalizedLicense)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const customer = data[0];
    const fullNameAr = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    const fullNameEn = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

    return {
      customerId: customer.id,
      confidence: 'medium',
      matchReason: 'رقم الرخصة',
      customer: {
        id: customer.id,
        name: fullNameAr || fullNameEn,
        qatariId: customer.qatari_id || undefined,
        phone: customer.phone || undefined,
        licenseNumber: customer.license_number || undefined,
        type: customer.customer_type === 'company' ? 'company' : 'individual',
      },
    };
  } catch (error) {
    console.error('Error matching by license number:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize Qatari ID (remove spaces, dashes, etc.)
 */
function normalizeQatariId(id: string): string {
  return id.replace(/[\s\-]/g, '').trim();
}

/**
 * Normalize phone number (remove spaces, dashes, +974, etc.)
 */
function normalizePhoneNumber(phone: string): string {
  return phone
    .replace(/[\s\-\(\)]/g, '')
    .replace(/^\+?974/, '')
    .trim();
}

/**
 * Normalize Arabic name (remove extra spaces, special characters)
 */
function normalizeArabicName(name: string): string {
  return name
    .replace(/[^\u0600-\u06FF\s]/g, '') // Keep only Arabic letters and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two names (Levenshtein distance)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (name1 === name2) return 1;
  if (!name1 || !name2) return 0;

  const longer = name1.length > name2.length ? name1 : name2;
  const shorter = name1.length > name2.length ? name2 : name1;

  if (longer.length === 0) return 1;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
