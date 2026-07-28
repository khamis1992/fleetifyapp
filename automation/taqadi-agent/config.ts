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

const dataDir = path.resolve(
  process.env.TAQADI_AGENT_DATA_DIR
    || path.join(process.cwd(), '.taqadi-agent'),
);

export const agentConfig = {
  version: '1.0.0',
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
  headless: booleanFromEnv('TAQADI_HEADLESS', false),
  healthPort: numberFromEnv('TAQADI_HEALTH_PORT', 4317),
  dataDir,
  chromeProfileDir: path.join(dataDir, 'chrome-profile'),
  jobsDir: path.join(dataDir, 'jobs'),
  representative: {
    name: process.env.TAQADI_REPRESENTATIVE_NAME || 'خميس الجبر',
    phone: process.env.TAQADI_REPRESENTATIVE_PHONE || '',
    email: process.env.TAQADI_REPRESENTATIVE_EMAIL || '',
    address: process.env.TAQADI_REPRESENTATIVE_ADDRESS || 'الدوحة قطر',
    nationality: process.env.TAQADI_REPRESENTATIVE_NATIONALITY || 'تونسي',
  },
  company: {
    email: process.env.TAQADI_COMPANY_EMAIL || '',
    address: process.env.TAQADI_COMPANY_ADDRESS || '',
    bankNameAr: process.env.TAQADI_COMPANY_BANK_NAME_AR || '',
    bankNameEn: process.env.TAQADI_COMPANY_BANK_NAME_EN || '',
    iban: process.env.TAQADI_COMPANY_IBAN || '',
    swift: process.env.TAQADI_COMPANY_SWIFT || '',
    bankAddress: process.env.TAQADI_COMPANY_BANK_ADDRESS || '',
    bankCountry: process.env.TAQADI_COMPANY_BANK_COUNTRY || 'قطري',
  },
};

export function assertAgentConfig() {
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
  if (!agentConfig.company.email) missing.push('TAQADI_COMPANY_EMAIL');
  if (!agentConfig.company.address) missing.push('TAQADI_COMPANY_ADDRESS');
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
}
