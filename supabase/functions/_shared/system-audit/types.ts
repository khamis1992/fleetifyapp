export const SYSTEM_AUDIT_DOMAINS = [
  "contracts",
  "accounting",
  "fleet",
  "customers",
  "inventory",
  "legal",
  "employees",
] as const;

export type SystemAuditDomain = (typeof SYSTEM_AUDIT_DOMAINS)[number];
export type SystemAuditMode = "dry_run" | "apply";
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export type AuditJob = {
  id: string;
  run_id: string;
  company_id: string;
  domain: SystemAuditDomain;
  mode: SystemAuditMode;
  status: string;
  cursor: Record<string, unknown> | null;
  batch_size: number;
  lease_token: string;
  settings: Record<string, unknown> | null;
  stats: Record<string, number> | null;
  processed_batches: number;
};

export type RepairSpec = {
  command: string;
  entityType: string;
  entityId: string;
  expectedBefore: Record<string, unknown>;
  values: Record<string, unknown>;
  autoApply: boolean;
};

export type AuditFinding = {
  dedupeKey: string;
  code: string;
  severity: FindingSeverity;
  entityType: string;
  entityId: string;
  title: string;
  details: string;
  evidence: Record<string, unknown>;
  confidence: number;
  repair?: RepairSpec;
  needsAiTriage?: boolean;
};

export type WorkerBatchResult = {
  findings: AuditFinding[];
  cursor: Record<string, unknown>;
  hasMore: boolean;
  scanned: number;
  stats?: Record<string, number>;
};

export type WorkerContext = {
  supabase: any;
  job: AuditJob;
  now: Date;
};

export function isSystemAuditDomain(value: unknown): value is SystemAuditDomain {
  return SYSTEM_AUDIT_DOMAINS.includes(value as SystemAuditDomain);
}
