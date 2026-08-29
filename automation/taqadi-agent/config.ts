import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: path.resolve(process.cwd(), '.env.taqadi-agent'), override: true });

const numberFromEnv = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const booleanFromEnv = (name: string, fallback: boolean) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

const CLAIMANT_EMAIL = 'khamis-1992@hotmail.com';

const dataDir = path.resolve(
  process.env.TAQADI_AGENT_DATA_DIR
    || path.join(process.cwd(), '.taqadi-agent'),
);

export const agentConfig = {
  version: '1.7.0',
  workerId: process.env.TAQADI_WORKER_ID
    || `${os.hostname()}-taqadi`,
  hostname: os.hostname(),
  supabaseUrl: process.env.TAQADI_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || '',
  supabaseServiceRoleKey: process.env.TAQADI_SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || '',
  portalUrl: process.env.TAQADI_PORTAL_URL
    || 'https://taqadi.sjc.gov.qa/itc/login',
  pollIntervalMs: numberFromEnv('TAQADI_POLL_INTERVAL_MS', 5_000),
  loginTimeoutMs: numberFromEnv('TAQADI_LOGIN_TIMEOUT_MS', 10 * 60_000),
  actionTimeoutMs: numberFromEnv('TAQADI_ACTION_TIMEOUT_MS', 30_000),
  finalApproval: booleanFromEnv('TAQADI_FINAL_APPROVAL', true),
  pauseBeforeFinalApproval: false,
  traceSnapshots: booleanFromEnv('TAQADI_TRACE_SNAPSHOTS', false),
  stopAfterParties: booleanFromEnv('TAQADI_STOP_AFTER_PARTIES', false),
  guidedMode: booleanFromEnv('TAQADI_GUIDED_MODE', false),
  headless: booleanFromEnv('TAQADI_HEADLESS', false),
  healthPort: numberFromEnv('TAQADI_HEALTH_PORT', 4317),
  dataDir,
  chromeProfileDir: path.join(dataDir, 'chrome-profile'),
  jobsDir: path.join(dataDir, 'jobs'),
  tawtheeq: {
    username: process.env.TAQADI_TAWTHEEQ_USERNAME || '',
    password: process.env.TAQADI_TAWTHEEQ_PASSWORD || '',
    smartCardPin: process.env.TAQADI_SMART_CARD_PIN || '',
  },
  // Optional LLM helpers (Level 2). The selector healer proposes updated
  // selectors; suggestions are auto-applied in-session ONLY after deterministic
  // verification against the live page (verified-healer.ts), otherwise they
  // stay propose-only artifacts. The navigation advisor may click a verified
  // safe button/link to recover from unknown pages, at most advisorMaxClicks
  // times per job. Both are disabled unless an API key is configured.
  healer: {
    apiKey: process.env.TAQADI_HEALER_API_KEY
      || process.env.ANTHROPIC_API_KEY
      || '',
    model: process.env.TAQADI_HEALER_MODEL || 'claude-opus-4-8',
  },
  // Optional local adaptive-selector memory. Scrapling never navigates the
  // portal or receives entered values; it only sees a redacted control map.
  scrapling: {
    enabled: booleanFromEnv('TAQADI_SCRAPLING_ENABLED', false),
    baseUrl: process.env.TAQADI_SCRAPLING_URL || 'http://127.0.0.1:4318',
    token: process.env.TAQADI_SCRAPLING_TOKEN || '',
    timeoutMs: numberFromEnv('TAQADI_SCRAPLING_TIMEOUT_MS', 2_000),
    minSimilarity: numberFromEnv('TAQADI_SCRAPLING_MIN_SIMILARITY', 80),
    maxHtmlBytes: numberFromEnv('TAQADI_SCRAPLING_MAX_HTML_BYTES', 512_000),
  },
  advisorMaxClicks: numberFromEnv('TAQADI_ADVISOR_MAX_CLICKS', 2),
  representative: {
    name: process.env.TAQADI_REPRESENTATIVE_NAME || 'خميس الجبر',
    phone: process.env.TAQADI_REPRESENTATIVE_PHONE || '',
    email: process.env.TAQADI_REPRESENTATIVE_EMAIL || CLAIMANT_EMAIL,
    address: process.env.TAQADI_REPRESENTATIVE_ADDRESS || 'الدوحة قطر',
    nationality: process.env.TAQADI_REPRESENTATIVE_NATIONALITY || 'قطر',
    identityType: process.env.TAQADI_REPRESENTATIVE_ID_TYPE || 'بطاقة شخصية',
    identityNumber: process.env.TAQADI_REPRESENTATIVE_ID_NUMBER
      || process.env.TAQADI_TAWTHEEQ_USERNAME
      || '',
    principalName: process.env.TAQADI_REPRESENTATIVE_PRINCIPAL_NAME
      || 'شركة العراف لتأجير السيارات',
    guardianType: process.env.TAQADI_REPRESENTATIVE_GUARDIAN_TYPE || 'طبيعي',
    connectionDegree: process.env.TAQADI_REPRESENTATIVE_CONNECTION_DEGREE || 'أخرى',
  },
  company: {
    establishmentNumber: process.env.TAQADI_COMPANY_ESTABLISHMENT_NUMBER
      || '17201586',
    establishmentIssuer: process.env.TAQADI_COMPANY_ESTABLISHMENT_ISSUER
      || 'وزارة التجارة والصناعة',
    phone: process.env.TAQADI_COMPANY_PHONE
      || process.env.TAQADI_REPRESENTATIVE_PHONE
      || '',
    email: process.env.TAQADI_COMPANY_EMAIL || CLAIMANT_EMAIL,
    address: process.env.TAQADI_COMPANY_ADDRESS || '',
    country: process.env.TAQADI_COMPANY_COUNTRY || 'قطر',
    bankNameAr: process.env.TAQADI_COMPANY_BANK_NAME_AR || '',
    bankNameEn: process.env.TAQADI_COMPANY_BANK_NAME_EN || '',
    iban: process.env.TAQADI_COMPANY_IBAN || '',
    swift: process.env.TAQADI_COMPANY_SWIFT || '',
    bankAddress: process.env.TAQADI_COMPANY_BANK_ADDRESS || '',
    bankCountry: process.env.TAQADI_COMPANY_BANK_COUNTRY || 'قطري',
  },
};

export interface ScraplingConfigShape {
  enabled: boolean;
  baseUrl: string;
  token: string;
  minSimilarity: number;
}

/**
 * Keep the parser sidecar on the filing workstation. A remote URL would turn
 * the redacted portal structure into an unnecessary external data flow.
 */
export function validateScraplingConfig(
  config: ScraplingConfigShape,
): string[] {
  if (!config.enabled) return [];
  const errors: string[] = [];
  if (config.token.trim().length < 24) {
    errors.push('TAQADI_SCRAPLING_TOKEN must contain at least 24 characters');
  }
  if (config.minSimilarity < 70 || config.minSimilarity > 100) {
    errors.push('TAQADI_SCRAPLING_MIN_SIMILARITY must be between 70 and 100');
  }
  try {
    const url = new URL(config.baseUrl);
    const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
    if (url.protocol !== 'http:' || !localHosts.has(url.hostname)) {
      errors.push('TAQADI_SCRAPLING_URL must be a local loopback HTTP URL');
    }
  } catch {
    errors.push('TAQADI_SCRAPLING_URL must be a valid URL');
  }
  return errors;
}

/**
 * كشف القيم تالفة الترميز في الإعدادات العربية الحرجة.
 * عندما يُحفظ .env.taqadi-agent بترميز ANSI تتحول العربية إلى علامات
 * استفهام حرفية، فيفشل الوكيل وسط دعوى حقيقية (مثل قائمة «بلد البنك»).
 * يُستدعى عند الإقلاع فيفشل بسرعة وبرسالة واضحة بدل الفشل داخل البوابة.
 */
export function findCorruptedConfigValues(
  config: Pick<typeof agentConfig, 'representative' | 'company'>,
): string[] {
  const corrupted = (value: string | undefined) =>
    typeof value === 'string' && value.includes('?') && /^[\s?]+$/.test(value);
  const checks: Array<[string, string]> = [
    ['TAQADI_REPRESENTATIVE_NAME', config.representative.name],
    ['TAQADI_REPRESENTATIVE_ADDRESS', config.representative.address],
    ['TAQADI_REPRESENTATIVE_NATIONALITY', config.representative.nationality],
    ['TAQADI_REPRESENTATIVE_ID_TYPE', config.representative.identityType],
    ['TAQADI_COMPANY_ADDRESS', config.company.address],
    ['TAQADI_COMPANY_COUNTRY', config.company.country],
    ['TAQADI_COMPANY_ESTABLISHMENT_ISSUER', config.company.establishmentIssuer],
    ['TAQADI_COMPANY_BANK_NAME_AR', config.company.bankNameAr],
    ['TAQADI_COMPANY_BANK_COUNTRY', config.company.bankCountry],
  ];
  return checks
    .filter(([, value]) => corrupted(value))
    .map(([name]) => name);
}

export function assertAgentConfig() {
  const corrupted = findCorruptedConfigValues(agentConfig);
  if (corrupted.length > 0) {
    throw new Error(
      'Corrupted (non-UTF-8) Arabic configuration values detected: '
      + corrupted.join(', ')
      + '. Re-save .env.taqadi-agent as UTF-8 with the proper Arabic text.',
    );
  }

  const missing: string[] = [];
  if (!agentConfig.supabaseUrl) missing.push('TAQADI_SUPABASE_URL');
  if (!agentConfig.supabaseServiceRoleKey) {
    missing.push('TAQADI_SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!agentConfig.representative.name) {
    missing.push('TAQADI_REPRESENTATIVE_NAME');
  }
  if (!agentConfig.representative.phone) {
    missing.push('TAQADI_REPRESENTATIVE_PHONE');
  }
  if (!agentConfig.representative.email) {
    missing.push('TAQADI_REPRESENTATIVE_EMAIL');
  }
  if (!agentConfig.representative.identityType) {
    missing.push('TAQADI_REPRESENTATIVE_ID_TYPE');
  }
  if (!agentConfig.representative.identityNumber) {
    missing.push('TAQADI_REPRESENTATIVE_ID_NUMBER');
  }
  if (!agentConfig.company.email) missing.push('TAQADI_COMPANY_EMAIL');
  if (!agentConfig.company.phone) missing.push('TAQADI_COMPANY_PHONE');
  if (!agentConfig.company.address) missing.push('TAQADI_COMPANY_ADDRESS');
  if (!agentConfig.company.establishmentNumber) {
    missing.push('TAQADI_COMPANY_ESTABLISHMENT_NUMBER');
  }
  if (!agentConfig.company.establishmentIssuer) {
    missing.push('TAQADI_COMPANY_ESTABLISHMENT_ISSUER');
  }
  if (!agentConfig.company.bankNameAr) {
    missing.push('TAQADI_COMPANY_BANK_NAME_AR');
  }
  if (!agentConfig.company.bankNameEn) {
    missing.push('TAQADI_COMPANY_BANK_NAME_EN');
  }
  if (!agentConfig.company.iban) missing.push('TAQADI_COMPANY_IBAN');
  if (!agentConfig.company.swift) missing.push('TAQADI_COMPANY_SWIFT');
  if (!agentConfig.company.bankAddress) {
    missing.push('TAQADI_COMPANY_BANK_ADDRESS');
  }
  if (!agentConfig.company.bankCountry) {
    missing.push('TAQADI_COMPANY_BANK_COUNTRY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Taqadi agent configuration: ${missing.join(', ')}`,
    );
  }

  const scraplingErrors = validateScraplingConfig(agentConfig.scrapling);
  if (scraplingErrors.length > 0) {
    throw new Error(`Invalid Scrapling configuration: ${scraplingErrors.join('; ')}`);
  }
}
